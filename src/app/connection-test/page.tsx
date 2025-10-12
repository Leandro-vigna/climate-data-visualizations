'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'checking';
  message: string;
  details?: string;
}

export default function ConnectionTestPage() {
  const { data: session, status } = useSession();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  async function runDiagnostics() {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // 1. Check Session
    results.push({
      name: 'NextAuth Session',
      status: session ? 'success' : 'error',
      message: session ? `Logged in as ${session.user?.email}` : 'Not logged in',
      details: status === 'loading' ? 'Loading...' : status
    });

    // 2. Check Access Token
    const hasAccessToken = !!(session as any)?.accessToken;
    results.push({
      name: 'OAuth Access Token',
      status: hasAccessToken ? 'success' : 'error',
      message: hasAccessToken ? 'Access token available' : 'No access token - sign in required',
      details: hasAccessToken ? 'Token present in session' : 'Missing from session'
    });

    // 3. Check Firebase Config
    const firebaseConfigExists = !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
    results.push({
      name: 'Firebase Configuration',
      status: firebaseConfigExists ? 'success' : 'warning',
      message: firebaseConfigExists ? 'Firebase env vars configured' : 'Firebase env vars missing',
      details: firebaseConfigExists ? 'API key and Project ID present' : 'Check NEXT_PUBLIC_FIREBASE_* vars'
    });

    // 4. Test API Connection
    try {
      const apiResponse = await fetch('/api/test-env');
      const apiData = await apiResponse.json();
      results.push({
        name: 'API Route Connection',
        status: apiResponse.ok ? 'success' : 'error',
        message: apiResponse.ok ? 'API routes responding' : 'API route error',
        details: JSON.stringify(apiData, null, 2)
      });
    } catch (error: any) {
      results.push({
        name: 'API Route Connection',
        status: 'error',
        message: 'Failed to connect to API',
        details: error.message
      });
    }

    // 5. Test Google Sheets Connection (if logged in)
    if (session) {
      try {
        const sheetsResponse = await fetch('/api/scl-automation/test-connection');
        const sheetsData = await sheetsResponse.json();
        results.push({
          name: 'Google Sheets API',
          status: sheetsData.success ? 'success' : 'error',
          message: sheetsData.success ? 'Google Sheets connected' : sheetsData.error || 'Connection failed',
          details: JSON.stringify(sheetsData, null, 2)
        });
      } catch (error: any) {
        results.push({
          name: 'Google Sheets API',
          status: 'error',
          message: 'Failed to test Google Sheets',
          details: error.message
        });
      }
    } else {
      results.push({
        name: 'Google Sheets API',
        status: 'warning',
        message: 'Skipped - not logged in',
        details: 'Sign in to test Google Sheets connection'
      });
    }

    // 6. Check Environment URLs
    results.push({
      name: 'Environment URLs',
      status: 'success',
      message: 'Checking NEXTAUTH_URL',
      details: `Current URL: ${window.location.origin}\nNEXTAUTH_URL should match this`
    });

    setDiagnostics(results);
    setIsRunning(false);
  }

  useEffect(() => {
    if (status !== 'loading') {
      runDiagnostics();
    }
  }, [status, session]);

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 border-green-500 text-green-900';
      case 'error': return 'bg-red-100 border-red-500 text-red-900';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'checking': return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'checking': return '⟳';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connection Diagnostics</h1>
        <p className="text-gray-600">Testing all connections and configurations</p>
      </div>

      {status === 'loading' ? (
        <div className="text-center py-12">
          <div className="text-xl">Loading session...</div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? 'Running Tests...' : 'Re-run Diagnostics'}
            </button>
          </div>

          <div className="space-y-4">
            {diagnostics.map((diagnostic, index) => (
              <div
                key={index}
                className={`border-l-4 p-4 rounded-lg ${getStatusColor(diagnostic.status)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold flex-shrink-0">
                    {getStatusIcon(diagnostic.status)}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{diagnostic.name}</h3>
                    <p className="mb-2">{diagnostic.message}</p>
                    {diagnostic.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-sm hover:underline">
                          View Details
                        </summary>
                        <pre className="mt-2 p-3 bg-white/50 rounded text-xs overflow-x-auto">
                          {diagnostic.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!session && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-lg mb-2">Not Signed In</h3>
              <p className="mb-4">Sign in with Google to test all connections.</p>
              <a
                href="/api/auth/signin"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In with Google
              </a>
            </div>
          )}

          <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Quick Fixes</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>If OAuth fails:</strong> Verify Google Cloud Console has the redirect URI: 
                <code className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                  {window.location.origin}/api/auth/callback/google
                </code>
              </li>
              <li>
                <strong>If no access token:</strong> Sign out and sign back in to refresh tokens
              </li>
              <li>
                <strong>If Firebase fails:</strong> Check NEXT_PUBLIC_FIREBASE_* environment variables in Replit Secrets
              </li>
              <li>
                <strong>If Google Sheets fails:</strong> Ensure your Google account has access to the spreadsheet
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

