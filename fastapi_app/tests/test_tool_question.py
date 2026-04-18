"""get_question_detail 유닛 테스트."""
import json
import pytest
from fastapi_app.tools.question import get_question_detail


@pytest.fixture
def fake_datasets(tmp_path, monkeypatch):
    """datasets/practicalIndustrial/2024-first/{problem,answer,comment}.json 가짜 생성."""
    session_dir = tmp_path / "2024-first"
    session_dir.mkdir()

    (session_dir / "problem1.json").write_text(json.dumps([{
        "title": "정보처리산업기사 실기",
        "problems": [
            {
                "problem_number": 1,
                "question_text": "C언어 출력결과",
                "examples": "int main(){printf(\"%d\",1);}",
                "input_type": "single",
                "category": "Code",
                "subcategory": "C",
            },
            {
                "problem_number": 2,
                "question_text": "SQL 빈칸",
                "examples": "SELECT * FROM x",
                "input_type": "multi_blank",
                "category": "SQL",
            },
        ],
    }]), encoding="utf-8")
    (session_dir / "answer1.json").write_text(json.dumps([
        {"problem_number": 1, "answer": "1"},
        {"problem_number": 2, "answer": "FROM"},
    ]), encoding="utf-8")
    (session_dir / "comment1.json").write_text(json.dumps([
        {"problem_number": 1, "comment": "printf가 1 출력"},
        {"problem_number": 2, "comment": "FROM 키워드"},
    ]), encoding="utf-8")

    monkeypatch.setenv("DATASETS_ROOT", str(tmp_path))
    from fastapi_app.config import get_settings
    get_settings.cache_clear()
    return tmp_path


@pytest.mark.asyncio
async def test_get_question_detail_loads_code_problem(fake_datasets):
    result = await get_question_detail("2024-first", 1)
    assert result["problem_number"] == 1
    assert result["question_text"] == "C언어 출력결과"
    assert result["answer"] == "1"
    assert result["explanation"] == "printf가 1 출력"
    assert result["category"] == "Code"
    assert result["subcategory"] == "C"


@pytest.mark.asyncio
async def test_get_question_detail_loads_sql_problem_without_subcategory(fake_datasets):
    result = await get_question_detail("2024-first", 2)
    assert result["category"] == "SQL"
    assert result.get("subcategory") is None


@pytest.mark.asyncio
async def test_get_question_detail_raises_for_missing_session(fake_datasets):
    with pytest.raises(FileNotFoundError):
        await get_question_detail("9999-first", 1)


@pytest.mark.asyncio
async def test_get_question_detail_raises_for_missing_problem(fake_datasets):
    with pytest.raises(KeyError):
        await get_question_detail("2024-first", 999)
