'use client';

import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import FileUploader from './FileUploader';
import TimeSeriesChart from './TimeSeriesChart';
import { parseFiles, ParsedRecord, AggregatedPoint } from '../lib/DataParser';

interface TimeSeries {
  id: string;
  name: string;
  dataPoints: ParsedRecord[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface DataVisualizerProps {
  session: Session;
}

export function DataVisualizer({ session }: DataVisualizerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [platformEdits, setPlatformEdits] = useState<{ [original: string]: string }>({});
  const [savedDatasets, setSavedDatasets] = useState<TimeSeries[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [datasetName, setDatasetName] = useState('');

  // Helper function for API calls
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const session = await getSession();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  // Fetch saved datasets on mount and after save/delete
  useEffect(() => {
    if (!session?.user) return;
    
    fetchWithAuth('/api/timeseries')
      .then(data => setSavedDatasets(Array.isArray(data) ? data : []))
      .catch(error => console.error('Error fetching datasets:', error));
  }, [session?.user]);

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

  const saveDataset = async () => {
    if (!datasetName.trim() || !parsedRecords.length) return;
    setIsSaving(true);
    try {
      await fetchWithAuth('/api/timeseries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: datasetName, dataPoints: parsedRecords }),
      });
      setDatasetName('');
      // Refresh list
      const data = await fetchWithAuth('/api/timeseries');
      setSavedDatasets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error saving dataset:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDataset = async (id: string) => {
    try {
      await fetchWithAuth('/api/timeseries', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      // Refresh list
      const data = await fetchWithAuth('/api/timeseries');
      setSavedDatasets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error deleting dataset:', error);
    }
  };

  const loadDataset = (dataset: TimeSeries) => {
    try {
      // Clear any existing files since we're loading from saved data
      setFiles([]);
      
      // Parse the dataPoints from the saved dataset
      const dataPoints = Array.isArray(dataset.dataPoints) 
        ? dataset.dataPoints 
        : JSON.parse(dataset.dataPoints as unknown as string);
      
      setParsedRecords(dataPoints);
      
      // Set the dataset name
      setDatasetName(dataset.name);
      
      // Reset platform edits when loading new dataset
      setPlatformEdits({});
    } catch (error) {
      console.error('Error loading dataset:', error);
    }
  };

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
              {platforms.map((p) => (
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
          <div className="w-full max-w-2xl mt-4 mb-4 bg-white rounded shadow p-4 flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Dataset name"
                value={datasetName}
                onChange={e => setDatasetName(e.target.value)}
                className="border px-2 py-1 rounded w-full"
                disabled={isSaving}
              />
              <button
                className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                onClick={saveDataset}
                disabled={isSaving || !datasetName.trim()}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          {savedDatasets.length > 0 && (
            <div className="w-full max-w-2xl mt-4 mb-8 bg-white rounded shadow p-4">
              <div className="font-semibold mb-2">Your Saved Datasets</div>
              <ul className="divide-y">
                {savedDatasets.map(dataset => (
                  <li key={dataset.id} className="flex justify-between items-center py-2">
                    <span className="truncate max-w-xs">{dataset.name}</span>
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => loadDataset(dataset)}
                      >
                        Load
                      </button>
                      <button
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => deleteDataset(dataset.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
} 