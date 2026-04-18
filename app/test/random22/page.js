import Link from 'next/link';
import { ChevronRight, Shuffle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const YEAR_OPTIONS = [
  { year: 2022, desc: '2022년 1~3회에서 60문항 셔플 + 보기 셔플' },
  { year: 2023, desc: '2023년 1~3회에서 60문항 셔플 + 보기 셔플' },
  { year: 2024, desc: '2024년 1~3회에서 60문항 셔플 + 보기 셔플' },
  { year: 2025, desc: '2025년 산업기사 1~3회에서 60문항 셔플 + 보기 셔플' },
];

export default function Random22YearSelectionPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-fuchsia-50 to-violet-100 text-gray-800">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-violet-900 tracking-tight">랜덤보기22 (문제 셔플형)</h1>
            <p className="mt-3 text-gray-600">연도를 선택하면 해당 연도 회차에서 60문항을 셔플 구성하고 보기 순서도 섞어서 출제합니다.</p>
          </div>

          <div className="space-y-4">
            {YEAR_OPTIONS.map((item) => (
              <Link
                key={item.year}
                href={`/test/random22/${item.year}`}
                className="block rounded-2xl border border-violet-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Shuffle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-violet-900">{item.year}년 랜덤보기</h2>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
