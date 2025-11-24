import { google } from 'googleapis';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const WRITEUP_STORAGE_DIR = path.join(process.cwd(), 'storage', 'writeups');

export interface IndicatorWriteUpInfo {
  indicatorId: string;
  indicatorName?: string;
  progressStatus?: string;
  narrative?: string;
  metadata?: {
    [key: string]: any;
  };
  fullSection?: string;
}

/**
 * Extract indicator ID from title line
 * Format: "[ID number] - [Name] - [[progress status]]"
 * Examples: "X-FIN-85 - Capital investment", "X-FIN-85 - Capital investment - [[On Track]]"
 */
function extractIndicatorIdFromTitle(title: string): string | null {
  // Match pattern: ID at the start (e.g., "X-FIN-85", "FW-134")
  const match = title.match(/^([A-Z]+-[A-Z]+-\d+|[A-Z]+-\d+)/);
  return match ? match[1] : null;
}

/**
 * Parse Google Docs content to extract indicator information
 * 
 * ⚠️ SAFETY GUARANTEE: READ-ONLY ACCESS ONLY
 * This function uses ONLY read-only Google Docs API methods.
 * We will NEVER modify, edit, or write to your Google Docs.
 * Only using: documents.get() - which is read-only.
 * NEVER using: documents.create(), documents.batchUpdate(), or any write operations.
 */
export async function parseGoogleDocWriteUp(
  documentId: string,
  indicatorId: string
): Promise<IndicatorWriteUpInfo | null> {
  try {
    // READ-ONLY authentication - this scope only allows reading documents
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/documents.readonly'], // READ-ONLY ONLY
    });

    const docs = google.docs({ version: 'v1', auth });
    
    // SAFETY: Only using documents.get() - this is a READ-ONLY operation
    // This method only retrieves document content, it does NOT modify anything
    const doc = await docs.documents.get({ documentId });

    if (!doc.data.body?.content) {
      return null;
    }

    // Extract text from document
    const paragraphs: string[] = [];
    doc.data.body.content.forEach((element: any) => {
      if (element.paragraph) {
        const text = element.paragraph.elements
          ?.map((e: any) => e.textRun?.content || '')
          .join('') || '';
        if (text.trim()) {
          paragraphs.push(text.trim());
        }
      }
    });

    return extractIndicatorFromText(paragraphs, indicatorId);

  } catch (error: any) {
    console.error('Error parsing Google Doc:', error);
    throw new Error(`Failed to parse Google Doc: ${error.message}`);
  }
}

/**
 * Parse Word document to extract indicator information
 */
export async function parseWordDocWriteUp(
  system: string,
  indicatorId: string
): Promise<IndicatorWriteUpInfo | null> {
  try {
    // Find the Word document for this system
    const files = fs.readdirSync(WRITEUP_STORAGE_DIR);
    const systemFile = files.find(f => 
      f.toLowerCase().startsWith(system.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '_'))
    );

    if (!systemFile) {
      throw new Error(`No Word document found for system: ${system}`);
    }

    const filePath = path.join(WRITEUP_STORAGE_DIR, systemFile);
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;

    // Split into paragraphs
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);

    return extractIndicatorFromText(paragraphs, indicatorId);

  } catch (error: any) {
    console.error('Error parsing Word Doc:', error);
    throw new Error(`Failed to parse Word Doc: ${error.message}`);
  }
}

/**
 * Extract indicator information from text paragraphs
 */
