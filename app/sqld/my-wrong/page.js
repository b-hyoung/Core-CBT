import { renderObjectivePersonalReviewPage } from '@/lib/objectivePersonalReviewPage';

export const dynamic = 'force-dynamic';

export default async function SqldMyWrongPage(props) {
  return renderObjectivePersonalReviewPage({
    ...props,
    examType: 'sqld',
    reviewType: 'wrong',
    routeSessionId: 'sqld-my-wrong',
    backHref: '/sqld',
    quizTitle: 'SQLD 오답 다시 풀기',
    emptyTitle: 'SQLD 오답 문제 모아보기',
    emptyDescription: '아직 SQLD 오답 기록이 없습니다. SQLD 문제를 풀면 자동으로 쌓입니다.',
  });
}
