const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function toCircled(no) {
  return ['①', '②', '③', '④'][no - 1] || `${no}`;
}

function norm(text) {
  return String(text ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripQuestionNoise(text) {
  return norm(text)
    .replace(/^\[보기셔플\]\[[^\]]+\]\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/i, '');
}

function buildQuestionKey(questionText, options) {
  return [stripQuestionNoise(questionText), ...(options || []).map(norm)].join(' || ');
}

function parseReferenceSummary(comment) {
  const lines = String(comment ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const filtered = [];
  for (const line of lines) {
    if (/^\[해설작성자/i.test(line)) continue;
    if (/^정답\s*[:：]/.test(line)) continue;
    if (/^해설\s*[:：]?$/.test(line)) continue;
    if (/^(핵심 정리|문제 유형|풀이 포인트|정답 선택지)\s*[:：]/.test(line)) continue;
    filtered.push(line);
  }

  const joined = filtered.join(' ');
  if (!joined) return '';

  let parts = joined
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 2025 해설에서 아래 오답 상세 라인과 중복되는 문장은 제거한다.
  parts = parts.filter((s) => !/^다른 선택지는\b/.test(s));

  let summary = parts.slice(0, 2).join(' ');
  if (!summary) summary = joined;
  if (summary.length > 220) summary = `${summary.slice(0, 217).trim()}...`;
  return summary;
}

function questionWantsWrongChoice(questionText) {
  const q = stripQuestionNoise(questionText);
  return [
    '옳지 않은 것',
    '틀린 것은',
    '틀린 것',
    '거리가 먼 것은',
    '아닌 것은',
    '옳지 않은',
    '설명으로 틀린',
    '해당하지 않는 것은',
  ].some((kw) => q.includes(kw));
}

function questionWantsResult(questionText) {
  const q = stripQuestionNoise(questionText);
  return ['결과는', '수행 결과', '실행 결과', '값은', '평균 대기 시간', '최대 간선수'].some((kw) => q.includes(kw));
}

function isImagePlaceholderOption(optionText) {
  const t = norm(optionText);
  return !t || /\[PDF.*보강 예정\]/.test(t) || /이미지.*보강/.test(t);
}

function explainOptionMeaning(optionText) {
  const t = norm(optionText);
  if (!t) return null;

  const exact = new Map([
    ['Instance', 'Instance는 클래스에 의해 생성된 객체(실체)를 의미합니다.'],
    ['Method', 'Method는 객체가 메시지를 받았을 때 수행하는 연산(동작)입니다.'],
    ['Message', 'Message는 객체에게 특정 동작을 요청하는 통신 수단입니다.'],
    ['Class', 'Class는 속성과 연산을 정의한 객체의 설계 단위입니다.'],
    ['Inheritance', '상속(Inheritance)은 상위 클래스의 속성과 연산을 하위 클래스가 물려받는 개념입니다.'],
    ['Abstraction', '추상화(Abstraction)는 공통 속성/행위를 뽑아 모델링하는 개념입니다.'],
    ['Encapsulation', '캡슐화(Encapsulation)는 데이터와 메서드를 묶고 외부 접근을 제한하는 개념입니다.'],
    ['Polymorphism', '다형성(Polymorphism)은 같은 인터페이스로 서로 다른 동작을 수행할 수 있는 특성입니다.'],
    ['TCP', 'TCP는 연결 지향형 전송 계층 프로토콜로 신뢰성 있는 전송을 제공합니다.'],
    ['UDP', 'UDP는 비연결형 전송 계층 프로토콜로 속도는 빠르지만 신뢰성 보장이 약합니다.'],
    ['HTTP', 'HTTP는 응용 계층 프로토콜입니다.'],
    ['SMTP', 'SMTP는 전자우편 전송을 위한 응용 계층 프로토콜입니다.'],
    ['FTP', 'FTP는 파일 전송을 위한 응용 계층 프로토콜입니다.'],
    ['CREATE', 'CREATE는 데이터베이스 객체를 생성하는 DDL 명령입니다.'],
    ['ALTER', 'ALTER는 데이터베이스 객체 구조를 변경하는 DDL 명령입니다.'],
    ['DROP', 'DROP은 데이터베이스 객체를 삭제하는 DDL 명령입니다.'],
    ['DELETE', 'DELETE는 테이블 구조는 유지하고 데이터만 삭제하는 DML 명령입니다.'],
    ['SELECT', 'SELECT는 데이터를 조회하는 DML 명령입니다.'],
    ['COMMIT', 'COMMIT은 트랜잭션의 변경 내용을 확정하는 명령입니다.'],
    ['ROLLBACK', 'ROLLBACK은 트랜잭션 변경 내용을 이전 상태로 되돌리는 명령입니다.'],
    ['FIFO', 'FIFO(FCFS)는 먼저 들어온 작업을 먼저 처리하는 방식입니다.'],
    ['FCFS', 'FCFS는 도착 순서대로 작업을 처리하는 스케줄링 방식입니다.'],
    ['SJF', 'SJF는 CPU 사용 시간이 가장 짧은 작업을 먼저 처리하는 방식입니다.'],
    ['Round-Robin', 'Round-Robin은 time slice를 기준으로 순환 실행하는 선점형 스케줄링입니다.'],
    ['SRT', 'SRT는 남은 실행 시간이 가장 짧은 작업을 우선 선택하는 선점형 방식입니다.'],
    ['마름모', '마름모는 E-R 모델에서 관계(Relationship)를 나타내는 기호입니다.'],
    ['타원', '타원은 E-R 모델에서 속성(Attribute)을 나타내는 기호입니다.'],
    ['사각형', '사각형은 E-R 모델에서 개체(Entity)를 나타내는 기호입니다.'],
    ['선', '선은 E-R 모델 요소를 연결하는 데 사용됩니다.'],
  ]);
  if (exact.has(t)) return exact.get(t);

  const includesRules = [
    [/Sequence Diagram|시퀀스 다이어그램/, '시퀀스 다이어그램은 객체/시스템 간 메시지 흐름을 시간 순서대로 표현합니다.'],
    [/State Diagram|상태 다이어그램/, '상태 다이어그램은 상태 변화와 전이를 표현합니다.'],
    [/Activity Diagram|활동 다이어그램/, '활동 다이어그램은 처리 흐름과 제어 흐름을 표현합니다.'],
    [/Object Diagram|객체 다이어그램/, '객체 다이어그램은 특정 시점의 객체(인스턴스)와 관계를 표현합니다.'],
    [/Class Diagram|클래스 다이어그램/, '클래스 다이어그램은 클래스의 속성/연산과 클래스 간 관계를 표현합니다.'],
    [/Use Case Diagram|유스케이스 다이어그램/, '유스케이스 다이어그램은 사용자 요구와 시스템 기능 관계를 표현합니다.'],
    [/IPv6/, 'IPv6는 128비트 주소 체계를 사용하는 인터넷 프로토콜입니다.'],
    [/IPv4/, 'IPv4는 32비트 주소 체계를 사용하는 인터넷 프로토콜입니다.'],
    [/유니캐스트|멀티캐스트|애니캐스트/, '유니캐스트/멀티캐스트/애니캐스트는 IP 주소 전달 방식(주소 체계) 설명입니다.'],
    [/브로드캐스트/, '브로드캐스트는 동일 네트워크 전체 대상으로 전송하는 방식입니다.'],
    [/Mutex|뮤텍스/, '뮤텍스는 상호 배제를 위한 잠금 객체입니다.'],
    [/Semaphore|세마포어/, '세마포어는 공유 자원 접근을 제어하는 동기화 기법입니다.'],
    [/Deadlock|교착상태/, '교착상태는 프로세스들이 서로 자원을 기다리며 무한 대기하는 상태입니다.'],
    [/LRU/, 'LRU는 가장 오랫동안 사용되지 않은 페이지를 교체하는 기법입니다.'],
    [/1단계 디렉터리/, '1단계 디렉터리 구조는 모든 파일을 하나의 디렉터리에서 관리하는 구조입니다.'],
    [/2단계 디렉터리/, '2단계 디렉터리 구조는 MFD 아래 사용자별 UFD를 두는 구조입니다.'],
    [/트리 디렉터리/, '트리 디렉터리 구조는 루트 아래 여러 하위 디렉터리를 계층적으로 구성한 구조입니다.'],
    [/비순환.*그래프 디렉터리/, '비순환 그래프 디렉터리 구조는 공유를 허용하지만 사이클은 허용하지 않는 구조입니다.'],
    [/스택|LIFO/, '스택은 후입선출(LIFO) 방식의 자료구조입니다.'],
    [/큐|FIFO/, '큐는 선입선출(FIFO) 방식의 자료구조입니다.'],
    [/Hub|허브/, '허브는 물리 계층 장비로 들어온 신호를 모든 포트로 전달합니다.'],
    [/Bridge|브리지/, '브리지는 데이터 링크 계층 장비로 네트워크 세그먼트를 연결합니다.'],
    [/Switch|스위치/, '스위치는 데이터 링크 계층 장비로 MAC 주소 기반 프레임 전송을 수행합니다.'],
    [/Router|라우터/, '라우터는 네트워크 계층 장비로 최적 경로를 선택합니다.'],
  ];
  for (const [regex, desc] of includesRules) {
    if (regex.test(t)) return desc;
  }

  if (/^\d+(\.\d+)?$/.test(t)) return '숫자 보기이므로 계산 결과값 후보를 의미합니다.';
  if (/^[A-Za-z][A-Za-z0-9_ ()+,\-./]*$/.test(t)) return `"${t}"는 용어/명령어/프로토콜 이름을 나타내는 선택지입니다.`;

  return null;
}

function buildCorrectReason({ q, correctText, refSummary }) {
  const qText = stripQuestionNoise(q.question_text);
  const ct = norm(correctText);
  const wantsWrong = questionWantsWrongChoice(qText);

  if (refSummary) {
    const cleanedRef = String(refSummary)
      .replace(/\s*다른 선택지는[^.?!。\n]*(?:[.?!。]|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanedRef) return `기출 해설 기준으로 ${cleanedRef}`;
  }

  const meaning = explainOptionMeaning(ct);
  if (questionWantsResult(qText)) {
    return `문제의 계산/실행 조건을 적용했을 때 ${ct}가 결과와 일치하므로 정답입니다.`;
  }
  if (wantsWrong) {
    if (meaning) return `${meaning} 문제에서 묻는 기준에서 벗어난(틀린/맞지 않는) 선택지이므로 정답입니다.`;
    return `이 선택지는 문제에서 찾는 '틀린 항목/옳지 않은 항목'에 해당하므로 정답입니다.`;
  }
  if (meaning) return `${meaning}`;
  return `"${ct}"가 정답에 해당하는 선택지입니다.`;
}

function buildWrongReason({ q, optionText }) {
  const qText = stripQuestionNoise(q.question_text);
  const t = norm(optionText);
  const wantsWrong = questionWantsWrongChoice(qText);

  if (isImagePlaceholderOption(t)) {
    return '이미지/도형 기반 보기라 텍스트 정보만으로 상세 비교가 어렵습니다(이미지 보강 필요).';
  }

  const meaning = explainOptionMeaning(t);
  if (questionWantsResult(qText) && /^\d+(\.\d+)?$/.test(t)) {
    return `계산 결과 후보값이지만 문제 조건을 적용한 최종 결과와 일치하지 않아 정답이 아닙니다.`;
  }

  if (wantsWrong) {
    if (meaning) return `${meaning} 문제에서 찾는 틀린 항목이 아니므로 정답이 아닙니다.`;
    return `"${t}"는 문제에서 찾는 틀린 항목이 아니라 정답 조건에 해당하지 않아 정답이 아닙니다.`;
  }

  if (meaning) return `${meaning} 따라서 정답이 아닙니다.`;
  return `"${t}"는 문제에서 묻는 기준(개념/기능/결과)과 일치하지 않아 정답이 아닙니다.`;
}

function buildReferenceIndex() {
  const exact = new Map();
  const byQuestion = new Map();
  const years = ['2022', '2023', '2024'];
  const rounds = ['first', 'second', 'third'];

  for (const year of years) {
    for (const round of rounds) {
      const base = path.join('datasets', `problem${year}`, round);
      const problems = readJson(path.join(base, 'problem1.json'));
      const answers = readJson(path.join(base, 'answer1.json'));
      const comments = readJson(path.join(base, 'comment1.json'));

      for (let s = 0; s < problems.length; s += 1) {
        const sec = problems[s];
        for (let i = 0; i < sec.problems.length; i += 1) {
          const q = sec.problems[i];
          const a = answers[s]?.answers?.[i];
          const c = comments[s]?.comments?.[i];
          if (!q || !a || !c) continue;

          const item = {
            year,
            round,
            question: q,
            answer: a,
            comment: c.comment,
            summary: parseReferenceSummary(c.comment),
          };

          exact.set(buildQuestionKey(q.question_text, q.options), item);

          const qKey = stripQuestionNoise(q.question_text);
          const arr = byQuestion.get(qKey) || [];
          arr.push(item);
          byQuestion.set(qKey, arr);
        }
      }
    }
  }

  return { exact, byQuestion };
}

function optionOverlapScore(aOptions, bOptions) {
  const aSet = new Set((aOptions || []).map(norm));
  let score = 0;
  for (const opt of bOptions || []) {
    if (aSet.has(norm(opt))) score += 1;
  }
  return score;
}

function findBestReference(refIndex, q) {
  const exactKey = buildQuestionKey(q.question_text, q.options);
  if (refIndex.exact.has(exactKey)) return refIndex.exact.get(exactKey);

  const qKey = stripQuestionNoise(q.question_text);
  const candidates = refIndex.byQuestion.get(qKey) || [];
  if (!candidates.length) return null;

  let best = null;
  let bestScore = -1;
  for (const cand of candidates) {
    const score = optionOverlapScore(cand.question.options, q.options);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return bestScore >= 2 ? best : null;
}

function regenerate2025Comments() {
  const refIndex = buildReferenceIndex();
  let total = 0;
  let reused = 0;

  for (const examNo of [1, 2, 3]) {
    const base = path.join('datasets', 'pdfPacks', `industrial-2025-${examNo}`);
    const problemJson = readJson(path.join(base, 'problem1.json'));
    const answerJson = readJson(path.join(base, 'answer1.json'));
    const commentJson = readJson(path.join(base, 'comment1.json'));

    for (let sec = 0; sec < problemJson.length; sec += 1) {
      const problems = problemJson[sec].problems || [];
      const answers = answerJson[sec].answers || [];
      const comments = commentJson[sec].comments || [];

      for (let i = 0; i < problems.length; i += 1) {
        const q = problems[i];
        const a = answers[i];
        const c = comments[i];
        if (!q || !a || !c) continue;

        total += 1;
        const options = Array.isArray(q.options) ? q.options : [];
        const correctIdx = Number.isInteger(a.correct_answer_index) ? a.correct_answer_index : null;

        if (correctIdx == null || correctIdx < 0 || correctIdx >= options.length) {
          c.comment = [
            '정답은 확인이 필요합니다.',
            `- ${toCircled(1)} 정답 데이터 검수 후 해설을 보강해야 합니다.`,
            `- ${toCircled(2)} 정답 데이터 검수 후 해설을 보강해야 합니다.`,
            `- ${toCircled(3)} 정답 데이터 검수 후 해설을 보강해야 합니다.`,
            `- ${toCircled(4)} 정답 데이터 검수 후 해설을 보강해야 합니다.`,
          ].join('\n');
          continue;
        }

        const ref = findBestReference(refIndex, q);
        if (ref?.summary) reused += 1;

        const lines = [];
        const correctReason = buildCorrectReason({
          q,
          correctText: options[correctIdx],
          refSummary: ref?.summary || '',
        });

        lines.push(`정답은 ${toCircled(correctIdx + 1)}입니다. ${correctReason}`);
        for (let oi = 0; oi < options.length; oi += 1) {
          if (oi === correctIdx) continue;
          lines.push(`- ${toCircled(oi + 1)} ${buildWrongReason({ q, optionText: options[oi] })}`);
        }

        c.comment = lines.join('\n');
      }
    }

    writeJson(path.join(base, 'comment1.json'), commentJson);
    console.log(`updated industrial-2025-${examNo}`);
  }

  console.log(`total=${total}, reusedReference=${reused}`);
}

regenerate2025Comments();
