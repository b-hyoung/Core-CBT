# Core-CBT 할일 목록

운영/구현/탐색 중인 항목 통합 트래커. 새 항목은 위에 추가, 완료는 ✅ 표시 후 1주일 뒤 아카이브.

---

## 🔴 운영 진입 (해설 수정 시스템)

코드는 develop 브랜치에 완료. 운영 시작에 필요한 외부 셋업:

- [ ] **Supabase 스키마 실행** — `docs/setup/comment-edits-schema.sql` 콘솔 1회 실행 (필수)
- [ ] **`.env`에 8개 키 추가** (`.env.example` 참조)
  - `DISCORD_WEBHOOK_URL`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`
  - `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BASE_BRANCH`
  - `SITE_BASE_URL`
- [ ] **Discord Application 발급** — 별도 봇 (Cartel_Lab과 분리). Public Key / Bot Token / App ID 수집
- [ ] **Discord 채널 Webhook 생성** — 알림받을 채널에서 Integrations → Webhook
- [ ] **Discord Interactions Endpoint URL 등록** — `<SITE_BASE_URL>/api/discord/interactions` (PING 통과 확인). 로컬 테스트면 ngrok 필요
- [ ] **Discord 봇을 채널에 초대** — "Manage Messages" 권한 (사이트에서 승인 시 디코 메시지 PATCH용)
- [ ] **GitHub PAT 발급** — repo write 권한
- [ ] **스모크 체크** — `node --env-file=.env scripts/smoke-comment-edit-env.js` 전부 ✅ 확인
- [ ] **end-to-end 1사이클** — 제출 → 디코 알림 → 사이트 큐 → 라운드 PR → GitHub 머지 → "머지 완료 처리" 검증
- [ ] **develop → master 머지 / PR** — 운영 진입 후

## 🟡 해설 수정 시스템 — 후속 개선 (선택)

- [ ] **GitHub webhook 자동 머지 감지** — 현재는 사이트에서 "머지 완료 처리" 수동 클릭. PR closed+merged 이벤트로 자동화
- [ ] **aiPromptEngineering subject 화이트리스트 추가 또는 UI 숨김** — 현재 클릭 시 400
- [ ] **`/sqld`, `/practical` 페이지에도 해설 수정 UI 통합** — 현재 `/test/[sessionId]` + pdfPacks만
- [ ] **rejected 알림 사용자에게 노출** — 거부 사유를 본인에게 표시
- [ ] **관리자 일괄 처리** — 큐에서 여러 항목 체크 후 한 번에 승인/거부

## 🆕 신규 기능

- [ ] **숏츠/영상 모드** — SQLD 2025년 1회 기준 MVP. 문제 → 답 → 해설 자동 진행
  - 라우트: `/shorts/sqld-2025-1` (예정)
  - TTS: 브라우저 `SpeechSynthesisAPI` (외부 API 비용 0)
  - 흐름: 문제 읽기 → 잠시 정지 → 정답 공개+읽기 → 해설 읽기 → 다음 문제
  - 컨트롤: 일시정지 / 다음 / 이전 / 속도
  - 레이아웃: 모바일 세로 우선, 데스크탑은 중앙 정렬
  - 상태: 설계 중

---

## ✅ 완료 (최근)

- ✅ 해설 수정 제안/승인 시스템 — 21 task 구현 + 8 polish (develop 브랜치, 2026-05-30)
