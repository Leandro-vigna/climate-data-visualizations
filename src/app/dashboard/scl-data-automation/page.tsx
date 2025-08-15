'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Calendar,
  Globe,
  FileText,
  TrendingUp
} from "lucide-react";

interface OutcomeIndicator {
  id: string;
  shift: string;
  title: string;
  igntu: string;
  country_magnitude: string;
  target_direction: string;
  acceleration_fac: string;
  status: string;
  chart_mi: string;
  chart_max: string;
  start_year: string;
  end_year: string;
  source: string;
  last_accessed_date: string;
  source_url?: string;
  last_updated_date?: string;
}

interface DataSource {
  provider: string;
  name: string;
  url: string;
  description: string;
  last_updated: string;
}

interface ProcessedIndicator extends OutcomeIndicator {
  individual_source: string;
}

export default function SCLDataAutomationPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  
  // Data states
  const [outcomeIndicators, setOutcomeIndicators] = useState<OutcomeIndicator[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [summaryData, setSummaryData] = useState<ProcessedIndicator[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalIndicators: 0,
    totalSources: 0,
    pendingUpdates: 0,
    lastDataUpdate: ''
  });

  // Load data from APIs
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load Google Sheets data
      const [indicatorsResponse, sourcesResponse] = await Promise.all([
        fetch('/api/scl-automation/outcome-indicators'),
        fetch('/api/scl-automation/data-sources')
      ]);

      if (!indicatorsResponse.ok || !sourcesResponse.ok) {
        const indicatorsError = !indicatorsResponse.ok ? await indicatorsResponse.json() : null;
        const sourcesError = !sourcesResponse.ok ? await sourcesResponse.json() : null;
        
        const errorMsg = indicatorsError?.error || sourcesError?.error || 'Failed to fetch data from Google Sheets';
        throw new Error(errorMsg);
      }

      const indicators = await indicatorsResponse.json();
      const sources = await sourcesResponse.json();

      setOutcomeIndicators(indicators.data || []);
      setDataSources(sources.data || []);

      // Process summary data
      const processed = processSummaryData(indicators.data || [], sources.data || []);
      setSummaryData(processed);

      // Update stats
      setStats({
        totalIndicators: indicators.data?.length || 0,
        totalSources: sources.data?.length || 0,
        pendingUpdates: processed.filter(item => !item.last_updated_date).length,
        lastDataUpdate: new Date().toISOString()
      });

      setLastRefresh(new Date().toLocaleString());
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Process data for Summary Tab
  const processSummaryData = (indicators: OutcomeIndicator[], sources: DataSource[]): ProcessedIndicator[] => {
    const processed: ProcessedIndicator[] = [];
    
    indicators.forEach(indicator => {
      if (indicator.source && indicator.source.includes(',')) {
        // Split multiple sources and create duplicate rows
        const individualSources = indicator.source.split(',').map(s => s.trim());
        
        individualSources.forEach(source => {
          // Find matching data source
          const matchingSource = sources.find(ds => ds.name === source);
          
          processed.push({
            ...indicator,
            individual_source: source,
            source_url: matchingSource?.url || '',
            last_updated_date: matchingSource?.last_updated || ''
          });
        });
      } else {
        // Single source
        const matchingSource = sources.find(ds => ds.name === indicator.source);
        
        processed.push({
          ...indicator,
          individual_source: indicator.source,
          source_url: matchingSource?.url || '',
          last_updated_date: matchingSource?.last_updated || ''
        });
      }
    });
    
    return processed;
  };

  // Download data as CSV
  const handleDownload = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data available to download');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (status === 'loading' || isLoading) {
    return (
      <div className="pl-64 p-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-medium">Loading SCL Data Automation...</p>
          <p className="text-sm text-muted-foreground mt-2">Connecting to Google Sheets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Database className="w-8 h-8 text-primary" />
              <span>SCL Data Automation</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Systems Change Lab data monitoring and collection platform
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>Data Connection Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">To fix this issue:</h4>
              <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
                <li>Make sure you're signed in with your Google account</li>
                <li>Verify Google Sheets API is enabled in your Google Cloud project</li>
                <li>Check that SCL_SPREADSHEET_ID is configured in Replit Secrets</li>
                <li>Try refreshing the page</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Total Indicators</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalIndicators}</p>
            <p className="text-sm text-muted-foreground">Outcome indicators</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="w-4 h-4 text-green-500" />
              <span className="font-medium">Data Sources</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSources}</p>
            <p className="text-sm text-muted-foreground">Connected sources</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="font-medium">Pending Updates</span>
            </div>
            <p className="text-2xl font-bold">{stats.pendingUpdates}</p>
            <p className="text-sm text-muted-foreground">Missing update dates</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Last Refresh</span>
            </div>
            <p className="text-sm font-bold">{lastRefresh || 'Never'}</p>
            <p className="text-sm text-muted-foreground">Data synchronization</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Message */}
      {!error && stats.totalIndicators > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-800">
                ✅ Successfully loaded {stats.totalIndicators} indicators and {stats.totalSources} data sources!
              </span>
            </div>
            <p className="text-sm text-green-700 mt-2">
              Your SCL Data Automation is now connected and ready to use. The Summary Tab shows processed data with individual sources and enriched metadata.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Data Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Data Tables</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary Tab</TabsTrigger>
              <TabsTrigger value="indicators">Outcome Indicators</TabsTrigger>
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Processed data with individual sources and enriched metadata ({summaryData.length} records)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(summaryData, 'scl-summary-data')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Individual Source</TableHead>
                        <TableHead>Source URL</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.slice(0, 50).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.id}</TableCell>
                          <TableCell className="max-w-xs truncate" title={row.title}>{row.title}</TableCell>
                          <TableCell>{row.individual_source}</TableCell>
                          <TableCell>
                            {row.source_url ? (
                              <a 
                                href={row.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Link</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">No URL</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.last_updated_date || (
                              <Badge variant="destructive">Missing</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={row.status === 'Well Off Track' ? 'destructive' : 
                                      row.status === 'Off Track' ? 'secondary' : 'default'}
                            >
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {summaryData.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing first 50 of {summaryData.length} records. Export CSV to view all data.
                  </p>
                )}
              </div>
            </TabsContent>
            
            {/* Outcome Indicators Tab */}
            <TabsContent value="indicators">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Direct mirror of SCL Metadata 2025 > Outcome Indicators tab ({outcomeIndicators.length} records)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(outcomeIndicators, 'outcome-indicators')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Target Direction</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last Accessed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outcomeIndicators.slice(0, 50).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.id}</TableCell>
                          <TableCell>{row.shift}</TableCell>
                          <TableCell className="max-w-xs truncate" title={row.title}>{row.title}</TableCell>
                          <TableCell>{row.country_magnitude}</TableCell>
                          <TableCell>{row.target_direction}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={row.status === 'Well Off Track' ? 'destructive' : 
                                      row.status === 'Off Track' ? 'secondary' : 'default'}
                            >
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={row.source}>{row.source}</TableCell>
                          <TableCell>{row.last_accessed_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {outcomeIndicators.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing first 50 of {outcomeIndicators.length} records. Export CSV to view all data.
                  </p>
                )}
              </div>
            </TabsContent>
            
            {/* Data Sources Tab */}
            <TabsContent value="sources">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Direct mirror of SCL Metadata 2025 > Data Sources tab ({dataSources.length} records)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(dataSources, 'data-sources')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataSources.slice(0, 50).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.provider}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>
                            {row.url ? (
                              <a 
                                href={row.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Visit</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">No URL</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={row.description}>{row.description}</TableCell>
                          <TableCell>{row.last_updated}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {dataSources.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing first 50 of {dataSources.length} records. Export CSV to view all data.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}