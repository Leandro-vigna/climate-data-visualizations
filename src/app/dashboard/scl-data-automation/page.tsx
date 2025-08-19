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
  [key: string]: any; // Dynamic interface to handle all columns from Google Sheet
}

interface DataSource {
  [key: string]: any; // Dynamic interface to handle all columns from Google Sheet
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

  // SharePoint data states
  const [sharepointData, setSharepointData] = useState<{[key: string]: {
    idFilePublicationDate?: string;
    idFileLastAccessed?: string;
    error?: string;
    loading?: boolean;
  }}>({});
  const [loadingSharepointIds, setLoadingSharepointIds] = useState<Set<string>>(new Set());

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
    
    console.log('=== DATA PROCESSING DEBUG ===');
    console.log('Processing indicators:', indicators.length);
    console.log('Available data sources:', sources.length);
    console.log('Sample data source keys:', sources.length > 0 ? Object.keys(sources[0]) : []);
    console.log('Sample indicator keys:', indicators.length > 0 ? Object.keys(indicators[0]) : []);
    console.log('Sample indicator data:', indicators.length > 0 ? indicators[0] : {});
    
    // Debug specific problematic indicator
    const x_fin_12 = indicators.find(ind => (ind.id || ind.a || '').includes('X-FIN-12'));
    if (x_fin_12) {
      console.log('=== X-FIN-12 DEBUG ===');
      console.log('Raw X-FIN-12 data:', x_fin_12);
      console.log('All X-FIN-12 keys:', Object.keys(x_fin_12));
      console.log('Source field value:', x_fin_12.source || x_fin_12.q || 'NO SOURCE');
    }
    
    // Debug data sources that might match
    const biodiversitySource = sources.find(src => 
      (src.name || '').toLowerCase().includes('biodiversity') || 
      (src.name || '').toLowerCase().includes('comprehensive')
    );
    if (biodiversitySource) {
      console.log('=== BIODIVERSITY SOURCE DEBUG ===');
      console.log('Found potential match:', biodiversitySource);
      console.log('Source keys:', Object.keys(biodiversitySource));
      console.log('Last updated variations:', {
        last_updated: biodiversitySource.last_updated,
        last_updated_date: biodiversitySource.last_updated_date,
        lastupdateddate: biodiversitySource.lastupdateddate,
        'last updated date': biodiversitySource['last updated date'],
        'last updated': biodiversitySource['last updated'],
        'Last Updated': biodiversitySource['Last Updated']
      });
    }
    
