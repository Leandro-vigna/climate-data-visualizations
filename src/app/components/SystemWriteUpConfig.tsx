'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Upload,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Car,
  Zap,
  Building2,
  Leaf,
  Recycle,
  Building,
  DollarSign,
  Wheat,
  Trees,
  Droplets,
  Scale,
  Factory,
  Waves,
  TrendingUp
} from "lucide-react";

// Systems list matching the Excel file structure with icons
const SYSTEMS = [
  { name: 'Transport', icon: Car },
  { name: 'Energy', icon: Zap },
  { name: 'Buildings', icon: Building2 },
  { name: 'Carbon Removal', icon: Leaf },
  { name: 'Circular Economy', icon: Recycle },
  { name: 'Cities', icon: Building },
  { name: 'Economics', icon: DollarSign },
  { name: 'Finance', icon: TrendingUp },
  { name: 'Food and Agriculture', icon: Wheat },
  { name: 'Forests and Land', icon: Trees },
  { name: 'Freshwater', icon: Droplets },
  { name: 'Governance', icon: Scale },
  { name: 'Industry', icon: Factory },
  { name: 'Ocean', icon: Waves }
];

interface SystemWriteUpConfig {
  system: string;
  type: 'google-doc' | 'word-doc' | null;
  googleDocUrl?: string;
  wordDocPath?: string;
  status: 'idle' | 'testing' | 'connected' | 'error';
  error?: string;
  lastUpdated?: string;
}

