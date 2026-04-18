import { renderObjectivePersonalReviewPage } from '@/lib/objectivePersonalReviewPage';

export const dynamic = 'force-dynamic';

export default async function AiPromptMyUnknownPage(props) {
  return renderObjectivePersonalReviewPage({
    ...props,
    examType: 'aiprompt',
    reviewType: 'unknown',
    routeSessionId: 'aiprompt-my-unknown',
    backHref: '/aiprompt',
    quizTitle: 'AI 프롬프트엔지니어링 모르겠어요 다시 풀기',
    emptyTitle: 'AI 프롬프트엔지니어링 모르겠어요 모아보기',
    emptyDescription: '아직 AI 프롬프트엔지니어링 모르겠어요 기록이 없습니다. 문제를 풀면서 모르겠어요를 누르면 자동으로 쌓입니다.',
  });
}
