import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../authOptions';

interface PageViewData {
  date: string;
  page: string;
  pageViews: number;
}

interface GeographicUserData {
  date: string;
  country: string;
  activeUsers: number; // Active users per country per day
}

interface LandingPageTrafficData {
  date: string;
  landingPage: string;
  source: string; // Traffic source (e.g., "google", "facebook", "(direct)")
  medium: string; // Traffic medium (e.g., "organic", "cpc", "(none)")
  sessions: number; // Sessions for this specific combination
}

// MOCK FUNCTION DISABLED - Only real Google Analytics data allowed
function generateMockAnalyticsData_DISABLED(days: number): PageViewData[] {
  const data: PageViewData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate data for different pages - one record per page per day
    const pages = [
      '/', // Homepage
      '/climate-data',
      '/emissions-data', 
      '/country-profiles',
      '/data-explorer',
      '/downloads',
      '/about',
      '/contact',
      '/api',
      '/documentation',
      '/blog',
      '/news',
      '/research',
      '/publications',
      '/tools',
      '/resources',
      '/help',
      '/faq',
      '/dashboard',
      '/analytics',
      '/reports',
      '/settings',
      '/profile',
      '/login',
      '/register',
      '/forgot-password',
      '/privacy-policy',
      '/terms-of-service',
      '/sitemap',
      '/robots.txt'
    ];
    
    pages.forEach(page => {
      // Generate one record per page per day with realistic page views
      const pageViews = Math.floor(Math.random() * 500) + 50;
      
      data.push({
        date: dateStr,
        page,
        pageViews
      });
    });
  }
  
  return data;
}

