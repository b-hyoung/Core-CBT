# 실기 코칭 리빌딩 — 학습과학 논문 리서치

- 날짜: 2026-07-13
- 목적: 정보처리산업기사 실기(단답형·용어·SQL·코드 결과 예측) 코칭 기능 리빌딩의 근거 자료
- 판단 기준: **"내 공부에 적용하면 실제로 잘 외워질까"** — 각 아이디어를 파지(retention)·전이(신규 문항 대응) 효과 근거로 평가
- 조사 축: ① 인출 연습·간격 반복 ② 피드백·힌트 설계 ③ 유사 문항 생성·전이 ④ 취약점 진단·추천

---

## 한눈에 보는 결론 (근거 강도순)

| 순위 | 설계 결정 | 근거 | 효과 크기 |
|---|---|---|---|
| 1 | 복습 = 오답 **다시 풀기** (오답노트 다시 읽기 금지) | Larsen 2009 RCT, Rowland 2014 메타 | d = 0.91 |
| 2 | 인터리빙 출제 — 세션 안에서 주제를 섞는다 | Rohrer 2020 RCT (787명) | d = 0.83 |
| 3 | 피드백 3층 구조: 정오 + 정답 + **"왜"** 설명 | Van der Kleij 2015 메타 | d = 0.49 (vs 정오만 0.05) |
| 4 | 힌트 사다리 3단계, **정답 절대 미포함** + 첫 시도 전 잠금 | Aleven/Koedinger 계열, LAK 2026 | 남용 시 학습 저하 반복 검증 |
| 5 | 유사 문항 = **템플릿 방식** (개념 고정, 표면만 치환) + SQL/코드는 실행 검증 | Gierl AIG + Raviv 2022 + Law 2025 | 자유 생성은 결함률 ~49% |
| 6 | 간격 반복: 오답 1일→3일→7일, 복습 간격 ≈ 시험까지 남은 기간의 10~20% | Cepeda 2006/2008 | 간격의 존재 > 알고리즘 정밀도 |
| 7 | 숙달 판정 = **며칠 뒤 변형 문항을 맞혔을 때** (당일 정답 아님) | Bjork, Roediger & Karpicke 2006 | 유창성 착각 차단 |
| 8 | 진단 리포트 = 개념별 숙달 바 + **과신 콜아웃** + 원탭 행동 CTA | Corbett & Anderson, Dunlosky 2012, Bodily & Verbert 2017 | 보여주기만 하면 절반 확률로 무효 |

---

## 축 1. 인출 연습·간격 반복 — "어떻게 복습시킬 것인가"

### 핵심 발견

**문제를 다시 푸는 것이 다시 읽는 것을 압도한다.**
- Rowland 2014 (*Psychological Bulletin*, 159개 효과크기 메타분석): 인출 연습 > 재학습, 평균 g = 0.50. **피드백을 붙이면 효과가 약 2배** (g ≈ 0.73 vs 0.39).
- Larsen, Butler & Roediger 2009 (*Medical Education*, 레지던트 RCT): 2주 간격 반복 테스트 vs 반복 복습 — 6개월 후 **39% vs 26% (d = 0.91)**.
- Deng et al. 2015: 의사면허시험(USMLE) 준비생 데이터에서 연습문제 풀이량이 실제 점수의 강한 예측변인 (445문항당 +1점).

**단답형 연습은 피드백과 결합할 때만 최강이다.**
- Kang, McDermott & Roediger 2007: 피드백이 없으면 객관식 연습이 낫지만, **정답 피드백이 있으면 단답형(타이핑) 연습이 최종 성적 최고** — 본 시험이 단답형인 정처산기와 형식도 일치(전이-적합 처리).
- Adesope 2017 메타: 같은 문제 무한 반복보다 **커버리지·변형이 우선** — 1회 테스트만으로도 효과 대부분 확보.

**간격은 "존재"가 "정밀도"보다 중요하다.**
- Cepeda 2006 메타(317개 실험) + 2008 대규모 실험: 최적 복습 간격 ≈ **시험까지 남은 기간의 10~20%**. 간격이 너무 짧은 쪽이 너무 긴 쪽보다 손해. 고정 vs 확장 간격 차이는 작음 — SM-2 같은 정밀 SRS에 집착할 필요 없음.

### 앱 적용 아이디어 → 잘 외워질까?

