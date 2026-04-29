/**
 * 테마 초기화 — 하이드레이션 플래시 방지
 * layout.tsx <head>에 인라인 스크립트로 삽입
 */
export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('hwp-maker:theme');
        var theme = stored === 'latte' || stored === 'mocha'
          ? stored
          : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte');
        document.documentElement.setAttribute('data-theme', theme);
      } catch(e) {}
    })();
  `;
  // eslint-disable-next-line @next/next/no-assign-module-variable, @next/next/no-sync-scripts
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: script }} />;
}
