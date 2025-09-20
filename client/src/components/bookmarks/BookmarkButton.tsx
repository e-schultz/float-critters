import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface BookmarkButtonProps {
  issueSlug: string;
  sectionId?: string;
  patternName?: string;
  bookmarkType: 'issue' | 'section' | 'pattern';
  className?: string;
}

export function BookmarkButton({ 
  issueSlug, 
  sectionId, 
  patternName, 
  bookmarkType,
  className 
}: BookmarkButtonProps) {
  const { toast } = useToast();

  // Check if item is bookmarked
  const { data: isBookmarked, isLoading } = useQuery({
    queryKey: ['/api/bookmarks/check', issueSlug, sectionId, patternName, bookmarkType],
    queryFn: async () => {
      const params = new URLSearchParams({
        issueSlug,
        bookmarkType,
        ...(sectionId && { sectionId }),
        ...(patternName && { patternName })
      });
      
      const response = await fetch(`/api/bookmarks/check?${params}`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.isBookmarked;
    },
  });

  // Add bookmark mutation
  const addBookmarkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueSlug,
          sectionId,
          patternName,
          bookmarkType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add bookmark');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/bookmarks/check', issueSlug, sectionId, patternName, bookmarkType] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      
      toast({
        title: "Bookmark added",
        description: `${bookmarkType} has been saved to your bookmarks`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to bookmark",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove bookmark mutation
  const removeBookmarkMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        issueSlug,
        bookmarkType,
        ...(sectionId && { sectionId }),
        ...(patternName && { patternName })
      });

      const response = await fetch(`/api/bookmarks?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove bookmark');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/bookmarks/check', issueSlug, sectionId, patternName, bookmarkType] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      
      toast({
        title: "Bookmark removed",
        description: `${bookmarkType} has been removed from your bookmarks`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove bookmark",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBookmarkToggle = () => {
    if (isBookmarked) {
      removeBookmarkMutation.mutate();
    } else {
      addBookmarkMutation.mutate();
    }
  };

  const isPending = addBookmarkMutation.isPending || removeBookmarkMutation.isPending;

  return (
    <Button
      variant={isBookmarked ? "default" : "ghost"}
      size="icon"
      onClick={handleBookmarkToggle}
      disabled={isLoading || isPending}
      className={className}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      data-testid={`bookmark-${bookmarkType}-${issueSlug}${sectionId ? `-${sectionId}` : ''}${patternName ? `-${patternName.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
    >
      {isBookmarked ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
    </Button>
  );
}