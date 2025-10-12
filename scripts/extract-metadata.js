#!/usr/bin/env node

/**
 * Local script to extract metadata from Excel files
 * Run this script locally to process Excel files and extract metadata
 * 
 * Usage: node scripts/extract-metadata.js [system] [dataFile]
 * Example: node scripts/extract-metadata.js Energy X-ENE-1.xlsx
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuration
const BASE_PATH = '/Users/leandrovigna/Library/CloudStorage/OneDrive-WorldResourcesInstitute/Systems Change Lab - Data collection';
const OUTPUT_PATH = './extracted-metadata';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

function extractNotesTab(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    // Look for Notes tab
    const notesSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('note')
    );
    
    if (!notesSheetName) {
      console.log('No Notes tab found. Available sheets:', workbook.SheetNames);
      return null;
    }
    
    console.log(`Found Notes tab: ${notesSheetName}`);
    const worksheet = workbook.Sheets[notesSheetName];
    const notesContent = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Convert to readable format
    const notesText = notesContent
      .map(row => Array.isArray(row) ? row.join('\t') : String(row))
      .join('\n');
    
    return {
      sheetName: notesSheetName,
      content: notesText,
      rawData: notesContent
    };
    
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

function extractMetadata(notesContent, fileName, system) {
  const metadata = {
    fileName,
    system,
    extractedAt: new Date().toISOString(),
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
    /(?:download|file|data)[:\s]*(https?:\/\/[^\s\n]+)/gi
  ];
  
  urlPatterns.forEach((pattern, index) => {
    const matches = [...notesContent.matchAll(pattern)];
    if (matches.length > 0) {
      const urls = matches.map(match => match[1]).filter(url => url);
      if (index === 0) {
        metadata.urls.primaryUrl = urls[0];
        metadata.urls.alternativeUrls = urls.slice(1);
      } else {
        metadata.urls.downloadUrl = urls[0];
      }
      metadata.parsingInfo.extractedFields.push('urls');
    }
  });
  
  // Extract Provider/Organization
  const providerPattern = /(?:organization|provider|source|institution)[:\s]*([^\n]+)/i;
  const providerMatch = notesContent.match(providerPattern);
  if (providerMatch) {
    metadata.sourceInfo.provider = providerMatch[1].trim();
    metadata.parsingInfo.extractedFields.push('provider');
  }
  
  // Extract Units
  const unitsPattern = /(?:unit|measurement)[:\s]*([^\n]+)/i;
  const unitsMatch = notesContent.match(unitsPattern);
  if (unitsMatch) {
    metadata.dataInfo.units = unitsMatch[1].trim();
    metadata.parsingInfo.extractedFields.push('units');
  }
  
  // Extract Data Collection Method
  const methodPattern = /(?:method|collection|gathering)[:\s]*([^\n]+)/i;
  const methodMatch = notesContent.match(methodPattern);
  if (methodMatch) {
    metadata.methodology.dataCollectionMethod = methodMatch[1].trim();
    metadata.parsingInfo.extractedFields.push('methodology');
  }
  
  // Extract Frequency
  const frequencyPattern = /(?:frequency|update|release)[:\s]*([^\n]+)/i;
  const frequencyMatch = notesContent.match(frequencyPattern);
  if (frequencyMatch) {
    metadata.dataInfo.frequency = frequencyMatch[1].trim();
    metadata.parsingInfo.extractedFields.push('frequency');
  }
  
  // Check for missing important fields
  const requiredFields = ['primaryUrl', 'provider'];
  requiredFields.forEach(field => {
    if (!metadata.urls.primaryUrl && field === 'primaryUrl') {
      metadata.parsingInfo.missingFields.push('primaryUrl');
    }
    if (!metadata.sourceInfo.provider && field === 'provider') {
      metadata.parsingInfo.missingFields.push('provider');
    }
  });
  
  return metadata;
}

function processFile(system, dataFile) {
  const filePath = path.join(BASE_PATH, system, dataFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }
  
  const notesData = extractNotesTab(filePath);
  if (!notesData) {
    console.error(`Could not extract Notes tab from ${filePath}`);
    return null;
  }
  
  const metadata = extractMetadata(notesData.content, dataFile, system);
  metadata.parsingInfo.notesTabContent = notesData.content;
  
  // Save extracted metadata
  const outputFile = path.join(OUTPUT_PATH, `${system}-${dataFile.replace('.xlsx', '')}-metadata.json`);
  fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
  
  console.log(`Metadata extracted and saved to: ${outputFile}`);
  console.log(`Extracted fields: ${metadata.parsingInfo.extractedFields.join(', ')}`);
  console.log(`Missing fields: ${metadata.parsingInfo.missingFields.join(', ')}`);
  
  return metadata;
}

function listAvailableFiles() {
  console.log('Available systems and files:');
  try {
    const systems = fs.readdirSync(BASE_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    systems.forEach(system => {
      const systemPath = path.join(BASE_PATH, system);
      const files = fs.readdirSync(systemPath)
        .filter(file => file.endsWith('.xlsx'));
      
      console.log(`\n${system}:`);
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    });
  } catch (error) {
    console.error('Error listing files:', error.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/extract-metadata.js [system] [dataFile]');
    console.log('       node scripts/extract-metadata.js --list');
    console.log('\nExamples:');
    console.log('  node scripts/extract-metadata.js Energy X-ENE-1.xlsx');
    console.log('  node scripts/extract-metadata.js Transport X-TRA-5.xlsx');
    console.log('  node scripts/extract-metadata.js --list');
    return;
  }
  
  if (args[0] === '--list') {
    listAvailableFiles();
    return;
  }
  
  if (args.length < 2) {
    console.error('Please provide both system and dataFile arguments');
    return;
  }
  
  const [system, dataFile] = args;
  const result = processFile(system, dataFile);
  
  if (result) {
    console.log('\nExtraction completed successfully!');
    console.log(`Check the extracted-metadata folder for the JSON output.`);
  }
}

// Install required package if not present
try {
  require('xlsx');
} catch (error) {
  console.log('Installing required package: xlsx');
  const { execSync } = require('child_process');
  execSync('npm install xlsx', { stdio: 'inherit' });
}

main();
