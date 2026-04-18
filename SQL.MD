SQLD 52회~57회 기출복원 4지선다 객관식 문제집
각 회차 50문제 (1과목 10문제 + 2과목 40문제) — 총 300문제
복원 블로그(yunamom, oranthy, hoojeong, 데이터전문가포럼) 교차 참고하여 보기 재구성

■■■ 제52회 SQLD ■■■
【1과목: 데이터 모델링의 이해】
■ 문제 1. 스키마에 대한 설명으로 적절한 것은?
① 외부 스키마는 전체 조직의 관점을 통합한 것이다
② 개념 스키마는 전체를 통합한 조직 관점의 통합적 표현이다
③ 내부 스키마는 사용자 관점에서 정의한 것이다
④ 외부 스키마는 물리적 저장 구조를 표현한다

정답: ②
개념 스키마는 조직 전체의 데이터베이스 구조를 통합적으로 표현한 것이다. 외부 스키마는 개별 사용자 관점, 내부 스키마는 물리적 저장 구조이다.
​

■ 문제 2. 개념적 데이터 모델링에 대한 설명으로 적절하지 않은 것은?
① 업무 요건을 충족하는 데이터 모델을 만든다
② 엔터티와 관계를 도출한다
③ 추상화 수준이 높아 전사적 데이터 모델링에 활용된다
④ 추상화 수준이 높아 전체 업무 파악이 어렵다

정답: ④
개념적 모델링은 추상화 수준이 높지만, 오히려 전체 업무를 쉽게 파악하도록 하는 것이 목적이다.

■ 문제 3. 다른 엔터티와 관계에 의해 생성되지 않고 독립적으로 존재하는 엔터티는?
① 행위 엔터티
② 중심 엔터티
③ 관계 엔터티
④ 기본 엔터티

정답: ④
기본 엔터티는 업무에 원래 존재하는 정보로, 독립적으로 존재하며 타 엔터티의 부모 역할을 한다.

■ 문제 4. 엔터티-인스턴스-속성-속성값의 관계 설명으로 적절한 것은?
① 인스턴스와 속성은 M:M 관계이다
② 하나의 엔터티는 하나의 인스턴스만 가진다
③ 하나의 속성은 여러 속성값을 가질 수 있다
④ 하나의 인스턴스는 두 개 이상의 속성을 가지며, 하나의 속성은 하나의 속성값을 갖는다

정답: ④
하나의 인스턴스(행)는 두 개 이상의 속성(컬럼)을 가지며, 각 속성은 하나의 속성값만 갖는다(원자값 원칙).

■ 문제 5. FK(외래키)에 대한 설명으로 적절하지 않은 것은?
① FK는 부모 테이블의 PK를 참조한다
② FK는 참조 무결성을 보장한다
③ FK는 내부식별자이다
④ FK는 자식 테이블에 생성된다

정답: ③
FK는 다른 엔터티로부터 상속받은 외부식별자이다. 내부식별자는 자기 자신의 엔터티 내에서 만들어진 식별자를 말한다.

■ 문제 6. 식별자 관계와 비식별자 관계의 표현으로 적절한 것은?
① 식별관계는 점선, 비식별관계는 실선
② 비식별관계에서 자식은 부모에 완전 종속된다
③ 식별관계는 실선, 비식별관계는 점선
④ 식별관계에서 부모의 식별자는 자식의 일반 속성이 된다

정답: ③
식별자 관계는 실선, 비식별자 관계는 점선으로 표현한다.

■ 문제 7. 정규형에 대한 설명으로 적절하지 않은 것은?
① 제1정규형은 모든 속성이 원자값을 갖는 것이다
② 제2정규형은 부분 함수 종속을 제거한 것이다
③ 제3정규형은 이행 함수 종속을 제거한 것이다
④ 제3정규형은 제1, 제2정규형을 만족하지 않아도 된다

정답: ④
정규형은 단계적(cumulative)이므로, 제3정규형이 되려면 반드시 제1·제2정규형을 모두 만족해야 한다.

■ 문제 8. M:N 관계 해소 시 생성되는 것은?
① 뷰(View)
② 교차(관계) 테이블
③ 시퀀스
④ 인덱스

정답: ②
M:N 관계를 해소하기 위해 교차(관계) 테이블을 생성한다. 양쪽 엔터티의 PK를 FK로 갖는다.

■ 문제 9. 기본키(PK) 생성에 대한 설명으로 적절하지 않은 것은?
① 기본키는 테이블에 한 개 이상 생성할 수 있다
② 기본키는 NOT NULL이어야 한다
③ 기본키는 고유한 값이어야 한다
④ 기본키는 행을 유일하게 식별한다

정답: ①
기본키(PK)는 테이블당 하나만 생성할 수 있다. 복합키는 여러 컬럼이지만 PK 자체는 하나이다.

■ 문제 10. 모든 가능한 조합에 대해 소계를 생성하는 GROUP BY 확장 함수는?
① ROLLUP
② GROUPING SETS
③ CUBE
④ GROUP BY

정답: ③
CUBE는 지정된 컬럼들의 모든 가능한 조합(2^n개)에 대해 소계를 생성한다.

【2과목: SQL 기본 및 활용】
■ 문제 11. SQL의 특징이 아닌 것은?
① 구조적(Structured) 언어이다
② 집합적(Set-based) 언어이다
③ 선언적(Declarative) 언어이다
④ 절차적(Procedural) 언어이다

정답: ④
SQL은 비절차적(Non-procedural) 언어이다. 무엇(What)을 원하는지 기술하고, 어떻게(How)는 DBMS가 결정한다.

■ 문제 12. SQL 명령어 분류 중 적절하지 않은 것은?
① CREATE → DDL
② SELECT → DML
③ INSERT → DCL
④ COMMIT → TCL

정답: ③
INSERT는 DML(데이터 조작어)이다. DCL은 GRANT, REVOKE 등 권한 관련 명령어이다.

■ 문제 13. SELECT 문의 논리적 실행 순서로 올바른 것은?
① SELECT→FROM→WHERE→GROUP BY→HAVING→ORDER BY
② FROM→SELECT→WHERE→GROUP BY→HAVING→ORDER BY
③ FROM→WHERE→GROUP BY→HAVING→ORDER BY→SELECT
④ FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY

정답: ④
FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY 순이다.
​

■ 문제 14. 서브쿼리에 대한 설명으로 적절하지 않은 것은?
① 서브쿼리는 메인쿼리의 컬럼을 사용할 수 있다
② 서브쿼리는 괄호로 감싸서 사용한다
③ 서브쿼리 테이블의 컬럼을 메인쿼리에서 사용할 수 있다
④ 서브쿼리는 단일행 또는 다중행을 반환할 수 있다

정답: ③
메인쿼리에서 서브쿼리 내부 테이블의 컬럼을 직접 참조할 수 없다. 반대 방향(상관 서브쿼리)은 가능하다.

■ 문제 15. 순위 함수 결과가 1, 2, 2, 3 형태로 동순위 후 순차 등수를 부여하는 함수는?
① RANK()
② DENSE_RANK()
③ ROW_NUMBER()
④ NTILE()

정답: ②
DENSE_RANK()는 동순위 후 순차(1,2,2,3). RANK()는 건너뜀(1,2,2,4).

■ 문제 16. 트랜잭션 특성 중 동시 실행 시 다른 트랜잭션에 영향받지 않는 특성은?
① 원자성(Atomicity)
② 일관성(Consistency)
③ 고립성(Isolation)
④ 지속성(Durability)

정답: ③
고립성(Isolation)은 동시 실행 트랜잭션이 서로 간섭하지 않도록 보장한다.

■ 문제 17. 차집합 연산을 수행하는 집합 연산자는?
① UNION
② INTERSECT
③ UNION ALL
④ EXCEPT

정답: ④
EXCEPT(SQL 표준) 또는 MINUS(Oracle)는 차집합 연산자이다.

■ 문제 18. 세 번째 글자가 L인 문자열을 찾는 LIKE 패턴은?
① %L%
② L__%
③ __L%
④ _L%

정답: ③
언더스코어(_)는 임의의 한 문자. __L%는 앞 2글자 임의 + 세 번째 L + 이후 아무 문자열.

■ 문제 19. COALESCE 함수 설명으로 적절한 것은?
① NULL을 0으로 변환한다
② 인자를 순서대로 확인하여 첫 번째 NULL이 아닌 값을 반환한다
③ 두 인자만 받을 수 있다
④ COALESCE(NULL, NULL)은 0을 반환한다

정답: ②
COALESCE(v1, v2, ...)는 왼쪽부터 첫 번째 NULL이 아닌 값을 반환한다.

■ 문제 20. SUM(COALESCE(C1, C2, C3)) 결과는?
C1: 1, NULL, NULL / C2: 2, 2, NULL / C3: 3, 3, 3
① 0
② 1
③ 6
④ 14

정답: ③
행1: COALESCE(1,2,3)=1, 행2: COALESCE(NULL,2,3)=2, 행3: COALESCE(NULL,NULL,3)=3. SUM=6.

■ 문제 21. NVL(100, 0) + NVL(NULL, 0)의 결과는?
① NULL
② 0
③ 100
④ 에러 발생

정답: ③
NVL(100,0)=100, NVL(NULL,0)=0. 100+0=100.

■ 문제 22. 주문을 한 번도 하지 않은 회원을 찾는 SQL로 적절한 것은?
① WHERE id IN (SELECT id FROM 주문)
② WHERE id = (SELECT id FROM 주문)
③ WHERE EXISTS (SELECT 1 FROM 주문 WHERE 회원.id = 주문.id)
④ WHERE NOT EXISTS (SELECT 1 FROM 주문 WHERE 회원.id = 주문.id)

정답: ④
NOT EXISTS는 서브쿼리에 매칭되는 행이 없을 때 TRUE를 반환한다.

■ 문제 23. 부모 행 삭제 시 자식 행도 함께 삭제되는 옵션은?
① RESTRICT
② SET NULL
③ CASCADE
④ NO ACTION

정답: ③
CASCADE는 부모 행 삭제 시 참조하는 자식 행도 함께 삭제한다.

■ 문제 24. CTAS에서 복제되는 제약조건은?
① PK, FK, CHECK 등 모든 제약조건
② NOT NULL 제약조건만
③ FK만
④ 아무 제약조건도 복제되지 않음

정답: ②
CTAS로 복제 시 NOT NULL만 복제된다. PK, FK, CHECK, UNIQUE 등은 별도 추가 필요.
​

