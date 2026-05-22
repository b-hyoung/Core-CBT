"""Supabase PostgREST 호출 헬퍼.

설계: direct REST API 호출. supabase-py 대신 httpx로 얇게 감싸서
- 의존성 최소화
- URL·헤더 조립 로직 테스트 가능
- Range 헤더 페이지네이션 등 세밀 제어 가능
"""
from typing import Any
import httpx
from ..config import get_settings


def build_headers(service_role_key: str, *, prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def build_rest_url(base_url: str, table: str) -> str:
    base = base_url.rstrip("/")
    return f"{base}/rest/v1/{table}"


async def get_json(url: str, *, params: dict[str, Any] | None = None, extra_headers: dict[str, str] | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    headers = build_headers(settings.supabase_service_role_key)
    if extra_headers:
        headers.update(extra_headers)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []


async def upsert(url: str, *, rows: list[dict[str, Any]], on_conflict: str | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    headers = build_headers(settings.supabase_service_role_key, prefer="return=representation,resolution=merge-duplicates")
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, headers=headers, params=params, json=rows)
        resp.raise_for_status()
        return resp.json() or []


async def delete(url: str, *, params: dict[str, Any]) -> None:
    settings = get_settings()
    headers = build_headers(settings.supabase_service_role_key)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(url, headers=headers, params=params)
        resp.raise_for_status()
