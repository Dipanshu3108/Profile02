import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'dipanshu-portfolio-theme';
/** Browser chrome colour per theme; matches --bg in tokens.css. */
const THEME_COLOR: Record<Theme, string> = { dark: '#05070d', light: '#f4ede2' };

/** Dark is the site's own theme; light (warm sand and sage) only when the visitor picked it. */
export function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * The visitor's light/dark choice, remembered across visits. Writes `data-theme` on <html>, which
 * the stylesheets, thinking-orbs and bot-avatars all read. index.html sets it before first paint.
 */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable in private browsing; the choice still holds for this visit.
    }
  }, [theme]);

  const set = useCallback((next: Theme) => setTheme(next), []);
  return [theme, set];
}
