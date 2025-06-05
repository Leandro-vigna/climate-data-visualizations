import React from 'react';

export function ShareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path
        d="M12.667 10.667a2 2 0 0 0-1.6.8l-5.4-2.7a2.01 2.01 0 0 0 0-1.534l5.4-2.7a2 2 0 1 0-.6-1.4l-5.4 2.7a2 2 0 1 0 0 3.2l5.4 2.7a2 2 0 1 0 2.6-1.066z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path
        d="M8 2v8m0 0l3-3m-3 3l-3-3m10 5v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <circle cx={8} cy={8} r={7} stroke="currentColor" strokeWidth={1.5} />
      <path d="M8 11V8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={8} cy={5.5} r={0.75} fill="currentColor" />
    </svg>
  );
}

export function LineChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 20 20" {...props}>
      <path d="M3 17V3h14" stroke="currentColor" strokeWidth={1.5} />
      <polyline points="5,13 9,9 13,13 17,7" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function AreaChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 20 20" {...props}>
      <rect x={3} y={3} width={14} height={14} rx={2} stroke="currentColor" strokeWidth={1.5} />
      <polyline points="5,13 8,8 12,12 15,7" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <polygon points="5,13 8,8 12,12 15,7 15,17 5,17" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

export function PercentageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 20 20" {...props}>
      <rect x={3} y={3} width={14} height={14} rx={2} stroke="currentColor" strokeWidth={1.5} />
      <line x1={6} y1={14} x2={14} y2={6} stroke="currentColor" strokeWidth={1.5} />
      <circle cx={7} cy={7} r={1} fill="currentColor" />
      <circle cx={13} cy={13} r={1} fill="currentColor" />
    </svg>
  );
}

export function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function ChevronUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function DotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={12} height={12} fill="none" viewBox="0 0 12 12" {...props}>
      <circle cx={6} cy={6} r={5} fill="currentColor" />
    </svg>
  );
}

export function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function AddUserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 20 20" {...props}>
      <circle cx={9} cy={8} r={4} stroke="currentColor" strokeWidth={1.5} />
      <path d="M17 17v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth={1.5} />
      <path d="M15 8h4m-2-2v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} fill="none" viewBox="0 0 20 20" {...props}>
      <rect x={3} y={3} width={14} height={14} rx={2} stroke="currentColor" strokeWidth={1.5} />
      <path d="M7 9h6M7 13h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <rect x={7} y={7} width={6} height={2} rx={1} fill="currentColor" opacity="0.1" />
    </svg>
  );
} 