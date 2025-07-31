'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Plus,
  Globe,
  BarChart3,
  Database,
  Download,
  CalendarDays,
  Mail,
  Brain,
  Save,
  ExternalLink
} from "lucide-react";

interface DataLayer {
  id: string;
  name: string;
  type: 'google-analytics' | 'downloads' | 'events' | 'newsletter';
  description: string;
  status: 'not-configured' | 'configured' | 'connected' | 'fetching' | 'active';
}

export default function AddDataToolPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    googleAnalyticsId: '',
    description: ''
  });

  const [dataLayers, setDataLayers] = useState<DataLayer[]>([
    {
      id: '1',
      name: 'Google Analytics',
      type: 'google-analytics',
      description: 'Website traffic, user behavior, and engagement metrics',
      status: 'not-configured'
    },
    {
      id: '2',
      name: 'Data Downloads',
      type: 'downloads',
      description: 'Track file downloads and data usage patterns',
      status: 'not-configured'
    },
    {
      id: '3',
      name: 'Events & Activities',
      type: 'events',
      description: 'Monitor webinars, trainings, data releases, and other events',
      status: 'not-configured'
    },
    {
      id: '4',
      name: 'Newsletter Subscriptions',
      type: 'newsletter',
      description: 'Track newsletter signups and engagement',
      status: 'not-configured'
    }
  ]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.url) {
      alert('Please fill in the required fields');
      return;
    }

    setIsSaving(true);
    
    try {
      // Generate a unique ID for the new data tool
      const newToolId = Date.now().toString();
      
      // Create the new data tool object
      const newDataTool = {
        id: newToolId,
        name: formData.name,
        url: formData.url,
        description: formData.description,
        googleAnalyticsId: formData.googleAnalyticsId,
        status: 'active' as const,
        progress: {
          googleAnalytics: 0,
          downloads: 0,
          events: 0,
          newsletter: 0,
          masterSpreadsheet: 0,
          aiAnalysis: 0
        },
        createdAt: new Date().toISOString()
      };

      // Save to localStorage
      const existingTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
      const updatedTools = [...existingTools, newDataTool];
      localStorage.setItem('dataTools', JSON.stringify(updatedTools));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('dataToolsChanged'));
      
      // Navigate to the new tool's page
      router.push(`/dashboard/analytics/tool/${newToolId}`);
      
    } catch (error) {
      console.error('Error saving data tool:', error);
      alert('Error saving data tool. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfigureLayer = (layerId: string) => {
    // This will be implemented to configure specific data layers
    console.log('Configuring layer:', layerId);
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'google-analytics': return <BarChart3 className="w-4 h-4" />;
      case 'downloads': return <Download className="w-4 h-4" />;
      case 'events': return <CalendarDays className="w-4 h-4" />;
      case 'newsletter': return <Mail className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not-configured': return 'bg-muted text-muted-foreground';
      case 'configured': return 'bg-blue-100 text-blue-800';
      case 'connected': return 'bg-green-100 text-green-800';
      case 'fetching': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (status === 'loading') {
    return (
      <div className="pl-64 flex justify-center items-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Plus className="w-8 h-8 text-primary" />
              <span>Add New Data Tool</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure a new data tool for comprehensive analytics and insights
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Data Tool Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Climate Watch Data"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  placeholder="https://www.example.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the data tool and its purpose..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Google Analytics Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Google Analytics Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ga-property-id">Google Analytics Property ID</Label>
                <Input 
                  id="ga-property-id" 
                  placeholder="e.g., 325582229"
                  value={formData.googleAnalyticsId}
                  onChange={(e) => setFormData({...formData, googleAnalyticsId: e.target.value})}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  This is the numeric Property ID from your Google Analytics account (not the Measurement ID).
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to find your Property ID:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Analytics</a></li>
                  <li>Select your property (website) from the dropdown</li>
                  <li>Go to <strong>Admin</strong> → <strong>Property Settings</strong></li>
                  <li>Look for <strong>"Property ID"</strong> - it's a 9-10 digit number</li>
                  <li>Copy this number (e.g., 325582229)</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>You'll also need to set up Google Analytics API access with proper credentials</li>
                  <li>This requires creating a Google Cloud Project and enabling the Analytics API</li>
                  <li>You'll need a service account with appropriate permissions</li>
                  <li>We'll help you set up the API credentials in the next step</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">📋 What you'll need for API access:</h4>
                <div className="text-sm text-green-800 space-y-2">
                  <div>
                    <strong>1. Google Cloud Project:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Create a project in Google Cloud Console</li>
                      <li>Enable the Google Analytics Data API</li>
                    </ul>
                  </div>
                  <div>
                    <strong>2. Service Account:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Create a service account in your Google Cloud Project</li>
                      <li>Download the JSON key file</li>
                      <li>Add the service account email to your GA property with "Viewer" permissions</li>
                    </ul>
                  </div>
                  <div>
                    <strong>3. Property ID (what you're entering above):</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>The numeric ID from your GA property settings</li>
                      <li>This tells the API which website's data to fetch</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Layers Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Layers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataLayers.map((layer) => (
                  <div key={layer.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getLayerIcon(layer.type)}
                        <span className="font-medium">{layer.name}</span>
                      </div>
                      <Badge className={getStatusColor(layer.status)}>
                        {layer.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {layer.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigureLayer(layer.id)}
                      className="w-full"
                    >
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.name || !formData.url}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Data Tool
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 