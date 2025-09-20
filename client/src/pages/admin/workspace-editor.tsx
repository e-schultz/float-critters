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
  Clock,
  Upload,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { z } from "zod";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { DraftPanel } from "@/components/workspace/DraftPanel";
import { SuggestionsPanel } from "@/components/workspace/SuggestionsPanel";
import { ActivityTimeline } from "@/components/workspace/ActivityTimeline";
import type { Workspace } from "@shared/schema";

// Publish form schema
const publishFormSchema = z.object({
  slug: z.string().min(1, "Slug is required").max(50, "Slug must be 50 characters or less"),
  version: z.string().min(1, "Version is required").max(20, "Version must be 20 characters or less"),
  publishedAt: z.string().optional()
});

type PublishFormValues = z.infer<typeof publishFormSchema>;

// Content conversion utilities for frontend preview
interface DraftSection {
  id: string;
  title: string;
  content: string;
  level: number;
  children?: DraftSection[];
}

interface IssueSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  entries: {
    pattern: string;
    description: string;
    signals: string[];
    protocol: string;
  }[];
}

function convertDraftToIssuePreview(draftSections: DraftSection[]): IssueSection[] {
  const iconOptions = ['circle', 'square', 'triangle', 'shield', 'zap', 'battery', 'trending-up'];
  const colorOptions = ['cyan', 'purple', 'green', 'yellow'];
  const issuesSections: IssueSection[] = [];
  
  let parentIndex = 0;
  const processSections = (sections: DraftSection[]) => {
    sections.forEach((section) => {
      if (section.level === 1) {
        const issueSection: IssueSection = {
          id: section.id,
          title: section.title,
          icon: iconOptions[parentIndex % iconOptions.length],
          color: colorOptions[parentIndex % colorOptions.length],
          entries: []
        };
        
        if (section.content.trim()) {
          const entry = {
            pattern: section.title,
            description: section.content,
            signals: extractSignalsFromContent(section.content),
            protocol: extractProtocolFromContent(section.content)
          };
          issueSection.entries.push(entry);
        }
        
        if (section.children) {
          section.children.forEach(child => {
            const childEntry = {
              pattern: child.title,
              description: child.content || 'No description provided',
              signals: extractSignalsFromContent(child.content),
              protocol: extractProtocolFromContent(child.content)
            };
            issueSection.entries.push(childEntry);
          });
        }
        
        issuesSections.push(issueSection);
        parentIndex++;
      }
    });
  };
  
  processSections(draftSections);
  return issuesSections;
}

function extractSignalsFromContent(content: string): string[] {
  const signalKeywords = ['when', 'if', 'warning', 'alert', 'issue', 'problem', 'symptom'];
  const sentences = content.split('.').map(s => s.trim()).filter(s => s.length > 0);
  
  const signals = sentences.filter(sentence => 
    signalKeywords.some(keyword => 
      sentence.toLowerCase().includes(keyword)
    )
  ).slice(0, 3);
  
  return signals.length > 0 ? signals : ['Implementation needed', 'System complexity', 'Performance considerations'];
}

function extractProtocolFromContent(content: string): string {
  const protocolKeywords = ['step', 'first', 'then', 'finally', 'process', 'method', 'approach'];
  const sentences = content.split('.').map(s => s.trim()).filter(s => s.length > 0);
  
  const protocolSentences = sentences.filter(sentence =>
    protocolKeywords.some(keyword =>
      sentence.toLowerCase().includes(keyword)
    )
  );
  
  if (protocolSentences.length > 0) {
    return protocolSentences.join(' → ');
  }
  
  return '1. Analyze requirements 2. Design solution 3. Implement changes 4. Test and validate';
}