| 아이디어 | 평가 |
|---|---|
| 오답 복습 화면을 "재출제"로 통일 — 읽기 전용 오답노트 제거/격하 | ✅ 이번 리서치 전체에서 가장 확실 (d≈0.9) |
| 타이핑 답안 + 즉시 정답·해설 표시를 기본 모드로 | ✅ 본 시험 형식 일치 + 인출 노력 극대화 |
| 정답 보기(reveal) 모드에는 인출 강제 지연(버튼 3초 지연 등) | ✅ 관대한 자가채점 착각 방지 |
| 시험일 입력 → "남은 기간의 10~20%" 규칙으로 복습 시점 자동 배치 | ✅ 수치 규칙이 명확해 구현 대비 효과 큼 |
| 오답 재출제 간격: 1일 → 3일 → 7일 (맞히면 확장, 틀리면 리셋) | ✅ 단순 규칙으로 충분하다는 게 문헌 결론 |
| 누적 풀이량 지표 + 목표량 제시 | ✅ 풀이량 자체가 합격 예측변인 (동기부여용) |

---

## 축 2. 피드백·힌트 설계 — "틀렸을 때 뭘 보여줄 것인가"

### 핵심 발견

**"틀렸습니다/정답은 X"는 사실상 학습 효과가 없다.**
- Van der Kleij 2015 (*RER* 메타분석): 정오만(KR) **d = 0.05**, 정답 제공(KCR) d = 0.32, **"왜"까지 설명(EF) d = 0.49**. 설명 유무가 효과를 10배 가른다.
- Shute 2008 (피인용 3,500+): 좋은 피드백 = 구체적, 과제 초점, 소량, **힌트→단서→정답의 점진 공개**. 등수 비교를 섞으면 학습 초점이 흐려짐.

**피드백은 "읽는 것"이 아니라 "읽고 다시 푸는 것"이 암기를 만든다.**
- Butler & Roediger 2007/2008: 세션 종료 후 몰아주는 지연 피드백이 즉시 피드백보다 파지 우수 (분산 학습으로 작동). 단 현실에서는 지연 피드백을 안 읽는 문제 → 절충: 문항별 즉시 피드백 유지 + **세션 말미 오답 요약 재복습**.

**힌트는 남용되면 독이다.**
- Aleven & Koedinger: ITS 로그에서 학생 행동의 72%가 비생산적 도움 요청, **82~89%가 중간 힌트를 연타로 건너뛰고 정답 힌트로 직행**. Xiao et al. LAK 2026 (999명, 3학기): 문제 시도 전 힌트 요청 + 피상적 열람이 사전지식 통제 후에도 낮은 성과와 일관 연관.

**LLM 힌트는 조건부로만 효과.**
- Thomas et al. 2025 (EC-TEL, 885명): LLM 피드백은 7개 레슨 중 2개에서만 유의 효과 (d = 0.28~0.33) — 자발적으로 참여할 때만. 만족도 ≠ 학습 효과.
- Xiao et al. 2024 (CHI): 추상적 자연어 힌트만으로는 불충분·때로 오도적. 코드류는 부분 코드 수준의 구체 단서 필요.
- 반복 보고된 실패 모드: 오정보 포함, 정답 유출, 과의존.

### 앱 적용 아이디어 → 잘 외워질까?

| 아이디어 | 평가 |
|---|---|
| 피드백 3층: ① 정오 ② 정답 ③ 왜 (SQL은 절별 영향, 코드는 실행 트레이스, 용어는 정의+혼동 용어 구별점) | ✅ d 0.49 vs 0.05 — 이 축 최대 지렛대 |
| 사용자의 오답을 참조한 설명 ("X라고 썼는데 X는 ~라서 다름") | ✅ 오개념 교정 > 단순 재노출 |
| 힌트 사다리: 개념 방향 → 구체 단서 → 거의-정답 스캐폴드. **정답 문자열 절대 미포함** | ✅ 단답형에서 정답 유출 = 인출 연습 무효화 |
| 첫 답안 제출(또는 N초) 전 힌트 잠금 + 연타 방지 + 힌트 사용 문항은 복습 큐 재삽입 | ✅ 3학기 반복 검증된 남용 패턴 차단 |
| 세션 종료 후 "오늘 틀린 문제" 요약 재복습 화면 | ✅ 지연 피드백 + 분산 효과, 구현 저비용 |
| LLM 힌트는 실시간 생성이 아닌 **사전 배치 생성 + 정답 문자열 미포함 자동 검증 + 샘플 검수** | ✅ 오도성·유출 두 실패 모드 차단 |
| LLM 해설·힌트는 옵트인 버튼 (강제 노출 금지) | ⚠️ 조건부 — 효과는 자발 참여자에게서만 발생 |
| 해설 분량은 핵심 1~3문장 + 더보기 접기 | ✅ 인지 과부하 방지 |

