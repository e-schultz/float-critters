import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Folder, 
  Plus, 
  FileText,
  Upload,
  Download,
  Trash2,
  Link2,
  Image,
  FileIcon,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WorkspaceResource } from "@shared/schema";

interface ResourceDrawerProps {
  workspaceId: string;
}

interface ResourceResponse {
  resources: WorkspaceResource[];
}

interface AddTextResourceData {
  name: string;
  content: string;
}

interface AddFileResourceData {
  name: string;
  file: File;
}

function ResourceIcon({ type, mimeType }: { type: string; mimeType?: string | null }) {
  if (type === 'text') {
    return <FileText className="w-4 h-4 text-blue-500" />;
  }
  
  if (type === 'url') {
    return <Link2 className="w-4 h-4 text-green-500" />;
  }
  
  if (type === 'file') {
    if (mimeType?.startsWith('image/')) {
      return <Image className="w-4 h-4 text-purple-500" />;
    }
    return <FileIcon className="w-4 h-4 text-orange-500" />;
  }
  
  return <FileIcon className="w-4 h-4 text-gray-500" />;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function AddTextResourceDialog({ workspaceId, onSuccess }: { workspaceId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const { toast } = useToast();

  const addResourceMutation = useMutation({
    mutationFn: async (data: AddTextResourceData) => {
      const response = await apiRequest('POST', `/api/admin/workspaces/${workspaceId}/resources`, {
        name: data.name,
        type: 'text',
        content: data.content,
        metadata: {
          addedBy: 'user',
          description: 'Text resource added to drawer'
        }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Text Resource Added",
        description: `"${name}" has been added to the drawer`,
      });
      setOpen(false);
      setName('');
      setContent('');
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Resource",
        description: error.message || "Could not add text resource. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a name and content for the text resource.",
        variant: "destructive",
      });
      return;
    }
    addResourceMutation.mutate({ name: name.trim(), content: content.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-add-text-resource">
          <FileText className="w-4 h-4 mr-1" />
          Add Text
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Text Resource</DialogTitle>
          <DialogDescription>
            Add a text note, snippet, or reference to your workspace drawer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="resource-name" className="text-sm font-medium">Name</label>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Notes, Requirements, References"
              data-testid="input-resource-name"
            />
          </div>
          <div>
            <label htmlFor="resource-content" className="text-sm font-medium">Content</label>
            <Textarea
              id="resource-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your text content here..."
              rows={6}
              data-testid="textarea-resource-content"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              data-testid="button-cancel-text-resource"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addResourceMutation.isPending}
              data-testid="button-save-text-resource"
            >
              {addResourceMutation.isPending ? 'Adding...' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FileUploadArea({ workspaceId, onSuccess }: { workspaceId: string; onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFileMutation = useMutation({
    mutationFn: async (data: AddFileResourceData) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('name', data.name);
      formData.append('type', 'file');
      formData.append('metadata', JSON.stringify({
        originalFilename: data.file.name,
        addedBy: 'user',
        description: 'File uploaded to drawer'
      }));

      const response = await apiRequest('POST', `/api/admin/workspaces/${workspaceId}/resources/upload`, formData);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "File Uploaded",
        description: `"${result.resource.name}" has been added to the drawer`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Could not upload file. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please choose a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    uploadFileMutation.mutate({
      name: file.name,
      file
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        data-testid="file-upload-input"
      />
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadFileMutation.isPending}
        data-testid="button-upload-file"
      >
        <Upload className="w-4 h-4 mr-1" />
        {uploadFileMutation.isPending ? 'Uploading...' : 'Upload File'}
      </Button>
    </div>
  );
}

export function ResourceDrawer({ workspaceId }: ResourceDrawerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  // Fetch resources
  const { data: resourcesData, isLoading, error, refetch } = useQuery<ResourceResponse>({
    queryKey: ['/api/admin/workspaces', workspaceId, 'resources'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/workspaces/${workspaceId}/resources/${resourceId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource Deleted",
        description: "Resource has been removed from the drawer",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete resource. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resources = resourcesData?.resources || [];
  
  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (resource.content && resource.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || resource.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <Card className="h-full flex flex-col" data-testid="resource-drawer">
      <CardHeader className="shrink-0 border-b bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              data-testid="button-toggle-drawer"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Folder className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Resources</CardTitle>
            {resources.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {resources.length}
              </Badge>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="space-y-3">
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <AddTextResourceDialog workspaceId={workspaceId} onSuccess={handleRefresh} />
              <FileUploadArea workspaceId={workspaceId} onSuccess={handleRefresh} />
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleRefresh}
                data-testid="button-refresh-resources"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-resources"
                />
              </div>
              <div className="flex items-center space-x-1">
                <Filter className="w-3 h-3 text-muted-foreground" />
                <Button 
                  size="sm" 
                  variant={typeFilter === 'all' ? 'default' : 'ghost'}
                  onClick={() => setTypeFilter('all')}
                  className="text-xs h-6"
                >
                  All
                </Button>
                <Button 
                  size="sm" 
                  variant={typeFilter === 'text' ? 'default' : 'ghost'}
                  onClick={() => setTypeFilter('text')}
                  className="text-xs h-6"
                >
                  Text
                </Button>
                <Button 
                  size="sm" 
                  variant={typeFilter === 'file' ? 'default' : 'ghost'}
                  onClick={() => setTypeFilter('file')}
                  className="text-xs h-6"
                >
                  Files
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading resources...</p>
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load resources. Please check your connection and try again.
                </AlertDescription>
              </Alert>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8">
              <div>
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">
                  {resources.length === 0 ? 'No resources yet' : 'No matching resources'}
                </p>
                <p className="text-xs mt-1">
                  {resources.length === 0 
                    ? 'Upload files or add text resources to get started'
                    : 'Try adjusting your search or filter'
                  }
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="p-4 space-y-3" data-testid="resources-list">
                {filteredResources.map((resource) => (
                  <div key={resource.id} className="border rounded-lg p-3 space-y-2" data-testid={`resource-${resource.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <ResourceIcon type={resource.type} mimeType={resource.mimeType} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{resource.name}</h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="capitalize">{resource.type}</span>
                            {resource.size && <span>• {formatFileSize(resource.size)}</span>}
                            <span>• {new Date(resource.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteResourceMutation.mutate(resource.id)}
                        disabled={deleteResourceMutation.isPending}
                        data-testid={`button-delete-resource-${resource.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {resource.type === 'text' && resource.content && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-20 overflow-y-auto">
                        {resource.content.substring(0, 200)}
                        {resource.content.length > 200 && '...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}