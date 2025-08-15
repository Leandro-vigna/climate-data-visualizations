'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";

export default function TestConnectionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/scl-automation/test-connection');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google Sheets Connection Test</h1>
        <p className="text-muted-foreground">
          Test the connection to your SCL Metadata Google Sheets
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testConnection} disabled={isLoading} className="mb-4">
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>

          {result && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center space-x-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'Success' : 'Failed'}
                </Badge>
                <span className="font-medium">
                  {result.message || result.error}
                </span>
              </div>

              {/* Success Details */}
              {result.success && result.spreadsheet && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-green-800 mb-2">Spreadsheet Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Title:</strong> {result.spreadsheet.title}</div>
                      <div><strong>Sheets:</strong> {result.spreadsheet.sheets.join(', ')}</div>
                      <div>
                        <strong>URL:</strong>{' '}
                        <a 
                          href={result.spreadsheet.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open Spreadsheet
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Environment Info */}
              {result.environment && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Environment Configuration</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <strong>Client Email:</strong>
                        <Badge variant="outline">{result.environment.clientEmail}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <strong>Private Key:</strong>
                        <Badge variant={result.environment.hasPrivateKey ? 'default' : 'destructive'}>
                          {result.environment.hasPrivateKey ? 'Set' : 'Missing'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <strong>Spreadsheet ID:</strong>
                        <Badge variant="outline">{result.environment.spreadsheetId}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Details */}
              {!result.success && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                    <p className="text-sm text-red-700 mb-3">{result.details}</p>
                    
                    {result.missing && (
                      <div className="mb-3">
                        <strong className="text-red-800">Missing Environment Variables:</strong>
                        <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                          {result.missing.map((variable: string) => (
                            <li key={variable}>{variable}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.troubleshooting && (
                      <div>
                        <strong className="text-red-800">Troubleshooting Steps:</strong>
                        <ol className="list-decimal list-inside text-sm text-red-700 mt-1 space-y-1">
                          {result.troubleshooting.map((step: string, index: number) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Setup Instructions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">1. Google Cloud Setup</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Create a Google Cloud project</li>
                <li>Enable Google Sheets API</li>
                <li>Create a service account</li>
                <li>Download the JSON key file</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Share Spreadsheet</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Open your Google Sheets document</li>
                <li>Click Share button</li>
                <li>Add the service account email with Viewer permission</li>
                <li>Uncheck "Notify people"</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Replit Secrets</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Open Replit Secrets tab (🔒)</li>
                <li>Add GOOGLE_CLIENT_EMAIL</li>
                <li>Add GOOGLE_PRIVATE_KEY (keep the \n characters)</li>
                <li>Add SCL_SPREADSHEET_ID</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
