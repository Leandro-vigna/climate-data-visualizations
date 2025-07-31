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
  const [isConnecting, setIsConnecting] = useState(false);

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

        {/* Google Analytics Tab */}
        <TabsContent value="google-analytics" className="space-y-6">
          {/* API Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Google Analytics API Connection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ga-id">Google Analytics ID</Label>
                  <Input 
                    id="ga-id" 
                    value={dataTool.googleAnalyticsId}
                    placeholder="GA-XXXXXXXXX"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    className="w-full"
                    disabled={isConnecting}
                    onClick={() => setIsConnecting(true)}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect API
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Layers */}
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
                        {getStatusIcon(layer.status)}
                        <div>
                          <h4 className="font-semibold">{layer.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Last updated: {layer.lastUpdated}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(layer.status)}>
                        {layer.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <Progress value={layer.progress} className="h-2 mb-3" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Metrics: {layer.metrics.join(', ')}</span>
                      <span>Dimensions: {layer.dimensions.join(', ')}</span>
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
              <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Downloads data integration coming soon</p>
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