// CSV/Excel Time Series Visualizer main page (with authentication)
'use client';
import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import TimeSeriesChart from '../components/TimeSeriesChart';
import { parseFiles, ParsedRecord, AggregatedPoint } from '../lib/DataParser';
import { useSession, signIn } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ThemedSunburstChart } from './components/ThemedSunburstChart';
import { ThemeStatus } from './components/ThemeStatus';
import { ButtonDemo } from './components/ButtonDemo';
import { ThemedDropdown } from './components/ThemedDropdown';
import { LineChartIcon, AreaChartIcon, PercentageIcon } from './components/Icons';

const chartTypeOptions = [
  { value: 'line', label: 'Line chart', icon: <LineChartIcon /> },
  { value: 'area', label: 'Stacked area Chart', icon: <AreaChartIcon /> },
  { value: 'percent', label: '100% stacked area chart', icon: <PercentageIcon /> },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [chartType, setChartType] = useState('line');

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Sunburst Chart Visualization</h1>
          <div>
            <label htmlFor="theme-switcher" className="block text-sm font-semibold mb-1 text-gray-700">Switch Style:</label>
            <ThemeSwitcher />
          </div>
        </div>
        <ThemeStatus />
        <ThemedSunburstChart />
        <div className="my-8">
          <ThemedDropdown
            label="Chart Type"
            options={chartTypeOptions}
            value={chartType}
            onChange={setChartType}
          />
        </div>
        <ButtonDemo />
      </div>
    </main>
  );
}
