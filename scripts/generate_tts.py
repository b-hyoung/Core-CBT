"""
숏츠 모드용 TTS MP3 사전 생성 스크립트.

사용:
  python scripts/generate_tts.py sqld 2025-first
  python scripts/generate_tts.py sqld 2025-first --voice ko-KR-InJoonNeural
  python scripts/generate_tts.py sqld 2025-first --rvc  # voice-changer 실행 중일 때 후처리

출력: public/audio/shorts/<subject>/<session>/<number>_<phase>.mp3
페이즈: question, answer, explanation
ShortsPlayer.js 의 buildXxxScript + cleanForTts 와 동일 결과를 생성합니다.
"""

import argparse
import asyncio
import io
import json
import re
import sys
from pathlib import Path

# Windows cp949 콘솔에서도 한글/유니코드 출력 가능하도록 강제 UTF-8
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import edge_tts


# ── 상수: ShortsPlayer.js 와 동기화 필요 ─────────────────────────
OPTION_SYMBOLS = ["①", "②", "③", "④", "⑤", "⑥"]

TTS_LABEL_REPLACEMENTS = [
    (r"\[핵심\]", "핵심."),
    (r"\[풀이\]", "풀이."),
    (r"\[오답\]", "오답 정리."),
    (r"\[암기\]", "암기 포인트."),
    (r"\[데이터\]", "데이터."),
    (r"\[입력\]", "입력."),
    (r"\[보기\]", "보기."),
    (r"\[배경\]", "배경."),
    (r"\[상황\]", "상황."),
    (r"\[조건\]", "조건."),
    (r"\[조합\]", "조합."),
    (r"\[연산\]", "연산."),
    (r"\[비교\]", "비교."),
    (r"\[함수\]", "함수."),
    (r"\[구문\]", "구문."),
    (r"\[문제\]", "문제."),
    (r"\[쿼리\]", "쿼리."),
    (r"\[시나리오\]", "시나리오."),
]

TTS_SYMBOL_REPLACEMENTS = [
    ("①", "1번"),
    ("②", "2번"),
    ("③", "3번"),
    ("④", "4번"),
    ("⑤", "5번"),
    ("⑥", "6번"),
    ("→", ", "),
    ("∪", " 합 "),
    ("∩", " 교 "),
    ("≡", " 같음 "),
    ("≥", " 이상 "),
    ("≤", " 이하 "),
    ("×", " 곱하기 "),
]


