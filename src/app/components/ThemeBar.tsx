'use client';

import React from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from '@/lib/contexts/ThemeContext';

export function ThemeBar() {
  const { currentTheme } = useTheme();
  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 py-3 z-40 left-0 ml-16 lg:ml-64">
      <div className="flex items-center gap-2">
        <span className="text-gray-700 text-base font-semibold">Style:</span>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-base shadow-sm">
          {currentTheme.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-sm font-medium">Switch style:</span>
        <ThemeSwitcher />
      </div>
    </div>
  );
} 