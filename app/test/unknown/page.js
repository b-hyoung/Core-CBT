'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Quiz from '../[sessionId]/Quiz';
import { readUnknownProblems } from '@/lib/unknownProblemsStore';

const SESSION_LABELS = {
  '1': '2024-1',
  '2': '2024-2',
  '3': '2024-3',
  '4': '2024-2',
  '5': '2024-3',
  '6': '2023-1',
  '7': '2023-2',
  '8': '2023-3',
  '9': '2022-1',
  '10': '2022-2',
  '11': '2022-3',
  '12': 'NOW-60',
  '100': '100',
};

function sectionTitleOf(newNo) {
  if (newNo >= 1 && newNo <= 20) return '정보시스템 기반 기술';
  if (newNo >= 21 && newNo <= 40) return '프로그래밍 언어 활용';
  return '데이터베이스의 활용';
}

export default function UnknownRetryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizData, setQuizData] = useState(null);
  const [unknownItems, setUnknownItems] = useState([]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = readUnknownProblems();
        if (!alive) return;
        setUnknownItems(list);

        if (!list.length) {
          setQuizData({ problems: [], answersMap: {}, commentsMap: {} });
          setLoading(false);
          return;
        }

        const results = await Promise.all(
          list.map(async (it) => {
            const qs = new URLSearchParams({
              sessionId: String(it.sourceSessionId),
              problemNumber: String(it.sourceProblemNumber),
            });
            const res = await fetch(`/api/admin/problem?${qs.toString()}`, { cache: 'no-store' });
            if (!res.ok) {
              return { ok: false, item: it };
            }
            const data = await res.json();
            return { ok: true, item: it, data };
          })
        );

        const loaded = results.filter((r) => r.ok && r.data);
        if (!alive) return;

        const problems = [];
        const answersMap = {};
        const commentsMap = {};

        loaded.forEach((r, idx) => {
          const newNo = idx + 1;
          const srcLabel = r.item.sourceKey || SESSION_LABELS[String(r.item.sourceSessionId)] || String(r.item.sourceSessionId);
          problems.push({
            problem_number: newNo,
            question_text: `[모르겠어요][${srcLabel}] ${String(r.data.questionText || '')}`,
            options: Array.isArray(r.data.options) ? r.data.options : [],
            examples: r.data.examples ?? null,
            sectionTitle: sectionTitleOf(newNo),
            originSessionId: String(r.item.sourceSessionId),
            originProblemNumber: Number(r.item.sourceProblemNumber),
            originSourceKey: srcLabel,
          });
          answersMap[newNo] = String(r.data.answerText || '');
          commentsMap[newNo] = String(r.data.commentText || '');
        });

        setQuizData({ problems, answersMap, commentsMap });
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const session = useMemo(
    () => ({ title: `모르겠어요 다시 풀기 (${unknownItems.length}문제)` }),
    [unknownItems.length]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-gray-700">
        모르겠어요 문제를 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
          <p className="font-semibold text-red-600 mb-2">모르겠어요 재풀이 로드 실패</p>
          <p className="text-sm text-gray-700 mb-4">{error}</p>
          <Link href="/test" className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-white font-bold">
            회차 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!quizData?.problems?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center max-w-lg w-full">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">모르겠어요 다시 풀기</h1>
          <p className="text-gray-600 mb-6">현재 저장된 문제가 없습니다. 문제를 풀다가 `모르겠어요`를 누르면 여기에 모입니다.</p>
          <Link href="/test" className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-white font-bold">
            회차 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Quiz
      problems={quizData.problems}
      answersMap={quizData.answersMap}
      commentsMap={quizData.commentsMap}
      session={session}
      sessionId="unknown"
    />
  );
}

