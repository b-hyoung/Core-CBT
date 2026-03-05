'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';

const sessions = [
  {
    id: 'aiprompt-2-1',
    round: '2급 1회',
    description: 'AI 프롬프트엔지니어링 2급 객관식 20문항',
  },
];

export default function AiPromptSelectionPage() {
  useEffect(() => {
    trackEvent('visit_test', { path: '/aiprompt', sessionId: 'aiprompt-index' });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-rose-200 bg-white/90 p-6 shadow-sm md:p-8">
          <Link
            href="/exam"
            className="mb-5 inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            시험 종류 선택으로 돌아가기
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-700">AI 프롬프트엔지니어링</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                2급 회차 선택
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
                프롬프트 작성 원칙, Few-shot, RAG, 보안, 운영 개선 루프 기초를 중심으로 구성된 문제 세트입니다.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-900">AI 프롬프트엔지니어링 2급</h2>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
              {sessions.length}개 회차
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/test/${session.id}`}
                className="group rounded-2xl border border-rose-200 bg-gradient-to-br from-white to-rose-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-400 hover:shadow-md"
              >
                <p className="text-xs font-bold text-rose-700">AI Prompt Engineering</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">{session.round}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{session.description}</p>
                <div className="mt-4 inline-flex items-center text-sm font-bold text-slate-800">
                  모의시험 시작
                  <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
