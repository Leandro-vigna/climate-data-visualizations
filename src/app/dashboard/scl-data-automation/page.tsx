'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  TrendingUp,
  Network,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  X,
  GripVertical,
  FileCode,
  BookOpen
} from "lucide-react";
import UpdateChecker from "@/app/components/update-checker";
import DataSourceConfig from "@/app/components/DataSourceConfig";
import SystemWriteUpConfig from "@/app/components/SystemWriteUpConfig";

interface OutcomeIndicator {
  [key: string]: any; // Dynamic interface to handle all columns from Google Sheet
}

interface DataSource {
  [key: string]: any; // Dynamic interface to handle all columns from Google Sheet
}

interface ProcessedIndicator extends OutcomeIndicator {
  individual_source: string;
  system?: string;
  type?: 'Outcome' | 'Enabler/Barrier';
  sharedSourceCount?: number;
  sharedSourceIndicators?: Array<{id: string, title: string}>;
}

// Function to determine system based on ID
function getSystemFromId(id: string): string {
  console.log('=== getSystemFromId DEBUG ===');
  console.log('Input ID:', id);
  console.log('ID type:', typeof id);
  
  if (!id) {
    console.log('ID is empty, returning empty string');
    return '';
  }
  
  const idUpper = id.toUpperCase();
  console.log('ID uppercase:', idUpper);
  
  if (idUpper.includes('FIN')) {
    console.log('Matched FIN -> Finance');
    return 'Finance';
  }
  if (idUpper.includes('PWR')) {
    console.log('Matched PWR -> Power');
    return 'Power';
  }
  if (idUpper.includes('TRNS')) {
    console.log('Matched TRNS -> Transport');
    return 'Transport';
  }
  if (idUpper.includes('CR')) {
    console.log('Matched CR -> Carbon Removal');
    return 'Carbon Removal';
  }
  if (idUpper.includes('IN')) {
    console.log('Matched IN -> Industry');
    return 'Industry';
  }
  if (idUpper.includes('CW')) {
    console.log('Matched CW -> Circular Economy');
    return 'Circular Economy';
  }
  if (idUpper.includes('CTY')) {
    console.log('Matched CTY -> Cities');
    return 'Cities';
  }
  if (idUpper.includes('BLDG')) {
    console.log('Matched BLDG -> Buildings');
    return 'Buildings';
  }
  if (idUpper.includes('NE')) {
    console.log('Matched NE -> New Economy');
    return 'New Economy';
  }
  if (idUpper.includes('FA')) {
    console.log('Matched FA -> Food and Agriculture');
    return 'Food and Agriculture';
  }
  if (idUpper.includes('LND')) {
    console.log('Matched LND -> Land and Forests');
    return 'Land and Forests';
  }
  if (idUpper.includes('OC')) {
    console.log('Matched OC -> Oceans');
    return 'Oceans';
  }
  if (idUpper.includes('FW')) {
    console.log('Matched FW -> Freshwater');
    return 'Freshwater';
  }
  
  console.log('No match found, returning Unknown');
  return 'Unknown';
}

