import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Lightbulb, 
  Check, 
  X,
  Eye,
  MessageSquare,
  Loader2,
  Plus,
  Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Suggestion } from "@shared/schema";

interface SuggestionsPanelProps {
  workspaceId: string;
}

interface DiffViewProps {
  suggestion: Suggestion;
}

function DiffView({ suggestion }: DiffViewProps) {
  const changes = Array.isArray(suggestion.diff) ? suggestion.diff : [];
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Proposed Changes</div>
      {changes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No specific changes provided</p>
      ) : (
        <div className="space-y-2">
          {changes.map((change: any, index: number) => (
            <div key={index} className="border rounded-md">
              <div className="p-3 bg-muted/50 border-b">
                <div className="text-xs font-medium">
                  {change.section || `Change ${index + 1}`}
                </div>
              </div>
              <div className="divide-y">
                {change.removed && (
                  <div className="p-3 bg-red-50 text-red-700">
                    <div className="flex items-start space-x-2">
                      <Minus className="w-3 h-3 mt-1 text-red-500" />
                      <div className="text-xs whitespace-pre-wrap font-mono">
                        {change.removed}
                      </div>
                    </div>
                  </div>
                )}
                {change.added && (
                  <div className="p-3 bg-green-50 text-green-700">
                    <div className="flex items-start space-x-2">
                      <Plus className="w-3 h-3 mt-1 text-green-500" />
                      <div className="text-xs whitespace-pre-wrap font-mono">
                        {change.added}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SuggestionsPanel({ workspaceId }: SuggestionsPanelProps) {
  const { toast } = useToast();
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);

  // Fetch suggestions
  const { data: suggestionsData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'suggestions'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/suggestions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Apply suggestion mutation
  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiRequest('POST', `/api/admin/workspaces/${workspaceId}/suggestions/${suggestionId}/apply`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Suggestion Applied",
        description: "The suggestion has been successfully applied to your draft.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'suggestions'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'draft'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'activities'] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Apply Failed",
        description: error.message || "Failed to apply suggestion.",
        variant: "destructive"
      });
    }
  });

  // Reject suggestion mutation
  const rejectSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await apiRequest('POST', `/api/admin/workspaces/${workspaceId}/suggestions/${suggestionId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Suggestion Rejected",
        description: "The suggestion has been rejected and removed.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'suggestions'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'activities'] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reject Failed",
        description: error.message || "Failed to reject suggestion.",
        variant: "destructive"
      });
    }
  });

  const handleApplySuggestion = (suggestion: Suggestion) => {
    applySuggestionMutation.mutate(suggestion.id);
  };

  const handleRejectSuggestion = (suggestion: Suggestion) => {
    rejectSuggestionMutation.mutate(suggestion.id);
  };

  const handleViewDiff = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setDiffDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'content':
        return 'bg-blue-100 text-blue-800';
      case 'structure':
        return 'bg-purple-100 text-purple-800';
      case 'style':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            <Lightbulb className="w-4 h-4 mr-2" />
            Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load suggestions. Please try refreshing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const suggestions: Suggestion[] = suggestionsData?.suggestions || [];

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-sm">
              <Lightbulb className="w-4 h-4 mr-2" />
              Suggestions
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {suggestions.filter(s => s.status === 'pending').length} pending
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 border rounded-md space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="flex space-x-2">
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No suggestions available</p>
                <p className="text-xs">AI suggestions will appear here as you work</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="suggestions-list">
                {suggestions
                  .filter(s => s.status === 'pending')
                  .map((suggestion) => (
                    <div 
                      key={suggestion.id} 
                      className="p-3 border rounded-md space-y-3"
                      data-testid={`suggestion-${suggestion.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <Badge 
                            variant="secondary" 
                            className={`${getTypeColor('content')} text-xs`}
                          >
                            Content
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(suggestion.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <h5 className="text-sm font-medium line-clamp-2">
                          {suggestion.rationale || 'AI Suggestion'}
                        </h5>
                        
                        {suggestion.rationale && (
                          <div className="space-y-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Rationale
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {suggestion.rationale}
                            </p>
                          </div>
                        )}
                        
                        {suggestion.sectionPath && (
                          <div className="text-xs text-muted-foreground">
                            Section: {suggestion.sectionPath}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDiff(suggestion)}
                          data-testid={`button-view-diff-${suggestion.id}`}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Changes
                        </Button>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectSuggestion(suggestion)}
                            disabled={rejectSuggestionMutation.isPending}
                            data-testid={`button-reject-${suggestion.id}`}
                          >
                            {rejectSuggestionMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3 mr-1" />
                            )}
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplySuggestion(suggestion)}
                            disabled={applySuggestionMutation.isPending}
                            data-testid={`button-apply-${suggestion.id}`}
                          >
                            {applySuggestionMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Diff Dialog */}
      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Suggestion Changes</DialogTitle>
            <DialogDescription>
              {selectedSuggestion?.rationale || 'AI Suggestion'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedSuggestion && <DiffView suggestion={selectedSuggestion} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}