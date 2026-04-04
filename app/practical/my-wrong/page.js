import { renderPracticalPersonalReviewPage } from '@/lib/practicalPersonalReviewPage';

export const dynamic = 'force-dynamic';

export default async function PracticalMyWrongPage(props) {
  return renderPracticalPersonalReviewPage({
    ...props,
    reviewType: 'wrong',
    routeSessionId: 'practical-my-wrong',
    quizTitle: '실기 오답 다시 풀기',
    emptyTitle: '실기 오답 문제 모아보기',
    emptyDescription: '아직 실기 오답 기록이 없습니다. 실기 문제를 풀면 자동으로 쌓입니다.',
  });
}
