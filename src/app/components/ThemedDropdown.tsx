'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { ChevronDownIcon } from './Icons';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface ThemedDropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  minWidth?: string;
}

export function ThemedDropdown({
  label,
  options,
  value,
  onChange,
  icon,
  minWidth,
}: ThemedDropdownProps) {
  const { currentTheme } = useTheme();
  const theme = currentTheme.dropdown;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div
      ref={ref}
      className="relative"
      style={{ minWidth: minWidth || theme.minWidth, zIndex: theme.zIndex }}
    >
      {label && (
        <div
          className="mb-1"
          style={{
            color: theme.label,
            fontWeight: theme.labelFontWeight,
            fontSize: theme.labelFontSize,
          }}
        >
          {label}
        </div>
      )}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 focus:outline-none"
        style={{
          background: theme.bg,
          border: theme.border,
          borderRadius: theme.borderRadius,
          boxShadow: theme.boxShadow,
          transition: theme.transition,
          padding: theme.padding,
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          <span style={{ color: theme.optionText, fontWeight: 500 }}>{selected?.label}</span>
        </div>
        <ChevronDownIcon style={{ color: theme.icon }} />
      </button>
      {open && (
        <div
          className="absolute left-0 mt-2 w-full rounded-md shadow-lg bg-white border"
          style={{
            background: theme.optionBg,
            border: theme.border,
            borderRadius: theme.borderRadius,
            boxShadow: theme.boxShadow,
            zIndex: theme.zIndex + 1,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2 text-left focus:outline-none"
              style={{
                background:
                  value === opt.value
                    ? theme.optionSelectedBg
                    : theme.optionBg,
                color: opt.disabled
                  ? theme.optionDisabledText
                  : theme.optionText,
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                fontWeight: value === opt.value ? 600 : 400,
                transition: theme.transition,
                opacity: opt.disabled ? 0.6 : 1,
              }}
              disabled={opt.disabled}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value);
                  setOpen(false);
                }
              }}
              onMouseOver={(e) => {
                if (!opt.disabled && value !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.background = theme.optionHoverBg;
                }
              }}
              onMouseOut={(e) => {
                if (!opt.disabled && value !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.background = theme.optionBg;
                }
              }}
            >
              {opt.icon && <span className="text-lg">{opt.icon}</span>}
              <span>{opt.label}</span>
              {value === opt.value && (
                <span className="ml-auto">
                  <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                    <circle cx={5} cy={5} r={4} fill={theme.optionSelectedDot} />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 