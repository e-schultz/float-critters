import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  FileText, 
  Save, 
  Edit, 
  Plus,
  FolderTree,
  History,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Draft } from "@shared/schema";

interface DraftPanelProps {
  workspaceId: string;
}

interface Section {
  id: string;
  path: string;
  title: string;
  content: string;
  level: number;
  children?: Section[];
}

interface DraftState {
  title: string;
  outline: {
    sections: Section[];
  };
  currentSection: string | null;
  hasUnsavedChanges: boolean;
}

export function DraftPanel({ workspaceId }: DraftPanelProps) {
  const { toast } = useToast();
  const [draftState, setDraftState] = useState<DraftState>({
    title: '',
    outline: { sections: [] },
    currentSection: null,
    hasUnsavedChanges: false
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch draft data
  const { data: draftData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'draft'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/draft`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          // No draft exists yet, return empty structure
          return { draft: null };
        }
        throw new Error('Failed to fetch draft');
      }
      return response.json();
    }
  });

  // Fetch draft revisions
  const { data: revisionsData } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'draft', 'revisions'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/draft/revisions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return { revisions: [] };
      return response.json();
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: Partial<Draft>) => {
      const response = await apiRequest('PUT', `/api/admin/workspaces/${workspaceId}/draft`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft Saved",
        description: "Your changes have been saved successfully.",
      });
      setDraftState(prev => ({ ...prev, hasUnsavedChanges: false }));
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'draft'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'draft', 'revisions'] 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save draft changes.",
        variant: "destructive"
      });
    }
  });

  // Initialize draft state from API data
  useEffect(() => {
    const draft = draftData?.draft;
    if (draft) {
      setDraftState({
        title: draft.title || '',
        outline: draft.outline || { sections: [] },
        currentSection: null,
        hasUnsavedChanges: false
      });
      
      // Expand all sections initially
      const allSectionIds = new Set<string>();
      const collectSectionIds = (sections: Section[]) => {
        sections.forEach(section => {
          allSectionIds.add(section.id);
          if (section.children) {
            collectSectionIds(section.children);
          }
        });
      };
      if (draft.outline?.sections) {
        collectSectionIds(draft.outline.sections);
      }
      setExpandedSections(allSectionIds);
    }
  }, [draftData]);

  // Auto-save functionality
  useEffect(() => {
    if (draftState.hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        if (!saveDraftMutation.isPending) {
          saveDraftMutation.mutate({
            outline: draftState.outline
          });
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [draftState.hasUnsavedChanges, draftState.title, draftState.outline]);

  const updateSection = (sectionId: string, field: 'title' | 'content', value: string) => {
    setDraftState(prev => {
      const updatedSections = updateSectionInTree(prev.outline.sections, sectionId, field, value);
      return {
        ...prev,
        outline: { ...prev.outline, sections: updatedSections },
        hasUnsavedChanges: true
      };
    });
  };

  const updateSectionInTree = (sections: Section[], sectionId: string, field: 'title' | 'content', value: string): Section[] => {
    return sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, [field]: value };
      }
      if (section.children) {
        return {
          ...section,
          children: updateSectionInTree(section.children, sectionId, field, value)
        };
      }
      return section;
    });
  };

  const addNewSection = (parentId?: string) => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      path: `section-${Date.now()}`,
      title: 'New Section',
      content: '',
      level: parentId ? 2 : 1,
      children: []
    };

    setDraftState(prev => {
      let updatedSections: Section[];
      
      if (parentId) {
        updatedSections = addSectionToTree(prev.outline.sections, parentId, newSection);
      } else {
        updatedSections = [...prev.outline.sections, newSection];
      }

      return {
        ...prev,
        outline: { ...prev.outline, sections: updatedSections },
        currentSection: newSection.id,
        hasUnsavedChanges: true
      };
    });

    // Expand the parent section
    if (parentId) {
      setExpandedSections(prev => new Set([...Array.from(prev), parentId]));
    }
  };

  const addSectionToTree = (sections: Section[], parentId: string, newSection: Section): Section[] => {
    return sections.map(section => {
      if (section.id === parentId) {
        return {
          ...section,
          children: [...(section.children || []), newSection]
        };
      }
      if (section.children) {
        return {
          ...section,
          children: addSectionToTree(section.children, parentId, newSection)
        };
      }
      return section;
    });
  };

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const renderSection = (section: Section, depth = 0) => {
    const isExpanded = expandedSections.has(section.id);
    const isSelected = draftState.currentSection === section.id;
    
    return (
      <div key={section.id} className="space-y-1">
        <div 
          className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent ${
            isSelected ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${(depth * 12) + 8}px` }}
          onClick={() => setDraftState(prev => ({ 
            ...prev, 
            currentSection: section.id 
          }))}
          data-testid={`section-${section.id}`}
        >
          {section.children && section.children.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleSectionExpand(section.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          <span className="text-sm flex-1 truncate">
            {section.title}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              addNewSection(section.id);
            }}
            data-testid={`add-subsection-${section.id}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {isExpanded && section.children && (
          <div className="space-y-1">
            {section.children.map(child => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getCurrentSection = (): Section | null => {
    if (!draftState.currentSection) return null;
    
    const findSection = (sections: Section[]): Section | null => {
      for (const section of sections) {
        if (section.id === draftState.currentSection) {
          return section;
        }
        if (section.children) {
          const found = findSection(section.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findSection(draftState.outline.sections);
  };

  const handleManualSave = () => {
    saveDraftMutation.mutate({
      outline: draftState.outline
    });
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            <FileText className="w-4 h-4 mr-2" />
            Draft Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load draft. Please try refreshing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const currentSection = getCurrentSection();
  const revisions = revisionsData?.revisions || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm">
            <FileText className="w-4 h-4 mr-2" />
            Draft Editor
          </CardTitle>
          <div className="flex items-center space-x-2">
            {draftState.hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved
              </Badge>
            )}
            <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-revision-history">
                  <History className="w-3 h-3 mr-1" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revision History</DialogTitle>
                  <DialogDescription>
                    View and restore previous versions of this draft.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {revisions.map((revision: any) => (
                      <div key={revision.id} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {new Date(revision.createdAt).toLocaleString()}
                          </span>
                          <Button variant="outline" size="sm">
                            Restore
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {revision.summary || 'No summary available'}
                        </p>
                      </div>
                    ))}
                    {revisions.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No revision history available
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={handleManualSave}
              disabled={saveDraftMutation.isPending || !draftState.hasUnsavedChanges}
              size="sm"
              data-testid="button-save-draft"
            >
              {saveDraftMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex space-x-4 min-h-0">
        {/* Left: Outline Navigation */}
        <div className="w-1/3 flex flex-col space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center">
                <FolderTree className="w-4 h-4 mr-1" />
                Outline
              </h4>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addNewSection()}
                data-testid="button-add-section"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Section
              </Button>
            </div>
            <Input
              value={draftState.title}
              onChange={(e) => setDraftState(prev => ({
                ...prev,
                title: e.target.value,
                hasUnsavedChanges: true
              }))}
              placeholder="Draft Title"
              className="text-sm"
              data-testid="input-draft-title"
            />
          </div>
          
          <Separator />
          
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1" data-testid="outline-navigation">
                {draftState.outline.sections.map(section => renderSection(section))}
                {draftState.outline.sections.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No sections yet</p>
                    <p className="text-xs">Click "Add Section" to start</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator orientation="vertical" />

        {/* Right: Section Editor */}
        <div className="flex-1 flex flex-col space-y-4">
          {currentSection ? (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Edit className="w-4 h-4 mr-1" />
                  Section Editor
                </h4>
                <Input
                  value={currentSection.title}
                  onChange={(e) => updateSection(currentSection.id, 'title', e.target.value)}
                  placeholder="Section Title"
                  className="mb-2"
                  data-testid="input-section-title"
                />
                <Textarea
                  value={currentSection.content}
                  onChange={(e) => updateSection(currentSection.id, 'content', e.target.value)}
                  placeholder="Section content..."
                  className="flex-1 min-h-[300px] resize-none"
                  data-testid="textarea-section-content"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Section: {currentSection.path} | Level: {currentSection.level}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Edit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a section from the outline to start editing</p>
                <p className="text-xs mt-2">Or add a new section to get started</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}