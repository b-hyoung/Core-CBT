# problem100 생성 방법

1. `datasets/problem100/raw.txt`에 100문제 원문 전체를 그대로 붙여넣습니다.
2. 아래 명령 실행:

```bash
node scripts/build_problem100_from_txt.js
```

3. 생성 파일:
- `datasets/problem100/first/problem1.json`
- `datasets/problem100/first/answer1.json`
- `datasets/problem100/first/comment1.json`

4. `/test/100` 접속 시 고정 100문제 모드로 로드됩니다.
