import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAccess';
import { classifySessionId } from '@/lib/examType';

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
  '2024-1': ['problem2024', 'first'],
  '2024-2': ['problem2024', 'second'],
  '2024-3': ['problem2024', 'third'],
  '2023-1': ['problem2023', 'first'],
  '2023-2': ['problem2023', 'second'],
  '2023-3': ['problem2023', 'third'],
  '2022-1': ['problem2022', 'first'],
  '2022-2': ['problem2022', 'second'],
  '2022-3': ['problem2022', 'third'],
};

async function loadSessionData(sessionId) {
  if (String(sessionId).startsWith('pdfpack-')) {
    const slug = String(sessionId).slice('pdfpack-'.length);
    const rel = ['pdfPacks', slug];
    const candidateBasePaths = [
      path.join(process.cwd(), 'datasets', ...rel),
      path.join(process.cwd(), ...rel),
    ];

    let basePath = null;
    for (const candidate of candidateBasePaths) {
      try {
        await fs.access(candidate);
        basePath = candidate;
        break;
      } catch {}
    }
    if (!basePath) return null;

    const [problemStr, answerStr, commentStr] = await Promise.all([
      fs
        .readFile(path.join(basePath, 'problem1.json'), 'utf8')
        .catch(async (error) => {
          if (error?.code === 'ENOENT') {
            return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
          }
          throw error;
        }),
      fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
    ]);

    const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
    const problemData = JSON.parse(stripBom(problemStr));
    const answerData = JSON.parse(stripBom(answerStr));
    const commentData = JSON.parse(stripBom(commentStr));

    const problems = problemData.flatMap((section) =>
      (section.problems || []).map((p) => ({ ...p, sectionTitle: section.title }))
    );

    const answersMap = answerData.reduce((acc, section) => {
      (section.answers || []).forEach((a) => {
        acc[a.problem_number] = a.correct_answer_text;
      });
      return acc;
    }, {});

    const commentsMap = commentData.reduce((acc, section) => {
      (section.comments || []).forEach((c) => {
        acc[c.problem_number] = c.comment ?? c.comment_text ?? '';
      });
      return acc;
    }, {});

    return { problems, answersMap, commentsMap };
  }

  const rel = SESSION_PATHS[sessionId];
  if (!rel) return null;

  const candidateBasePaths = [
    path.join(process.cwd(), 'datasets', ...rel),
    path.join(process.cwd(), ...rel),
  ];

  let basePath = null;
  for (const candidate of candidateBasePaths) {
    try {
      await fs.access(candidate);
      basePath = candidate;
      break;
    } catch {}
  }
  if (!basePath) return null;

  const problemStr = await fs
    .readFile(path.join(basePath, 'problem1.json'), 'utf8')
    .catch(async (error) => {
      if (error?.code === 'ENOENT') {
        return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
      }
      throw error;
    });
  const [answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problems = problemData.flatMap((section) =>
    (section.problems || []).map((p) => ({ ...p, sectionTitle: section.title }))
  );

  const answersMap = answerData.reduce((acc, section) => {
    (section.answers || []).forEach((a) => {
      acc[a.problem_number] = a.correct_answer_text;
    });
    return acc;
  }, {});

  const commentsMap = commentData.reduce((acc, section) => {
    (section.comments || []).forEach((c) => {
      acc[c.problem_number] = c.comment ?? c.comment_text ?? '';
    });
    return acc;
  }, {});

  return { problems, answersMap, commentsMap };
}

export async function GET(request) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = String(searchParams.get('sessionId') || '').trim();
    const problemNumber = Number(searchParams.get('problemNumber'));

    if (!sessionId || Number.isNaN(problemNumber)) {
      return NextResponse.json({ message: 'sessionId and problemNumber are required' }, { status: 400 });
    }

    const data = await loadSessionData(sessionId);
    if (!data) {
      return NextResponse.json({ message: 'unsupported sessionId' }, { status: 400 });
    }

    const problem = data.problems.find((p) => Number(p.problem_number) === problemNumber);
    if (!problem) {
      return NextResponse.json({ message: 'problem not found' }, { status: 404 });
    }

    const problemBasePath = classifySessionId(sessionId) === 'practical' ? '/practical' : '/test';

    return NextResponse.json({
      sessionId,
      problemNumber,
      sectionTitle: problem.sectionTitle || '',
      questionText: problem.question_text || '',
      options: Array.isArray(problem.options) ? problem.options : [],
      examples: problem.examples ?? null,
      answerText: data.answersMap[problem.problem_number] ?? '',
      commentText: data.commentsMap[problem.problem_number] ?? '',
      gotoPath: `${problemBasePath}/${sessionId}?p=${problemNumber}`,
    });
  } catch {
    return NextResponse.json({ message: 'failed to load problem detail' }, { status: 500 });
  }
}