---

## 축 3. 유사 문항 생성·전이 — "같은 문제는 안 나온다"에 대응

### 핵심 발견

**인터리빙(주제 섞기)은 공짜로 d≈0.8을 준다.**
- Rohrer & Taylor 2007: 셔플 연습이 연습 중엔 더 틀리지만 1주 후 시험에서 **63% vs 20%**.
- Rohrer et al. 2020 (*JEP*, 787명 학급 RCT): 같은 문제를 순서만 바꿔서 1개월 후 비예고 시험 **61% vs 38%, d = 0.83**. 콘텐츠 추가 비용 0.
- 기전 (Taylor & Rohrer 2010): 이득은 "이 문제가 무슨 유형인지 스스로 판별하는 능력"에서 나옴 — 시험장은 유형이 예고되지 않으므로 이 훈련 자체가 신규 문항 대응력.

**변이가 일반화를 만든다.**
- Raviv, Lupyan & Green 2022 (*TiCS*, 150편 리뷰): 저변이 입력 = 빠른 습득·전이 실패, 고변이 입력 = 느린 습득·강한 일반화. 조건: 시험에서 요구될 변이 차원을 훈련에서 미리 경험시킬 것. 초심자에겐 변이가 부담 → **점진적 다양화** (첫 학습은 원형+변형 1개, 회차마다 확대).
- Bjork "바람직한 어려움": 연습 중 체감 수행과 실제 학습은 역상관일 수 있음 → 앱은 체감이 아니라 **지연·전이 지표**로 진도를 판정해야 함.

**LLM 문항 생성: 자유 생성은 안 되고, 템플릿 방식은 된다.**
- Gierl & Haladyna (AIG 표준 방법론): 검증된 방식은 인지 모델 → **문항 모델(고정부=측정 개념, 가변부=슬롯)** → 슬롯 전개. 품질 관리를 문항 단위가 아닌 템플릿 단위로 1회.
- Law et al. 2025 (*BMC Med Educ*, 고부담 시험 실측): GPT-4o 문항은 변별도는 동등하나 쉽고, 결함률 높음 (무관련 6% vs 0%, 부적절 난이도 14% vs 1%). 체계적 리뷰: LLM 문항 ~49% 작성 결함, ~22% 개념 오류 — 단 91%는 "수정 출발점으론 적절". 제작 시간은 1/4.

### 앱 적용 아이디어 → 신규 문항 대응에 도움 될까?

| 아이디어 | 평가 |
|---|---|
| 복습·모의 세션 기본 정책 = 인터리빙 (같은 토픽 연속 2문항 금지) | ✅ 무비용 d≈0.8, 최우선 적용 |
| 문제 카드에 "GROUP BY 단원" 같은 유형 라벨 사전 노출 금지 | ✅ 유형 판별 훈련을 지키는 조건 |
| 기출 → LLM으로 문항 모델 추출(측정 개념 고정 + 테이블명·값·표현 슬롯) → 슬롯 치환으로 변형 생성 | ✅ 전이 이론·AIG 방법론·LLM 실측 3갈래 증거 수렴 |
| **SQL/코드 변형은 실제 실행해서 정답 기계 검증** (executor validator 필수 게이트) | ✅ 이 도메인만의 특권 — 사실 오류를 사실상 0으로 |
| 변형 난이도가 기출 앵커에서 이탈하면 정답률 데이터로 자동 퇴출 | ✅ "AI 문항은 너무 쉬움" 문제 대응 |
| 숙달 판정 = 며칠 뒤 처음 보는 변형을 맞혔을 때 | ✅ 앱의 성공 지표가 시험장 성능과 정렬 |
| "혼합 모드는 원래 정답률이 낮습니다 — 그게 정상" 안내 | ⚠️ 보조적 — 효과 있는 기능에서 이탈 방지용 |

---

