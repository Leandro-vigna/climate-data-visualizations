'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { DataVisualizer } from '../../components/DataVisualizer';

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return <DataVisualizer session={session} />;
} 