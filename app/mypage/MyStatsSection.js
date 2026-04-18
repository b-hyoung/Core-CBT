'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Trophy, TrendingUp, Target, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, BarChart2,
} from 'lucide-react';

/* ── 커스텀 툴팁 ── */
function ScoreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1">{d?.label || label}</p>
      <p className="text-sky-600 font-semibold">점수: {d?.score}점</p>
      {d?.isPass !== undefined && (
        <p className={d.isPass ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
          {d.isPass ? '✓ 합격' : '✗ 불합격'}
        </p>
      )}
    </div>
  );
}

function SubjectTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

/* ── KPI 카드 ── */
function KpiCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    sky: 'bg-sky-50 border-sky-100 text-sky-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
  };
  const iconBg = {
    sky: 'bg-sky-100 text-sky-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    rose: 'bg-rose-100 text-rose-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border p-5 shadow-sm ${colorMap[color]}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold text-slate-500 leading-none">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/* ── 스켈레톤 ── */
function Skeleton() {
  return (
    <section className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </section>
  );
}

/* ── 빈 상태 ── */
function EmptyStats() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 py-16 text-center mt-6">
      <BarChart2 className="h-10 w-10 text-slate-300" />
      <p className="text-sm font-bold text-slate-400">아직 완료한 시험이 없습니다.</p>
      <p className="text-xs text-slate-300">시험을 완료하면 통계가 자동으로 쌓입니다.</p>
    </div>
  );
}

const SUBJECT_COLORS = { '1과목': '#6366f1', '2과목': '#0ea5e9', '3과목': '#10b981' };
const SUBJECT_FULL_NAMES = { '1과목': '소프트웨어 설계', '2과목': '소프트웨어 개발', '3과목': '데이터베이스 구축' };

export default function MyStatsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/user/my-stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setData(json);
        else setError(json.message || '불러오기 실패');
      })
      .catch(() => setError('네트워크 오류'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-600">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }
  if (!data || data.kpi.totalExams === 0) return <EmptyStats />;

  const { kpi, history, subjectAvg, subjectTrend } = data;

  return (
    <section className="mt-6 space-y-5">
      {/* ── KPI 카드 그리드 ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={Trophy}
          label="총 시험 횟수"
          value={`${kpi.totalExams}회`}
          color="sky"
        />
        <KpiCard
          icon={CheckCircle2}
          label="합격률"
          value={`${kpi.passRate}%`}
          sub={`${kpi.passCount}/${kpi.totalExams}회 합격`}
          color="emerald"
        />
        <KpiCard
          icon={Target}
          label="평균 점수"
          value={`${kpi.avgScore}점`}
          color="violet"
        />
        <KpiCard
          icon={AlertTriangle}
          label="취약 과목"
          value={kpi.weakestSubject || '-'}
          sub={kpi.weakestRate != null ? `평균 정답률 ${kpi.weakestRate}%` : undefined}
          color="rose"
        />
      </div>

      {/* 오답/모름 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <XCircle className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">누적 틀린 문제</p>
            <p className="text-xl font-extrabold text-rose-600">{kpi.wrongTotal}<span className="text-sm font-semibold text-slate-400 ml-0.5">문제</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <HelpCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">누적 모르겠어요</p>
            <p className="text-xl font-extrabold text-amber-600">{kpi.unknownTotal}<span className="text-sm font-semibold text-slate-400 ml-0.5">문제</span></p>
          </div>
        </div>
      </div>

      {/* ── 점수 추이 라인 차트 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-sky-500" />
          <h3 className="text-sm font-extrabold text-slate-800">시험별 점수 추이</h3>
          <span className="ml-auto text-xs text-slate-400">합격선 60점</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip content={<ScoreTooltip />} />
            <ReferenceLine y={60} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
            <Line
              type="monotone"
              dataKey="score"
              name="점수"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={`dot-${payload.index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={payload.isPass ? '#10b981' : '#f43f5e'}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 2, fill: 'white' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-4 justify-center text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />합격</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-400" />불합격</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-px w-6 bg-rose-400" style={{ borderTop: '2px dashed #f43f5e' }} />합격선(60점)</span>
        </div>
      </div>

      {/* ── 과목별 평균 막대 차트 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-extrabold text-slate-800">과목별 평균 정답률</h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={subjectAvg} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              formatter={(v, n) => [`${v}%`, n]}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <ReferenceLine y={60} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="rate" name="정답률" radius={[8, 8, 0, 0]}>
              {subjectAvg.map((entry) => (
                <Cell key={entry.subject} fill={SUBJECT_COLORS[entry.subject] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {subjectAvg.map((s) => (
            <div
              key={s.subject}
              className="flex flex-col items-center gap-0.5 rounded-xl py-3 px-2"
              style={{ background: `${SUBJECT_COLORS[s.subject] || '#6366f1'}18` }}
            >
              <span className="text-[10px] font-bold" style={{ color: SUBJECT_COLORS[s.subject] || '#6366f1' }}>{s.subject}</span>
              <span className="text-[9px] font-medium text-slate-400 text-center leading-tight">{SUBJECT_FULL_NAMES[s.subject] || ''}</span>
              <span className="text-xl font-extrabold mt-1" style={{ color: SUBJECT_COLORS[s.subject] || '#6366f1' }}>
                {s.rate}%
              </span>
              <span className="text-[10px] text-slate-400">{s.correct}/{s.total}문제</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 과목별 시험별 추이 ── */}
      {subjectTrend.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-extrabold text-slate-800">과목별 회차 추이</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={subjectTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<SubjectTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
              {Object.entries(SUBJECT_COLORS).map(([subject, color]) => (
                <Line
                  key={subject}
                  type="monotone"
                  dataKey={subject}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: color, stroke: 'white', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── 시험 이력 테이블 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold text-slate-800">시험 이력</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left font-semibold text-slate-400">#</th>
                <th className="pb-2 text-left font-semibold text-slate-400">회차</th>
                <th className="pb-2 text-right font-semibold text-slate-400">점수</th>
                <th className="pb-2 text-right font-semibold text-slate-400">정답</th>
                <th className="pb-2 text-center font-semibold text-slate-400">결과</th>
                <th className="pb-2 text-right font-semibold text-slate-400">날짜</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((h) => (
                <tr key={h.index} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 text-slate-400">{h.index}</td>
                  <td className="py-2.5 font-semibold text-slate-700">{h.label}</td>
                  <td className="py-2.5 text-right font-extrabold text-slate-800">{h.score}점</td>
                  <td className="py-2.5 text-right text-slate-500">{h.correct}/{h.total}</td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      h.isPass
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-rose-100 text-rose-500'
                    }`}>
                      {h.isPass ? '합격' : '불합격'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-slate-400">{h.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