// Publish dialog component
function PublishDialog({ workspace, workspaceId }: { workspace: Workspace, workspaceId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch draft data for preview
  const { data: draftData } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'draft'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/draft`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { draft: null };
      return response.json();
    },
    enabled: dialogOpen && !!workspaceId
  });
  
  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishFormSchema),
    defaultValues: {
      slug: workspace.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim(),
      version: "v1.0",
      publishedAt: ""
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (data: PublishFormValues) => {
      const payload = {
        slug: data.slug,
        version: data.version,
        ...(data.publishedAt && { publishedAt: data.publishedAt })
      };
      
      const response = await apiRequest('POST', `/api/admin/workspaces/${workspaceId}/publish`, payload);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Successfully Published!",
        description: `Your workspace has been published as "${result.issue.title}"`,
        duration: 5000
      });
      
      setDialogOpen(false);
      form.reset();
      
      // Invalidate workspace queries to refresh the status
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspaces', workspaceId] });
      
      // Show success with link to view published issue
      setTimeout(() => {
        toast({
          title: "View Published Issue",
          description: (
            <div className="space-y-2">
              <p>Issue "{result.issue.title}" is now live!</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/zine/${result.issue.slug}`, '_blank')}
                data-testid="button-view-published-issue"
              >
                View Published Issue
              </Button>
            </div>
          ),
          duration: 10000
        });
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Publish Failed",
        description: error.message || "Failed to publish workspace. Please check your content and try again.",
        variant: "destructive",
        duration: 5000
      });
    }
  });

  const onSubmit = (data: PublishFormValues) => {
    publishMutation.mutate(data);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className="ml-4"
          disabled={workspace.status === 'completed'}
          data-testid="button-publish-issue"
        >
          <Upload className="w-4 h-4 mr-2" />
          {workspace.status === 'completed' ? 'Published' : 'Publish Issue'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Publish as Issue</DialogTitle>
          <DialogDescription>
            Convert your workspace draft into a published Issue in the main zine. 
            This will make your collaborative content visible to all users.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" data-testid="tab-publish-settings">Settings</TabsTrigger>
            <TabsTrigger value="preview" data-testid="tab-publish-preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Slug</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="issue-slug"
                          data-testid="input-publish-slug"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        URL-friendly identifier for your issue. Will be used in the issue URL.
                      </p>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="v1.0"
                          data-testid="input-publish-version"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Version identifier for your issue (e.g., v1.0, v2.1, etc.)
                      </p>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="publishedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          data-testid="input-publish-date"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to publish immediately. Set a future date to schedule publication.
                      </p>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-publish"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={publishMutation.isPending}
                    data-testid="button-confirm-publish"
                  >
                    {publishMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Publish Issue
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {draftData?.draft?.outline?.sections?.length > 0 ? (
                <div className="space-y-6" data-testid="publish-preview-content">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {draftData.draft.title || workspace.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Published from workspace: {workspace.title}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Version: {form.watch('version')} • Slug: {form.watch('slug')}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <p className="text-sm">
                      This content was collaboratively created in workspace "{workspace.title}" and represents the collective insights and patterns discovered during the ideation process.
                    </p>
                    
                    <div className="space-y-4">
                      {convertDraftToIssuePreview(draftData.draft.outline.sections).map((section, index) => (
                        <div key={section.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-sm bg-${section.color}-200`} />
                            <h4 className="font-medium">{section.title}</h4>
                            <span className="text-xs text-muted-foreground">({section.icon})</span>
                          </div>
                          
                          <div className="space-y-3">
                            {section.entries.map((entry, entryIndex) => (
                              <div key={entryIndex} className="border-l-2 border-muted pl-3 space-y-2">
                                <h5 className="font-medium text-sm">{entry.pattern}</h5>
                                <p className="text-sm text-muted-foreground">{entry.description}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="font-medium">Signals:</span>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {entry.signals.map((signal, signalIndex) => (
                                        <li key={signalIndex} className="text-muted-foreground">{signal}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <span className="font-medium">Protocol:</span>
                                    <p className="text-muted-foreground mt-1">{entry.protocol}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                  <div>
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No draft content available</p>
                    <p className="text-xs mt-1">Create and save draft content to see preview</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

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
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                Updated {new Date(workspace.updatedAt).toLocaleDateString()}
              </div>
              <PublishDialog workspace={workspace} workspaceId={workspaceId!} />
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