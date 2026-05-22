"""internal_auth 유닛 테스트: shared secret 검증 + email 추출."""
import pytest
from fastapi import HTTPException
from fastapi_app.auth.internal_auth import verify_internal_request


class FakeRequest:
    def __init__(self, headers: dict[str, str]):
        self.headers = headers


def test_verify_internal_request_success(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({
        "x-internal-auth": "unit-test-secret",
        "x-user-email": "user@example.com",
    })
    email = verify_internal_request(req)
    assert email == "user@example.com"


def test_verify_internal_request_missing_secret_raises_401(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({"x-user-email": "user@example.com"})
    with pytest.raises(HTTPException) as excinfo:
        verify_internal_request(req)
    assert excinfo.value.status_code == 401


def test_verify_internal_request_wrong_secret_raises_401(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({
        "x-internal-auth": "wrong",
        "x-user-email": "user@example.com",
    })
    with pytest.raises(HTTPException) as excinfo:
        verify_internal_request(req)
    assert excinfo.value.status_code == 401


def test_verify_internal_request_missing_email_raises_400(monkeypatch):
    monkeypatch.setenv("INTERNAL_SHARED_SECRET", "unit-test-secret")
    from fastapi_app.config import get_settings
    get_settings.cache_clear()

    req = FakeRequest({"x-internal-auth": "unit-test-secret"})
    with pytest.raises(HTTPException) as excinfo:
        verify_internal_request(req)
    assert excinfo.value.status_code == 400
