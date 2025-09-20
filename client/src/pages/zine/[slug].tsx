import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { IssueReader } from "@/components/zine/IssueReader";

interface Issue {
  slug: string;
  meta: {
    title: string;
    subtitle: string;
    version: string;
    tagline: string;
  };
  intro: string;
  sections: Array<{
    id: string;
    title: string;
    icon: string;
    color: string;
    entries: Array<{
      pattern: string;
      description: string;
      signals: string[];
      protocol: string;
    }>;
  }>;
}

interface IssuesData {
  issues: Issue[];
}

export default function IssuePage() {
  const [match, params] = useRoute("/zine/:slug");
  const slug = params?.slug;

  const { data: issuesData, isLoading, error } = useQuery<IssuesData>({
    queryKey: ["/data/issues.json"],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="h-2 bg-secondary rounded-full">
              <div className="bg-primary h-2 rounded-full w-1/3 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
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
            <h1 className="text-2xl font-bold text-destructive">Error Loading Issue</h1>
            <p className="text-muted-foreground">
              Failed to load the issue data. Please try again later.
            </p>
          </div>
        </div>
      </LayoutShell>
    );
  }

  const issue = issuesData?.issues.find((i) => i.slug === slug);

  if (!issue) {
    return (
      <LayoutShell>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Issue Not Found</h1>
            <p className="text-muted-foreground">
              The requested issue could not be found.
            </p>
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell
      breadcrumb={[
        { label: "Collection", href: "/" },
        { label: issue.meta.title, href: `/zine/${issue.slug}` }
      ]}
    >
      <IssueReader issue={issue} />
    </LayoutShell>
  );
}
