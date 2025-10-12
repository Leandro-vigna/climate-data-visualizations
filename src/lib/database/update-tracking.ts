// Database schema and types for tracking data source updates

export interface UpdateCheckResult {
  id: string;
  indicatorId: string;
  dataFile: string;
  system: string;
  sourceUrl: string;
  sourceTitle: string;
  
  // Update detection results
  hasUpdate: boolean;
  updateType: 'new_data' | 'methodology_change' | 'site_structure_change' | 'no_update' | 'error';
  confidence: number; // 0-100 confidence score
  
  // Timestamps
  lastChecked: Date;
  lastKnownUpdate?: Date;
  detectedUpdateDate?: Date;
  
  // Content analysis
  previousContentHash?: string;
  currentContentHash?: string;
  contentChangeDescription?: string;
  
  // Metadata extracted from Excel
  extractedMetadata?: SourceMetadata;
  
  // Crawling details
  crawlStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  crawlDuration?: number; // milliseconds
  crawlError?: string;
  
  // Additional findings
  notes?: string;
  warnings?: string[];
  recommendations?: string[];
}

export interface SourceMetadata {
  // Basic info
  provider?: string;
  dataSourceName?: string;
  dataCollectionMethod?: string;
  units?: string;
  
  // URLs and links
  primaryUrl?: string;
  alternativeUrls?: string[];
  downloadUrls?: string[];
  apiEndpoints?: string[];
  
  // Data characteristics
  dataFrequency?: string; // 'annual', 'monthly', 'quarterly', etc.
  dataRange?: {
    startYear?: number;
    endYear?: number;
    lastUpdate?: Date;
  };
  
  // Collection details
  collectionInstructions?: string;
  dataProcessingNotes?: string;
  qualityNotes?: string;
  
  // Technical details
  fileFormats?: string[];
  dataStructure?: string;
  authenticationRequired?: boolean;
  rateLimiting?: string;
  
  // Additional metadata
  [key: string]: any; // For flexible metadata storage
}

export interface UpdateCheckConfig {
  id: string;
  indicatorId: string;
  
  // Crawling configuration
  crawlFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  maxRetries: number;
  timeoutMs: number;
  
  // Detection settings
  confidenceThreshold: number;
  contentChangeThreshold: number;
  
  // Notification settings
  notifyOnUpdate: boolean;
  notifyOnError: boolean;
  notificationChannels: string[];
  
  // Custom rules
  customDetectionRules?: {
    field: string;
    operator: 'equals' | 'contains' | 'regex' | 'date_after';
    value: any;
  }[];
}

// Database operations
export class UpdateTrackingService {
  // This will be implemented with your preferred database
  // For now, using in-memory storage as placeholder
  
  private updateResults: Map<string, UpdateCheckResult> = new Map();
  private configs: Map<string, UpdateCheckConfig> = new Map();
  
  async saveUpdateResult(result: UpdateCheckResult): Promise<void> {
    this.updateResults.set(result.id, result);
  }
  
  async getUpdateResult(id: string): Promise<UpdateCheckResult | undefined> {
    return this.updateResults.get(id);
  }
  
  async getUpdateResultsForIndicator(indicatorId: string): Promise<UpdateCheckResult[]> {
    return Array.from(this.updateResults.values())
      .filter(result => result.indicatorId === indicatorId)
      .sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());
  }
  
  async saveConfig(config: UpdateCheckConfig): Promise<void> {
    this.configs.set(config.id, config);
  }
  
  async getConfig(indicatorId: string): Promise<UpdateCheckConfig | undefined> {
    return this.configs.get(indicatorId);
  }
  
  async getAllPendingChecks(): Promise<UpdateCheckResult[]> {
    return Array.from(this.updateResults.values())
      .filter(result => result.crawlStatus === 'pending')
      .sort((a, b) => a.lastChecked.getTime() - b.lastChecked.getTime());
  }
}