## 축 4. 취약점 진단·추천 — "세션 후 뭘 보여주고 뭘 풀게 할 것인가"

### 핵심 발견

**미숙달 개념에 연습을 더 배정하는 것 자체가 효과의 원천이다.**
- Corbett & Anderson 1995 (BKT 원조): 스킬별 숙달 확률 추정 + 숙달까지 추가 출제 = 튜터 기본 효과(~1 SD) 위에 **+0.5 SD 추가**. 시스템이 계산한 숙달도가 실제 시험 정답률을 잘 예측.
- ALEKS 계열: 선수지식 그래프 기반 적응 학습이 숙련 교사 수업과 동등한 성과.

**약점을 "보여주기만" 하면 절반 확률로 무효다.**
- Bodily & Verbert 2017 (94편 리뷰): 성취 효과를 측정한 14편 중 8편만 유의. 결론: 대시보드는 **다음 행동으로 연결되는 추천과 결합**될 때만 효과.

**과신이 불합격을 만든다.**
- Dunlosky & Rawson 2012: 용어 정의 학습(이 앱과 거의 동일한 과제)에서 자기 평가가 과신인 학생일수록 덜 학습된 상태로 공부를 중단, 최종 파지 유의하게 낮음. 객관적 기준으로 교정하라고 권고.

**망각 시점 기반 복습은 대규모 실증이 있다.**
- Settles & Meeder 2016 (Duolingo, 1,300만 사용자): 반감기 회귀로 "잊기 직전" 항목 우선 복습 → A/B에서 리텐션 +9.5%, 활동량 +12%. 완전 구현 없이 "경과일 × 과거 오답률" 휴리스틱으로도 방향성 확보 가능.

### 앱 적용 아이디어 → 잘 외워질까?

| 아이디어 | 평가 |
|---|---|
| 개념별 숙달 바 (단순 정답률이 아닌 최근 응답 가중 추정) + 미숙달 개념에서 다음 문제 추천 | ✅ +0.5 SD의 원천이 정확히 이 로직 |
| 리포트의 모든 차트 아래 원탭 CTA ("정규화 약점 문제 5개 풀기") | ✅ 필수 — 없으면 리포트는 장식이 될 확률 절반 |
| 과신 콜아웃: 풀이 전 자신감 원탭 수집 → "'안다'고 한 개념의 실제 정답률 40%" 경고. 마찰이 크면 "빨리 답했지만 틀린 문제" 자동 플래그로 대체 | ✅ 단답 암기 시험 특성상 적합도 최고 |
| "잊기 직전 개념 TOP 5" 섹션 (경과일 × 오답률 휴리스틱) | ✅ 중기 과제로 적합, 휴리스틱으로 시작 |
| 해설만 읽고 넘어간 문제를 "완료" 처리 금지 — 재인출 성공 시에만 숙달 인정 | ✅ 과신 형성을 시스템이 차단 |
| 오답 유형 태깅 (용어 혼동 / 부분 암기 / SQL 문법 vs 논리 / 계산 실수) + 유형별 처방 | ✅ EF 효과의 연장, 단 태깅 자동화 필요 |
| 리포트 노출 → 추천 클릭률 → 후속 정답률 자체 계측 | ✅ 문헌 자체가 "보장 없음"이라 계측 필수 |

---

## 리빌딩 설계로 넘어갈 때의 우선순위 제안

**1군 — 근거 최강 + 저비용 (먼저 설계):**
1. 오답 재출제 루프 (1일→3일→7일 간격, 세션 말미 오답 재복습 포함)
2. 인터리빙 출제 정책 (순서만 바꾸면 됨)
3. 피드백 3층 구조 (기존 해설 데이터에 "왜" 층 보강)

**2군 — 근거 강함 + 중간 비용:**
4. 힌트 사다리 3단계 (LLM 사전 생성 + 정답 유출 자동 검증 + 잠금 규칙)
5. 진단 리포트 (숙달 바 + 과신 콜아웃 + 행동 CTA)

**3군 — 근거 있음 + 고비용 (별도 프로젝트급):**
6. LLM 유사 문항 생성 파이프라인 (문항 모델 추출 + 슬롯 치환 + SQL/코드 실행 검증)
7. 망각 기반 복습 추천, 오답 유형 자동 태깅

---

## 참고문헌

