import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminContent() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  
  const { data: issuesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/issues'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch('/api/admin/issues', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch issues');
      return response.json();
    }
  });

  const handleDeleteIssue = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/issues/${slug}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete issue');
      }

      toast({
        title: "Issue Deleted",
        description: `Successfully deleted "${title}"`,
      });

      // Refresh the issues list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/issues'] });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete the issue.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <LayoutShell breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Content", href: "/admin/content" }]}>
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-8 bg-muted rounded w-48 animate-pulse" />
              <div className="h-8 bg-muted rounded w-32 animate-pulse" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </AdminLayout>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Content", href: "/admin/content" }]}>
        <AdminLayout>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load content. Please check your authentication and try again.
            </AlertDescription>
          </Alert>
        </AdminLayout>
      </LayoutShell>
    );
  }

  const issues = issuesData?.issues || [];
  const filteredIssues = issues.filter((issue: any) => {
    const matchesSearch = !searchQuery || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === "all" || 
      (filter === "published" && issue.publishedAt) ||
      (filter === "draft" && !issue.publishedAt);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Admin", href: "/admin" },
        { label: "Content Management", href: "/admin/content" }
      ]}
    >
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
              <p className="text-muted-foreground">
                Manage your Field Guide Zine issues and content.
              </p>
            </div>
            <Button data-testid="button-create-issue">
              <Plus className="w-4 h-4 mr-2" />
              New Issue
            </Button>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search issues by title, subtitle, or tagline..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-issues"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-testid="dropdown-filter">
                      <Filter className="w-4 h-4 mr-2" />
                      {filter === "all" ? "All Issues" : 
                       filter === "published" ? "Published" : "Drafts"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilter("all")}>
                      All Issues
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("published")}>
                      Published
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter("draft")}>
                      Drafts
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Issues Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Issues ({filteredIssues.length})
              </CardTitle>
              <CardDescription>
                All your Field Guide Zine issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredIssues.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    {issues.length === 0 ? "No issues created yet" : "No issues match your search"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {issues.length === 0 ? 
                      "Start by importing content or creating a new issue." :
                      "Try adjusting your search terms or filters."
                    }
                  </p>
                  {issues.length === 0 && (
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Issue
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Sections</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue: any) => (
                        <TableRow key={issue.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{issue.title}</div>
                              {issue.subtitle && (
                                <div className="text-sm text-muted-foreground">
                                  {issue.subtitle}
                                </div>
                              )}
                              {issue.tagline && (
                                <div className="text-xs text-muted-foreground italic">
                                  "{issue.tagline}"
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{issue.version}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={issue.publishedAt ? "default" : "secondary"}>
                              {issue.publishedAt ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {issue.publishedAt ? (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(issue.publishedAt).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {issue.sections?.length || 0} sections
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`menu-issue-${issue.slug}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteIssue(issue.slug, issue.title)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}