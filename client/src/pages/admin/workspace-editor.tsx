import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { 
  MessageCircle, 
  FileText, 
  Lightbulb, 
  Activity,
  Users,
  Clock
} from "lucide-react";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { DraftPanel } from "@/components/workspace/DraftPanel";
import { SuggestionsPanel } from "@/components/workspace/SuggestionsPanel";
import { ActivityTimeline } from "@/components/workspace/ActivityTimeline";
import type { Workspace } from "@shared/schema";

function RightPanel({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex-1">
        <SuggestionsPanel workspaceId={workspaceId} />
      </div>
      <div className="flex-1">
        <ActivityTimeline workspaceId={workspaceId} />
      </div>
    </div>
  );
}

export default function WorkspaceEditor() {
  const params = useParams();
  const workspaceId = params.id;

  const { data: workspaceData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId],
    queryFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is required');
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Workspace not found');
        if (response.status === 403) throw new Error('Access denied to this workspace');
        throw new Error('Failed to fetch workspace');
      }
      return response.json();
    },
    enabled: !!workspaceId
  });

  if (isLoading) {
    return (
      <LayoutShell 
        breadcrumb={[
          { label: "Admin", href: "/admin" },
          { label: "Workspaces", href: "/admin/workspaces" },
          { label: "Loading...", href: "#" }
        ]}
      >
        <AdminLayout>
          <div className="h-[calc(100vh-12rem)]">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={25} className="p-4">
                <div className="h-full bg-muted rounded animate-pulse" />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} className="p-4">
                <div className="h-full bg-muted rounded animate-pulse" />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} className="p-4">
                <div className="h-full bg-muted rounded animate-pulse" />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </AdminLayout>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell 
        breadcrumb={[
          { label: "Admin", href: "/admin" },
          { label: "Workspaces", href: "/admin/workspaces" },
          { label: "Error", href: "#" }
        ]}
      >
        <AdminLayout>
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load workspace. Please check your authentication and try again."}
            </AlertDescription>
          </Alert>
        </AdminLayout>
      </LayoutShell>
    );
  }

  const workspace: Workspace = workspaceData?.workspace;

  if (!workspace) {
    return (
      <LayoutShell 
        breadcrumb={[
          { label: "Admin", href: "/admin" },
          { label: "Workspaces", href: "/admin/workspaces" },
          { label: "Not Found", href: "#" }
        ]}
      >
        <AdminLayout>
          <Alert variant="destructive">
            <AlertDescription>
              Workspace not found or you don't have permission to access it.
            </AlertDescription>
          </Alert>
        </AdminLayout>
      </LayoutShell>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Admin", href: "/admin" },
        { label: "Workspaces", href: "/admin/workspaces" },
        { label: workspace.title, href: `/admin/workspaces/${workspaceId}` }
      ]}
    >
      <AdminLayout>
        <div className="space-y-4">
          {/* Workspace Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight" data-testid="workspace-title">
                  {workspace.title}
                </h1>
                <Badge 
                  variant="secondary" 
                  className={getStatusColor(workspace.status)}
                  data-testid={`workspace-status-${workspace.status}`}
                >
                  <Users className="w-3 h-3 mr-1" />
                  {workspace.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm" data-testid="workspace-goal">
                {workspace.goal}
              </p>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-1" />
              Updated {new Date(workspace.updatedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Three-Panel Workspace Editor */}
          <div className="h-[calc(100vh-16rem)]" data-testid="workspace-editor">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel: Chat Interface */}
              <ResizablePanel 
                defaultSize={30} 
                minSize={20} 
                maxSize={40}
                className="p-2"
              >
                <div className="h-full" data-testid="chat-panel">
                  <ChatPanel workspaceId={workspaceId!} />
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Center Panel: Draft Editor */}
              <ResizablePanel 
                defaultSize={45} 
                minSize={30} 
                className="p-2"
              >
                <div className="h-full" data-testid="draft-panel">
                  <DraftPanel workspaceId={workspaceId!} />
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Right Panel: Suggestions & Activity */}
              <ResizablePanel 
                defaultSize={25} 
                minSize={20} 
                maxSize={35}
                className="p-2"
              >
                <div className="h-full" data-testid="suggestions-activity-panel">
                  <RightPanel workspaceId={workspaceId!} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}