■ 문제 25. AVG(COL)과 AVG(NVL(COL,0)) 결과가 다른 이유는?
① AVG가 NULL을 0으로 자동 치환하기 때문
② NVL이 집계에 영향 없기 때문
③ AVG(COL)은 NULL 행을 분모에서 제외하고, AVG(NVL(COL,0))은 전체 행 수로 나누기 때문
④ 두 결과는 항상 동일하다

정답: ③
분모가 다르므로 결과가 달라진다.

■ 문제 26. NATURAL JOIN 설명으로 적절하지 않은 것은?
① 동일 이름 컬럼을 자동으로 조인한다
② 조인 컬럼에 별칭을 사용할 수 없다
③ USING, ON을 함께 사용할 수 있다
④ 동일 이름 컬럼이 여러 개이면 모두 조인 조건이 된다

정답: ③
NATURAL JOIN은 USING이나 ON절을 함께 사용할 수 없다.

■ 문제 27. WHERE NOT (COL <= 2)에서 NULL 포함 시? 데이터: NULL, 1, NULL, 3, 4
① NULL, 3, 4
② 3, 4
③ NULL, 1, 3, 4
④ 1, 3, 4

정답: ②
NOT(COL<=2) = COL>2. NULL>2는 UNKNOWN이므로 NULL 행은 제외. 3, 4만 출력.

■ 문제 28. ROLE에 대한 설명으로 적절한 것은?
① ROLE은 DDL 명령어이다
② ROLE은 GRANT로 부여하고 REVOKE로 회수한다
③ ROLE은 다른 ROLE에 부여할 수 없다
④ ROLE은 회수할 수 없다

정답: ②

■ 문제 29. MERGE문 설명으로 적절한 것은?
① INSERT만 수행 가능
② DDL 명령어이다
③ 조건에 따라 UPDATE와 INSERT를 수행한다
④ ROLLBACK이 불가능하다

정답: ③

■ 문제 30. 순방향 계층형 쿼리에서 PRIOR 위치는?
CONNECT BY (ㄱ) MGR = (ㄴ) EMP
① ㄱ 위치
② ㄴ 위치
③ 양쪽 모두
④ 없어도 동작

정답: ①
순방향: CONNECT BY PRIOR 자식컬럼 = 부모컬럼.

■ 문제 31. SELECT 결과에서 중복을 제거하는 키워드는?
① ALL
② DISTINCT
③ UNIQUE
④ TOP

정답: ②

■ 문제 32. 날짜 형식에서 MI의 의미는?
① 월(Month)
② 분(Minute)
③ 밀리초
④ 마이크로초

정답: ②
MI=분(Minute), MM=월(Month), SS=초(Second).

■ 문제 33. NOT IN에 NULL 포함 시?
T_A: 1, 2, NULL / T_B: 1, 2, 3
SELECT COUNT(*) FROM T_B WHERE COL NOT IN (SELECT COL FROM T_A)
① NULL
② 0
③ 1
④ 3

정답: ②
NOT IN에 NULL이 포함되면 모든 비교가 UNKNOWN → 0건 반환.

■ 문제 34. IN절에 NULL 포함 시?
WHERE COL IN ('A','B', NULL) / 데이터: A, B, C, NULL
① A, B, C, NULL
② A, B
③ A, B, NULL
④ NULL

정답: ②
IN절에서 NULL 비교는 UNKNOWN이므로 무시. A, B만 반환.

■ 문제 35. 결과가 다른 NULL 처리 함수는?
① CASE WHEN COL IS NULL THEN -1 ELSE 0 END
② DECODE(COL, NULL, -1, 0)
③ NVL2(COL, 0, -1)
④ CASE COL WHEN NULL THEN -1 ELSE 0 END

정답: ④
CASE COL WHEN NULL은 COL=NULL 비교→항상 UNKNOWN→ELSE(0)만 반환. 나머지는 NULL을 정상 처리.

■ 문제 36. 셀프조인을 수행하는 경우는?
① 두 테이블 내에 컬럼 연관관계가 있는 경우
② 두 테이블 내에 연관관계 없이 Join 필요 시
③ 한 테이블 내에 컬럼 연관관계가 있는 경우
④ 한 테이블 내에 연관관계 없이 Join 필요 시

정답: ③
셀프조인은 한 테이블 내에서 컬럼 간 연관관계가 있을 때(예: 사원-매니저) 자기 자신과 조인.

■ 문제 37. 조건 데이터 없을 때 일반 SELECT vs 집계함수 SELECT?
SELECT COL1 WHERE COL1='z' → ? / SELECT MAX(COL1) WHERE COL1='z' → ?
① NULL, NULL
② NULL, 공집합
③ 공집합, NULL
④ 공집합, 공집합

정답: ③
일반 SELECT=공집합(0행), 집계함수=NULL 포함 1행.
​

■ 문제 38. 10행×10행 카테시안 곱 결과는?
① 10
② 20
③ 100
④ 에러

정답: ③
조인 조건 없이 FROM에 나열 → 10×10=100행.
​

■ 문제 39. TRUNCATE 설명으로 적절한 것은?
① 구조와 데이터 모두 삭제
② WHERE로 특정 행 삭제 가능
③ 특정 행만 삭제 불가능
④ DELETE보다 성능이 떨어진다

정답: ③
TRUNCATE는 모든 행을 삭제하며 특정 행만 삭제 불가. DDL이므로 Auto Commit.
​

■ 문제 40. REGEXP_SUBSTR('aaaaabbbb', 'a{2,4}') 결과는?
① aaa
② aaaa
③ ab
④ aab

정답: ②
a{2,4}는 a가 2~4회. 탐욕적 매칭으로 최대 4개 → 'aaaa'.
​

■ 문제 41. 급여 높은 순 정렬에서 수정할 부분은?
ORDER BY SUM(SALARY) — 높은 순으로 정렬해야 함
① SELECT절
② WHERE절
③ GROUP BY절
④ ORDER BY절 (DESC 추가)

정답: ④
기본은 ASC. 높은 순은 DESC 필요.
​

■ 문제 42. ROLLBACK 설명으로 적절하지 않은 것은?
① 변경사항을 취소한다
② SAVEPOINT로 특정 지점까지 가능
③ COMMIT 이전으로 롤백할 수 있다
④ DML 결과를 원래 상태로 복구

정답: ③
COMMIT이 완료되면 변경이 확정되어, 이전으로 ROLLBACK 불가.
​

■ 문제 43. 연산자 우선순위가 가장 높은 것은?
① 비교 연산자
② 괄호 ()
③ AND
④ OR

정답: ②
괄호 > NOT > 비교 > AND > OR.
​

■ 문제 44. CEIL(9.36), ROUND(9.48), FLOOR(9.72) 결과는?
① 9, 9, 9
② 10, 9, 9
③ 9, 9, 10
④ 10, 10, 9

정답: ②
CEIL(9.36)=10(올림), ROUND(9.48)=9(0.5미만), FLOOR(9.72)=9(내림).
​

■ 문제 45. COUNT(ALL COL1)과 COUNT(DISTINCT COL1) 결과는?
데이터: (1,A),(2,B),(3,C),(4,D),(1,A),(2,B),(3,A)
SELECT COUNT(ALL COL1) WHERE COL2='A';
SELECT COUNT(DISTINCT COL1);
① 2, 3
② 3, 3
③ 3, 4
④ 4, 4

정답: ③
COL2='A': (1,A),(1,A),(3,A)→3건. 전체 고유값: 1,2,3,4→4건.
​

■ 문제 46. COALESCE(NULL, NULL, 'S', NULL, 'QL') 결과는?
① S
② SQL
③ NULL
④ 에러

정답: ①
첫 번째 NOT NULL인 'S'를 반환.
​

■ 문제 47. 교집합 연산자는?
① UNION
② INTERSECT
③ MINUS
④ EXCEPT

정답: ②
INTERSECT는 양쪽 모두에 존재하는 행을 반환.
​

■ 문제 48. 트랜잭션의 All or Nothing 특성은?
① 원자성
② 고립성
③ 일관성
④ 지속성

정답: ①
원자성(Atomicity) = All or Nothing.

■ 문제 49. SAVEPOINT 후 COMMIT 후 결과는?
INSERT 3건→SP1→UPDATE COL1=4(COL2<=2)→SP2→DELETE(COL2=2)→ROLLBACK TO SP2→INSERT(4,1)→COMMIT
SELECT COUNT(*) WHERE COL1=4;
① 1
② 2
③ 3
④ 4

정답: ③
UPDATE로 2건 COL1=4, ROLLBACK TO SP2로 DELETE 취소, INSERT(4,1) 추가 → COL1=4 총 3건.
​

■ 문제 50. 동일 컬럼명이 없는 두 테이블의 NATURAL JOIN 결과는?
① 오류 발생
② 공집합(0건)
③ INNER JOIN과 동일
④ 카테시안 곱

정답: ④
동일 컬럼명이 없으면 조인 조건 없이 카테시안 곱 발생.
​

■■■ 제53회 SQLD ■■■
【1과목: 데이터 모델링의 이해】
■ 문제 1. 모델링의 데이터 관점(What)에 대한 설명으로 적절한 것은?
① 업무가 어떤 데이터와 관련이 있는지, 데이터 간의 관계를 모델링한다
② 업무 처리 순서(프로세스)를 모델링한다
③ 데이터와 프로세스 간 상관관계를 모델링한다
④ 업무 프로세스의 입출력 흐름을 모델링한다

정답: ①
데이터 관점(What)은 어떤 데이터와 관련이 있는지를 모델링한다.

■ 문제 2. 발생 시점에 따라 분류한 엔터티 종류가 아닌 것은?
① 기본 엔터티
② 중심 엔터티
③ 유형 엔터티
④ 행위 엔터티

정답: ③
발생 시점: 기본, 중심, 행위 엔터티. 유형 엔터티는 유무형에 따른 분류.

■ 문제 3. 인조식별자 설명으로 적절하지 않은 것은?
① 업무적으로 만들어지지 않은 인위적 식별자이다
② 원래 식별자가 복잡할 때 사용한다
③ 속성 수가 적으면 반드시 인조식별자를 사용해야 한다
④ 순번, 일련번호 등이 대표적이다

정답: ③
속성 수와 관계없이, 원래 식별자가 복잡할 때만 사용한다.
​