def clean_for_tts(text: str) -> str:
    s = text or ""
    for pat, rep in TTS_LABEL_REPLACEMENTS:
        s = re.sub(pat, rep, s)
    for old, new in TTS_SYMBOL_REPLACEMENTS:
        s = s.replace(old, new)
    # 남은 [라벨] 일반화
    s = re.sub(r"\[([^\]]+)\]", r"\1.", s)
    # 줄바꿈/공백 정리
    s = re.sub(r"\s*\n+\s*", " ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


def extract_puri_section(comment: str) -> str:
    if not comment:
        return ""
    m = re.search(r"\[\s*풀이\s*\]([\s\S]*?)(?=\n\s*\[[^\]]+\]|$)", comment)
    return (m.group(1) if m else comment).strip()


def build_question_script(item: dict) -> str:
    parts = [f"{item['number']}번.", item["question"]]
    if item.get("examples"):
        parts.append(item["examples"])
    for i, opt in enumerate(item["options"]):
        sym = OPTION_SYMBOLS[i] if i < len(OPTION_SYMBOLS) else f"{i+1}번"
        parts.append(f"{sym}. {opt}.")
    return clean_for_tts(" ".join(parts))


def build_answer_script(item: dict) -> str:
    idx = item["correctIndex"]
    sym = OPTION_SYMBOLS[idx] if 0 <= idx < len(OPTION_SYMBOLS) else f"{idx+1}번"
    return clean_for_tts(f"정답은 {sym}. {item['correctText']}.")


def build_explanation_script(item: dict) -> str:
    if not item.get("comment"):
        return ""
    puri = extract_puri_section(item["comment"])
    s = clean_for_tts(puri)
    # 괄호 + 내용 통째 제거 (ShortsPlayer 와 동일)
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"(^|\s)[·\-]\s+", r"\1", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return f"해설. {s}" if s else ""


def load_session_data(subject: str, session_key: str, root: Path) -> list:
    base = root / "datasets" / subject / session_key
    problem_data = json.loads((base / "problem1.json").read_text(encoding="utf-8"))
    answer_data = json.loads((base / "answer1.json").read_text(encoding="utf-8"))
    comment_data = json.loads((base / "comment1.json").read_text(encoding="utf-8"))

    problems = []
    for sec in problem_data:
        for p in sec.get("problems", []):
            problems.append({
                "number": int(p["problem_number"]),
                "sectionTitle": sec.get("title", ""),
                "question": str(p.get("question_text", "")),
                "options": [str(o) for o in p.get("options", [])],
                "examples": str(p.get("examples", "")) if p.get("examples") else "",
            })

    answers_by_no = {}
    for sec in answer_data:
        for a in sec.get("answers", []):
            answers_by_no[int(a["problem_number"])] = {
                "index": int(a.get("correct_answer_index", -1)),
                "text": str(a.get("correct_answer_text", "")),
            }

    comments_by_no = {}
    for sec in comment_data:
        for c in sec.get("comments", []):
            comments_by_no[int(c["problem_number"])] = str(c.get("comment", ""))

    items = []
    for p in problems:
        a = answers_by_no.get(p["number"], {"index": -1, "text": ""})
        items.append({
            **p,
            "correctIndex": a["index"],
            "correctText": a["text"],
            "comment": comments_by_no.get(p["number"], ""),
        })
    return items


async def synthesize(text: str, out_path: Path, voice: str) -> bool:
    if not text.strip():
        return False
    communicate = edge_tts.Communicate(text, voice)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    await communicate.save(str(out_path))
    return out_path.exists() and out_path.stat().st_size > 0


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("subject", help="예: sqld, problem2024, pdfPacks")
    parser.add_argument("session", help="예: 2025-first")
    parser.add_argument("--voice", default="ko-KR-SunHiNeural",
                        help="ko-KR-SunHiNeural (여) | ko-KR-InJoonNeural (남) | ko-KR-HyunsuMultilingualNeural (남)")
    parser.add_argument("--overwrite", action="store_true", help="기존 MP3 덮어쓰기")
    parser.add_argument("--only", type=int, default=None, help="특정 문제 번호만 생성 (테스트용)")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent  # Core-CBT 루트
    items = load_session_data(args.subject, args.session, root)
    if args.only:
        items = [it for it in items if it["number"] == args.only]
    if not items:
        print("아이템이 없습니다.", file=sys.stderr)
        sys.exit(1)

    out_root = root / "public" / "audio" / "shorts" / args.subject / args.session
    print(f"생성 대상: {len(items)} 문제 → {out_root}")
    print(f"음성: {args.voice}")

    created = 0
    skipped = 0
    failed = 0
    for item in items:
        n = item["number"]
        phases = {
            "question": build_question_script(item),
            "answer": build_answer_script(item),
            "explanation": build_explanation_script(item),
        }
        for phase, script in phases.items():
            out = out_root / f"{n}_{phase}.mp3"
            if not script.strip():
                if phase == "explanation":
                    skipped += 1
                continue
            if out.exists() and not args.overwrite:
                skipped += 1
                continue
            try:
                ok = await synthesize(script, out, args.voice)
                if ok:
                    created += 1
                    print(f"  [OK] {n}_{phase}.mp3 ({len(script)}chars)")
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                print(f"  [FAIL] {n}_{phase}: {e}", file=sys.stderr)

    print(f"\n완료: 생성 {created} / 스킵 {skipped} / 실패 {failed}")


if __name__ == "__main__":
    asyncio.run(main())
