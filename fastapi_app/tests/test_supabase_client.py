"""supabase_client 유닛 테스트 (실제 네트워크 X, URL·헤더 조립만 검증)."""
import pytest
from fastapi_app.db.supabase_client import build_headers, build_rest_url


def test_build_headers_contains_required_keys():
    headers = build_headers(service_role_key="test-key")
    assert headers["apikey"] == "test-key"
    assert headers["Authorization"] == "Bearer test-key"
    assert headers["Content-Type"] == "application/json"


def test_build_rest_url_joins_correctly():
    url = build_rest_url(base_url="https://xxx.supabase.co", table="analytics_events")
    assert url == "https://xxx.supabase.co/rest/v1/analytics_events"


def test_build_rest_url_strips_trailing_slash():
    url = build_rest_url(base_url="https://xxx.supabase.co/", table="foo")
    assert url == "https://xxx.supabase.co/rest/v1/foo"
