'use client';

import * as React from 'react';
import { useStore } from '@/lib/store';

type Theme = 'dark' | 'light' | 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useStore();

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  return <>{children}</>;
}
