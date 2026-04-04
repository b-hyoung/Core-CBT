import { renderObjectivePersonalReviewPage } from '@/lib/objectivePersonalReviewPage';

export const dynamic = 'force-dynamic';

export default async function SqldMyUnknownPage(props) {
  return renderObjectivePersonalReviewPage({
    ...props,
    examType: 'sqld',
    reviewType: 'unknown',
    routeSessionId: 'sqld-my-unknown',
    backHref: '/sqld',
    quizTitle: 'SQLD 모르겠어요 다시 풀기',
    emptyTitle: 'SQLD 모르겠어요 문제 모아보기',
    emptyDescription: '아직 SQLD 모르겠어요 기록이 없습니다. 문제를 풀면서 모르겠어요를 누르면 자동으로 쌓입니다.',
  });
}
