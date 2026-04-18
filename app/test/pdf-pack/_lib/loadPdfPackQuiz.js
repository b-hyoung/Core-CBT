import fs from 'fs/promises';
import path from 'path';
import { getPdfPackConfig } from './pdfPackCatalog';

const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');

export async function loadPdfPackFiles(slug) {
  const basePath = path.join(process.cwd(), 'datasets', 'pdfPacks', String(slug));
  const [problemStr, answerStr, commentStr, metaStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'meta.json'), 'utf8'),
  ]);

  return {
    basePath,
    problemData: JSON.parse(stripBom(problemStr)),
    answerData: JSON.parse(stripBom(answerStr)),
    commentData: JSON.parse(stripBom(commentStr)),
    meta: JSON.parse(stripBom(metaStr)),
  };
}

export async function buildPdfPackQuiz(slug) {
  const { problemData, answerData, commentData, meta } = await loadPdfPackFiles(slug);
  const cfg = getPdfPackConfig(slug);
  const displayTitle = cfg?.title || meta?.title || `문제 세트 (${slug})`;

  const problems = problemData.flatMap((section) =>
    (section.problems || []).map((p) => ({
      ...p,
      sectionTitle: section.title,
      originSessionId: `pdfpack-${slug}`,
      originProblemNumber: Number(p.problem_number),
      originSourceKey: displayTitle,
    }))
  );

  const answersMap = answerData.reduce((acc, section) => {
    (section.answers || []).forEach((a) => {
      acc[a.problem_number] = a.correct_answer_text ?? '';
    });
    return acc;
  }, {});

  const commentsMap = commentData.reduce((acc, section) => {
    (section.comments || []).forEach((c) => {
      acc[c.problem_number] = c.comment ?? c.comment_text ?? '';
    });
    return acc;
  }, {});

  return {
    meta,
    problems,
    answersMap,
    commentsMap,
    session: {
      title: displayTitle,
      reviewOnly: Boolean(cfg?.reviewOnly),
      lobbySubtitle: `총 ${problems.length}문항`,
    },
  };
}
