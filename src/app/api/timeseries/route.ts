import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '../../../lib/prisma';

// Helper function to get user from token
async function getUserFromToken(req: NextRequest) {
  try {
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.email) {
      console.error('No email in token');
      return null;
    }

    // Find or create user by email
    const user = await prisma.user.upsert({
      where: { email: token.email },
      update: {},
      create: {
        email: token.email,
        name: token.name || token.email.split('@')[0],
      },
    });

    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// GET: List all timeseries for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      console.error('No user found from token');
      return new NextResponse(null, { status: 401 });
    }

    const timeSeries = await prisma.timeSeries.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(timeSeries);
  } catch (error) {
    console.error('Error in GET /api/timeseries:', error);
    return new NextResponse(null, { status: 500 });
  }
}

// POST: Create a new timeseries for the authenticated user
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      console.error('No user found from token');
      return new NextResponse(null, { status: 401 });
    }

    const body = await req.json();
    const { name, dataPoints } = body;

    const timeSeries = await prisma.timeSeries.create({
      data: {
        name,
        dataPoints,
        userId: user.id,
      },
    });

    return NextResponse.json(timeSeries);
  } catch (error) {
    console.error('Error in POST /api/timeseries:', error);
    return new NextResponse(null, { status: 500 });
  }
}

// DELETE: Delete a timeseries by id for the authenticated user
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      console.error('No user found from token');
      return new NextResponse(null, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    // Verify ownership
    const timeSeries = await prisma.timeSeries.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!timeSeries) {
      return new NextResponse(null, { status: 404 });
    }

    await prisma.timeSeries.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/timeseries:', error);
    return new NextResponse(null, { status: 500 });
  }
} 