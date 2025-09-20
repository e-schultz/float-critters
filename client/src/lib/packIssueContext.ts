interface PackedIssueContext {
  slug: string;
  meta: {
    title: string;
    subtitle: string;
    version: string;
    tagline: string;
  };
  toc: Array<{
    id: string;
    title: string;
  }>;
  entries: Array<{
    pattern: string;
    signals: string[];
    protocol: string;
  }>;
  charCount: number;
}

const MAX_CONTEXT_CHARS = 12000;

export async function packIssueContext(issueSlug: string): Promise<PackedIssueContext> {
  try {
    // Fetch issues data
    const response = await fetch('/data/issues.json');
    if (!response.ok) {
      throw new Error('Failed to fetch issues data');
    }
    
    const data = await response.json();
    const issue = data.issues.find((i: any) => i.slug === issueSlug);
    
    if (!issue) {
      throw new Error(`Issue not found: ${issueSlug}`);
    }

    // Build table of contents
    const toc = issue.sections.map((section: any) => ({
      id: section.id,
      title: section.title
    }));

    // Collect all entries with deterministic ordering
    const allEntries = issue.sections
      .sort((a: any, b: any) => a.title.localeCompare(b.title))
      .flatMap((section: any) => 
        section.entries
          .sort((a: any, b: any) => a.pattern.localeCompare(b.pattern))
          .map((entry: any) => ({
            pattern: entry.pattern,
            signals: entry.signals.slice(0, 3), // Up to 3 signals
            protocol: entry.protocol.length > 280 
              ? entry.protocol.substring(0, 280) + '...' 
              : entry.protocol
          }))
      );

    // Calculate initial size
    let context: PackedIssueContext = {
      slug: issue.slug,
      meta: issue.meta,
      toc,
      entries: allEntries,
      charCount: 0
    };

    // Calculate character count
    const calculateCharCount = (ctx: PackedIssueContext): number => {
      const metaChars = JSON.stringify(ctx.meta).length;
      const tocChars = JSON.stringify(ctx.toc).length;
      const entriesChars = JSON.stringify(ctx.entries).length;
      return metaChars + tocChars + entriesChars + ctx.slug.length;
    };

    context.charCount = calculateCharCount(context);

    // If over budget, degrade gracefully
    if (context.charCount > MAX_CONTEXT_CHARS) {
      // Start by reducing entries deterministically
      let reducedEntries = [...allEntries];
      
      while (context.charCount > MAX_CONTEXT_CHARS && reducedEntries.length > 0) {
        reducedEntries.pop(); // Remove last entry (deterministic order)
        context = {
          ...context,
          entries: reducedEntries,
          charCount: calculateCharCount({
            ...context,
            entries: reducedEntries
          })
        };
      }

      // If still over budget, keep only meta + TOC
      if (context.charCount > MAX_CONTEXT_CHARS) {
        context = {
          slug: issue.slug,
          meta: issue.meta,
          toc,
          entries: [],
          charCount: calculateCharCount({
            slug: issue.slug,
            meta: issue.meta,
            toc,
            entries: [],
            charCount: 0
          })
        };
      }
    }

    console.log(`Packed context for ${issueSlug}: ${context.entries.length} entries, ${context.charCount} chars`);
    return context;

  } catch (error) {
    console.error('Error packing issue context:', error);
    
    // Return minimal fallback context
    return {
      slug: issueSlug,
      meta: {
        title: 'Field Guide Issue',
        subtitle: 'System Design Patterns',
        version: 'v1.0',
        tagline: 'Fallback Context'
      },
      toc: [],
      entries: [],
      charCount: 0
    };
  }
}

export function buildSystemPrompt(issueContext: PackedIssueContext): string {
  return `You are a Field Guide assistant specializing in system design patterns and protocols. You have access to the following issue context:

**Issue: ${issueContext.meta.title}**
Subtitle: ${issueContext.meta.subtitle}
Version: ${issueContext.meta.version}
Tagline: ${issueContext.meta.tagline}

**Available Sections:**
${issueContext.toc.map(section => `- ${section.title} (${section.id})`).join('\n')}

**Pattern Details:**
${issueContext.entries.map(entry => `
Pattern: ${entry.pattern}
Signals: ${entry.signals.join(', ')}
Protocol: ${entry.protocol}
`).join('\n---\n')}

When responding:
1. Ground your answers in the provided patterns and protocols
2. Reference specific pattern names when relevant
3. Explain connections between different concepts
4. Keep responses concise and practical
5. Use the tagline "${issueContext.meta.tagline}" as a guiding principle

If asked about patterns not in this context, politely redirect to the available content while being helpful about general principles.`;
}
