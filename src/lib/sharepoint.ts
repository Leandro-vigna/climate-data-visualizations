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
 * Detect if a table structure exists in the data
 * Returns table info if found, null otherwise
 * Specifically looks for "Data Source(s)" table
 */
function detectTableStructure(data: any[][]): {
  headerRow: number;
  headers: string[];
  dataRows: any[][];
  startCol: number;
  endCol: number;
  tableType: 'data_sources' | 'targets' | 'other';
} | null {
  if (!data || data.length < 2) return null;
  
  // Look for "Data Source(s)" section first (this is the main table we want)
  const dataSourceKeywords = ['provider', 'name', 'url', 'last updated', 'last accessed'];
  const targetKeywords = ['value', 'year', 'target'];
  
  for (let rowIdx = 0; rowIdx < Math.min(data.length, 30); rowIdx++) {
    const row = data[rowIdx];
    if (!Array.isArray(row)) continue;
    
    const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
    
    // Check for Data Source(s) table (priority - this is what we want for provider/url extraction)
    const dataSourceMatches = dataSourceKeywords.filter(keyword => rowText.includes(keyword));
    if (dataSourceMatches.length >= 3) {
      // Find the actual column boundaries
      let startCol = 0;
      let endCol = row.length - 1;
      
      while (startCol < row.length && (!row[startCol] || String(row[startCol]).trim() === '')) {
        startCol++;
      }
      while (endCol >= 0 && (!row[endCol] || String(row[endCol]).trim() === '')) {
        endCol--;
      }
      
      if (startCol <= endCol) {
        const headers = row.slice(startCol, endCol + 1).map(cell => String(cell || '').trim());
        // Only include rows until we hit another section (empty row or new section header)
        const dataRows: any[][] = [];
        for (let i = rowIdx + 1; i < data.length; i++) {
          const nextRow = data[i];
          if (!Array.isArray(nextRow)) break;
          
          // Stop if we hit an empty row or a row that looks like a new section header
          const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (nextRowText.trim() === '' || 
              nextRowText.includes('target') && nextRowText.includes('value') ||
              nextRowText.includes('how to collect') ||
              nextRowText.includes('notes') ||
              nextRowText.includes('log')) {
            break;
          }
          
          // Only include rows that have at least one non-empty cell in the table range
          if (nextRow.slice(startCol, endCol + 1).some(cell => cell && String(cell).trim() !== '')) {
            dataRows.push(nextRow);
          }
        }
        
        return {
          headerRow: rowIdx,
          headers,
          dataRows,
          startCol,
          endCol,
          tableType: 'data_sources'
        };
      }
    }
  }
  
  return null;
}

/**
 * Extract metadata from Notes tab content using pattern matching and table detection
 */
