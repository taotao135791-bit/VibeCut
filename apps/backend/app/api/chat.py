"""Chat API endpoint — bridges user messages to the ReAct Agent."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter

from app.agent.loop import ReActAgent
from app.config import settings
from app.models.messages import ChatRequest, ChatResponse
from app.services.timeline_manager import timeline_manager

router = APIRouter()
logger = logging.getLogger(__name__)


def _llm_configured() -> bool:
    if settings.llm_provider == "openai":
        return bool(settings.openai_api_key)
    return bool(settings.gemini_api_key)


@router.post("/chat")
async def chat_message(req: ChatRequest) -> ChatResponse:
    """Send a user message to the agent and get a response."""
    if not _llm_configured():
        return ChatResponse(
            message=(
                "当前未配置内置 LLM API Key，聊天助手不可用。\n\n"
                "本项目支持外部 Agent（如 Claude Code / Cursor）通过工具网关直接剪辑：\n"
                "- 工具列表：GET /api/tools\n"
                "- 执行工具：POST /api/tools/{工具名}/execute\n\n"
                "如需启用内置助手，请在 apps/backend/.env 中配置 "
                "MRDV2_GEMINI_API_KEY 或 MRDV2_OPENAI_API_KEY。"
            )
        )

    state = timeline_manager.get_state(req.project_id)

    # Sync from disk so agent always sees latest frontend edits
    timeline_manager.sync_from_disk(req.project_id)

    # If user mentions a directory, remember it as the media dir
    if not state.media_dir:
        for word in req.message.split():
            if word.startswith("/") and len(word) > 2:
                p = Path(word)
                if p.is_dir():
                    state.media_dir = str(p)
                    break
                elif p.parent.is_dir():
                    state.media_dir = str(p.parent)
                    break

    agent = ReActAgent()

    try:
        response_text = await agent.run(req.message, state)
    except Exception as e:
        logger.exception("Agent error")
        response_text = f"Sorry, an error occurred: {str(e)}"

    return ChatResponse(message=response_text)
