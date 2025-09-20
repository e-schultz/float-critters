import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search, Filter, BookOpen, Layers, Radio, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

interface SearchResult {
  id: string;
  issueSlug: string;
  sectionId: string;
  patternName: string;
  content: string;
  contentType: string;
  metadata: any;
  relevanceScore: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const contentTypeIcons = {
  issue: BookOpen,
  section: Layers,
  pattern: Radio,
  description: Radio,
  signal: Radio,
  protocol: PlayCircle,
};

const contentTypeColors = {
  issue: "bg-blue-500/20 text-blue-500",
  section: "bg-purple-500/20 text-purple-500",
  pattern: "bg-green-500/20 text-green-500",
  description: "bg-cyan-500/20 text-cyan-500",
  signal: "bg-yellow-500/20 text-yellow-500",
  protocol: "bg-orange-500/20 text-orange-500",
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/search', debouncedQuery, contentTypeFilter, issueFilter],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [], totalCount: 0 };
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: debouncedQuery,
          issueSlug: issueFilter === 'all' ? undefined : issueFilter,
          contentType: contentTypeFilter === 'all' ? undefined : contentTypeFilter,
          limit: 50
        })
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: isOpen && debouncedQuery.length > 0,
  });

  // Get suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['/api/search/suggestions', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return { suggestions: [] };
      
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
      return response.json();
    },
    enabled: isOpen && searchQuery.length >= 2 && searchQuery.length < debouncedQuery.length,
  });

  const results = searchResults?.results || [];

  const handleResultClick = (result: SearchResult) => {
    onClose();
  };

  const renderResultContent = (result: SearchResult) => {
    const Icon = contentTypeIcons[result.contentType as keyof typeof contentTypeIcons] || Radio;
    const colorClass = contentTypeColors[result.contentType as keyof typeof contentTypeColors] || contentTypeColors.pattern;

    return (
      <Link
        href={`/zine/${result.issueSlug}${result.contentType === 'issue' ? '' : `#section-${result.sectionId}`}`}
        onClick={() => handleResultClick(result)}
        className="block"
      >
        <div className="p-4 hover:bg-accent rounded-lg transition-colors group">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0 mt-1`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                  {result.patternName}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {result.contentType}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {result.content}
              </p>
              <div className="flex items-center text-xs text-muted-foreground space-x-2">
                <span>{result.metadata?.title || result.issueSlug}</span>
                {result.metadata?.sectionTitle && (
                  <>
                    <span>•</span>
                    <span>{result.metadata.sectionTitle}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Score: {Math.round(result.relevanceScore)}
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
        data-testid="search-overlay"
      />
      
      {/* Search Modal */}
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-background border border-border rounded-lg shadow-2xl z-50 mx-4">
        <div className="flex flex-col max-h-[80vh]">
          {/* Search Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search patterns, protocols, and concepts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                  data-testid="search-input"
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                data-testid="search-close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters:</span>
              </div>
              <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="issue">Issues</SelectItem>
                  <SelectItem value="section">Sections</SelectItem>
                  <SelectItem value="pattern">Patterns</SelectItem>
                  <SelectItem value="protocol">Protocols</SelectItem>
                  <SelectItem value="signal">Signals</SelectItem>
                </SelectContent>
              </Select>
              <Select value={issueFilter} onValueChange={setIssueFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Issue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="issue-01">Foundation Patterns</SelectItem>
                  <SelectItem value="issue-02">Network Dynamics</SelectItem>
                  <SelectItem value="issue-03">Data Orchestration</SelectItem>
                  <SelectItem value="issue-04">Security Protocols</SelectItem>
                  <SelectItem value="issue-05">Scale & Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Results */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* Loading State */}
              {isSearching && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 text-muted-foreground">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Searching...</span>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isSearching && !searchQuery.trim() && (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Start typing to search across all issues and patterns</p>
                </div>
              )}

              {/* No Results */}
              {!isSearching && searchQuery.trim() && results.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                  <p className="text-sm text-muted-foreground mt-1">Try different keywords or check your spelling</p>
                </div>
              )}

              {/* Suggestions */}
              {!isSearching && searchQuery.length >= 2 && suggestions?.suggestions?.length > 0 && results.length === 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Suggestions:</h3>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.suggestions.map((suggestion: string, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {!isSearching && results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">
                      {searchResults?.totalCount} results for "{searchQuery}"
                    </h3>
                  </div>
                  {results.map((result) => (
                    <div key={result.id}>
                      {renderResultContent(result)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}