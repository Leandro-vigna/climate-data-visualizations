'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SunburstChartTabs from '../../../components/SunburstChartTabs';

export default function SunburstPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="pl-64">
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-8">Global Greenhouse Gas Emissions by Sector (2016)</h1>
        <p className="text-gray-600 mb-8">
          Interactive visualization of global greenhouse gas emissions by sector, showing the breakdown
          of emissions across different sectors and their subsectors.
        </p>
        <SunburstChartTabs />
      </main>
    </div>
  );
} 