    indicators.forEach(indicator => {
      const sourceField = indicator.source || indicator.q || '';
      if (sourceField && sourceField.includes(';')) {
        // Split multiple sources by semicolon and create duplicate rows
        const individualSources = sourceField.split(';').map(s => s.trim());
        
        individualSources.forEach(source => {
          // Find matching data source - try flexible matching
          const matchingSource = sources.find(ds => {
            const dsName = ds.name || ds.b || '';
            const dsNameClean = dsName.toLowerCase().trim();
            const sourceClean = source.toLowerCase().trim();
            
            // First try exact match
            if (dsNameClean === sourceClean) {
              return true;
            }
            
            // Then try partial matches but with minimum length requirement
            if (sourceClean.length > 10 && dsNameClean.length > 10) {
              return dsNameClean.includes(sourceClean) || sourceClean.includes(dsNameClean);
            }
            
            return false;
          });
          
          if (matchingSource) {
            console.log(`✅ Matched source "${source}" with: "${matchingSource.name}"`);
            console.log('Matched source full data:', matchingSource);
            console.log(`Last Updated value: ${matchingSource.last_updated || matchingSource.last_updated_date || matchingSource.lastupdateddate || 'Not found'}`);
          } else {
            console.log(`❌ No match found for source: "${source}"`);
            console.log('Available source names:', sources.map(s => s.name).slice(0, 10));
            

          }
          
          processed.push({
            ...indicator,
            individual_source: source,
            source_url: matchingSource?.url || matchingSource?.c || '',
            last_updated_date: matchingSource?.last_updated || matchingSource?.last_updated_date || matchingSource?.lastupdateddate || matchingSource?.['last updated date'] || matchingSource?.['last updated'] || matchingSource?.['Last Updated'] || ''
          });
        });
      } else {
        // Single source
        const matchingSource = sources.find(ds => {
          const dsName = ds.name || ds.b || '';
          const dsNameClean = dsName.toLowerCase().trim();
          const sourceClean = sourceField.toLowerCase().trim();
          
          // First try exact match
          if (dsNameClean === sourceClean) {
            return true;
          }
          
          // Then try partial matches but with minimum length requirement
          // to avoid matching "Overview" with "A Comprehensive Overview of Global Biodiversity Finance"
          if (sourceClean.length > 10 && dsNameClean.length > 10) {
            return dsNameClean.includes(sourceClean) || sourceClean.includes(dsNameClean);
          }
          
          return false;
        });
        
        if (matchingSource) {
          console.log(`✅ Matched single source "${sourceField}" with: "${matchingSource.name}"`);
          console.log('Single source full data:', matchingSource);
          console.log(`Last Updated value: ${matchingSource.last_updated || matchingSource.last_updated_date || matchingSource.lastupdateddate || 'Not found'}`);
        } else {
          console.log(`❌ No match found for single source: "${sourceField}"`);
          console.log('Available source names:', sources.map(s => s.name).slice(0, 10));
        }
        
        processed.push({
          ...indicator,
          individual_source: sourceField,
          source_url: matchingSource?.url || matchingSource?.c || '',
          last_updated_date: matchingSource?.last_updated || matchingSource?.last_updated_date || matchingSource?.['last updated'] || matchingSource?.['Last Updated'] || ''
        });
      }
    });
    
    console.log('Processed data sample:', processed.slice(0, 3));
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

