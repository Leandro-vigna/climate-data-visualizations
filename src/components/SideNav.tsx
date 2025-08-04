'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, PieChart, BarChart3, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTool {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  progress: {
    googleAnalytics: number;
  };
}

export default function SideNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [savedDataTools, setSavedDataTools] = useState<DataTool[]>([]);

  // Load saved data tools from localStorage
  useEffect(() => {
    const loadSavedTools = () => {
      const savedTools = JSON.parse(localStorage.getItem('dataTools') || '[]');
      setSavedDataTools(savedTools);
    };

    // Load initially
    loadSavedTools();

    // Listen for custom events when data tools are added/deleted
    const handleDataToolsChange = () => {
      loadSavedTools();
    };

    window.addEventListener('dataToolsChanged', handleDataToolsChange);

    return () => {
      window.removeEventListener('dataToolsChanged', handleDataToolsChange);
    };
  }, []);

  // Auto-expand analytics section when on analytics pages
  useEffect(() => {
    if (pathname && pathname.startsWith('/dashboard/analytics')) {
      setAnalyticsExpanded(true);
    }
  }, [pathname]);

  // Helper function to check if a path is active
  const isActivePath = (modulePath: string) => {
    if (!pathname) return false;
    if (modulePath === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(modulePath);
  };

  const baseModules = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      name: 'Time Series Visualizer',
      path: '/dashboard/timeseries',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      name: 'Sunburst Chart',
      path: '/dashboard/sunburst',
      icon: <PieChart className="w-4 h-4" />
    }
  ];

  return (
    <Card className={`h-screen fixed left-0 top-0 border-r-0 rounded-none transition-all duration-300 ${open ? 'w-64' : 'w-16'}`}>
      <CardContent className="p-4 h-full flex flex-col">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 self-start"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        {open && (
          <div className="mb-8">
            <h1 className="text-xl font-bold">Data Visualization</h1>
            <p className="text-sm text-muted-foreground">Tools & Modules</p>
          </div>
        )}

        {/* Navigation */}
        <NavigationMenu orientation="vertical" className="flex-1">
          <NavigationMenuList className="flex flex-col space-y-2">
            {/* Base Modules */}
            {baseModules.map((module) => (
              <NavigationMenuItem key={module.path} className="w-full">
                <Link href={module.path} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      "flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors w-full",
                      isActivePath(module.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {module.icon}
                    {open && <span>{module.name}</span>}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}

            {/* Data Intelligence Platform with subpages */}
            <NavigationMenuItem className="w-full">
              <div className="w-full">
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-2 rounded-lg transition-colors",
                    isActivePath('/dashboard/analytics')
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => {
                    if (open) {
                      setAnalyticsExpanded(!analyticsExpanded);
                    } else {
                      // If sidebar is collapsed, navigate to main analytics page
                      window.location.href = '/dashboard/analytics';
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-4 h-4" />
                    {open && <span>Data Intelligence Platform</span>}
                  </div>
                  {open && (
                    analyticsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />
                  )}
                </Button>

                {/* Subpages */}
                {open && analyticsExpanded && (
                  <div className="ml-8 mt-2 space-y-1">
                    {/* Main Analytics Page */}
                    <Link href="/dashboard/analytics" legacyBehavior passHref>
                      <NavigationMenuLink
                        className={cn(
                          "flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors block",
                          pathname === '/dashboard/analytics'
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <span>• Overview</span>
                      </NavigationMenuLink>
                    </Link>

                    {/* Add Data Tool */}
                    <Link href="/dashboard/analytics/add" legacyBehavior passHref>
                      <NavigationMenuLink
                        className={cn(
                          "flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors block",
                          pathname === '/dashboard/analytics/add'
                            ? "bg-primary/20 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <span>• Add Data Tool</span>
                      </NavigationMenuLink>
                    </Link>



                    {/* Saved Data Tools */}
                    {savedDataTools.map((tool) => (
                      <div key={tool.id} className="space-y-1">
                        {/* Main Tool Link */}
                        <Link href={`/dashboard/analytics/tool/${tool.id}`} legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              "flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors block",
                              pathname === `/dashboard/analytics/tool/${tool.id}`
                                ? "bg-primary/20 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <span>• {tool.name}</span>
                          </NavigationMenuLink>
                        </Link>
                        
                        {/* Master Spreadsheet Sub-item */}
                        <Link href={`/dashboard/analytics/tool/${tool.id}/collections`} legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              "flex items-center space-x-2 px-6 py-1 rounded text-xs transition-colors block ml-3",
                              pathname === `/dashboard/analytics/tool/${tool.id}/collections`
                                ? "bg-emerald-100 text-emerald-700 font-medium"
                                : "text-muted-foreground/70 hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <span>→ Master Spreadsheet</span>
                          </NavigationMenuLink>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </CardContent>
    </Card>
  );
} 