■ 문제 4. 이행 함수 종속(A→B→C)을 제거하는 정규형은?
① 제1정규형
② 제2정규형
③ 제3정규형
④ BCNF

정답: ③

■ 문제 5. 부분 함수 종속을 제거하는 정규형은?
① 제1정규형
② 제2정규형
③ 제3정규형
④ BCNF

정답: ②

■ 문제 6. 참조 무결성을 보장하는 키는?
① 기본키(PK)
② 외래키(FK)
③ 후보키
④ 대체키

정답: ②
개체 무결성=PK, 참조 무결성=FK, 도메인 무결성=CHECK.
​

■ 문제 7. 바커 표기법에서 필수 속성 기호는?
① 원(○)
② 직선(—)
③ 마름모
④ 점선

정답: ②
직선(—)=필수, 원(○)=선택.

■ 문제 8. 데이터 모델 설명으로 적절하지 않은 것은?
① 논리적 연산의 최소 단위이다
② 트랜잭션을 표현할 수 없다
③ 데이터 정합성을 보장해야 한다
④ 엔터티 간 관계를 정의할 수 있다

정답: ②
데이터 모델은 트랜잭션도 표현할 수 있다.

■ 문제 9. 상호배타(Arc) 관계 설명으로 적절하지 않은 것은?
① 두 개 이상의 엔터티와 배타적 관계를 가진다
② 한 쪽이 존재하면 다른 쪽은 존재할 수 없다
③ 배타적 상속이 불가능하다
④ Arc 관계라고도 한다

정답: ③
상호배타 관계에서도 배타적 상속은 가능하다.

■ 문제 10. 두 엔터티 간 참여자 수를 표현하는 것은?
① 관계 차수(Cardinality)
② 관계 선택성(Optionality)
③ 관계명
④ 관계 페어링

정답: ①
1:1, 1:M, M:N 등.

【2과목: SQL 기본 및 활용】
■ 문제 11. DCL에 해당하는 것은?
① CREATE, ALTER, DROP
② INSERT, UPDATE, DELETE
③ GRANT, REVOKE
④ COMMIT, ROLLBACK

정답: ③

■ 문제 12. TOP(5) WITH TIES 설명으로 적절한 것은?
① 정확히 5건만 반환
② 상위 5건과 마지막 행의 동순위까지 포함 반환
③ 하위 5건 반환
④ SQL 표준이 아님

정답: ②

■ 문제 13. BETWEEN 3000 AND 5000 AND vol<=10 결과 건수는?
데이터: (2000,5), (3500,8), (4500,12), (6000,3)
① 0건
② 1건
③ 2건
④ 3건

정답: ②
(3500,8)만 두 조건 모두 만족.

■ 문제 14. 결과가 NULL이 아닌 함수는?
① NVL(NULL, NULL)
② NULLIF('AB', 'AB')
③ COALESCE('AB', 'CD')
④ CASE WHEN NULL THEN 'X' END

정답: ③
COALESCE('AB','CD')='AB' (NOT NULL).

■ 문제 15. WHERE COL = (서브쿼리)에서 다중행 반환 시?
① 정상 실행
② 에러: single-row subquery returns more than one row
③ 첫 번째 행만 비교
④ 모든 행과 비교

정답: ②

■ 문제 16. UNION에서 각 SELECT에 ORDER BY를 사용할 수 있는가?
① 가능
② 불가 — 컬럼 수/타입 일치 필요
③ 불가 — ORDER BY는 최종에만 사용 가능
④ UNION ALL에서만 가능

정답: ③

■ 문제 17. DEFAULT 설명으로 적절하지 않은 것은?
① 값 미입력 시 기본값 설정
② DEFAULT 설정 시 NULL 입력 불가능
③ 컬럼 정의 시 설정
④ ALTER TABLE로 변경 가능

정답: ②
명시적으로 NULL 입력하면 NULL 저장됨. DEFAULT는 값 미지정 시만 적용.

■ 문제 18. 상위 3순위까지 동순위 포함 추출하는 함수는?
① RANK()
② DENSE_RANK()
③ ROW_NUMBER()
④ NTILE()

정답: ②

■ 문제 19. WHERE 조건 데이터가 없을 때 반환되는 것은?
① NULL
② 0
③ 공집합(Empty Set)
④ 에러

정답: ③

■ 문제 20. DELETE, TRUNCATE, DROP 비교 중 적절하지 않은 것은?
① WHERE 없는 DELETE와 DROP은 같은 결과이다
② DROP은 테이블 정의까지 삭제
③ TRUNCATE는 UNDO 미생성으로 DELETE보다 빠르다
④ DROP과 TRUNCATE는 Auto Commit

정답: ①
DELETE는 구조 유지, DROP은 구조까지 삭제. 완전히 다르다.

■ 문제 21. 셀프조인 LEFT JOIN + COALESCE로 매니저 없는 사원 처리?
① 출력 안 됨
② 매니저명이 '사장'으로 출력
③ 모두 '사장'
④ 에러

정답: ②

■ 문제 22. LTRIM('aaabbbccc', 'a') 결과는?
① aaabbbccc
② bbbccc
③ aaabbb
④ ccc

정답: ②
왼쪽부터 'a' 제거.

■ 문제 23. 소수점 이하를 올림하는 함수는?
① FLOOR
② CEIL
③ ROUND
④ TRUNC

정답: ②

■ 문제 24. 테이블 별칭 사용 시 적절하지 않은 것은?
① FROM T1 A
② SELECT A.COL1 FROM T1 A
③ SELECT U1.T1.COL1 FROM U1.T1 A
④ SELECT COL1 FROM T1 A

정답: ③
별칭 지정 후 원래 테이블명으로 참조 불가. 반드시 별칭 사용.

■ 문제 25. 동일 컬럼명 없는 NATURAL JOIN 결과?
① 오류
② 공집합
③ INNER JOIN과 동일
④ 카테시안 곱

정답: ④

■ 문제 26. <= ALL(50, 15) 결과는?
① 15 이하만 출력
② 50 이하만 출력
③ 15~50 사이
④ 모든 값

정답: ①
<= ALL = 모든 값보다 작거나 같다 → 최솟값(15) 이하.

■ 문제 27. 차집합(A-B) 연산자는?
① UNION
② INTERSECT
③ UNION ALL
④ MINUS

정답: ④

■ 문제 28. 3행×5행 CROSS JOIN 결과?
① 3
② 5
③ 8
④ 15

정답: ④

■ 문제 29. UNPIVOT의 역할은?
① 열(Column)→행(Row) 변환
② 행→열 변환
③ 중복 제거
④ 집계 적용

정답: ①

■ 문제 30. ROLLUP 결과에 ORDER BY를 사용할 수 없다?
① 맞다
② CUBE에서만 가능
③ GROUPING SETS에서만 가능
④ ROLLUP 결과에도 ORDER BY 사용 가능

정답: ④

■ 문제 31. Top-N 쿼리에서 올바른 ROWNUM 사용법은?
① WHERE ROWNUM <= 5 (서브쿼리 없이)
② WHERE ROWNUM = 5
③ 서브쿼리에서 ORDER BY 후 외부에서 ROWNUM <= 5
④ FETCH FIRST 5 ROWS ONLY (ORDER BY 없이)

정답: ③
ROWNUM은 정렬 전에 부여되므로, 서브쿼리에서 정렬 후 필터해야 함.

■ 문제 32. RANGE BETWEEN 50 PRECEDING AND 150 FOLLOWING 의미?
① 50행 앞~150행 뒤
② 현재 값 기준 -50~+150 범위
③ 전체의 50%~150%
④ 파티션 첫50~마지막150행

정답: ②

■ 문제 33. NOCYCLE의 역할은?
① 결과 정렬
② 순환 참조(무한 루프) 방지
③ 레벨 제한
④ 역방향 전개

정답: ②

■ 문제 34. CASE문으로 VVIP→VIP 순 정렬?
① ORDER BY CASE WHEN 등급='VVIP' THEN 1 WHEN 등급='VIP' THEN 2 ELSE 3 END
② ORDER BY 등급 ASC
③ ORDER BY 등급 DESC
④ ORDER BY DECODE(등급, 'VIP', 1, 'VVIP', 2, 3)

정답: ①

■ 문제 35. INSERT INTO T VALUES(1,2,3) — T는 4개 컬럼. 결과?
① 정상
② 에러: 컬럼 수 불일치
③ 4번째에 NULL 자동
④ 경고

정답: ②

■ 문제 36. 세 테이블 INNER JOIN에서 NULL 행 처리?
t1:(1),(2),(3) / t2:(1),(2),(NULL) / t3:(1),(NULL),(NULL)
① 0건
② 1건
③ 2건
④ 3건

정답: ②
NULL=NULL은 UNKNOWN → 값 1만 매칭 → 1건.

■ 문제 37. 중복 없는 두 테이블의 UNION 결과 행 수?
t1:(1),(2),(3) / t2:(4),(5),(6)
① 3건
② 6건
③ 9건
④ 12건

정답: ②

■ 문제 38. 기존 NULL이 있는 컬럼에 NOT NULL 제약조건 추가 시?
① NULL→0 자동 변환
② 에러 발생
③ 기존 데이터에 무영향
④ NULL→공백 변환

정답: ②

■ 문제 39. DEFAULT 변경 시 기존 데이터는?
① 함께 변경
② 에러
③ 이후 입력 데이터부터만 적용
④ 자동 UPDATE

정답: ③

■ 문제 40. REGEXP로 같은 문자 연속 2번 매칭?
'aabbcc'에서 결과
① a
② aa
③ aabb
④ NULL

정답: ②
(.)\1은 같은 문자 연속 2번. 첫 매칭 = 'aa'.

■ 문제 41. COMMIT 후 ROLLBACK TO 존재하지 않는 SP 결과?
INSERT 3건→SP→INSERT 2건→COMMIT→INSERT 1건→ROLLBACK TO SP
① 3건
② 5건
③ 6건
④ 에러 발생 후 5건

정답: ④
COMMIT으로 SP 무효화. ROLLBACK TO SP → 에러. COMMIT된 5건 유지.

■ 문제 42. LIKE '%학' 검색 결과? 데이터: 물리학, 수학, 영어, 체육
① 0건
② 1건
③ 2건
④ 3건

정답: ③
물리학, 수학 = 2건.

■ 문제 43. (C1,C2) IN ((1,3),(1,4))와 동일한 조건?
① C1=1 AND C2=3
② C1=1 OR C2 IN (3,4)
③ C1 IN (1) AND C2 IN (3,4)
④ C1=1 AND C2 IN (3,4)

