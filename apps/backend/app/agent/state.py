"""Agent state: conversation history + current timeline + project context."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.models.timeline import TimelineProject

logger = logging.getLogger(__name__)

# Approximate token budget for conversation history (chars / 4 ≈ tokens)
MAX_HISTORY_CHARS = 120_000  # ~30k tokens
MIN_KEEP_MESSAGES = 4  # Always keep at least last N messages


@dataclass
class AgentState:
    project_id: str
    media_dir: str = ""
    conversation_history: list[dict] = field(default_factory=list)
    current_timeline: TimelineProject | None = None
    _pending_user_response: str | None = None
    version: int = 0
    agent_active: bool = False
    abort_requested: bool = False

    def bump_version(self) -> int:
        """Increment version counter and return the new value."""
        self.version += 1
        return self.version

    def trim_history(self) -> None:
        """Trim conversation history to stay under token budget.

        Keeps the first message (usually user intent) and the most recent messages.
        Removes oldest middle messages until under budget.
        """
        if len(self.conversation_history) <= MIN_KEEP_MESSAGES:
            return

        total_chars = sum(
            len(json.dumps(msg, ensure_ascii=False)) for msg in self.conversation_history
        )

        if total_chars <= MAX_HISTORY_CHARS:
            return

        # Keep first message + last MIN_KEEP_MESSAGES, trim from the middle
        trimmed = 0
        while (
            len(self.conversation_history) > MIN_KEEP_MESSAGES
            and total_chars > MAX_HISTORY_CHARS
        ):
            # Remove the second message (preserve first user message for context)
            removed = self.conversation_history.pop(1)
            removed_chars = len(json.dumps(removed, ensure_ascii=False))
            total_chars -= removed_chars
            trimmed += 1

        if trimmed > 0:
            logger.info(
                f"Trimmed {trimmed} messages from history "
                f"(now {len(self.conversation_history)} messages, ~{total_chars} chars)"
            )
