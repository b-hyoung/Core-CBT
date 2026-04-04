import { renderObjectivePersonalReviewPage } from '@/lib/objectivePersonalReviewPage';

export const dynamic = 'force-dynamic';

export default async function AiPromptMyWrongPage(props) {
  return renderObjectivePersonalReviewPage({
    ...props,
    examType: 'aiprompt',
    reviewType: 'wrong',
    routeSessionId: 'aiprompt-my-wrong',
    backHref: '/aiprompt',
    quizTitle: 'AI 프롬프트엔지니어링 오답 다시 풀기',
    emptyTitle: 'AI 프롬프트엔지니어링 오답 모아보기',
    emptyDescription: '아직 AI 프롬프트엔지니어링 오답 기록이 없습니다. 문제를 풀면 자동으로 쌓입니다.',
  });
}
