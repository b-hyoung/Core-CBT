import { renderPracticalPersonalReviewPage } from '@/lib/practicalPersonalReviewPage';

export const dynamic = 'force-dynamic';

export default async function PracticalMyUnknownPage(props) {
  return renderPracticalPersonalReviewPage({
    ...props,
    reviewType: 'unknown',
    routeSessionId: 'practical-my-unknown',
    quizTitle: '실기 모르겠어요 다시 풀기',
    emptyTitle: '실기 모르겠어요 문제 모아보기',
    emptyDescription: '아직 실기 모르겠어요 기록이 없습니다. 문제를 풀면서 모르겠어요를 누르면 자동으로 쌓입니다.',
  });
}
