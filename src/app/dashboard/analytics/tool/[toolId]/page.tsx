'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointer, 
  Globe, 
  Calendar,
  Download,
  Upload,
  Settings,
  Database,
  FileText,
  Mail,
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  Plus,
  ExternalLink,
  Brain,
  Zap,
  ArrowLeft
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTool {
  id: string;
  name: string;
  url: string;
  description?: string;
  googleAnalyticsId?: string;
  status: 'active' | 'inactive';
  progress: {
    googleAnalytics: number;
    downloads: number;
    events: number;
    newsletter: number;
    masterSpreadsheet: number;
    aiAnalysis: number;
  };
  createdAt?: string;
}

interface DataLayer {
  id: string;
  name: string;
  status: 'not-started' | 'connecting' | 'connected' | 'fetching' | 'fetched' | 'validating' | 'validated' | 'processing' | 'processed' | 'integrated';
  progress: number;
  lastUpdated: string;
  metrics: string[];
  dimensions: string[];
}

// Mock data for fallback
const mockTools: DataTool[] = [
  {
    id: '1',
    name: 'Climate Watch Data',
    url: 'https://www.climatewatchdata.org',
    status: 'active',
    progress: {
      googleAnalytics: 75,
      downloads: 30,
      events: 45,
      newsletter: 20,
      masterSpreadsheet: 60,
      aiAnalysis: 25
    }
  },
  {
    id: '2',
    name: 'WRI Data Explorer',
    url: 'https://data.wri.org',
    status: 'inactive',
    progress: {
      googleAnalytics: 0,
      downloads: 0,
      events: 0,
      newsletter: 0,
      masterSpreadsheet: 0,
      aiAnalysis: 0
    }
  }
];

const mockDataLayers: DataLayer[] = [
  {
    id: '1',
    name: 'Daily Pageviews',
    status: 'processed',
    progress: 100,
    lastUpdated: '2024-01-15',
    metrics: ['pageviews', 'sessions'],
    dimensions: ['date', 'pagePath']
  },
  {
    id: '2',
    name: 'Referrer Sessions',
    status: 'fetched',
    progress: 80,
    lastUpdated: '2024-01-14',
    metrics: ['sessions', 'bounceRate'],
    dimensions: ['source', 'medium', 'campaign']
  },
  {
    id: '3',
    name: 'Geographic Sessions',
    status: 'connecting',
    progress: 20,
    lastUpdated: '2024-01-13',
    metrics: ['sessions', 'users'],
    dimensions: ['country', 'city']
  }
];

