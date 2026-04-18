from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MD = ROOT / "SQL.MD"
OUT_ROOT = ROOT / "datasets" / "sqld"

ROUND_TO_DATASET = {
    52: ("2024-first", "SQLD 2024년 1회"),
    53: ("2024-second", "SQLD 2024년 2회"),
    54: ("2024-third", "SQLD 2024년 3회"),
    55: ("2025-first", "SQLD 2025년 1회"),
    56: ("2025-second", "SQLD 2025년 2회"),
    57: ("2025-third", "SQLD 2025년 3회"),
}

CHOICE_TO_INDEX = {"①": 0, "②": 1, "③": 2, "④": 3}
INDEX_TO_CHOICE = {v: k for k, v in CHOICE_TO_INDEX.items()}


ROUND_RE = re.compile(r"제\s*(\d+)회\s*SQLD")
SUBJECT_RE = re.compile(r"^\s*【\s*(.+?)\s*】\s*$")
QUESTION_RE = re.compile(r"^\s*■\s*문제\s*(\d+)\.\s*(.+?)\s*$")
SUMMARY_RANGE_RE = re.compile(r"^\s*■\s*문제\s*(\d+)\s*~\s*(\d+)\.\s*(.+?)\s*$")
OPTION_RE = re.compile(r"^\s*([①②③④])\s*(.*)\s*$")
ANSWER_RE = re.compile(r"^\s*정답\s*:\s*(.+?)\s*$")
SUMMARY_ROW_RE = re.compile(r"^\s*(\d+)\t(.+?)\t([①②③④])(?:\s+(.+))?\s*$")


def clean_line(line: str) -> str:
    return (
        line.replace("\ufeff", "")
        .replace("\u200b", "")
        .replace("\xa0", " ")
        .rstrip()
    )


def finalize_question(current_round: dict, current_section_title: str | None, q: dict | None) -> None:
    if q is None:
        return
    if current_round is None or current_section_title is None:
        raise ValueError(f"Question {q.get('problem_number')} found before round/section header")
    if len(q["options"]) != 4:
        raise ValueError(f"Question {q['problem_number']} option count is {len(q['options'])}, expected 4")
    if q.get("answer_index") is None:
        raise ValueError(f"Question {q['problem_number']} missing answer")
    q["question_text"] = q["question_text"].strip()
    if q["example_lines"]:
        q["examples"] = "\n".join(q["example_lines"]).strip()
    q["comment"] = "\n".join(q["comment_lines"]).strip()
    answer_note = q.get("answer_note", "").strip()
    if answer_note:
        q["comment"] = f"{answer_note}\n{q['comment']}".strip()

    section = current_round["sections"].setdefault(
        current_section_title, {"title": current_section_title, "items": []}
    )
    section["items"].append(q)


def append_synthetic_summary_item(
    current_round: dict | None,
    current_section_title: str | None,
    problem_number: int,
    concept: str,
    answer_symbol: str,
    extra: str = "",
) -> None:
    if current_round is None or current_section_title is None:
        raise ValueError(f"Synthetic summary item {problem_number} found before round/section header")
    answer_index = CHOICE_TO_INDEX[answer_symbol]
    note_lines = [
        "원문은 복원 불완전 문제 요약표(문제번호/핵심 개념/정답)만 제공되어 임시 선지(①~④)로 구성했습니다.",
        f"핵심 개념: {concept.strip()}",
    ]
    if extra.strip():
        note_lines.append(f"표기 메모: {extra.strip()}")

    q = {
        "problem_number": problem_number,
        "question_text": f"[복원 불완전] {concept.strip()}",
        "options": ["①", "②", "③", "④"],
        "example_lines": [],
        "answer_index": answer_index,
        "answer_note": "",
        "comment_lines": note_lines,
    }
    finalize_question(current_round, current_section_title, q)


