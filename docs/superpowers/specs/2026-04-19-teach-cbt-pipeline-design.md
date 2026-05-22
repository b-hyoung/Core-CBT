# teach_CBT: AI 학습 데이터 파이프라인 설계서

## 1. 개요

정보처리산업기사 실기 Code(C/Java/Python) + SQL query 문제의 **유사 문제 생성 → 품질 평가 → 파인튜닝** 파이프라인.

Core-CBT의 AI 코치가 내는 유사 문제의 품질을 근본적으로 개선하기 위한 별도 프로젝트.

**프로젝트 위치:** `C:\Users\ACE\Desktop\bobs_project\teach_CBT`

## 2. 대상 범위

### 포함
| 카테고리 | 서브카테고리 | 현재 보유 | 비고 |
|---------|------------|----------|------|
| Code | C | 47문제 | 가장 많음 |
| Code | Java | 27문제 | |
| Code | Python | 9문제 | 부족 → 크로스 언어 변환으로 보충 |
| SQL | query | 17문제 | SELECT/INSERT/UPDATE 등 실제 쿼리만 |
| **합계** | | **100문제** | |

### 제외
- 필기 전체
- 실기 이론 (정규화, 트랜잭션, 키 개념 등)
- SQL theory (subcategory=theory)

## 3. 아키텍처 (4 Phase)

```
Phase 1: 데이터 수집 (크롤링 + 정규화)
    ↓
Phase 2: 유사 문제 쌍 생성 (GPT-4o-mini + gpt-oss:20b)
    ↓
Phase 3: 품질 평가 (Claude/GPT-4o 평가자)
    ↓
Phase 4: 파인튜닝 (gpt-oss:20b LoRA → ollama 등록)
```

## 4. Phase 1: 데이터 수집

### 4.1 크롤링 대상
- **기존 기출 해설 보충:** 같은 회차(2022-1 ~ 2025-3) 문제의 다른 출처 해설 수집. 해설 품질·관점 다양화.
- **모의고사/예상 문제:** 기출은 아니지만 같은 형식의 Code/SQL 문제 수집. 데이터 양 증가.

### 4.2 수집 범위
- 정보처리산업기사 실기만 (기사 제외)
- Code(C/Java/Python) + SQL query만

### 4.3 정규화 형식
수집된 데이터를 Core-CBT 데이터셋과 동일한 JSON 구조로 변환:
```json
{
  "problem_number": 1,
  "question_text": "다음 C 코드의 출력 결과를 쓰시오.",
  "examples": "#include <stdio.h>\nint main() { ... }",
  "input_type": "single",
  "category": "Code",
  "subcategory": "C",
  "answer": "5",
  "source": "crawled",
  "source_url": "https://..."
}
```

### 4.4 저장 위치
```
teach_CBT/
├── data/
│   ├── raw/              ← 크롤링 원본 HTML/JSON
│   ├── normalized/       ← 정규화된 JSON
│   └── core_cbt_link/    ← Core-CBT datasets 심볼릭 링크 or 복사
```

## 5. Phase 2: 유사 문제 쌍 생성

### 5.1 생성 전략
| 언어 | 원본 수 | 쌍/문제 | 예상 쌍 | 보충 |
|------|--------|--------|--------|------|
| C | 47+ | 3 | 141+ | |
| Java | 27+ | 4 | 108+ | |
| Python | 9+ | 5 | 45+ | C/Java → Python 크로스 변환 20쌍 |
| SQL query | 17+ | 4 | 68+ | |
| **합계** | | | **380+쌍** | |

### 5.2 생성자 모델
- **GPT-4o-mini (API):** 품질 높음, 비용 $1 미만
- **gpt-oss:20b (로컬 ollama):** 비용 0, 품질 비교 대상

같은 원본에 대해 양쪽 모두 생성 → Phase 3에서 비교 평가.

### 5.3 크로스 언어 변환 (Python 보충)
C/Java의 반복문·배열·조건문 문제를 Python 버전으로 변환:
```
원본 (C): for 루프로 배열 합 구하기 → 출력: 15
변환 (Python): 같은 로직 Python 버전 → 출력: 15 (변수값 변경)
```
같은 개념이므로 품질 보장. 변환 시 정답은 반드시 다르게.

### 5.4 생성 규칙
- 원본 문제와 정답이 동일하면 폐기
- 이전 유사 문제와 정답 50% 이상 겹치면 폐기
- 빈칸 구조(개수, 라벨) 유지
- 시험 문체 유지 ("다음 코드의 출력 결과를 쓰시오")

### 5.5 출력 형식
```json
{
  "original": { "session_id": "2024-first", "problem_number": 9, ... },
  "generated": { "question_text": "...", "examples": "...", "expected_answer": "...", ... },
  "generator": "gpt-4o-mini",
  "generation_timestamp": "2026-04-19T...",
  "status": "pending_review"
}
```

