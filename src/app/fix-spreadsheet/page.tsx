'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, CheckCircle } from "lucide-react";

export default function FixSpreadsheetPage() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [extractedId, setExtractedId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract spreadsheet ID from URL
  const extractId = () => {
    if (spreadsheetUrl) {
      const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        setExtractedId(match[1]);
      } else {
        alert('Could not extract ID from URL. Please check the URL format.');
      }
    }
  };

  const testWithId = async () => {
    if (!extractedId) {
      alert('Please extract the spreadsheet ID first');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/scl-automation/debug-sheets?spreadsheetId=${extractedId}`);
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test spreadsheet',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fix SCL Spreadsheet Connection</h1>
        <p className="text-muted-foreground">
          The current spreadsheet ID seems to be incorrect. Let's get the right one from your Google Drive.
        </p>
      </div>

      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>Current Issue</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">
            The spreadsheet ID <code className="bg-red-100 px-2 py-1 rounded">1jJOgcdwMm271zFDhZlhEgHof1nQOqlcCrLXrPKtK08o</code> 
            was not found. This usually means:
          </p>
          <ul className="list-disc list-inside text-red-700 space-y-1">
            <li>The spreadsheet ID is incorrect</li>
            <li>The spreadsheet has been moved or deleted</li>
            <li>You don't have access to it with your current Google account</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Get the Correct Spreadsheet URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="spreadsheet-url">Google Sheets URL</Label>
            <Input
              id="spreadsheet-url"
              placeholder="Paste the full URL of your SCL Metadata spreadsheet here"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              1. Go to your <a 
                href="https://drive.google.com/drive/folders/1uUMqPPNSzRB2gdU0oU5EPnzIStxrALO0?usp=sharing" 
                target="_blank" 
                className="text-blue-600 hover:underline"
              >
                Drive folder <ExternalLink className="w-3 h-3 inline" />
              </a>
              <br />
              2. Click on "SCL Metadata 2025 - Staging Site"
              <br />
              3. Copy the entire URL from your browser address bar
              <br />
              4. Paste it above
            </p>
          </div>

          <Button onClick={extractId} disabled={!spreadsheetUrl}>
            Extract Spreadsheet ID
          </Button>

          {extractedId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">✅ Spreadsheet ID Extracted</h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="font-mono text-sm">
                  {extractedId}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {extractedId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 2: Test the New ID</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testWithId} disabled={!extractedId || isLoading}>
              {isLoading ? 'Testing...' : 'Test New Spreadsheet ID'}
            </Button>

            {testResult && (
              <div className="mt-4 space-y-4">
                {testResult.success ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-800">Success!</span>
                    </div>
                    <div className="text-sm text-green-700 space-y-2">
                      <p><strong>Spreadsheet:</strong> {testResult.spreadsheetTitle}</p>
                      <p><strong>Sheets found:</strong> {testResult.sheets?.map((s: any) => s.name).join(', ')}</p>
                      
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Next Steps:</h4>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Add this to your Replit Secrets:</li>
                          <li className="ml-4">
                            Key: <code className="bg-green-100 px-1 py-0.5 rounded">SCL_SPREADSHEET_ID</code>
                          </li>
                          <li className="ml-4">
                            Value: <code className="bg-green-100 px-1 py-0.5 rounded">{extractedId}</code>
                          </li>
                          <li>Go back to your SCL Data Automation page and refresh</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-800">Still Not Working</span>
                    </div>
                    <p className="text-sm text-red-700 mb-2">{testResult.error}</p>
                    
                    {testResult.requiresAuth && (
                      <p className="text-sm text-red-700">
                        Make sure you're signed in with the Google account that has access to this spreadsheet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">If you still can't access the spreadsheet:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Make sure you're signed in with the same Google account that has access to the Drive folder</li>
                <li>Try opening the spreadsheet directly in Google Sheets first</li>
                <li>Check if the spreadsheet is shared with your account</li>
                <li>Verify the URL is from the correct Drive folder</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
