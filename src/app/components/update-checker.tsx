'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Clock,
  Database,
  Globe,
  FileText,
  Info
} from "lucide-react";
import { UpdateCheckResult, SourceMetadata } from "@/lib/database/update-tracking";

interface UpdateCheckerProps {
  indicatorId: string;
  dataFile: string;
  system: string;
  sourceUrl: string;
  sourceTitle: string;
  onUpdateComplete?: (result: UpdateCheckResult) => void;
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
  onUpdateComplete 
}: UpdateCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState<CheckProgress | null>(null);
  const [lastResult, setLastResult] = useState<UpdateCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);
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

      // TODO: Implement actual metadata extraction
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress({
        stage: 'crawling_source',
        progress: 40,
        message: 'Crawling source website...',
        details: `Analyzing ${sourceUrl}`
      });

      // Stage 2: Crawl source website
      // TODO: Implement web crawling
      await new Promise(resolve => setTimeout(resolve, 2000));

      setProgress({
        stage: 'analyzing_content',
        progress: 70,
        message: 'Analyzing content for updates...',
        details: 'Comparing with previous data'
      });

      // Stage 3: Analyze content
      // TODO: Implement content analysis
      await new Promise(resolve => setTimeout(resolve, 1500));

      setProgress({
        stage: 'comparing_data',
        progress: 90,
        message: 'Comparing data changes...',
        details: 'Generating update report'
      });

      // Stage 4: Compare and generate result
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock result for now
      const result: UpdateCheckResult = {
        id: `check-${Date.now()}`,
        indicatorId,
        dataFile,
        system,
        sourceUrl,
        sourceTitle,
        hasUpdate: true,
        updateType: 'new_data',
        confidence: 85,
        lastChecked: new Date(),
        detectedUpdateDate: new Date(),
        contentChangeDescription: 'New data points detected for 2024',
        crawlStatus: 'completed',
        crawlDuration: 5000,
        notes: 'Data source shows updated information with additional 2024 data points',
        warnings: ['Some data points may require manual verification'],
        recommendations: ['Review new data points for consistency with existing methodology']
      };

      setLastResult(result);
      setProgress({
        stage: 'completed',
        progress: 100,
        message: 'Update check completed successfully!'
      });

      if (onUpdateComplete) {
        onUpdateComplete(result);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setProgress({
        stage: 'error',
        progress: 0,
        message: 'Update check failed',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
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
    <div className="space-y-4">
      {/* Check Button */}
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleCheckForUpdates}
          disabled={isChecking}
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

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {lastResult && !isChecking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Update Check Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Last Checked:</span>
                <p className="text-muted-foreground">
                  {lastResult.lastChecked.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="font-medium">Confidence:</span>
                <p className="text-muted-foreground">
                  {lastResult.confidence}%
                </p>
              </div>
              <div>
                <span className="font-medium">Duration:</span>
                <p className="text-muted-foreground">
                  {lastResult.crawlDuration ? `${lastResult.crawlDuration}ms` : 'N/A'}
                </p>
              </div>
              <div>
                <span className="font-medium">Update Date:</span>
                <p className="text-muted-foreground">
                  {lastResult.detectedUpdateDate?.toLocaleDateString() || 'N/A'}
                </p>
              </div>
            </div>

            {/* Content Changes */}
            {lastResult.contentChangeDescription && (
              <div>
                <span className="font-medium text-sm">Changes Detected:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastResult.contentChangeDescription}
                </p>
              </div>
            )}

            {/* Notes */}
            {lastResult.notes && (
              <div>
                <span className="font-medium text-sm">Notes:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastResult.notes}
                </p>
              </div>
            )}

            {/* Warnings */}
            {lastResult.warnings && lastResult.warnings.length > 0 && (
              <div>
                <span className="font-medium text-sm text-yellow-600">Warnings:</span>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                  {lastResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {lastResult.recommendations && lastResult.recommendations.length > 0 && (
              <div>
                <span className="font-medium text-sm text-blue-600">Recommendations:</span>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                  {lastResult.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
