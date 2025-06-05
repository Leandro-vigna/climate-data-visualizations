'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export function ThemeStatus() {
  const { currentTheme } = useTheme();
  return (
    <div className="mb-2 text-lg font-medium text-blue-700">
      Current Style: <span className="font-bold">{currentTheme.name}</span>
    </div>
  );
} 