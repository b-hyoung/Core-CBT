"""FastAPI 앱 엔트리포인트."""
from fastapi import Depends, FastAPI, Request
from pydantic import BaseModel, Field
from .config import get_settings
from .auth.internal_auth import verify_internal_request

app = FastAPI(title="Core-CBT Agent API", version="0.1.0")


class ChatRequest(BaseModel):
    source_session_id: str = Field(..., min_length=1)
    problem_number: int = Field(..., ge=1)
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    ui_actions: list[dict] = []
    turn_count: int = 0


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "status": "ok",
        "llm_model": settings.llm_model,
        "llm_base_url": settings.llm_base_url,
    }


def current_user_email(request: Request) -> str:
    return verify_internal_request(request)


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_email: str = Depends(current_user_email),
):
    # V1 Phase 1: echo only. Real implementation in Task 16.
    return ChatResponse(
        reply=f"[echo] {user_email} asked: {body.message}",
        ui_actions=[],
        turn_count=0,
    )