  // Function to fetch SharePoint data for a specific indicator
  const fetchSharepointData = async (row: ProcessedIndicator) => {
    const rowKey = `${row.id || row.a}-${row.individual_source}`;
    const dataFile = row.data_file || row.t || '';
    const sourceName = row.individual_source || '';

    if (!dataFile || !sourceName) {
      setSharepointData(prev => ({
        ...prev,
        [rowKey]: { error: 'Missing data file or source name' }
      }));
      return;
    }

    // Set loading state
    setLoadingSharepointIds(prev => new Set([...prev, rowKey]));
    setSharepointData(prev => ({
      ...prev,
      [rowKey]: { loading: true }
    }));

    try {
      const response = await fetch('/api/scl-automation/fetch-indicator-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          indicatorKey: dataFile,
          sourceName: sourceName
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSharepointData(prev => ({
          ...prev,
          [rowKey]: {
            idFilePublicationDate: result.data.lastUpdatedDate || '',
            idFileLastAccessed: result.data.lastAccessedDate || '',
            loading: false
          }
        }));
      } else {
        setSharepointData(prev => ({
          ...prev,
          [rowKey]: {
            error: result.error || 'Failed to fetch data',
            loading: false
          }
        }));
      }
    } catch (error: any) {
      console.error('Error fetching SharePoint data:', error);
      setSharepointData(prev => ({
        ...prev,
        [rowKey]: {
          error: `Error: ${error.message}`,
          loading: false
        }
      }));
    } finally {
      setLoadingSharepointIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowKey);
        return newSet;
      });
    }
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
                        <TableHead>Actions</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Individual Source</TableHead>
                        <TableHead>Source URL</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Last Accessed Date</TableHead>
                        <TableHead>Data File</TableHead>
                        <TableHead className="bg-blue-50">ID file: Publication Date of Report</TableHead>
                        <TableHead className="bg-blue-50">ID file: Last Accessed</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.slice(0, 50).map((row, index) => {
                        const rowKey = `${row.id || row.a}-${row.individual_source}`;
                        const sharepointRow = sharepointData[rowKey];
                        const isLoading = loadingSharepointIds.has(rowKey);
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchSharepointData(row)}
                                disabled={isLoading || !row.data_file || !row.individual_source}
                                className="text-xs"
                              >
                                {isLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                                    Loading...
                                  </>
                                ) : (
                                  'Check ID files'
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{row.id || row.a || ''}</TableCell>
                            <TableCell className="max-w-xs truncate" title={row.title || row.c}>{row.title || row.c || ''}</TableCell>
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
                              {row.last_updated_date || row.lastupdateddate || row['last updated date'] || row.last_updated || (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.last_accessed_date || row.s || row['last accessed date'] || (
                                <span className="text-muted-foreground">No date</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.data_file || row.t || (
                                <span className="text-muted-foreground">No file</span>
                              )}
                            </TableCell>
                            <TableCell className="bg-blue-50">
                              {sharepointRow?.idFilePublicationDate ? (
                                <span className="text-green-700 font-medium">{sharepointRow.idFilePublicationDate}</span>
                              ) : sharepointRow?.error ? (
                                <Badge variant="destructive" className="text-xs">
                                  {sharepointRow.error.length > 20 ? `${sharepointRow.error.substring(0, 20)}...` : sharepointRow.error}
                                </Badge>
                              ) : sharepointRow?.loading ? (
                                <div className="flex items-center space-x-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                  <span className="text-xs">Loading...</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Click "Check ID files"</span>
                              )}
                            </TableCell>
                            <TableCell className="bg-blue-50">
                              {sharepointRow?.idFileLastAccessed ? (
                                <span className="text-green-700 font-medium">{sharepointRow.idFileLastAccessed}</span>
                              ) : sharepointRow?.error ? (
                                <Badge variant="destructive" className="text-xs">
                                  {sharepointRow.error.length > 20 ? `${sharepointRow.error.substring(0, 20)}...` : sharepointRow.error}
                                </Badge>
                              ) : sharepointRow?.loading ? (
                                <div className="flex items-center space-x-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                                  <span className="text-xs">Loading...</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Click "Check ID files"</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={(row.status || row.l) === 'Well Off Track' ? 'destructive' : 
                                        (row.status || row.l) === 'Off Track' ? 'secondary' : 
                                        (row.status || row.l) === 'Insufficient Data' ? 'outline' : 'default'}
                              >
                                {row.status || row.l || ''}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                        {outcomeIndicators.length > 0 && Object.keys(outcomeIndicators[0])
                          .filter(key => key !== 'rowNumber')
                          .map((header) => (
                          <TableHead key={header} className="min-w-32">
                            {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outcomeIndicators.slice(0, 50).map((row, index) => (
                        <TableRow key={index}>
                          {Object.keys(outcomeIndicators[0])
                            .filter(key => key !== 'rowNumber')
                            .map((key) => (
                            <TableCell key={key} className="max-w-xs">
                              {key === 'status' ? (
                                <Badge 
                                  variant={row[key] === 'Well Off Track' ? 'destructive' : 
                                          row[key] === 'Off Track' ? 'secondary' : 
                                          row[key] === 'Insufficient Data' ? 'outline' : 'default'}
                                >
                                  {row[key]}
                                </Badge>
                              ) : key.includes('url') && row[key] ? (
                                <a 
                                  href={row[key]} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate">Link</span>
                                </a>
                              ) : (
                                <div className="truncate" title={row[key]}>
                                  {row[key] || ''}
                                </div>
                              )}
                            </TableCell>
                          ))}
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
                        {dataSources.length > 0 && Object.keys(dataSources[0])
                          .filter(key => key !== 'rowNumber')
                          .map((header) => (
                          <TableHead key={header} className="min-w-32">
                            {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataSources.slice(0, 50).map((row, index) => (
                        <TableRow key={index}>
                          {Object.keys(dataSources[0])
                            .filter(key => key !== 'rowNumber')
                            .map((key) => (
                            <TableCell key={key} className="max-w-xs">
                              {key.includes('url') && row[key] ? (
                                <a 
                                  href={row[key]} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span className="truncate">Visit</span>
                                </a>
                              ) : (
                                <div className="truncate" title={row[key]}>
                                  {row[key] || ''}
                                </div>
                              )}
                            </TableCell>
                          ))}
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