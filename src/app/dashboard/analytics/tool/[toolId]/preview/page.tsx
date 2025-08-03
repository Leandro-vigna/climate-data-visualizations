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
  AlertCircle
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
  uniquePageViews: number;
  country: string;
  source: string;
  medium: string;
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
    const dataLayers = searchParams?.get('dataLayers')?.split(',') || ['pageviews'];
    
    setCollectionSummary({
      timePeriod: `${timePeriod} days`,
      dataLayers,
      totalRecords: 0,
      dateRange: {
        start: new Date(Date.now() - parseInt(timePeriod) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    });

    // Call the real analytics API - fail fast to identify the real issue
    try {
      console.log('🚀 Starting Google Analytics data collection...');
      const response = await fetchFast(`/api/analytics?days=${timePeriod}&toolId=${toolId}`);
      
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
          const uniqueViews = Math.floor(pageViews * (0.7 + Math.random() * 0.3)); // 70-100% of page views
          
          mockData.push({
            date: dateStr,
            page,
            pageViews,
            uniquePageViews: uniqueViews,
            country: ['United States', 'United Kingdom', 'Germany', 'Canada', 'Australia', 'France', 'Netherlands', 'Sweden', 'Norway', 'Denmark'][Math.floor(Math.random() * 10)],
            source: ['google', 'direct', 'twitter.com', 'linkedin.com', 'newsletter', 'facebook.com', 'reddit.com', 'bing', 'yahoo', 'organic'][Math.floor(Math.random() * 10)],
            medium: ['organic', '(none)', 'referral', 'social', 'email', 'cpc', 'display', 'affiliate'][Math.floor(Math.random() * 8)]
          });
        }
      });
    }

    setPreviewData(mockData);
    setCollectionSummary(prev => ({ ...prev, totalRecords: mockData.length }));
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
      router.push(`/dashboard/analytics/tool/${toolId}`);
      
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Page Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 50).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell>{row.page}</TableCell>
                    <TableCell>{row.pageViews.toLocaleString()}</TableCell>
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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Sample
          </Button>
        </div>
        
        <Button onClick={handleConfirmData} size="lg">
          <CheckCircle className="w-4 h-4 mr-2" />
          Confirm & Store Data
        </Button>
      </div>
    </div>
  );
} 