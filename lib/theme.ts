/**
 * 테마 유틸리티
 * Catppuccin Latte (기본, 라이트) / Mocha (다크) 전환 지원
 */

export type Theme = 'latte' | 'mocha';

const THEME_KEY = 'hwp-maker:theme';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'latte' || stored === 'mocha') return stored;
  return null;
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'latte';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme(): Theme {
  const current = document.documentElement.getAttribute('data-theme') as Theme | null;
  const next: Theme = current === 'mocha' ? 'latte' : 'mocha';
  applyTheme(next);
  return next;
}

export function initTheme(): Theme {
  const theme = getStoredTheme() ?? getSystemTheme();
  applyTheme(theme);
  return theme;
}
