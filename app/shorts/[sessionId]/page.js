// app/shorts/[sessionId]/page.js
import fs from 'fs/promises';
import path from 'path';
import { OBJECTIVE_SESSION_CONFIG } from '@/lib/objectiveSessionCatalog';
import { notFound } from 'next/navigation';
import ShortsPlayer from './ShortsPlayer';

export const dynamic = 'force-dynamic';

const stripBom = (v) => String(v || '').replace(/^﻿/, '');

async function loadShortsData(sessionId) {
  const config = OBJECTIVE_SESSION_CONFIG[sessionId];
  if (!config) return null;

  const basePath = path.join(process.cwd(), ...config.basePath);
  const [problemStr, answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problems = [];
  for (const section of problemData || []) {
    for (const p of section?.problems || []) {
      problems.push({
        number: Number(p.problem_number),
        sectionTitle: String(section.title || ''),
        question: String(p.question_text || ''),
        options: Array.isArray(p.options) ? p.options.map(String) : [],
        examples: p.examples ? String(p.examples) : '',
      });
    }
  }

  const answersByNo = new Map();
  for (const section of answerData || []) {
    for (const a of section?.answers || []) {
      answersByNo.set(Number(a.problem_number), {
        index: Number(a.correct_answer_index),
        text: String(a.correct_answer_text || ''),
        symbol: String(a.correct_answer_symbol || ''),
      });
    }
  }

  const commentsByNo = new Map();
  for (const section of commentData || []) {
    for (const c of section?.comments || []) {
      commentsByNo.set(Number(c.problem_number), String(c.comment ?? ''));
    }
  }

  return problems.map((p) => {
    const a = answersByNo.get(p.number) || { index: -1, text: '', symbol: '' };
    return {
      ...p,
      correctIndex: a.index,
      correctText: a.text,
      correctSymbol: a.symbol,
      comment: commentsByNo.get(p.number) || '',
    };
  });
}

export default async function ShortsPage({ params }) {
  const { sessionId } = await params;
  const decoded = decodeURIComponent(sessionId);
  const data = await loadShortsData(decoded);
  if (!data || data.length === 0) notFound();

  const config = OBJECTIVE_SESSION_CONFIG[decoded];
  const title = config?.title || config?.label || decoded;

  // basePath: ['datasets', '<subject>', '<sessionKey>']
  const basePath = Array.isArray(config?.basePath) ? config.basePath : null;
  const audioBasePath = basePath && basePath.length >= 3
    ? `/audio/shorts/${basePath[1]}/${basePath[2]}`
    : '';

  return (
    <ShortsPlayer
      items={data}
      title={title}
      sessionId={decoded}
      audioBasePath={audioBasePath}
    />
  );
}
