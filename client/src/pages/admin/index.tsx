import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, MessageCircle, Settings, Plus, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    const userData = localStorage.getItem('admin-user');
    
    if (!token || !userData) {
      setLocation('/admin/login');
      return;
    }
    
    try {
      setUser(JSON.parse(userData));
    } catch {
      setLocation('/admin/login');
    }
  }, [setLocation]);

  const { data: issuesData } = useQuery({
    queryKey: ['/api/admin/issues'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await apiRequest('/api/admin/issues', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch issues');
      return response.json();
    }
  });

  const { data: importsData } = useQuery({
    queryKey: ['/api/admin/imports'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await apiRequest('/api/admin/imports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch imports');
      return response.json();
    }
  });

  if (!user) {
    return null; // Loading or redirecting
  }

  const issues = issuesData?.issues || [];
  const imports = importsData?.imports || [];
  const recentImports = imports.slice(0, 5);

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Admin", href: "/admin" },
        { label: "Dashboard", href: "/admin" }
      ]}
    >
      <AdminLayout>
        <div className="space-y-8">
          {/* Welcome Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
            <p className="text-muted-foreground">
              Manage your Field Guide Zine content and imports from this dashboard.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-issues">{issues.length}</div>
                <p className="text-xs text-muted-foreground">
                  Published zine issues
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Content Imports</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-imports">{imports.length}</div>
                <p className="text-xs text-muted-foreground">
                  All-time imports
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-pending-imports">
                  {imports.filter((imp: any) => imp.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting transformation
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published Today</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {issues.filter((issue: any) => {
                    const today = new Date().toDateString();
                    return new Date(issue.publishedAt).toDateString() === today;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Issues published today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Import Content
                </CardTitle>
                <CardDescription>
                  Transform raw content into structured zine format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setLocation('/admin/import')}
                  className="w-full"
                  data-testid="button-import-content"
                >
                  Start Import
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Manage Issues
                </CardTitle>
                <CardDescription>
                  Create, edit, and publish zine issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/admin/content')}
                  className="w-full"
                  data-testid="button-manage-content"
                >
                  View Issues
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Get help with content creation and management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/admin/chat')}
                  className="w-full"
                  data-testid="button-admin-chat"
                >
                  Open Chat
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Issues</CardTitle>
                <CardDescription>Your latest published content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {issues.slice(0, 3).map((issue: any) => (
                    <div key={issue.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{issue.title}</h4>
                        <p className="text-sm text-muted-foreground">{issue.version}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setLocation(`/admin/content/${issue.slug}`)}>
                        Edit
                      </Button>
                    </div>
                  ))}
                  {issues.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No issues created yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Imports</CardTitle>
                <CardDescription>Your latest content imports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentImports.map((imp: any) => (
                    <div key={imp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <h4 className="font-medium capitalize">{imp.importType} Import</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(imp.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        imp.status === 'published' ? 'bg-green-100 text-green-800' :
                        imp.status === 'transformed' ? 'bg-blue-100 text-blue-800' :
                        imp.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {imp.status}
                      </div>
                    </div>
                  ))}
                  {imports.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No imports yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}