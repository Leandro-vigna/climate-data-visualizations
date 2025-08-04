'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Download, 
  Database,
  Calendar,
  Globe,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Clock,
  Zap,
  Eye,
  Users,
  MousePointer,
  AlertTriangle
} from "lucide-react";

// Timeline Tracker Component
interface DataTimelineTrackerProps {
  dataLayers: {[key: string]: {count: number, dateRange: string, dates: string[]}};
}

// Calculate data segments for a layer across the master timeline - MOVED BEFORE COMPONENT
const getDataSegments = (allDates: string[], layer: {dates: string[]}) => {
  if (allDates.length === 0 || layer.dates.length === 0) return [];
  
  // Create a set of dates this layer has data for
  const layerDatesSet = new Set(layer.dates);
  
  // Calculate segments across the master timeline
  const segments = [];
  let currentSegment = null;
  
  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i];
    const hasData = layerDatesSet.has(date);
    // Fix division by zero when only one date
    const position = allDates.length === 1 ? 0 : (i / (allDates.length - 1)) * 100;
    const width = 100 / allDates.length; // Width of each day
    
    if (hasData) {
      if (!currentSegment) {
        // Start new segment
        currentSegment = { start: position, width: width };
      } else {
        // Extend current segment
        currentSegment.width += width;
      }
    } else {
      if (currentSegment) {
        // End current segment and add to list
        segments.push(currentSegment);
        currentSegment = null;
      }
    }
  }
  
  // Add final segment if exists
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments;
};