정답: ④

■ 문제 44. NVL(MIN(b),0) + NVL(MAX(c),0) 결과? MIN(b)=5, MAX(c)=10
① 0
② 5
③ 10
④ 15

정답: ④

■ 문제 45. 묵시적 형변환 MIN(COL1)+MAX(TO_CHAR(COL2)) 결과?
COL1(숫자): 10,20,30 / COL2(숫자): 90,80,70
① 100
② '1090'
③ 에러
④ NULL

정답: ①
MIN=10, MAX(TO_CHAR)='90'. + 연산 시 '90'→90 묵시적 형변환. 10+90=100.

■ 문제 46. 0/N, N/0, N/NULL 결과?
① 0, 0, 0
② 0, 에러, NULL
③ NULL, 에러, 0
④ 에러, 에러, 에러

정답: ②
0/300=0, 300/0=에러(ORA-01476), 100/NULL=NULL.

■ 문제 47. 구조 유지 + 데이터만 삭제?
① DROP
② ALTER TABLE
③ DELETE 또는 TRUNCATE
④ REVOKE

정답: ③

■ 문제 48. IS NOT NULL이 올바른가?
① WHERE COL != NULL도 가능
② WHERE COL <> NULL도 가능
③ WHERE COL IS NOT NULL이 올바르다
④ WHERE NOT COL = NULL도 가능

정답: ③

■ 문제 49. 참조 무결성을 구현하는 키?
① PK
② FK
③ UK
④ CHECK

정답: ②

■ 문제 50. PK 중복 삽입은?
① 참조 무결성 위반
② 개체 무결성 위반
③ 도메인 무결성 위반
④ 정상

정답: ②

■■■ 제54회 SQLD ■■■
【1과목: 데이터 모델링의 이해】
■ 문제 1. Key, 속성, 관계를 정확하게 표현하고 재사용성이 높은 모델링은?
​
① 논리적 데이터 모델링
② 개념적 데이터 모델링
③ 물리적 데이터 모델링
④ 데이터베이스 모델링

정답: ①

■ 문제 2. 엔터티 특징으로 적절하지 않은 것은?
​
① 고유한 식별자를 가진다
② 데이터 저장의 기본 단위이다
③ 반드시 2개 이상의 속성을 가진다
④ 속성이 없는 엔터티가 있을 수 있다

정답: ④

■ 문제 3. 속성 특징으로 적절하지 않은 것은?
​
① 엔터티의 특성을 나타낸다
② 기본·파생 속성으로 구분 가능
③ 파생 속성은 다른 속성에서 계산
④ 파생 속성은 많을수록 좋다

정답: ④

■ 문제 4. 주식별자 특징으로 적절하지 않은 것은?
​
① 유일성 보장
② 최소성 조건 만족
③ 고유하게 식별
④ 값이 자주 변경될 수 있다

정답: ④

■ 문제 5. 비식별자 관계 설명으로 적절하지 않은 것은?
​
① 식별관계에서 부모 식별자는 자식 PK에 포함
② 비식별관계에서 부모와의 관계는 반드시 필수
③ 식별관계에서 자식은 부모에 종속
④ 비식별관계에서 자식이 독립적으로 존재 가능

정답: ②

■ 문제 6. 고객-주문 ERD 설명으로 적절한 것은?
​
① 고객번호는 주문에서 자체 생성
② 주문의 고객번호는 고객에서 상속받은 것
③ 고객-주문은 비식별 관계가 아니다
④ 주문은 기본 엔터티

정답: ②

■ 문제 7. 일반속성이 주식별자 전체에 완전 종속인 상태는?
​
① 제1정규형
② 제2정규형
③ 제3정규형
④ BCNF

정답: ②

■ 문제 8. 원래 식별자가 복잡하여 인위적으로 만든 식별자는?
​
① 외래키
② 복합 식별자
③ 인조 식별자
④ 자연 식별자

정답: ③

■ 문제 9. IE·바커 표기법의 관계 표현 중 적절하지 않은 것은?
​
① IE에서 필수 관계=실선
② 바커에서 선택 관계=점선
③ IE는 실선, 바커는 O 표시로 선택 관계 표현
④ IE에서 필수 관계는 O 없이

정답: ③

■ 문제 10. NULL 설명으로 적절한 것은?
​
① NULL은 0과 같다
② NULL + 숫자 = 숫자
③ NULL은 미지의 값으로 비교 불가
④ IE에서 NULL 허용 여부를 알 수 없다

정답: ③

【2과목: SQL 기본 및 활용】
■ 문제 11. CTAS 설명으로 적절하지 않은 것은?
​
① 데이터를 복사한다
② 모든 제약조건이 복사된다
③ 기존 구조 기반으로 생성
④ NOT NULL만 복사, PK/FK 별도 추가

정답: ②

■ 문제 12. VIEW 설명으로 적절하지 않은 것은?
​
① 실제 데이터 저장 안 함
② 보안 목적 사용 가능
③ 컬럼 추가 시 VIEW 변경 불필요
④ 다른 테이블 참조

정답: ③

■ 문제 13. DB의 논리적 업무 최소 단위는?
​
① 트랜잭션
② 레코드
③ Query
④ 테이블

정답: ①

■ 문제 14. CONNECT BY PRIOR emp_no = mgr_no 전개 방향?
​
① 역방향
② 순방향
③ 양방향
④ 알 수 없다

정답: ②

■ 문제 15. 서브쿼리 설명 중 적절하지 않은 것은? (복수정답)
​
① 1:M 관계에서 항상 M 레벨로 집계
② 서브쿼리 컬럼은 메인에서 사용 불가
③ 괄호로 감싸서 사용
④ 스칼라 서브쿼리는 하나의 값만 반환

정답: ①② (복수정답)
서브쿼리는 메인쿼리 레벨로 결과 생성. Inline View의 경우 메인에서 사용 가능.

■ 문제 16. CASE WHEN col1='X' THEN NULL ELSE col1 END와 동일한 함수?
​
① NVL(col1, 'X')
② COALESCE(col1, 'X')
③ NULLIF(col1, 'X')
④ NVL2(col1, 'X', NULL)

정답: ③

■ 문제 17. Oracle에서 FROM절에 AS 사용 시?
​
SELECT T.* FROM TAB AS T
① 정상
② 에러 (ORA-00933)
③ 경고만
④ T 무시

정답: ②
Oracle에서는 FROM절에 AS 키워드 사용 불가.

■ 문제 18. COALESCE(A, 50B, '50') 설명으로 적절한 것은?
​
① B가 NOT NULL이면 항상 B값
② A, B 모두 NULL이면 100 반환
③ A가 NULL이면 언제나 50B
④ A가 NOT NULL이면 A값 반환

정답: ④

■ 문제 19. IN절에 NULL 포함 시?
​
WHERE COL IN ('A','B',NULL) / 데이터: A, B, C, NULL
① A, B, C, NULL
② A, B
③ A, B, NULL
④ NULL

정답: ②

■ 문제 20. UK(UNIQUE) 설명으로 적절하지 않은 것은?
​
① PK는 NOT NULL
② FK는 부모 PK를 참조
③ UK는 NOT NULL이어야 한다
④ CHECK는 특정 조건만 허용

정답: ③
UK는 NULL을 허용한다. PK = UNIQUE + NOT NULL.

■ 문제 21. IN→EXISTS 변환 시 적절한 것은?
​
WHERE 번호 IN (SELECT 번호 FROM B WHERE A.성별=B.성별)
① WHERE EXISTS(SELECT 1 FROM B WHERE A.성별=B.성별 AND A.번호=B.번호)
② JOIN B ON A.성별=B.성별
③ WHERE A.성별 IN (...)
④ WHERE 번호 = ALL(...)

정답: ①

■ 문제 22. NOT IN에 NULL 포함 시?
​
T_A: 1, 2, NULL / T_B: 1, 2, 3
① NULL
② 0
③ 1
④ 3

정답: ②

■ 문제 23. NULL 포함 AVG(나이) GROUP BY 결과?
​
그룹1:(10,10) / 그룹2:(20,20) / 그룹3:(30,30,NULL)
① 10, 20, 25
② 10, 20, NULL
③ 10, 20, 30
④ 10, 20, 20

정답: ③
AVG는 NULL 제외. 그룹3: (30+30)/2=30.

■ 문제 24. 강좌 100과 101 동시 수강 학생 SQL?
​
① WHERE 강좌번호=100 AND 강좌번호=101
② INTERSECT 사용
③ WHERE 강좌번호 IN (100, 101)
④ WHERE 강좌번호=100 OR 101

정답: ②

■ 문제 25. ROW_NUMBER, RANK, DENSE_RANK에서 7780번(SALARY=4000) 결과?
​
데이터(오름차순): 2000, 3000, 3000, 4000, 4000
① 4, 4, 3
② 3, 3, 3
③ 4, 4, 4
④ 3, 4, 3

정답: ①
ROW_NUMBER:4, RANK:4(건너뜀), DENSE_RANK:3(순차).

■ 문제 26. CUME_DIST 함수 설명?
​
① 파티션별 전체 건수 대비 누적 백분율
② 동점 시 동일 순위
③ 상대적 순위 0~1
④ n개 그룹 분할

정답: ①

■ 문제 27. RANGE BETWEEN 100 PRECEDING AND 200 FOLLOWING 의미?
​
① 100행~200행
② 현재 값 -100~+200 범위
③ 첫100~마지막200행
④ ROWS와 동일

정답: ②

■ 문제 28. UPDATE WHERE 없이 서브쿼리 불일치 시?
​
① 조건 일치만 인상
② WHERE dept=60과 동일
③ 에러
④ 불일치 행 salary가 NULL로 변경

정답: ④

■ 문제 29. ROWNUM=2의 결과?
​
① 2번째 행
② 0건
③ 1번째 행
④ 에러

정답: ②
ROWNUM은 1부터 순차. 1을 건너뛸 수 없으므로 0건.

■ 문제 30. 셀프조인으로 등수 구하기 빈칸?
​
SELECT 이름, 점수, (SELECT (ㄱ) FROM t1 t2 WHERE (ㄴ)) AS 순위
① COUNT(), t1.점수 > t2.점수
② COUNT()+1, t1.점수 < t2.점수
③ RANK(), t1.점수 = t2.점수
④ SUM(*), t1.점수 >= t2.점수

정답: ②

