import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Eye, 
  EyeOff,
  Loader2,
  BookOpen,
  Layout,
  Zap
} from "lucide-react";
import type { Workspace, Draft } from "@shared/schema";

interface ArtifactPreviewProps {
  workspaceId: string;
}

// Draft content structure interfaces
interface DraftSection {
  id: string;
  title: string;
  content: string;
  level: number;
  children?: DraftSection[];
}

interface DraftOutline {
  sections: DraftSection[];
}

interface DraftContent {
  title?: string;
  outline?: DraftOutline;
}

// Type for API responses  
interface WorkspaceResponse {
  workspace: Workspace;
}

interface DraftResponse {
  draft: Draft & { title?: string; outline?: DraftOutline } | null;
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

// Content conversion utilities
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
        
        const content = section.content ?? '';
        if (content.trim()) {
          const entry = {
            pattern: section.title || 'Untitled',
            description: content,
            signals: extractSignalsFromContent(content),
            protocol: extractProtocolFromContent(content)
          };
          issueSection.entries.push(entry);
        }
        
        if (section.children) {
          section.children.forEach(child => {
            const childEntry = {
              pattern: child.title || 'Untitled',
              description: child.content || 'No description provided',
              signals: extractSignalsFromContent(child.content || ''),
              protocol: extractProtocolFromContent(child.content || '')
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
  if (!content) return ['Implementation needed', 'System complexity', 'Performance considerations'];
  
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
  if (!content) return '1. Analyze requirements 2. Design solution 3. Implement changes 4. Test and validate';
  
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

function SectionIcon({ icon, color }: { icon: string; color: string }) {
  const getIconComponent = () => {
    switch (icon) {
      case 'circle': return <div className="w-3 h-3 rounded-full border-2" />;
      case 'square': return <div className="w-3 h-3 border-2" />;
      case 'triangle': return <div className="w-3 h-3 border-2 rotate-45" />;
      case 'shield': return <div className="w-3 h-3 border-2 rounded-sm" />;
      case 'zap': return <Zap className="w-3 h-3" />;
      case 'battery': return <div className="w-3 h-2 border rounded-sm" />;
      case 'trending-up': return <div className="w-3 h-3 border-l-2 border-b-2" />;
      default: return <div className="w-3 h-3 rounded-full border-2" />;
    }
  };

  const colorClasses = {
    cyan: 'border-cyan-400 text-cyan-400',
    purple: 'border-purple-400 text-purple-400', 
    green: 'border-green-400 text-green-400',
    yellow: 'border-yellow-400 text-yellow-400'
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center`}>
      {getIconComponent()}
    </div>
  );
}

export function ArtifactPreview({ workspaceId }: ArtifactPreviewProps) {
  const [showPreview, setShowPreview] = useState(true);

  // Fetch workspace data - uses default fetcher with shared types
  const { data: workspaceData } = useQuery<WorkspaceResponse>({
    queryKey: ['/api/admin/workspaces', workspaceId],
    refetchInterval: 10000
  });

  // Fetch draft data - uses default fetcher with shared types
  const { data: draftData, isLoading, error } = useQuery<DraftResponse>({
    queryKey: ['/api/admin/workspaces', workspaceId, 'draft'],
    refetchInterval: 5000
  });

  const workspace: Workspace | undefined = workspaceData?.workspace;
  const draft = draftData?.draft;

  // Safely extract draft outline and title with proper type casting
  const draftOutline = draft?.outline as DraftOutline | undefined;
  const draftTitle = (draft as any)?.title as string | undefined;

  // Memoize expensive preview conversion with null safety
  const previewContent = useMemo(() => {
    return draftOutline?.sections ? convertDraftToIssuePreview(draftOutline.sections) : [];
  }, [draftOutline?.sections]);

  return (
    <Card className="h-full flex flex-col" data-testid="artifact-preview">
      <CardHeader className="shrink-0 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Layout className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-lg">Artifact Preview</CardTitle>
            </div>
            {draftTitle && (
              <Badge variant="outline" className="text-xs">
                {draftTitle}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              data-testid="button-toggle-preview"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {workspace && (
          <div className="text-sm text-muted-foreground" data-testid="preview-workspace-info">
            {workspace.title} {workspace.goal && `• ${workspace.goal}`}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {!showPreview ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8">
            <div>
              <EyeOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Preview hidden</p>
              <p className="text-xs mt-1">Click the eye icon to show preview</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading draft...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load draft content. Please check your connection and try again.
              </AlertDescription>
            </Alert>
          </div>
        ) : !draftOutline?.sections?.length ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8">
            <div>
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No content yet</p>
              <p className="text-xs mt-1">Start chatting with AI to create draft content</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="p-6 space-y-6" data-testid="preview-content">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-xl font-bold">
                    {draftTitle || workspace?.title || 'Untitled Draft'}
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  {workspace?.goal || 'Collaborative workspace content'}
                </p>
              </div>

              <Separator />

              {/* Intro */}
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-muted-foreground">
                  This content is being collaboratively created and represents the collective insights and patterns discovered during the ideation process.
                </p>
              </div>

              {/* Sections */}
              <div className="space-y-6">
                {previewContent.map((section, index) => (
                  <div key={section.id} className="border rounded-lg p-4 space-y-4" data-testid={`preview-section-${index}`}>
                    <div className="flex items-center space-x-3">
                      <SectionIcon icon={section.icon} color={section.color} />
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {section.entries.length} pattern{section.entries.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {section.entries.map((entry, entryIndex) => (
                        <div key={entryIndex} className="border-l-2 border-muted pl-4 space-y-3">
                          <h4 className="font-medium">{entry.pattern}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {entry.description}
                          </p>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              <span className="font-medium text-muted-foreground uppercase tracking-wide">Signals</span>
                              <ul className="space-y-1">
                                {entry.signals.map((signal, signalIndex) => (
                                  <li key={signalIndex} className="flex items-start space-x-2">
                                    <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                                    <span className="text-muted-foreground">{signal}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <span className="font-medium text-muted-foreground uppercase tracking-wide">Protocol</span>
                              <p className="text-muted-foreground leading-relaxed">{entry.protocol}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {previewContent.length === 0 && draftOutline?.sections?.length && draftOutline.sections.length > 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Draft sections detected but no level-1 sections found</p>
                  <p className="text-xs mt-1">Organize your content with main sections to see preview</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}