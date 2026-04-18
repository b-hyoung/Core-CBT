사용자님의 요청(app/test/[sessionId]/Quiz.js에서 정답 확인 및 해설 표시)을 이해했습니다. 정답 파일은
  @problem2024/first/answer1.json으로 확인되었습니다.

  이제 다음 기능을 구현하기 위한 상세 계획을 세울 수 있습니다.

  전체 목표: 문제 답변 확인, 오답 시 피드백(해설 및 정답) 표시, 그리고 조건부로 다음 문제로 이동하는 기능을
  구현합니다.


  상세 단계 (할 일 목록):


   1. `app/test/[sessionId]/page.js` 수정:
       * problem2024/first/answer1.json 및 problem2024/first/comment1.json 파일을 로드합니다.
       * 로드된 데이터(correctAnswers, problemComments)를 Quiz 컴포넌트에 props로 전달합니다.
   2. `app/test/[sessionId]/Quiz.js` 수정:
       * 새로운 props인 correctAnswers와 problemComments를 받습니다.
       * 새로운 상태 isAnswerChecked (불리언, 기본값 false)를 추가합니다.
       * handleSelectOption 함수를 수정하여 isAnswerChecked가 false일 때만 옵션 선택이 가능하도록 합니다.
       * handleCheckAnswer 함수를 구현합니다:
           * 현재 문제에 대한 correctAnswer를 correctAnswers에서 가져옵니다.
           * 사용자의 selectedAnswer와 비교합니다.
           * isAnswerChecked를 true로 설정합니다.
       * "다음" 버튼 로직 수정:
           * isAnswerChecked가 false이고 답변이 선택되었다면, 버튼 텍스트는 "정답 확인"으로 하고 handleCheckAnswer를  
             호출합니다.
           * isAnswerChecked가 true라면, 버튼 텍스트는 "다음 문제"로 하고 goToNextProblem을 호출합니다.
       * 정답/오답 여부, 정답, 해설을 표시하는 피드백 섹션을 isAnswerChecked가 true일 때 조건부로 렌더링합니다.       
       * isAnswerChecked가 true일 때 옵션의 스타일을 업데이트하여 정답/오답 피드백을 시각적으로 표시합니다.
       * 문제 이동 시 isAnswerChecked 상태를 리셋합니다.


  이러한 상세 단계로 할 일 목록을 업데이트하겠습니다.