'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SunburstChartTabs from '../../../../components/SunburstChartTabs';
import { getDocuments } from '../../../../lib/firebase/firebaseUtils';
import { ThemeBar } from '../../../components/ThemeBar';

// Simple in-memory cache for version data
const versionCache: { [id: string]: any } = {};

async function fetchVersion(versionId: string) {
  if (versionCache[versionId]) {
    return versionCache[versionId];
  }
  const versions = await getDocuments('sunburstVersions');
  const found = versions.find((v: any) => v.id === versionId);
  if (found) {
    versionCache[versionId] = found;
    return found;
  }
  return null;
}

export default function SunburstPage({ params }: { params: { versionId?: string } }) {
  const router = useRouter();
  const versionId = params?.versionId;
  const [initialVersion, setInitialVersion] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!versionId) {
      setLoading(false);
      setInitialVersion(null);
      return;
    }
    setLoading(true);
    // Clear cache for this versionId to ensure fresh data
    delete versionCache[versionId];
    fetchVersion(versionId).then((version) => {
      if (cancelled) return;
      if (version) {
        setInitialVersion(version);
        setNotFound(false);
      } else {
        setInitialVersion(null);
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [versionId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  if (notFound) {
    return <div className="flex justify-center items-center h-64 text-red-500">Version not found.</div>;
  }

  return (
    <>
      <ThemeBar />
      <div className="pl-64">
        <main className="min-h-screen p-8">
          <h1 className="text-3xl font-bold mb-8">Global Greenhouse Gas Emissions by Sector (2016)</h1>
          <p className="text-gray-600 mb-8">
            Interactive visualization of global greenhouse gas emissions by sector, showing the breakdown
            of emissions across different sectors and their subsectors.
          </p>
          <SunburstChartTabs initialVersion={initialVersion} />
        </main>
      </div>
    </>
  );
} 