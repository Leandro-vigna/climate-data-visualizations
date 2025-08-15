'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

export default function SetupSCLPage() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [extractedId, setExtractedId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract spreadsheet ID from URL
  useEffect(() => {
    if (spreadsheetUrl) {
      const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        setExtractedId(match[1]);
      } else {
        setExtractedId('');
      }
    }
  }, [spreadsheetUrl]);

  const testConnection = async () => {
    if (!extractedId) {
      alert('Please enter a valid Google Sheets URL first');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/scl-automation/test-connection?spreadsheetId=${extractedId}`);
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveToReplit = () => {
    if (!extractedId) {
      alert('Please extract the spreadsheet ID first');
      return;
    }

    alert(`
Please add this to your Replit Secrets:

Key: SCL_SPREADSHEET_ID
Value: ${extractedId}

1. Click the Secrets tab (🔒) in your Replit sidebar
2. Add a new secret with the key and value above
3. Then test the connection again
    `);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SCL Data Automation Setup</h1>
        <p className="text-muted-foreground">
          Configure your Google Sheets connection for the SCL Data Automation system
        </p>
      </div>

      {/* Step 1: Extract Spreadsheet ID */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Extract Spreadsheet ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="spreadsheet-url">Google Sheets URL</Label>
            <Input
              id="spreadsheet-url"
              placeholder="https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=0"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Paste the full URL of your "SCL Metadata 2025 - Staging Site" spreadsheet
            </p>
          </div>

          {extractedId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">✅ Spreadsheet ID Extracted</h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="font-mono text-sm">
                  {extractedId}
                </Badge>
                <Button variant="outline" size="sm" onClick={saveToReplit}>
                  Add to Replit Secrets
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Test Connection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Test Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testConnection} 
            disabled={!extractedId || isLoading}
            className="mb-4"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </Button>

          {testResult && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <Badge variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? 'Success' : 'Failed'}
                </Badge>
                <span className="font-medium">
                  {testResult.message || testResult.error}
                </span>
              </div>

              {/* Success Details */}
              {testResult.success && testResult.spreadsheet && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-green-800 mb-2">Spreadsheet Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Title:</strong> {testResult.spreadsheet.title}</div>
                      <div><strong>Sheets:</strong> {testResult.spreadsheet.sheets.join(', ')}</div>
                      <div>
                        <strong>URL:</strong>{' '}
                        <a 
                          href={testResult.spreadsheet.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center"
                        >
                          Open Spreadsheet <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Details */}
              {!testResult.success && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                    <p className="text-sm text-red-700 mb-3">{testResult.details}</p>
                    
                    {testResult.requiresAuth && (
                      <div className="mb-3">
                        <Badge variant="destructive">Authentication Required</Badge>
                        <p className="text-sm text-red-700 mt-1">
                          {testResult.instructions}
                        </p>
                      </div>
                    )}

                    {testResult.troubleshooting && (
                      <div>
                        <strong className="text-red-800">Troubleshooting Steps:</strong>
                        <ol className="list-decimal list-inside text-sm text-red-700 mt-1 space-y-1">
                          {testResult.troubleshooting.map((step: string, index: number) => (
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

      {/* Instructions */}
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
              <h4 className="font-semibold mb-2">1. Get the Spreadsheet URL</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Go to your <a href="https://drive.google.com/drive/folders/1uUMqPPNSzRB2gdU0oU5EPnzIStxrALO0?usp=sharing" target="_blank" className="text-blue-600 hover:underline">Drive folder</a></li>
                <li>Click on "SCL Metadata 2025 - Staging Site"</li>
                <li>Copy the full URL from your browser</li>
                <li>Paste it in the field above</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Add to Replit Secrets</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Click the "Add to Replit Secrets" button after extracting the ID</li>
                <li>Follow the instructions to add it to your Replit environment</li>
                <li>Make sure you're signed in to your Google account with Sheets access</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Test and Use</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Test the connection using the button above</li>
                <li>If successful, go to the <a href="/dashboard/scl-data-automation" className="text-blue-600 hover:underline">SCL Data Automation page</a></li>
                <li>Click "Refresh Data" to load your spreadsheet data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
