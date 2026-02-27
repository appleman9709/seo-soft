from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, Iterable, Mapping

ALLOWED_ROLES = {"seo", "content", "tech", "admin"}


@dataclass(frozen=True)
class Actor:
    name: str
    role: str


class ForbiddenError(Exception):
    """Error raised when an actor is not authorized for an action."""

    status_code = 403

    def __init__(self, message: str) -> None:
        super().__init__(message)


class AuthMiddleware:
    """Minimal header-based auth/authorization stub.

    Required headers:
    - X-Actor
    - X-Role (seo|content|tech|admin)
    """

    def __init__(self, logger: logging.Logger | None = None) -> None:
        self._logger = logger or logging.getLogger(__name__)

    def authorize(self, headers: Mapping[str, str], action: str) -> Actor:
        actor = headers.get("X-Actor")
        role = headers.get("X-Role")

        if not actor or not role or role not in ALLOWED_ROLES:
            self._log_forbidden(actor=actor, role=role, action=action, reason="invalid auth headers")
            raise ForbiddenError("forbidden")

        if role == "content" and action == "change_templates":
            self._log_forbidden(actor=actor, role=role, action=action, reason="content cannot change templates")
            raise ForbiddenError("forbidden")

        if role == "tech" and action == "change_generation_rules":
            self._log_forbidden(actor=actor, role=role, action=action, reason="tech cannot change generation rules")
            raise ForbiddenError("forbidden")

        return Actor(name=actor, role=role)

    def __call__(
        self,
        headers: Mapping[str, str],
        action: str,
        handler: Callable[[Actor], object],
    ) -> object:
        actor = self.authorize(headers=headers, action=action)
        return handler(actor)

    def _log_forbidden(self, *, actor: str | None, role: str | None, action: str, reason: str) -> None:
        self._logger.warning(
            "authorization forbidden actor=%s role=%s action=%s reason=%s",
            actor,
            role,
            action,
            reason,
        )


def export_action_names() -> Iterable[str]:
    """Small helper to document known actions in the auth stub."""
    return ("change_templates", "change_generation_rules", "export")