// Function to fetch Google Analytics data using OAuth token
async function fetchGoogleAnalyticsDataOAuth(
  days: number,
  accessToken: string,
  toolViewId?: string,
  startDateOverride?: string,
  endDateOverride?: string
): Promise<PageViewData[]> {
  try {
    // FORCE correct GA4 Property ID (ignore toolViewId which is wrong)
    const propertyId = '325582229'; // This is the correct property ID that works
    
    console.log(`🔍 Using GA4 Property ID: ${propertyId}`);

    if (!accessToken) {
      throw new Error('No access token provided. Please sign in with Google.');
    }

    // Create OAuth2 client with the access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    // Create analytics client for GA4
    console.log('🔧 Creating GA4 analytics client...');
    let analyticsData;
    try {
      analyticsData = google.analyticsdata('v1beta');
      console.log('✅ GA4 client created successfully');
    } catch (clientError: any) {
      console.error('❌ Failed to create GA4 client:', clientError);
      throw new Error(`GA4 client creation failed: ${clientError?.message || String(clientError)}`);
    }
    
    // Calculate date range dynamically based on user selection
    const endDate = endDateOverride || new Date().toISOString().split('T')[0]; // Today
    const startDate = startDateOverride || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // X days ago

    console.log(`📊 Fetching REAL Google Analytics GA4 data with OAuth for ${days} days (${startDate} to ${endDate})`);
    console.log(`🎯 Property ID: ${propertyId}`);
    console.log(`🔑 Access token length: ${accessToken.length} characters`);
    console.log(`📅 TODAY'S DATE: ${new Date().toISOString()}`);
    console.log(`📅 CALCULATED END DATE: ${endDate}`);
    console.log(`📅 CALCULATED START DATE: ${startDate}`);

    // Retry logic for API calls
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
            console.log('🚀 Making GA4 API call with config:', {
      property: `properties/${propertyId}`,
      dateRange: `${startDate} to ${endDate}`,
      metrics: ['screenPageViews'],
      dimensions: ['date', 'pagePath'],
      accessTokenLength: accessToken.length,
      propertyIdUsed: propertyId
    });
        
        const response = await analyticsData.properties.runReport({
          auth: oauth2Client,
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'screenPageViews' }
            ],
            dimensions: [
              { name: 'date' },
              { name: 'pagePath' }
            ],
            limit: '100000', // Max rows per request
            keepEmptyRows: true
          }
        }) as any;
        
        console.log('✅ GA4 API call completed, response received');

        if (!response.data?.rows) {
          console.log('📊 No data returned from Google Analytics GA4');
          return [];
        }

        const data: PageViewData[] = response.data.rows.map((row: any) => ({
          date: row.dimensionValues![0].value!,
          page: row.dimensionValues![1].value!,
          pageViews: parseInt(row.metricValues![0].value! || '0')
        }));

        console.log(`✅ Successfully fetched ${data.length} records from Google Analytics GA4 via OAuth`);
        return data;

      } catch (error: any) {
        lastError = error;
        console.error('❌ GA4 API call failed:', {
          error: error.message,
          code: error.code,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack?.substring(0, 200)
        });

        // Check if it's a retryable error (502, 503, 504, or network issues)
        const isRetryable = error.code === 502 || error.code === 503 || error.code === 504 ||
                           error.message?.includes('network') || error.message?.includes('timeout');

        if (isRetryable && retries > 1) {
          console.log(`⚠️ Google Analytics API error (${error.code || 'unknown'}), retrying... (${retries - 1} attempts left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          continue;
        } else {
          break;
        }
      }
    }

    // If we get here, all retries failed
    console.error('❌ Google Analytics API failed after retries:', lastError?.message || lastError);

    // For 401 errors (OAuth issues), provide helpful message
    if (lastError?.code === 401) {
      throw new Error('Google Analytics access denied. Please sign out and sign in again to refresh your permissions.');
    }

      // For 403 errors (no access to view), provide helpful message  
  if (lastError?.code === 403) {
    console.error('❌ 403 ERROR DETAILS:', {
      message: lastError?.message,
      details: lastError?.details,
      errors: lastError?.errors,
      propertyId: propertyId,
      accessTokenPrefix: accessToken.substring(0, 20) + '...'
    });
    throw new Error(`403 FORBIDDEN: Cannot access GA4 property ${propertyId}. This worked in our test but fails in main route. Check if property ID is different or request format has issues.`);
  }

    // For 502 errors (Google server issues), provide a helpful message
    if (lastError?.code === 502) {
      throw new Error('Google Analytics API is temporarily unavailable (502 error). This is a Google server issue. Please try again in a few minutes.');
    }

    throw lastError || new Error('Failed to fetch Google Analytics data');

  } catch (error: any) {
    console.error('❌ Error fetching Google Analytics data via OAuth:', error);
    throw error;
  }
}

// Function to fetch Geographic Sessions data using OAuth token
async function fetchGeographicUsersOAuth(
  days: number,
  accessToken: string,
  startDateOverride?: string,
  endDateOverride?: string
): Promise<GeographicUserData[]> {
  try {
    // FORCE correct GA4 Property ID (same as pageviews)
    const propertyId = '325582229'; // This is the correct property ID that works
    
    console.log(`🌍 [DEBUG] Fetching Geographic Sessions data for ${days} days from property: ${propertyId}`);
    console.log(`🌍 [DEBUG] Access token available: ${!!accessToken}, length: ${accessToken?.length || 0}`);

    if (!accessToken) {
      throw new Error('No access token provided for geographic sessions.');
    }

    // Create OAuth2 client with the access token
    console.log(`🌍 [DEBUG] Creating OAuth2 client...`);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    console.log(`🌍 [DEBUG] OAuth2 client created and credentials set`);

    // Create analytics client for GA4
    console.log(`🌍 [DEBUG] Creating GA4 analytics client...`);
    const analyticsData = google.analyticsdata('v1beta');
    console.log(`🌍 [DEBUG] GA4 analytics client created successfully`);
    
    // Calculate date range
    const endDate = endDateOverride || new Date().toISOString().split('T')[0];
    const startDate = startDateOverride || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`🌍 Geographic Sessions API call: ${startDate} to ${endDate}`);

    // Retry logic for API calls
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        console.log(`🌍 [DEBUG] Making GA4 API call for geographic users...`);
        console.log(`🌍 [DEBUG] Request config:`, {
          property: `properties/${propertyId}`,
          dateRange: `${startDate} to ${endDate}`,
          metrics: ['screenPageViews'],
          dimensions: ['date', 'country'],
          limit: '100000'
        });
        
        console.log(`🌍 [DEBUG] Using exact same request as pageviews but with country dimension`);
        
        const response = await analyticsData.properties.runReport({
          auth: oauth2Client,
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'screenPageViews' }
            ],
            dimensions: [
              { name: 'date' },
              { name: 'country' }
            ],
            limit: '100000',
            keepEmptyRows: true
          }
        }) as any;
        
        console.log(`🌍 [DEBUG] GA4 API call completed, checking response...`);
        
        console.log('✅ Geographic Sessions API call completed');

        if (!response.data?.rows) {
          console.log('🌍 No geographic session data returned');
          return [];
        }

        const data: GeographicUserData[] = response.data.rows.map((row: any) => ({
          date: row.dimensionValues![0].value!,
          country: row.dimensionValues![1].value!,
          activeUsers: parseInt(row.metricValues![0].value! || '0') // screenPageViews metric (page views by country)
        }));

        console.log(`✅ Successfully fetched ${data.length} geographic user records`);
        return data;

      } catch (error: any) {
        lastError = error;
        console.error('❌ [DEBUG] Geographic Sessions API call failed:', {
          error: error.message,
          code: error.code,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack?.substring(0, 300),
          fullError: error
        });

        const isRetryable = error.code === 502 || error.code === 503 || error.code === 504;
        
        if (isRetryable && retries > 1) {
          console.log(`⚠️ Geographic Sessions API error, retrying... (${retries - 1} attempts left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          break;
        }
      }
    }

    // Handle authentication errors
    if (lastError?.code === 401) {
      throw new Error('Geographic Sessions access denied. Please refresh your Google permissions.');
    }

    if (lastError?.code === 403) {
      throw new Error(`403 FORBIDDEN: Cannot access geographic data for property ${propertyId}.`);
    }

    throw lastError || new Error('Failed to fetch Geographic Sessions data');

  } catch (error: any) {
    console.error('❌ Error fetching Geographic Sessions data:', error);
    throw error;
  }
}

