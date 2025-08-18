import { getServerSession } from 'next-auth/next';
import { authOptions } from '../app/authOptions';

// SharePoint configuration
const SHAREPOINT_SITE_URL = 'https://onewri.sharepoint.com/sites/SystemsChangeLab';
const DATA_COLLECTION_PATH = '/SCL External/06. Data/Main Working Folder/Data collection';

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
      return null;
    }

    return {
      accessToken: (session as any).accessToken
    };
  } catch (error) {
    console.error('Error getting SharePoint auth:', error);
    return null;
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
      const filePath = `${DATA_COLLECTION_PATH}/${subfolder}/${fileName}`;
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
