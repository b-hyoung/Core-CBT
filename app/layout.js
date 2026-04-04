import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata = {
  title: "정보처리산업기사 CBT 모의시험",
  description: "정보처리산업기사 필기 기출문제를 CBT 형식으로 학습하는 웹 서비스",
};

// 페이지 로드 전 테마 적용 — 깜빡임 방지
const themeScript = `
(function() {
  try {
    var allowedThemes = ['sky', 'violet', 'rose', 'amber', 'teal', 'custom'];
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
    var colorTheme = localStorage.getItem('color-theme');
    var customThemeColor = localStorage.getItem('custom-theme-color');
    if (!allowedThemes.includes(colorTheme)) colorTheme = 'sky';
    document.documentElement.dataset.colorTheme = colorTheme;
    if (customThemeColor) {
      document.documentElement.style.setProperty('--custom-theme-color', customThemeColor);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${notoSansKR.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
