'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Theme } from '../types/theme';
import { climateWatchTheme, systemChangeLabTheme, ourWorldInDataTheme } from '../themes/sunburstThemes';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeName: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes = {
  'Climate Watch': climateWatchTheme,
  'System Change Lab': systemChangeLabTheme,
  'Our World in Data': ourWorldInDataTheme,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(climateWatchTheme);

  const setTheme = (themeName: string) => {
    const theme = themes[themeName as keyof typeof themes];
    if (theme) {
      setCurrentTheme(theme);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 