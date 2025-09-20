import { db } from './db';
import { searchIndex, type InsertSearchIndex } from '@shared/schema';
import { sql, like, ilike, or, and } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

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

interface SearchQuery {
  query: string;
  issueSlug?: string;
  contentType?: string;
  limit?: number;
}

export class SearchService {
  // Initialize search index from JSON data
  async initializeSearchIndex(): Promise<void> {
    try {
      // Clear existing index
      await db.delete(searchIndex);
      
      // Read issues data
      const issuesData = await fs.readFile(
        path.join(process.cwd(), 'data/issues.json'),
        'utf-8'
      );
      const { issues } = JSON.parse(issuesData);

      const indexEntries: InsertSearchIndex[] = [];

      for (const issue of issues) {
        // Index issue metadata
        indexEntries.push({
          issueSlug: issue.slug,
          sectionId: 'meta',
          patternName: issue.meta.title,
          content: `${issue.meta.title} ${issue.meta.subtitle} ${issue.meta.tagline} ${issue.intro}`,
          contentType: 'issue',
          metadata: {
            title: issue.meta.title,
            subtitle: issue.meta.subtitle,
            version: issue.meta.version,
            tagline: issue.meta.tagline,
          },
        });

        // Index sections and patterns
        for (const section of issue.sections) {
          // Index section
          indexEntries.push({
            issueSlug: issue.slug,
            sectionId: section.id,
            patternName: section.title,
            content: section.title,
            contentType: 'section',
            metadata: {
              icon: section.icon,
              color: section.color,
              entryCount: section.entries.length,
            },
          });

          // Index patterns and their content
          for (const entry of section.entries) {
            // Index pattern
            indexEntries.push({
              issueSlug: issue.slug,
              sectionId: section.id,
              patternName: entry.pattern,
              content: entry.pattern,
              contentType: 'pattern',
              metadata: {
                sectionTitle: section.title,
                sectionColor: section.color,
              },
            });

            // Index description
            indexEntries.push({
              issueSlug: issue.slug,
              sectionId: section.id,
              patternName: entry.pattern,
              content: entry.description,
              contentType: 'description',
              metadata: {
                sectionTitle: section.title,
                sectionColor: section.color,
              },
            });

            // Index signals
            for (const signal of entry.signals) {
              indexEntries.push({
                issueSlug: issue.slug,
                sectionId: section.id,
                patternName: entry.pattern,
                content: signal,
                contentType: 'signal',
                metadata: {
                  sectionTitle: section.title,
                  sectionColor: section.color,
                },
              });
            }

            // Index protocol
            indexEntries.push({
              issueSlug: issue.slug,
              sectionId: section.id,
              patternName: entry.pattern,
              content: entry.protocol,
              contentType: 'protocol',
              metadata: {
                sectionTitle: section.title,
                sectionColor: section.color,
              },
            });
          }
        }
      }

      // Batch insert
      if (indexEntries.length > 0) {
        await db.insert(searchIndex).values(indexEntries);
      }

      console.log(`Indexed ${indexEntries.length} search entries`);
    } catch (error) {
      console.error('Failed to initialize search index:', error);
      throw error;
    }
  }

  // Search across indexed content
  async search({ query, issueSlug, contentType, limit = 20 }: SearchQuery): Promise<SearchResult[]> {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      
      if (searchTerms.length === 0) {
        return [];
      }

      // Build search conditions
      const searchConditions = searchTerms.map(term => 
        or(
          ilike(searchIndex.content, `%${term}%`),
          ilike(searchIndex.patternName, `%${term}%`)
        )
      );

      let whereCondition = or(...searchConditions);

      // Add filters
      if (issueSlug) {
        whereCondition = and(whereCondition, sql`${searchIndex.issueSlug} = ${issueSlug}`);
      }

      if (contentType) {
        whereCondition = and(whereCondition, sql`${searchIndex.contentType} = ${contentType}`);
      }

      const results = await db
        .select()
        .from(searchIndex)
        .where(whereCondition)
        .limit(limit);

      // Calculate relevance scores and sort
      const scoredResults: SearchResult[] = results.map(result => {
        let score = 0;
        const content = result.content.toLowerCase();
        const patternName = result.patternName.toLowerCase();
        
        // Exact matches get highest score
        if (patternName.includes(query.toLowerCase())) {
          score += 100;
        }
        
        // Pattern name matches are highly weighted
        searchTerms.forEach(term => {
          if (patternName.includes(term)) {
            score += 50;
          }
          if (content.includes(term)) {
            score += 10;
          }
        });

        // Content type weighting
        switch (result.contentType) {
          case 'pattern':
            score += 30;
            break;
          case 'issue':
            score += 20;
            break;
          case 'section':
            score += 15;
            break;
          case 'description':
            score += 10;
            break;
          default:
            score += 5;
        }

        return {
          ...result,
          relevanceScore: score,
        };
      });

      // Sort by relevance and remove duplicates
      return scoredResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .filter((result, index, array) => {
          // Remove duplicate patterns with lower scores
          return array.findIndex(r => 
            r.patternName === result.patternName && 
            r.issueSlug === result.issueSlug
          ) === index;
        });

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Get search suggestions
  async getSuggestions(query: string): Promise<string[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      const results = await db
        .select({ patternName: searchIndex.patternName })
        .from(searchIndex)
        .where(
          and(
            ilike(searchIndex.patternName, `%${query}%`),
            sql`${searchIndex.contentType} IN ('pattern', 'section')`
          )
        )
        .groupBy(searchIndex.patternName)
        .limit(10);

      return results.map(r => r.patternName);
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();