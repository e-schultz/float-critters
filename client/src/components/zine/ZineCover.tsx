import { Link } from "wouter";
import { Layers, Network, Database, Shield, TrendingUp } from "lucide-react";

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

interface ZineCoverProps {
  issue: Issue;
}

const issueGradients = [
  "bg-gradient-to-br from-primary to-purple-600",
  "bg-gradient-to-br from-cyan-500 to-blue-600", 
  "bg-gradient-to-br from-green-500 to-emerald-600",
  "bg-gradient-to-br from-purple-500 to-indigo-600",
  "bg-gradient-to-br from-yellow-500 to-orange-600"
];

const issueImages = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=1067",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=1067",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=1067",
  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=1067",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=1067"
];

const issueIcons = [Layers, Network, Database, Shield, TrendingUp];

export function ZineCover({ issue }: ZineCoverProps) {
  // Defensive check for undefined issue or meta
  if (!issue || !issue.meta) {
    return null;
  }

  const issueIndex = parseInt(issue.slug.split('-')[1]) - 1;
  const gradient = issueGradients[issueIndex] || issueGradients[0];
  const image = issueImages[issueIndex] || issueImages[0];
  const IconComponent = issueIcons[issueIndex] || issueIcons[0];

  const totalPatterns = issue.sections.reduce((sum, section) => sum + section.entries.length, 0);
  const issueNumber = issue.slug.replace('issue-', '#');

  return (
    <Link href={`/zine/${issue.slug}`}>
      <article className="group cursor-pointer" data-testid={`issue-card-${issue.slug}`}>
        <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
          {/* Cover Image */}
          <div className={`aspect-[3/4] ${gradient} relative overflow-hidden`}>
            <img 
              src={image}
              alt={`Cover for ${issue.meta.title}`}
              className="w-full h-full object-cover mix-blend-overlay opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-mono">
                {issueNumber}
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white text-xl font-bold mb-1">{issue.meta.title}</h3>
              <p className="text-white/80 text-sm">{issue.meta.subtitle}</p>
            </div>
          </div>
          
          {/* Card Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-mono">{issue.meta.version}</span>
              <span className="text-sm text-muted-foreground">Dec 2024</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 font-serif leading-relaxed">
              {issue.meta.tagline}
            </p>
            <div className="flex items-center text-sm text-muted-foreground" data-testid={`issue-stats-${issue.slug}`}>
              <IconComponent className="w-4 h-4 mr-2" />
              <span>{issue.sections.length} Sections • {totalPatterns} Patterns</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
