import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGuideSection } from "./FieldGuideSection";

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

interface IssueReaderProps {
  issue: Issue;
}

export function IssueReader({ issue }: IssueReaderProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const totalPatterns = issue.sections.reduce((sum, section) => sum + section.entries.length, 0);
  const readPatterns = Array.from(expandedSections).reduce((sum, sectionId) => {
    const section = issue.sections.find(s => s.id === sectionId);
    return sum + (section?.entries.length || 0);
  }, 0);

  const progress = totalPatterns > 0 ? (readPatterns / totalPatterns) * 100 : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Progress Bar */}
        <div className="w-full bg-secondary rounded-full h-1" data-testid="reading-progress">
          <div 
            className="bg-primary h-1 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        {/* Back Navigation */}
        <Link href="/">
          <Button variant="ghost" className="flex items-center text-muted-foreground hover:text-foreground" data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collection
          </Button>
        </Link>

        {/* Issue Cover */}
        <section className="text-center space-y-6 py-12" data-testid="issue-header">
          <div className="space-y-4">
            <div className="inline-flex items-center bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-mono">
              {issue.slug.replace('issue-', 'Issue #')} • {issue.meta.version}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              {issue.meta.title}
            </h1>
            <p className="text-xl text-muted-foreground font-serif max-w-2xl mx-auto leading-relaxed">
              {issue.meta.subtitle}
            </p>
            <div className="text-primary font-mono text-sm">
              {issue.meta.tagline}
            </div>
          </div>
        </section>

        {/* Introduction */}
        <section className="max-w-3xl mx-auto space-y-6" data-testid="issue-intro">
          <h2 className="text-2xl font-bold border-b border-border pb-2">Introduction</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed font-serif">
              {issue.intro}
            </p>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="max-w-3xl mx-auto space-y-6" data-testid="table-of-contents">
          <h2 className="text-2xl font-bold border-b border-border pb-2">Table of Contents</h2>
          <div className="grid gap-4">
            {issue.sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  const element = document.getElementById(`section-${section.id}`);
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors text-left w-full"
                data-testid={`toc-${section.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 bg-${section.color}-500/20 rounded-lg flex items-center justify-center`}>
                    <div className={`w-4 h-4 text-${section.color}-500`}>
                      {/* Icon placeholder - would use actual lucide icons based on section.icon */}
                      <div className="w-full h-full bg-current opacity-70 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">Essential patterns for system foundations</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {section.entries.length} patterns
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Sections with Expandable Patterns */}
        <section className="max-w-3xl mx-auto space-y-8" data-testid="issue-sections">
          {issue.sections.map((section) => (
            <FieldGuideSection
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              issueSlug={issue.slug}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
