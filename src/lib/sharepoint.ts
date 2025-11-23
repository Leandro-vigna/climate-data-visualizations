import { getServerSession } from 'next-auth/next';
import { authOptions } from '../app/authOptions';
import { ExcelNotesMetadata } from './types/metadata';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Local filesystem configuration for synced SharePoint files
// Default path for OneDrive synced SharePoint files on Mac
// Can be overridden via environment variable or passed as parameter from API
const DEFAULT_LOCAL_BASE_PATH = process.env.SHAREPOINT_LOCAL_PATH || 
  '/Users/leandrovigna/Library/CloudStorage/OneDrive-WorldResourcesInstitute/Systems Change Lab - Data collection';

// Subfolder IDs to search in order of priority
const SEARCH_SUBFOLDERS = [
  'Transport',
  'Energy', 
  'Buildings',
  'Carbon Removal',
  'Circular Economy',
  'Cities',
  'Economics',
  'Finance',
  'Food and Agriculture',
  'Forests and Land',
  'Freshwater',
  'Governance',
  'Industry',
  'Ocean'
];

export interface SharePointFileData {
  lastUpdatedDate?: string;
  lastAccessedDate?: string;
  error?: string;
  filePath?: string;
}

export interface SharePointAuthConfig {
  accessToken: string;
  siteId?: string;
  driveId?: string;
}

/**
 * Get SharePoint authentication configuration
 */
export async function getSharePointAuth(): Promise<SharePointAuthConfig | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session as any)?.accessToken) {
      throw new Error('No access token found in session. Please sign in with your Microsoft account (@wri.org) to access SharePoint.');
    }

    // Note: Currently the app uses Google OAuth, but SharePoint requires Microsoft/Azure AD authentication
    // The accessToken here is a Google token, which won't work for SharePoint
    // This will need to be updated when Azure AD authentication is configured
    const accessToken = (session as any).accessToken;
    
    // Check if this is likely a Microsoft token (starts with different format)
    // For now, we'll attempt to use it but it will likely fail with 401
    return {
      accessToken: accessToken
    };
  } catch (error: any) {
    console.error('Error getting SharePoint auth:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('Failed to get SharePoint authentication. Please ensure you are signed in with your Microsoft account.');
  }
}

/**
 * Get SharePoint site information
 */
export async function getSharePointSiteInfo(auth: SharePointAuthConfig): Promise<{siteId: string, driveId: string} | null> {
  try {
    // Get site ID
    const siteResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/onewri.sharepoint.com:/sites/SystemsChangeLab`,
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!siteResponse.ok) {
      const errorText = await siteResponse.text();
      console.error('SharePoint site info error:', siteResponse.status, errorText);
      if (siteResponse.status === 401) {
        throw new Error('SharePoint authentication failed (401). Please ensure you are signed in with your @wri.org account and have the necessary permissions.');
      }
      throw new Error(`Failed to get site info: ${siteResponse.status}`);
    }

    const siteData = await siteResponse.json();
    const siteId = siteData.id;

    // Get default drive (Documents library)
    const driveResponse = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!driveResponse.ok) {
      throw new Error(`Failed to get drive info: ${driveResponse.status}`);
    }

    const driveData = await driveResponse.json();
    
    return {
      siteId,
      driveId: driveData.id
    };
  } catch (error) {
    console.error('Error getting SharePoint site info:', error);
    return null;
  }
}

/**
 * Find Excel file in SharePoint subfolders
 */
export async function findIndicatorFile(
  auth: SharePointAuthConfig, 
  driveId: string, 
  indicatorKey: string
): Promise<{filePath: string, fileId: string} | null> {
  const fileName = `${indicatorKey}.xlsx`;
  
  // Try each subfolder in priority order
  for (const subfolder of SEARCH_SUBFOLDERS) {
    try {
      // OLD SHAREPOINT API CODE - Not used anymore, we read from local filesystem
      // const filePath = `${DATA_COLLECTION_PATH}/${subfolder}/${fileName}`;
      const filePath = `/SCL External/06. Data/Main Working Folder/Data collection/${subfolder}/${fileName}`;
      const encodedPath = encodeURIComponent(filePath);
      
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}`,
        {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const fileData = await response.json();
        return {
          filePath: filePath,
          fileId: fileData.id
        };
      }
    } catch (error) {
      console.log(`File not found in ${subfolder}:`, error);
      continue;
    }
  }
  
  return null;
}

