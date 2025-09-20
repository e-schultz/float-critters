import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  Pause,
  MoreHorizontal,
  Edit,
  Play,
  Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import type { Workspace } from "@shared/schema";

const createWorkspaceSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  goal: z.string().min(1, "Goal is required").max(500, "Goal must be less than 500 characters"),
});

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export default function AdminWorkspaces() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      title: "",
      goal: ""
    }
  });

  const { data: workspacesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/workspaces'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch('/api/admin/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      return response.json();
    }
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: CreateWorkspaceFormData) => {
      const token = localStorage.getItem('admin-token');
      const response = await apiRequest('POST', '/api/admin/workspaces', {
        title: data.title,
        goal: data.goal
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Workspace Created",
        description: `Successfully created "${result.workspace.title}"`,
      });
      setCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspaces'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create workspace.",
        variant: "destructive"
      });
    }
  });

  const updateWorkspaceStatus = async (workspaceId: string, status: string) => {
    try {
      const token = localStorage.getItem('admin-token');
      await apiRequest('PUT', `/api/admin/workspaces/${workspaceId}`, { status });
      
      toast({
        title: "Status Updated",
        description: `Workspace status changed to ${status}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workspaces'] });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update workspace status.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = (data: CreateWorkspaceFormData) => {
    createWorkspaceMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <LayoutShell breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Workspaces", href: "/admin/workspaces" }]}>
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-muted rounded w-48 animate-pulse" />
              <div className="h-10 bg-muted rounded w-32 animate-pulse" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </AdminLayout>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Workspaces", href: "/admin/workspaces" }]}>
        <AdminLayout>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load workspaces. Please check your authentication and try again.
            </AlertDescription>
          </Alert>
        </AdminLayout>
      </LayoutShell>
    );
  }

  const workspaces = workspacesData?.workspaces || [];
  const filteredWorkspaces = workspaces.filter((workspace: Workspace) => {
    const matchesSearch = !searchQuery || 
      workspace.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workspace.goal.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === "all" || workspace.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'completed':
        return <Archive className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

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
        { label: "Workspaces", href: "/admin/workspaces" }
      ]}
    >
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
              <p className="text-muted-foreground">
                Collaborative AI-powered content creation workspaces.
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-workspace">
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Create New Workspace</DialogTitle>
                  <DialogDescription>
                    Set up a collaborative workspace for AI-powered content creation.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter workspace title"
                              data-testid="input-workspace-title"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goal</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what you want to accomplish in this workspace"
                              data-testid="textarea-workspace-goal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCreateDialogOpen(false)}
                        data-testid="button-cancel-workspace"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createWorkspaceMutation.isPending}
                        data-testid="button-submit-workspace"
                      >
                        {createWorkspaceMutation.isPending ? "Creating..." : "Create Workspace"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search workspaces by title or goal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-workspaces"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-testid="dropdown-filter-workspaces">
                      <Filter className="w-4 h-4 mr-2" />
                      {filter === "all" ? "All Workspaces" : 
                       filter === "active" ? "Active" :
                       filter === "paused" ? "Paused" : "Completed"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilter("all")}>
                      All Workspaces
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("active")}>
                      Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("paused")}>
                      Paused
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("completed")}>
                      Completed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Workspaces Grid */}
          {filteredWorkspaces.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {workspaces.length === 0 ? "No workspaces created yet" : "No workspaces match your search"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {workspaces.length === 0 ? 
                  "Create your first workspace to start collaborating with AI on content creation." :
                  "Try adjusting your search terms or filters."
                }
              </p>
              {workspaces.length === 0 && (
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-workspace">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Workspace
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorkspaces.map((workspace: Workspace) => (
                <Card key={workspace.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg line-clamp-1">{workspace.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className={getStatusColor(workspace.status)}
                          data-testid={`status-${workspace.status}-${workspace.id}`}
                        >
                          {getStatusIcon(workspace.status)}
                          <span className="ml-1 capitalize">{workspace.status}</span>
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`menu-workspace-${workspace.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/admin/workspaces/${workspace.id}`)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Open Editor
                            </DropdownMenuItem>
                            {workspace.status === 'paused' && (
                              <DropdownMenuItem
                                onClick={() => updateWorkspaceStatus(workspace.id, 'active')}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                              </DropdownMenuItem>
                            )}
                            {workspace.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateWorkspaceStatus(workspace.id, 'paused')}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {(workspace.status === 'active' || workspace.status === 'paused') && (
                              <DropdownMenuItem
                                onClick={() => updateWorkspaceStatus(workspace.id, 'completed')}
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Complete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent 
                    className="pt-0"
                    onClick={() => setLocation(`/admin/workspaces/${workspace.id}`)}
                  >
                    <CardDescription className="line-clamp-3 mb-4">
                      {workspace.goal}
                    </CardDescription>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(workspace.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        <span data-testid={`workspace-id-${workspace.id}`}>
                          {workspace.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}