■ 문제 31. BETWEEN과 결과가 다른 것은?
​
WHERE COL BETWEEN '2023-01-01' AND '2023-12-31'
① COL >= ... AND COL <= ...
② COL > ... AND COL < ...
③ NOT(COL < ... OR COL > ...)
④ COL >= ... AND COL < '2024-01-01'

정답: ②
BETWEEN은 양 끝값 포함. ②는 끝값 제외.

■ 문제 32. SAVEPOINT와 ROLLBACK 후 유효 SQL?
​
SQL1→SP_A→SQL2→SP_B→SQL3→ROLLBACK TO A→SQL4→SQL5
① 전부
② SQL1, SQL4, SQL5
③ SQL1, SQL2만
④ 모두 무효

정답: ②

■ 문제 33. IN절 서브쿼리에서 중복이 있어도 에러가 안 나는 이유?
​
① 에러 무시
② DISTINCT로 비교
③ 첫 번째 값만 사용
④ ALL과 동일

정답: ②

■ 문제 34. ORDER BY 기본 정렬?
① DESC
② ASC
③ 입력 순서
④ NULL 우선

정답: ②

■ 문제 35. 0/N, N/0, N/NULL 결과?
​
① 0, 0, 0
② 0, 에러, NULL
③ NULL, 에러, 0
④ 에러, 에러, 에러

정답: ②

■ 문제 36. GROUPING SETS 설명으로 적절한 것은?
​
① ROLLUP과 항상 동일
② 원하는 그룹핑만 선택적 지정 가능
③ CUBE보다 많은 소계
④ 개별 컬럼 그룹핑 불가

정답: ②

■ 문제 37. LAG 함수 설명?
​
① 이후 행 값 반환
② 이전 행 값 반환
③ LAG=LEAD
④ 집계 함수

정답: ②

■ 문제 38. CASE문에서 ELSE 없을 때 조건 불일치 시?
① 0
② 에러
③ NULL
④ 공백

정답: ③

■ 문제 39. COMMIT 후 ROLLBACK 가능?
① 가능
② 불가능 — COMMIT은 확정
③ SP가 있으면 가능
④ DDL만 가능

정답: ②

■ 문제 40. LIKE 'A%' 의미?
① A 포함 모든 문자열
② A로 시작하는 모든 문자열
③ A로 끝나는 문자열
④ 정확히 'A'

정답: ②

■ 문제 41. REGEXP_INSTR('12345678', '(123)(4(56)(78))', 1,1,0,'i',2) 결과?
​
① 1
② 4
③ 5
④ 8

정답: ②
2번째 캡처 그룹 (4(56)(78))이 위치 4에서 시작.

■ 문제 42. 단일행 함수 설명으로 적절하지 않은 것은?
① 각 행에 개별 적용
② 여러 인자, 하나의 결과
③ 중첩 사용 가능
④ GROUP BY절에서 사용 불가

정답: ④

■ 문제 43. INNER JOIN에서 컬럼명이 반드시 같아야 하는가?
① 반드시 같아야
② 같지 않아도 ON절에서 지정 가능
③ USING만 사용
④ 에러

정답: ②

■ 문제 44. 전체 합계 + 부서별 합계 윈도우 함수?
① SUM(sal) OVER(), SUM(sal) OVER(PARTITION BY dept)
② SUM(sal) GROUP BY dept
③ SUM(sal) OVER(ORDER BY dept)
④ COUNT(*) OVER()

정답: ①

■ 문제 45. TRUNCATE는 특정 행만 삭제 가능?
① 가능
② WHERE로 가능
③ 불가능
④ DELETE보다 느림

정답: ③

■ 문제 46. 연산자 우선순위 가장 높은 것?
① 비교
② 괄호
③ AND
④ OR

정답: ②

■ 문제 47. CEIL(9.36), ROUND(9.48), FLOOR(9.72)?
① 9, 9, 9
② 10, 9, 9
③ 9, 9, 10
④ 10, 10, 9

정답: ②

■ 문제 48. SAVEPOINT 후 결과?
​
INSERT 3건→SP1→UPDATE COL1=4(COL2<=2)→SP2→DELETE→ROLLBACK TO SP2→INSERT(4,1)→COMMIT
COUNT(*) WHERE COL1=4?
① 1
② 2
③ 3
④ 4

정답: ③

■ 문제 49. NATURAL JOIN 기본 동작?
① 동일 이름 모든 컬럼으로 자동 조인
② 첫 번째 컬럼만
③ PK-FK만
④ CROSS JOIN

정답: ①

■ 문제 50. 동일 컬럼명 없는 NATURAL JOIN 결과?
TAB1(ID,CUSTOMER) / TAB2(C_ID,PHONE)
① 0
② 3
③ 5
④ 15

정답: ④
동일 컬럼명 없으면 카테시안 곱. 3×5=15.
​

■■■ 제55회 SQLD ■■■
【1과목: 데이터 모델링의 이해】
■ 문제 1. 내부 스키마 설명으로 적절한 것은?
​
① 개별 사용자 관점
② 조직 전체 통합 관점
③ 물리적 저장 구조를 표현
④ 응용 프로그램 인터페이스 정의

정답: ③

■ 문제 2. 엔터티명 설명으로 적절하지 않은 것은?
​
① 현업 용어 사용
② 가능하면 약어를 사용한다
③ 단수 명사 사용
④ 유일하게 이름 부여

정답: ②
가능하면 약어를 사용하지 않는다가 원칙.

■ 문제 3. 기본 엔터티 설명으로 적절하지 않은 것은?
​
① 독립적 생성 가능
② 타 엔터티의 부모 역할
③ 다른 엔터티로부터 주식별자를 상속받는다
④ 고유한 주식별자 보유

정답: ③

■ 문제 4. 주식별자 컬럼 2개를 분리하여 정규화하는 것은?
​
① 제1정규형
② 제2정규형
③ 제3정규형
④ BCNF

정답: ②

■ 문제 5. 제1정규형 설명으로 적절하지 않은 것은?
​
① 원자값
② 반복 그룹 제거
③ 일반속성이 주식별자 전체에 종속적
④ 다중값 속성 분리

정답: ③
주식별자 전체 종속은 제2정규형 조건.

■ 문제 6. 식별자 관계에서 부모-자식이 항상 1:1인가?
​
① 항상 1:1
② 1:M도 가능
③ M:N만 가능
④ 관계 없음

정답: ②

■ 문제 7. All or Nothing 트랜잭션 특성?
​
① 원자성
② 일관성
③ 고립성
④ 지속성

정답: ①

■ 문제 8. 계층형 모델에서 1:1만 가능?
​
① 그렇다
② 아니다 — 1:M 가능
③ M:N만
④ 관계 없음

정답: ②

■ 문제 9. 인스턴스 설명?
​
① 속성값을 가진다
② 엔터티의 개별 사례이다
③ 엔터티를 정의
④ 인스턴스에 비종속

정답: ②

■ 문제 10. 관계 차수 설명?
​
① 참여자 수 표현
② 관계 선택성
③ 관계명
④ 관계 페어링

정답: ①

【2과목: SQL 기본 및 활용】
■ 문제 11. 서브쿼리 설명으로 적절하지 않은 것은?
​
① WHERE절에서 사용 가능
② 메인쿼리 컬럼 참조 가능
③ IN절은 단일행 서브쿼리만 사용 가능
④ 스칼라 서브쿼리는 하나의 값 반환

정답: ③
IN절은 다중행도 가능.

■ 문제 12. DML에 해당하는 것은?
​
① CREATE, ALTER, DROP
② INSERT, UPDATE, DELETE
③ GRANT, REVOKE
④ COMMIT, ROLLBACK

정답: ②

■ 문제 13. DENSE_RANK() 설명?
​
① 동점 시 건너뜀
② 동점 시 동일 순위 후 순차 번호
③ 고유 순번
④ n개 그룹

정답: ②

■ 문제 14. GROUP BY ROLLUP(col1), col1의 결과 행 수?
​
데이터: (A,100),(B,200),(C,300),(C,400)
① 4행
② 5행
③ 6행
④ 8행

정답: ③

■ 문제 15. 테이블명이 숫자로 시작하면?
​
① 정상
② 에러
③ 자동 변환
④ 경고만

정답: ②

■ 문제 16. ROLLUP(A,B)과 결과가 다른 것은?
​
① GROUPING SETS((A,B),A,())
② A, ROLLUP(B)
③ GROUPING SETS((A,B),(A))
④ ①번

정답: ③
③에는 전체 소계()가 없음.

■ 문제 17. GROUPING SETS(ROLLUP(A), B)와 동일한 것은?
​
① GROUPING SETS(A, B, ())
② GROUPING SETS((A,B), A, ())
③ ROLLUP(A, B)
④ CUBE(A, B)

정답: ①

■ 문제 18. NULL2 + 숫자2 결과?
​
데이터: (NULL,10), (10,10), (10,NULL)
① 20, 40, 20
② NULL, 40, NULL
③ 0, 40, 0
④ 에러, 40, 에러

정답: ②

■ 문제 19. SUM에서 NULL 처리?
​
① NULL→0 치환
② NULL 행 제외, 전체 NULL→SUM=NULL
③ SUM(NULL)=0
④ NVL은 무영향

정답: ②

■ 문제 20. LEFT, FULL, RIGHT OUTER JOIN 결과 행 수?
​
T1: 3행, T2: 4행, 매칭 2건
① 3, 5, 3
② 3, 5, 4
③ 2, 5, 2
④ 3, 7, 4

정답: ②

■ 문제 21. LEFT-LEFT-INNER JOIN에서 INNER JOIN 영향?
​
① 마지막 INNER JOIN이 NULL 행 제거
② LEFT JOIN만 영향
③ 순서 무관
④ INNER JOIN 무시

정답: ①

■ 문제 22. REGEXP_SUBSTR('abcd', 'b*c') 결과?
​
① NULL
② bc
③ c
④ bbc

정답: ②

■ 문제 23. 순방향 계층형 쿼리 빈칸?
​
CONNECT BY PRIOR (ㄱ) = (ㄴ)
① 관리자번호, 사원번호
② 사원번호, 관리자번호
③ 사원번호, 사원번호
④ 관리자번호, 관리자번호

정답: ②

■ 문제 24. ALIAS 사용 중 적절하지 않은 것은?
​
① SELECT에서 컬럼 뒤에 별칭
② ORDER BY에서 별칭 사용
③ 별칭은 컬럼 앞뒤 어디든 가능
④ AS 키워드로 지정