export function extractMetadataFromNotes(
  notesContent: string,
  fileName: string,
  system: string,
  rawData?: any[][] // Optional raw 2D array for table detection
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

  // Try to detect and parse table structures first (if raw data provided)
  // Extract Data Sources table
  if (rawData && rawData.length > 0) {
    // First, find the Data Sources section
    let dataSourcesStartRow = -1;
    let dataSourcesEndRow = -1;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Find "Data source(s)" section
      if (rowText.includes('data source')) {
        dataSourcesStartRow = i;
        // Look for the next section
        for (let j = i + 1; j < Math.min(i + 20, rawData.length); j++) {
          const nextRow = rawData[j];
          if (!Array.isArray(nextRow)) break;
          const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (nextRowText.trim() === '' || 
              nextRowText.includes('target') ||
              nextRowText.includes('how to collect') ||
              nextRowText.includes('notes') ||
              nextRowText.includes('log') ||
              nextRowText.includes('old source')) {
            dataSourcesEndRow = j;
            break;
          }
        }
        if (dataSourcesEndRow === -1) {
          dataSourcesEndRow = Math.min(dataSourcesStartRow + 15, rawData.length);
        }
        break;
      }
    }
    
    if (dataSourcesStartRow >= 0) {
      const tableInfo = detectTableStructure(rawData.slice(dataSourcesStartRow, dataSourcesEndRow));
      
      if (tableInfo && tableInfo.tableType === 'data_sources') {
        console.log('📊 Detected Data Sources table structure:', {
          headerRow: tableInfo.headerRow,
          headers: tableInfo.headers,
          dataRowCount: tableInfo.dataRows.length
        });
        
        // Find relevant columns
        const providerColIdx = tableInfo.headers.findIndex(h => 
          h && (h.toLowerCase().includes('provider') || h.toLowerCase().includes('organization'))
        );
        const nameColIdx = tableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('name') && !h.toLowerCase().includes('provider')
        );
        const urlColIdx = tableInfo.headers.findIndex(h => 
          h && (h.toLowerCase().includes('url') || h.toLowerCase().includes('link') || h.toLowerCase().includes('website'))
        );
        const lastUpdatedColIdx = tableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('last updated')
        );
        const lastAccessedColIdx = tableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('last accessed')
        );
        
        // Extract complete data sources as structured objects
        const dataSources: Array<{
          provider?: string;
          name?: string;
          url?: string;
          lastUpdatedDate?: string;
          lastAccessedDate?: string;
        }> = [];
        
        tableInfo.dataRows.forEach(row => {
          const source: any = {};
          
          if (providerColIdx >= 0) {
            const provider = row[tableInfo.startCol + providerColIdx];
            if (provider && String(provider).trim()) {
              const providerStr = String(provider).trim();
              // Filter out invalid provider values
              if (providerStr && 
                  providerStr.length >= 2 &&
                  !providerStr.match(/^\d+$/) &&
                  !providerStr.match(/^https?:\/\//i) &&
                  !providerStr.match(/\d+\.\s*(Open|Do)/i) &&
                  !providerStr.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) &&
                  !providerStr.toLowerCase().includes('open url') &&
                  !providerStr.toLowerCase().includes('do x action') &&
                  !providerStr.toLowerCase().includes('do y action') &&
                  !providerStr.toLowerCase().includes('log')) {
                source.provider = providerStr;
              }
            }
          }
          
          if (nameColIdx >= 0) {
            const name = row[tableInfo.startCol + nameColIdx];
            if (name && String(name).trim()) {
              source.name = String(name).trim();
            }
          }
          
          if (urlColIdx >= 0) {
            const url = row[tableInfo.startCol + urlColIdx];
            if (url) {
              const urlStr = String(url).trim();
              if (urlStr.match(/^https?:\/\//i)) {
                source.url = urlStr;
              }
            }
          }
          
          if (lastUpdatedColIdx >= 0) {
            const lastUpdated = row[tableInfo.startCol + lastUpdatedColIdx];
            if (lastUpdated && String(lastUpdated).trim()) {
              source.lastUpdatedDate = String(lastUpdated).trim();
            }
          }
          
          if (lastAccessedColIdx >= 0) {
            const lastAccessed = row[tableInfo.startCol + lastAccessedColIdx];
            if (lastAccessed && String(lastAccessed).trim()) {
              source.lastAccessedDate = String(lastAccessed).trim();
            }
          }
          
          // Only add if it has at least provider or name
          if (source.provider || source.name) {
            dataSources.push(source);
          }
        });
        
        if (dataSources.length > 0) {
          // Store structured data sources
          if (!metadata.customFields) {
            metadata.customFields = {};
          }
          metadata.customFields.dataSources = dataSources;
          
          // Also extract aggregated info for backward compatibility
          const providers = new Set<string>();
          const urls: string[] = [];
          const names: string[] = [];
          
          dataSources.forEach(source => {
            if (source.provider) providers.add(source.provider);
            if (source.url) urls.push(source.url);
            if (source.name) names.push(source.name);
          });
          
          if (providers.size > 0) {
            const providerList = Array.from(providers);
            metadata.sourceInfo.provider = providerList.join(', ');
            if (providerList.length > 1) {
              metadata.sourceInfo.alternativeNames = providerList.slice(1);
            }
          }
          
          if (urls.length > 0) {
            metadata.urls.primaryUrl = urls[0];
            if (urls.length > 1) {
              metadata.urls.alternativeUrls = urls.slice(1);
            }
          }
          
          if (names.length > 0) {
            metadata.sourceInfo.dataSourceName = names[0];
            if (names.length > 1) {
              if (!metadata.sourceInfo.alternativeNames) {
                metadata.sourceInfo.alternativeNames = [];
              }
              metadata.sourceInfo.alternativeNames.push(...names.slice(1));
            }
          }
          
          metadata.parsingInfo.extractedFields?.push('dataSources', 'provider', 'urls', 'dataSourceName');
          console.log('✅ Extracted', dataSources.length, 'structured data sources from table');
        }
        
        // Extract last updated dates
        if (lastUpdatedColIdx >= 0) {
          const dates: string[] = [];
          tableInfo.dataRows.forEach(row => {
            const cellValue = row[tableInfo.startCol + lastUpdatedColIdx];
            if (cellValue) {
              const dateStr = String(cellValue).trim();
              if (dateStr) dates.push(dateStr);
            }
          });
          if (dates.length > 0) {
            // Use the most recent date
            metadata.dataInfo.timeRange = metadata.dataInfo.timeRange || {};
            metadata.dataInfo.timeRange.lastUpdate = dates[dates.length - 1];
            metadata.parsingInfo.extractedFields?.push('lastUpdate');
          }
        }
      }
    }
  }
  
  // Detect and extract Targets table separately
  if (rawData && rawData.length > 0) {
    let targetsStartRow = -1;
    let targetsEndRow = -1;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Find "Target(s)" section
      if (rowText.includes('target') && (rowText.includes('value') || rowText.includes('year'))) {
        targetsStartRow = i;
        // Look for the next section
        for (let j = i + 1; j < Math.min(i + 15, rawData.length); j++) {
          const nextRow = rawData[j];
          if (!Array.isArray(nextRow)) break;
          const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (nextRowText.trim() === '' || 
              nextRowText.includes('how to collect') ||
              nextRowText.includes('notes') ||
              nextRowText.includes('log') ||
              nextRowText.includes('old source')) {
            targetsEndRow = j;
            break;
          }
        }
        if (targetsEndRow === -1) {
          targetsEndRow = Math.min(targetsStartRow + 10, rawData.length);
        }
        break;
      }
    }
    
    if (targetsStartRow >= 0) {
      // Look for table structure in Targets section
      const targetsTableInfo = detectTableStructure(rawData.slice(targetsStartRow, targetsEndRow));
      
      if (targetsTableInfo) {
        // Adjust row indices
        const adjustedTableInfo = {
          ...targetsTableInfo,
          headerRow: targetsTableInfo.headerRow + targetsStartRow,
          dataRows: targetsTableInfo.dataRows
        };
        
        const valueColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('value')
        );
        const yearColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('year')
        );
        const sourceColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('target source') || h.toLowerCase().includes('source')
        );
        
        if (valueColIdx >= 0 && yearColIdx >= 0) {
          const targets: Array<{value: string, year: string, source?: string}> = [];
          adjustedTableInfo.dataRows.forEach(row => {
            const value = row[adjustedTableInfo.startCol + valueColIdx];
            const year = row[adjustedTableInfo.startCol + yearColIdx];
            const source = sourceColIdx >= 0 ? row[adjustedTableInfo.startCol + sourceColIdx] : undefined;
            
            if (value && year) {
              targets.push({
                value: String(value).trim(),
                year: String(year).trim(),
                source: source ? String(source).trim() : undefined
              });
            }
          });
          
          if (targets.length > 0) {
            if (!metadata.customFields) {
              metadata.customFields = {};
            }
            metadata.customFields.targets = targets;
            metadata.parsingInfo.extractedFields?.push('targets');
            console.log('✅ Extracted targets:', targets.length);
          }
        }
      }
    }
  }
  
  // Re-detect table structure for Data Sources if we haven't already
  if (rawData && rawData.length > 0 && !metadata.customFields?.dataSources) {
    const tableInfo = detectTableStructure(rawData);
    
    if (tableInfo && tableInfo.tableType === 'data_sources') {
    }
  }

  // Fallback: Use pattern-matched URLs if no table found
  if (allUrls.length > 0 && !metadata.urls.primaryUrl) {
    metadata.urls.primaryUrl = allUrls[0];
    metadata.urls.alternativeUrls = allUrls.slice(1);
    metadata.parsingInfo.extractedFields?.push('urls');
  }

  // Fallback: Extract Provider/Organization using pattern matching (if not found in table)
  if (!metadata.sourceInfo.provider) {
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

  // Extract Frequency (but filter out placeholder text)
  const frequencyPattern = /(?:frequency|update\s+frequency|release\s+frequency)[:\s]*([^\n]+)/i;
  const frequencyMatch = notesContent.match(frequencyPattern);
  if (frequencyMatch && frequencyMatch[1]) {
    const freqValue = frequencyMatch[1].trim();
    // Filter out placeholder text like "d date last accessed date (if no publication date)"
    if (freqValue && 
        !freqValue.toLowerCase().includes('date last accessed') &&
        !freqValue.toLowerCase().includes('if no publication') &&
        !freqValue.match(/^d\s+date/i) &&
        freqValue.length < 100) { // Reasonable length check
      metadata.dataInfo.frequency = freqValue;
      metadata.parsingInfo.extractedFields?.push('frequency');
    }
  }

  // Don't extract Description - it's not a standard field in the Excel Notes structure
  // Description extraction removed to avoid false positives

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

  // Extract "How to collect data" section
  if (rawData && rawData.length > 0) {
    let howToCollectStartRow = -1;
    let howToCollectEndRow = -1;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Find "How to collect data" section
      if (rowText.includes('how to collect') && rowText.includes('data')) {
        howToCollectStartRow = i;
        // Look for the next section or empty rows
        for (let j = i + 1; j < Math.min(i + 10, rawData.length); j++) {
          const nextRow = rawData[j];
          if (!Array.isArray(nextRow)) break;
          const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (nextRowText.trim() === '' || 
              nextRowText.includes('notes') ||
              nextRowText.includes('log')) {
            howToCollectEndRow = j;
            break;
          }
        }
        if (howToCollectEndRow === -1) {
          howToCollectEndRow = Math.min(howToCollectStartRow + 5, rawData.length);
        }
        break;
      }
    }
    
    if (howToCollectStartRow >= 0) {
      const instructions: string[] = [];
      for (let i = howToCollectStartRow + 1; i < howToCollectEndRow; i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          // Collect all non-empty cells from the row (instructions can span multiple columns)
          const rowCells = row.map(cell => String(cell || '').trim()).filter(c => c && c.length > 0);
          if (rowCells.length > 0) {
            // Join cells with space, or use first cell if it's a complete instruction
            const instruction = rowCells.join(' ').trim();
            if (instruction && instruction.length > 3) {
              instructions.push(instruction);
            }
          }
        }
      }
      
      if (instructions.length > 0) {
        // Store as array in customFields for better structure
        if (!metadata.customFields) {
          metadata.customFields = {};
        }
        metadata.customFields.howToCollectData = instructions;
        metadata.parsingInfo.extractedFields?.push('howToCollectData');
        console.log('✅ Extracted collection instructions:', instructions.length);
      }
    }
    
    // Extract "Log" section
    let logStartRow = -1;
    let logEndRow = -1;
    
    console.log('🔍 [LOG] Starting Log section search in', rawData.length, 'rows');
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      // Check each cell in the row for "Log" (case-insensitive)
      for (let colIdx = 0; colIdx < Math.min(row.length, 5); colIdx++) {
        const cellValue = String(row[colIdx] || '').trim();
        const cellValueLower = cellValue.toLowerCase();
        // Find "Log" section - must be standalone word or very short
        if (cellValueLower === 'log' || (cellValueLower.includes('log') && cellValue.length < 10 && !cellValueLower.includes('data'))) {
          logStartRow = i;
          console.log('✅ [LOG] Found "Log" at row', i, 'column', colIdx, 'cell value:', cellValue);
          // Log section usually goes to the end or until we hit another major section
          for (let j = i + 1; j < Math.min(i + 50, rawData.length); j++) {
            const nextRow = rawData[j];
            if (!Array.isArray(nextRow)) {
              logEndRow = j;
              break;
            }
            // Check if next row starts a new section
            const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
            if (nextRowText.trim() === '' && j > i + 10) {
              // Empty row after some entries might indicate end
              logEndRow = j;
              break;
            }
          }
          if (logEndRow === -1) {
            logEndRow = Math.min(logStartRow + 50, rawData.length);
          }
          console.log('✅ [LOG] Log section range: rows', logStartRow, 'to', logEndRow);
          break;
        }
      }
      if (logStartRow >= 0) break;
    }
    
    if (logStartRow === -1) {
      console.log('❌ [LOG] No Log section found. Searching for "log" text in first 50 rows...');
      for (let i = 0; i < Math.min(50, rawData.length); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (rowText.includes('log')) {
            console.log('   Found "log" text at row', i, ':', rowText.substring(0, 100));
          }
        }
      }
    }
    
    if (logStartRow >= 0) {
      console.log('🔍 Found Log section at row', logStartRow, 'to', logEndRow);
      const logEntries: Array<{date?: string; author?: string; action?: string}> = [];
      
      // Skip header row if it exists (e.g., "who did what when")
      let startProcessingRow = logStartRow + 1;
      if (startProcessingRow < rawData.length) {
        const firstRow = rawData[startProcessingRow];
        if (Array.isArray(firstRow)) {
          const firstRowText = firstRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          // Skip if it's a header row
          if (firstRowText.includes('who') && firstRowText.includes('what') && firstRowText.includes('when')) {
            startProcessingRow++;
            console.log('⏭️ Skipping header row:', firstRowText);
          }
        }
      }
      
      for (let i = startProcessingRow; i < logEndRow; i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          // Log entries: typically in column B (index 1), format: "MM/DD/YY AuthorInitials action description"
          // Check columns B and C first (most common), then other columns
          let date: string | undefined;
          let action: string | undefined;
          let author: string | undefined;
          
          // Try column B (index 1) first, then C (index 2), then others
          const columnsToCheck = [1, 2, 0, 3, 4];
          for (const colIdx of columnsToCheck) {
            if (colIdx >= row.length) continue;
            const cellValue = String(row[colIdx] || '').trim();
            if (!cellValue || cellValue.length < 5) continue;
            
            // Skip if it looks like a header or section marker
            const lowerValue = cellValue.toLowerCase();
            if (lowerValue.includes('who did what') || 
                lowerValue === 'log' || 
                lowerValue.includes('section') ||
                cellValue.length < 3) {
              continue;
            }
            
            // Pattern 1: "MM/DD/YY AuthorInitials action description" (most common)
            const fullMatch = cellValue.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Z]{1,3})\s+(.+)$/);
            if (fullMatch) {
              date = fullMatch[1];
              author = fullMatch[2];
              action = fullMatch[3].trim();
              console.log(`✅ Parsed log entry (full match): date=${date}, author=${author}, action=${action.substring(0, 50)}...`);
              break;
            }
            
            // Pattern 2: "MM/DD/YY action description" (no author)
            const dateOnlyMatch = cellValue.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)$/);
            if (dateOnlyMatch) {
              date = dateOnlyMatch[1];
              action = dateOnlyMatch[2].trim();
              console.log(`✅ Parsed log entry (date only): date=${date}, action=${action.substring(0, 50)}...`);
              break;
            }
            
            // Pattern 3: Date anywhere in the cell, then extract author and action
            const dateMatch = cellValue.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
            if (dateMatch) {
              date = dateMatch[1];
              const remainingText = cellValue.replace(dateMatch[0], '').trim();
              if (remainingText) {
                // Try to extract author (1-3 uppercase letters) and action
                const authorMatch = remainingText.match(/^([A-Z]{1,3})\s+(.+)$/);
                if (authorMatch) {
                  author = authorMatch[1];
                  action = authorMatch[2].trim();
                  console.log(`✅ Parsed log entry (date anywhere): date=${date}, author=${author}, action=${action.substring(0, 50)}...`);
                } else {
                  action = remainingText;
                  console.log(`✅ Parsed log entry (date anywhere, no author): date=${date}, action=${action.substring(0, 50)}...`);
                }
              }
              break;
            }
          }
          
          // If we found a date or action, add the entry
          if (date || action) {
            logEntries.push({ date, author, action: action || '' });
          } else {
            // Debug: log rows that didn't match
            const rowText = row.map(cell => String(cell || '').trim()).filter(c => c).join(' | ');
            if (rowText.length > 10) {
              console.log(`⚠️ Could not parse log entry from row ${i}:`, rowText.substring(0, 100));
            }
          }
        }
      }
      
      if (logEntries.length > 0) {
        if (!metadata.customFields) {
          metadata.customFields = {};
        }
        metadata.customFields.log = logEntries;
        if (!metadata.parsingInfo.extractedFields) {
          metadata.parsingInfo.extractedFields = [];
        }
        if (!metadata.parsingInfo.extractedFields.includes('log')) {
          metadata.parsingInfo.extractedFields.push('log');
        }
        console.log('✅ [LOG] SUCCESS: Extracted', logEntries.length, 'log entries');
        console.log('✅ [LOG] First entry:', logEntries[0]);
        console.log('✅ [LOG] Last entry:', logEntries[logEntries.length - 1]);
        console.log('✅ [LOG] Stored in metadata.customFields.log:', !!metadata.customFields.log);
      } else {
        console.log('⚠️ [LOG] Found Log section but no entries extracted (startRow:', logStartRow, 'endRow:', logEndRow);
        // Debug: log the raw data around the Log section
        if (logStartRow >= 0 && logEndRow > logStartRow) {
          const sampleRows = rawData.slice(logStartRow, Math.min(logStartRow + 10, logEndRow));
          console.log('⚠️ [LOG] Sample rows from Log section:');
          sampleRows.forEach((row, idx) => {
            if (Array.isArray(row)) {
              const rowText = row.map(cell => String(cell || '').trim()).filter(c => c).join(' | ');
              if (rowText) {
                console.log(`   Row ${logStartRow + idx}:`, rowText.substring(0, 150));
              }
            }
          });
        }
      }
    } else {
      console.log('❌ [LOG] No Log section found in Notes tab');
    }
    
    // Extract "Notes" section
    let notesStartRow = -1;
    let notesEndRow = -1;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Find "Notes" section (case-insensitive, standalone word)
      if (rowText.trim() === 'notes' || (rowText.includes('notes') && rowText.length < 10)) {
        notesStartRow = i;
        // Notes section usually goes until next section (Log, empty row, or end)
        for (let j = i + 1; j < rawData.length; j++) {
          const nextRow = rawData[j];
          if (!Array.isArray(nextRow)) break;
          const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (nextRowText.trim() === '' || 
              nextRowText.includes('log') ||
              nextRowText.includes('data source') ||
              nextRowText.includes('target') ||
              nextRowText.includes('old source')) {
            notesEndRow = j;
            break;
          }
        }
        if (notesEndRow === -1) {
          notesEndRow = Math.min(notesStartRow + 10, rawData.length);
        }
        break;
      }
    }
    
    if (notesStartRow >= 0) {
      const notesContent: string[] = [];
      for (let i = notesStartRow + 1; i < notesEndRow; i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const rowText = row.map(cell => String(cell || '').trim()).filter(c => c).join(' ');
          if (rowText && rowText.length > 0) {
            notesContent.push(rowText);
          }
        }
      }
      
      if (notesContent.length > 0) {
        // Store as array in customFields
        if (!metadata.customFields) {
          metadata.customFields = {};
        }
        metadata.customFields.notes = notesContent;
        metadata.parsingInfo.extractedFields?.push('notes');
        console.log('✅ Extracted notes');
      } else {
        // Even if empty, mark that Notes section exists
        if (!metadata.customFields) {
          metadata.customFields = {};
        }
        metadata.customFields.notes = [];
        metadata.parsingInfo.extractedFields?.push('notes');
      }
    }
    
    // Extract "Old source(s)" section (similar structure to Data source(s))
    let oldSourcesStartRow = -1;
    let oldSourcesEndRow = -1;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Find "Old source(s)" or "old sources" section
      if (rowText.includes('old source')) {
        oldSourcesStartRow = i;
        // Look for the next section or end
        for (let j = i + 1; j < rawData.length; j++) {
          const nextRow = rawData[j];
          if (!Array.isArray(nextRow)) break;
          const nextRowText = nextRow.map(cell => String(cell || '').toLowerCase()).join(' ');
          if (nextRowText.trim() === '' || 
              nextRowText.includes('log') ||
              nextRowText.includes('data source') ||
              nextRowText.includes('target') ||
              nextRowText.includes('how to collect')) {
            oldSourcesEndRow = j;
            break;
          }
        }
        if (oldSourcesEndRow === -1) {
          oldSourcesEndRow = Math.min(oldSourcesStartRow + 20, rawData.length);
        }
        break;
      }
    }
    
    if (oldSourcesStartRow >= 0) {
      // Look for table structure (similar to Data source(s))
      const oldSourcesTableInfo = detectTableStructure(rawData.slice(oldSourcesStartRow, oldSourcesEndRow));
      
      if (oldSourcesTableInfo) {
        // Adjust row indices to account for slice
        const adjustedTableInfo = {
          ...oldSourcesTableInfo,
          headerRow: oldSourcesTableInfo.headerRow + oldSourcesStartRow,
          dataRows: oldSourcesTableInfo.dataRows
        };
        
        const providerColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && (h.toLowerCase().includes('provider') || h.toLowerCase().includes('organization'))
        );
        const nameColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('name') && !h.toLowerCase().includes('provider')
        );
        const urlColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && (h.toLowerCase().includes('url') || h.toLowerCase().includes('link') || h.toLowerCase().includes('website'))
        );
        const lastUpdatedColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('last updated')
        );
        const lastAccessedColIdx = adjustedTableInfo.headers.findIndex(h => 
          h && h.toLowerCase().includes('last accessed')
        );
        
        const oldSources: Array<{
          provider?: string;
          name?: string;
          url?: string;
          lastUpdatedDate?: string;
          lastAccessedDate?: string;
        }> = [];
        
        adjustedTableInfo.dataRows.forEach(row => {
          const source: any = {};
          
          if (providerColIdx >= 0) {
            const provider = row[adjustedTableInfo.startCol + providerColIdx];
            if (provider && String(provider).trim()) {
              source.provider = String(provider).trim();
            }
          }
          
          if (nameColIdx >= 0) {
            const name = row[adjustedTableInfo.startCol + nameColIdx];
            if (name && String(name).trim()) {
              source.name = String(name).trim();
            }
          }
          
          if (urlColIdx >= 0) {
            const url = row[adjustedTableInfo.startCol + urlColIdx];
            if (url) {
              const urlStr = String(url).trim();
              if (urlStr.match(/^https?:\/\//i)) {
                source.url = urlStr;
              }
            }
          }
          
          if (lastUpdatedColIdx >= 0) {
            const lastUpdated = row[adjustedTableInfo.startCol + lastUpdatedColIdx];
            if (lastUpdated && String(lastUpdated).trim()) {
              source.lastUpdatedDate = String(lastUpdated).trim();
            }
          }
          
          if (lastAccessedColIdx >= 0) {
            const lastAccessed = row[adjustedTableInfo.startCol + lastAccessedColIdx];
            if (lastAccessed && String(lastAccessed).trim()) {
              source.lastAccessedDate = String(lastAccessed).trim();
            }
          }
          
          if (source.provider || source.name) {
            oldSources.push(source);
          }
        });
        
        if (oldSources.length > 0) {
          if (!metadata.customFields) {
            metadata.customFields = {};
          }
          metadata.customFields.oldSources = oldSources;
          metadata.parsingInfo.extractedFields?.push('oldSources');
          console.log('✅ Extracted old sources:', oldSources.length);
        }
      }
    }
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
    
    // Get raw data as 2D array to preserve table structure
    const notesData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    // Also create text format for pattern matching
    const notesContent = notesData
      .map((row: any) => Array.isArray(row) ? row.join('\t') : String(row))
      .join('\n');

    // Extract metadata from content using improved function that handles tables
    const metadata = extractMetadataFromNotes(
      notesContent,
      fileName,
      system,
      notesData // Pass raw data for table detection
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