def parse_sqld_md(text: str) -> list[dict]:
    rounds: list[dict] = []
    current_round: dict | None = None
    current_section_title: str | None = None
    current_q: dict | None = None
    summary_range: tuple[int, int] | None = None

    for raw_line in text.splitlines():
        line = clean_line(raw_line)
        stripped = line.strip()

        if not stripped:
            if current_q is not None and current_q.get("answer_index") is not None and current_q["comment_lines"]:
                current_q["comment_lines"].append("")
            continue

        round_match = ROUND_RE.search(stripped)
        if round_match:
            finalize_question(current_round, current_section_title, current_q)
            current_q = None
            summary_range = None
            round_no = int(round_match.group(1))
            current_round = {"round_no": round_no, "sections": {}, "section_order": []}
            current_section_title = None
            rounds.append(current_round)
            continue

        subject_match = SUBJECT_RE.match(stripped)
        if subject_match:
            finalize_question(current_round, current_section_title, current_q)
            current_q = None
            summary_range = None
            current_section_title = subject_match.group(1).strip()
            if current_round is None:
                raise ValueError(f"Subject header before round: {stripped}")
            if current_section_title not in current_round["sections"]:
                current_round["sections"][current_section_title] = {"title": current_section_title, "items": []}
                current_round["section_order"].append(current_section_title)
            continue

        question_match = QUESTION_RE.match(stripped)
        if question_match:
            finalize_question(current_round, current_section_title, current_q)
            summary_range = None
            current_q = {
                "problem_number": int(question_match.group(1)),
                "question_text": question_match.group(2).strip(),
                "options": [],
                "example_lines": [],
                "answer_index": None,
                "answer_note": "",
                "comment_lines": [],
            }
            continue

        summary_range_match = SUMMARY_RANGE_RE.match(stripped)
        if summary_range_match:
            finalize_question(current_round, current_section_title, current_q)
            current_q = None
            summary_range = (int(summary_range_match.group(1)), int(summary_range_match.group(2)))
            continue

        if summary_range is not None:
            summary_row_match = SUMMARY_ROW_RE.match(stripped)
            if summary_row_match:
                problem_number = int(summary_row_match.group(1))
                start_no, end_no = summary_range
                if start_no <= problem_number <= end_no:
                    append_synthetic_summary_item(
                        current_round=current_round,
                        current_section_title=current_section_title,
                        problem_number=problem_number,
                        concept=summary_row_match.group(2),
                        answer_symbol=summary_row_match.group(3),
                        extra=summary_row_match.group(4) or "",
                    )
                    continue
            if stripped.startswith("문제\t"):
                continue

        if current_q is None:
            continue

        answer_match = ANSWER_RE.match(stripped)
        if answer_match:
            raw_answer = answer_match.group(1).strip()
            answer_symbols = [ch for ch in raw_answer if ch in CHOICE_TO_INDEX]
            if not answer_symbols:
                raise ValueError(f"Question {current_q['problem_number']} invalid answer line: {stripped}")
            current_q["answer_index"] = CHOICE_TO_INDEX[answer_symbols[0]]
            if len(answer_symbols) > 1:
                current_q["answer_note"] = f"[원문 정답표시] {raw_answer}"
            continue

        if current_q.get("answer_index") is None:
            option_match = OPTION_RE.match(stripped)
            if option_match and len(current_q["options"]) < 4:
                current_q["options"].append(option_match.group(2).strip())
            elif current_q["options"]:
                # Rare line wraps inside option text.
                current_q["options"][-1] = (current_q["options"][-1] + " " + stripped).strip()
            else:
                current_q["example_lines"].append(stripped)
        else:
            current_q["comment_lines"].append(stripped)

    finalize_question(current_round, current_section_title, current_q)
    return rounds


def build_json_payloads(parsed_round: dict) -> tuple[list[dict], list[dict], list[dict]]:
    section_order = parsed_round["section_order"] or list(parsed_round["sections"].keys())
    problems_out: list[dict] = []
    answers_out: list[dict] = []
    comments_out: list[dict] = []

    for section_title in section_order:
        items = parsed_round["sections"][section_title]["items"]

        problems_section = {"title": section_title, "problems": []}
        answers_section = {"title": section_title, "answers": []}
        comments_section = {"title": section_title, "comments": []}

        for item in items:
            problem_obj = {
                "problem_number": item["problem_number"],
                "question_text": item["question_text"],
                "options": item["options"],
            }
            if item.get("examples"):
                problem_obj["examples"] = item["examples"]

            answer_text = item["options"][item["answer_index"]]
            problems_section["problems"].append(problem_obj)
            answers_section["answers"].append(
                {
                    "problem_number": item["problem_number"],
                    "correct_answer_index": item["answer_index"],
                    "correct_answer_text": answer_text,
                    "correct_answer_symbol": INDEX_TO_CHOICE[item["answer_index"]],
                }
            )
            comments_section["comments"].append(
                {
                    "problem_number": item["problem_number"],
                    "comment": item["comment"],
                }
            )

        problems_out.append(problems_section)
        answers_out.append(answers_section)
        comments_out.append(comments_section)

    return problems_out, answers_out, comments_out


def main() -> None:
    text = SOURCE_MD.read_text(encoding="utf-8")
    rounds = parse_sqld_md(text)

    if len(rounds) != 6:
        raise ValueError(f"Expected 6 rounds, found {len(rounds)}")

    for parsed_round in rounds:
        round_no = parsed_round["round_no"]
        if round_no not in ROUND_TO_DATASET:
            raise ValueError(f"Unexpected SQLD round number: {round_no}")
        folder_name, label = ROUND_TO_DATASET[round_no]
        problems_out, answers_out, comments_out = build_json_payloads(parsed_round)

        out_dir = OUT_ROOT / folder_name
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "problem1.json").write_text(json.dumps(problems_out, ensure_ascii=False, indent=2), encoding="utf-8")
        (out_dir / "answer1.json").write_text(json.dumps(answers_out, ensure_ascii=False, indent=2), encoding="utf-8")
        (out_dir / "comment1.json").write_text(json.dumps(comments_out, ensure_ascii=False, indent=2), encoding="utf-8")

        total = sum(len(section["problems"]) for section in problems_out)
        print(f"{label}: {total} questions -> {out_dir}")


if __name__ == "__main__":
    main()
