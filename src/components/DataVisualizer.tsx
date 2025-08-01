'use client';

import { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { Session } from 'next-auth';
import { getSession } from 'next-auth/react';
import FileUploader from './FileUploader';
import TimeSeriesChart from './TimeSeriesChart';
import { parseFiles, ParsedRecord, AggregatedPoint } from '../lib/DataParser';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Trash2, Download, Upload } from "lucide-react";

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

export default function DataVisualizer({ session }: DataVisualizerProps) {
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
    setPlatformEdits({});
    setDatasetName('');
  };

  function handlePlatformEdit(original: string, e: ChangeEvent<HTMLInputElement>) {
    setPlatformEdits(prev => ({ ...prev, [original]: e.target.value }));
  }

  const saveDataset = async () => {
    if (!datasetName.trim() || !session?.user) return;
    
    setIsSaving(true);
    try {
      const response = await fetchWithAuth('/api/timeseries', {
        method: 'POST',
        body: JSON.stringify({
          name: datasetName,
          dataPoints: editedParsedRecords,
        }),
      });
      
      if (response) {
        setSavedDatasets(prev => [...prev, response]);
        setDatasetName('');
      }
    } catch (error) {
      console.error('Error saving dataset:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDataset = async (id: string) => {
    try {
      await fetchWithAuth(`/api/timeseries/${id}`, {
        method: 'DELETE',
      });
      setSavedDatasets(prev => prev.filter(d => d.id !== id));
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
    <main className="min-h-screen flex flex-col items-center justify-start p-4 bg-background">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-2">CSV/Excel Time Series Visualizer</h1>
        <p className="text-muted-foreground">Upload one or more CSV or Excel files to visualize monthly user counts for different platforms.</p>
      </div>
      
      <div className="w-full max-w-2xl">
        <FileUploader onFilesSelected={handleFiles} isLoading={isLoading} />
      </div>
      
      {isLoading && (
        <Card className="mt-8 p-6">
          <CardContent className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-primary font-medium">Parsing files...</span>
          </CardContent>
        </Card>
      )}
      
      {parsedRecords.length > 0 && !isLoading && (
        <>
          <Card className="w-full max-w-2xl mt-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detected Platforms</CardTitle>
                <Button variant="destructive" size="sm" onClick={handleClear}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <Input
                    key={p}
                    value={platformEdits[p] ?? p}
                    onChange={e => handlePlatformEdit(p, e)}
                    className="w-auto min-w-[120px] text-sm"
                    placeholder="Platform name"
                  />
                ))}
              </div>
              <Badge variant="secondary">
                Total records: {parsedRecords.length}
              </Badge>
            </CardContent>
          </Card>
          
          <div className="w-full max-w-5xl mb-12">
            <TimeSeriesChart data={aggregatedData} platforms={editedPlatforms} />
          </div>
          
          <Card className="w-full max-w-2xl mb-4">
            <CardContent className="p-4">
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="Dataset name"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  disabled={isSaving}
                  className="flex-1"
                />
                <Button
                  onClick={saveDataset}
                  disabled={isSaving || !datasetName.trim()}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {savedDatasets.length > 0 && (
            <Card className="w-full max-w-2xl mb-8">
              <CardHeader>
                <CardTitle>Your Saved Datasets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedDatasets.map(dataset => (
                    <div key={dataset.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="truncate max-w-xs font-medium">{dataset.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadDataset(dataset)}
                          className="flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Load</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteDataset(dataset.id)}
                          className="flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
} 