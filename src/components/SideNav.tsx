'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChartLine, IconChartPie } from '@tabler/icons-react';
import React, { useState } from 'react';

interface Module {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const modules: Module[] = [
  {
    name: 'Time Series Visualizer',
    path: '/dashboard',
    icon: <IconChartLine className="w-5 h-5" />,
  },
  {
    name: 'Sunburst Chart',
    path: '/dashboard/sunburst',
    icon: <IconChartPie className="w-5 h-5" />,
  },
];

export default function SideNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <nav className={`bg-white border-r border-gray-200 h-screen fixed left-0 top-0 p-4 transition-all duration-300 ${open ? 'w-64' : 'w-16'}`}>
      {/* Hamburger Toggle */}
      <button
        className="mb-4 focus:outline-none"
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={() => setOpen(o => !o)}
      >
        {/* Hamburger icon */}
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {open && (
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-800">Data Visualization</h1>
          <p className="text-sm text-gray-600">Tools & Modules</p>
        </div>
      )}
      <ul className="space-y-2">
        {modules.map((module) => (
          <li key={module.path}>
            <Link
              href={module.path}
              className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                pathname === module.path
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {module.icon}
              {open && <span>{module.name}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
} 