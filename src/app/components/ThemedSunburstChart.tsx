'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getDataVizColor, getThemeStyles } from '@/lib/utils/themeUtils';
import { GHGEmissionsSunburst } from './GHGEmissionsSunburst';

export function ThemedSunburstChart() {
  const { currentTheme } = useTheme();
  const themeStyles = getThemeStyles(currentTheme);

  const getSegmentColor = (index: number) => {
    return getDataVizColor(index, currentTheme);
  };

  return (
    <div className="w-full h-full" style={{ fontFamily: themeStyles.fontFamily }}>
      <div className="p-4">
        <h1 
          className="text-2xl font-bold mb-4"
          style={{ 
            color: themeStyles.colors.text,
            fontSize: themeStyles.fontSize.xlarge,
            fontWeight: themeStyles.fontWeight.bold
          }}
        >
          GHG Emissions Sunburst Chart
        </h1>
        <div 
          className="rounded-lg p-4"
          style={{ 
            backgroundColor: themeStyles.colors.background,
            boxShadow: themeStyles.shadows.medium,
            borderRadius: themeStyles.borderRadius.medium
          }}
        >
          <GHGEmissionsSunburst getSegmentColor={getSegmentColor} />
        </div>
      </div>
    </div>
  );
} 