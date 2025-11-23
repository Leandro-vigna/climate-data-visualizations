'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FolderOpen, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  FileText,
  Database,
  Settings,
  ExternalLink,
  Loader2
} from "lucide-react";

interface DataSourceConfigProps {
  onFolderPathChange?: (path: string) => void;
  onSheetsConnectionTest?: () => Promise<{success: boolean, message: string}>;
}

export default function DataSourceConfig({ 
  onFolderPathChange,
  onSheetsConnectionTest 
}: DataSourceConfigProps) {
  const [localFolderPath, setLocalFolderPath] = useState<string>('');
  const [isTestingFolder, setIsTestingFolder] = useState(false);
  const [folderStatus, setFolderStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [folderError, setFolderError] = useState<string | null>(null);
  
  const [sheetsStatus, setSheetsStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsInfo, setSheetsInfo] = useState<{name?: string, id?: string} | null>(null);

  // Load saved folder path from localStorage
  useEffect(() => {
    const savedPath = localStorage.getItem('sharepoint_local_path');
    if (savedPath) {
      setLocalFolderPath(savedPath);
      setFolderStatus('valid');
    } else {
      // Set default path and save it
      const defaultPath = '/Users/leandrovigna/Library/CloudStorage/OneDrive-WorldResourcesInstitute/Systems Change Lab - Data collection';
      setLocalFolderPath(defaultPath);
      localStorage.setItem('sharepoint_local_path', defaultPath);
      setFolderStatus('valid'); // Auto-validate default path
    }
  }, []);

  // Auto-test Google Sheets connection on mount
  useEffect(() => {
    testSheetsConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test folder path
  const testFolderPath = async () => {
    if (!localFolderPath.trim()) {
      setFolderError('Please enter a folder path');
      setFolderStatus('invalid');
      return;
    }

    setIsTestingFolder(true);
    setFolderError(null);

    try {
      const response = await fetch('/api/scl-automation/test-folder-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: localFolderPath })
      });

      const data = await response.json();
      
      if (data.success) {
        setFolderStatus('valid');
        setFolderError(null);
        localStorage.setItem('sharepoint_local_path', localFolderPath);
        if (onFolderPathChange) {
          onFolderPathChange(localFolderPath);
        }
      } else {
        setFolderStatus('invalid');
        setFolderError(data.error || 'Folder path is invalid or not accessible');
      }
    } catch (error: any) {
      setFolderStatus('invalid');
      setFolderError(error.message || 'Failed to test folder path');
    } finally {
      setIsTestingFolder(false);
    }
  };

  // Test Google Sheets connection
  const testSheetsConnection = async () => {
    setSheetsStatus('testing');
    setSheetsError(null);

    try {
      if (onSheetsConnectionTest) {
        const result = await onSheetsConnectionTest();
        if (result.success) {
          setSheetsStatus('connected');
          setSheetsError(null);
        } else {
          setSheetsStatus('error');
          setSheetsError(result.message);
        }
      } else {
        // Default test using API
        const response = await fetch('/api/scl-automation/test-connection');
        const data = await response.json();
        
        if (data.success) {
          setSheetsStatus('connected');
          setSheetsInfo({
            name: data.spreadsheet?.title || data.spreadsheetTitle,
            id: data.spreadsheetId || data.environment?.spreadsheetId
          });
          setSheetsError(null);
        } else {
          setSheetsStatus('error');
          setSheetsError(data.error || 'Connection failed');
        }
      }
    } catch (error: any) {
      setSheetsStatus('error');
      setSheetsError(error.message || 'Failed to test connection');
    }
  };

  // Auto-test on mount
  useEffect(() => {
    testSheetsConnection();
  }, []);

  return (
    <Card className="mb-6 border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Data Source Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure where your data is stored and how to access it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Local Folder Path Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-semibold">Local SharePoint Folder</h3>
                <p className="text-sm text-muted-foreground">
                  Path to your synced OneDrive/SharePoint folder containing Excel files
                </p>
              </div>
            </div>
            {folderStatus === 'valid' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {folderStatus === 'invalid' && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="w-3 h-3 mr-1" />
                Invalid
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              value={localFolderPath}
              onChange={(e) => {
                setLocalFolderPath(e.target.value);
                setFolderStatus('idle');
                setFolderError(null);
              }}
              placeholder="/path/to/your/OneDrive/Systems Change Lab - Data collection"
              className="font-mono text-sm"
            />
            <Button
              onClick={testFolderPath}
              disabled={isTestingFolder}
              variant="outline"
              size="sm"
            >
              {isTestingFolder ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test Path
                </>
              )}
            </Button>
          </div>
          
          {folderError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{folderError}</AlertDescription>
            </Alert>
          )}
          
          {folderStatus === 'valid' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Folder path is valid</p>
                  <p className="text-green-700 mt-1">
                    Reading Excel files from: <code className="bg-green-100 px-1 rounded">{localFolderPath}</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Google Sheets Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="font-semibold">Google Sheets Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Main spreadsheet containing all indicators and data sources
                </p>
              </div>
            </div>
            {sheetsStatus === 'connected' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {sheetsStatus === 'error' && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
            {sheetsStatus === 'testing' && (
              <Badge variant="outline">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Testing...
              </Badge>
            )}
          </div>

          {sheetsInfo && sheetsStatus === 'connected' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Successfully connected to Google Sheets</p>
                  {sheetsInfo.name && (
                    <p className="text-green-700 mt-1">
                      Spreadsheet: <span className="font-medium">{sheetsInfo.name}</span>
                    </p>
                  )}
                  {sheetsInfo.id && (
                    <p className="text-green-600 mt-1 text-xs">
                      ID: <code className="bg-green-100 px-1 rounded">{sheetsInfo.id}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {sheetsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sheetsError}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={testSheetsConnection}
            disabled={sheetsStatus === 'testing'}
            variant="outline"
            size="sm"
          >
            {sheetsStatus === 'testing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

