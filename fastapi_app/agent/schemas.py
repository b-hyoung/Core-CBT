"""OpenAI Function Calling 툴 스키마.

설계 §6 참조. 유저 스코프 툴은 user_email 을 스키마에서 배제하여
LLM 이 조작 시도 자체를 못 하게 한다 (서버가 dispatch_tool 에서 주입).
"""

_GET_QUESTION_DETAIL = {
    "type": "function",
    "function": {
        "name": "get_question_detail",
        "description": "정보처리산업기사 실기 특정 문제의 원문·예시 코드·정답·공식 해설·분류 태그 조회",
        "parameters": {
            "type": "object",
            "properties": {
                "source_session_id": {
                    "type": "string",
                    "description": "회차 키. 예: '2024-first', '2023-third'",
                },
                "problem_number": {
                    "type": "integer",
                    "description": "1-based 문제 번호",
                },
            },
            "required": ["source_session_id", "problem_number"],
        },
    },
}

_GET_USER_WRONG_HISTORY = {
    "type": "function",
    "function": {
        "name": "get_user_wrong_history",
        "description": "이 유저가 특정 문제를 몇 번 틀렸는지, 매번 뭘 제출했는지 조회",
        "parameters": {
            "type": "object",
            "properties": {
                "source_session_id": {"type": "string"},
                "problem_number": {"type": "integer"},
            },
            "required": ["source_session_id", "problem_number"],
        },
    },
}

_GET_USER_TOPIC_STATS = {
    "type": "function",
    "function": {
        "name": "get_user_topic_stats",
        "description": "이 유저의 카테고리/서브카테고리별 정답률. category 생략 시 전체 반환.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["SQL", "Code", "이론"],
                    "description": "필터할 카테고리. 생략하면 전체 반환.",
                }
            },
            "required": [],
        },
    },
}

_PRESENT_SIMILAR_PROBLEM = {
    "type": "function",
    "function": {
        "name": "present_similar_problem",
        "description": (
            "원 문제와 구조적으로 유사한 새 문제를 유저에게 제시한다. "
            "category 가 'SQL' 또는 'Code' 일 때만 호출 가능. '이론' 금지."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question_text": {"type": "string", "description": "문제 설명문"},
                "examples": {"type": "string", "description": "코드 또는 SQL 스키마·데이터"},
                "expected_answer": {"type": "string", "description": "정답 (유저에겐 노출 X, 서버만 보관)"},
                "answer_explanation": {"type": "string", "description": "왜 그 답이 정답인지"},
                "category": {"type": "string", "enum": ["SQL", "Code"]},
                "language": {
                    "type": "string",
                    "enum": ["Java", "C", "Python"],
                    "description": "Code 카테고리일 때만 지정",
                },
                "input_type": {
                    "type": "string",
                    "enum": ["single", "multi_blank", "textarea"],
                },
                "confidence": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "description": "정답 확신도 1(낮음)~5(높음). 계산 검증 후 평가.",
                },
            },
            "required": [
                "question_text",
                "examples",
                "expected_answer",
                "answer_explanation",
                "category",
                "input_type",
                "confidence",
            ],
        },
    },
}

_SUBMIT_EVALUATION = {
    "type": "function",
    "function": {
        "name": "submit_evaluation",
        "description": "유저가 제출한 답을 채점한 결과를 UI 에 표시",
        "parameters": {
            "type": "object",
            "properties": {
                "problem_id": {
                    "type": "string",
                    "description": "present_similar_problem 이 반환한 problem_id",
                },
                "correct": {"type": "boolean"},
                "reasoning": {"type": "string", "description": "정답/오답 이유 설명"},
            },
            "required": ["problem_id", "correct", "reasoning"],
        },
    },
}

TOOLS_SCHEMA = [
    _GET_QUESTION_DETAIL,
    _GET_USER_WRONG_HISTORY,
    _GET_USER_TOPIC_STATS,
    _PRESENT_SIMILAR_PROBLEM,
    _SUBMIT_EVALUATION,
]

TOOL_NAMES = {t["function"]["name"] for t in TOOLS_SCHEMA}
USER_SCOPED_TOOLS = {"get_user_wrong_history", "get_user_topic_stats"}
OUTPUT_TOOLS = {"present_similar_problem", "submit_evaluation"}
