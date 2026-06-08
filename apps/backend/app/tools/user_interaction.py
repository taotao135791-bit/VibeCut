"""User interaction tools: present_plan, ask_user."""

from __future__ import annotations

from app.tools.registry import registry


@registry.register(
    name="present_plan",
    description=(
        "Present an editing plan to the user for review before executing. Stops the agent loop. "
        "The frontend renders this as an approval card with Accept/Reject buttons. "
        "\n\nWhen to use: the edit is complex or ambiguous — multiple clips, structural changes, "
        "or decisions that the user should approve first. "
        "When NOT to use: simple, unambiguous operations (just do it and explain after)."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "summary": {
                "type": "STRING",
                "description": "A clear summary of the editing plan you want to execute",
            },
            "steps": {
                "type": "STRING",
                "description": "Optional JSON array of planned steps: [{\"step\": 1, \"action\": \"...\"}]",
            },
        },
        "required": ["summary"],
    },
)
async def present_plan(args: dict, state) -> dict:
    import json
    steps = []
    if args.get("steps"):
        try:
            steps = json.loads(args["steps"]) if isinstance(args["steps"], str) else args["steps"]
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "presented": True,
        "type": "plan_approval",
        "summary": args["summary"],
        "steps": steps,
        "note": "Plan shown to user. Wait for their approval or rejection before proceeding.",
    }


@registry.register(
    name="ask_user",
    description=(
        "Ask the user a clarifying question. Stops the agent loop and waits for their reply. "
        "\n\nWhen to use: the user's intent is genuinely ambiguous and guessing wrong would waste work. "
        "When NOT to use: you can reasonably infer the answer from context — prefer action over asking."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "question": {
                "type": "STRING",
                "description": "The question to ask the user",
            },
            "options": {
                "type": "STRING",
                "description": "Optional JSON array of suggested answers: [\"option A\", \"option B\"]",
            },
        },
        "required": ["question"],
    },
)
async def ask_user(args: dict, state) -> dict:
    import json
    options = []
    if args.get("options"):
        try:
            options = json.loads(args["options"]) if isinstance(args["options"], str) else args["options"]
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "question_asked": True,
        "type": "user_question",
        "question": args["question"],
        "options": options,
        "note": "Question relayed to the user. Wait for their response in the next message.",
    }
