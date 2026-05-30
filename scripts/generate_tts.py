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

# SQL 키워드 → 한글 발음. ShortsPlayer.js 의 TTS_KEYWORD_REPLACEMENTS 와 동기화 필요.
# 긴 표현 먼저 (NULLS FIRST 가 NULL 보다 먼저).
TTS_KEYWORD_REPLACEMENTS = [
    (r"\bNULLS FIRST\b", "널스 퍼스트"),
    (r"\bNULLS LAST\b", "널스 라스트"),
    (r"\bIS NOT NULL\b", "이즈 낫 널"),
    (r"\bIS NULL\b", "이즈 널"),
    (r"\bNOT NULL\b", "낫 널"),
    (r"\bNOT EXISTS\b", "낫 익시스트"),
    (r"\bNOT IN\b", "낫 인"),
    (r"\bGROUP BY\b", "그룹 바이"),
    (r"\bORDER BY\b", "오더 바이"),
    (r"\bPARTITION BY\b", "파티션 바이"),
    (r"\bGROUPING SETS\b", "그루핑 셋"),
    (r"\bFULL OUTER JOIN\b", "풀 아우터 조인"),
    (r"\bLEFT OUTER JOIN\b", "레프트 아우터 조인"),
    (r"\bRIGHT OUTER JOIN\b", "라이트 아우터 조인"),
    (r"\bFULL JOIN\b", "풀 조인"),
    (r"\bLEFT JOIN\b", "레프트 조인"),
    (r"\bRIGHT JOIN\b", "라이트 조인"),
    (r"\bINNER JOIN\b", "이너 조인"),
    (r"\bOUTER JOIN\b", "아우터 조인"),
    (r"\bCROSS JOIN\b", "크로스 조인"),
    (r"\bNATURAL JOIN\b", "네추럴 조인"),
    (r"\bSELF JOIN\b", "셀프 조인"),
    (r"\bUNION ALL\b", "유니언 올"),
    (r"\bWITH TIES\b", "위드 타이스"),
    (r"\bFETCH FIRST\b", "페치 퍼스트"),
    (r"\bUNBOUNDED PRECEDING\b", "언바운디드 프리시딩"),
    (r"\bUNBOUNDED FOLLOWING\b", "언바운디드 팔로잉"),
    (r"\bCURRENT ROW\b", "커런트 로우"),
    (r"\bROWS BETWEEN\b", "로우스 비트윈"),
    (r"\bDENSE_RANK\b", "덴스랭크"),
    (r"\bROW_NUMBER\b", "로우 넘버"),
    (r"\bFIRST_VALUE\b", "퍼스트 밸류"),
    (r"\bLAST_VALUE\b", "라스트 밸류"),
    (r"\bRATIO_TO_REPORT\b", "레이시오 투 리포트"),
    (r"\bPERCENT_RANK\b", "퍼센트 랭크"),
    (r"\bCUME_DIST\b", "큠 디스트"),
    (r"\bREGEXP_SUBSTR\b", "정규식 서브스트"),
    (r"\bREGEXP_INSTR\b", "정규식 인스트"),
    (r"\bREGEXP_REPLACE\b", "정규식 리플레이스"),
    (r"\bREGEXP_LIKE\b", "정규식 라이크"),
    (r"\bREGEXP_COUNT\b", "정규식 카운트"),
    (r"\bREGEXP\b", "정규식"),
    (r"\bZERO_DIVIDE\b", "제로 디바이드"),
    (r"\bSAVEPOINT\b", "세이브포인트"),
    (r"\bSP_A\b", "에스피 에이"),
    (r"\bSP_B\b", "에스피 비"),
    (r"\bSP1\b", "에스피원"),
    (r"\bSP2\b", "에스피투"),
    (r"\bROLLBACK TO\b", "롤백 투"),
    (r"\bROLLBACK\b", "롤백"),
    (r"\bCOMMIT\b", "커밋"),
    (r"\bTRUNCATE\b", "트런케이트"),
    (r"\bGRANT\b", "그랜트"),
    (r"\bREVOKE\b", "리보크"),
    (r"\bALTER TABLE\b", "알터 테이블"),
    (r"\bALTER\b", "알터"),
    (r"\bCREATE TABLE\b", "크리에이트 테이블"),
    (r"\bCREATE VIEW\b", "크리에이트 뷰"),
    (r"\bCREATE\b", "크리에이트"),
    (r"\bDELETE\b", "딜리트"),
    (r"\bUPDATE\b", "업데이트"),
    (r"\bINSERT ALL\b", "인서트 올"),
    (r"\bINSERT INTO\b", "인서트 인투"),
    (r"\bINSERT\b", "인서트"),
    (r"\bDROP\b", "드롭"),
    (r"\bBETWEEN\b", "비트윈"),
    (r"\bDISTINCT\b", "디스팅트"),
    (r"\bSELECT\b", "셀렉트"),
    (r"\bFROM\b", "프롬"),
    (r"\bWHERE\b", "웨어"),
    (r"\bHAVING\b", "해빙"),
    (r"\bUNION\b", "유니언"),
    (r"\bINTERSECT\b", "인터섹트"),
    (r"\bMINUS\b", "마이너스"),
    (r"\bEXCEPT\b", "익셉트"),
    (r"\bEXISTS\b", "익시스트"),
    (r"\bROLLUP\b", "롤업"),
    (r"\bCUBE\b", "큐브"),
    (r"\bPIVOT\b", "피봇"),
    (r"\bUNPIVOT\b", "언피봇"),
    (r"\bDECODE\b", "디코드"),
    (r"\bCOALESCE\b", "코얼레스"),
    (r"\bNULLIF\b", "널 이프"),
    (r"\bNVL2\b", "엔브이엘 투"),
    (r"\bNVL\b", "엔브이엘"),
    (r"\bRANK\b", "랭크"),
    (r"\bNTILE\b", "엔타일"),
    (r"\bLEAD\b", "리드"),
    (r"\bLAG\b", "래그"),
    (r"\bOVER\b", "오버"),
    (r"\bCOUNT\b", "카운트"),
    (r"\bMAX\b", "맥스"),
    (r"\bMIN\b", "민"),
    (r"\bSUM\b", "썸"),
    (r"\bAVG\b", "에이브이지"),
    (r"\bWHEN\b", "웬"),
    (r"\bTHEN\b", "덴"),
    (r"\bELSE\b", "엘스"),
    (r"\bEND\b", "엔드"),
    (r"\bCASE\b", "케이스"),
    (r"\bASC\b", "오름차순"),
    (r"\bDESC\b", "내림차순"),
    (r"\bNULLS\b", "널스"),
    (r"\bNULL\b", "널"),
    (r"\bUSING\b", "유징"),
    (r"\bCONNECT BY\b", "커넥트 바이"),
    (r"\bPRIOR\b", "프라이어"),
    (r"\bSTART WITH\b", "스타트 위드"),
    (r"\bLEVEL\b", "레벨"),
    (r"\bROWNUM\b", "로우넘"),
    (r"\bROWS\b", "로우스"),
    (r"\bONLY\b", "온리"),
    (r"\bFETCH\b", "페치"),
    (r"\bLIKE\b", "라이크"),
    (r"\bSQL\b", "에스큐엘"),
    (r"\bDDL\b", "디디엘"),
    (r"\bDML\b", "디엠엘"),
    (r"\bDCL\b", "디씨엘"),
    (r"\bTCL\b", "티씨엘"),
    (r"\bBCNF\b", "비씨엔에프"),
    (r"\bORA-", "오라 "),
    (r"\bROW LIMITING\b", "로우 리미팅"),
    (r"\bTOP-N\b", "톱 엔"),
    (r"\bUNKNOWN\b", "언노운"),
    (r"\bTRUE\b", "트루"),
    (r"\bFALSE\b", "폴스"),
]


def clean_for_tts(text: str) -> str:
    s = text or ""
    for pat, rep in TTS_LABEL_REPLACEMENTS:
        s = re.sub(pat, rep, s)
    for old, new in TTS_SYMBOL_REPLACEMENTS:
        s = s.replace(old, new)
    for pat, rep in TTS_KEYWORD_REPLACEMENTS:
        s = re.sub(pat, rep, s, flags=re.IGNORECASE)
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