정답: ③
별칭은 컬럼 뒤에만 사용 가능.

■ 문제 25. OR 연산 우선순위?
​
WHERE A=1 OR A=2 AND B=3 AND C=4
① (A=1 OR A=2) AND B=3 AND C=4
② A=1 OR (A=2 AND B=3 AND C=4)
③ (A=1 OR A=2) AND (B=3 AND C=4)
④ 에러

정답: ②
AND가 OR보다 우선.

■ 문제 26. '홍길동'의 손자 노드 조회 SQL?
​
① FROM EMP A, EMP B WHERE A.ENAME='홍길동' AND B.MGR=A.EMPNO
② FROM EMP A, EMP B, EMP C WHERE A.ENAME='홍길동' AND B.MGR=A.EMPNO AND C.MGR=B.EMPNO
③ FROM EMP A WHERE A.MGR='홍길동'
④ FROM EMP A, EMP B WHERE A.MGR=B.EMPNO AND B.ENAME='홍길동'

정답: ②
손자=2단계 하위. A→B→C.

■ 문제 27. ON절에 컬럼명만 쓰면?
​
INNER JOIN B ON (DEPARTMENT_ID)
① 정상
② 에러: 조인 조건이 와야 함
③ USING과 동일
④ 경고만

정답: ②

■ 문제 28. Oracle ORDER BY DESC 시 NULL 기본 위치?
​
① NULLS LAST
② NULLS FIRST
③ 중간
④ 제외

정답: ②

■ 문제 29. WITH TIES 설명으로 적절하지 않은 것은?
​
① 마지막 행의 동순위 포함 반환
② ONLY와 함께 사용 가능
③ 첫 번째 행의 동순위 포함 반환
④ ORDER BY와 함께 사용

정답: ③

■ 문제 30. 계약이 없는 고객 SQL?
​
① EXISTS (...)
② NOT EXISTS (...)
③ IN (...)
④ = (...)

정답: ②

■ 문제 31. UNION ALL에서 컬럼 ALIAS 기준?
​
① 마지막 SELECT
② 첫 번째 SELECT
③ 공통
④ 에러

정답: ②

■ 문제 32. 3회 이상 주문 고객 조건절?
​
① WHERE COUNT(주문번호) >= 3
② HAVING COUNT(주문번호) >= 3
③ WHERE SUM >= 3
④ HAVING SUM >= 3

정답: ②

■ 문제 33. FK 참조 무결성 위반 시?
​
UPDATE COL1='B' (부모에 'B' 없음)
① 정상
② 에러: parent key not found
③ NULL 변경
④ 경고만

정답: ②

■ 문제 34. SAVEPOINT 후 유효 SQL?
​
(가)SQL1→SP_A→(나)SQL2→SP_B→(다)SQL3→ROLLBACK TO A→(라)SQL4→(마)SQL5
① 전부
② 가, 나, 라, 마
③ 가, 라, 마
④ 가만

정답: ③

■ 문제 35. COUNT(expr)의 NULL 처리?
​
① NULL 포함
② NULL 제외
③ 에러
④ NULL→0 치환

정답: ②

■ 문제 36. 전체 합계 + 부서별 합계 윈도우 함수?
​
① SUM(sal) OVER(), SUM(sal) OVER(PARTITION BY dept)
② SUM(sal) GROUP BY dept
③ SUM(sal) OVER(ORDER BY dept)
④ COUNT(*) OVER()

정답: ①

■ 문제 37. UNION ALL과 동일한 집합 연산 조합?
​
① UNION + UNION
② UNION + INTERSECT
③ INTERSECT + MINUS
④ UNION + MINUS

정답: ②

■ 문제 38. N/0, N/NULL 결과?
​
① 0, NULL
② 에러, NULL
③ NULL, 에러
④ 에러, 에러

정답: ②

■ 문제 39. 구조 유지 + 데이터만 삭제?
​
① DROP
② ALTER TABLE
③ DELETE 또는 TRUNCATE
④ REVOKE

정답: ③

■ 문제 40. LIKE '%학' 검색 결과? 물리학, 수학
​
① 0건
② 1건
③ 2건
④ 에러

정답: ③

■ 문제 41. IS NOT NULL이 올바른가?
​
① != NULL도 가능
② <> NULL도 가능
③ IS NOT NULL이 올바르다
④ NOT COL = NULL도 가능

정답: ③

■ 문제 42. 컬럼 추가 명령어?
​
① ALTER TABLE ... ADD
② ALTER TABLE ... MODIFY
③ CREATE TABLE ... ADD
④ INSERT INTO

정답: ①

■ 문제 43. 참조 무결성 키?
​
① PK
② FK
③ UK
④ CHECK

정답: ②

■ 문제 44. PK 중복 삽입은?
​
① 참조 무결성 위반
② 개체 무결성 위반
③ 도메인 무결성 위반
④ 정상

정답: ②

■ 문제 45. BETWEEN과 결과 다른 것?
​
① >= AND <=
② > AND <
③ NOT(< OR >)
④ >= AND < (다음 날짜)

정답: ②

■ 문제 46. Oracle DESC NULL 기본 위치?
​
① NULLS LAST
② NULLS FIRST
③ 중간
④ 제외

정답: ②

■ 문제 47. ROW LIMITING WITH TIES 설명으로 적절하지 않은 것?
​
① 마지막 행 동순위 포함
② ONLY는 지정 수만
③ 첫 번째 행 동순위 포함
④ ORDER BY와 함께

정답: ③

■ 문제 48. COUNT(expr) NULL 처리?
​
① NULL 포함
② NULL 제외
③ NULL→0
④ 에러

정답: ②

■ 문제 49. IN절 중복이 있어도 에러 안 나는 이유?
​
① 에러 무시
② DISTINCT로 비교
③ 첫 번째만
④ ALL과 동일

정답: ②

■ 문제 50. Oracle ASC 시 NULL 기본 위치?
① NULLS FIRST
② NULLS LAST
③ 중간
④ 제외

정답: ②
Oracle: ASC→NULLS LAST, DESC→NULLS FIRST.

■■■ 제56회 SQLD ■■■
【1과목: 데이터 모델링의 이해】
■ 문제 1. 스키마 종류로 옳지 않은 것은?
​
① 응용 스키마
② 외부 스키마
③ 개념 스키마
④ 내부 스키마

정답: ①
'응용 스키마'는 존재하지 않는다. 3계층: 외부, 개념, 내부.

■ 문제 2. 데이터 모델링 설명으로 옳지 않은 것은?
​
① 모든 데이터를 포함해야
② 업무 분석 기초
③ 정보시스템 구축 기초
④ 업무 규칙이 모델에 포함되지 않아도 된다

정답: ④

■ 문제 3. 발생 시점에 따른 엔터티 유형으로 적절하지 않은 것은?
​
① 관계 엔터티
② 행위 엔터티
③ 중심 엔터티
④ 기본 엔터티

정답: ①

■ 문제 4. 다른 속성에서 결과를 도출하는 속성은?
​
① 설계 속성
② 기본 속성
③ 파생 속성
④ 관계 속성

정답: ③

■ 문제 5. 속성 설명 중 모두 옳은 것은?
​
가. 주소=복합속성 / 나. 나이=단순속성 / 다. 주민번호=단일값속성 / 라. 연락처=다중값속성
① 가, 라
② 가, 나, 다
③ 나, 다, 라
④ 가, 나, 다, 라

정답: ④

■ 문제 6. ERD 설명으로 옳지 않은 것은? (병원-의사-수술)
​
① ㄷ은 ㄱ과 ㄴ을 합한 것과 의미가 같다
② 의사 없는 병원 가능
③ 수술 없는 의사 가능
④ 의사 없는 수술 가능

정답: ①

■ 문제 7. 업무에 의해 만들어진 식별자?
​
① 외부식별자
② 내부식별자
③ 본질식별자
④ 인조식별자

정답: ③

■ 문제 8. 모든 일반 속성이 주식별자에 종속된 정규형?
​
① 제1정규형
② 제2정규형
③ 제3정규형
④ BCNF

정답: ②

■ 문제 9. 정규화 설명으로 옳지 않은 것은?
​
① 정규화 시 유연성이 떨어진다
② 일반 속성 간 종속 제거=제3정규형
③ 반정규화는 데이터 중복으로 독립성 저하
④ 정규화 많이 할수록 조인 증가→성능 저하 가능

정답: ①
정규화는 유연성을 높인다.

■ 문제 10. 연산자 우선순위 가장 높은 것은?
​
① 비교
② 괄호
③ AND
④ OR

정답: ②

【2과목: SQL 기본 및 활용】
■ 문제 11. COUNT(ALL COL1) WHERE COL2='A', COUNT(DISTINCT COL1) 결과?
​
데이터: (1,A),(2,B),(3,C),(4,D),(1,A),(2,B),(3,A)
① 2, 3
② 3, 3
③ 3, 4
④ 4, 4

정답: ③

■ 문제 12. 주어진 결과와 다른 JOIN은?
​
① INNER JOIN
② LEFT OUTER JOIN
③ RIGHT OUTER JOIN
④ FULL OUTER JOIN

정답: ④

■ 문제 13. 결과가 다른 것은?
​
① COL3 >= 200 AND COL4 <= 200
② NOT (200 < COL3 OR 200 > COL4)
③ 200 BETWEEN COL3 AND COL4
④ COL3 <= 200 AND COL4 >= 200

정답: ①
①만 조건이 반대.

■ 문제 14. MAX KEEP(DENSE_RANK FIRST ORDER BY COL1) 결과?
​
데이터: (1,10),(1,20),(2,30),(3,40),(3,50)
① 10
② 20
③ 40
④ 60

정답: ②
FIRST=COL1 최소 그룹(1). MAX(10,20)=20.

■ 문제 15. COALESCE(NULL, NULL, 'S', NULL, 'QL')?
​
① S
② SQL
③ NULL
④ 에러

정답: ①

■ 문제 16. CEIL(9.36), ROUND(9.48), FLOOR(9.72)?
​
① 9, 9, 9
② 10, 9, 9
③ 9, 9, 10
④ 10, 10, 9

정답: ②

■ 문제 17. COUNT(DISTINCT 물품), COUNT(*) WHERE IN ('p', NULL)?
​
① 3, 0
② 3, 30
③ 3, 에러
④ 3, NULL

정답: ②

