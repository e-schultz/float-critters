import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Bookmark, BookOpen, Layers, Radio, PlayCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface BookmarkItem {
  id: string;
  issueSlug: string;
  sectionId?: string;
  patternName?: string;
  bookmarkType: 'issue' | 'section' | 'pattern';
  notes?: string;
  createdAt: string;
  metadata?: {
    issueTitle?: string;
    sectionTitle?: string;
    sectionColor?: string;
  };
}

interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const bookmarkTypeIcons = {
  issue: BookOpen,
  section: Layers,
  pattern: Radio,
};

const bookmarkTypeColors = {
  issue: "bg-blue-500/20 text-blue-500",
  section: "bg-purple-500/20 text-purple-500", 
  pattern: "bg-green-500/20 text-green-500",
};

export function BookmarksPanel({ isOpen, onClose }: BookmarksPanelProps) {
  const [activeTab, setActiveTab] = useState("all");

  // Fetch bookmarks
  const { data: bookmarksData, isLoading } = useQuery({
    queryKey: ['/api/bookmarks'],
    queryFn: async () => {
      const response = await fetch('/api/bookmarks');
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      return response.json();
    },
    enabled: isOpen,
  });

  const bookmarks: BookmarkItem[] = bookmarksData?.bookmarks || [];

  // Filter bookmarks by type
  const filteredBookmarks = activeTab === "all" 
    ? bookmarks 
    : bookmarks.filter(bookmark => bookmark.bookmarkType === activeTab);

  const getBookmarkUrl = (bookmark: BookmarkItem) => {
    let url = `/zine/${bookmark.issueSlug}`;
    if (bookmark.sectionId) {
      url += `#section-${bookmark.sectionId}`;
    }
    return url;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderBookmarkItem = (bookmark: BookmarkItem) => {
    const Icon = bookmarkTypeIcons[bookmark.bookmarkType];
    const colorClass = bookmarkTypeColors[bookmark.bookmarkType];

    return (
      <Link
        href={getBookmarkUrl(bookmark)}
        onClick={onClose}
        key={bookmark.id}
        className="block"
      >
        <div className="p-4 hover:bg-accent rounded-lg transition-colors group border border-border/50">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0 mt-1`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                  {bookmark.patternName || bookmark.metadata?.sectionTitle || bookmark.metadata?.issueTitle}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {bookmark.bookmarkType}
                </Badge>
              </div>
              
              {bookmark.notes && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {bookmark.notes}
                </p>
              )}
              
              <div className="flex items-center text-xs text-muted-foreground space-x-2">
                <span>{bookmark.metadata?.issueTitle}</span>
                {bookmark.metadata?.sectionTitle && bookmark.bookmarkType !== 'section' && (
                  <>
                    <span>•</span>
                    <span>{bookmark.metadata.sectionTitle}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatDate(bookmark.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50" 
        onClick={onClose}
        data-testid="bookmarks-overlay"
      />
      
      {/* Bookmarks Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-border z-50">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Bookmarks</h3>
                <p className="text-xs text-muted-foreground">
                  {bookmarks.length} saved items
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="bookmarks-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 m-4 mb-0">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="issue" className="text-xs">Issues</TabsTrigger>
                <TabsTrigger value="section" className="text-xs">Sections</TabsTrigger>
                <TabsTrigger value="pattern" className="text-xs">Patterns</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value={activeTab} className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      {/* Loading State */}
                      {isLoading && (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center space-x-2 text-muted-foreground">
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Loading bookmarks...</span>
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {!isLoading && filteredBookmarks.length === 0 && (
                        <div className="text-center py-8">
                          <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">
                            {activeTab === "all" ? "No bookmarks yet" : `No ${activeTab} bookmarks`}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Bookmark patterns and sections as you explore
                          </p>
                        </div>
                      )}

                      {/* Bookmarks List */}
                      {!isLoading && filteredBookmarks.length > 0 && (
                        <div className="space-y-3">
                          {filteredBookmarks.map(renderBookmarkItem)}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}