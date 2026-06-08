"""ReAct Agent main loop — provider-agnostic LLM with function calling."""

from __future__ import annotations

import json
import logging

from app.agent.state import AgentState
from app.agent.prompt import build_system_prompt
from app.services.llm import get_provider
from app.services.timeline_manager import timeline_manager
from app.services.ws_manager import ws_manager
from app.tools.bootstrap import TIMELINE_MODIFYING_TOOLS, ensure_tools_registered
from app.tools.registry import registry

ensure_tools_registered()

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 20
# Temperature settings: lower for tool-calling (precision), higher for final text (creativity)
TEMPERATURE_TOOL_CALL = 0.2
TEMPERATURE_FINAL_RESPONSE = 0.7
# Tools that require user interaction — agent loop must stop and return the message
USER_FACING_TOOLS = {"ask_user", "present_plan"}


class ReActAgent:
    def __init__(self):
        self.provider = get_provider()

    async def run(self, user_message: str, state: AgentState) -> str:
        """Run the agent loop. Returns the agent's final text response."""

        state.agent_active = True
        state.abort_requested = False
        try:
            return await self._run_loop(user_message, state)
        finally:
            state.agent_active = False
            state.abort_requested = False

    async def _run_loop(self, user_message: str, state: AgentState) -> str:
        """Internal agent loop implementation."""

        # Add user message to conversation history (unified format)
        state.conversation_history.append({
            "role": "user",
            "content": user_message,
        })

        # Trim history to stay within token budget
        state.trim_history()

        system_prompt = build_system_prompt(state)
        tool_defs = registry.as_tool_defs()

        for iteration in range(MAX_ITERATIONS):
            # Abort checkpoint 1: before LLM call
            if state.abort_requested:
                break

            logger.info(f"Agent iteration {iteration + 1}/{MAX_ITERATIONS}")

            try:
                response = await self.provider.generate(
                    messages=state.conversation_history,
                    system_prompt=system_prompt,
                    tools=tool_defs,
                    temperature=TEMPERATURE_TOOL_CALL,
                )
            except Exception as e:
                logger.error(f"LLM API error: {e}")
                await ws_manager.broadcast_agent_progress(state.project_id, event="agent_done")
                return f"Sorry, I encountered an error communicating with the AI model: {str(e)}"

            # Broadcast reasoning content if present
            if response.reasoning_content:
                await ws_manager.broadcast_agent_reasoning(
                    state.project_id, response.reasoning_content
                )

            # If no tool calls, the agent is done — return text
            if not response.tool_calls:
                # For final response, re-generate with higher temperature if text is empty/generic
                final_text = response.text or "Sorry, I received an empty response. Please try again."
                assistant_msg: dict = {"role": "assistant", "content": final_text}
                if response.reasoning_content:
                    assistant_msg["reasoning_content"] = response.reasoning_content
                state.conversation_history.append(assistant_msg)
                await ws_manager.broadcast_agent_progress(state.project_id, event="agent_done")
                return final_text

            # Process tool calls
            should_stop = False
            stop_text = ""

            # Record all tool calls in one assistant message
            assistant_msg = {
                "role": "assistant",
                "tool_calls": [{"name": tc.name, "args": tc.args} for tc in response.tool_calls],
            }
            if response.reasoning_content:
                assistant_msg["reasoning_content"] = response.reasoning_content
            state.conversation_history.append(assistant_msg)

            for tc in response.tool_calls:
                # Abort checkpoint 2: before tool execution
                if state.abort_requested:
                    break

                logger.info(f"Tool call: {tc.name}({json.dumps(tc.args, ensure_ascii=False)[:200]})")

                # Broadcast tool_start progress
                await ws_manager.broadcast_agent_progress(
                    state.project_id,
                    event="tool_start",
                    tool_name=tc.name,
                    tool_args=tc.args,
                    iteration=iteration + 1,
                )

                # Execute the tool
                result = await registry.execute(tc.name, tc.args, state)

                logger.info(f"Tool result: {json.dumps(result, ensure_ascii=False)[:200]}")

                # Broadcast tool_end progress
                is_error = "error" in result
                result_summary = json.dumps(result, ensure_ascii=False)[:300]
                await ws_manager.broadcast_agent_progress(
                    state.project_id,
                    event="tool_end",
                    tool_name=tc.name,
                    result_summary=result_summary,
                    is_error=is_error,
                    iteration=iteration + 1,
                )

                # Add tool result to history
                state.conversation_history.append({
                    "role": "tool",
                    "name": tc.name,
                    "content": result,
                })

                # If timeline was modified, persist + broadcast via manager
                if tc.name in TIMELINE_MODIFYING_TOOLS and state.current_timeline:
                    await timeline_manager.save_and_broadcast(state.project_id)

                # Abort checkpoint 3: after tool execution
                if state.abort_requested:
                    break

                # User-facing tools: stop the loop and return the message
                if tc.name in USER_FACING_TOOLS:
                    should_stop = True
                    stop_text = tc.args.get("question") or tc.args.get("summary") or ""

            # If a user-facing tool was called, return its message to the user
            if should_stop:
                final_text = response.text or stop_text
                stop_msg: dict = {"role": "assistant", "content": final_text}
                if response.reasoning_content:
                    stop_msg["reasoning_content"] = response.reasoning_content
                state.conversation_history.append(stop_msg)
                await ws_manager.broadcast_agent_progress(state.project_id, event="agent_done")
                return final_text

            # Continue the loop for the next iteration

        # Handle abort: user requested interruption
        if state.abort_requested:
            abort_text = "I was interrupted. You can send a new message to continue."
            state.conversation_history.append({"role": "assistant", "content": abort_text})
            await ws_manager.broadcast_agent_progress(state.project_id, event="agent_aborted")
            return abort_text

        await ws_manager.broadcast_agent_progress(state.project_id, event="agent_done")
        return "I've reached the maximum number of reasoning steps. Please try breaking your request into smaller parts."

