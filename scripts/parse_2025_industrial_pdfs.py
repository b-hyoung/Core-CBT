from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "pdf"
EXTRACT_DIR = PDF_DIR / "extracted"
DATASETS_DIR = ROOT / "datasets" / "pdfPacks"

TOTAL_QUESTIONS = 60

# Circled numbers ①~④
CIRCLE_TO_INDEX = {
    "\u2460": 0,
    "\u2461": 1,
    "\u2462": 2,
    "\u2463": 3,
}

QUESTION_START_RE = re.compile(r"(?m)^(\d{1,2})\.\s")
OPTION_MARK_RE = re.compile(r"([\u2460-\u2463])")
ANSWER_PAIR_RE = re.compile(r"(\d{1,2})\s*\.\s*([\u2460-\u2463])")
EXPERT_MARKER = "[전문가의 조언]"
OPTION_PLACEHOLDER = "[PDF 원본 그림/수식 선택지 - 추후 보강 예정]"

SECTION_RANGES = [
    ("정보시스템 기반 기술", 1, 20),
    ("프로그래밍 언어 활용", 21, 40),
    ("데이터베이스 활용", 41, 60),
]


def strip_bom(text: str) -> str:
    return text[1:] if text.startswith("\ufeff") else text


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def cleanup_linewise(text: str) -> str:
    """Remove obvious headers/footers/noise while keeping question/explanation content."""
    text = text.replace("\r", "")
    out_lines: List[str] = []
    for raw in text.split("\n"):
        line = raw.rstrip()
        s = line.strip()
        if not s:
            continue
        # Common page headers / footers
        if s in {"1회", "2회", "3회"}:
            continue
        if re.fullmatch(r"-\s*\d+\s*-?", s):
            continue
        # Cover/copyright noise on first page (before first problem starts)
        if s in {
            "기출문제 & 정답 및 해설",
            "저작권 안내",
            "정답 및 해설",
        }:
            continue
        out_lines.append(line)
    return "\n".join(out_lines).strip()


