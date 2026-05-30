// app/admin/edits/AdminEditQueueClient.js
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_STYLES = {
  pending: { dot: 'bg-slate-400', label: 'pending', text: 'text-slate-600 dark:text-slate-300' },
  approved: { dot: 'bg-sky-500', label: 'approved', text: 'text-sky-700 dark:text-sky-300' },
  rejected: { dot: 'bg-rose-500', label: 'rejected', text: 'text-rose-700 dark:text-rose-300' },
  merged: { dot: 'bg-emerald-500', label: 'merged', text: 'text-emerald-700 dark:text-emerald-300' },
};

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function AdminEditQueueClient() {
  const [edits, setEdits] = useState([]);
  const [roundReadyCount, setRoundReadyCount] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);
  const [finalComment, setFinalComment] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const reload = useCallback(async () => {
    const url = filter === 'all' ? '/api/admin/edits' : `/api/admin/edits?status=${filter}`;
    const data = await fetch(url, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
    if (data?.ok) {
      setEdits(data.edits || []);
      setRoundReadyCount(data.roundReadyCount || 0);
    }
  }, [filter]);

  useEffect(() => { reload(); }, [reload]);

  // ?focus=<id> 딥링크 처리 — Discord "사이트에서 편집" 버튼에서 진입 시
  // 해당 항목이 자동 선택되도록. URL의 focus 값을 한 번 읽고 history.replaceState 로 제거.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const focusId = params.get('focus');
    if (!focusId) return;
    setSelectedId(focusId);
    // focus가 status filter에 안 보이는 항목일 수도 있으니 'all'로 전환
    setFilter('all');
    // URL 정리
    params.delete('focus');
    const next = params.toString();
    window.history.replaceState(null, '', next ? `?${next}` : window.location.pathname);
  }, []);

  const selected = useMemo(() => edits.find((e) => e.id === selectedId) || null, [edits, selectedId]);
  useEffect(() => { setFinalComment(''); setAdminNote(''); }, [selectedId]);

  async function decide(action) {
    if (!selected) return;
    setBusy(true);
    const body = { action };
    if (action === 'approve' && finalComment.trim().length >= 10) body.finalComment = finalComment.trim();
    if (action === 'reject' && adminNote.trim()) body.adminNote = adminNote.trim();
    const res = await fetch(`/api/admin/edits/${selected.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data?.ok) {
      setToast(action === 'approve' ? '승인됨' : '거부됨');
      setSelectedId(null);
      await reload();
    } else {
      setToast(`실패: ${data?.message || res.status}`);
    }
    setTimeout(() => setToast(''), 2000);
  }

  async function createRoundPr() {
    if (roundReadyCount === 0) return;
    if (!confirm(`${roundReadyCount}건을 묶어 PR을 생성합니다. 머지는 GitHub에서 진행해주세요. 진행할까요?`)) return;
    setBusy(true);
    const res = await fetch('/api/admin/edits/round', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data?.ok) {
      setToast('PR 생성됨');
      if (data.prUrl) window.open(data.prUrl, '_blank', 'noopener');
      await reload();
    } else {
      setToast(`PR 실패: ${data?.message || res.status}`);
    }
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[1.75rem] font-semibold text-slate-900 dark:text-slate-100">해설 수정 큐</h1>
        <button
          type="button"
          onClick={createRoundPr}
          disabled={roundReadyCount === 0 || busy}
          className={
            roundReadyCount === 0
              ? 'rounded-lg border border-dashed border-[color:var(--theme-border)] px-4 py-2 text-[0.875rem] text-slate-400'
              : 'rounded-lg bg-sky-600 px-4 py-2 text-[0.875rem] font-medium text-white transition-colors hover:bg-sky-700'
          }
        >
          이번 라운드 PR 생성 · {roundReadyCount}건
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {['pending', 'approved', 'rejected', 'merged', 'all'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-[color:var(--theme-border)] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-1.5">
          {edits.length === 0 && (
            <p className="rounded-lg border border-dashed border-[color:var(--theme-border)] px-4 py-6 text-center text-[0.875rem] text-slate-500 dark:text-slate-400">
              처리할 요청이 없어요
            </p>
          )}
          {edits.map((e) => {
            const isSel = e.id === selectedId;
            const s = STATUS_STYLES[e.status] || STATUS_STYLES.pending;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSel
                    ? 'border-l-2 border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                    : 'border-[color:var(--theme-border)] hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.875rem] font-medium text-slate-900 dark:text-slate-100">
                    {e.subject} {e.sessionKey} · {e.problemNumber}번
                  </span>
                  <span className={`flex items-center gap-1 text-[0.75rem] ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[0.75rem] text-slate-500 dark:text-slate-400">
                  {e.isAnonymous ? '익명' : e.editorDisplayName} · {relativeTime(e.createdAt)}
                </p>
              </button>
            );
          })}
        </aside>

        <section>
          {!selected && (
            <div className="rounded-lg border border-dashed border-[color:var(--theme-border)] px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              좌측에서 항목을 선택하세요.
            </div>
          )}
          {selected && (
            <div className="space-y-5 rounded-lg border border-[color:var(--theme-border)] p-5">
              <div>
                <h2 className="text-[1.125rem] font-semibold text-slate-900 dark:text-slate-100">
                  {selected.subject} {selected.sessionKey} · {selected.problemNumber}번
                </h2>
                <p className="mt-0.5 text-[0.8125rem] text-slate-500 dark:text-slate-400">
                  제출자: {selected.isAnonymous ? '익명' : selected.editorDisplayName} · {relativeTime(selected.createdAt)}
                </p>
              </div>

              <div>
                <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">원본</p>
                <div className="rounded-md bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selected.originalComment || <span className="text-slate-400">(없음)</span>}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">제안</p>
                <div className="rounded-md bg-[var(--surface-muted)] px-4 py-3 text-[0.9375rem] whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selected.proposedComment}
                </div>
              </div>

              {selected.status === 'pending' && !selected.discordMessageId && (
                <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <span>⚠️ Discord 알림이 발송되지 않았어요 (webhook 실패)</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const res = await fetch(`/api/admin/edits/${selected.id}/resend-notify`, { method: 'POST' });
                      const data = await res.json().catch(() => ({}));
                      setBusy(false);
                      if (data?.ok) {
                        setToast('Discord 재전송 완료');
                        await reload();
                      } else {
                        setToast(`재전송 실패: ${data?.message || res.status}`);
                      }
                      setTimeout(() => setToast(''), 2500);
                    }}
                    className="rounded border border-amber-300 bg-white px-2 py-1 text-[0.75rem] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  >
                    재전송
                  </button>
                </div>
              )}

              {selected.status === 'pending' && (
                <>
                  <div>
                    <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      관리자 재수정 (비우면 제안 그대로 승인)
                    </p>
                    <textarea
                      value={finalComment}
                      onChange={(e) => setFinalComment(e.target.value)}
                      rows={5}
                      placeholder="필요하면 여기서 수정한 후 '재수정 후 승인' 클릭"
                      className="w-full rounded-md border border-[color:var(--theme-border)] bg-white px-3 py-2 text-[0.9375rem] outline-none focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                      거부 사유 (optional)
                    </p>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="w-full rounded-md border border-[color:var(--theme-border)] bg-white px-3 py-2 text-[0.875rem] outline-none focus:ring-2 focus:ring-[color:var(--theme-ring)] dark:bg-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => decide('reject')}
                      disabled={busy}
                      className="rounded-md border border-rose-200 px-3 py-1.5 text-[0.875rem] font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    >
                      거부
                    </button>
                    <button
                      type="button"
                      onClick={() => decide('approve')}
                      disabled={busy || (finalComment.trim().length > 0 && finalComment.trim().length < 10)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-[0.875rem] font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {finalComment.trim().length > 0 ? '재수정 후 승인' : '그대로 승인'}
                    </button>
                  </div>
                </>
              )}

              {selected.status === 'approved' && selected.prNumber == null && (
                <p className="rounded-md bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                  다음 라운드 PR에 포함됩니다.
                </p>
              )}
              {selected.prNumber != null && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  PR #{selected.prNumber} 포함됨. {selected.status === 'merged' ? '머지 완료.' : '머지 대기.'}
                </p>
              )}
              {selected.prNumber != null && selected.status === 'approved' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const res = await fetch(`/api/admin/edits/${selected.id}/mark-merged`, { method: 'POST' });
                      const data = await res.json().catch(() => ({}));
                      setBusy(false);
                      if (data?.ok) {
                        setToast('머지 완료 처리됨');
                        setSelectedId(null);
                        await reload();
                      } else {
                        setToast(`실패: ${data?.message || res.status}`);
                      }
                      setTimeout(() => setToast(''), 2000);
                    }}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-[0.875rem] font-medium text-white hover:bg-emerald-700"
                  >
                    GitHub에서 머지 완료 → 머지 처리
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-slate-900 px-4 py-2 text-[0.875rem] text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
          {toast}
        </div>
      )}
    </div>
  );
}
