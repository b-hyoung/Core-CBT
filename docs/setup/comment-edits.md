# 해설 수정 제안 시스템 운영

## 환경 변수
- `DISCORD_WEBHOOK_URL`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`
- `GITHUB_TOKEN` (repo write), `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_BASE_BRANCH=master`
- `SITE_BASE_URL`

## 초기 설정
1. Supabase 콘솔에서 `docs/setup/comment-edits-schema.sql` 실행
2. Discord Application 생성 → Public Key, Bot Token 확보
3. Discord Application의 Interactions Endpoint URL을 `<SITE_BASE_URL>/api/discord/interactions`로 설정 → PING 검증 통과 확인
4. Discord 채널 webhook 생성 → URL 저장

## 라운드 PR 흐름
1. 사용자가 해설 박스에서 "수정 제안" → 모달 제출
2. 관리자 Discord에 알림 → 디코에서 [수락]/[거부] 또는 사이트 큐에서 처리
3. 승인분이 N건 모이면 `/admin/edits`에서 "이번 라운드 PR 생성" 클릭
4. GitHub에서 PR 검토 후 머지
5. 사이트 큐에서 해당 항목 선택 → "머지 완료 처리" 클릭 (contributors 기록)
