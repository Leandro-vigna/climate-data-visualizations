// TypeScript interfaces for metadata extraction from Excel files

export interface ExcelNotesMetadata {
  // File information
  fileName: string;
  system: string;
  dataFile: string;
  extractedAt: Date;
  
  // Source information
  sourceInfo: {
    provider?: string;
    organization?: string;
    website?: string;
    contactInfo?: string;
    dataSourceName?: string;
    alternativeNames?: string[];
  };
  
  // Data characteristics
  dataInfo: {
    title?: string;
    description?: string;
    units?: string;
    measurement?: string;
    coverage?: string; // geographic, temporal
    frequency?: string; // annual, monthly, quarterly
    timeRange?: {
      startYear?: number;
      endYear?: number;
      lastUpdate?: string;
    };
  };
  
  // URLs and access
  urls: {
    primaryUrl?: string;
    downloadUrl?: string;
    apiEndpoint?: string;
    alternativeUrls?: string[];
    documentationUrl?: string;
  };
  
  // Collection methodology
  methodology: {
    dataCollectionMethod?: string;
    samplingMethod?: string;
    dataSource?: string; // primary, secondary
    collectionInstructions?: string;
    dataProcessingSteps?: string[];
    qualityControl?: string;
    limitations?: string;
  };
  
  // Technical details
  technical: {
    fileFormats?: string[];
    dataStructure?: string;
    authenticationRequired?: boolean;
    rateLimiting?: string;
    dataSize?: string;
    updateFrequency?: string;
  };
  
  // Data processing
  processing: {
    dataTransformation?: string;
    unitConversions?: string;
    aggregations?: string;
    filters?: string;
    calculations?: string;
    postProcessing?: string;
  };
  
  // Quality and reliability
  quality: {
    dataQuality?: string;
    reliabilityScore?: number;
    knownIssues?: string[];
    validationMethods?: string;
    crossReferences?: string[];
  };
  
  // Additional notes
  additionalNotes?: string;
  importantWarnings?: string[];
  recommendations?: string[];
  
  // Parsing metadata
  parsingInfo: {
    notesTabContent?: string;
    parsingConfidence?: number;
    extractedFields?: string[];
    missingFields?: string[];
    parsingErrors?: string[];
  };
}

export interface MetadataExtractionRule {
  id: string;
  name: string;
  description: string;
  field: keyof ExcelNotesMetadata;
  pattern: RegExp | string;
  extractionType: 'regex' | 'keyword' | 'section' | 'table';
  required: boolean;
  confidence: number;
}

export interface MetadataExtractionResult {
  metadata: ExcelNotesMetadata;
  extractionRules: {
    applied: string[];
    failed: string[];
    warnings: string[];
  };
  confidence: number;
  processingTime: number;
}

// Common patterns for metadata extraction
export const METADATA_PATTERNS: Record<string, MetadataExtractionRule[]> = {
  urls: [
    {
      id: 'primary_url',
      name: 'Primary URL',
      description: 'Extract main data source URL',
      field: 'urls',
      pattern: /(?:url|website|source|link)[:\s]*(https?:\/\/[^\s\n]+)/i,
      extractionType: 'regex',
      required: true,
      confidence: 0.9
    },
    {
      id: 'download_url',
      name: 'Download URL',
      description: 'Extract direct download link',
      field: 'urls',
      pattern: /(?:download|file|data)[:\s]*(https?:\/\/[^\s\n]+)/i,
      extractionType: 'regex',
      required: false,
      confidence: 0.8
    }
  ],
  
  provider: [
    {
      id: 'organization',
      name: 'Organization/Provider',
      description: 'Extract data provider organization',
      field: 'sourceInfo',
      pattern: /(?:organization|provider|source|institution)[:\s]*([^\n]+)/i,
      extractionType: 'regex',
      required: true,
      confidence: 0.8
    }
  ],
  
  units: [
    {
      id: 'units',
      name: 'Data Units',
      description: 'Extract measurement units',
      field: 'dataInfo',
      pattern: /(?:unit|measurement)[:\s]*([^\n]+)/i,
      extractionType: 'regex',
      required: false,
      confidence: 0.7
    }
  ],
  
  methodology: [
    {
      id: 'collection_method',
      name: 'Data Collection Method',
      description: 'Extract how data is collected',
      field: 'methodology',
      pattern: /(?:method|collection|gathering)[:\s]*([^\n]+)/i,
      extractionType: 'regex',
      required: false,
      confidence: 0.7
    }
  ]
};

// Validation functions
export function validateMetadata(metadata: ExcelNotesMetadata): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields validation
  if (!metadata.sourceInfo.provider && !metadata.sourceInfo.organization) {
    errors.push('Provider/Organization is required');
  }
  
  if (!metadata.urls.primaryUrl) {
    errors.push('Primary URL is required');
  }
  
  // Optional but important fields
  if (!metadata.dataInfo.units) {
    warnings.push('Data units not specified');
  }
  
  if (!metadata.methodology.dataCollectionMethod) {
    warnings.push('Data collection method not specified');
  }
  
  if (!metadata.dataInfo.frequency) {
    warnings.push('Data update frequency not specified');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
