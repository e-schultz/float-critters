import { ChevronDown, Radio, PlayCircle } from "lucide-react";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";

interface PatternEntry {
  pattern: string;
  description: string;
  signals: string[];
  protocol: string;
}

interface ExpandablePatternProps {
  entry: PatternEntry;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  issueSlug?: string;
  sectionId?: string;
}

export function ExpandablePattern({ entry, color, isExpanded, onToggle, issueSlug, sectionId }: ExpandablePatternProps) {
  const colorClasses = {
    cyan: "bg-section-cyan/20 text-section-cyan",
    purple: "bg-section-purple/20 text-section-purple", 
    green: "bg-section-green/20 text-section-green",
    yellow: "bg-section-yellow/20 text-section-yellow"
  };

  const signalColorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.cyan;

  // Split protocol string into steps
  const protocolSteps = entry.protocol.split(/\d+\./).filter(step => step.trim()).map(step => step.trim());

  return (
    <div className="border border-border rounded-lg overflow-hidden" data-testid={`pattern-${entry.pattern.toLowerCase().replace(/\s+/g, '-')}`}>
      <button 
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-accent transition-colors flex items-center justify-between"
        aria-expanded={isExpanded}
        data-testid={`pattern-toggle-${entry.pattern.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex-1">
          <h3 className="font-semibold">{entry.pattern}</h3>
          <p className="text-sm text-muted-foreground">{entry.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          {issueSlug && sectionId && (
            <BookmarkButton
              issueSlug={issueSlug}
              sectionId={sectionId}
              patternName={entry.pattern}
              bookmarkType="pattern"
              className="w-8 h-8"
            />
          )}
          <ChevronDown 
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border" data-testid={`pattern-content-${entry.pattern.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="p-4 space-y-4">
            <p className="font-serif leading-relaxed">
              {entry.description}
            </p>
            
            {/* Signals */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center" data-testid="pattern-signals">
                <Radio className="w-4 h-4 mr-2" />
                Signals
              </h4>
              <div className="flex flex-wrap gap-2">
                {entry.signals.map((signal, index) => (
                  <span 
                    key={index}
                    className={`${signalColorClass} px-2 py-1 rounded text-sm`}
                    data-testid={`signal-${index}`}
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>

            {/* Protocol */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center" data-testid="pattern-protocol">
                <PlayCircle className="w-4 h-4 mr-2" />
                Protocol
              </h4>
              <div className="bg-secondary p-3 rounded font-mono text-sm">
                {protocolSteps.map((step, index) => (
                  <div key={index} className="mb-1 last:mb-0">
                    {index + 1}. {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