■ 문제 18. 교집합 연산자?
​
① UNION
② INTERSECT
③ MINUS
④ EXCEPT

정답: ②

■ 문제 19. TRUNCATE 설명으로 옳은 것은?
​
① 구조+데이터 모두 삭제
② ROLLBACK 가능
③ 특정 행만 삭제 불가능
④ DELETE보다 느림

정답: ③

■ 문제 20. SELECT COUNT(*)=4가 되려면?
​
데이터: Smith, Charlie, Alice, NULL (4행)
① WHERE COL2 LIKE '%%'
② FROM EMP (무조건)
③ WHERE COL2 LIKE '%'
④ WHERE COL2 LIKE '_%'

정답: ②

■ 문제 21. CASE COL WHEN NULL과 결과가 다른 것은?
​
① CASE COL WHEN NULL THEN -1 ELSE 0 END
② CASE WHEN COL IS NULL THEN -1 ELSE 0 END
③ DECODE(COL, NULL, -1, 0)
④ NVL2(COL, 0, -1)

정답: ①
①은 COL=NULL→항상 UNKNOWN→ELSE(0)만 반환.

■ 문제 22. 셀프조인 가능한 경우?
​
① 두 테이블 컬럼 연관
② 두 테이블 연관 없이
③ 한 테이블 컬럼 연관관계
④ 한 테이블 연관 없이

정답: ③

■ 문제 23. 조건 불일치: 일반 SELECT vs MAX?
​
① NULL, NULL
② NULL, 공집합
③ 공집합, NULL
④ 공집합, 공집합

정답: ③

■ 문제 24. REGEXP_SUBSTR('aaaaabbbb', 'a{2,4}')?
​
① aaa
② aaaa
③ ab
④ aab

정답: ②

■ 문제 25. 중복 포함 합치는 연산자?
​
① UNION
② UNION ALL
③ INTERSECT
④ MINUS

정답: ②

■ 문제 26. ORDER BY에서 DESC 누락 수정?
​
① SELECT절
② WHERE절
③ GROUP BY절
④ ORDER BY절

정답: ④

■ 문제 27. ROLLBACK 설명으로 옳지 않은 것은?
​
① 변경사항 취소
② SP로 특정 지점까지 가능
③ COMMIT 이전으로 롤백 가능
④ DML 결과 원복

정답: ③

■ 문제 28. SQL 연산 순서?
​
① SELECT-FROM-WHERE-GROUP BY-HAVING-ORDER BY
② WHERE-FROM-HAVING-GROUP BY-SELECT-ORDER BY
③ FROM-WHERE-GROUP BY-HAVING-SELECT-ORDER BY
④ FROM-WHERE-HAVING-GROUP BY-SELECT-ORDER BY

정답: ③

■ 문제 29. 동순위 후 순차 등수 함수?
​
① DENSE_RANK()
② RANK()
③ PERCENT_RANK()
④ ROW_NUMBER()

정답: ①

■ 문제 30. All or Nothing 트랜잭션 특성?
​
① 원자성
② 고립성
③ 일관성
④ 지속성

정답: ①

■ 문제 31. NOT IN에 NULL 포함 시?
​
TAB1:(A,10),(B,20),(C,30) / TAB2:(A,20),(B,20),(C,NULL)
① 0
② 10
③ 20
④ 40

정답: ①

■ 문제 32. MAX(NULL)이 NULL이므로 SET COL1=NULL과 동일?
​
① MAX(COL2) 서브쿼리
② COALESCE(MAX(NULL),0)
③ MAX(0) 서브쿼리
④ UPDATE SET COL1=NULL

정답: ④

■ 문제 33. 관리자-차상위관리자 출력 조인?
​
① LEFT JOIN A.EMP_ID=B.EMP_ID
② INNER JOIN A.MGR_ID=B.EMP_ID
③ LEFT JOIN A.MGR_ID=B.EMP_ID
④ LEFT JOIN A.EMP_ID=B.EMP_ID

정답: ③

■ 문제 34. 10행×10행 카테시안 곱?
​
① 10
② 20
③ 100
④ 에러

정답: ③

■ 문제 35. 동일 컬럼명 없는 NATURAL JOIN?
​
TAB1(ID,CUSTOMER) / TAB2(C_ID,PHONE)
① 0
② 3
③ 5
④ 15

정답: ④

■ 문제 36. COUNT(DISTINCT COL1) WHERE COL2<=20?
​
데이터: (A,10),(A,20),(B,20),(C,30)
① 2 ✓
② 3
③ GROUP BY 결과
④ GROUP BY 결과

정답: ①

■ 문제 37. 외래키 제약조건 설명으로 옳은 것은?
​
① PK는 한 컬럼에 하나만
② FK는 여러 개 가능
③ UNIQUE는 NULL 불허
④ FK는 하나만

정답: ②

■ 문제 38. 패턴 시작 위치를 정수로 반환하는 함수?
​
① REGEXP_COUNT
② REGEXP_LIKE
③ REGEXP_REPLACE
④ REGEXP_INSTR

정답: ④

■ 문제 39. 부서에 소속되지 않은 사원 처리?
​
(INNER JOIN 부서.부서ID = 사원.부서ID AND 등급>=2)
① 2등급 이상 모두 출력
② 부서 미소속 사원 제외
③ 1등급도 포함
④ 모든 사원

정답: ②
INNER JOIN이므로 미소속 사원 제외.

■ 문제 40. ORDER BY DESC 누락 수정?
​
① SELECT절
② FROM절
③ WHERE절
④ ORDER BY에 DESC 추가

정답: ④

■ 문제 41. grouping 문제: ROLLUP()?
​
① GROUP BY
② ROLLUP()
③ CUBE()
④ GROUPING SETS()

정답: ②

■ 문제 42. grouping 문제: CUBE()?
​
① GROUP BY
② ROLLUP()
③ GROUPING SETS()
④ CUBE()

정답: ④

■ 문제 43. SAVEPOINT 후 결과?
​
INSERT 3건→SP1→UPDATE COL1=4(COL2<=2)→SP2→DELETE(COL2=2)→ROLLBACK TO SP2→INSERT(4,1)→COMMIT
COUNT(*) WHERE COL1=4?
① 1
② 2
③ 3
④ 4

정답: ③

■ 문제 44~50. (복원 불완전 문제들)
​

문제	핵심 개념	정답
44	조건 불일치 시 NULL UPDATE	④
45	쿼리 결과값	③ 2975
46	GROUPING SETS	②
47	ORDER BY DESC 추가	④
48	ROLLUP	②
49	CUBE	④
50	SAVEPOINT + ROLLBACK	③
■■■ 제57회 SQLD ■■■
【1과목: 데이터 모델링의 이해】
■ 문제 1. 논리적 데이터 모델링 설명으로 적절한 것은?
① 물리적 성능을 고려
② Key, 속성, 관계를 정확히 표현하고 정규화 수행
③ 추상화 수준이 가장 높음
④ 테이블스페이스, 인덱스 설계

정답: ②

■ 문제 2. 엔터티 설명으로 적절하지 않은 것은?
① 업무에서 관리해야 하는 데이터 집합
② 반드시 2개 이상의 인스턴스
③ 반드시 속성 보유
④ 하나의 인스턴스만 가져도 된다

정답: ④
엔터티는 반드시 2개 이상의 인스턴스를 가져야 한다.

■ 문제 3. 설계 속성 설명으로 적절한 것은?
① 업무에서 자연 발생하는 속성
② 다른 속성에서 계산으로 도출
③ 설계자가 새로 만든 속성
④ 다른 엔터티에서 상속

정답: ③

■ 문제 4. 반정규화 설명으로 적절하지 않은 것은?
① 성능 향상 위해 중복 허용
② 조인 횟수 감소로 조회 성능 향상
③ 반정규화하면 데이터 일관성이 항상 보장
④ 정규화 이후에 수행

정답: ③
반정규화는 데이터 중복을 허용하므로 오히려 일관성이 저하될 수 있다.

■ 문제 5. 주식별자 선정 기준으로 적절하지 않은 것은?
① 유일성
② 최소성
③ 불변성
④ 가변성

정답: ④

■ 문제 6. 제3정규형 설명으로 적절한 것은?
① 원자값
② 부분 함수 종속 제거
③ 이행 함수 종속 제거
④ 결정자가 후보키 아닌 종속 제거

정답: ③

■ 문제 7. 관계 표현 시 부모가 반드시 가져야 하는 것은?
① 외래키
② 주식별자
③ 파생 속성
④ 인조식별자

정답: ②

■ 문제 8. 데이터 모델링 3단계 순서?
① 물리→논리→개념
② 논리→개념→물리
③ 개념→논리→물리
④ 물리→개념→논리

정답: ③

■ 문제 9. 비식별자 관계에서 자식 엔터티 특징?
① 부모에 완전 종속
② 부모 없이 존재 불가
③ 부모 PK가 자식 PK에 포함
④ 독립적으로 존재 가능

정답: ④

■ 문제 10. 속성 설명으로 적절하지 않은 것은?
① 기본 속성=업무 자연 발생
② 설계 속성=설계자가 생성
③ 파생 속성=다른 속성에서 도출
④ 파생 속성이 많을수록 좋다

정답: ④

【2과목: SQL 기본 및 활용】
■ 문제 11. DDL 설명으로 적절하지 않은 것은?
① CREATE=객체 생성
② ALTER=객체 변경
③ DROP=객체 삭제
④ DDL은 ROLLBACK으로 취소 가능

정답: ④
DDL은 Auto Commit이므로 ROLLBACK 불가.

■ 문제 12. IN 연산자 설명으로 적절한 것은?
① 단일값만 비교
② 서브쿼리 결과와 비교 가능
③ NULL과 비교 가능
④ BETWEEN과 동일

정답: ②

■ 문제 13. SUM에서 NULL 처리?
① NULL→0 치환
② NULL 행 제외하고 합산
③ NULL 하나라도 있으면 결과 NULL
④ NULL 포함 합산

정답: ②

■ 문제 14. 스칼라 서브쿼리 설명으로 적절한 것은?
① SELECT절에서 여러 행 반환 가능
② SELECT절에서 반드시 하나의 값만 반환
③ WHERE절에서만 사용
④ FROM절 인라인 뷰

정답: ②

■ 문제 15. OUTER JOIN에서 (+) 기호 설명으로 적절한 것은?
① (+)는 데이터가 많은 쪽에 표시
② (+)는 데이터가 부족한(NULL이 생기는) 쪽에 표시
③ (+)는 양쪽 모두에 표시
④ (+)는 INNER JOIN에서 사용

