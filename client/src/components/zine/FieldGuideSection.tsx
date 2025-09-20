import { useState } from "react";
import { ExpandablePattern } from "./ExpandablePattern";

interface SectionEntry {
  pattern: string;
  description: string;
  signals: string[];
  protocol: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  color: string;
  entries: SectionEntry[];
}

interface FieldGuideSectionProps {
  section: Section;
  isExpanded: boolean;
  onToggle: () => void;
  issueSlug?: string;
}

export function FieldGuideSection({ section, isExpanded, onToggle, issueSlug }: FieldGuideSectionProps) {
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set());

  const togglePattern = (patternId: string) => {
    const newExpanded = new Set(expandedPatterns);
    if (newExpanded.has(patternId)) {
      newExpanded.delete(patternId);
    } else {
      newExpanded.add(patternId);
    }
    setExpandedPatterns(newExpanded);
  };

  const colorClasses = {
    cyan: "text-section-cyan bg-section-cyan/20",
    purple: "text-section-purple bg-section-purple/20", 
    green: "text-section-green bg-section-green/20",
    yellow: "text-section-yellow bg-section-yellow/20"
  };

  const iconColorClass = colorClasses[section.color as keyof typeof colorClasses] || colorClasses.cyan;

  return (
    <div id={`section-${section.id}`} className="space-y-6" data-testid={`section-${section.id}`}>
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 ${iconColorClass} rounded-lg flex items-center justify-center`}>
          {/* Icon placeholder - would use actual lucide icons based on section.icon */}
          <div className="w-5 h-5 bg-current opacity-70 rounded-full" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{section.title}</h2>
          <p className="text-muted-foreground">Essential patterns for system foundations</p>
        </div>
      </div>

      <div className="space-y-4">
        {section.entries.map((entry, index) => {
          const patternId = `${section.id}-${index}`;
          return (
            <ExpandablePattern
              key={patternId}
              entry={entry}
              color={section.color}
              isExpanded={expandedPatterns.has(patternId)}
              onToggle={() => togglePattern(patternId)}
              issueSlug={issueSlug}
              sectionId={section.id}
              data-testid={`pattern-${patternId}`}
            />
          );
        })}
      </div>
    </div>
  );
}
