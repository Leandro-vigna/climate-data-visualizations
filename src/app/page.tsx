// CSV/Excel Time Series Visualizer main page (no authentication, no per-user storage)
'use client';
import { useState, useMemo, ChangeEvent } from 'react';
import FileUploader from '../components/FileUploader';
import TimeSeriesChart from '../components/TimeSeriesChart';
import { parseFiles, ParsedRecord, AggregatedPoint } from '../lib/DataParser';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [platformEdits, setPlatformEdits] = useState<{ [original: string]: string }>({});

  // Compute platforms with edits applied
  const platforms = useMemo(() => Array.from(new Set(parsedRecords.map(r => r.platformName))), [parsedRecords]);
  const editedPlatforms = platforms.map(p => platformEdits[p] || p);

  // Map parsedRecords to use edited platform names
  const editedParsedRecords = useMemo(() => {
    if (!Object.keys(platformEdits).length) return parsedRecords;
    return parsedRecords.map(r => ({ ...r, platformName: platformEdits[r.platformName] || r.platformName }));
  }, [parsedRecords, platformEdits]);

  // Aggregation logic (use editedParsedRecords)
  const aggregatedData = useMemo(() => {
    if (!editedParsedRecords.length) return [];
    const map = new Map<string, AggregatedPoint>();
    editedParsedRecords.forEach(({ month, year, platformName, users }) => {
      const key = `${year}-${month}`;
      if (!map.has(key)) {
        map.set(key, { month, year });
      }
      map.get(key)![platformName] = (map.get(key)![platformName] || 0) + users;
    });
    // Fill missing platforms with 0
    editedPlatforms.forEach(platform => {
      map.forEach(point => {
        if (!(platform in point)) {
          point[platform] = 0;
        }
      });
    });
    // Sort chronologically
    const points = Array.from(map.values());
    points.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    return points;
  }, [editedParsedRecords, editedPlatforms]);

  const handleFiles = async (newFiles: File[]) => {
    setIsLoading(true);
    setFiles(newFiles);
    const records = await parseFiles(newFiles);
    setParsedRecords(records);
    setIsLoading(false);
  };

  const handleClear = () => {
    setFiles([]);
    setParsedRecords([]);
  };

  function handlePlatformEdit(original: string, e: ChangeEvent<HTMLInputElement>) {
    setPlatformEdits(edits => ({ ...edits, [original]: e.target.value }));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-4 bg-gray-50">
      <h1 className="text-3xl md:text-5xl font-bold text-center mt-8 mb-2">CSV/Excel Time Series Visualizer</h1>
      <p className="text-center text-gray-600 mb-6">Upload one or more CSV or Excel files to visualize monthly user counts for different platforms.</p>
      <div className="w-full max-w-2xl">
        <FileUploader onFilesSelected={handleFiles} isLoading={isLoading} />
      </div>
      {isLoading && (
        <div className="flex flex-col items-center mt-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <span className="text-blue-500">Parsing files...</span>
        </div>
      )}
      {parsedRecords.length > 0 && !isLoading && (
        <>
          <div className="w-full max-w-2xl mt-8 mb-4 bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Detected Platforms:</span>
              <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={handleClear}>Clear All</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {platforms.map((p, idx) => (
                <input
                  key={p}
                  value={platformEdits[p] ?? p}
                  onChange={e => handlePlatformEdit(p, e)}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ minWidth: 80 }}
                />
              ))}
            </div>
            <div className="text-gray-500 text-sm">Total records: {parsedRecords.length}</div>
          </div>
          <div className="w-full max-w-5xl mb-12">
            <TimeSeriesChart data={aggregatedData} platforms={editedPlatforms} />
          </div>
        </>
      )}
    </main>
  );
}
