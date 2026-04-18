import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Quiz from '../[sessionId]/Quiz';
import { getUserUnknownProblems } from '@/lib/userProblemsStore';

export const dynamic = 'force-dynamic';

const SESSION_PATHS = {
  '1': ['problem2024', 'first'],
  '2': ['problem2024', 'second'],
  '3': ['problem2024', 'third'],
  '4': ['problem2024', 'second'],
  '5': ['problem2024', 'third'],
  '6': ['problem2023', 'first'],
  '7': ['problem2023', 'second'],
  '8': ['problem2023', 'third'],
  '9': ['problem2022', 'first'],
  '10': ['problem2022', 'second'],
  '11': ['problem2022', 'third'],
  '12': ['problemNow_60', 'first'],
  '100': ['problem100', 'first'],
};

const SESSION_LABELS = {
  '1': '2024-1', '2': '2024-2', '3': '2024-3',
  '4': '2024-2', '5': '2024-3',
  '6': '2023-1', '7': '2023-2', '8': '2023-3',
  '9': '2022-1', '10': '2022-2', '11': '2022-3',
  '12': 'NOW-60', '100': '100',
};

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');

async function loadSessionDataset(sessionId) {
  const sid = String(sessionId || '').trim();
  if (sid.startsWith('pdfpack-')) {
    const slug = sid.slice('pdfpack-'.length);
    const basePath = path.join(process.cwd(), 'datasets', 'pdfPacks', slug);
    const [problemStr, answerStr, commentStr] = await Promise.all([
      fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
    ]);
    return buildDatasetMaps(problemStr, answerStr, commentStr);
  }
  const rel = SESSION_PATHS[sid];
  if (!rel) return null;
  const basePath = path.join(process.cwd(), 'datasets', ...rel);
  const problemStr = await fs.readFile(path.join(basePath, 'problem1.json'), 'utf8').catch(async (e) => {
    if (e?.code === 'ENOENT') return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
    throw e;
  });
  const [answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);
  return buildDatasetMaps(problemStr, answerStr, commentStr);
}

function buildDatasetMaps(problemStr, answerStr, commentStr) {
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problemsByNo = new Map();
  for (const section of problemData || []) {
    for (const p of section?.problems || []) {
      problemsByNo.set(Number(p.problem_number), { ...p, sectionTitle: section.title });
    }
  }
  const answersByNo = new Map();
  for (const section of answerData || []) {
    for (const a of section?.answers || []) {
      answersByNo.set(Number(a.problem_number), String(a.correct_answer_text || ''));
    }
  }
  const commentsByNo = new Map();
  for (const section of commentData || []) {
    for (const c of section?.comments || []) {
      commentsByNo.set(Number(c.problem_number), String(c.comment ?? c.comment_text ?? ''));
    }
  }
  return { problemsByNo, answersByNo, commentsByNo };
}

export default async function MyUnknownQuizPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.email) redirect('/');

  const sp = (await searchParams) || {};
  const initialProblemNumber = Number.isNaN(Number(sp?.p)) ? null : Number(sp?.p);
  const shouldResume = String(sp?.resume || '') === '1';

  const userEmail = session.user.email.trim().toLowerCase();
  const unknownList = await getUserUnknownProblems(userEmail);

  const datasetCache = new Map();
  const picked = [];
  const answersMap = {};
  const commentsMap = {};

  for (const row of unknownList) {
    const sid = String(row.sourceSessionId || '');
    if (!sid || sid === 'random' || sid === 'random22' || sid === 'unknown') continue;
    try {
      if (!datasetCache.has(sid)) {
        datasetCache.set(sid, await loadSessionDataset(sid).catch(() => null));
      }
      const ds = datasetCache.get(sid);
      if (!ds) continue;
      const no = Number(row.sourceProblemNumber);
      const problem = ds.problemsByNo.get(no);
      if (!problem) continue;
      const newNo = picked.length + 1;
      picked.push({
        problem_number: newNo,
        question_text: String(problem.question_text || ''),
        options: Array.isArray(problem.options) ? problem.options : [],
        examples: problem.examples ?? null,
        sectionTitle: problem.sectionTitle || '',
        originSessionId: sid,
        originProblemNumber: no,
        originSourceKey: SESSION_LABELS[sid] || sid,
      });
      answersMap[newNo] = ds.answersByNo.get(no) ?? '';
      commentsMap[newNo] = ds.commentsByNo.get(no) ?? '';
    } catch {
      // skip
    }
  }

  if (picked.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">내 모르겠어요 문제 풀기</h1>
          <p className="text-slate-600 mb-6">아직 모르겠어요 기록이 없습니다. 시험 중 모르겠어요를 누르면 자동으로 쌓입니다.</p>
          <Link href="/test" className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700">
            회차 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Quiz
      problems={picked}
      answersMap={answersMap}
      commentsMap={commentsMap}
      session={{
        title: `내 모르겠어요 문제 풀기 (${picked.length}문제)`,
        reviewOnly: true,
        lobbySubtitle: `${session.user.name || userEmail} 님의 모르겠어요 문제 모음 / 총 ${picked.length}문항`,
      }}
      sessionId="my-unknown"
      initialProblemNumber={initialProblemNumber}
      shouldResume={shouldResume}
    />
  );
}
