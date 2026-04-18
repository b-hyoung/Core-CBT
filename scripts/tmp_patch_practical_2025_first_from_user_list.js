const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), 'datasets', 'practicalIndustrial', '2025-first');

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(base, name), 'utf8'));
}
function write(name, data) {
  fs.writeFileSync(path.join(base, name), JSON.stringify(data, null, 2), 'utf8');
}
function upsertByNo(arr, item) {
  const i = arr.findIndex((x) => x.problem_number === item.problem_number);
  if (i >= 0) arr[i] = { ...arr[i], ...item };
  else arr.push(item);
  arr.sort((a, b) => a.problem_number - b.problem_number);
}

const patchItems = [
  {
    n: 1,
    q: '다음은 포트 번호와 관련된 내용이다. 괄호 안에 알맞은 용어를 쓰시오.',
    ex: '포트번호 (   )번은 웹 서버와 클라이언트 간의 하이퍼텍스트 전송에 사용되는 프로토콜이다.',
    ans: 'HTTP',
  },
  {
    n: 2,
    q: '다음에서 설명하는 CPU 스케줄링 알고리즘을 쓰시오.',
    ex: '시분할 시스템을 위해 설계된 선점형 스케줄링의 하나로서, 프로세스들 사이에 우선순위를 두지 않고, 순서대로 시간 단위(Time Quantum)로 CPU를 할당하는 방식의 알고리즘이다. 프로세스는 같은 크기의 CPU 시간을 할당하고, 프로세스가 할당된 시간 내에 처리를 완료하지 못하면 준비 큐 리스트의 가장 뒤로 보내지고, CPU는 대기 중인 다음 프로세스로 넘어간다. 만약 할당되는 시간이 클 경우 FCFS 스케줄링과 비슷하다.',
    ans: 'RR (Round Robin, 라운드 로빈)',
  },
  {
    n: 3,
    q: '다음에서 설명하는 네트워크 매체 접근 방식을 쓰시오.',
    ex: '이더넷과 토큰링의 특징을 합친 형태이다. 실시간으로 처리해야 하는 공장 자동화에 많이 응용된다. MAC 기법 중 토큰링 방식이며 논리적, 순차적으로 돌아가면서 데이터를 전송하고 전송할 데이터가 없으면 다음으로 넘어간다. CSMA/CD와 달리 데이터 충돌을 예방한다.',
    ans: '토큰 버스',
  },
  {
    n: 4,
    q: '다음 설명에서 괄호 안에 알맞은 SQL 유형을 〈보기〉에서 골라 기호를 쓰시오.',
    ex: [
      '호스트 언어를 사용하여 데이터베이스에 접근할 때 사용하는 SQL로, 응용 프로그램 코드 내에 직접 삽입하여 사용한다.',
      '',
      '〈보기〉',
      'ㄱ. Interactive SQL',
      'ㄴ. Dynamic SQL',
      'ㄷ. Embedded SQL',
      'ㄹ. Stored SQL',
    ].join('\n'),
    ans: 'ㄷ. Embedded SQL',
  },
  {
    n: 5,
    q: '다음 쉘(Shell)의 특징으로 옳은 것을 〈보기〉에서 모두 골라 기호를 쓰시오.',
    ex: [
      '〈보기〉',
      'ㄱ. 명령어 해석기로서의 역할을 수행한다.',
      'ㄴ. 주기억장치에 상주하지 않고, 명령어가 포함된 파일 형태로 존재하며',
      '   보조기억장치에서 교체 처리가 가능하다.',
      'ㄷ. 응용프로그램과 하드웨어의 인터페이스 역할을 한다.',
      'ㄹ. 파이프라인 방식의 입출력이 불가능하다.',
      'ㅁ. 컴파일러 및 로더의 기능을 수행한다.',
    ].join('\n'),
    ans: 'ㄱ, ㄴ',
  },
  {
    n: 6,
    q: '다음 릴레이션의 차수(Degree)와 카디널리티(Cardinality)를 각각 구하시오.',
    ex: [
      '학번\t이름\t학과',
      '2021001\t홍길동\t컴퓨터공학',
      '2021002\t이순신\t소프트웨어',
      '2021003\t강감찬\t네트워크',
      '2021004\t유관순\t컴퓨터공학',
    ].join('\n'),
    ans: '차수 3, 카디널리티 4',
  },
  {
    n: 7,
    q: '다음 설명에 해당하는 테스트를 〈보기〉에서 골라 쓰시오.',
    ex: [
      '단위 테스트(Unit Test) 다음 단계로 수행하는 테스트로, 모듈 간 인터페이스 및 상호 작용을 검증한다.',
      '',
      '〈보기〉',
      'ㄱ. Acceptance test',
      'ㄴ. Integration test',
      'ㄷ. System test',
      'ㄹ. Regression test',
    ].join('\n'),
    ans: 'Integration test',
  },
  {
    n: 8,
    q: '다음 ①, ②에 해당하는 용어를 쓰시오.',
    ex: [
      '① 회사나 조직의 정보를 관리하고 축적하는 시스템으로, 기업의 경영 활동에 필요한 정보를 통합적으로 처리·제공한다.',
      '',
      '② 포트번호 161번을 사용하며, 네트워크 기기의 네트워크 정보를 네트워크 관리 시스템에 보내는 데 사용되는 네트워크 관리 프로토콜이다.',
    ].join('\n'),
    ans: '① MIS ② SNMP',
  },
  {
    n: 9,
    q: '다음은 SQL의 데이터 정의어(DDL)이다. 괄호 ①~③에 알맞은 명령어를 쓰시오.',
    ex: [
      '역할\t명령어',
      '테이블 생성\t( ① ) TABLE',
      '테이블 수정\t( ② ) TABLE',
      '테이블 삭제\t( ③ ) TABLE',
    ].join('\n'),
    ans: '① CREATE ② ALTER ③ DROP',
  },
  {
    n: 10,
    q: '다음 설명에 해당하는 블랙박스 테스트 기법을 〈보기〉에서 골라 기호를 쓰시오.',
    ex: [
      '범위가 -20~20일 때 -21, -20, 20, 21을 검사하고, 범위가 -100~100일 때 -101, -100, 100, 101을 검사하는 방식으로 범위의 최댓값과 최솟값 경계를 중심으로 검사하는 기법이다.',
      '',
      '〈보기〉',
      'ㄱ. 경계치 커버리지 검사',
      'ㄴ. 동치 분할 그래프',
      'ㄷ. 원인 결과 커버리지 분석',
      'ㄹ. 결정 테이블 테스트',
    ].join('\n'),
    ans: 'ㄱ',
  },
  {
    n: 20,
    q: '다음 Java 프로그램의 실행 결과를 쓰시오.',
    ex: [
      'public class Main {',
      '    public static void main(String[] args) {',
      '        B a = new B(3);',
      '        B b = new B(3);',
      '        B[] bs = {a, b};',
      '        B temp = bs[0];',
      '        bs[1] = bs[0];',
      '        bs[0] = temp;',
      '        bs[0].a += bs[1].a;',
      '        System.out.print(bs[0].a);',
      '    }',
      '}',
      'class B {',
      '    int a;',
      '    B(int a) {',
      '        this.a = a;',
      '    }',
      '}',
    ].join('\n'),
    ans: '6',
  },
];

const problem = read('problem1.json');
const answer = read('answer1.json');
const comment = read('comment1.json');

for (const item of patchItems) {
  upsertByNo(problem[0].problems, {
    problem_number: item.n,
    question_text: item.q,
    examples: item.ex,
    options: [item.ans],
  });
  upsertByNo(answer[0].answers, {
    problem_number: item.n,
    correct_answer_index: 0,
    correct_answer_text: item.ans,
  });
  upsertByNo(comment[0].comments, {
    problem_number: item.n,
    comment: '',
  });
}

write('problem1.json', problem);
write('answer1.json', answer);
write('comment1.json', comment);

console.log('patched 2025-first with user-provided clearer items (1~10,20)');