def normalize_question_text(text: str) -> str:
    text = strip_bom(text).strip()
    text = re.sub(r"^\d{1,2}\.\s*", "", text)
    text = text.replace("\r", "")
    # Remove lines that are mostly private-use glyphs from image/math extraction noise.
    lines = []
    for line in text.split("\n"):
        s = line.strip()
        if not s:
            lines.append(line)
            continue
        private_use_count = sum(1 for ch in s if 0xE000 <= ord(ch) <= 0xF8FF)
        if private_use_count and private_use_count >= max(1, len(s) // 2):
            continue
        lines.append(line)
    text = "\n".join(lines)
    # Remove stray page footer markers if any survived in block parsing
    text = re.sub(r"\n-\s*\d+\s*$", "", text).strip()
    # Keep line breaks (code/table-like stems), but compress excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_option_text(text: str) -> str:
    text = strip_bom(text).strip()
    text = text.replace("\r", "")
    # Options are better as single-line strings in existing datasets
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    # Remove stray trailing circled-number noise that sometimes sticks to page boundaries
    text = re.sub(r"[\u2460-\u2463]+\s*$", "", text).strip()
    return text.strip()


def parse_question_block(block: str) -> Tuple[str, List[str]] | None:
    first_option_match = OPTION_MARK_RE.search(block)
    if not first_option_match:
        return None

    question_text = normalize_question_text(block[: first_option_match.start()])
    options_chunk = block[first_option_match.start() :].strip()
    markers = list(OPTION_MARK_RE.finditer(options_chunk))
    # Some PDF extracts inject extra circled digits as noise inside the block.
    # Use the first four markers as the real options.
    if len(markers) > 4:
        markers = markers[:4]
    options: List[str] = []

    for i, marker in enumerate(markers):
        start = marker.end()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(options_chunk)
        option_text = normalize_option_text(options_chunk[start:end])
        options.append(option_text if option_text else OPTION_PLACEHOLDER)

    return question_text, options


def parse_questions_from_column(column_text: str) -> List[Dict]:
    text = cleanup_linewise(column_text)
    matches = list(QUESTION_START_RE.finditer(text))
    items: List[Dict] = []

    for i, match in enumerate(matches):
        q_no = int(match.group(1))
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[match.start() : end].strip()
        parsed = parse_question_block(block)
        if not parsed:
            continue
        q_text, options = parsed
        items.append(
            {
                "problem_number": q_no,
                "question_text": q_text,
                "options": options,
            }
        )
    return items


def _stitch_column_segments(raw_segments: List[str]) -> List[str]:
    """Attach text before the first question in a segment to the previous segment.

    This is needed because 2-column PDFs sometimes split a question across column boundaries.
    """
    stitched: List[str] = []
    for seg in raw_segments:
        text = cleanup_linewise(seg)
        if not text:
            continue

        first_q = QUESTION_START_RE.search(text)
        if first_q:
            prefix = text[: first_q.start()].strip()
            body = text[first_q.start() :].strip()

            if prefix and stitched:
                # If prefix contains cover/header fragments, prefer the first *line-start*
                # choice marker (e.g. "④ ...") rather than inline markers from 안내문구.
                line_start_opt = re.search(r"(?m)^\s*[\u2460-\u2463]\s*", prefix)
                if line_start_opt:
                    prefix = prefix[line_start_opt.start() :].strip()
                else:
                    opt_match = OPTION_MARK_RE.search(prefix)
                    if opt_match:
                        prefix = prefix[opt_match.start() :].strip()
                if prefix:
                    stitched[-1] = f"{stitched[-1]}\n{prefix}".strip()

            stitched.append(body)
        else:
            if stitched:
                stitched[-1] = f"{stitched[-1]}\n{text}".strip()
            else:
                stitched.append(text)
    return stitched


def extract_question_columns(doc: pdfplumber.PDF, question_page_count: int) -> Tuple[List[Dict], str]:
    extracted_debug_parts: List[str] = []
    raw_segments: List[str] = []

    for page_index in range(question_page_count):
        page = doc.pages[page_index]
        w, h = page.width, page.height
        mid = w / 2

        left = page.crop((0, 0, mid, h)).extract_text() or ""
        right = page.crop((mid, 0, w, h)).extract_text() or ""

        extracted_debug_parts.append(f"===== PAGE {page_index + 1} LEFT =====\n{left}\n")
        extracted_debug_parts.append(f"===== PAGE {page_index + 1} RIGHT =====\n{right}\n")

        # Questions are laid out in 2 columns. Reading order is left -> right.
        raw_segments.append(left)
        raw_segments.append(right)

    parsed_questions: List[Dict] = []
    for seg in _stitch_column_segments(raw_segments):
        parsed_questions.extend(parse_questions_from_column(seg))

    return parsed_questions, "\n".join(extracted_debug_parts)


def extract_answer_pairs(doc: pdfplumber.PDF, answer_page_index: int) -> Dict[int, int]:
    # The answer key is on the first explanation page, split across left/right columns.
    page = doc.pages[answer_page_index]
    w, h = page.width, page.height
    mid = w / 2
    left = page.crop((0, 0, mid, h)).extract_text() or ""
    right = page.crop((mid, 0, w, h)).extract_text() or ""
    key_text = f"{left}\n{right}"

    answers: Dict[int, int] = {}
    for q_no_str, circled in ANSWER_PAIR_RE.findall(key_text):
        q_no = int(q_no_str)
        if 1 <= q_no <= TOTAL_QUESTIONS and circled in CIRCLE_TO_INDEX:
            answers[q_no] = CIRCLE_TO_INDEX[circled]
    return answers


def extract_explanation_columns(doc: pdfplumber.PDF, answer_page_index: int) -> str:
    parts: List[str] = []
    for page_index in range(answer_page_index, len(doc.pages)):
        page = doc.pages[page_index]
        w, h = page.width, page.height
        mid = w / 2
        left = page.crop((0, 0, mid, h)).extract_text() or ""
        right = page.crop((mid, 0, w, h)).extract_text() or ""
        parts.append(f"===== PAGE {page_index + 1} LEFT =====\n{left}\n")
        parts.append(f"===== PAGE {page_index + 1} RIGHT =====\n{right}\n")
    return "\n".join(parts)


def detect_answer_key_page_index(doc: pdfplumber.PDF) -> int:
    pair_counts: List[int] = []
    for page_index, page in enumerate(doc.pages):
        w, h = page.width, page.height
        mid = w / 2
        left = page.crop((0, 0, mid, h)).extract_text() or ""
        right = page.crop((mid, 0, w, h)).extract_text() or ""
        count = len(ANSWER_PAIR_RE.findall(f"{left}\n{right}"))
        pair_counts.append(count)

    max_count = max(pair_counts) if pair_counts else 0
    if max_count < 20:
        raise ValueError(f"Failed to detect answer key page. pair_counts={pair_counts}")
    return pair_counts.index(max_count)


def build_sectioned_problem_json(flat_questions: List[Dict]) -> List[Dict]:
    sections: List[Dict] = []
    for title, start, end in SECTION_RANGES:
        subset = [q for q in flat_questions if start <= q["problem_number"] <= end]
        sections.append({"title": title, "problems": subset})
    return sections


def build_sectioned_answer_json(flat_questions: List[Dict], answer_index_map: Dict[int, int]) -> List[Dict]:
    q_map = {q["problem_number"]: q for q in flat_questions}
    sections: List[Dict] = []
    for title, start, end in SECTION_RANGES:
        answers = []
        for q_no in range(start, end + 1):
            q = q_map[q_no]
            idx = answer_index_map.get(q_no)
            if idx is None or idx < 0 or idx >= len(q["options"]):
                raise ValueError(f"Missing or invalid answer for question {q_no}")
            answers.append(
                {
                    "problem_number": q_no,
                    "correct_answer_index": idx,
                    "correct_answer_text": q["options"][idx],
                }
            )
        sections.append({"title": title, "answers": answers})
    return sections


def build_placeholder_comment_json(year_label: str, round_label: str) -> List[Dict]:
    sections: List[Dict] = []
    for title, start, end in SECTION_RANGES:
        comments = []
        for q_no in range(start, end + 1):
            comments.append(
                {
                    "problem_number": q_no,
                    "comment": (
                        f"{year_label} {round_label} 산업기사 PDF 원본에는 정답/해설이 포함되어 있으나, "
                        "자동 추출 시 다단 레이아웃으로 해설 블록 경계가 깨져 현재는 추후 보강 예정입니다."
                    ),
                }
            )
        sections.append({"title": title, "comments": comments})
    return sections


def build_meta(slug: str, title: str, total: int, pdf_name: str, answer_count: int, expert_marker_count: int) -> Dict:
    return {
        "slug": slug,
        "title": title,
        "kind": "pdf_exam",
        "totalProblems": total,
        "pdfFileName": pdf_name,
        "answerSource": "page6_key",
        "answerCount": answer_count,
        "explanationExtraction": {
            "status": "placeholder",
            "reason": "two_column_layout_boundary_loss",
            "expertMarkerCount": expert_marker_count,
        },
    }


def validate_flat_questions(flat_questions: List[Dict]) -> None:
    if len(flat_questions) != TOTAL_QUESTIONS:
        raise ValueError(f"Expected {TOTAL_QUESTIONS} questions, got {len(flat_questions)}")
    numbers = [q["problem_number"] for q in flat_questions]
    if sorted(numbers) != list(range(1, TOTAL_QUESTIONS + 1)):
        raise ValueError(f"Question number mismatch: {sorted(numbers)[:10]} ...")
    for q in flat_questions:
        if len(q["options"]) != 4:
            raise ValueError(f"Question {q['problem_number']} has {len(q['options'])} options")


def process_one_pdf(pdf_path: Path, slug: str, title: str, round_label: str) -> Dict:
    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    output_dir = DATASETS_DIR / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    with pdfplumber.open(str(pdf_path)) as doc:
        answer_page_index = detect_answer_key_page_index(doc)
        question_page_count = answer_page_index
        questions, questions_debug = extract_question_columns(doc, question_page_count)
        questions = sorted(questions, key=lambda x: x["problem_number"])
        validate_flat_questions(questions)

        answer_index_map = extract_answer_pairs(doc, answer_page_index)
        if len(answer_index_map) != TOTAL_QUESTIONS:
            missing = [n for n in range(1, TOTAL_QUESTIONS + 1) if n not in answer_index_map]
            raise ValueError(f"Answer key parse failed: got {len(answer_index_map)} answers, missing {missing[:10]}")

        explanations_debug = extract_explanation_columns(doc, answer_page_index)
        expert_marker_count = explanations_debug.count(EXPERT_MARKER)

    year_label = "2025년"
    problem_json = build_sectioned_problem_json(questions)
    answer_json = build_sectioned_answer_json(questions, answer_index_map)
    comment_json = build_placeholder_comment_json(year_label, round_label)
    meta_json = build_meta(slug, title, TOTAL_QUESTIONS, pdf_path.name, len(answer_index_map), expert_marker_count)

    write_json(output_dir / "problem1.json", problem_json)
    write_json(output_dir / "answer1.json", answer_json)
    write_json(output_dir / "comment1.json", comment_json)
    write_json(output_dir / "meta.json", meta_json)

    safe_stem = slug.replace("-", "_")
    (EXTRACT_DIR / f"{safe_stem}_questions_columns.txt").write_text(questions_debug, encoding="utf-8")
    (EXTRACT_DIR / f"{safe_stem}_explanations_columns.txt").write_text(explanations_debug, encoding="utf-8")

    return {
        "slug": slug,
        "title": title,
        "questions": len(questions),
        "answers": len(answer_index_map),
        "expert_marker_count": expert_marker_count,
        "answer_page_index": answer_page_index + 1,
        "output_dir": str(output_dir),
    }


def main() -> None:
    pdf_map = [
        ("1.*.pdf", "industrial-2025-1", "2025년 1회 정보처리산업기사 필기 (PDF 추출본)", "1회"),
        ("2.*.pdf", "industrial-2025-2", "2025년 2회 정보처리산업기사 필기 (PDF 추출본)", "2회"),
        ("3.*.pdf", "industrial-2025-3", "2025년 3회 정보처리산업기사 필기 (PDF 추출본)", "3회"),
    ]

    results = []
    for pattern, slug, title, round_label in pdf_map:
        matches = sorted(PDF_DIR.glob(pattern))
        if not matches:
            raise FileNotFoundError(f"No PDF found for pattern: {pattern}")
        pdf_path = matches[0]
        result = process_one_pdf(pdf_path, slug, title, round_label)
        results.append(result)
        print(
            f"[OK] {slug}: questions={result['questions']}, answers={result['answers']}, "
            f"expert_markers={result['expert_marker_count']}"
        )

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
