import { useEffect, useState } from 'react';

/** Dark mode state, mirrored onto <html class="dark"> and remembered in localStorage. */
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const toggleDark = () => setDark((d) => !d);

  return { dark, toggleDark };
}
