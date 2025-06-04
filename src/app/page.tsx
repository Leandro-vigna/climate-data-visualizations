// CSV/Excel Time Series Visualizer main page (with authentication)
'use client';
import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import TimeSeriesChart from '../components/TimeSeriesChart';
import { parseFiles, ParsedRecord, AggregatedPoint } from '../lib/DataParser';
import { useSession, signIn } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl md:text-5xl font-bold text-center mb-8">CSV/Excel Time Series Visualizer</h1>
      <p className="text-xl text-gray-600 mb-8">Sign in to access your dashboard</p>
      <button
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Sign in with Google
      </button>
      </div>
  );
}
