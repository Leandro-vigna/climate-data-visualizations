import React, { useRef, useLayoutEffect, useState } from 'react';
import { useTheme } from '../lib/contexts/ThemeContext';

interface ThemedTooltipProps {
  x: number;
  y: number;
  name: string;
  value: number | string;
  info: string;
}

const POINTER_SIZE = 12;

export default function ThemedTooltip({ x, y, name, value, info }: ThemedTooltipProps) {
  const { currentTheme } = useTheme();
  // Tooltip style for Climate Watch
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
  const pointerHeight = 12;
  const gap = 5;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(80); // fallback

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      setMeasuredHeight(tooltipRef.current.offsetHeight);
    }
  }, [name, value, info]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x - tooltipWidth / 2,
    top: y - measuredHeight - pointerHeight - gap,
    width: tooltipWidth,
    zIndex: 1000,
    pointerEvents: 'none',
    fontFamily,
  };
  return (
    <div style={style}>
      <div
        ref={tooltipRef}
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
            bottom: -pointerHeight,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: `${pointerHeight}px solid transparent`,
            borderRight: `${pointerHeight}px solid transparent`,
            borderTop: `${pointerHeight}px solid ${typeof bg === 'string' ? bg : '#222'}`,
          }}
        />
      </div>
    </div>
  );
} 