// Function to analyze shared sources
function analyzeSharedSources(processedData: ProcessedIndicator[]): ProcessedIndicator[] {
  // Create a map to count sources and track which indicators use each source
  const sourceMap = new Map<string, Array<{id: string, title: string}>>();
  
  // First pass: collect all indicators by source
  processedData.forEach(indicator => {
    const source = indicator.individual_source;
    if (!source) return;
    
    if (!sourceMap.has(source)) {
      sourceMap.set(source, []);
    }
    sourceMap.get(source)!.push({
      id: indicator.id || '',
      title: indicator.title || ''
    });
  });
  
  // Second pass: add shared source information to each indicator
  return processedData.map(indicator => {
    const source = indicator.individual_source;
    const sourceIndicators = sourceMap.get(source) || [];
    const totalCount = sourceIndicators.length;
    
    return {
      ...indicator,
      sharedSourceCount: totalCount > 1 ? totalCount : undefined,
      sharedSourceIndicators: totalCount > 1 ? sourceIndicators : undefined
    };
  });
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
  const [enablerBarrierIndicators, setEnablerBarrierIndicators] = useState<OutcomeIndicator[]>([]);
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

  // Sorting and filtering states
  const [sortLevels, setSortLevels] = useState<Array<{field: string, direction: 'asc' | 'desc'}>>([]);
  const [filters, setFilters] = useState<{[key: string]: string}>({});
  const [showFilters, setShowFilters] = useState(false);

  // Metadata state - store all extracted metadata for display in Metadata tab
  const [extractedMetadata, setExtractedMetadata] = useState<Map<string, any>>(new Map());

  // Column width states
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    update_check: 200,
    actions: 150,
    shared: 80,
    system: 120,
    type: 120,
    id: 100,
    title: 300,
    individual_source: 350, // Made wider by default
    source_url: 100,
    last_updated: 120,
    last_accessed: 140,
    data_file: 150,
    id_file_pub: 200,
    id_file_access: 150,
    status: 120
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);

  // Load data from APIs
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load Google Sheets data
      const [indicatorsResponse, enablerBarrierResponse, sourcesResponse] = await Promise.all([
        fetch('/api/scl-automation/outcome-indicators'),
        fetch('/api/scl-automation/enabler-barrier-indicators'),
        fetch('/api/scl-automation/data-sources')
      ]);

      if (!indicatorsResponse.ok || !enablerBarrierResponse.ok || !sourcesResponse.ok) {
        const indicatorsError = !indicatorsResponse.ok ? await indicatorsResponse.json() : null;
        const enablerBarrierError = !enablerBarrierResponse.ok ? await enablerBarrierResponse.json() : null;
        const sourcesError = !sourcesResponse.ok ? await sourcesResponse.json() : null;
        
        // Log detailed error information
        console.error('API Errors:', {
          indicators: indicatorsError,
          enablerBarrier: enablerBarrierError,
          sources: sourcesError
        });
        
        const errorMsg = indicatorsError?.error || enablerBarrierError?.error || sourcesError?.error || 'Failed to fetch data from Google Sheets';
        
        // Add available sheets info if available
        const availableSheets = enablerBarrierError?.availableSheets || indicatorsError?.availableSheets || sourcesError?.availableSheets;
        if (availableSheets) {
          console.log('Available sheets in spreadsheet:', availableSheets);
        }
        
        throw new Error(errorMsg);
      }

      const indicators = await indicatorsResponse.json();
      const enablerBarrier = await enablerBarrierResponse.json();
      const sources = await sourcesResponse.json();

      console.log('=== API RESPONSE DEBUG ===');
      console.log('Outcome indicators response:', indicators);
      console.log('Enabler/Barrier indicators response:', enablerBarrier);
      console.log('Sources response:', sources);
      console.log('First outcome indicator:', indicators.data?.[0]);
      console.log('First enabler/barrier indicator:', enablerBarrier.data?.[0]);
      console.log('First source:', sources.data?.[0]);

      setOutcomeIndicators(indicators.data || []);
      setEnablerBarrierIndicators(enablerBarrier.data || []);
      setDataSources(sources.data || []);

      // Process summary data for both types
      const outcomeProcessed = processSummaryData(indicators.data || [], sources.data || [], 'Outcome');
      const enablerBarrierProcessed = processSummaryData(enablerBarrier.data || [], sources.data || [], 'Enabler/Barrier');
      
      // Combine both types
      const allProcessed = [...outcomeProcessed, ...enablerBarrierProcessed];
      
      // Analyze shared sources
      const processedWithSharedSources = analyzeSharedSources(allProcessed);
      setSummaryData(processedWithSharedSources);

      // Update stats
      setStats({
        totalIndicators: (indicators.data?.length || 0) + (enablerBarrier.data?.length || 0),
        totalSources: sources.data?.length || 0,
        pendingUpdates: allProcessed.filter(item => !item.last_updated_date).length,
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
  const processSummaryData = (indicators: OutcomeIndicator[], sources: DataSource[], type: 'Outcome' | 'Enabler/Barrier'): ProcessedIndicator[] => {
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
      const sourceField = indicator.source || '';
      if (sourceField && sourceField.includes(';')) {
        // Split multiple sources by semicolon and create duplicate rows
        const individualSources = sourceField.split(';').map((s: string) => s.trim());
        
        individualSources.forEach((source: string) => {
          // Find matching data source - try flexible matching
          const matchingSource = sources.find(ds => {
            const dsName = ds.name || '';
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
          
          console.log('=== PROCESSING INDICATOR DEBUG ===');
          console.log('Indicator object:', indicator);
          console.log('Indicator ID field:', indicator.id);
          console.log('All indicator keys:', Object.keys(indicator));
          const system = getSystemFromId(indicator.id || '');
          console.log('Assigned system:', system);
          
          processed.push({
            ...indicator,
            type: type,
            system: system,
            individual_source: source,
            source_url: matchingSource?.url || '',
            last_updated_date: matchingSource?.last_updated || matchingSource?.last_updated_date || matchingSource?.lastupdateddate || matchingSource?.['last updated date'] || matchingSource?.['last updated'] || matchingSource?.['Last Updated'] || ''
          });
        });
      } else {
        // Single source
        const matchingSource = sources.find(ds => {
          const dsName = ds.name || '';
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
        
        console.log('=== PROCESSING SINGLE SOURCE INDICATOR DEBUG ===');
        console.log('Indicator object:', indicator);
        console.log('Indicator ID field:', indicator.id);
        console.log('All indicator keys:', Object.keys(indicator));
        const system = getSystemFromId(indicator.id || '');
        console.log('Assigned system:', system);
        
        processed.push({
          ...indicator,
          type: type,
          system: system,
          individual_source: sourceField,
          source_url: matchingSource?.url || '',
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

  // Multi-level sorting function
  const handleSort = (field: string, event?: React.MouseEvent) => {
    const isCtrlClick = event?.ctrlKey || event?.metaKey; // Support both Ctrl and Cmd
    
    if (isCtrlClick) {
      // Add as secondary/tertiary sort
      const existingIndex = sortLevels.findIndex(level => level.field === field);
      if (existingIndex >= 0) {
        // Toggle direction of existing sort level
        setSortLevels(prev => prev.map((level, index) => 
          index === existingIndex 
            ? { ...level, direction: level.direction === 'asc' ? 'desc' : 'asc' }
            : level
        ));
      } else {
        // Add new sort level
        setSortLevels(prev => [...prev, { field, direction: 'asc' }]);
      }
    } else {
      // Primary sort behavior
      const existingIndex = sortLevels.findIndex(level => level.field === field);
      
      if (existingIndex === 0) {
        // If this is already the primary sort, toggle direction
        setSortLevels(prev => prev.map((level, index) => 
          index === 0 
            ? { ...level, direction: level.direction === 'asc' ? 'desc' : 'asc' }
            : level
        ));
      } else if (existingIndex > 0) {
        // If this field exists in a lower level, move it to primary and toggle direction
        const existingLevel = sortLevels[existingIndex];
        const newDirection = existingLevel.direction === 'asc' ? 'desc' : 'asc';
        setSortLevels(prev => [
          { field, direction: newDirection },
          ...prev.filter((_, index) => index !== existingIndex)
        ]);
      } else {
        // New primary sort, replace all existing sorts
        setSortLevels([{ field, direction: 'asc' }]);
      }
    }
  };

  // Filtering functions
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const clearAllSorts = () => {
    setSortLevels([]);
  };

  // Column resizing functions
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Resize started for column:', columnKey); // Debug log
    
    setIsResizing(columnKey);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey];
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, Math.min(800, startWidth + diff)); // Min 50px, max 800px
      
      console.log('Resizing column:', columnKey, 'to width:', newWidth); // Debug log
      
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      console.log('Resize ended for column:', columnKey); // Debug log
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
  };


  // Function to format date as months ago with color coding
  const formatDateAsMonthsAgo = (dateString: string) => {
    if (!dateString) return { text: 'No date', color: 'text-gray-500' };
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMonths = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
      
      if (diffInMonths < 0) {
        return { text: 'Future date', color: 'text-blue-500' };
      } else if (diffInMonths === 0) {
        return { text: 'This month', color: 'text-green-600' };
      } else if (diffInMonths === 1) {
        return { text: '1 month ago', color: 'text-green-500' };
      } else if (diffInMonths < 6) {
        return { text: `${diffInMonths} months ago`, color: 'text-green-400' };
      } else if (diffInMonths < 12) {
        return { text: `${diffInMonths} months ago`, color: 'text-yellow-500' };
      } else {
        // 12+ months - convert to years and months
        const years = Math.floor(diffInMonths / 12);
        const remainingMonths = diffInMonths % 12;
        
        let text = '';
        if (years === 1) {
          text = '1 year';
        } else {
          text = `${years} years`;
        }
        
        if (remainingMonths > 0) {
          if (remainingMonths === 1) {
            text += ', 1 month ago';
          } else {
            text += `, ${remainingMonths} months ago`;
          }
        } else {
          text += ' ago';
        }
        
        // Color coding based on total months
        let color = '';
        if (diffInMonths < 24) {
          color = 'text-orange-500';
        } else if (diffInMonths < 36) {
          color = 'text-red-500';
        } else {
          color = 'text-red-700';
        }
        
        return { text, color };
      }
    } catch (error) {
      return { text: 'Invalid date', color: 'text-gray-500' };
    }
  };

  // Remove specific sort level
  const removeSortLevel = (field: string) => {
    setSortLevels(prev => prev.filter(level => level.field !== field));
  };

  // Get sorting icon and priority
  const getSortIcon = (field: string) => {
    const sortLevel = sortLevels.find(level => level.field === field);
    const priority = sortLevels.findIndex(level => level.field === field) + 1;
    
    if (!sortLevel) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeSortLevel(field);
          }}
          className="text-xs font-bold text-blue-600 hover:text-red-600 hover:bg-red-50 rounded px-1 py-0.5 transition-colors"
          title="Click to remove this sort level"
        >
          {priority}
        </button>
        {sortLevel.direction === 'asc' 
          ? <ChevronUp className="w-4 h-4 text-blue-500" />
          : <ChevronDown className="w-4 h-4 text-blue-500" />
        }
      </div>
    );
  };

  // Apply sorting and filtering to data
  const getProcessedData = () => {
    let processed = [...summaryData];

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value.trim() !== '') {
        processed = processed.filter(item => {
          const fieldValue = item[field];
          if (typeof fieldValue === 'string') {
            return fieldValue.toLowerCase().includes(value.toLowerCase());
          }
          if (typeof fieldValue === 'number') {
            return fieldValue.toString().includes(value);
          }
          return false;
        });
      }
    });

    // Apply multi-level sorting
    if (sortLevels.length > 0) {
      processed.sort((a, b) => {
        for (const sortLevel of sortLevels) {
          const aValue = a[sortLevel.field];
          const bValue = b[sortLevel.field];
          
          let comparison = 0;
          
          // Special handling for sharedSourceCount (undefined values should be treated as 0)
          if (sortLevel.field === 'sharedSourceCount') {
            const aNum = aValue || 0;
            const bNum = bValue || 0;
            comparison = aNum - bNum;
          }
          // Handle different data types
          else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          }
          else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          }
          else {
            // Fallback to string comparison
            const aStr = String(aValue || '');
            const bStr = String(bValue || '');
            comparison = aStr.toLowerCase().localeCompare(bStr.toLowerCase());
          }
          
          // Apply sort direction
          const result = sortLevel.direction === 'asc' ? comparison : -comparison;
          
          // If this level has a difference, return it (don't check further levels)
          if (result !== 0) {
            return result;
          }
        }
        
        // If all sort levels are equal, maintain original order
        return 0;
      });
    }

    return processed;
  };

  // Function to fetch SharePoint data for a specific indicator
  const fetchSharepointData = async (row: ProcessedIndicator) => {
    const rowKey = `${row.id}-${row.individual_source}`;
    const dataFile = row.data_file || '';
    const sourceName = row.individual_source || '';

    if (!dataFile || !sourceName) {
      setSharepointData(prev => ({
        ...prev,
        [rowKey]: { error: 'Missing data file or source name' }
      }));
      return;
    }

    // Set loading state
    setLoadingSharepointIds(prev => new Set(Array.from(prev).concat(rowKey)));
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
    // Only load data if session is authenticated
    if (status === 'authenticated') {
      loadData();
    } else if (status !== 'loading') {
      // Session check failed, redirect will happen via useSession
      setIsLoading(false);
    }
    // If status is 'loading', wait for it to resolve
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  // Handle folder path change
  const handleFolderPathChange = (path: string) => {
    // Update the path in sharepoint.ts via API or state
    console.log('Folder path updated:', path);
  };

  // Test Google Sheets connection
  const testSheetsConnection = async () => {
    try {
      const response = await fetch('/api/scl-automation/test-connection');
      const data = await response.json();
      return {
        success: data.success || false,
        message: data.error || 'Connection successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to test connection'
      };
    }
  };

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-6">
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

      {/* Data Source Configuration */}
      <DataSourceConfig
        onFolderPathChange={handleFolderPathChange}
        onSheetsConnectionTest={testSheetsConnection}
      />

      {/* System Write-Up Configuration */}
      <SystemWriteUpConfig />

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary Tab</TabsTrigger>
              <TabsTrigger value="indicators">Outcome Indicators</TabsTrigger>
              <TabsTrigger value="sources">Data Sources</TabsTrigger>
              <TabsTrigger value="metadata">
                <FileCode className="w-4 h-4 mr-2" />
                Metadata
              </TabsTrigger>
            </TabsList>
            
            {/* Summary Tab */}
            <TabsContent value="summary">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Processed data with individual sources and enriched metadata ({getProcessedData().length} of {summaryData.length} records)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(getProcessedData(), 'scl-summary-data')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {/* Filter Controls */}
                {showFilters && (
                  <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Filter by Type</label>
                        <Select value={filters.type || ''} onValueChange={(value) => handleFilterChange('type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Types</SelectItem>
                            <SelectItem value="Outcome">Outcome</SelectItem>
                            <SelectItem value="Enabler/Barrier">Enabler/Barrier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Filter by System</label>
                        <Select value={filters.system || ''} onValueChange={(value) => handleFilterChange('system', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Systems" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Systems</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Power">Power</SelectItem>
                            <SelectItem value="Transport">Transport</SelectItem>
                            <SelectItem value="Carbon Removal">Carbon Removal</SelectItem>
                            <SelectItem value="Industry">Industry</SelectItem>
                            <SelectItem value="Circular Economy">Circular Economy</SelectItem>
                            <SelectItem value="Cities">Cities</SelectItem>
                            <SelectItem value="Buildings">Buildings</SelectItem>
                            <SelectItem value="New Economy">New Economy</SelectItem>
                            <SelectItem value="Food and Agriculture">Food and Agriculture</SelectItem>
                            <SelectItem value="Land and Forests">Land and Forests</SelectItem>
                            <SelectItem value="Oceans">Oceans</SelectItem>
                            <SelectItem value="Freshwater">Freshwater</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Filter by ID</label>
                        <Input
                          placeholder="Search ID..."
                          value={filters.id || ''}
                          onChange={(e) => handleFilterChange('id', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Filter by Title</label>
                        <Input
                          placeholder="Search title..."
                          value={filters.title || ''}
                          onChange={(e) => handleFilterChange('title', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Filter by Source</label>
                        <Input
                          placeholder="Search source..."
                          value={filters.individual_source || ''}
                          onChange={(e) => handleFilterChange('individual_source', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {Object.values(filters).filter(v => v && v.trim() !== '').length} filter(s) applied
                        {sortLevels.length > 0 && (
                          <span className="ml-2">
                            • {sortLevels.length} sort level(s): {sortLevels.map((level, index) => 
                              `${level.field} (${level.direction})`
                            ).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {sortLevels.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllSorts}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Clear Sorts
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                          disabled={Object.values(filters).every(v => !v || v.trim() === '')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
                
                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: columnWidths.update_check }} className="relative group">
                          Update Check
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('update_check', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.actions }} className="relative group">
                          Actions
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('actions', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.shared }} className="relative group">
                          <button
                            onClick={(e) => handleSort('sharedSourceCount', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <Network className="w-4 h-4" />
                            <span>Shared</span>
                            {getSortIcon('sharedSourceCount')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('shared', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.system }} className="relative group">
                          <button
                            onClick={(e) => handleSort('system', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>System</span>
                            {getSortIcon('system')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('system', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.type }} className="relative group">
                          <button
                            onClick={(e) => handleSort('type', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Type</span>
                            {getSortIcon('type')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('type', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.id }} className="relative group">
                          <button
                            onClick={(e) => handleSort('id', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>ID</span>
                            {getSortIcon('id')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('id', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.title }} className="relative group">
                          <button
                            onClick={(e) => handleSort('title', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Title</span>
                            {getSortIcon('title')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('title', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.individual_source }} className="relative group">
                          <button
                            onClick={(e) => handleSort('individual_source', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Individual Source</span>
                            {getSortIcon('individual_source')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('individual_source', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.source_url }} className="relative group">
                          Source URL
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('source_url', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.last_updated }} className="relative group">
                          <button
                            onClick={(e) => handleSort('last_updated_date', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Last Updated</span>
                            {getSortIcon('last_updated_date')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('last_updated', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.last_accessed }} className="relative group">
                          <button
                            onClick={(e) => handleSort('last_accessed_date', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Last Accessed Date</span>
                            {getSortIcon('last_accessed_date')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('last_accessed', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.data_file }} className="relative group">
                          <button
                            onClick={(e) => handleSort('data_file', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Data File</span>
                            {getSortIcon('data_file')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('data_file', e)}
                          />
                        </TableHead>
                        <TableHead className="bg-blue-50 relative group" style={{ width: columnWidths.id_file_pub }}>
                          ID file: Publication Date of Report
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('id_file_pub', e)}
                          />
                        </TableHead>
                        <TableHead className="bg-blue-50 relative group" style={{ width: columnWidths.id_file_access }}>
                          ID file: Last Accessed
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('id_file_access', e)}
                          />
                        </TableHead>
                        <TableHead style={{ width: columnWidths.status }} className="relative group">
                          <button
                            onClick={(e) => handleSort('status', e)}
                            className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
                          >
                            <span>Status</span>
                            {getSortIcon('status')}
                          </button>
                          <div 
                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-auto hover:w-2"
                            onMouseDown={(e) => handleMouseDown('status', e)}
                          />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getProcessedData().slice(0, 50).map((row, index) => {
                        const rowKey = `${row.id}-${row.individual_source}`;
                        const sharepointRow = sharepointData[rowKey];
                        const isLoading = loadingSharepointIds.has(rowKey);
                        
                        return (
                          <TableRow key={index}>
                            <TableCell style={{ width: columnWidths.update_check, minWidth: '250px' }}>
                              {row.data_file ? (
                                <UpdateChecker
                                  indicatorId={row.id || ''}
                                  dataFile={row.data_file || ''}
                                  system={row.system || ''}
                                  sourceUrl={row.source_url || ''}
                                  sourceTitle={row.individual_source || ''}
                                  existingMetadata={extractedMetadata.get(row.id || '') || null}
                                  onMetadataExtracted={(indicatorId, metadata) => {
                                    setExtractedMetadata(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(indicatorId, metadata);
                                      return newMap;
                                    });
                                  }}
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No data file available
                                </span>
                              )}
                            </TableCell>
                            <TableCell style={{ width: columnWidths.actions, minWidth: '150px' }} className="p-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchSharepointData(row)}
                                disabled={isLoading || !row.data_file || !row.individual_source}
                                className="text-xs w-full"
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
                            <TableCell className="text-center" style={{ width: columnWidths.shared }}>
                              {row.sharedSourceCount ? (
                                <div 
                                  className="relative group cursor-help"
                                  title="Source repeated in multiple indicators"
                                >
                                  <Badge 
                                    variant="outline" 
                                    className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors cursor-help"
                                  >
                                    {row.sharedSourceCount}
                                  </Badge>
                                  {/* Tooltip - positioned above for top rows, below for bottom rows */}
                                  <div className={`absolute px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 ${
                                    index < 3 ? 'top-full mt-2' : 'bottom-full mb-2'
                                  }`} 
                                  style={{
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    minWidth: '300px',
                                    maxWidth: '400px',
                                    whiteSpace: 'normal'
                                  }}>
                                    <div className="font-medium mb-1">Shared with:</div>
                                    {row.sharedSourceIndicators?.map((indicator, idx) => (
                                      <div key={idx} className="flex items-start space-x-1 mb-1">
                                        <span className="text-purple-300 flex-shrink-0 mt-0.5">•</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="font-mono text-xs">{indicator.id}</div>
                                          <div className="text-xs text-gray-300 break-words" title={indicator.title}>
                                            {indicator.title}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {/* Arrow pointing to badge */}
                                    <div className={`absolute left-1/2 transform -translate-x-1/2 w-0 h-0 ${
                                      index < 3 
                                        ? 'bottom-full border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900' 
                                        : 'top-full border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'
                                    }`}></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-8 h-6 flex items-center justify-center">
                                  {/* Empty cell for unique sources */}
                                </div>
                              )}
                            </TableCell>
                            <TableCell style={{ width: columnWidths.system }}>
                              <Badge variant="secondary" className="whitespace-nowrap">
                                {row.system || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell style={{ width: columnWidths.type }}>
                              <Badge 
                                variant="outline" 
                                className={`whitespace-nowrap ${
                                  row.type === 'Outcome' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}
                              >
                                {row.type || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium" style={{ width: columnWidths.id }}>{row.id || ''}</TableCell>
                            <TableCell className="max-w-xs truncate" title={row.title} style={{ width: columnWidths.title }}>{row.title || ''}</TableCell>
                            <TableCell style={{ width: columnWidths.individual_source }}>{row.individual_source}</TableCell>
                            <TableCell style={{ width: columnWidths.source_url }}>
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
                            <TableCell style={{ width: columnWidths.last_updated }}>
                              {(() => {
                                const dateValue = row.last_updated_date || row.lastupdateddate || row['last updated date'] || row.last_updated || '';
                                const formatted = formatDateAsMonthsAgo(dateValue);
                                return (
                                  <div className="relative group">
                                    <span className={`font-medium ${formatted.color} cursor-help`}>
                                      {formatted.text}
                                    </span>
                                    {/* Custom tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                      {dateValue || 'No date available'}
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell style={{ width: columnWidths.last_accessed }}>
                              {row.last_accessed_date || row['last accessed date'] || (
                                <span className="text-muted-foreground">No date</span>
                              )}
                            </TableCell>
                            <TableCell style={{ width: columnWidths.data_file }}>
                              {row.data_file || (
                                <span className="text-muted-foreground">No file</span>
                              )}
                            </TableCell>
                            <TableCell className="bg-blue-50" style={{ width: columnWidths.id_file_pub }}>
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
                            <TableCell className="bg-blue-50" style={{ width: columnWidths.id_file_access }}>
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
                            <TableCell style={{ width: columnWidths.status }}>
                              <Badge 
                                variant={row.status === 'Well Off Track' ? 'destructive' : 
                                        row.status === 'Off Track' ? 'secondary' : 
                                        row.status === 'Insufficient Data' ? 'outline' : 'default'}
                              >
                                {row.status || ''}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {getProcessedData().length > 50 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Showing first 50 of {getProcessedData().length} records. Export CSV to view all data.
                  </p>
                )}
                {getProcessedData().length === 0 && Object.values(filters).some(v => v && v.trim() !== '') && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No records match your current filters. Try adjusting your search criteria.
                  </p>
                )}
              </div>
            </TabsContent>
            
            {/* Outcome Indicators Tab */}
            <TabsContent value="indicators">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Direct mirror of SCL Metadata 2025 &gt; Outcome Indicators tab ({outcomeIndicators.length} records)
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
                    Direct mirror of SCL Metadata 2025 &gt; Data Sources tab ({dataSources.length} records)
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

            {/* Metadata Tab - Full width display of all extracted metadata */}
            <TabsContent value="metadata" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <FileCode className="w-5 h-5" />
                      <span>Extracted Metadata</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Metadata extracted from Excel Notes tabs. Click "Check for Updates" on any row in the Summary Tab to extract metadata.
                    </p>
                  </div>
                  {extractedMetadata.size > 0 && (
                    <Badge variant="outline">
                      {extractedMetadata.size} {extractedMetadata.size === 1 ? 'file' : 'files'} processed
                    </Badge>
                  )}
                </div>

                {extractedMetadata.size === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No metadata extracted yet. Go to the Summary Tab and click "Check for Updates" on any row to extract metadata from Excel files.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {Array.from(extractedMetadata.entries()).map(([indicatorId, metadata]) => {
                      // Find the row data to get the title
                      const rowData = summaryData.find(row => row.id === indicatorId);
                      const indicatorTitle = metadata.writeUpInfo?.indicatorName || metadata.dataInfo?.title || rowData?.title || '';
                      
                      return (
                      <Card key={indicatorId}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-5 h-5" />
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">{indicatorId}</span>
                                {indicatorTitle && (
                                  <span className="text-sm font-normal text-muted-foreground">
                                    {indicatorTitle}
                                  </span>
                                )}
                              </div>
                              <Badge variant="outline">{metadata.system}</Badge>
                            </div>
                            <span className="text-sm font-normal text-muted-foreground">
                              {metadata.fileName}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Source Information */}
                          {metadata.sourceInfo && Object.keys(metadata.sourceInfo).length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center">
                                <Database className="w-4 h-4 mr-2" />
                                Source Information
                              </h4>
                              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                                {metadata.sourceInfo.provider && (
                                  <div>
                                    <span className="font-medium">Provider:</span> {metadata.sourceInfo.provider}
                                  </div>
                                )}
                                {metadata.sourceInfo.organization && (
                                  <div>
                                    <span className="font-medium">Organization:</span> {metadata.sourceInfo.organization}
                                  </div>
                                )}
                                {metadata.sourceInfo.website && (
                                  <div>
                                    <span className="font-medium">Website:</span>{' '}
                                    <a href={metadata.sourceInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                      {metadata.sourceInfo.website}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* URLs */}
                          {metadata.urls && (metadata.urls.primaryUrl || metadata.urls.downloadUrl) && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center">
                                <Globe className="w-4 h-4 mr-2" />
                                URLs
                              </h4>
                              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                                {metadata.urls.primaryUrl && (
                                  <div>
                                    <span className="font-medium">Primary URL:</span>{' '}
                                    <a href={metadata.urls.primaryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                      {metadata.urls.primaryUrl}
                                    </a>
                                  </div>
                                )}
                                {metadata.urls.downloadUrl && (
                                  <div>
                                    <span className="font-medium">Download URL:</span>{' '}
                                    <a href={metadata.urls.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                      {metadata.urls.downloadUrl}
                                    </a>
                                  </div>
                                )}
                                {metadata.urls.alternativeUrls && metadata.urls.alternativeUrls.length > 0 && (
                                  <div>
                                    <span className="font-medium">Alternative URLs:</span>
                                    <ul className="list-disc list-inside ml-2 mt-1">
                                      {metadata.urls.alternativeUrls.map((url: string, idx: number) => (
                                        <li key={idx}>
                                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                            {url}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Data Information */}
                          {metadata.dataInfo && Object.keys(metadata.dataInfo).length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Data Information</h4>
                              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                                {metadata.dataInfo.units && (
                                  <div>
                                    <span className="font-medium">Units:</span> {metadata.dataInfo.units}
                                  </div>
                                )}
                                {metadata.dataInfo.frequency && (
                                  <div>
                                    <span className="font-medium">Frequency:</span> {metadata.dataInfo.frequency}
                                  </div>
                                )}
                                {metadata.dataInfo.description && (
                                  <div>
                                    <span className="font-medium">Description:</span> {metadata.dataInfo.description}
                                  </div>
                                )}
                                {metadata.dataInfo.timeRange && (
                                  <div>
                                    <span className="font-medium">Time Range:</span>{' '}
                                    {metadata.dataInfo.timeRange.startYear && metadata.dataInfo.timeRange.endYear
                                      ? `${metadata.dataInfo.timeRange.startYear} - ${metadata.dataInfo.timeRange.endYear}`
                                      : metadata.dataInfo.timeRange.startYear || metadata.dataInfo.timeRange.endYear || 'N/A'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Methodology */}
                          {metadata.methodology && Object.keys(metadata.methodology).length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Methodology</h4>
                              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                                {metadata.methodology.dataCollectionMethod && (
                                  <div>
                                    <span className="font-medium">Collection Method:</span> {metadata.methodology.dataCollectionMethod}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Write-Up Information */}
                          {metadata.writeUpInfo && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center">
                                <BookOpen className="w-4 h-4 mr-2" />
                                Copy Write-Up Information
                                {metadata.writeUpInfo.source && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {metadata.writeUpInfo.source === 'google-doc' ? 'Google Doc' : 'Word Doc'}
                                  </Badge>
                                )}
                              </h4>
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md space-y-3 text-sm">
                                {metadata.writeUpInfo.indicatorName && (
                                  <div>
                                    <span className="font-medium">Indicator Name:</span> {metadata.writeUpInfo.indicatorName}
                                  </div>
                                )}
                                {metadata.writeUpInfo.progressStatus && (
                                  <div>
                                    <span className="font-medium">Progress Status:</span>{' '}
                                    <Badge variant="outline" className="ml-1">
                                      {metadata.writeUpInfo.progressStatus}
                                    </Badge>
                                  </div>
                                )}
                                {metadata.writeUpInfo.narrative && (
                                  <div>
                                    <span className="font-medium">Narrative:</span>
                                    <div className="mt-1 p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                      {metadata.writeUpInfo.narrative}
                                    </div>
                                  </div>
                                )}
                                {metadata.writeUpInfo.metadata && Object.keys(metadata.writeUpInfo.metadata).length > 0 && (
                                  <div>
                                    <span className="font-medium">Metadata Categories from Write-Up:</span>
                                    <div className="mt-2 space-y-3">
                                      {/* Display structured categories */}
                                      {metadata.writeUpInfo.metadata.key_terms && 
                                       String(metadata.writeUpInfo.metadata.key_terms).trim() !== ':' &&
                                       String(metadata.writeUpInfo.metadata.key_terms).trim().length > 0 && (
                                        <div>
                                          <h5 className="font-semibold text-xs mb-1">Key Terms</h5>
                                          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                            {String(metadata.writeUpInfo.metadata.key_terms)}
                                          </div>
                                        </div>
                                      )}
                                      {metadata.writeUpInfo.metadata.historical_data_methodology_and_challenges && 
                                       String(metadata.writeUpInfo.metadata.historical_data_methodology_and_challenges).trim() !== ':' &&
                                       String(metadata.writeUpInfo.metadata.historical_data_methodology_and_challenges).trim().length > 0 && (
                                        <div>
                                          <h5 className="font-semibold text-xs mb-1">Historical Data Methodology and Challenges</h5>
                                          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                            {String(metadata.writeUpInfo.metadata.historical_data_methodology_and_challenges)}
                                          </div>
                                        </div>
                                      )}
                                      {metadata.writeUpInfo.metadata.target_methodology && 
                                       String(metadata.writeUpInfo.metadata.target_methodology).trim() !== ':' &&
                                       String(metadata.writeUpInfo.metadata.target_methodology).trim().length > 0 && (
                                        <div>
                                          <h5 className="font-semibold text-xs mb-1">Target Methodology</h5>
                                          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                            {String(metadata.writeUpInfo.metadata.target_methodology)}
                                          </div>
                                        </div>
                                      )}
                                      {metadata.writeUpInfo.metadata.s_curve_trajectory && 
                                       String(metadata.writeUpInfo.metadata.s_curve_trajectory).trim() !== ':' &&
                                       String(metadata.writeUpInfo.metadata.s_curve_trajectory).trim().length > 0 && (
                                        <div>
                                          <h5 className="font-semibold text-xs mb-1">S-Curve Trajectory</h5>
                                          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                            {String(metadata.writeUpInfo.metadata.s_curve_trajectory)}
                                          </div>
                                        </div>
                                      )}
                                      {metadata.writeUpInfo.metadata.progress_assessment_methodology && 
                                       String(metadata.writeUpInfo.metadata.progress_assessment_methodology).trim() !== ':' &&
                                       String(metadata.writeUpInfo.metadata.progress_assessment_methodology).trim().length > 0 && (
                                        <div>
                                          <h5 className="font-semibold text-xs mb-1">Progress Assessment Methodology</h5>
                                          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                            {String(metadata.writeUpInfo.metadata.progress_assessment_methodology)}
                                          </div>
                                        </div>
                                      )}
                                      {metadata.writeUpInfo.metadata.connections && 
                                       String(metadata.writeUpInfo.metadata.connections).trim() !== ':' &&
                                       String(metadata.writeUpInfo.metadata.connections).trim().length > 0 && (
                                        <div>
                                          <h5 className="font-semibold text-xs mb-1">Connections</h5>
                                          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                            {String(metadata.writeUpInfo.metadata.connections)}
                                          </div>
                                        </div>
                                      )}
                                      {/* Display any other metadata fields that don't match the standard categories */}
                                      {Object.entries(metadata.writeUpInfo.metadata)
                                        .filter(([key]) => !['key_terms', 'historical_data_methodology_and_challenges', 'target_methodology', 's_curve_trajectory', 'progress_assessment_methodology', 'connections'].includes(key))
                                        .filter(([key, value]) => {
                                          // Filter out empty values, colons, or whitespace-only content
                                          const strValue = Array.isArray(value) ? value.join('') : String(value);
                                          return strValue && strValue.trim() && strValue.trim() !== ':';
                                        })
                                        .map(([key, value]) => (
                                          <div key={key}>
                                            <h5 className="font-semibold text-xs mb-1 capitalize">{key.replace(/_/g, ' ')}</h5>
                                            <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                                              {Array.isArray(value) ? value.join(', ') : String(value)}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                                {metadata.writeUpInfo.contradictions && metadata.writeUpInfo.contradictions.length > 0 && (
                                  <div>
                                    <span className="font-medium text-yellow-700">⚠️ Contradictions Detected:</span>
                                    <div className="mt-1 space-y-2">
                                      {metadata.writeUpInfo.contradictions.map((contradiction, idx) => (
                                        <Alert key={idx} variant="destructive" className="py-2">
                                          <AlertTriangle className="h-4 w-4" />
                                          <AlertDescription className="text-xs">
                                            <div className="font-medium">{contradiction.field}</div>
                                            <div className="mt-1">
                                              <div>Excel: {String(contradiction.excelValue || 'N/A')}</div>
                                              <div>Write-Up: {String(contradiction.writeUpValue || 'N/A')}</div>
                                            </div>
                                            <div className="mt-1 text-xs">{contradiction.description}</div>
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Parsing Info */}
                          {metadata.parsingInfo && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Extraction Summary</h4>
                              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                                <div>
                                  <span className="font-medium">Extracted Fields:</span> {metadata.parsingInfo.extractedFields?.length || 0}
                                  {(metadata.parsingInfo.extractedFields?.length || 0) > 0 && (
                                    <span className="text-muted-foreground ml-2">
                                      ({metadata.parsingInfo.extractedFields.join(', ')})
                                    </span>
                                  )}
                                </div>
                                {(metadata.parsingInfo.missingFields?.length || 0) > 0 && (
                                  <div>
                                    <span className="font-medium text-yellow-600">Missing Fields:</span>
                                    <span className="text-yellow-600 ml-2">
                                      {metadata.parsingInfo.missingFields.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {metadata.parsingInfo.parsingErrors && metadata.parsingInfo.parsingErrors.length > 0 && (
                                  <div>
                                    <span className="font-medium text-red-600">Parsing Errors:</span>
                                    <ul className="list-disc list-inside ml-2 mt-1 text-red-600">
                                      {metadata.parsingInfo.parsingErrors.map((error: string, idx: number) => (
                                        <li key={idx}>{error}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}