/**
 * 테마 유틸리티
 * 에디터 테마 유틸리티
 */

export type Theme =
  | 'latte'
  | 'mocha'
  | 'github-light'
  | 'github-dark'
  | 'vscode-light'
  | 'vscode-dark'
  | 'one-dark'
  | 'dracula';

export type ThemeMode = 'light' | 'dark';

export interface ThemePreset {
  id: Theme;
  label: string;
  description: string;
  mode: ThemeMode;
  swatches: readonly string[];
}

const THEME_KEY = 'hwp-maker:theme';
export const THEME_CHANGE_EVENT = 'hwp-maker:theme-change';

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'latte',
    label: 'Catppuccin Latte',
    description: '현재 기본 라이트 테마',
    mode: 'light',
    swatches: ['#eff1f5', '#e6e9ef', '#1e66f5', '#4c4f69'],
  },
  {
    id: 'mocha',
    label: 'Catppuccin Mocha',
    description: '현재 기본 다크 테마',
    mode: 'dark',
    swatches: ['#1e1e2e', '#181825', '#89b4fa', '#cdd6f4'],
  },
  {
    id: 'github-light',
    label: 'GitHub Light',
    description: 'GitHub 스타일의 밝은 IDE 테마',
    mode: 'light',
    swatches: ['#ffffff', '#f6f8fa', '#0969da', '#24292f'],
  },
  {
    id: 'github-dark',
    label: 'GitHub Dark',
    description: 'GitHub Dark 계열 IDE 테마',
    mode: 'dark',
    swatches: ['#0d1117', '#161b22', '#58a6ff', '#e6edf3'],
  },
  {
    id: 'vscode-light',
    label: 'VS Code Light',
    description: 'Visual Studio Code Light 계열',
    mode: 'light',
    swatches: ['#ffffff', '#f3f3f3', '#007acc', '#1f1f1f'],
  },
  {
    id: 'vscode-dark',
    label: 'VS Code Dark',
    description: 'Visual Studio Code Dark 계열',
    mode: 'dark',
    swatches: ['#1e1e1e', '#252526', '#007acc', '#cccccc'],
  },
  {
    id: 'one-dark',
    label: 'One Dark',
    description: 'Atom One Dark 계열',
    mode: 'dark',
    swatches: ['#282c34', '#21252b', '#61afef', '#abb2bf'],
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Dracula 계열 고대비 다크 테마',
    mode: 'dark',
    swatches: ['#282a36', '#21222c', '#bd93f9', '#f8f8f2'],
  },
] as const;

const LIGHT_THEME_BY_FAMILY: Partial<Record<Theme, Theme>> = {
  latte: 'latte',
  mocha: 'latte',
  'github-light': 'github-light',
  'github-dark': 'github-light',
  'vscode-light': 'vscode-light',
  'vscode-dark': 'vscode-light',
  'one-dark': 'vscode-light',
  dracula: 'latte',
};

const DARK_THEME_BY_FAMILY: Partial<Record<Theme, Theme>> = {
  latte: 'mocha',
  mocha: 'mocha',
  'github-light': 'github-dark',
  'github-dark': 'github-dark',
  'vscode-light': 'vscode-dark',
  'vscode-dark': 'vscode-dark',
  'one-dark': 'one-dark',
  dracula: 'dracula',
};

export function isTheme(value: string | null): value is Theme {
  return THEME_PRESETS.some((theme) => theme.id === value);
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_KEY);
  return isTheme(stored) ? stored : null;
}

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'latte';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
}

export function getThemePreset(theme: Theme): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === theme) ?? THEME_PRESETS[0];
}

export function getThemeMode(theme: Theme): ThemeMode {
  return getThemePreset(theme).mode;
}

export function getThemeForMode(theme: Theme, mode: ThemeMode): Theme {
  return mode === 'light'
    ? LIGHT_THEME_BY_FAMILY[theme] ?? 'latte'
    : DARK_THEME_BY_FAMILY[theme] ?? 'mocha';
}

export function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'latte';
  const current = document.documentElement.getAttribute('data-theme');
  return isTheme(current) ? current : 'latte';
}

export function toggleTheme(): Theme {
  const current = getCurrentTheme();
  const next = getThemeMode(current) === 'dark'
    ? getThemeForMode(current, 'light')
    : getThemeForMode(current, 'dark');
  applyTheme(next);
  return next;
}

export function initTheme(): Theme {
  const theme = getStoredTheme() ?? getSystemTheme();
  applyTheme(theme);
  return theme;
}
