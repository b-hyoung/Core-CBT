"""Next.js ↔ FastAPI 서버간 인증.

경계 원칙:
- Next.js 서버만이 이 API를 호출해야 한다 (브라우저 직접 호출 X).
- Next.js는 next-auth 세션을 검증한 후 신뢰할 수 있는 email을
  X-User-Email 헤더에 실어 보낸다.
- X-Internal-Auth 헤더의 shared secret을 여기서 검증한다.
- FastAPI는 email을 "이미 검증된 신원"으로 신뢰한다.
"""
import secrets
from fastapi import HTTPException, Request
from ..config import get_settings


def verify_internal_request(request: Request) -> str:
    """shared secret 검증 + email 추출. 실패 시 HTTPException raise.

    Returns:
        검증된 user_email (소문자로 정규화).
    """
    settings = get_settings()

    provided_secret = request.headers.get("x-internal-auth", "")
    expected_secret = settings.internal_shared_secret
    if not expected_secret:
        raise HTTPException(status_code=500, detail="server misconfigured: INTERNAL_SHARED_SECRET unset")

    # 타이밍 공격 방지
    if not secrets.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=401, detail="invalid internal auth")

    email = (request.headers.get("x-user-email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="missing x-user-email header")

    return email