function DataTimelineTracker({ dataLayers, allData }: DataTimelineTrackerProps & { allData: UnifiedAnalyticsData[] }) {
  // FINAL FIX: Filter actual merged data to match blue bar logic exactly
  const getActualDataDates = () => {
    if (!allData || allData.length === 0) {
      return dataLayers.pageviews?.dates?.sort() || [];
    }
    
    // Group merged data by date and sum metric values
    const metricsByDate: { [date: string]: number } = {};
    allData.forEach(record => {
      if (!metricsByDate[record.date]) {
        metricsByDate[record.date] = 0;
      }
      metricsByDate[record.date] += record.metric_value;
    });
    
    // Only include dates with actual metric values > 0 (same logic as blue bar)
    const datesWithData = Object.keys(metricsByDate)
      .filter(date => metricsByDate[date] > 0)
      .sort();
    
    console.log('🔧 FINAL FIX - ACTUAL DATA FILTERING:', {
      totalMergedRecords: allData.length,
      allUniqueDates: Object.keys(metricsByDate).length,
      datesWithData: datesWithData.length,
      firstDateWithData: datesWithData[0],
      lastDateWithData: datesWithData[datesWithData.length - 1],
      filteredOutDates: Object.keys(metricsByDate).filter(date => metricsByDate[date] === 0)
    });
    
    return datesWithData;
  };

  const allDates = getActualDataDates();
  const startDate = allDates.length > 0 ? allDates[0] : new Date().toISOString().split('T')[0];
  const endDate = allDates.length > 0 ? allDates[allDates.length - 1] : new Date().toISOString().split('T')[0];
  
  // DEBUG: INVESTIGATE WHY BLUE BAR CALCULATION IS WRONG
  const blueBarSegments = getDataSegments(allDates, dataLayers.pageviews || {dates: []});
  
  // Check actual metric distribution by date
  const metricsByDate: { [date: string]: number } = {};
  if (allData) {
    allData.forEach(record => {
      if (!metricsByDate[record.date]) metricsByDate[record.date] = 0;
      metricsByDate[record.date] += record.metric_value;
    });
  }
  
  console.log('🎯 BLUE BAR CALCULATION DEBUG:', {
    allDatesCount: allDates.length,
    allDatesRange: `${allDates[0]} to ${allDates[allDates.length - 1]}`,
    pageviewLayerDates: dataLayers.pageviews?.dates?.length || 0,
    blueBarSegments: blueBarSegments,
    blueBarStartsAt: blueBarSegments[0]?.start || 0,
    actualMetricsDistribution: Object.keys(metricsByDate)
      .sort()
      .slice(0, 10)
      .map(date => ({ date, metrics: metricsByDate[date] })),
    issue: 'Visual blue bar at ~25% but calculation shows 0%'
  });
  
  // Calculate timeline width and date positions
  const timelineWidth = 100; // percentage
  const getDatePosition = (date: string) => {
    if (allDates.length <= 1) return 0;
    const index = allDates.indexOf(date);
    return (index / (allDates.length - 1)) * timelineWidth;
  };

  // Define all possible data layers
  const layerDefinitions = [
    { key: 'pageviews', label: 'Pageviews', icon: Eye, color: 'bg-blue-500' },
    { key: 'geographic', label: 'Countries', icon: Globe, color: 'bg-green-500' },
    { key: 'users', label: 'Users', icon: Users, color: 'bg-emerald-500' },
    { key: 'referrals', label: 'Referrals', icon: TrendingUp, color: 'bg-purple-500' },
    { key: 'sessions', label: 'Sessions', icon: MousePointer, color: 'bg-orange-500' },
    { key: 'downloads', label: 'Downloads', icon: Download, color: 'bg-red-500' },
    { key: 'subscribers', label: 'Subscribers', icon: Zap, color: 'bg-teal-500' },
    { key: 'events', label: 'Events', icon: Calendar, color: 'bg-pink-500' },
  ];

  // Format date for display with proper year format
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '') return 'No data';
    
    // Handle different date formats
    let date: Date;
    
    // Try different parsing methods
    if (dateStr.includes('-')) {
      // Format: YYYY-MM-DD
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        // Create date using parts to avoid timezone issues
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        date = new Date(dateStr + 'T00:00:00.000Z');
      }
    } else if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      // Format: YYYYMMDD (e.g., "20250704")
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      date = new Date(year, month, day);
    } else {
      date = new Date(dateStr);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateStr, 'Parsed as:', date);
      return dateStr; // Return original string if parsing fails
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };



  // Show message if no data
  if (Object.keys(dataLayers).length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-800">Data Coverage Timeline</span>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No data collected yet. Start collecting analytics data to see your timeline coverage.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Calendar className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-gray-800">Data Coverage Timeline</span>
      </div>
      
      {/* Timeline Header */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{formatDate(startDate)}</span>
          {allDates.length > 1 && (
            <span>{formatDate(endDate)}</span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full relative">
          {/* Timeline markers at start and end */}
          <div className="absolute w-0.5 h-4 bg-gray-500 -top-1" style={{ left: '0%' }} />
          <div className="absolute w-0.5 h-4 bg-gray-500 -top-1" style={{ left: '100%' }} />
          
          {/* Quarter markers */}
          {[25, 50, 75].map(pos => (
            <div
              key={pos}
              className="absolute w-0.5 h-3 bg-gray-400 -top-0.5"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>
      </div>

      {/* Data Layers */}
      <div className="space-y-3">
        <div className="text-xs text-gray-500 mb-2">
          <span className="inline-flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Available data</span>
          </span>
        </div>
        
        {layerDefinitions.map(({ key, label, icon: Icon, color }) => {
          const hasData = dataLayers[key];
          const dataSegments = hasData ? getDataSegments(allDates, hasData) : [];
          
          return (
            <div key={key} className="flex items-center">
              {/* Layer Label */}
              <div className="w-24 flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${hasData ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${hasData ? 'text-gray-800' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              
              {/* Timeline Bar - Full length aligned to master timeline */}
              <div className="flex-1 ml-4 relative">
                <div className="h-7 bg-gray-100 rounded-full relative overflow-hidden border">
                  {/* Render data segments for this layer */}
                  {dataSegments.map((segment, index) => (
                    <div
                      key={index}
                      className={`absolute h-full ${color} transition-all duration-300`}
                      style={{
                        left: `${segment.start}%`,
                        width: `${segment.width}%`,
                      }}
                    />
                  ))}
                </div>
                
                {/* Data Info */}
                {hasData && (
                  <div className="absolute -right-2 top-0 h-7 flex items-center">
                    <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded border shadow-sm">
                      {hasData.count.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <p>
          <strong>Coverage:</strong> {allDates.length > 0 ? `${formatDate(startDate)} to ${formatDate(endDate)} (${allDates.length} days)` : 'No data collected'} • 
          <strong> Layers active:</strong> {Object.keys(dataLayers).length} of {layerDefinitions.length}
        </p>
      </div>
    </div>
  );
}

interface PageViewData {
  date: string;
  page: string;
  pageViews: number;
}

interface GeographicData {
  date: string;
  country: string;
  activeUsers: number;
}

// Unified Long Format Interface for Master Spreadsheet
interface UnifiedAnalyticsData {
  date: string;
  metric_type: string;      // "pageviews", "users", "sessions", etc.
  dimension_type: string;   // "page", "country", "source", etc.
  dimension_value: string;  // "/home", "United States", "google", etc.
  metric_value: number;     // The actual numeric value
}

// Conversion function to transform any data type to unified format
function convertToUnifiedFormat(data: any[], dataLayers: string[]): UnifiedAnalyticsData[] {
  const unifiedData: UnifiedAnalyticsData[] = [];
  
  // Determine data type based on dataLayers
  const isGeographic = dataLayers.includes('geographic');
  
  data.forEach(record => {
    if (isGeographic && record.country !== undefined) {
      // Geographic data: country -> users
      unifiedData.push({
        date: record.date,
        metric_type: 'users',
        dimension_type: 'country',
        dimension_value: record.country,
        metric_value: record.activeUsers || 0
      });
    } else if (record.page !== undefined) {
      // Pageview data: page -> pageviews
      unifiedData.push({
        date: record.date,
        metric_type: 'pageviews',
        dimension_type: 'page',
        dimension_value: record.page,
        metric_value: record.pageViews || 0
      });
    }
  });
  
  return unifiedData;
}

interface AnalyticsCollection {
  id: string;
  toolId: string;
  toolName: string;
  collectionDate: string;
  timePeriod: string;
  dataLayers: string[];
  dataSource: string;
  totalRecords: number;
  status: string;
  createdAt: string;
  data: PageViewData[];
}

export default function AnalyticsCollectionsPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  const router = useRouter();
  const params = useParams();
  const toolId = params.toolId as string;
  
  const [collections, setCollections] = useState<AnalyticsCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allData, setAllData] = useState<UnifiedAnalyticsData[]>([]);
  const [duplicateStats, setDuplicateStats] = useState({ total: 0, unique: 0, duplicates: 0 });
  const [dataLayers, setDataLayers] = useState<{[key: string]: {count: number, dateRange: string, dates: string[]}}>({});
  const [quotaInfo, setQuotaInfo] = useState<{remaining: number, resetTime: string, percentage: number} | null>(null);

  // Load all collections
  const loadCollections = async () => {
    try {
      const response = await fetch('/api/analytics/collections');
      
      if (!response.ok) {
        throw new Error('Failed to load collections');
      }

      const result = await response.json();
      
      if (result.success) {
        setCollections(result.collections);
        
        // Merge all data from all collections with duplicate detection
        const mergedData: PageViewData[] = [];
        const seenKeys = new Set<string>();
        let totalRecords = 0;
        let duplicateCount = 0;
        const layerStats: {[key: string]: {count: number, dateRange: string, dates: string[]}} = {};

        result.collections.forEach((collection: AnalyticsCollection) => {
          if (collection.data && Array.isArray(collection.data)) {
            totalRecords += collection.data.length;
            
            // Track data layers with detailed date tracking
            const layers = Array.isArray(collection.dataLayers) ? collection.dataLayers : ['pageviews'];
            layers.forEach(originalLayer => {
              // Use original layer names directly (no mapping needed)
              const layer = originalLayer;
              
              if (!layerStats[layer]) {
                layerStats[layer] = { count: 0, dateRange: '', dates: [] };
              }
              // DON'T add to count here - we'll count unique records after deduplication
              
              // Collect all unique dates for this layer
              const layerDates = collection.data.map(d => d.date);
              layerStats[layer].dates = [...new Set([...layerStats[layer].dates, ...layerDates])].sort();
              
              // Update date range string
              if (layerStats[layer].dates.length > 0) {
                const sortedDates = layerStats[layer].dates.sort();
                layerStats[layer].dateRange = `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`;
              }
            });

            // Convert collection data to unified format
            const unifiedCollectionData = convertToUnifiedFormat(collection.data, layers);
            
            unifiedCollectionData.forEach((record: UnifiedAnalyticsData) => {
              const key = `${record.date}-${record.metric_type}-${record.dimension_type}-${record.dimension_value}`;
              if (seenKeys.has(key)) {
                duplicateCount++;
                // Skip duplicates for now - we'll add user choice later
              } else {
                seenKeys.add(key);
                mergedData.push(record);
              }
            });
          }
        });

        // Update counts in layerStats to reflect unique records only
        // Count all records that belong to each layer's date range
        Object.keys(layerStats).forEach(layer => {
          const layerDateSet = new Set(layerStats[layer].dates);
          
          if (layer === 'geographic') {
            // Count geographic records (users by country) within this layer's date range
            layerStats[layer].count = mergedData.filter(record => 
              record.metric_type === 'users' && layerDateSet.has(record.date)
            ).length;
          } else if (layer === 'pageviews') {
            // Count pageview records within this layer's date range
            layerStats[layer].count = mergedData.filter(record => 
              record.metric_type === 'pageviews' && layerDateSet.has(record.date)
            ).length;
          } else {
            // For other layers, count by date range only
            layerStats[layer].count = mergedData.filter(record => layerDateSet.has(record.date)).length;
          }
        });

        setAllData(mergedData);
        setDuplicateStats({
          total: totalRecords,
          unique: mergedData.length,
          duplicates: duplicateCount
        });
        setDataLayers(layerStats);
        setError(null);
        
        // Also load quota information
        try {
          const quotaResponse = await fetch('/api/analytics/quota');
          if (quotaResponse.ok) {
            const quotaResult = await quotaResponse.json();
            if (quotaResult.success) {
              setQuotaInfo(quotaResult.quota);
            }
          }
        } catch (quotaError) {
          console.log('Could not load quota info:', quotaError);
        }
      } else {
        throw new Error(result.error || 'Failed to load collections');
      }
    } catch (error: any) {
      console.error('Error loading collections:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  // Function to download master spreadsheet as CSV
  const handleDownloadMasterSpreadsheet = () => {
    try {
      if (!allData || allData.length === 0) {
        alert('No data available in master spreadsheet');
        return;
      }

      // Create CSV content with unified long format
      const headers = ['Date', 'Metric Type', 'Dimension Type', 'Dimension Value', 'Metric Value'];
      const csvContent = [
        headers.join(','),
        ...allData.map(row => [
          row.date,
          row.metric_type,
          row.dimension_type,
          `"${row.dimension_value}"`, // Quote dimension values to handle commas
          row.metric_value
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `master-analytics-spreadsheet-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Successfully downloaded master spreadsheet with ${allData.length} total records!`);
    } catch (error) {
      console.error('Error downloading master spreadsheet:', error);
      alert('Failed to download master spreadsheet');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="pl-64 p-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-medium">Loading master spreadsheet...</p>
          <p className="text-sm text-muted-foreground mt-2">Retrieving all saved collections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.push(`/dashboard/analytics/tool/${toolId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Climate Watch
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-3">
                <Database className="w-8 h-8 text-primary" />
                <span>Master Analytics Spreadsheet</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Complete view of all collected analytics data merged into one master dataset
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={loadCollections} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleDownloadMasterSpreadsheet}>
              <Download className="w-4 h-4 mr-2" />
              Download Master Spreadsheet
            </Button>
          </div>
        </div>
      </div>

      {/* Visual Data Tracker */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900">
            <Zap className="w-6 h-6" />
            <span>Data Collection Tracker [BLUE BAR SYNC V2.9]</span>
          </CardTitle>
          <p className="text-blue-700">BLUE BAR SYNC: Making timeline header use exact same positioning logic as blue bars</p>
        </CardHeader>
        <CardContent>
          {/* Timeline Data Tracker */}
          <DataTimelineTracker dataLayers={dataLayers} allData={allData} />

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Last Update</span>
              </div>
              <p className="text-blue-900 font-bold text-sm mt-1">
                {collections.length > 0 ? new Date(collections[0].createdAt).toLocaleString() : 'No updates'}
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Total Records</span>
              </div>
              <p className="text-green-900 font-bold text-sm mt-1">
                {duplicateStats.unique.toLocaleString()} unique
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">API Tokens</span>
              </div>
              <p className="text-yellow-900 font-bold text-sm mt-1">
                {quotaInfo ? (
                  <span className={quotaInfo.remaining < 1000 ? 'text-red-600' : 'text-green-600'}>
                    {quotaInfo.remaining.toLocaleString()} left
                  </span>
                ) : 'Checking...'}
              </p>
              {quotaInfo && (
                <p className="text-xs text-gray-500 mt-1">
                  Resets: {new Date(quotaInfo.resetTime).toLocaleTimeString()}
                </p>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}



      {/* Collections History */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Collection History</CardTitle>
          <p className="text-sm text-muted-foreground">
            History of all data collection sessions
          </p>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No collections found. Start by collecting some data!</p>
              <Button onClick={() => router.push(`/dashboard/analytics/tool/${toolId}`)} className="mt-4">
                Start Data Collection
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool Name</TableHead>
                    <TableHead>Collection Date</TableHead>
                    <TableHead>Time Period</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Data Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell className="font-medium">{collection.toolName}</TableCell>
                      <TableCell>{new Date(collection.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{collection.timePeriod}</TableCell>
                      <TableCell>{collection.totalRecords.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={collection.dataSource === 'google-analytics' ? 'default' : 'secondary'}>
                          {collection.dataSource}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{collection.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Master Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Master Dataset</CardTitle>
          <p className="text-sm text-muted-foreground">
            {allData.length.toLocaleString()} unique records from all collections merged together. Duplicates automatically removed. This is your complete analytics master spreadsheet.
          </p>
        </CardHeader>
        <CardContent>
          {allData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No data in master spreadsheet yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Metric Type</TableHead>
                  <TableHead>Dimension Type</TableHead>
                  <TableHead>Dimension Value</TableHead>
                  <TableHead>Metric Value</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  {allData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="max-w-xs truncate" title={row.metric_type}>
                        {row.metric_type}
                      </TableCell>
                      <TableCell>{row.dimension_type}</TableCell>
                      <TableCell className="max-w-xs truncate" title={row.dimension_value}>
                        {row.dimension_value}
                      </TableCell>
                      <TableCell>{row.metric_value?.toLocaleString() || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}