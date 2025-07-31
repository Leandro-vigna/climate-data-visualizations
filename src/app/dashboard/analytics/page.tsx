'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Plus,
  Settings,
  Brain
} from "lucide-react";

interface DataTool {
  id: string;
  name: string;
  url: string;
  description?: string;
  googleAnalyticsId?: string;
  status: 'active' | 'inactive';
  progress: {
    googleAnalytics: number;
  };
  createdAt?: string;
}

export default function GoogleAnalyticsPanopticPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/');
    },
  });

  const router = useRouter();
  const [dataTools, setDataTools] = useState<DataTool[]>([]);

  // Load data tools from localStorage on component mount
  useEffect(() => {
    const savedTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
    const allTools = [...mockTools, ...savedTools];
    setDataTools(allTools);
  }, []);

  // Mock data for demonstration
  const mockTools: DataTool[] = [
    {
      id: '1',
      name: 'Climate Watch Data',
      url: 'https://www.climatewatchdata.org',
      status: 'active',
      progress: {
        googleAnalytics: 75
      }
    },
    {
      id: '2',
      name: 'WRI Data Explorer',
      url: 'https://data.wri.org',
      status: 'inactive',
      progress: {
        googleAnalytics: 0
      }
    }
  ];

  if (status === 'loading') {
    return (
      <div className="pl-64 p-6 bg-background min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-64 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Brain className="w-8 h-8 text-primary" />
              <span>Data Intelligence Platform</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive analysis platform for climate data tools impact and trends
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Add Data Tool clicked');
                router.push('/dashboard/analytics/add');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Data Tool
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Data Tool Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <span>Select Data Tool</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataTools.map((tool) => (
              <Card
                key={tool.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => router.push(`/dashboard/analytics/tool/${tool.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{tool.name}</h3>
                    <Badge variant={tool.status === 'active' ? 'default' : 'secondary'}>
                      {tool.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{tool.url}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Google Analytics</span>
                      <span>{tool.progress.googleAnalytics}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${tool.progress.googleAnalytics}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 