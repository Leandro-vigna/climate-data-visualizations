import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../authOptions';

// GET - Check Google Analytics API quota and token status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session as any)?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For now, we'll return estimated quota info
    // Google Analytics API has these typical limits:
    // - Core Reporting API: 50,000 requests per day
    // - Real-time Reporting API: 10,000 requests per day
    // - Management API: 50,000 requests per day

    // We can estimate based on time of day and typical usage
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hoursIntoDay = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    
    // Rough estimation - would need real API call to Google Analytics Management API for actual quota
    const estimatedUsed = Math.floor(hoursIntoDay * 100); // Rough estimate
    const dailyLimit = 50000; // GA4 standard limit
    const remaining = Math.max(0, dailyLimit - estimatedUsed);
    
    // Calculate reset time (next day at midnight)
    const resetTime = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    return NextResponse.json({
      success: true,
      quota: {
        dailyLimit,
        used: estimatedUsed,
        remaining,
        resetTime: resetTime.toISOString(),
        percentage: Math.min(100, (estimatedUsed / dailyLimit) * 100)
      },
      warning: remaining < 1000 ? 'Low quota remaining - consider waiting until reset' : null,
      note: 'Quota numbers are estimated. Actual limits may vary based on your Google Analytics account type.'
    });

  } catch (error) {
    console.error('Error checking analytics quota:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check quota status' },
      { status: 500 }
    );
  }
}