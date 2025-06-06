import React from 'react';
import { useTheme } from '../lib/contexts/ThemeContext';

interface ThemedTooltipProps {
  x: number;
  y: number;
  name: string;
  value: number | string;
  info: string;
}

const POINTER_HEIGHT = 12;
const CURSOR_GAP = 5;

export default function ThemedTooltip({ x, y, name, value, info }: ThemedTooltipProps) {
  const { currentTheme } = useTheme();
  const bg = currentTheme.name === 'Climate Watch'
    ? '#0A2239'
    : currentTheme.colors.primaryDark || currentTheme.colors.primary || '#222';
  const textColor = '#fff';
  const borderRadius = 8;
  const fontFamily = currentTheme.typography.fontFamily.primary;
  const fontSize = currentTheme.typography.fontSize.base;
  const infoFontSize = currentTheme.typography.fontSize.sm;
  const boxShadow = '0 4px 16px 0 rgba(0,0,0,0.18)';
  const tooltipWidth = 280;

  // The anchor is at the cursor (x, y), but shift the tooltip up so the pointer's tip is at the cursor, plus a gap
  const anchorStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
    pointerEvents: 'none',
    transform: `translate(-50%, calc(-100% - ${POINTER_HEIGHT + CURSOR_GAP}px))`, // center horizontally, shift up with gap
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  return (
    <div style={anchorStyle}>
      <div
        style={{
          background: typeof bg === 'string' ? bg : '#222',
          color: textColor,
          borderRadius,
          boxShadow,
          padding: '16px 20px',
          minWidth: tooltipWidth,
          maxWidth: tooltipWidth,
          fontSize,
          fontWeight: 500,
          lineHeight: 1.4,
          position: 'relative',
          textAlign: 'center',
          fontFamily,
          marginBottom: 0,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: fontSize, marginBottom: 4 }}>
          {name} {value && <span style={{ fontWeight: 400 }}>{value}</span>}
        </div>
        {info && (
          <div style={{ fontSize: infoFontSize, fontWeight: 400, marginTop: 8, whiteSpace: 'pre-line', textAlign: 'left' }}>{info}</div>
        )}
        {/* Pointer (bottom, pointing down) */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -POINTER_HEIGHT,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: `${POINTER_HEIGHT}px solid transparent`,
            borderRight: `${POINTER_HEIGHT}px solid transparent`,
            borderTop: `${POINTER_HEIGHT}px solid ${typeof bg === 'string' ? bg : '#222'}`,
          }}
        />
      </div>
    </div>
  );
} 