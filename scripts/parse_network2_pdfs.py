"""네트워크관리사 2급 필기 기출문제(교사용 PDF)를 pdfPacks 데이터셋으로 변환.

comcbt.com 교사용 PDF 특징:
- 50문항 / 4과목 (1과목 TCP/IP, 2과목 네트워크 일반, 3과목 NOS, 4과목 네트워크 운용기기)
- 2단(2-column) 레이아웃 → 좌/우 컬럼을 crop 하여 읽기 순서 복원
- 정답 선택지는 본문에 검은 원문자(❶❷❸❹), 오답은 흰 원문자(①②③④)로 표기
- 마지막 페이지에 정답표(번호줄/정답줄 반복) 존재 → 본문 정답과 교차검증
- PDF에는 해설이 없으므로 comment 는 정답 안내 placeholder 로 생성
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = ROOT / "datasets" / "pdfPacks"
DOWNLOADS = Path.home() / "Downloads"

TOTAL_QUESTIONS = 50

# 흰 원문자(오답/정답표) ①②③④ 와 검은 원문자(본문 정답) ❶❷❸❹
WHITE_TO_INDEX = {"①": 0, "②": 1, "③": 2, "④": 3}
BLACK_TO_INDEX = {"❶": 0, "❷": 1, "❸": 2, "❹": 3}
INDEX_TO_WHITE = {v: k for k, v in WHITE_TO_INDEX.items()}
ALL_MARK = "".join(list(WHITE_TO_INDEX) + list(BLACK_TO_INDEX))

QUESTION_START_RE = re.compile(r"(?m)^(\d{1,2})\.\s")
OPTION_MARK_RE = re.compile(r"([%s])" % ALL_MARK)
SUBJECT_RE = re.compile(r"([1-4])\s*과목\s*[:：]")
OPTION_PLACEHOLDER = "[PDF 원본 그림/수식 선택지 - 추후 보강 예정]"

SUBJECT_NAMES = {
    1: "1과목 : TCP/IP",
    2: "2과목 : 네트워크 일반",
    3: "3과목 : NOS",
    4: "4과목 : 네트워크 운용기기",
}

# 페이지 머리글/꼬리글/안내문구 노이즈
NOISE_SUBSTRINGS = (
    "전자문제집 CBT",
    "최강 자격증 기출문제",
    "www.comcbt.com",
    "기출문제 및 해설집 다운로드",
    "PC 버전 및 모바일 버전",
    "교사용/학생용",
    "오답 및 오탈자가",
    "종이 문제집이 아닌",
    "모의고사, 오답 노트",
    "로그램으로 실제 시험",
    "니다.",
    "전자문제집 CBT란",
)


def strip_bom(text: str) -> str:
    return text[1:] if text.startswith("﻿") else text


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def cleanup_linewise(text: str) -> str:
    text = text.replace("\r", "")
    out: List[str] = []
    for raw in text.split("\n"):
        line = raw.rstrip()
        s = line.strip()
        if not s:
            continue
        # 상단 머리글: "네트워크관리사 2급 ◐ ... ◑ ..."
        if s.startswith("네트워크관리사") and "필기 기출문제" in s:
            continue
        if re.fullmatch(r"-\s*\d+\s*-?", s):
            continue
        if any(sub in s for sub in NOISE_SUBSTRINGS):
            continue
        out.append(line)
    return "\n".join(out).strip()


def normalize_question_text(text: str) -> str:
    text = strip_bom(text).strip()
    text = re.sub(r"^\d{1,2}\.\s*", "", text)
    text = text.replace("\r", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# 옵션 텍스트가 페이지 경계를 넘으며 붙는 머리글/꼬리글/정답표 노이즈 시작 표지
OPTION_TAIL_NOISE = (
    "네트워크관리사 2급",
    "최강 자격",
    "전자문제집 CBT",
    "www.comcbt.com",
    "에서 확인하세요",
    "기출문제 및 해설집",
)
NUMROW_RE = re.compile(r"\b1\s+2\s+3\s+4\s+5\b")


def normalize_option_text(text: str) -> str:
    text = strip_bom(text).strip()
    text = text.replace("\r", "")
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    # 페이지 경계에서 옵션 뒤에 붙은 노이즈 잘라내기
    cut = len(text)
    for tok in OPTION_TAIL_NOISE:
        pos = text.find(tok)
        if pos != -1:
            cut = min(cut, pos)
    m = NUMROW_RE.search(text)
    if m:
        cut = min(cut, m.start())
    # 과목 경계 문항: 선택지 끝에 다음 과목 헤더("2과목 : ...")가 붙는 경우 절단
    sm = re.search(r"\s*[1-4]\s*과목\s*[:：]", text)
    if sm:
        cut = min(cut, sm.start())
    text = text[:cut].strip()
    text = re.sub(r"[%s]+\s*$" % ALL_MARK, "", text).strip()
    return text.strip()


def mark_index(ch: str) -> int:
    return WHITE_TO_INDEX.get(ch, BLACK_TO_INDEX.get(ch, -1))


def is_black(ch: str) -> bool:
    return ch in BLACK_TO_INDEX


def parse_question_block(block: str) -> Optional[Tuple[str, List[str], Optional[int]]]:
    first = OPTION_MARK_RE.search(block)
    if not first:
        return None
    question_text = normalize_question_text(block[: first.start()])
    chunk = block[first.start():].strip()
    markers = list(OPTION_MARK_RE.finditer(chunk))
    if len(markers) > 4:
        markers = markers[:4]
    if len(markers) < 4:
        return None

    options: List[str] = []
    answer_index: Optional[int] = None
    for i, m in enumerate(markers):
        start = m.end()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(chunk)
        opt = normalize_option_text(chunk[start:end])
        options.append(opt if opt else OPTION_PLACEHOLDER)
        if is_black(m.group(1)):
            answer_index = i
    return question_text, options, answer_index


def parse_questions_from_column(column_text: str) -> List[Dict]:
    text = cleanup_linewise(column_text)
    matches = list(QUESTION_START_RE.finditer(text))
    items: List[Dict] = []
    for i, match in enumerate(matches):
        q_no = int(match.group(1))
        if not (1 <= q_no <= TOTAL_QUESTIONS):
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[match.start():end].strip()
        parsed = parse_question_block(block)
        if not parsed:
            continue
        q_text, options, ans = parsed
        items.append(
            {
                "problem_number": q_no,
                "question_text": q_text,
                "options": options,
                "answer_index": ans,
            }
        )
    return items


def _stitch_column_segments(raw_segments: List[str]) -> List[str]:
    stitched: List[str] = []
    for seg in raw_segments:
        text = cleanup_linewise(seg)
        if not text:
            continue
        first_q = QUESTION_START_RE.search(text)
        if first_q:
            prefix = text[: first_q.start()].strip()
            body = text[first_q.start():].strip()
            if prefix and stitched:
                line_start_opt = re.search(r"(?m)^\s*[%s]\s*" % ALL_MARK, prefix)
                if line_start_opt:
                    prefix = prefix[line_start_opt.start():].strip()
                else:
                    om = OPTION_MARK_RE.search(prefix)
                    if om:
                        prefix = prefix[om.start():].strip()
                if prefix:
                    stitched[-1] = f"{stitched[-1]}\n{prefix}".strip()
            stitched.append(body)
        else:
            if stitched:
                stitched[-1] = f"{stitched[-1]}\n{text}".strip()
            else:
                stitched.append(text)
    return stitched


def detect_answer_table_page(doc: pdfplumber.PDF) -> int:
    """정답표가 있는 페이지(문제 마커가 거의 없고 원문자가 밀집)를 탐지."""
    best_idx, best_score = -1, -1
    for i, page in enumerate(doc.pages):
        t = page.extract_text() or ""
        white = sum(t.count(c) for c in WHITE_TO_INDEX)
        q = len(QUESTION_START_RE.findall(t))
        # 번호줄("1 2 3 4 ...")이 있으면 가산
        has_numrow = bool(re.search(r"(?m)^\s*1\s+2\s+3\s+4\s+5\b", t))
        score = white - q * 3 + (30 if has_numrow else 0)
        if score > best_score:
            best_idx, best_score = i, score
    return best_idx


def extract_answer_table(doc: pdfplumber.PDF, page_index: int) -> Dict[int, int]:
    """마지막 페이지 정답표(번호줄/정답줄 반복)를 파싱."""
    t = doc.pages[page_index].extract_text() or ""
    lines = [ln.strip() for ln in t.split("\n") if ln.strip()]
    answers: Dict[int, int] = {}
    for idx, ln in enumerate(lines):
        nums = re.findall(r"\d{1,2}", ln)
        # 번호줄: 연속 정수 나열
        if len(nums) >= 5 and all(re.fullmatch(r"\d{1,2}", tok) for tok in ln.split()):
            seq = [int(x) for x in ln.split()]
            if seq == list(range(seq[0], seq[0] + len(seq))) and idx + 1 < len(lines):
                ans_line = lines[idx + 1]
                marks = [ch for ch in ans_line if ch in WHITE_TO_INDEX]
                for q_no, ch in zip(seq, marks):
                    if 1 <= q_no <= TOTAL_QUESTIONS:
                        answers[q_no] = WHITE_TO_INDEX[ch]
    return answers


def detect_subject_start_numbers(column_texts: List[str]) -> Dict[int, int]:
    """각 과목 헤더 직후 첫 문제 번호를 찾아 {과목번호: 시작문제번호} 반환."""
    big = "\n".join(cleanup_linewise(c) for c in column_texts)
    starts: Dict[int, int] = {}
    for m in SUBJECT_RE.finditer(big):
        subj = int(m.group(1))
        after = big[m.end():]
        qm = QUESTION_START_RE.search(after)
        if qm:
            starts.setdefault(subj, int(qm.group(1)))
    return starts


def build_sections(flat: List[Dict], subject_starts: Dict[int, int]) -> List[Tuple[str, int, int]]:
    """과목 시작 번호로 [(제목, start, end)] 범위 생성. 실패 시 균등 분할 fallback."""
    present = sorted(subject_starts.items())  # [(1, s1), (2, s2), ...]
    if len(present) == 4 and [p[0] for p in present] == [1, 2, 3, 4]:
        bounds = [p[1] for p in present] + [TOTAL_QUESTIONS + 1]
        ranges = []
        for i in range(4):
            ranges.append((SUBJECT_NAMES[i + 1], bounds[i], bounds[i + 1] - 1))
        return ranges
    # fallback: 표준 배분(회차 편차 대비 균등 실패 방지용)
    print(f"  [warn] 과목 경계 자동탐지 실패({subject_starts}) → 기본 12/13분할 사용", file=sys.stderr)
    return [
        (SUBJECT_NAMES[1], 1, 13),
        (SUBJECT_NAMES[2], 14, 25),
        (SUBJECT_NAMES[3], 26, 45),
        (SUBJECT_NAMES[4], 46, 50),
    ]


def build_problem_json(flat: List[Dict], ranges) -> List[Dict]:
    out = []
    for title, s, e in ranges:
        subset = [
            {"problem_number": q["problem_number"], "question_text": q["question_text"], "options": q["options"]}
            for q in flat
            if s <= q["problem_number"] <= e
        ]
        out.append({"title": title, "problems": subset})
    return out


def build_answer_json(flat: List[Dict], ranges, answer_map: Dict[int, int]) -> List[Dict]:
    q_map = {q["problem_number"]: q for q in flat}
    out = []
    for title, s, e in ranges:
        answers = []
        for q_no in range(s, e + 1):
            q = q_map[q_no]
            idx = answer_map.get(q_no)
            if idx is None or not (0 <= idx < len(q["options"])):
                raise ValueError(f"문제 {q_no} 정답 미확정 (idx={idx})")
            answers.append(
                {
                    "problem_number": q_no,
                    "correct_answer_index": idx,
                    "correct_answer_text": q["options"][idx],
                }
            )
        out.append({"title": title, "answers": answers})
    return out


def build_comment_json(ranges, answer_map: Dict[int, int], flat: List[Dict]) -> List[Dict]:
    q_map = {q["problem_number"]: q for q in flat}
    out = []
    for title, s, e in ranges:
        comments = []
        for q_no in range(s, e + 1):
            idx = answer_map[q_no]
            ans_text = q_map[q_no]["options"][idx]
            circled = INDEX_TO_WHITE[idx]
            comments.append(
                {
                    "problem_number": q_no,
                    "comment": (
                        f"정답은 {circled} \"{ans_text}\" 입니다.\n"
                        "본 문제집은 교사용 기출 PDF에서 문제/정답만 추출한 자료로, "
                        "상세 해설은 추후 보강 예정입니다."
                    ),
                }
            )
        out.append({"title": title, "comments": comments})
    return out


def validate(flat: List[Dict]) -> None:
    if len(flat) != TOTAL_QUESTIONS:
        raise ValueError(f"문항 수 {len(flat)} (기대 {TOTAL_QUESTIONS})")
    nums = sorted(q["problem_number"] for q in flat)
    if nums != list(range(1, TOTAL_QUESTIONS + 1)):
        missing = [n for n in range(1, TOTAL_QUESTIONS + 1) if n not in nums]
        raise ValueError(f"문항 번호 누락/중복: missing={missing}")
    for q in flat:
        if len(q["options"]) != 4:
            raise ValueError(f"문제 {q['problem_number']} 선택지 {len(q['options'])}개")


def process(pdf_path: Path, slug: str, title: str) -> Dict:
    with pdfplumber.open(str(pdf_path)) as doc:
        answer_page = detect_answer_table_page(doc)
        # 문제 페이지 = 정답표 페이지 이전까지 (정답표가 마지막이면 그 페이지 포함 문제도 있을 수 있어 전부 스캔)
        raw_segments: List[str] = []
        column_texts: List[str] = []
        for pi, page in enumerate(doc.pages):
            w, h = page.width, page.height
            mid = w / 2
            left = page.crop((0, 0, mid, h)).extract_text() or ""
            right = page.crop((mid, 0, w, h)).extract_text() or ""
            raw_segments.append(left)
            raw_segments.append(right)
            column_texts.append(left)
            column_texts.append(right)

        flat: Dict[int, Dict] = {}
        for seg in _stitch_column_segments(raw_segments):
            for q in parse_questions_from_column(seg):
                # 같은 번호 중복 시 정답 마킹이 있는 쪽 우선
                if q["problem_number"] not in flat or (q["answer_index"] is not None and flat[q["problem_number"]]["answer_index"] is None):
                    flat[q["problem_number"]] = q

        flat_list = [flat[n] for n in sorted(flat)]
        validate(flat_list)

        subject_starts = detect_subject_start_numbers(column_texts)
        ranges = build_sections(flat_list, subject_starts)

        table_answers = extract_answer_table(doc, answer_page)

    # 정답 결정: 본문 검은원 우선, 없으면 정답표
    answer_map: Dict[int, int] = {}
    mismatches = []
    body_count = 0
    for q in flat_list:
        n = q["problem_number"]
        body = q["answer_index"]
        table = table_answers.get(n)
        if body is not None:
            body_count += 1
            answer_map[n] = body
            if table is not None and table != body:
                mismatches.append((n, body, table))
        elif table is not None:
            answer_map[n] = table
        else:
            raise ValueError(f"문제 {n} 정답을 본문/정답표 어디서도 찾지 못함")

    problem_json = build_problem_json(flat_list, ranges)
    answer_json = build_answer_json(flat_list, ranges, answer_map)
    comment_json = build_comment_json(ranges, answer_map, flat_list)
    meta_json = {
        "slug": slug,
        "title": title,
        "kind": "pdf_exam",
        "examType": "network-admin-2",
        "totalProblems": TOTAL_QUESTIONS,
        "pdfFileName": pdf_path.name,
        "answerSource": "body_black_circle+answer_table",
        "answerCount": len(answer_map),
        "sections": [{"title": t, "start": s, "end": e} for t, s, e in ranges],
        "explanationExtraction": {"status": "none", "reason": "pdf_has_no_explanation"},
    }

    out_dir = DATASETS_DIR / slug
    write_json(out_dir / "problem1.json", problem_json)
    write_json(out_dir / "answer1.json", answer_json)
    write_json(out_dir / "comment1.json", comment_json)
    write_json(out_dir / "meta.json", meta_json)

    return {
        "slug": slug,
        "questions": len(flat_list),
        "answers": len(answer_map),
        "body_marked": body_count,
        "table_answers": len(table_answers),
        "mismatches": mismatches,
        "ranges": [(t, s, e) for t, s, e in ranges],
        "answer_page": answer_page + 1,
    }


# (PDF 파일명 날짜, slug, 표시 제목)
DATE_MAP = [
    ("20240225", "2024년 2월 25일"),
    ("20240519", "2024년 5월 19일"),
    ("20240825", "2024년 8월 25일"),
    ("20241103", "2024년 11월 3일"),
    ("20250223", "2025년 2월 23일"),
    ("20250525", "2025년 5월 25일"),
    ("20250824", "2025년 8월 24일"),
    ("20251102", "2025년 11월 2일"),
    ("20260201", "2026년 2월 1일"),
    ("20260517", "2026년 5월 17일"),
]


def main() -> None:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    results = []
    for date_key, date_label in DATE_MAP:
        if only and only not in date_key:
            continue
        pdf_path = DOWNLOADS / f"네트워크관리사2급{date_key}(교사용).pdf"
        if not pdf_path.exists():
            print(f"[skip] 파일 없음: {pdf_path.name}", file=sys.stderr)
            continue
        slug = f"network2-{date_key}"
        title = f"{date_label} 네트워크관리사 2급 필기"
        try:
            r = process(pdf_path, slug, title)
            results.append((slug, r))
            mm = f", 불일치{len(r['mismatches'])}" if r["mismatches"] else ""
            print(f"[OK] {slug}: 문항{r['questions']}, 정답{r['answers']}(본문{r['body_marked']}/표{r['table_answers']}){mm}, 과목{r['ranges']}")
            if r["mismatches"]:
                print(f"      본문≠정답표: {r['mismatches']}")
        except Exception as e:  # noqa: BLE001
            print(f"[FAIL] {slug}: {e}", file=sys.stderr)
    print(f"\n총 {len(results)}개 생성 완료.")
    # 카탈로그 등록용 스니펫 출력
    print("\n--- pdfPackCatalog 등록용 slug/title ---")
    for slug, r in results:
        pass


if __name__ == "__main__":
    main()
