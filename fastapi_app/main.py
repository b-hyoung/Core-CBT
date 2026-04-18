"""FastAPI 앱 엔트리포인트."""
from fastapi import Depends, FastAPI, Request
from pydantic import BaseModel, Field
from .config import get_settings
from .auth.internal_auth import verify_internal_request
from .agent.runner import run_agent
from .db.session_store import load_session, delete_session

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
    result = await run_agent(
        user_email=user_email,
        source_session_id=body.source_session_id,
        problem_number=body.problem_number,
        user_message=body.message,
    )
    return ChatResponse(**result)


class SubmitRequest(BaseModel):
    source_session_id: str = Field(..., min_length=1)
    problem_number: int = Field(..., ge=1)
    problem_id: str = Field(..., min_length=1)
    user_answer: str = Field(..., min_length=1, max_length=500)


@app.post("/submit", response_model=ChatResponse)
async def submit_answer(
    body: SubmitRequest,
    user_email: str = Depends(current_user_email),
):
    synthesized = f"[유저가 {body.problem_id} 문제에 답변: '{body.user_answer}']"
    result = await run_agent(
        user_email=user_email,
        source_session_id=body.source_session_id,
        problem_number=body.problem_number,
        user_message=synthesized,
    )
    return ChatResponse(**result)


class SessionView(BaseModel):
    messages: list[dict]
    turn_count: int
    generated_problems: list[dict]
    user_evaluations: list[dict]


@app.get("/session/{source_session_id}/{problem_number}", response_model=SessionView)
async def get_session(
    source_session_id: str,
    problem_number: int,
    user_email: str = Depends(current_user_email),
):
    session = await load_session(user_email, source_session_id, problem_number)
    if session is None:
        return SessionView(messages=[], turn_count=0, generated_problems=[], user_evaluations=[])

    # system 메시지 제외 + expected_answer 마스킹
    visible_messages = [m for m in session.messages if m.get("role") != "system"]
    masked_problems = [
        {k: v for k, v in p.items() if k != "expected_answer"}
        for p in session.generated_problems
    ]
    return SessionView(
        messages=visible_messages,
        turn_count=session.turn_count,
        generated_problems=masked_problems,
        user_evaluations=session.user_evaluations,
    )


@app.delete("/session/{source_session_id}/{problem_number}")
async def reset_session(
    source_session_id: str,
    problem_number: int,
    user_email: str = Depends(current_user_email),
):
    await delete_session(user_email, source_session_id, problem_number)
    return {"ok": True}