// Function to fetch Landing Page Traffic Breakdown data using OAuth token
async function fetchLandingPageTrafficOAuth(
  days: number,
  accessToken: string,
  startDateOverride?: string,
  endDateOverride?: string
): Promise<LandingPageTrafficData[]> {
  try {
    const propertyId = '325582229'; // Use the same property ID
    
    console.log(`🚀 [DEBUG] Fetching Landing Page Traffic data for ${days} days from property: ${propertyId}`);
    console.log(`🚀 [DEBUG] Access token available: ${!!accessToken}, length: ${accessToken?.length || 0}`);

    if (!accessToken) {
      throw new Error('No access token provided for Landing Page Traffic data.');
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const analyticsData = google.analyticsdata('v1beta');

    // Calculate date range EXACTLY like other functions
    const endDate = endDateOverride || new Date().toISOString().split('T')[0]; // Today
    const startDate = startDateOverride || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // X days ago

    console.log(`🚀 [DEBUG] Date range: ${startDate} to ${endDate} (${days} days)`);

    // Retry logic
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        console.log(`🚀 [DEBUG] Making GA4 API call for landing page traffic...`);
        console.log(`🚀 [DEBUG] GA4 API Request details:`, {
          property: `properties/${propertyId}`,
          dateRange: `${startDate} to ${endDate}`,
          metrics: ['screenPageViews'],
          dimensions: ['date', 'pagePath', 'sessionSource', 'sessionMedium'],
          orderBy: 'screenPageViews DESC',
          requestBody: JSON.stringify({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [
              { name: 'date' },
              { name: 'pagePath' },
              { name: 'sessionSource' },
              { name: 'sessionMedium' }
            ],
            metrics: [{ name: 'screenPageViews' }],
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
          }, null, 2)
        });
        
        const response = await analyticsData.properties.runReport({
          auth: oauth2Client,
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'screenPageViews' }
            ],
            dimensions: [
              { name: 'date' },
              { name: 'pagePath' },
              { name: 'sessionSource' },
              { name: 'sessionMedium' }
            ],

            keepEmptyRows: false,
            // Order by screenPageViews descending to get top traffic first
            orderBys: [
              {
                metric: {
                  metricName: 'screenPageViews'
                },
                desc: true
              }
            ]
          }
        } as any);

        console.log(`🚀 [DEBUG] Response received, processing landing page traffic data...`);

        const rowCount = (response as any)?.data?.rowCount as number | undefined;
        const quota = (response as any)?.data?.propertyQuota;
        if (quota) {
          console.log('📉 [QUOTA] propertyQuota:', quota);
        }

        if (!response.data?.rows) {
          console.log('🚀 No landing page traffic data returned');
          return [];
        }

        // Process raw data and group by date to get top 50 landing pages per day
        const dataByDate: { [date: string]: LandingPageTrafficData[] } = {};
        
        response.data.rows.forEach((row: any, index: number) => {
          const date = row.dimensionValues![0].value!;
          const landingPage = row.dimensionValues![1].value!;
          const source = row.dimensionValues![2].value! || '(direct)';
          const medium = row.dimensionValues![3].value! || '(none)';
          const sessions = parseInt(row.metricValues![0].value! || '0');
          
          // Debug logging for first few rows to see what we're getting
          if (index < 3) {
            console.log(`🚀 [DEBUG] Row ${index + 1} raw data:`, {
              date,
              landingPage,
              rawSource: row.dimensionValues![2],
              rawMedium: row.dimensionValues![3],
              processedSource: source,
              processedMedium: medium,
              sessions,
              allDimensionValues: row.dimensionValues
            });
          }
          
          // Skip records with very low sessions to reduce noise
          if (sessions < 5) {
            return;
          }
          
          if (!dataByDate[date]) {
            dataByDate[date] = [];
          }
          
          dataByDate[date].push({
            date,
            landingPage,
            source,
            medium,
            sessions
          });
        });

        // Filter to top 50 landing pages per day by total sessions
        const finalData: LandingPageTrafficData[] = [];
        
        Object.keys(dataByDate).forEach(date => {
          console.log(`🚀 [DEBUG] Processing date: ${date}, records: ${dataByDate[date].length}`);
          
          // Group by landing page to calculate total sessions per page for this date
          const landingPageTotals: { [page: string]: number } = {};
          dataByDate[date].forEach(record => {
            if (!landingPageTotals[record.landingPage]) {
              landingPageTotals[record.landingPage] = 0;
            }
            landingPageTotals[record.landingPage] += record.sessions;
          });
          
          // Get top 50 landing pages for this specific date by total sessions
          const top50Pages = Object.entries(landingPageTotals)
            .sort(([,a], [,b]) => b - a) // Sort by sessions descending
            .slice(0, 50) // Take top 50
            .map(([page]) => page);
          
          console.log(`🚀 [DEBUG] Date ${date}: ${Object.keys(landingPageTotals).length} total pages, keeping top 50`);
          console.log(`🚀 [DEBUG] Top 5 pages for ${date}:`, Object.entries(landingPageTotals).sort(([,a], [,b]) => b - a).slice(0, 5));
          
          // Include only source/medium records for the top 50 landing pages
          const dateFilteredRecords = dataByDate[date].filter(record => 
            top50Pages.includes(record.landingPage)
          );
          
          console.log(`🚀 [DEBUG] Date ${date}: Filtered from ${dataByDate[date].length} to ${dateFilteredRecords.length} records`);
          finalData.push(...dateFilteredRecords);
        });

        console.log(`✅ Successfully fetched ${finalData.length} landing page traffic records`);
        console.log(`🚀 [DEBUG] Sample data:`, finalData.slice(0, 3));
        
        return finalData;

      } catch (error: any) {
        lastError = error;
        console.error('❌ [DEBUG] Landing Page Traffic API call failed:', {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error.details,
          response: error.response?.data,
          stack: error.stack
        });
        
        // Try to get more specific error info
        if (error.response?.data?.error) {
          console.error('🔍 [DEBUG] Google API Error Details:', error.response.data.error);
        }
        
        if (error.status === 403) {
          console.error('🔒 [DEBUG] Permission denied - may need additional scopes');
        } else if (error.status === 400) {
          console.error('🚫 [DEBUG] Bad Request - dimensions or filters may be invalid');
        }
        
        retries--;
        if (retries > 0) {
          console.log(`🔄 [DEBUG] Retrying... ${retries} attempts left`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.error('❌ All retries exhausted for Landing Page Traffic');
    throw lastError;

  } catch (error: any) {
    console.error('❌ fetchLandingPageTrafficOAuth failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    throw error;
  }
}

// Function to fetch real Google Analytics data (legacy service account method)
async function fetchGoogleAnalyticsData(days: number, toolViewId?: string): Promise<PageViewData[]> {
  try {
    // Import our configuration loader
    const { getGoogleAnalyticsConfig } = await import('@/lib/google-analytics-config');
    const config = getGoogleAnalyticsConfig();
    
    const clientEmail = config.clientEmail;
    const privateKey = config.privateKey;
    const viewId = toolViewId || config.viewId;

    console.log('🔐 Checking credentials...');
    console.log('Client Email:', clientEmail ? '✅ Found' : '❌ Missing');
    console.log('Private Key:', privateKey ? '✅ Found' : '❌ Missing');
    console.log('View ID:', viewId ? `✅ Found: ${viewId}` : '❌ Missing');

    if (!clientEmail || !privateKey || !viewId) {
      throw new Error('Google Analytics credentials not found. Please check the configuration.');
    }

    // Create JWT client
    console.log('🔧 Creating JWT client...');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });

    // Test authentication
    console.log('🔑 Attempting to authenticate with Google...');
    try {
      await auth.authorize();
      console.log('✅ Authentication successful!');
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError.message);
      throw new Error(`Google Analytics authentication failed: ${authError.message}`);
    }

    // Create analytics client for GA4
    console.log('🔧 Creating GA4 analytics client...');
    let analyticsData;
    try {
      analyticsData = google.analyticsdata('v1beta');
      console.log('✅ GA4 client created successfully');
    } catch (clientError: any) {
      console.error('❌ Failed to create GA4 client:', clientError);
      throw new Error(`GA4 client creation failed: ${clientError?.message || String(clientError)}`);
    }
    
    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`📊 Fetching REAL Google Analytics GA4 data (Service Account) for ${days} days (${startDate} to ${endDate})`);
    console.log(`🎯 Property ID: ${viewId}`);

    // Retry logic for API calls
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        console.log(`🚀 Making Google Analytics GA4 API request (Property ID: ${viewId})...`);
        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${viewId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'screenPageViews' }
            ],
            dimensions: [
              { name: 'date' },
              { name: 'pagePath' }
            ],
            limit: '50', // Small subset for verification as requested
            keepEmptyRows: true
          }
        }) as any;
        
        console.log('✅ Google Analytics API call successful!');

        if (!response.data.rows) {
          console.log('📊 No data returned from Google Analytics GA4');
          return [];
        }

        console.log(`📊 Found ${response.data.rows.length} rows of real Google Analytics GA4 data`);

        const data: PageViewData[] = response.data.rows.map((row: any) => ({
          date: row.dimensionValues[0].value, // Already in YYYY-MM-DD format in GA4
          page: row.dimensionValues[1].value,
          pageViews: parseInt(row.metricValues[0].value || '0')
        }));

        console.log(`✅ Successfully fetched ${data.length} records from Google Analytics GA4`);
        return data;

      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error (502, 503, 504, or network issues)
        const isRetryable = error.code === 502 || error.code === 503 || error.code === 504 || 
                           error.message?.includes('network') || error.message?.includes('timeout');
        
        if (isRetryable && retries > 1) {
          console.log(`⚠️ Google Analytics API error (${error.code || 'unknown'}), retrying... (${retries - 1} attempts left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          continue;
        } else {
          break;
        }
      }
    }

    // If we get here, all retries failed
    console.error('❌ Google Analytics API failed after retries:', lastError?.message || lastError);
    
    // For 502 errors (Google server issues), provide a helpful message
    if (lastError?.code === 502) {
      throw new Error('Google Analytics API is temporarily unavailable (502 error). This is a Google server issue. Please try again in a few minutes.');
    }
    
    throw lastError || new Error('Failed to fetch Google Analytics data');

  } catch (error: any) {
    console.error('❌ Error fetching Google Analytics data:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Analytics API route called - DEBUGGING');
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;
    const useBatched = searchParams.get('batched') === '1';
    const onlyPreflight = searchParams.get('onlyPreflight') === '1';
    const toolId = searchParams.get('toolId');
    const dataLayers = searchParams.get('dataLayers')?.split(',') || ['pageviews'];
    const useRealData = true; // ALWAYS use real data - NO MOCK DATA EVER
    
    console.log(`📊 Analytics API called: days=${days}, start=${startDateParam}, end=${endDateParam}, batched=${useBatched}, toolId=${toolId}, dataLayers=${dataLayers.join(',')}, useRealData=${useRealData}`);
    
    let data: PageViewData[] | GeographicUserData[] | LandingPageTrafficData[] = [];
    let dataType = 'pageviews'; // Default to pageviews
    let preflightInfo: any = null;
    
    if (useRealData) {
      // SKIP service account - go straight to OAuth since we know it works
      console.log('🔑 Using OAuth authentication (service account bypassed)...');
      
      const session = await getServerSession(authOptions);
      
      if (!(session as any)?.accessToken) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'AUTHENTICATION REQUIRED: Please sign in with Google to access your Analytics data.',
            authRequired: true,
            solution: 'Sign out and sign in again with the Google account that has access to Property ID 325582229'
          },
          { status: 401 }
        );
      }

      // Fetch real Google Analytics data using OAuth
      const sessionToken = (session as any)?.accessToken;
      console.log('🔑 Session details:', {
        hasAccessToken: !!sessionToken,
        tokenLength: sessionToken?.length || 0,
        expires: session?.expires
      });
      
      if (!sessionToken) {
        throw new Error('No access token found in session');
      }
      
      if (!session) {
        throw new Error('No session found');
      }
      
      try {
        // Determine which data to fetch based on selected data layers
        console.log('🔍 Data layers requested:', dataLayers);
        console.log('🔍 Geographic layer check:', dataLayers.includes('geographic'));

        // Optional preflight to decide if batching is recommended
        if (startDateParam && endDateParam && !useBatched) {
          try {
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: sessionToken });
            const analyticsData = google.analyticsdata('v1beta');
            const propertyId = '325582229';
            const startDate = startDateParam;
            const endDate = endDateParam;

            const isGeo = dataLayers.includes('geographic');
            const isLanding = dataLayers.includes('landingpages');
            const dims = isGeo
              ? [{ name: 'date' }, { name: 'country' }]
              : isLanding
              ? [{ name: 'date' }, { name: 'pagePath' }, { name: 'sessionSource' }, { name: 'sessionMedium' }]
              : [{ name: 'date' }, { name: 'pagePath' }];

            const preResp: any = await analyticsData.properties.runReport({
              auth: oauth2Client,
              property: `properties/${propertyId}`,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                metrics: [{ name: 'screenPageViews' }],
                dimensions: dims,
                limit: '1',
              },
            });

            const rowCount = preResp?.data?.rowCount || 0;
            const quota = preResp?.data?.propertyQuota || null;
            const msInDay = 24 * 60 * 60 * 1000;
            const totalDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / msInDay) + 1;
            const tokensHourRemaining = quota?.tokensPerHour?.remaining ?? null;
            const tokensDayRemaining = quota?.tokensPerDay?.remaining ?? null;

            const recommendByRows = rowCount > 90000; // near 100k per-request cap
            const recommendByDays = totalDays > 60 && (isLanding || !isGeo); // long spans likely heavy
            const recommendByQuota = (tokensHourRemaining !== null && tokensHourRemaining < 1000) ||
                                     (tokensDayRemaining !== null && tokensDayRemaining < 5000);

            const recommended = recommendByRows || recommendByDays || recommendByQuota;
            const reasons: string[] = [];
            if (recommendByRows) reasons.push(`rowCount≈${rowCount.toLocaleString()} close to per-request cap`);
            if (recommendByDays) reasons.push(`${totalDays} days span`);
            if (recommendByQuota) reasons.push('low remaining tokens');

            preflightInfo = {
              rowCount,
              quota,
              batchRecommended: recommended,
              batchReason: recommended ? reasons.join('; ') : undefined,
              totalDays,
            };

            // If this is an explicit preflight request, return early with metadata only
            if (onlyPreflight) {
              // Determine dataType for context
              dataType = isGeo ? 'geographic' : isLanding ? 'landingpages' : 'pageviews';

              return NextResponse.json({
                success: true,
                preflight: true,
                data: [],
                totalRecords: 0,
                dataType,
                dateRange: { start: startDate, end: endDate },
                toolId,
                dataSource: 'google-analytics',
                note: 'Preflight only: no data fetched',
                quota,
                rowCount,
                batchRecommended: recommended,
                batchReason: recommended ? reasons.join('; ') : null,
              });
            }
          } catch (pfErr) {
            console.log('Preflight skipped due to error:', pfErr);
          }
        }
        
        const buildChunks = () => {
          if (!(startDateParam && endDateParam)) return null;
          const start = new Date(startDateParam);
          const end = new Date(endDateParam);
          const msInDay = 24 * 60 * 60 * 1000;
          const totalDays = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;
          const chunkDays = useBatched ? 14 : totalDays; // 1–2 week chunks when batched
          const chunks: { start: string; end: string }[] = [];
          let cursor = new Date(start);
          while (cursor <= end) {
            const chunkStart = new Date(cursor);
            const chunkEnd = new Date(Math.min(end.getTime(), cursor.getTime() + (chunkDays - 1) * msInDay));
            chunks.push({
              start: chunkStart.toISOString().split('T')[0],
              end: chunkEnd.toISOString().split('T')[0]
            });
            cursor = new Date(chunkEnd.getTime() + msInDay);
          }
          return chunks;
        };

        if (dataLayers.includes('geographic')) {
          console.log('🌍 Fetching Geographic Sessions data...');
          console.log('🌍 Session token available:', !!sessionToken);
          console.log('🌍 Days requested:', days);
          
          try {
            const chunks = buildChunks();
            if (chunks) {
              const results: GeographicUserData[] = [];
              for (const c of chunks) {
                try {
                  const part = await fetchGeographicUsersOAuth(0, sessionToken, c.start, c.end);
                  results.push(...part);
                } catch (e: any) {
                  console.error('Chunk failed', c, e?.message || e);
                  await new Promise(r => setTimeout(r, 1500));
                }
              }
              data = results;
            } else {
              data = await fetchGeographicUsersOAuth(days, sessionToken);
            }
            dataType = 'geographic';
            console.log(`✅ Geographic Users OAuth succeeded: ${data.length} records`);
          } catch (geoError: any) {
            console.error('❌ Geographic Users specific error:', geoError);
            throw new Error(`Geographic Users failed: ${geoError.message || geoError}`);
          }
        } else if (dataLayers.includes('landingpages')) {
          console.log('🚀 Fetching Landing Page Traffic data...');
          console.log('🚀 Session token available:', !!sessionToken);
          console.log('🚀 Days requested:', days);
          
          try {
            const chunks = buildChunks();
            if (chunks) {
              const results: LandingPageTrafficData[] = [];
              for (const c of chunks) {
                try {
                  const part = await fetchLandingPageTrafficOAuth(0, sessionToken, c.start, c.end);
                  results.push(...part);
                } catch (e: any) {
                  console.error('Chunk failed', c, e?.message || e);
                  await new Promise(r => setTimeout(r, 1500));
                }
              }
              data = results;
            } else {
              data = await fetchLandingPageTrafficOAuth(days, sessionToken);
            }
            dataType = 'landingpages';
            console.log(`✅ Landing Page Traffic OAuth succeeded: ${data.length} records`);
          } catch (landingError: any) {
            console.error('❌ Landing Page Traffic specific error:', landingError);
            throw new Error(`Landing Page Traffic failed: ${landingError.message || landingError}`);
          }
        } else {
          // Default to pageviews data
          console.log('📊 Fetching Pageviews data...');
          const chunks = buildChunks();
          if (chunks) {
            const results: PageViewData[] = [];
            for (const c of chunks) {
              try {
                const part = await fetchGoogleAnalyticsDataOAuth(0, sessionToken, undefined, c.start, c.end);
                results.push(...part);
              } catch (e: any) {
                console.error('Chunk failed', c, e?.message || e);
                await new Promise(r => setTimeout(r, 1500));
              }
            }
            data = results;
          } else {
            data = await fetchGoogleAnalyticsDataOAuth(days, sessionToken);
          }
          dataType = 'pageviews';
          console.log(`✅ Pageviews OAuth succeeded: ${data.length} records`);
        }
      } catch (oauthError: any) {
        console.error(`❌ OAuth ${dataType} data failed:`, {
          error: oauthError.message,
          status: oauthError.status,
          code: oauthError.code,
          details: oauthError.response?.data || oauthError.details,
          url: oauthError.config?.url,
          method: oauthError.config?.method
        });
        throw oauthError;
      }
      
      // If no real data available, return error
      if (data.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No Google Analytics data available for the specified time period.',
            note: 'This could mean the website had no traffic during this period, or you may need to check the View ID.'
          },
          { status: 404 }
        );
      }
    } else {
      // NO MOCK DATA EVER - This should never be reached
      throw new Error('Mock data is disabled. Only real Google Analytics data is allowed.');
    }
    
    console.log(`Returning ${data.length} ${dataType} records for ${days} days`);
    
    // Build response object based on data type
    const baseResponse = {
      success: true,
      data,
      totalRecords: data.length,
      dataType,
      dataLayers,
      dateRange: startDateParam && endDateParam
        ? { start: startDateParam, end: endDateParam }
        : {
            start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          },
      toolId,
      dataSource: 'google-analytics',
      note: `Real Google Analytics GA4 ${dataType} data from your Climate Watch property`,
      quota: preflightInfo?.quota || null,
      rowCount: preflightInfo?.rowCount || null,
      batchRecommended: preflightInfo?.batchRecommended || false,
      batchReason: preflightInfo?.batchReason || null,
    };

    // Add type-specific metadata
    if (dataType === 'pageviews') {
      return NextResponse.json({
        ...baseResponse,
        uniquePages: new Set((data as PageViewData[]).map(d => d.page)).size
      });
    } else if (dataType === 'geographic') {
      return NextResponse.json({
        ...baseResponse,
        uniqueCountries: new Set((data as GeographicUserData[]).map(d => d.country)).size,
        totalActiveUsers: (data as GeographicUserData[]).reduce((sum, d) => sum + d.activeUsers, 0) // total page views across all countries
      });
    } else if (dataType === 'landingpages') {
      return NextResponse.json({
        ...baseResponse,
        uniqueLandingPages: new Set((data as LandingPageTrafficData[]).map(d => d.landingPage)).size,
        uniqueSources: new Set((data as LandingPageTrafficData[]).map(d => d.source)).size,
        uniqueMediums: new Set((data as LandingPageTrafficData[]).map(d => d.medium)).size,
        uniqueSourceMediumCombos: new Set((data as LandingPageTrafficData[]).map(d => `${d.source}/${d.medium}`)).size,
        totalSessions: (data as LandingPageTrafficData[]).reduce((sum, d) => sum + d.sessions, 0) // total sessions across all landing pages
      });
    }

    return NextResponse.json(baseResponse);
    
  } catch (error) {
    console.error('❌ MAIN ANALYTICS API ERROR:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'REAL GOOGLE ANALYTICS DATA FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        propertyId: '325582229',
        note: 'Only real Google Analytics data is allowed. Mock data is disabled.',
        debug: 'Check server logs for detailed error information',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolId, timePeriod, dataLayers } = body;
    
    // In a real implementation, you would:
    // 1. Validate the request
    // 2. Store the collection parameters
    // 3. Trigger the actual data collection process
    // 4. Return a job ID for tracking
    
    return NextResponse.json({
      success: true,
      message: 'Data collection initiated',
      jobId: `job_${Date.now()}`,
      toolId,
      timePeriod,
      dataLayers,
      note: 'This is a mock response. In production, this would trigger real Google Analytics data collection.'
    });
    
  } catch (error) {
    console.error('Analytics collection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate data collection' },
      { status: 500 }
    );
  }
} 