### 인출 연습·간격
- Rowland (2014). The Effect of Testing Versus Restudy on Retention. *Psych. Bulletin*. [PubMed](https://pubmed.ncbi.nlm.nih.gov/25150680/)
- Adesope, Trevisan & Sundararajan (2017). Rethinking the Use of Tests. *RER*. [SAGE](https://journals.sagepub.com/doi/abs/10.3102/0034654316689306)
- Larsen, Butler & Roediger (2009). Repeated Testing Improves Long-Term Retention. *Medical Education*. [PubMed](https://pubmed.ncbi.nlm.nih.gov/19930508/)
- Deng, Gluckstein & Larsen (2015). *Perspect. Med. Educ.* [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4673073/)
- Cepeda et al. (2006, 2008). Distributed Practice / Temporal Ridgeline. [PubMed](https://pubmed.ncbi.nlm.nih.gov/16719566/) / [PDF](https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf)
- Kang, McDermott & Roediger (2007). Test Format and Corrective Feedback. [T&F](https://www.tandfonline.com/doi/abs/10.1080/09541440601056620)
- Roediger & Karpicke (2006). Test-Enhanced Learning. *Psych. Science*. [PubMed](https://pubmed.ncbi.nlm.nih.gov/16507066/)

### 피드백·힌트
- Van der Kleij, Feskens & Eggen (2015). Effects of Feedback in CBLE. *RER*. [SAGE](https://journals.sagepub.com/doi/10.3102/0034654314564881)
- Shute (2008). Focus on Formative Feedback. *RER*. [SAGE](https://journals.sagepub.com/doi/10.3102/0034654307313795)
- Butler, Karpicke & Roediger (2007, 2008). Feedback Type & Timing. [Springer](https://link.springer.com/article/10.3758/MC.36.3.604)
- Aleven & Koedinger 계열 + Xiao et al. (LAK 2026). Revisiting the Hint Button. [ACM](https://dl.acm.org/doi/10.1145/3785022.3785040)
- Thomas et al. (2025). LLM-Generated Feedback. *EC-TEL*. [arXiv](https://arxiv.org/abs/2506.17006)
- Xiao, Hou & Stamper (2024). Multiple Levels of GPT Hints. *CHI LBW*. [arXiv](https://arxiv.org/abs/2404.02213)
- Vanzo et al. (2024). GPT-4 Homework Tutor RCT. [arXiv](https://arxiv.org/abs/2409.15981)

### 유사 문항·전이
- Rohrer & Taylor (2007). Shuffling of Mathematics Practice. *Instr. Science*. [PDF](http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer&Taylor2007IS.pdf)
- Rohrer, Dedrick, Hartwig & Cheung (2020). Interleaved Practice RCT. *JEP*. [S2](https://www.semanticscholar.org/paper/dc2f2a8e2989a54c87e8ae73a5fed46c720fc665)
- Raviv, Lupyan & Green (2022). How Variability Shapes Learning. *TiCS*. [Cell](https://www.cell.com/trends/cognitive-sciences/abstract/S1364-6613(22)00065-1)
- Bjork & Bjork (2011/2020). Desirable Difficulties. [PDF](https://www.waddesdonschool.com/wp-content/uploads/2021/02/Desriable-Difficulties-in-theory-and-practice-Bjork-Bjork-2020.pdf)
- Gierl & Haladyna (2013). Automatic Item Generation. Routledge. / [NCME 모듈](https://ncme.org/wp-content/uploads/2025/10/Module-34-Automated-Item-Generation-Gierl-Lai.pdf)
- Law et al. (2025). AI vs Human MCQs in High-Stakes Exam. *BMC Med Educ*. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11806894/)

### 진단·추천
- Corbett & Anderson (1995). Knowledge Tracing. *UMUAI*. [Springer](https://link.springer.com/article/10.1007/BF01099821)
- Bodily & Verbert (2017). Student-Facing LA Dashboards Review. *IEEE TLT*. [ACM](https://dl.acm.org/doi/10.1109/TLT.2017.2740172)
- Settles & Meeder (2016). Half-Life Regression. *ACL*. [GitHub](https://github.com/duolingo/halflife-regression)
- Dunlosky & Rawson (2012). Overconfidence Produces Underachievement. *L&I*. [ERIC](https://eric.ed.gov/?id=EJ964388)
- Matayoshi et al. (2021). ALEKS/KST 검증. [PDF](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)