### 5.6 저장 위치
```
teach_CBT/
├── pairs/
│   ├── raw/              ← 생성된 전체 쌍
│   ├── approved/         ← 평가 통과
│   └── rejected/         ← 평가 실패 (분석용 보관)
```

## 6. Phase 3: 품질 평가

### 6.1 평가자
- **Claude 또는 GPT-4o** (생성자와 분리)
- 생성자보다 상위 모델로 평가하여 품질 보장

### 6.2 평가 기준 (5점 척도)

| 기준 | 설명 | 패스 조건 |
|------|------|----------|
| 정답 차별성 | 원본과 정답이 다른가 | 필수 (동일하면 즉시 실패) |
| 구조 유지 | 빈칸 개수/라벨, input_type 유지 | 필수 |
| 풀이 가능성 | 문제가 논리적으로 풀 수 있는가, 정답이 맞는가 | 필수 |
| 난이도 유사성 | 원본과 비슷한 수준인가 | 3점 이상 |
| 문체 유지 | 정보처리산업기사 실기 스타일인가 | 3점 이상 |

### 6.3 평가 출력
```json
{
  "pair_id": "...",
  "scores": {
    "answer_diff": true,
    "structure_kept": true,
    "solvable": true,
    "difficulty": 4,
    "style": 5
  },
  "pass": true,
  "evaluator": "claude-opus-4-6",
  "feedback": "난이도 적절, SQL 키워드 변형 자연스러움"
}
```

### 6.4 통과/실패 기준
- 정답 차별성 + 구조 유지 + 풀이 가능성: 3개 모두 필수
- 난이도 + 문체: 각 3점 이상
- 5개 기준 중 하나라도 실패 → rejected

## 7. Phase 4: 파인튜닝

### 7.1 환경
- **모델:** gpt-oss:20b
- **방법:** LoRA (Low-Rank Adaptation)
- **GPU:** NVIDIA RTX 5060 Ti 16GB VRAM
- **프레임워크:** unsloth 또는 axolotl (LoRA 최적화)

### 7.2 학습 데이터 형식
Phase 3 통과 쌍을 instruction-tuning 형식으로 변환:
```json
{
  "instruction": "다음 정보처리산업기사 실기 문제와 같은 개념을 테스트하되 정답이 다른 유사 문제를 만들어주세요.",
  "input": "원본 문제: ... / 정답: ... / 카테고리: Code/C",
  "output": "유사 문제: ... / 정답: ... / 해설: ..."
}
```

### 7.3 학습 후 배포
```bash
# ollama에 등록
ollama create cbt-tutor -f Modelfile

# Core-CBT에서 사용
# .env:
# LLM_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=cbt-tutor
```

### 7.4 반복 학습 루프
```
파인튜닝 모델로 생성 → 평가 → 좋은 데이터 추가 → 재학습
```
유저 피드백(Core-CBT agent_sessions의 quality_flag)도 반영.

## 8. 프로젝트 구조

```
teach_CBT/
├── data/
│   ├── raw/                  ← 크롤링 원본
│   ├── normalized/           ← 정규화 JSON
│   └── core_cbt_link/        ← Core-CBT datasets 참조
├── crawlers/
│   ├── __init__.py
│   └── practical_crawler.py  ← 크롤링 + 파싱
├── generators/
│   ├── __init__.py
│   ├── pair_generator.py     ← 유사 문제 쌍 생성
│   └── cross_lang.py         ← 크로스 언어 변환
├── evaluators/
│   ├── __init__.py
│   └── quality_evaluator.py  ← 품질 평가
├── pairs/
│   ├── raw/                  ← 생성된 전체 쌍
│   ├── approved/             ← 평가 통과
│   └── rejected/             ← 실패 (분석용)
├── finetune/
│   ├── prepare_data.py       ← 학습 데이터 변환
│   ├── train.py              ← LoRA 학습 스크립트
│   └── Modelfile             ← ollama 등록용
├── config.py                 ← 환경변수/설정
├── requirements.txt
└── README.md
```

## 9. 기술 스택

- **언어:** Python 3.11
- **크롤링:** httpx + BeautifulSoup (또는 Playwright)
- **LLM 호출:** openai SDK (OpenAI + ollama 호환)
- **파인튜닝:** unsloth (LoRA) + transformers
- **평가:** anthropic SDK (Claude) 또는 openai SDK (GPT-4o)
- **데이터:** JSON 파일 기반 (DB 불필요)

## 10. 성공 기준

- Phase 1: 크롤링으로 20문제 이상 추가 수집
- Phase 2: 400쌍 이상 생성
- Phase 3: 70% 이상 통과율 (280쌍+)
- Phase 4: 파인튜닝 모델이 GPT-4o-mini보다 정답 차별성 높은 유사 문제 생성

## 11. 의존성

- **Core-CBT → teach_CBT:** datasets 폴더 참조 (읽기 전용)
- **teach_CBT → Core-CBT:** 파인튜닝 모델을 ollama에 등록 후 `.env`에서 전환
- **독립 실행 가능:** teach_CBT는 Core-CBT 서버 없이 단독 실행
