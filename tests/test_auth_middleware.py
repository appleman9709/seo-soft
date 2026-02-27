import logging

import pytest

from auth_middleware import AuthMiddleware, ForbiddenError


@pytest.fixture
def middleware() -> AuthMiddleware:
    return AuthMiddleware()


def test_content_cannot_change_templates_logs_and_returns_403(middleware: AuthMiddleware, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.WARNING)

    with pytest.raises(ForbiddenError) as exc:
        middleware.authorize({"X-Actor": "alice", "X-Role": "content"}, "change_templates")

    assert exc.value.status_code == 403
    assert "authorization forbidden" in caplog.text
    assert "content cannot change templates" in caplog.text


def test_tech_cannot_change_generation_rules_logs_and_returns_403(middleware: AuthMiddleware, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.WARNING)

    with pytest.raises(ForbiddenError) as exc:
        middleware.authorize({"X-Actor": "bob", "X-Role": "tech"}, "change_generation_rules")

    assert exc.value.status_code == 403
    assert "authorization forbidden" in caplog.text
    assert "tech cannot change generation rules" in caplog.text


def test_tech_can_export(middleware: AuthMiddleware) -> None:
    actor = middleware.authorize({"X-Actor": "bob", "X-Role": "tech"}, "export")

    assert actor.role == "tech"


def test_admin_has_full_access(middleware: AuthMiddleware) -> None:
    for action in ("change_templates", "change_generation_rules", "export"):
        actor = middleware.authorize({"X-Actor": "root", "X-Role": "admin"}, action)
        assert actor.role == "admin"


def test_invalid_headers_are_forbidden_and_logged(middleware: AuthMiddleware, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.WARNING)

    with pytest.raises(ForbiddenError) as exc:
        middleware.authorize({"X-Role": "seo"}, "export")

    assert exc.value.status_code == 403
    assert "invalid auth headers" in caplog.text
