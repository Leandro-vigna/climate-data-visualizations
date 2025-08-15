'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";

export default function TestNewIdPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envCheck, setEnvCheck] = useState<any>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Test the debug endpoint first
      const response = await fetch('/api/scl-automation/debug-sheets');
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

  const testIndicators = async () => {
    try {
      const response = await fetch('/api/scl-automation/outcome-indicators');
      const data = await response.json();
      console.log('Indicators test:', data);
      
      const sourcesResponse = await fetch('/api/scl-automation/data-sources');
      const sourcesData = await sourcesResponse.json();
      console.log('Sources test:', sourcesData);

      setEnvCheck({
        indicators: data,
        sources: sourcesData
      });
    } catch (error) {
      setEnvCheck({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  useEffect(() => {
    // Auto-test on load
    testConnection();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test New Spreadsheet ID</h1>
        <p className="text-muted-foreground">
          Let's verify that your updated Replit secret is working correctly.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Spreadsheet Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testConnection} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Test Spreadsheet Access
            </Button>

            <Button onClick={testIndicators} variant="outline">
              Test API Endpoints
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
                    {testResult.success ? 'Spreadsheet Connected!' : testResult.error}
                  </span>
                </div>

                {/* Success Details */}
                {testResult.success && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-green-800 mb-2">✅ Spreadsheet Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Title:</strong> {testResult.spreadsheetTitle}</div>
                        <div><strong>ID:</strong> <code className="bg-green-100 px-1 py-0.5 rounded">{testResult.spreadsheetId}</code></div>
                        <div><strong>Sheets Found:</strong> {testResult.sheets?.map((s: any) => s.name).join(', ')}</div>
                        
                        {testResult.sheetSamples && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Sheet Preview:</h4>
                            {Object.entries(testResult.sheetSamples).map(([sheetName, sample]: [string, any]) => (
                              <div key={sheetName} className="mb-3 p-2 bg-white rounded border">
                                <h5 className="font-medium text-green-700">{sheetName}</h5>
                                {sample.error ? (
                                  <p className="text-red-600 text-xs">{sample.error}</p>
                                ) : (
                                  <div className="text-xs">
                                    <p>Rows: {sample.rows}</p>
                                    <p>Headers: {sample.firstRow?.slice(0, 5).join(', ')}...</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Error Details */}
                {!testResult.success && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-red-800 mb-2">❌ Error Details</h3>
                      <p className="text-sm text-red-700 mb-3">{testResult.error}</p>
                      
                      {testResult.requiresAuth && (
                        <div className="mb-3">
                          <Badge variant="destructive">Authentication Required</Badge>
                          <p className="text-sm text-red-700 mt-1">
                            Please make sure you're signed in with your Google account.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {envCheck && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-blue-800 mb-2">API Endpoints Test</h3>
                  <div className="space-y-2 text-sm">
                    {envCheck.error ? (
                      <p className="text-red-600">{envCheck.error}</p>
                    ) : (
                      <>
                        <div>
                          <strong>Indicators API:</strong> 
                          <Badge variant={envCheck.indicators?.success ? 'default' : 'destructive'} className="ml-2">
                            {envCheck.indicators?.success ? 'Working' : 'Failed'}
                          </Badge>
                          {envCheck.indicators?.data && (
                            <span className="ml-2 text-xs">({envCheck.indicators.data.length} records)</span>
                          )}
                        </div>
                        <div>
                          <strong>Sources API:</strong> 
                          <Badge variant={envCheck.sources?.success ? 'default' : 'destructive'} className="ml-2">
                            {envCheck.sources?.success ? 'Working' : 'Failed'}
                          </Badge>
                          {envCheck.sources?.data && (
                            <span className="ml-2 text-xs">({envCheck.sources.data.length} records)</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>If the test is successful:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Go back to <a href="/dashboard/scl-data-automation" className="text-blue-600 hover:underline">SCL Data Automation</a></li>
              <li>Click "Refresh Data" to load your spreadsheet data</li>
              <li>Explore the three tabs with your real data</li>
            </ul>
            
            <p className="mt-4"><strong>If the test fails:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Check that you updated the Replit Secret correctly</li>
              <li>Verify you're signed in with the right Google account</li>
              <li>Make sure the spreadsheet URL was correct</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