export default function DataToolPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  const router = useRouter();
  const params = useParams();
  const toolId = params?.toolId as string;
  
  const [dataTool, setDataTool] = useState<DataTool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('30');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [useBatchedMode, setUseBatchedMode] = useState<boolean>(false);
  const [selectedDataLayers, setSelectedDataLayers] = useState({
    pageviews: true,
    users: false,
    traffic: false,
    events: false,
    geographic: false,
    landingpages: false
  });
  const [isCollecting, setIsCollecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [preflight, setPreflight] = useState<{
    rowCount: number | null;
    quota: any | null;
    recommended: boolean;
    reason: string | null;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
  } | null>(null);
  
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [isCollectingData, setIsCollectingData] = useState(false);
  const [dataResults, setDataResults] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Load data tool from localStorage or mock data
  useEffect(() => {
    const loadDataTool = () => {
      // First check localStorage for saved tools
      const savedTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
      const savedTool = savedTools.find((tool: DataTool) => tool.id === toolId);
      
      if (savedTool) {
        setDataTool(savedTool);
      } else {
        // Fallback to mock data
        const mockTool = mockTools.find(tool => tool.id === toolId);
        setDataTool(mockTool || null);
      }
      setIsLoading(false);
    };

    loadDataTool();
  }, [toolId]);

  // Delete data tool function
  const handleDelete = () => {
    if (!dataTool) return;
    
    if (confirm(`Are you sure you want to delete "${dataTool.name}"? This action cannot be undone.`)) {
      // Remove from localStorage
      const savedTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
      const updatedTools = savedTools.filter((tool: DataTool) => tool.id !== toolId);
      localStorage.setItem('dataTools', JSON.stringify(updatedTools));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('dataToolsChanged'));
      
      // Navigate back to main analytics page
      router.push('/dashboard/analytics');
    }
  };

  // Test connection function
  const testConnection = async () => {
    if (!dataTool?.googleAnalyticsId) {
      setTestResult({
        success: false,
        message: 'No Google Analytics Property ID configured',
        error: 'Please configure a Property ID first'
      });
      return;
    }

    setIsConnecting(true);
    setTestResult(null);

    try {
      console.log('🧪 Testing Google Analytics connection...');
      const response = await fetch(`/api/analytics?days=1&toolId=${dataTool.googleAnalyticsId}`);
      const result = await response.json();

      if (result.success) {
        setTestResult({
          success: true,
          message: `✅ Connection successful! Found ${result.totalRecords || 0} records.`,
        });
        console.log('✅ Test connection successful:', result);
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed',
          error: result.serviceAccountError || result.note
        });
        console.log('❌ Test connection failed:', result);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error occurred during test',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Test connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle data collection
  const handleDataCollection = () => {
    if (!dataTool) return;

    const selectedLayers = Object.entries(selectedDataLayers)
      .filter(([_, selected]) => selected)
      .map(([layer, _]) => layer);

    if (selectedLayers.length === 0) {
      alert('Please select at least one data layer to collect.');
      return;
    }

    const timePeriodText = selectedTimePeriod === '7' ? '7 days' : 
                          selectedTimePeriod === '30' ? '30 days' : 
                          selectedTimePeriod === '90' ? '90 days' : `${customStartDate} → ${customEndDate}`;

    const confirmationMessage = `Start data collection for "${dataTool.name}"?\n\n` +
      `Time Period: Last ${timePeriodText}\n` +
      `Data Layers: ${selectedLayers.join(', ')}\n\n` +
      `This will collect data from Google Analytics and show you a preview.`;

    if (confirm(confirmationMessage)) {
      setIsCollecting(true);
      
      // Simulate data collection process
      setTimeout(() => {
        setIsCollecting(false);
        
        // Navigate to preview page with collection parameters
        const params = new URLSearchParams();
        params.set('dataLayers', selectedLayers.join(','));
        if (selectedTimePeriod === 'custom') {
          params.set('startDate', customStartDate);
          params.set('endDate', customEndDate);
          if (useBatchedMode) params.set('batched', '1');
        } else {
          params.set('timePeriod', selectedTimePeriod);
        }
        
        router.push(`/dashboard/analytics/tool/${toolId}/preview?${params.toString()}`);
      }, 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not-started': return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'connecting': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fetching': return <Download className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'fetched': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'validating': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'validated': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'processed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'integrated': return <Database className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-started': return 'bg-muted text-muted-foreground';
      case 'connecting':
      case 'fetching':
      case 'validating':
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'connected':
      case 'fetched':
      case 'validated':
      case 'processed':
      case 'integrated': return 'bg-green-100 text-green-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="pl-64 flex justify-center items-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading Data Tool...</span>
        </div>
      </div>
    );
  }

  if (!dataTool) {
    return (
      <div className="pl-64 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Data Tool Not Found</h2>
          <Button onClick={() => router.push('/dashboard/analytics')}>
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
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard/analytics')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-3">
                <Globe className="w-8 h-8 text-primary" />
                <span>{dataTool.name}</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                {dataTool.url}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={dataTool.status === 'active' ? 'default' : 'secondary'}>
              {dataTool.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/analytics/tool/${toolId}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Overall Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Analytics</span>
                </span>
                <span>{dataTool.progress.googleAnalytics}%</span>
              </div>
              <Progress value={dataTool.progress.googleAnalytics} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <Download className="w-3 h-3" />
                  <span>Downloads</span>
                </span>
                <span>{dataTool.progress.downloads}%</span>
              </div>
              <Progress value={dataTool.progress.downloads} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <CalendarDays className="w-3 h-3" />
                  <span>Events</span>
                </span>
                <span>{dataTool.progress.events}%</span>
              </div>
              <Progress value={dataTool.progress.events} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span>Newsletter</span>
                </span>
                <span>{dataTool.progress.newsletter}%</span>
              </div>
              <Progress value={dataTool.progress.newsletter} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <Database className="w-3 h-3" />
                  <span>Master Data</span>
                </span>
                <span>{dataTool.progress.masterSpreadsheet}%</span>
              </div>
              <Progress value={dataTool.progress.masterSpreadsheet} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1">
                  <Brain className="w-3 h-3" />
                  <span>AI Analysis</span>
                </span>
                <span>{dataTool.progress.aiAnalysis}%</span>
              </div>
              <Progress value={dataTool.progress.aiAnalysis} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access - Master Spreadsheet */}
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-900">
            <Database className="w-6 h-6" />
            <span>Master Analytics Spreadsheet</span>
          </CardTitle>
          <p className="text-green-700">
            View your complete consolidated analytics dataset with timeline visualization and download options.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-green-800">
                <p className="font-medium">Progress: {dataTool.progress.masterSpreadsheet}%</p>
                <p className="text-green-600">All collected data layers merged and deduplicated</p>
              </div>
            </div>
            <Button 
              onClick={() => router.push(`/dashboard/analytics/tool/${toolId}/collections`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Database className="w-4 h-4 mr-2" />
              View Master Spreadsheet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="google-analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="google-analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Google Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Downloads</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4" />
            <span>Events</span>
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Newsletter</span>
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>AI Analysis</span>
          </TabsTrigger>
        </TabsList>

        {/* Google Analytics Tab Content */}
        <TabsContent value="google-analytics" className="space-y-6">
          {/* API Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Google Analytics API Connection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ga-id">Google Analytics Property ID</Label>
                <Input 
                  id="ga-id" 
                  placeholder="e.g., 325582229"
                  value={dataTool?.googleAnalyticsId || ''}
                  readOnly
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This is the Property ID configured for this data tool.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testConnection}
                disabled={isConnecting}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                {isConnecting ? 'Testing...' : 'Test Connection'}
              </Button>
              
              {/* Test Result Display */}
              {testResult && (
                <div className={`mt-3 p-3 rounded-lg border ${
                  testResult.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.error && (
                    <p className="text-sm mt-1 opacity-75">{testResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Collection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Collection Setup</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure the time period and data layers you want to collect from Google Analytics.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Period Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Time Period</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    variant={selectedTimePeriod === '7' ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto p-3 flex flex-col items-center"
                    onClick={() => setSelectedTimePeriod('7')}
                  >
                    <Calendar className="w-4 h-4 mb-1" />
                    <span className="text-xs">Last 7 days</span>
                  </Button>
                  <Button 
                    variant={selectedTimePeriod === '30' ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto p-3 flex flex-col items-center"
                    onClick={() => setSelectedTimePeriod('30')}
                  >
                    <Calendar className="w-4 h-4 mb-1" />
                    <span className="text-xs">Last 30 days</span>
                  </Button>
                  <Button 
                    variant={selectedTimePeriod === '90' ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto p-3 flex flex-col items-center"
                    onClick={() => setSelectedTimePeriod('90')}
                  >
                    <Calendar className="w-4 h-4 mb-1" />
                    <span className="text-xs">Last 90 days</span>
                  </Button>
                  <Button 
                    variant={selectedTimePeriod === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    className="h-auto p-3 flex flex-col items-center"
                    onClick={() => setSelectedTimePeriod('custom')}
                  >
                    <Calendar className="w-4 h-4 mb-1" />
                    <span className="text-xs">Custom Range</span>
                  </Button>
                </div>
                {selectedTimePeriod === 'custom' && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <Label className="text-sm mb-1">Start date</Label>
                      <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        max={customEndDate}
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label className="text-sm mb-1">End date</Label>
                      <input
                        type="date"
                        className="border rounded px-3 py-2"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        min={customStartDate}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <label className="flex items-center space-x-2 mt-7">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={useBatchedMode}
                        onChange={(e) => setUseBatchedMode(e.target.checked)}
                      />
                      <span className="text-sm">Batched mode (recommended for long ranges)</span>
                    </label>
                  </div>
                )}

              {/* Preflight panel */}
              {selectedTimePeriod === 'custom' && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        setPreflight(null);
                        const url = new URL('/api/analytics', window.location.origin);
                        url.searchParams.set('startDate', customStartDate);
                        url.searchParams.set('endDate', customEndDate);
                        url.searchParams.set('onlyPreflight', '1');
                        // Use landingpages if selected to size correctly; else use pageviews
                        const selectedLayers = Object.entries(selectedDataLayers)
                          .filter(([_, s]) => s)
                          .map(([k]) => k);
                        url.searchParams.set('dataLayers', selectedLayers.join(',') || 'pageviews');
                        const resp = await fetch(url.toString());
                        const json = await resp.json();
                        setPreflight({
                          rowCount: json.rowCount ?? null,
                          quota: json.quota ?? null,
                          recommended: !!json.batchRecommended,
                          reason: json.batchReason ?? null,
                        });
                      } catch (e) {
                        console.log('Preflight failed', e);
                        setPreflight({ rowCount: null, quota: null, recommended: false, reason: 'Preflight failed' });
                      }
                    }}
                  >
                    Estimate size & quota
                  </Button>

                  {preflight && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div>
                        <span className="font-medium">Estimated rows:</span> {preflight.rowCount?.toLocaleString?.() || 'unknown'}
                      </div>
                      {preflight.quota && (
                        <div>
                          <span className="font-medium">Quota remaining:</span>
                          {` hour=${preflight.quota.tokensPerHour?.remaining ?? 'n/a'}, day=${preflight.quota.tokensPerDay?.remaining ?? 'n/a'}`}
                        </div>
                      )}
                      {preflight.recommended && (
                        <div className="text-blue-700">
                          Batch recommended: {preflight.reason || 'to reduce quota/row-limit risk'}
                        </div>
                      )}
                      {preflight.recommended && (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={useBatchedMode}
                            onChange={(e) => setUseBatchedMode(e.target.checked)}
                          />
                          <span>Enable batched mode</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Data Layer Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Data Layers to Collect</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      id="pageviews" 
                      className="w-4 h-4"
                      checked={selectedDataLayers.pageviews}
                      onChange={(e) => setSelectedDataLayers(prev => ({ ...prev, pageviews: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="pageviews" className="font-medium">Page Views</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily page views by page, country, and traffic source
                      </p>
                    </div>
                    <Badge variant="secondary">Core</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      id="users" 
                      className="w-4 h-4"
                      checked={selectedDataLayers.users}
                      onChange={(e) => setSelectedDataLayers(prev => ({ ...prev, users: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="users" className="font-medium">User Engagement</Label>
                      <p className="text-sm text-muted-foreground">
                        Session duration, bounce rate, pages per session
                      </p>
                    </div>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      id="traffic" 
                      className="w-4 h-4"
                      checked={selectedDataLayers.traffic}
                      onChange={(e) => setSelectedDataLayers(prev => ({ ...prev, traffic: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="traffic" className="font-medium">Traffic Sources</Label>
                      <p className="text-sm text-muted-foreground">
                        Referrer data, campaign performance, organic vs paid
                      </p>
                    </div>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      id="events" 
                      className="w-4 h-4"
                      checked={selectedDataLayers.events}
                      onChange={(e) => setSelectedDataLayers(prev => ({ ...prev, events: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="events" className="font-medium">Custom Events</Label>
                      <p className="text-sm text-muted-foreground">
                        Downloads, newsletter signups, tool interactions
                      </p>
                    </div>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      id="geographic" 
                      className="w-4 h-4"
                      checked={selectedDataLayers.geographic}
                      onChange={(e) => setSelectedDataLayers(prev => ({ ...prev, geographic: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="geographic" className="font-medium">Geographic Sessions</Label>
                      <p className="text-sm text-muted-foreground">
                        Sessions per country per day with geographic insights
                      </p>
                    </div>
                    <Badge variant="outline">Optional</Badge>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      id="landingpages" 
                      className="w-4 h-4"
                      checked={selectedDataLayers.landingpages}
                      onChange={(e) => setSelectedDataLayers(prev => ({ ...prev, landingpages: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <Label htmlFor="landingpages" className="font-medium">Landing Page Traffic Breakdown</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily sessions by top 50 landing pages and their source/medium breakdown
                      </p>
                    </div>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                </div>
              </div>

              {/* Collection Button */}
              <div className="pt-4 border-t">
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={isCollecting || !Object.values(selectedDataLayers).some(Boolean)}
                  onClick={handleDataCollection}
                >
                  {isCollecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Collecting Data...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Start Data Collection
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  This will collect the selected data layers and store them in your master dataset.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Layers Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Layers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockDataLayers.map((layer) => (
                  <Card key={layer.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${layer.status === 'processed' ? 'bg-green-500' : layer.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                        <h4 className="font-medium">{layer.name}</h4>
                      </div>
                      <Badge variant={layer.status === 'processed' ? 'default' : 'secondary'}>
                        {layer.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{layer.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${layer.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p><strong>Metrics:</strong> {layer.metrics.join(', ')}</p>
                      <p><strong>Dimensions:</strong> {layer.dimensions.join(', ')}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs with placeholder content */}
        <TabsContent value="downloads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Data Downloads Tracking</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Link to Google Sheet (CSV or Sheet URL)</Label>
                    <input id="downloads-sheet-url" className="border rounded px-3 py-2 w-full" placeholder="https://docs.google.com/spreadsheets/d/..." />
                    <p className="text-xs text-muted-foreground">You can paste a CSV export link or a normal Sheets link. We will fetch and aggregate daily downloads.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Or upload CSV</Label>
                    <input id="downloads-csv-file" type="file" accept=".csv,text/csv" className="border rounded px-3 py-2 w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Start date</Label>
                    <input id="downloads-start-date" type="date" className="border rounded px-3 py-2 w-full" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">End date</Label>
                    <input id="downloads-end-date" type="date" className="border rounded px-3 py-2 w-full" max={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div>
                  <Button
                    onClick={async () => {
                      const url = (document.getElementById('downloads-sheet-url') as HTMLInputElement)?.value?.trim();
                      const fileInput = document.getElementById('downloads-csv-file') as HTMLInputElement;
                      const start = (document.getElementById('downloads-start-date') as HTMLInputElement)?.value || undefined;
                      const end = (document.getElementById('downloads-end-date') as HTMLInputElement)?.value || undefined;
                      let payload: any = { startDate: start, endDate: end };
                      if (url) {
                        payload.url = url;
                      } else if (fileInput?.files && fileInput.files[0]) {
                        const text = await fileInput.files[0].text();
                        payload.csvContent = text;
                      } else {
                        alert('Provide a link or upload a CSV');
                        return;
                      }
                      const resp = await fetch('/api/downloads/collect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                      const json = await resp.json();
                      if (!resp.ok || !json.success) {
                        alert(json.error || 'Failed to collect downloads');
                        return;
                      }
                      // Store temporary preview in sessionStorage for preview screen
                      sessionStorage.setItem('downloadsPreview', JSON.stringify(json));
                      router.push(`/dashboard/analytics/tool/${toolId}/downloads/preview`);
                    }}
                  >
                    Collect data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5" />
                <span>Events & Activities Tracking</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Events tracking integration coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="newsletter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Newsletter Subscriptions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Newsletter data integration coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI-Powered Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">AI analysis features coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 