export default function SystemWriteUpConfig() {
  const [configs, setConfigs] = useState<Map<string, SystemWriteUpConfig>>(new Map());
  const [testingSystem, setTestingSystem] = useState<string | null>(null);
  const [uploadingSystem, setUploadingSystem] = useState<string | null>(null);
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());

  // Load saved configurations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('system_writeup_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const configMap = new Map<string, SystemWriteUpConfig>();
        SYSTEMS.forEach(({ name }) => {
          if (parsed[name]) {
            // If type is set, consider it connected (even if status wasn't saved)
            const savedStatus = parsed[name].status || (parsed[name].type ? 'connected' : 'idle');
            configMap.set(name, { ...parsed[name], system: name, status: savedStatus });
          } else {
            configMap.set(name, { system: name, type: null, status: 'idle' });
          }
        });
        setConfigs(configMap);
      } catch (e) {
        // Initialize with defaults
        const configMap = new Map<string, SystemWriteUpConfig>();
        SYSTEMS.forEach(({ name }) => {
          configMap.set(name, { system: name, type: null, status: 'idle' });
        });
        setConfigs(configMap);
      }
    } else {
      // Initialize with defaults
      const configMap = new Map<string, SystemWriteUpConfig>();
      SYSTEMS.forEach(({ name }) => {
        configMap.set(name, { system: name, type: null, status: 'idle' });
      });
      setConfigs(configMap);
    }
  }, []);

  // Save configurations to localStorage
  const saveConfigs = (newConfigs: Map<string, SystemWriteUpConfig>) => {
      const toSave: any = {};
      newConfigs.forEach((config, system) => {
        toSave[system] = {
          system: config.system,
          type: config.type,
          googleDocUrl: config.googleDocUrl,
          wordDocPath: config.wordDocPath,
          lastUpdated: config.lastUpdated,
          status: config.status // Save status so we can check it later
        };
      });
    localStorage.setItem('system_writeup_configs', JSON.stringify(toSave));
    setConfigs(newConfigs);
  };

  // Test Google Doc connection
  const testGoogleDoc = async (system: string, url: string) => {
    setTestingSystem(system);
    const newConfigs = new Map(configs);
    const config = newConfigs.get(system) || { system, type: null, status: 'idle' };
    config.type = 'google-doc';
    config.googleDocUrl = url;
    config.status = 'testing';
    config.error = undefined;
    newConfigs.set(system, config);
    setConfigs(newConfigs);

    try {
      const response = await fetch('/api/scl-automation/test-writeup-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, type: 'google-doc', url })
      });

      const data = await response.json();
      
      if (data.success) {
        config.status = 'connected';
        config.error = undefined;
        config.lastUpdated = new Date().toISOString();
      } else {
        config.status = 'error';
        config.error = data.error || 'Connection failed';
      }
    } catch (error: any) {
      config.status = 'error';
      config.error = error.message || 'Failed to test connection';
    } finally {
      newConfigs.set(system, config);
      saveConfigs(newConfigs);
      setTestingSystem(null);
    }
  };

  // Handle Word doc upload
  const handleWordDocUpload = async (system: string, file: File) => {
    setUploadingSystem(system);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('system', system);

    try {
      const response = await fetch('/api/scl-automation/upload-writeup', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        const newConfigs = new Map(configs);
        const config = newConfigs.get(system) || { system, type: null, status: 'idle' };
        config.type = 'word-doc';
        config.wordDocPath = data.filePath;
        config.status = 'connected';
        config.error = undefined;
        config.lastUpdated = new Date().toISOString();
        newConfigs.set(system, config);
        saveConfigs(newConfigs);
      } else {
        const newConfigs = new Map(configs);
        const config = newConfigs.get(system) || { system, type: null, status: 'idle' };
        config.status = 'error';
        config.error = data.error || 'Upload failed';
        newConfigs.set(system, config);
        saveConfigs(newConfigs);
      }
    } catch (error: any) {
      const newConfigs = new Map(configs);
      const config = newConfigs.get(system) || { system, type: null, status: 'idle' };
      config.status = 'error';
      config.error = error.message || 'Failed to upload file';
      newConfigs.set(system, config);
      saveConfigs(newConfigs);
    } finally {
      setUploadingSystem(null);
    }
  };

  const toggleSystem = (systemName: string) => {
    setExpandedSystems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(systemName)) {
        newSet.delete(systemName);
      } else {
        newSet.add(systemName);
      }
      return newSet;
    });
  };

  return (
    <Card className="mb-6 border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5" />
          <span>System Copy Write-Up Configuration</span>
        </CardTitle>
        <CardDescription>
          Click on any system to configure its write-up document (Google Doc or Word file)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {SYSTEMS.map(({ name, icon: Icon }) => {
            const config = configs.get(name) || { system: name, type: null, status: 'idle' };
            const isExpanded = expandedSystems.has(name);
            const isTesting = testingSystem === name;
            const isUploading = uploadingSystem === name;

            return (
              <div key={name} className="relative">
                <Button
                  variant={config.status === 'connected' ? 'default' : 'outline'}
                  className={`w-full h-auto p-3 flex flex-col items-center space-y-2 ${
                    config.status === 'connected' ? 'bg-green-50 hover:bg-green-100 border-green-200' : ''
                  }`}
                  onClick={() => toggleSystem(name)}
                >
                  <Icon className={`w-6 h-6 ${config.status === 'connected' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium text-center leading-tight ${
                    config.status === 'connected' ? 'text-green-900' : 'text-foreground'
                  }`}>{name}</span>
                  {config.status === 'connected' && (
                    <CheckCircle className="w-4 h-4 text-green-600 absolute top-1 right-1" />
                  )}
                  {config.status === 'error' && (
                    <XCircle className="w-4 h-4 text-red-600 absolute top-1 right-1" />
                  )}
                  {config.status === 'testing' && (
                    <Loader2 className="w-4 h-4 text-blue-600 absolute top-1 right-1 animate-spin" />
                  )}
                </Button>

                {/* Expanded Configuration Panel */}
                {isExpanded && (
                  <Card className="absolute z-50 mt-2 w-80 shadow-lg border-2">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-5 h-5" />
                            <h3 className="font-semibold">{name}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSystem(name)}
                            className="h-6 w-6 p-0"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>

                        <Tabs defaultValue={config.type || 'google-doc'} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="google-doc" className="text-xs">Google Doc</TabsTrigger>
                            <TabsTrigger value="word-doc" className="text-xs">Word Doc</TabsTrigger>
                          </TabsList>

                          <TabsContent value="google-doc" className="space-y-2 mt-3">
                            <Input
                              type="url"
                              placeholder="Paste Google Doc URL..."
                              value={config.googleDocUrl || ''}
                              onChange={(e) => {
                                const newConfigs = new Map(configs);
                                const newConfig = { ...config, googleDocUrl: e.target.value, status: 'idle' as const };
                                newConfigs.set(name, newConfig);
                                setConfigs(newConfigs);
                              }}
                              className="text-xs"
                            />
                            <Button
                              onClick={() => {
                                if (config.googleDocUrl) {
                                  testGoogleDoc(name, config.googleDocUrl);
                                }
                              }}
                              disabled={!config.googleDocUrl || isTesting}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                            >
                              {isTesting ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Test Connection
                                </>
                              )}
                            </Button>
                            {config.googleDocUrl && config.status === 'connected' && (
                              <a 
                                href={config.googleDocUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open Doc</span>
                              </a>
                            )}
                          </TabsContent>

                          <TabsContent value="word-doc" className="space-y-2 mt-3">
                            <Input
                              type="file"
                              accept=".docx,.doc"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleWordDocUpload(name, file);
                                }
                              }}
                              className="text-xs"
                              disabled={isUploading}
                            />
                            {isUploading && (
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Uploading...</span>
                              </div>
                            )}
                            {config.wordDocPath && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                Uploaded
                              </Badge>
                            )}
                          </TabsContent>
                        </Tabs>

                        {config.error && (
                          <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-3 w-3" />
                            <AlertDescription className="text-xs">{config.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
}

