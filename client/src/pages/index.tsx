import { useQuery } from "@tanstack/react-query";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { ZineCover } from "@/components/zine/ZineCover";
import { BookOpen, Calendar } from "lucide-react";

interface Issue {
  slug: string;
  meta: {
    title: string;
    subtitle: string;
    version: string;
    tagline: string;
  };
  sections: Array<{
    id: string;
    title: string;
    entries: any[];
  }>;
}

interface IssuesData {
  issues: Issue[];
}

export default function IndexPage() {
  const { data: issuesData, isLoading, error } = useQuery<IssuesData>({
    queryKey: ["/data/issues.json"],
  });

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-6 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="aspect-[3/4] bg-muted animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Error Loading Issues</h1>
            <p className="text-muted-foreground">
              Failed to load the issues data. Please try again later.
            </p>
          </div>
        </div>
      </LayoutShell>
    );
  }

  const issues = issuesData?.issues || [];
  const totalPatterns = issues.reduce(
    (sum, issue) => sum + issue.sections.reduce((sectionSum, section) => sectionSum + section.entries.length, 0),
    0
  );

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Collection", href: "/" },
        { label: "Issues", href: "/" }
      ]}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Field Guide Zine
            </h1>
            <p className="text-xl text-muted-foreground font-serif leading-relaxed">
              A curated collection of patterns, protocols, and insights for building resilient systems in an uncertain world.
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center" data-testid="issue-count">
                <BookOpen className="w-4 h-4 mr-2" />
                {issues.length} Issues
              </span>
              <span className="flex items-center" data-testid="pattern-count">
                <Calendar className="w-4 h-4 mr-2" />
                {totalPatterns} Patterns
              </span>
            </div>
          </div>

          {/* Issues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {issues.map((issue) => (
              <ZineCover key={issue.slug} issue={issue} />
            ))}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
