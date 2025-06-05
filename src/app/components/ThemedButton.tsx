'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { ShareIcon, DownloadIcon, InfoIcon } from './Icons';

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  icon?: 'share' | 'download' | 'info';
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ThemedButton({
  variant = 'primary',
  icon,
  disabled = false,
  children,
  ...props
}: ThemedButtonProps) {
  const { currentTheme } = useTheme();
  const theme = currentTheme.button[variant];

  const getIcon = () => {
    if (icon === 'share') return <ShareIcon className="w-4 h-4 mr-2" style={{ color: theme.icon || theme.text }} />;
    if (icon === 'download') return <DownloadIcon className="w-4 h-4 mr-2" style={{ color: theme.icon || theme.text }} />;
    if (icon === 'info') return <InfoIcon className="w-4 h-4 mr-2" style={{ color: theme.icon || theme.text }} />;
    return null;
  };

  const baseStyles = `inline-flex items-center justify-center font-semibold focus:outline-none transition ${
    variant === 'icon' ? 'p-2' : 'px-6 py-2'
  }`;

  const style: React.CSSProperties = {
    background: disabled
      ? theme.disabledBg || theme.bg
      : theme.bg,
    color: disabled
      ? theme.disabledText || theme.text
      : theme.text,
    border: theme.border,
    borderRadius: theme.borderRadius,
    fontWeight: theme.fontWeight,
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: theme.transition,
  };

  return (
    <button
      type="button"
      className={baseStyles}
      style={style}
      disabled={disabled}
      {...props}
      onMouseOver={
        !disabled
          ? (e) => {
              (e.currentTarget as HTMLButtonElement).style.background = theme.bgHover || theme.bg;
            }
          : undefined
      }
      onMouseOut={
        !disabled
          ? (e) => {
              (e.currentTarget as HTMLButtonElement).style.background = theme.bg;
            }
          : undefined
      }
    >
      {icon && getIcon()}
      {children && <span>{children}</span>}
    </button>
  );
} 