정답: ②

■ 문제 16. GROUP BY에서 집계함수 사용 시 적절하지 않은 것은?
① SELECT에 집계함수와 GROUP BY 컬럼만 올 수 있다
② HAVING에서 집계함수로 필터링 가능
③ WHERE에서 집계함수를 사용할 수 있다
④ ORDER BY에서 집계함수 사용 가능

정답: ③
WHERE절에서는 집계함수를 사용할 수 없다.

■ 문제 17. DECODE 함수에서 NULL 비교 특수성?
① DECODE에서 NULL=NULL은 FALSE
② DECODE에서 NULL=NULL은 TRUE
③ DECODE는 NULL을 무시
④ DECODE는 NVL과 동일

정답: ②
DECODE는 특수하게 NULL=NULL을 TRUE로 처리한다.

■ 문제 18. PIVOT의 역할?
① 열→행 변환
② 행→열 변환
③ 중복 제거
④ 집계 없이 변환

정답: ②

■ 문제 19. 다중행 서브쿼리 연산자가 아닌 것은?
① IN
② ANY
③ ALL
④ =

정답: ④
= 은 단일행 연산자. 다중행 연산자: IN, ANY, ALL, EXISTS.

■ 문제 20. HAVING절 설명으로 적절한 것은?
① GROUP BY 없이 단독 사용 가능
② WHERE 전에 실행된다
③ 집계 결과에 대한 조건 필터링
④ 단일행 함수만 사용 가능

정답: ③

■ 문제 21. VARCHAR2와 CHAR 비교 시 적절한 것은?
① VARCHAR2는 고정 길이
② CHAR는 가변 길이
③ CHAR는 빈 공간을 공백으로 채운다
④ VARCHAR2와 CHAR의 비교 결과는 항상 동일

정답: ③

■ 문제 22. TCL(트랜잭션 제어어)에 해당하는 것은?
① CREATE, DROP
② INSERT, DELETE
③ GRANT, REVOKE
④ COMMIT, ROLLBACK, SAVEPOINT

정답: ④

■ 문제 23. 서브쿼리 위치에 따른 분류가 아닌 것은?
① 스칼라 서브쿼리 (SELECT절)
② 인라인 뷰 (FROM절)
③ 중첩 서브쿼리 (WHERE절)
④ 조인 서브쿼리 (JOIN절)

정답: ④
서브쿼리 분류: 스칼라(SELECT), 인라인뷰(FROM), 중첩(WHERE).

■ 문제 24. GRANT와 REVOKE 설명으로 적절한 것은?
① GRANT는 권한 회수
② REVOKE는 권한 부여
③ GRANT는 권한 부여, REVOKE는 권한 회수
④ 둘 다 DML이다

정답: ③

■ 문제 25. NVL2(expr1, expr2, expr3) 설명?
① expr1이 NULL이면 expr2 반환
② expr1이 NOT NULL이면 expr2, NULL이면 expr3 반환
③ 세 값 중 NULL이 아닌 첫 번째 반환
④ expr1과 expr2가 같으면 NULL 반환

정답: ②

■ 문제 26. WINDOW FUNCTION에서 PARTITION BY 설명?
① 전체 데이터에 대해 연산
② 지정 컬럼 기준으로 그룹을 나눠 각 그룹별 연산
③ ORDER BY와 동일
④ HAVING과 동일

정답: ②

■ 문제 27. EXISTS 서브쿼리의 SELECT절에 적절한 것은?
① SELECT * FROM ...
② SELECT 1 FROM ...
③ SELECT 컬럼명 FROM ...
④ 위 모두 가능 (반환값이 아닌 존재 여부만 확인)

정답: ④
EXISTS는 행의 존재 여부만 확인하므로 SELECT절의 내용은 무관.

■ 문제 28. 인라인 뷰(Inline View) 설명?
① SELECT절에서 사용
② FROM절에서 서브쿼리를 테이블처럼 사용
③ WHERE절에서만 사용
④ HAVING절에서 사용

정답: ②

■ 문제 29. FETCH FIRST N ROWS ONLY 설명으로 적절한 것은?
① Oracle 전용 문법
② SQL 표준으로 상위 N건을 제한
③ ROWNUM과 동일하게 정렬 전 적용
④ ORDER BY 없이도 정확한 Top-N 보장

정답: ②

■ 문제 30. 계층형 쿼리에서 LEVEL 가상 컬럼?
① 정렬 순서를 나타낸다
② 각 행의 계층 깊이를 나타낸다
③ ROWNUM과 동일
④ 파티션 번호를 나타낸다

정답: ②

■ 문제 31. RATIO_TO_REPORT 함수?
① 순위를 반환
② 파티션 내 합 대비 각 행 값의 비율
③ 누적 백분율
④ n개 그룹 분할

정답: ②

■ 문제 32. 상관(Correlated) 서브쿼리 특징?
① 메인쿼리와 무관하게 독립 실행
② 메인쿼리의 컬럼을 참조하며 행마다 반복 실행
③ 한 번만 실행되어 결과를 캐싱
④ FROM절에서만 사용 가능

정답: ②

■ 문제 33. CROSS JOIN 설명?
① 조인 조건 없이 카테시안 곱 생성
② INNER JOIN과 동일
③ NULL 행을 포함하는 조인
④ 셀프조인의 다른 이름

정답: ①

■ 문제 34. NTILE(4) 함수 설명?
① 4개 행만 반환
② 데이터를 4개 그룹으로 균등 분할하여 그룹 번호 부여
③ 상위 4순위만 반환
④ 4번째 값을 반환

정답: ②

■ 문제 35. 집합 연산자에서 컬럼 수가 다를 때?
① 자동으로 NULL로 채움
② 에러 발생
③ 적은 쪽에 맞춤
④ 많은 쪽에 맞춤

정답: ②
각 SELECT의 컬럼 수와 데이터 타입이 일치해야 한다.

■ 문제 36. LEAD 함수?
① 현재 행 이전 값
② 현재 행 이후 값
③ 파티션 첫 번째 값
④ 파티션 마지막 값

정답: ②

■ 문제 37. 뷰(VIEW) 변경 명령어?
① ALTER VIEW
② CREATE OR REPLACE VIEW
③ MODIFY VIEW
④ UPDATE VIEW

정답: ②

■ 문제 38. FIRST_VALUE / LAST_VALUE 함수?
① 정렬 후 첫 번째/마지막 행의 값 반환
② 최소값/최대값 반환
③ NULL 첫 번째/마지막 반환
④ RANK와 동일

정답: ①

■ 문제 39. 다중 테이블 INSERT에 대한 설명?
① 한 번에 하나의 테이블에만 INSERT 가능
② INSERT ALL로 여러 테이블에 동시 INSERT 가능
③ INSERT SELECT만 가능
④ VALUES 절에서만 가능

정답: ②

■ 문제 40. ROLLUP(A, B, C)이 생성하는 소계 수?
① 3개
② 4개
③ 7개
④ 8개

정답: ②
ROLLUP(A,B,C): (A,B,C), (A,B), (A), () → 4개 그룹.

■ 문제 41. 데이터 사전(Data Dictionary) 설명?
① 사용자가 직접 수정 가능
② DB의 메타데이터를 저장하는 시스템 테이블
③ DML로 변경 가능
④ 인덱스를 저장하는 공간

정답: ②

■ 문제 42. TRIM 함수 설명?
① 왼쪽만 제거
② 오른쪽만 제거
③ 양쪽의 지정 문자를 제거 (기본: 공백)
④ 중간 문자를 제거

정답: ③

■ 문제 43. CUBE(A, B)가 생성하는 그룹 수?
① 2개
② 3개
③ 4개
④ 8개

정답: ③
CUBE(A,B): (A,B), (A), (B), () → 4개 (2^2).

■ 문제 44. NULL 포함 ORDER BY ASC 기본 동작? (SQL Server)
① NULLS FIRST
② NULLS LAST
③ NULL 제외
④ 에러

정답: ①
SQL Server에서 ASC 시 NULL은 가장 작은 값으로 취급 → 먼저 출력.

■ 문제 45. DELETE와 TRUNCATE 차이 중 적절하지 않은 것은?
① DELETE는 DML, TRUNCATE는 DDL
② DELETE는 ROLLBACK 가능, TRUNCATE는 불가
③ DELETE는 WHERE 가능, TRUNCATE는 불가
④ DELETE와 TRUNCATE 모두 테이블 구조를 삭제한다

정답: ④
둘 다 구조는 유지하고 데이터만 삭제. 구조 삭제는 DROP.

■ 문제 46. 서브쿼리에서 ORDER BY 사용 제한?
① 어디서든 사용 가능
② 인라인 뷰(FROM절)에서만 사용 가능
③ 스칼라 서브쿼리에서 사용 가능
④ WHERE절 서브쿼리에서 사용 가능

정답: ②
일반적으로 서브쿼리에서 ORDER BY는 인라인 뷰(FROM절)에서만 사용 가능.

■ 문제 47. 비교 연산에서 NULL 결과?
100 > NULL / NULL = NULL / NULL != NULL
① TRUE, FALSE, TRUE
② UNKNOWN, UNKNOWN, UNKNOWN
③ FALSE, TRUE, FALSE
④ 에러, 에러, 에러

정답: ②
NULL과의 모든 비교는 UNKNOWN.

■ 문제 48. EXCEPT와 NOT IN의 차이?
① 완전히 동일
② EXCEPT는 중복 제거, NOT IN은 중복 유지
③ EXCEPT는 NULL 행도 처리, NOT IN은 NULL 포함 시 문제
④ NOT IN이 더 빠름

정답: ③
NOT IN에 NULL 포함 시 결과가 0건이 되지만, EXCEPT는 정상 동작.

■ 문제 49. ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW 의미?
① 파티션 처음부터 현재 행까지
② 현재 행부터 파티션 끝까지
③ 현재 행 전후 1행
④ 전체 파티션

정답: ①

■ 문제 50. INDEX에 대한 설명으로 적절하지 않은 것은?
① 조회 성능을 향상시킨다
② DML 성능은 저하될 수 있다
③ 모든 컬럼에 인덱스를 생성하면 좋다
④ B-Tree 인덱스가 가장 일반적이다

정답: ③
과도한 인덱스는 DML 성능을 저하시킨다. 필요한 컬럼에만 생성해야 한다.

