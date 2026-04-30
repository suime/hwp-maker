import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'hwp-maker — AI 기반 한글 문서 작성기',
  description:
    '자연어 명령으로 hwp/hwpx 문서를 생성하고 편집하는 AI 도구입니다. rhwp WASM 기반 브라우저 편집기 제공.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-theme="latte"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var stored = localStorage.getItem('hwp-maker:theme');
                var themes = ['latte', 'mocha', 'github-light', 'github-dark', 'vscode-light', 'vscode-dark', 'one-dark', 'dracula'];
                var theme = themes.indexOf(stored) >= 0
                  ? stored
                  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte');
                document.documentElement.setAttribute('data-theme', theme);
              } catch(e) {}
            })();
          `}
        </Script>
      </head>
      <body className="h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