/**
 * Extract full Notes tab content as text from Excel file
 */
export async function extractNotesTabContent(
  auth: SharePointAuthConfig,
  driveId: string,
  fileId: string
): Promise<{content: string, rawData: any[][]} | null> {
  try {
    // Get workbook sessions endpoint
    const sessionResponse = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/createSession`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          persistChanges: false
        })
      }
    );

    if (!sessionResponse.ok) {
      throw new Error(`Failed to create workbook session: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.id;

    try {
      // Get all worksheet names first
      const worksheetsResponse = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/worksheets`,
        {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': sessionId
          }
        }
      );

      if (!worksheetsResponse.ok) {
        throw new Error(`Failed to get worksheets: ${worksheetsResponse.status}`);
      }

      const worksheetsData = await worksheetsResponse.json();
      const notesSheet = worksheetsData.value.find((sheet: any) => 
        sheet.name && sheet.name.toLowerCase().includes('note')
      );

      if (!notesSheet) {
        return null;
      }

      // Get Notes sheet data
      const notesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/worksheets('${notesSheet.name}')/usedRange`,
        {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': sessionId
          }
        }
      );

      if (!notesResponse.ok) {
        throw new Error(`Failed to read Notes sheet: ${notesResponse.status}`);
      }

      const notesData = await notesResponse.json();
      const rows = notesData.values || [];

      if (!rows || rows.length === 0) {
        return { content: '', rawData: [] };
      }

      // Convert to readable text format
      const content = rows
        .map((row: any[]) => Array.isArray(row) ? row.join('\t') : String(row))
        .join('\n');

      return {
        content,
        rawData: rows
      };

    } finally {
      // Close workbook session
      await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/closeSession`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': sessionId
          }
        }
      );
    }

  } catch (error) {
    console.error('Error extracting Notes tab content:', error);
    return null;
  }
}

/**
 * Extract metadata from Notes tab content using pattern matching
 */
export function extractMetadataFromNotes(
  notesContent: string,
  fileName: string,
  system: string
): ExcelNotesMetadata {
  const metadata: ExcelNotesMetadata = {
    fileName,
    system,
    dataFile: fileName,
    extractedAt: new Date(),
    sourceInfo: {},
    dataInfo: {},
    urls: {},
    methodology: {},
    technical: {},
    processing: {},
    quality: {},
    parsingInfo: {
      notesTabContent: notesContent,
      extractedFields: [],
      missingFields: [],
      parsingErrors: []
    }
  };

  // Extract URLs
  const urlPatterns = [
    /(?:url|website|source|link)[:\s]*(https?:\/\/[^\s\n]+)/gi,
    /(?:download|file|data)[:\s]*(https?:\/\/[^\s\n]+)/gi,
    /(https?:\/\/[^\s\n]+)/gi
  ];
  
  const allUrls: string[] = [];
  urlPatterns.forEach((pattern) => {
    const matches = Array.from(notesContent.matchAll(pattern));
    matches.forEach(match => {
      if (match[1] && !allUrls.includes(match[1])) {
        allUrls.push(match[1]);
      }
    });
  });

  if (allUrls.length > 0) {
    metadata.urls.primaryUrl = allUrls[0];
    metadata.urls.alternativeUrls = allUrls.slice(1);
    metadata.parsingInfo.extractedFields?.push('urls');
  }

  // Extract Provider/Organization
  const providerPatterns = [
    /(?:organization|provider|source|institution|publisher)[:\s]*([^\n]+)/i,
    /(?:data\s+source|source\s+organization)[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of providerPatterns) {
    const match = notesContent.match(pattern);
    if (match && match[1]) {
      metadata.sourceInfo.provider = match[1].trim();
      metadata.parsingInfo.extractedFields?.push('provider');
      break;
    }
  }

  // Extract Units
  const unitsPattern = /(?:unit|measurement|units?)[:\s]*([^\n]+)/i;
  const unitsMatch = notesContent.match(unitsPattern);
  if (unitsMatch && unitsMatch[1]) {
    metadata.dataInfo.units = unitsMatch[1].trim();
    metadata.parsingInfo.extractedFields?.push('units');
  }

  // Extract Data Collection Method
  const methodPatterns = [
    /(?:method|collection\s+method|gathering\s+method|data\s+collection)[:\s]*([^\n]+)/i,
    /(?:methodology|collection\s+methodology)[:\s]*([^\n]+)/i
  ];
  
  for (const pattern of methodPatterns) {
    const match = notesContent.match(pattern);
    if (match && match[1]) {
      metadata.methodology.dataCollectionMethod = match[1].trim();
      metadata.parsingInfo.extractedFields?.push('methodology');
      break;
    }
  }

  // Extract Frequency
  const frequencyPattern = /(?:frequency|update\s+frequency|release\s+frequency|update|release)[:\s]*([^\n]+)/i;
  const frequencyMatch = notesContent.match(frequencyPattern);
  if (frequencyMatch && frequencyMatch[1]) {
    metadata.dataInfo.frequency = frequencyMatch[1].trim();
    metadata.parsingInfo.extractedFields?.push('frequency');
  }

  // Extract Description
  const descriptionPatterns = [
    /(?:description|overview|summary)[:\s]*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z][^:]+:|$))/i,
    /(?:description|overview|summary)[:\s]*([^\n]{20,})/i
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = notesContent.match(pattern);
    if (match && match[1]) {
      metadata.dataInfo.description = match[1].trim();
      metadata.parsingInfo.extractedFields?.push('description');
      break;
    }
  }

  // Extract Time Range
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const years = Array.from(notesContent.matchAll(yearPattern)).map(m => parseInt(m[0]));
  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    metadata.dataInfo.timeRange = {
      startYear: minYear,
      endYear: maxYear
    };
    metadata.parsingInfo.extractedFields?.push('timeRange');
  }

  // Check for missing important fields
  if (!metadata.urls.primaryUrl) {
    metadata.parsingInfo.missingFields?.push('primaryUrl');
  }
  if (!metadata.sourceInfo.provider) {
    metadata.parsingInfo.missingFields?.push('provider');
  }

  return metadata;
}

/**
 * Read Excel file from SharePoint and extract Notes sheet data
 */
export async function extractNotesSheetData(
  auth: SharePointAuthConfig,
  driveId: string,
  fileId: string,
  sourceName: string
): Promise<SharePointFileData> {
  try {
    // Get workbook sessions endpoint
    const sessionResponse = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/createSession`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          persistChanges: false
        })
      }
    );

    if (!sessionResponse.ok) {
      throw new Error(`Failed to create workbook session: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.id;

    try {
      // Get Notes sheet data
      const notesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/worksheets('Notes')/usedRange`,
        {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': sessionId
          }
        }
      );

      if (!notesResponse.ok) {
        throw new Error(`Failed to read Notes sheet: ${notesResponse.status}`);
      }

      const notesData = await notesResponse.json();
      const rows = notesData.values;

      if (!rows || rows.length === 0) {
        return { error: 'Notes sheet is empty' };
      }

      // Find header row and data
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Find column indices
      const sourceNameColIndex = headers.findIndex((h: string) => 
        h && h.toLowerCase().includes('source') || h.toLowerCase().includes('name')
      );
      const lastUpdatedColIndex = headers.findIndex((h: string) => 
        h && h.toLowerCase().includes('last updated date')
      );
      const lastAccessedColIndex = headers.findIndex((h: string) => 
        h && h.toLowerCase().includes('last accessed date')
      );

      if (sourceNameColIndex === -1) {
        return { error: 'Could not find source name column in Notes sheet' };
      }

      // Find matching source row
      const matchingRow = dataRows.find((row: any[]) => {
        const cellValue = row[sourceNameColIndex];
        if (!cellValue) return false;
        
        const cellValueClean = cellValue.toString().toLowerCase().trim();
        const sourceNameClean = sourceName.toLowerCase().trim();
        
        return cellValueClean === sourceNameClean || 
               cellValueClean.includes(sourceNameClean) || 
               sourceNameClean.includes(cellValueClean);
      });

      if (!matchingRow) {
        return { error: `No matching source found for "${sourceName}" in Notes sheet` };
      }

      // Extract dates
      const lastUpdatedDate = lastUpdatedColIndex !== -1 ? matchingRow[lastUpdatedColIndex] : '';
      const lastAccessedDate = lastAccessedColIndex !== -1 ? matchingRow[lastAccessedColIndex] : '';

      return {
        lastUpdatedDate: lastUpdatedDate ? lastUpdatedDate.toString() : '',
        lastAccessedDate: lastAccessedDate ? lastAccessedDate.toString() : ''
      };

    } finally {
      // Close workbook session
      await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/workbook/closeSession`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
            'workbook-session-id': sessionId
          }
        }
      );
    }

  } catch (error) {
    console.error('Error extracting Notes sheet data:', error);
    return { error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Extract full metadata from Excel file Notes tab
 */
/**
 * Extract metadata from Excel file using local filesystem (synced SharePoint files)
 */
export async function extractMetadataFromExcelFile(
  indicatorKey: string,
  system: string,
  customBasePath?: string
): Promise<ExcelNotesMetadata> {
  try {
    // Use custom path if provided, otherwise use default
    const basePath = customBasePath || DEFAULT_LOCAL_BASE_PATH;
    
    // Construct file path: BASE_PATH/system/indicatorKey.xlsx
    const fileName = `${indicatorKey}.xlsx`;
    const filePath = path.join(basePath, system, fileName);

    console.log(`Reading Excel file from local path: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try to provide helpful error message
      const folderPath = path.join(basePath, system);
      let folderExists = false;
      let folderContents: string[] = [];
      
      try {
        if (fs.existsSync(folderPath)) {
          folderExists = true;
          folderContents = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx')).slice(0, 5);
        }
      } catch (e) {
        // Ignore folder read errors
      }
      
      let errorMsg = `File not found: ${filePath}`;
      if (folderExists) {
        errorMsg += `\n\nFolder exists but file not found. Available Excel files in ${system} folder: ${folderContents.length > 0 ? folderContents.join(', ') : 'none found'}`;
      } else {
        errorMsg += `\n\nFolder ${folderPath} does not exist. Please check the system name and base path.`;
      }
      
      throw new Error(errorMsg);
    }

    // Try to read the file with retry logic (OneDrive files can be temporarily locked during sync)
    // Use buffer-based reading instead of direct readFile to avoid OneDrive sync issues
    let workbook: XLSX.WorkBook | null = null;
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Verify file is still accessible before reading
        if (!fs.existsSync(filePath)) {
          throw new Error(`File disappeared: ${filePath}`);
        }
        
        console.log(`Attempting to read file (attempt ${attempt}/${maxRetries}): ${filePath}`);
        
        // Read file as buffer first, then parse - this works better with OneDrive files
        const fileBuffer = fs.readFileSync(filePath);
        console.log(`✅ File read into buffer (${fileBuffer.length} bytes)`);
        
        // Parse buffer with XLSX.read instead of XLSX.readFile
        workbook = XLSX.read(fileBuffer, {
          type: 'buffer',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        
        // Success - break out of retry loop
        console.log(`✅ Successfully parsed Excel file on attempt ${attempt}`);
        break;
      } catch (readError: any) {
        lastError = readError;
        
        // Log the RAW error first - this is critical for debugging
        console.error(`❌ RAW XLSX.readFile error (attempt ${attempt}/${maxRetries}):`, {
          error: readError,
          errorType: typeof readError,
          errorConstructor: readError?.constructor?.name,
          errorMessage: readError?.message,
          errorCode: readError?.code,
          errorErrno: readError?.errno,
          errorSyscall: readError?.syscall,
          errorPath: readError?.path,
          errorStack: readError?.stack,
          errorString: String(readError),
          errorJSON: JSON.stringify(readError, Object.getOwnPropertyNames(readError)),
          filePath: filePath,
          fileExists: fs.existsSync(filePath)
        });
        
        const errorMsg = readError?.message || String(readError) || 'Unknown error';
        const errorCode = readError?.code || '';
        
        // If it's a busy/locked error and we have retries left, wait and retry
        if ((errorCode === 'EBUSY' || errorMsg.includes('EBUSY') || errorMsg.includes('locked') || errorMsg.includes('in use')) && attempt < maxRetries) {
          // Wait a bit before retrying (OneDrive sync might be in progress)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // For other errors or final attempt, throw with specific message
        if (errorCode === 'ENOENT' || errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
          throw new Error(`File not found: ${filePath}`);
        } else if (errorCode === 'EACCES' || errorMsg.includes('EACCES') || errorMsg.includes('permission denied')) {
          throw new Error(`Permission denied: Cannot read file ${filePath}. The file may have restricted permissions. Try: chmod 644 "${filePath}"`);
        } else if (errorCode === 'EBUSY' || errorMsg.includes('EBUSY') || errorMsg.includes('locked') || errorMsg.includes('in use')) {
          throw new Error(`File is locked or in use: ${filePath}. The file may be syncing with OneDrive. Please wait a moment and try again, or close the file if it's open in Excel.`);
        } else if (errorMsg.includes('corrupt') || errorMsg.includes('invalid') || errorMsg.includes('format')) {
          throw new Error(`File appears to be corrupted or in an invalid format: ${filePath}. ${errorMsg}`);
        } else {
          // Generic error - log full error details for debugging
          console.error(`XLSX.readFile failed (attempt ${attempt}/${maxRetries}):`, {
            filePath,
            errorMessage: errorMsg,
            errorCode: errorCode,
            errorType: typeof readError,
            errorString: String(readError),
            fullError: readError
          });
          // Throw with the original error message
          throw new Error(`Cannot read Excel file ${filePath}. ${errorMsg}`);
        }
      }
    }
    
    // If we exhausted retries and still no workbook, throw the last error
    if (!workbook) {
      if (lastError) {
        const errorMsg = lastError.message || String(lastError) || 'Unknown error';
        throw new Error(`Cannot read Excel file ${filePath} after ${maxRetries} attempts. ${errorMsg}`);
      }
      throw new Error(`Failed to read Excel file after ${maxRetries} attempts: ${filePath}`);
    }
    
    // Look for Notes tab (case-insensitive)
    const notesSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('note')
    );
    
    if (!notesSheetName) {
      throw new Error(`No Notes tab found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }

    console.log(`Found Notes tab: ${notesSheetName}`);
    
    // Read Notes sheet content
    const worksheet = workbook.Sheets[notesSheetName];
    
    // Convert to text format (similar to what we had from SharePoint)
    const notesData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const notesContent = notesData
      .map((row: any) => Array.isArray(row) ? row.join('\t') : String(row))
      .join('\n');

    // Extract metadata from content using existing function
    const metadata = extractMetadataFromNotes(
      notesContent,
      fileName,
      system
    );

    return metadata;

  } catch (error: any) {
    console.error('Error extracting metadata from Excel file:', error);
    // If error is already a proper Error object with message, re-throw as-is
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, wrap it in an Error
    throw new Error(`Failed to extract metadata: ${error?.message || String(error)}`);
    if (error.message) {
      throw error;
    }
    throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main function to fetch indicator data from SharePoint
 */
export async function fetchIndicatorDataFromSharePoint(
  indicatorKey: string,
  sourceName: string
): Promise<SharePointFileData> {
  try {
    // Get authentication
    const auth = await getSharePointAuth();
    if (!auth) {
      return { error: 'SharePoint authentication required' };
    }

    // Get site and drive info
    const siteInfo = await getSharePointSiteInfo(auth);
    if (!siteInfo) {
      return { error: 'Failed to access SharePoint site' };
    }

    // Find the indicator file
    const fileInfo = await findIndicatorFile(auth, siteInfo.driveId, indicatorKey);
    if (!fileInfo) {
      return { error: `File ${indicatorKey}.xlsx not found in any subfolder` };
    }

    // Extract data from Notes sheet
    const result = await extractNotesSheetData(auth, siteInfo.driveId, fileInfo.fileId, sourceName);
    
    return {
      ...result,
      filePath: fileInfo.filePath
    };

  } catch (error) {
    console.error('Error fetching indicator data from SharePoint:', error);
    return { error: `SharePoint error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
