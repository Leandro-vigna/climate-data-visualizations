'use client';

import { useSession, signIn } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Download, 
  Eye, 
  Globe,
  Calendar,
  TrendingUp,
  Users,
  MousePointer,
  AlertCircle,
  AlertTriangle
} from "lucide-react";

interface DataTool {
  id: string;
  name: string;
  url: string;
  description?: string;
  googleAnalyticsId?: string;
  status: 'active' | 'inactive';
  progress: {
    googleAnalytics: number;
  };
  createdAt?: string;
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

export default function DataPreviewPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const toolId = params?.toolId as string;
  
  const [dataTool, setDataTool] = useState<DataTool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<PageViewData[]>([]);
  const [dataSource, setDataSource] = useState<'google-analytics' | 'mock-data'>('google-analytics');
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [tokenWarning, setTokenWarning] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [isGeographicData, setIsGeographicData] = useState(false);
  const [isLandingPagesData, setIsLandingPagesData] = useState(false);

  const [collectionSummary, setCollectionSummary] = useState({
    timePeriod: '',
    dataLayers: [] as string[],
    totalRecords: 0,
    dateRange: { start: '', end: '' }
  });



  // Fast fetch function - no retries, fail fast
  const fetchFast = async (url: string): Promise<Response> => {
    console.log('🚀 Making single fast API call...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Request timed out after 30 seconds');
      controller.abort();
    }, 30000); // Increased to 30 second timeout for OAuth requests
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds. This could indicate authentication issues or slow API response.');
      }
      throw error;
    }
  };

  // Load data tool and collection parameters
  const loadData = async () => {
    if (!toolId) return;
    
    // Load data tool
    const savedTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
    const savedTool = savedTools.find((tool: DataTool) => tool.id === toolId);
    
    if (savedTool) {
      setDataTool(savedTool);
    }

    // Get collection parameters from URL
    const timePeriod = searchParams?.get('timePeriod') || '30';
    const startDateParam = searchParams?.get('startDate');
    const endDateParam = searchParams?.get('endDate');
    const batched = searchParams?.get('batched') === '1';
    const dataLayers = searchParams?.get('dataLayers')?.split(',') || ['pageviews'];
    
    // Determine data type being displayed
    setIsGeographicData(dataLayers.includes('geographic'));
    setIsLandingPagesData(dataLayers.includes('landingpages'));
    
    setCollectionSummary({
      timePeriod: startDateParam && endDateParam ? `${startDateParam} → ${endDateParam}` : `${timePeriod} days`,
      dataLayers,
      totalRecords: 0,
      dateRange: startDateParam && endDateParam
        ? { start: startDateParam, end: endDateParam }
        : {
            start: new Date(Date.now() - parseInt(timePeriod) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            end: new Date().toISOString().split('T')[0],
          },
    });

    // Call the real analytics API - fail fast to identify the real issue
    try {
      console.log('🚀 Starting Google Analytics data collection...');
      console.log('🔍 Data layers requested:', dataLayers);
      const apiUrl = (() => {
        const base = new URL('/api/analytics', window.location.origin);
        base.searchParams.set('toolId', toolId);
        base.searchParams.set('dataLayers', dataLayers.join(','));
        if (startDateParam && endDateParam) {
          base.searchParams.set('startDate', startDateParam);
          base.searchParams.set('endDate', endDateParam);
          if (batched) base.searchParams.set('batched', '1');
        } else {
          base.searchParams.set('days', timePeriod);
        }
        return base.toString();
      })();

      const response = await fetchFast(apiUrl);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('✅ Successfully fetched real Google Analytics data!');
          setPreviewData(result.data);
          setDataSource(result.dataSource || 'google-analytics');
          setCollectionSummary(prev => ({ 
            ...prev, 
            totalRecords: result.totalRecords || result.data.length,
            dateRange: result.dateRange || prev.dateRange
          }));
          setError(null);
          setAuthRequired(false);
          
          // Check for token limit warnings  
          const timePeriod = searchParams?.get('timePeriod') || '30';
          if (result.tokenWarning) {
            setTokenWarning({
              show: true,
              message: result.tokenWarning
            });
          } else if (result.data && result.data.length < (parseInt(timePeriod) * 10)) {
            // Heuristic: if we got way fewer records than expected, might be hitting limits
            setTokenWarning({
              show: true,
              message: `Warning: Only received ${result.data.length} records for ${timePeriod} days. This might indicate API rate limits or incomplete data. You may not have complete data for the selected period.`
            });
          } else {
            setTokenWarning({show: false, message: ''});
          }
        } else {
          console.error('Analytics API returned error:', result.error);
          throw new Error(result.error || 'Failed to fetch real data from Google Analytics.');
        }
      } else if (response.status === 401) {
        // Handle OAuth authentication required
        const result = await response.json();
        console.log('❌ Authentication failed:', result);
        
        // Show specific error about service account permissions
        setError('Service account permissions missing! The service account "climate-watch-analytics@climate-watch-analytics.iam.gserviceaccount.com" needs Viewer access to your Google Analytics property. Add it in Google Analytics Admin > Property Settings > User Management.');
        setAuthRequired(true);
      } else {
        console.error('Analytics API request failed:', response.status);
        const result = await response.json();
        throw new Error(result.error || `Google Analytics API error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ Google Analytics connection failed:', error);
      
      // NO MOCK DATA! Show clear error message only
      setError(`Google Analytics connection failed: ${error.message}`);
      setPreviewData([]); // Empty data, no mock
      setDataSource('google-analytics'); // Keep as real source
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [toolId, searchParams, dataSource]);

  const generateMockPreviewData = (timePeriod: string, dataLayers: string[]) => {
    const days = parseInt(timePeriod);
    const mockData: PageViewData[] = [];
    
    // Generate sample data for the last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate data for different pages - including homepage and more realistic pages
      const pages = [
        '/', // Homepage
        '/climate-data',
        '/emissions-data', 
        '/country-profiles',
        '/data-explorer',
        '/downloads',
        '/about',
        '/contact',
        '/api',
        '/documentation',
        '/blog',
        '/news',
        '/research',
        '/publications',
        '/tools',
        '/resources',
        '/help',
        '/faq'
      ];
      
      // Generate multiple records per page per day to show more realistic traffic patterns
      pages.forEach(page => {
        // Generate 1-3 records per page per day to show different traffic sources
        const recordsPerPage = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < recordsPerPage; j++) {
          const pageViews = Math.floor(Math.random() * 500) + 50;
          
          mockData.push({
            date: dateStr,
            page,
            pageViews
          });
        }
      });
    }

    setPreviewData(mockData);
    setCollectionSummary(prev => ({ ...prev, totalRecords: mockData.length }));
  };

  // Function to download full dataset as CSV
  const handleDownloadFullDataset = () => {
    try {
      if (!previewData || previewData.length === 0) {
        alert('No data available to download');
        return;
      }

      // Create CSV content based on data type
      const headers = isGeographicData 
        ? ['Date', 'Country', 'Active Users']
        : isLandingPagesData
        ? ['Date', 'Landing Page', 'Source', 'Medium', 'Sessions']
        : ['Date', 'Page', 'Page Views'];
      
      const csvContent = [
        headers.join(','),
        ...previewData.map(row => {
          if (isGeographicData) {
            const geoRow = row as any;
            return [
              geoRow.date,
              `"${geoRow.country}"`, // Quote country names to handle commas
              geoRow.activeUsers
            ].join(',');
          } else if (isLandingPagesData) {
            const landingRow = row as any;
            return [
              landingRow.date,
              `"${landingRow.landingPage}"`, // Quote landing pages to handle commas
              `"${landingRow.source}"`, // Quote source to handle commas
              `"${landingRow.medium}"`, // Quote medium to handle commas
              landingRow.sessions
            ].join(',');
          } else {
            const pageRow = row as any;
            return [
              pageRow.date,
              `"${pageRow.page}"`, // Quote page paths to handle commas  
              pageRow.pageViews
            ].join(',');
          }
        })
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${dataTool?.name || 'analytics'}-full-dataset-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Successfully downloaded ${previewData.length} records to CSV file!`);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV file');
    }
  };

  const handleConfirmData = async () => {
    if (!dataTool || !session?.user?.email) return;
    
    try {
      // Save the collected data to the database via API
      const collectedData = {
        toolId,
        toolName: dataTool.name,
        timePeriod: collectionSummary.timePeriod,
        dataLayers: collectionSummary.dataLayers,
        data: previewData,
        dataSource: dataSource || 'google-analytics',
        totalRecords: previewData.length
      };

      const response = await fetch('/api/analytics/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save data');
      }

      // Also update tool progress in localStorage for immediate UI feedback
      const savedTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
      const toolIndex = savedTools.findIndex((tool: DataTool) => tool.id === toolId);
      if (toolIndex !== -1) {
        savedTools[toolIndex].progress.googleAnalytics = 100;
        localStorage.setItem('dataTools', JSON.stringify(savedTools));
        window.dispatchEvent(new CustomEvent('dataToolsChanged'));
      }

      alert(`Data collection confirmed and stored permanently!\n\nSaved ${previewData.length} records to the database.`);
      // Redirect to collections/master spreadsheet view under this tool
      router.push(`/dashboard/analytics/tool/${toolId}/collections`);
      
    } catch (error) {
      console.error('Error saving data:', error);
      alert(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRejectData = () => {
    if (confirm('Are you sure you want to reject this data? You can start a new collection with different parameters.')) {
      router.push(`/dashboard/analytics/tool/${toolId}`);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="pl-64 p-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-medium">Checking Google Analytics connection...</p>
          <p className="text-sm text-muted-foreground mt-2">This should be fast - no endless retries</p>
        </div>
      </div>
    );
  }

  if (!dataTool) {
    return (
      <div className="pl-64 p-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Data tool not found</p>
          <Button onClick={() => router.push('/dashboard/analytics')} className="mt-4">
            Back to Analytics
          </Button>
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
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-3">
                <Eye className="w-8 h-8 text-primary" />
                <span>Data Preview</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Review the collected data before confirming
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              <Globe className="w-3 h-3 mr-1" />
              {dataTool.name}
            </Badge>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>Google Analytics {authRequired ? 'Authentication Required' : 'Error'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            
            {authRequired ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Connect with Google Analytics</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Sign in with your Google account to access Climate Watch Analytics data. 
                  You need access to the Google Analytics property to view this data.
                </p>
                <Button 
                  onClick={() => signIn('google')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Sign in with Google
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">To fix this issue:</h4>
                <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
                  <li>Ensure you have access to the Climate Watch Google Analytics property</li>
                  <li>Check that the View ID (175397894) is correct</li>
                  <li>Verify the website has data for the selected time period</li>
                  <li>Try signing out and signing in again to refresh permissions</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Warning */}
      {tokenWarning.show && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-700">
              <AlertCircle className="w-5 h-5" />
              <span>API Limit Warning</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">{tokenWarning.message}</p>
            <div className="mt-3 space-y-2">
              <p className="text-yellow-600 text-sm font-medium">Recommendations:</p>
              <ul className="text-yellow-600 text-sm list-disc list-inside space-y-1">
                <li>Try reducing the time period (7 days instead of 30)</li>
                <li>Wait for API quota to reset (typically daily)</li>
                <li>Consider collecting data in smaller batches</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Collection Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Time Period</span>
              </div>
              <p className="text-2xl font-bold">{collectionSummary.timePeriod}</p>
              <p className="text-sm text-muted-foreground">
                {collectionSummary.dateRange.start} to {collectionSummary.dateRange.end}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-green-500" />
                <span className="font-medium">Data Layers</span>
              </div>
              <p className="text-2xl font-bold">{collectionSummary.dataLayers.length}</p>
              <p className="text-sm text-muted-foreground">
                {collectionSummary.dataLayers.join(', ')}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MousePointer className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Total Records</span>
              </div>
              <p className="text-2xl font-bold">{collectionSummary.totalRecords.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Data points collected</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-orange-500" />
                <span className="font-medium">Data Source</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={dataSource === 'google-analytics' ? 'default' : 'destructive'}>
                  {dataSource === 'google-analytics' ? 'Real Data' : 'Error'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {dataSource === 'google-analytics' ? 'Live Google Analytics data' : 'Failed to load real data'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Limitations Note - Show for Landing Page Traffic */}
      {isLandingPagesData && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Data Collection Limitations</h3>
                <div className="text-sm text-amber-700 space-y-2">
                  <p><strong>Landing Page Traffic Breakdown</strong> includes the following limitations to keep data volume manageable:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Top 50 Landing Pages:</strong> Only the top 50 landing pages by total sessions are included for each day</li>
                    <li><strong>Session Threshold:</strong> Records with fewer than 5 sessions are excluded to reduce noise</li>
                    <li><strong>Source/Medium Breakdown:</strong> Each landing page is broken down by source/medium combinations</li>
                    <li><strong>Daily Aggregation:</strong> Data is grouped by date for time series analysis and spike detection</li>
                  </ul>
                  <p className="text-xs text-amber-600 mt-3">
                    💡 This filtered approach ensures the most relevant traffic insights while staying within API limits
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Data Preview (First 50 Records)</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing a sample of the collected data. All {collectionSummary.totalRecords.toLocaleString()} records will be stored.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* Soft recommendation banner from API preflight */}
            {(collectionSummary as any)?.batchRecommended && (
              <div className="mb-3 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-sm">
                Batch recommended for this range: {(collectionSummary as any)?.batchReason || 'reduce quota/row limit risk'}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>
                    {isGeographicData ? 'Country' : isLandingPagesData ? 'Landing Page' : 'Page'}
                  </TableHead>
                  {isLandingPagesData ? (
                    <>
                      <TableHead>Source</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead>Sessions</TableHead>
                    </>
                  ) : (
                    <TableHead>{isGeographicData ? 'Active Users' : 'Page Views'}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 50).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell>
                      {isGeographicData ? (row as any).country : 
                       isLandingPagesData ? (row as any).landingPage : 
                       (row as any).page}
                    </TableCell>
                    {isLandingPagesData ? (
                      <>
                        <TableCell>{(row as any).source}</TableCell>
                        <TableCell>{(row as any).medium}</TableCell>
                        <TableCell>{(row as any).sessions?.toLocaleString()}</TableCell>
                      </>
                    ) : (
                      <TableCell>
                        {isGeographicData ? (row as any).activeUsers?.toLocaleString() : (row as any).pageViews?.toLocaleString()}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleRejectData}>
            <XCircle className="w-4 h-4 mr-2" />
            Reject Data
          </Button>
          <Button variant="outline" onClick={handleDownloadFullDataset}>
            <Download className="w-4 h-4 mr-2" />
            Download Full Dataset
          </Button>
        </div>
        
        <Button onClick={handleConfirmData} size="lg">
          <CheckCircle className="w-4 h-4 mr-2" />
          Save Collected Data & Merge to Master Spreadsheet
        </Button>
      </div>
    </div>
  );
} 