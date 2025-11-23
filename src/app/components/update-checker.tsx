'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Clock,
  Database,
  Globe,
  FileText,
  Info,
  FileCode
} from "lucide-react";
import { UpdateCheckResult, SourceMetadata } from "@/lib/database/update-tracking";
import { ExcelNotesMetadata } from "@/lib/types/metadata";
import { IndicatorWriteUpInfo } from "@/lib/writeup-parser";

interface UpdateCheckerProps {
  indicatorId: string;
  dataFile: string;
  system: string;
  sourceUrl: string;
  sourceTitle: string;
  existingMetadata?: ExcelNotesMetadata | null; // Pass existing metadata to show persistent status
  onUpdateComplete?: (result: UpdateCheckResult) => void;
  onMetadataExtracted?: (indicatorId: string, metadata: ExcelNotesMetadata) => void;
}

interface CheckProgress {
  stage: 'extracting_metadata' | 'crawling_source' | 'analyzing_content' | 'comparing_data' | 'completed' | 'error';
  progress: number;
  message: string;
  details?: string;
}

export default function UpdateChecker({ 
  indicatorId, 
  dataFile, 
  system, 
  sourceUrl, 
  sourceTitle,
  existingMetadata,
  onUpdateComplete,
  onMetadataExtracted
}: UpdateCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState<CheckProgress | null>(null);
  const [lastResult, setLastResult] = useState<UpdateCheckResult | null>(null);
  const [metadata, setMetadata] = useState<ExcelNotesMetadata | null>(existingMetadata || null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metadata' | 'results'>('metadata');
  
  // Update local metadata when existingMetadata prop changes
  useEffect(() => {
    if (existingMetadata) {
      setMetadata(existingMetadata);
      // Set a result to show status badge
      setLastResult({
        id: `existing-${indicatorId}`,
        indicatorId,
        dataFile,
        system,
        sourceUrl,
        sourceTitle,
        hasUpdate: false,
        updateType: 'no_update',
        confidence: 100,
        lastChecked: existingMetadata.extractedAt instanceof Date 
          ? existingMetadata.extractedAt 
          : new Date(existingMetadata.extractedAt),
        crawlStatus: 'pending',
        extractedMetadata: existingMetadata
      });
    }
  }, [existingMetadata, indicatorId, dataFile, system, sourceUrl, sourceTitle]);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    setMetadata(null);
    setLastResult(null);
    setActiveTab('metadata');
    
    setProgress({
      stage: 'extracting_metadata',
      progress: 0,
      message: 'Extracting metadata from Excel file...'
    });

    try {
      // Stage 1: Extract metadata from Excel file
      setProgress({
        stage: 'extracting_metadata',
        progress: 20,
        message: 'Reading Notes tab from Excel file...',
        details: `Processing ${system}/${dataFile}`
      });

      // Extract indicator key from dataFile (remove .xlsx extension if present)
      const indicatorKey = dataFile.replace(/\.(xlsx|csv)$/, '');

      // Get saved folder path from localStorage (with fallback to default)
      let savedPath: string | null = null;
      if (typeof window !== 'undefined') {
        savedPath = localStorage.getItem('sharepoint_local_path');
        // If no saved path, try to set default
        if (!savedPath) {
          const defaultPath = '/Users/leandrovigna/Library/CloudStorage/OneDrive-WorldResourcesInstitute/Systems Change Lab - Data collection';
          localStorage.setItem('sharepoint_local_path', defaultPath);
          savedPath = defaultPath;
        }
      }

      // Use saved path or undefined (server will use default)
      const basePathToUse = savedPath || undefined;

      // Call metadata extraction API
      console.log('Calling extract-metadata API with:', { indicatorKey, system, basePath: basePathToUse });
      const metadataResponse = await fetch('/api/scl-automation/extract-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          indicatorKey,
          system,
          basePath: basePathToUse // Pass the custom path if available
        })
      });

      console.log('Metadata API response status:', metadataResponse.status);

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        console.error('Metadata API error:', errorData);
        throw new Error(errorData.error || `Failed to extract metadata (${metadataResponse.status})`);
      }

      const metadataData = await metadataResponse.json();
      console.log('Metadata API response:', metadataData);
      
      if (metadataData.success && metadataData.metadata) {
        let finalMetadata = metadataData.metadata;
        
        // Stage 2: Extract from copy write-up document
        setProgress({
          stage: 'extracting_metadata',
          progress: 60,
          message: 'Extracting information from copy write-up...',
          details: `Checking ${system} write-up document`
        });

        try {
          // Get write-up configuration from localStorage
          const writeUpConfigs = typeof window !== 'undefined' 
            ? localStorage.getItem('system_writeup_configs')
            : null;
          
          console.log('Checking for write-up configs. System:', system, 'Configs available:', !!writeUpConfigs);
          
          if (writeUpConfigs) {
            const configs = JSON.parse(writeUpConfigs);
            console.log('All saved configs:', Object.keys(configs));
            const systemConfig = configs[system];
            console.log('System config for', system, ':', systemConfig);
            
            // Check if system has a configured write-up (either type is set or status is connected)
            // Status can be 'connected' or we check if type is set (meaning it was configured)
            if (systemConfig && (systemConfig.status === 'connected' || systemConfig.type === 'google-doc' || systemConfig.type === 'word-doc')) {
              console.log('✅ Found write-up config for system:', system, systemConfig);
              
              // Extract indicator info from write-up
              const requestBody = {
                system,
                indicatorId: indicatorKey,
                type: systemConfig.type,
                documentId: systemConfig.type === 'google-doc' 
                  ? systemConfig.googleDocUrl?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
                  : undefined
              };
              
              console.log('Calling extract-writeup-info API with:', requestBody);
              
              const writeUpResponse = await fetch('/api/scl-automation/extract-writeup-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              });

              console.log('Write-up API response status:', writeUpResponse.status);

              if (writeUpResponse.ok) {
                const writeUpData = await writeUpResponse.json();
                console.log('Write-up API response:', writeUpData);
                
                if (writeUpData.success && writeUpData.writeUpInfo) {
                  // Merge write-up info with Excel metadata
                  finalMetadata = {
                    ...finalMetadata,
                    writeUpInfo: {
                      ...writeUpData.writeUpInfo,
                      extractedAt: new Date(),
                      source: systemConfig.type,
                      contradictions: detectContradictions(finalMetadata, writeUpData.writeUpInfo)
                  }
                  };
                  
                  console.log('✅ Successfully merged write-up info into metadata');
                  
                  setProgress({
                    stage: 'extracting_metadata',
                    progress: 80,
                    message: 'Write-up information extracted!',
                    details: 'Merging with Excel metadata'
                  });
                } else {
                  console.warn('⚠️ Write-up API returned success but no writeUpInfo:', writeUpData);
                }
              } else {
                const errorData = await writeUpResponse.json().catch(() => ({ error: 'Unknown error' }));
                console.warn('❌ Write-up API error:', errorData);
              }
            } else {
              console.log('ℹ️ No write-up config found for system:', system, 'Config:', systemConfig);
            }
          } else {
            console.log('ℹ️ No write-up configs saved in localStorage');
          }
        } catch (writeUpError: any) {
          // Don't fail the whole process if write-up extraction fails
          console.error('❌ Failed to extract write-up info:', writeUpError);
          // Continue with Excel metadata only
        }

        setMetadata(finalMetadata);
        const extractedCount = finalMetadata.parsingInfo?.extractedFields?.length || 0;
        const writeUpFields = finalMetadata.writeUpInfo ? 1 : 0;
        
        setProgress({
          stage: 'extracting_metadata',
          progress: 90,
          message: 'Metadata extraction completed!',
          details: `Found ${extractedCount} Excel fields${writeUpFields > 0 ? ' + write-up info' : ''}`
        });
        
        // Notify parent component about extracted metadata
        if (onMetadataExtracted) {
          onMetadataExtracted(indicatorId, finalMetadata);
        }
      } else {
        const errorMsg = metadataData.error || metadataData.details || 'No metadata returned from API';
        console.error('No metadata in response:', metadataData);
        throw new Error(errorMsg);
      }

      // Stage 3: Crawl source website (TODO: Implement in phase 2)
      setProgress({
        stage: 'crawling_source',
        progress: 95,
        message: 'Web crawling not yet implemented...',
        details: 'This feature will be added in phase 2'
      });

      // For now, skip web crawling and mark as completed
      setProgress({
        stage: 'completed',
        progress: 100,
        message: 'Metadata extraction completed!'
      });

      // Set a basic result indicating metadata was extracted
      const result: UpdateCheckResult = {
        id: `check-${Date.now()}`,
        indicatorId,
        dataFile,
        system,
        sourceUrl,
        sourceTitle,
        hasUpdate: false,
        updateType: 'no_update',
        confidence: 100,
        lastChecked: new Date(),
        crawlStatus: 'pending',
        extractedMetadata: metadataData.metadata
      };

      setLastResult(result);
      setActiveTab('metadata');

      if (onUpdateComplete) {
        onUpdateComplete(result);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('UpdateChecker error:', err);
      setError(errorMessage);
      setProgress({
        stage: 'error',
        progress: 0,
        message: 'Update check failed',
        details: errorMessage
      });
      // Still set a result so the tabs show even on error
      setLastResult({
        id: `check-${Date.now()}`,
        indicatorId,
        dataFile,
        system,
        sourceUrl,
        sourceTitle,
        hasUpdate: false,
        updateType: 'error',
        confidence: 0,
        lastChecked: new Date(),
        crawlStatus: 'failed',
        crawlError: errorMessage
      });
      setActiveTab('metadata'); // Show metadata tab to display error
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (!lastResult) return <Clock className="w-4 h-4" />;
    
    switch (lastResult.updateType) {
      case 'new_data':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'methodology_change':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'site_structure_change':
        return <ExternalLink className="w-4 h-4 text-blue-600" />;
      case 'no_update':
        return <Database className="w-4 h-4 text-gray-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (!lastResult) return 'secondary';
    
    switch (lastResult.updateType) {
      case 'new_data':
        return 'default';
      case 'methodology_change':
        return 'secondary';
      case 'site_structure_change':
        return 'outline';
      case 'no_update':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!lastResult) return 'Not checked';
    
    switch (lastResult.updateType) {
      case 'new_data':
        return 'New Data Available';
      case 'methodology_change':
        return 'Methodology Changed';
      case 'site_structure_change':
        return 'Site Structure Changed';
      case 'no_update':
        return 'No Updates';
      case 'error':
        return 'Check Failed';
      default:
        return 'Unknown Status';
    }
  };

  return (
      <div className="space-y-2" style={{ minWidth: '200px' }}>
      {/* Check Button */}
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleCheckForUpdates}
          disabled={isChecking || !dataFile}
          size="sm"
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </span>
        </Button>
        
        {lastResult && (
          <Badge variant={getStatusColor()} className="flex items-center space-x-1">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        )}
      </div>

      {/* Progress Indicator */}
      {isChecking && progress && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{progress.message}</span>
                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="w-full" />
              {progress.details && (
                <p className="text-xs text-muted-foreground">{progress.details}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Status Message - Full metadata is shown in the Metadata tab */}
      {error && !isChecking && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Error:</strong> {error}
            <br />
            <span className="text-xs mt-1 block">
              Check the Metadata tab for details, or try again in a moment if the file is syncing.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message - Only show if just extracted (not existing) */}
      {metadata && !isChecking && !error && !existingMetadata && (
        <Alert className="mt-2 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Metadata extracted successfully! View details in the <strong>Metadata</strong> tab.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Persistent indicator when metadata exists */}
      {existingMetadata && !isChecking && (
        <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200 flex items-center space-x-1 w-fit">
          <FileCode className="w-3 h-3" />
          <span>Metadata available</span>
        </Badge>
      )}

      {/* Note: Full metadata display is now in the main Metadata tab */}
    </div>
  );
}

/**
 * Detect contradictions between Excel metadata and write-up info
 */
function detectContradictions(
  excelMetadata: ExcelNotesMetadata,
  writeUpInfo: IndicatorWriteUpInfo
): Array<{field: string, excelValue?: any, writeUpValue?: any, description: string}> {
  const contradictions: Array<{field: string, excelValue?: any, writeUpValue?: any, description: string}> = [];

  // Check URLs
  if (excelMetadata.urls?.primaryUrl && writeUpInfo.metadata?.urls?.[0]) {
    if (excelMetadata.urls.primaryUrl !== writeUpInfo.metadata.urls[0]) {
      contradictions.push({
        field: 'primaryUrl',
        excelValue: excelMetadata.urls.primaryUrl,
        writeUpValue: writeUpInfo.metadata.urls[0],
        description: 'Primary URL differs between Excel Notes and write-up document'
      });
    }
  }

  // Check Provider
  if (excelMetadata.sourceInfo?.provider && writeUpInfo.metadata?.provider) {
    if (excelMetadata.sourceInfo.provider.toLowerCase() !== writeUpInfo.metadata.provider.toLowerCase()) {
      contradictions.push({
        field: 'provider',
        excelValue: excelMetadata.sourceInfo.provider,
        writeUpValue: writeUpInfo.metadata.provider,
        description: 'Provider name differs between Excel Notes and write-up document'
      });
    }
  }

  // Check Units
  if (excelMetadata.dataInfo?.units && writeUpInfo.metadata?.units) {
    if (excelMetadata.dataInfo.units.toLowerCase() !== writeUpInfo.metadata.units.toLowerCase()) {
      contradictions.push({
        field: 'units',
        excelValue: excelMetadata.dataInfo.units,
        writeUpValue: writeUpInfo.metadata.units,
        description: 'Units differ between Excel Notes and write-up document'
      });
    }
  }

  // Check Frequency
  if (excelMetadata.dataInfo?.frequency && writeUpInfo.metadata?.frequency) {
    if (excelMetadata.dataInfo.frequency.toLowerCase() !== writeUpInfo.metadata.frequency.toLowerCase()) {
      contradictions.push({
        field: 'frequency',
        excelValue: excelMetadata.dataInfo.frequency,
        writeUpValue: writeUpInfo.metadata.frequency,
        description: 'Update frequency differs between Excel Notes and write-up document'
      });
    }
  }

  return contradictions;
}