function extractIndicatorFromText(
  paragraphs: string[],
  targetIndicatorId: string
): IndicatorWriteUpInfo | null {
  const normalizedTargetId = targetIndicatorId.toUpperCase();
  let indicatorStartIndex = -1;
  let indicatorEndIndex = -1;

  // Find the indicator section
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const extractedId = extractIndicatorIdFromTitle(para);
    
    if (extractedId && extractedId.toUpperCase() === normalizedTargetId) {
      indicatorStartIndex = i;
      break;
    }
  }

  if (indicatorStartIndex === -1) {
    return null; // Indicator not found
  }

  // Find the end of this indicator section (next indicator or end of document)
  for (let i = indicatorStartIndex + 1; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const extractedId = extractIndicatorIdFromTitle(para);
    
    // If we find another indicator ID, this section ends
    if (extractedId && extractedId.toUpperCase() !== normalizedTargetId) {
      indicatorEndIndex = i;
      break;
    }
  }

  // Extract the section
  const sectionParagraphs = indicatorEndIndex === -1
    ? paragraphs.slice(indicatorStartIndex)
    : paragraphs.slice(indicatorStartIndex, indicatorEndIndex);

  const titleLine = sectionParagraphs[0];
  const restOfSection = sectionParagraphs.slice(1).join('\n\n');

  // Parse title: "[ID] - [Name] - [[Status]]"
  const titleMatch = titleLine.match(/^([A-Z]+-[A-Z]+-\d+|[A-Z]+-\d+)\s*-\s*(.+?)(?:\s*-\s*\[\[(.+?)\]\]\s*)?$/);
  
  const indicatorName = titleMatch?.[2]?.trim();
  const progressStatus = titleMatch?.[3]?.trim();

  // Find metadata section within the indicator section
  // Metadata sections are structured with specific categories:
  // - Key Terms
  // - Historical Data Methodology and Challenges
  // - Target Methodology
  // - S-Curve Trajectory
  // - Progress Assessment Methodology
  // - Connections
  let metadataStartIndex = -1;
  const metadata: { [key: string]: any } = {};

  // Find where metadata section starts
  for (let i = 0; i < sectionParagraphs.length; i++) {
    const para = sectionParagraphs[i].toLowerCase();
    if (para.includes('metadata') || para.includes('key terms') || para.includes('historical data methodology')) {
      metadataStartIndex = i;
      break;
    }
  }

  if (metadataStartIndex !== -1) {
    // Extract metadata section (from metadata start to end of indicator section)
    const metadataSection = sectionParagraphs.slice(metadataStartIndex).join('\n\n');
    
    // Define the standard metadata categories (in order of likely appearance, but we'll find them dynamically)
    const metadataCategories = [
      'Key Terms',
      'Historical Data Methodology and Challenges',
      'Target Methodology',
      'S-Curve Trajectory',
      'Progress Assessment Methodology',
      'Connections'
    ];

    // First, find all category headers and their positions in the text
    const categoryPositions: Array<{category: string, index: number, normalizedKey: string}> = [];
    
    for (const category of metadataCategories) {
      // Look for category as a header (usually at start of line, possibly with colon)
      const categoryRegex = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?`, 'im');
      const match = metadataSection.match(categoryRegex);
      if (match && match.index !== undefined) {
        categoryPositions.push({
          category,
          index: match.index,
          normalizedKey: category.toLowerCase().replace(/\s+/g, '_')
        });
      }
    }
    
    // Sort by position in document
    categoryPositions.sort((a, b) => a.index - b.index);
    
    // Extract content for each category (from this category to the next, or end of section)
    for (let i = 0; i < categoryPositions.length; i++) {
      const currentCategory = categoryPositions[i];
      const nextCategory = i < categoryPositions.length - 1 ? categoryPositions[i + 1] : null;
      
      const startIndex = currentCategory.index;
      const endIndex = nextCategory ? nextCategory.index : metadataSection.length;
      
      // Extract the section content
      let categoryContent = metadataSection.substring(startIndex, endIndex);
      
      // Remove the category header itself
      categoryContent = categoryContent
        .replace(new RegExp(`^${currentCategory.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?`, 'i'), '')
        .trim();
      
      // Remove leading colon and whitespace if present
      categoryContent = categoryContent.replace(/^:\s*/, '').trim();
      
      // Remove any standalone colons or colons with only whitespace
      categoryContent = categoryContent.replace(/^:\s*$/, '').trim();
      
      // Remove empty content or just colons
      if (categoryContent && categoryContent !== ':' && categoryContent.length > 0) {
        metadata[currentCategory.normalizedKey] = categoryContent;
      }
    }

    // Also extract URLs (but not provider, units, frequency - those should come from Excel metadata, not write-ups)
    const urlPattern = /(?:url|website|link|source)[:\s]*(https?:\/\/[^\s\n]+)/gi;
    const urls = Array.from(metadataSection.matchAll(urlPattern)).map(m => m[1]);
    if (urls.length > 0) {
      metadata.urls = urls;
    }
  }

  // Narrative is everything before metadata section
  const narrativeEnd = metadataStartIndex !== -1 ? metadataStartIndex : sectionParagraphs.length;
  const narrative = sectionParagraphs.slice(1, narrativeEnd).join('\n\n').trim();

  return {
    indicatorId: targetIndicatorId,
    indicatorName,
    progressStatus,
    narrative,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    fullSection: sectionParagraphs.join('\n\n')
  };
}

