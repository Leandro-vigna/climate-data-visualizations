import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Save analytics collection to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { toolId, toolName, timePeriod, dataLayers, data, dataSource, totalRecords } = body;

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null,
        }
      });
    }

    // Get or create data tool
    let dataTool = await prisma.dataTool.findFirst({
      where: {
        userId: user.id,
        id: toolId
      }
    });

    if (!dataTool) {
      dataTool = await prisma.dataTool.create({
        data: {
          id: toolId,
          userId: user.id,
          name: toolName,
          progressGA: 100
        }
      });
    } else {
      // Update progress
      await prisma.dataTool.update({
        where: { id: dataTool.id },
        data: { progressGA: 100 }
      });
    }

    // Save analytics collection
    const collection = await prisma.analyticsCollection.create({
      data: {
        userId: user.id,
        dataToolId: dataTool.id,
        toolName,
        timePeriod,
        dataLayers,
        data,
        dataSource: dataSource || 'google-analytics',
        totalRecords: totalRecords || 0
      }
    });

    console.log(`✅ Saved analytics collection: ${collection.id} with ${totalRecords} records`);

    return NextResponse.json({
      success: true,
      collectionId: collection.id,
      message: 'Analytics data saved successfully',
      totalRecords
    });

  } catch (error) {
    console.error('Error saving analytics collection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save analytics collection' },
      { status: 500 }
    );
  }
}

// GET - Retrieve analytics collections for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        collections: []
      });
    }

    // Get collections, optionally filtered by toolId
    const whereClause: any = { userId: user.id };
    if (toolId) {
      whereClause.dataToolId = toolId;
    }

    const collections = await prisma.analyticsCollection.findMany({
      where: whereClause,
      include: {
        dataTool: {
          select: {
            name: true,
            url: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      collections: collections.map(collection => ({
        id: collection.id,
        toolId: collection.dataToolId,
        toolName: collection.toolName,
        collectionDate: collection.collectionDate,
        timePeriod: collection.timePeriod,
        dataLayers: collection.dataLayers,
        dataSource: collection.dataSource,
        totalRecords: collection.totalRecords,
        status: collection.status,
        createdAt: collection.createdAt,
        data: collection.data // Include the actual data
      }))
    });

  } catch (error) {
    console.error('Error retrieving analytics collections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve analytics collections' },
      { status: 500 }
    );
  }
} 