// lib/kstDate.js — 서버는 UTC(Netlify)일 수 있으므로 KST 고정 오프셋으로 날짜 계산
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstDateString(date = new Date()) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function addDaysToDateString(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function kstTodayString() {
  return kstDateString(new Date());
}

export function kstTomorrowString() {
  return addDaysToDateString(kstTodayString(), 1);
}
