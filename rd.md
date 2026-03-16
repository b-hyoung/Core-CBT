### Next.js 기반 프론트엔드 개발자
### 데이터 기반 구조로 유지 보수 가능한 웹을 설계합니다


## 🛠 Skills

<table>
  <tr>
    <td valign="top" width="50%">
      <h3>🎨 Front-End </h3>
      <p>
        <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" />
        <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
        <img alt="Tailwind CSS" src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white" />
        <img alt="Zustand" src="https://img.shields.io/badge/Zustand-000000?style=flat-square" />
        <img alt="React Query" src="https://img.shields.io/badge/ReactQuery-FF4154?style=flat-square&logo=react-query&logoColor=white" />
      </p>
      <ul>
        <li>WebSocket을 활용해 실시간 게임 상태를 UI에 반영</li>
        <li>정적 페이지를 데이터 기반 자동 렌더링 구조로 전환</li>
        <li>LCP 기준 초기 로딩 성능 최적화 경험(3s -> 1s)</li>
        <li>상태 관리(Zustand) 및 서버 상태 관리(React Query)</li>
      </ul>
    </td>
    <td valign="top" width="50%">
      <h3>🐍 Back-End</h3>
      <p>
        <img alt="Python" src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" />
        <img alt="Django" src="https://img.shields.io/badge/Django-092E20?style=flat-square&logo=django&logoColor=white" />
        <img alt="MySQL" src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white" />
      </p>
      <ul>
        <li>TCP 소켓 기반 원격 제어 서버와 센서 이벤트 흐름 설계·총괄</li>
        <li>센서 트리거 → LLM → STT/TTS 음성 루프를 운영 기준(임계치·쿨다운)으로 설계</li>
        <li>Django 기반 REST API 구현</li>
        <li>인증·CRUD 중심 개인 프로젝트 경험</li>
      </ul>
    </td>
  </tr>
</table>

---

### ☁️ Cloud & Infra (AWS)
![AWS EC2](https://img.shields.io/badge/AWS%20EC2-FF9900?style=flat-square&logo=amazon-ec2&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS%20S3-569A31?style=flat-square&logo=amazon-s3&logoColor=white)
![CloudFront](https://img.shields.io/badge/CloudFront-F47421?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

- S3 + CloudFront 기반 정적 웹 배포 환경 구축
- EC2 + Nginx + Gunicorn 기반 서버 운영 구조를 구축
- Docker 기반 환경 표준화를 통해 버전 불일치 문제를 최소화
- 프론트엔드/백엔드 분리 실행 구조를 구성하여 개발·배포 유연성 향상
- AWS Budgets를 활용하여 운영 비용을 관리
---

## 🚀 최근 프로젝트

<table>
  <tr>
    <td valign="top" width="50%">
      <h3><a href="https://github.com/b-hyoung/Ai_serbot-project" target="_blank" rel="noopener noreferrer">🛸 AI Serbot(AIot) – 재난 현장 원격 관제 시스템</a></h3>
      <p><strong>형태</strong>: 4인 팀 프로젝트<br /><strong>역할</strong>: PM · 소켓 서버 설계 및 제어 흐름 총괄</p>
      <strong>● 소개</strong>
      <ul>
        <li>재난 현장 선진입 로봇을 원격 제어·모니터링하는 통합 관제 시스템</li>
        <li>Robot / Server / GUI 3계층 구조를 적용 , 제어 로직과 UI 로직의 결합도를 낮춤</li>
        <li>TCP 소켓 기반 원격 제어 및 센서·영상 실시간 모니터링</li>
      </ul>
      <strong>● AI 음성 인터랙션</strong>
      <ul>
        <li>센서 이벤트 발생 시 상태 요약 → LLM 응답 → TTS 안내로 이어지는 음성 피드백 흐름 설계</li>
        <li>관제 인력 음성 응답을 STT로 수집해 컨텍스트를 갱신하는 양방향 음성 루프 구성</li>
      </ul>
      <strong>● 링크</strong>
      <table>
        <tr>
          <td><strong>GitHub</strong></td>
          <td><a href="https://github.com/b-hyoung/Ai_serbot-project" target="_blank" rel="noopener noreferrer">AI Serbot Repository</a></td>
        </tr>
        <tr>
          <td><strong>Live Demo</strong></td>
          <td>R-Bot (A-IOT)</td>
        </tr>
      </table>
    </td>
    <td valign="top" width="50%">
      <h3><a href="https://github.com/b-hyoung/Core-CBT" target="_blank" rel="noopener noreferrer">🧠 Core-CBT – 자격시험 CBT 학습 서비스</a></h3>
      <p><strong>형태</strong>: 1인 개발 프로젝트<br /><strong>역할</strong>: 서비스 설계 · 구현 · 운영</p>
      <strong>● 실사용 기반 개선</strong>
      <ul>
        <li>실제 사용자 피드백과 운영 데이터를 바탕으로 기능을 반복 개선</li>
      </ul>
      <strong>● 운영·기능</strong>
      <ul>
        <li>GPT 보조 해설에 캐시 재사용 구조를 적용하여 중복 호출 비용 40% 절감</li>
        <li>문제 신고 발생 시 디스코드 알림으로 즉시 확인하고 관리자 페이지에서 처리</li>
        <li>방문/완료/합격률 기반 관리자 대시보드로 사용자 학습 행동 분석</li>
      </ul>
      <strong>● 링크</strong>
      <table>
        <tr>
          <td><strong>GitHub</strong></td>
          <td><a href="https://github.com/b-hyoung/Core-CBT" target="_blank" rel="noopener noreferrer">Core-CBT Repository</a></td>
        </tr>
        <tr>
          <td><strong>Live Demo</strong></td>
          <td><a href="https://jvbhs.netlify.app" target="_blank" rel="noopener noreferrer">Core-CBT Live Demo</a></td>
        </tr>
      </table>
    </td>
  </tr>
</table>

---

| 프로젝트 | 설명 | Live Demo | 역할 | GitHub |
|--------|------|------|------|------|
| **포트폴리오 & 블로그** | Django기반 웹 | <a href="https://django-myportpolio.onrender.com/" target="_blank" rel="noopener noreferrer">자기소개 블로그</a> | 1인 개발 | <a href="https://github.com/b-hyoung/django_myPortpolio" target="_blank" rel="noopener noreferrer">바로가기</a> |
| **kumamid** | 졸업작품전 웹사이트 | <a href="https://kmid.netlify.app" target="_blank" rel="noopener noreferrer">kumamid</a> | 2인 개발 | <a href="https://github.com/b-hyoung/remake_kumamid" target="_blank" rel="noopener noreferrer">바로가기</a> |
| **ai-serbot** | 구조현장-ai(AIot_rbot) | - | 4인 개발 | <a href="https://github.com/b-hyoung/Ai_serbot-project" target="_blank" rel="noopener noreferrer">바로가기</a> |
| **Core-CBT** | 정처산기·SQLD CBT | <a href="https://jvbhs.netlify.app" target="_blank" rel="noopener noreferrer">Core-CBT</a> | 1인 개발 · 오픈소스 운영  | <a href="https://github.com/b-hyoung/Core-CBT" target="_blank" rel="noopener noreferrer">바로가기</a> |


---

<a href="https://www.gitanimals.org/en_US?utm_medium=image&utm_source=b-hyoung&utm_content=farm" target="_blank" rel="noopener noreferrer">
<img
  src="https://render.gitanimals.org/farms/b-hyoung"
  width="400"
  height="150"
/>
</a>
