'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-4 p-4">
      <select
        value={currentTheme.name}
        onChange={(e) => setTheme(e.target.value)}
        className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          backgroundColor: currentTheme.colors.background,
          color: currentTheme.colors.text,
          fontFamily: currentTheme.typography.fontFamily.primary,
        }}
      >
        <option value="Climate Watch">Climate Watch</option>
        <option value="System Change Lab">System Change Lab</option>
        <option value="Our World in Data">Our World in Data</option>
      </select>
    </div>
  );
} 