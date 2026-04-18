'use client';

import PracticalQuiz from './PracticalQuiz';

function normalizeInputType(inputType) {
  const value = String(inputType || 'single').trim();
  if (
    value === 'single' ||
    value === 'unordered_symbol_set' ||
    value === 'ordered_sequence' ||
    value === 'multi_blank' ||
    value === 'textarea'
  ) {
    return value;
  }
  // Legacy fallback
  if (value === 'sequence') return 'ordered_sequence';
  return 'single';
}

function normalizeProblem(problem) {
  const inputLabels = Array.isArray(problem?.input_labels)
    ? problem.input_labels.map((label) => String(label ?? '').trim()).filter(Boolean)
    : undefined;

  const acceptedAnswers = Array.isArray(problem?.accepted_answers)
    ? problem.accepted_answers.map((v) => String(v ?? '').trim()).filter(Boolean)
    : [];

  return {
    ...problem,
    input_type: normalizeInputType(problem?.input_type),
    ...(inputLabels ? { input_labels: inputLabels } : {}),
    accepted_answers: acceptedAnswers,
  };
}

export default function PracticalQuizV2(props) {
  const normalizedProblems = Array.isArray(props?.problems)
    ? props.problems.map(normalizeProblem)
    : [];

  return <PracticalQuiz {...props} problems={normalizedProblems} />;
}
