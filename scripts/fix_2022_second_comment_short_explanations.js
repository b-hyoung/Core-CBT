const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'datasets', 'problem2022', 'second', 'comment1.json');

const updates = {
  8: '디버깅(Debugging)은 프로그램 실행 중 발생한 오류를 추적하고 원인을 찾아 수정하는 작업이다. Loading은 메모리에 적재하는 과정이고, Linking은 목적 파일을 연결하는 과정이므로 문제의 설명과 다르다.',
  27: 'Python의 range()는 일정 구간의 연속된 수를 생성할 때 사용하는 함수이다. for 반복문이나 리스트 생성에 자주 쓰이며, 시작값/끝값/간격을 지정할 수 있다.',
  31: 'push()는 자바스크립트 배열의 끝(마지막 인덱스 뒤)에 요소를 추가하는 메서드이다. pop()은 삭제, shift()는 앞쪽 요소 삭제이므로 데이터 입력(추가) 기능과 다르다.',
  35: '삼항 연산자의 기본 형식은 (조건) ? 참일 때 값 : 거짓일 때 값 이다. max에 결과를 저장하려면 max = (a > b) ? a : b; 형태로 작성하면 되며, 이는 원래 if-else 문과 같은 의미다.',
  41: '버블 정렬 1회전은 앞에서부터 인접한 두 값을 비교하며 큰 값을 뒤로 보내는 과정이다. 9와 6, 9와 7, 9와 3, 9와 5를 차례로 비교/교환하면 1회전 결과는 6, 7, 3, 5, 9가 된다.',
  49: '카티션 프로덕트의 카디널리티(튜플 수)는 각 릴레이션의 튜플 수를 곱해서 계산한다. 따라서 |R × S| = |R| × |S| = 4 × 5 = 20이다.',
  59: '트랜잭션의 ACID는 Atomicity(원자성), Consistency(일관성), Isolation(격리성), Durability(지속성)이다. Detection은 ACID 구성 요소가 아니므로 정답이 아니다.',
};

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

const raw = fs.readFileSync(filePath, 'utf8');
const hasBom = raw.charCodeAt(0) === 0xfeff;
const json = JSON.parse(stripBom(raw));

for (const section of json) {
  for (const item of section.comments || []) {
    if (updates[item.problem_number]) {
      item.comment = updates[item.problem_number];
    }
  }
}

const out = JSON.stringify(json, null, 2);
fs.writeFileSync(filePath, `${hasBom ? '\uFEFF' : ''}${out}`, 'utf8');
console.log('patched comments:', Object.keys(updates).join(', '));
