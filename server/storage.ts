import { 
  type User, 
  type InsertUser,
  type AdminSession,
  type InsertAdminSession,
  type Issue,
  type InsertIssue,
  type ContentImport,
  type InsertContentImport,
  type Workspace,
  type InsertWorkspace,
  type Draft,
  type InsertDraft,
  type Revision,
  type InsertRevision,
  type Message,
  type InsertMessage,
  type Suggestion,
  type InsertSuggestion,
  type Activity,
  type InsertActivity,
  users,
  adminSessions,
  issues,
  contentImports,
  workspaces,
  drafts,
  revisions,
  messages,
  suggestions,
  activities
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, lt } from "drizzle-orm";

// Content conversion utilities
interface DraftSection {
  id: string;
  title: string;
  content: string;
  level: number;
  children?: DraftSection[];
}

interface IssueSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  entries: {
    pattern: string;
    description: string;
    signals: string[];
    protocol: string;
  }[];
}

function convertDraftToIssueFormat(draftSections: DraftSection[]): IssueSection[] {
  const issuesSections: IssueSection[] = [];
  
  const iconOptions = ['circle', 'square', 'triangle', 'shield', 'zap', 'battery', 'trending-up'];
  const colorOptions = ['cyan', 'purple', 'green', 'yellow'];
  
  const processSections = (sections: DraftSection[], parentIndex = 0) => {
    sections.forEach((section, index) => {
      // Convert each top-level section to an Issue section
      if (section.level === 1) {
        const issueSection: IssueSection = {
          id: section.id,
          title: section.title,
          icon: iconOptions[parentIndex % iconOptions.length],
          color: colorOptions[parentIndex % colorOptions.length],
          entries: []
        };
        
        // Convert section content and children to entries
        if (section.content.trim()) {
          const entry = {
            pattern: section.title,
            description: section.content,
            signals: extractSignals(section.content),
            protocol: extractProtocol(section.content)
          };
          issueSection.entries.push(entry);
        }
        
        // Process children as additional entries
        if (section.children) {
          section.children.forEach(child => {
            const childEntry = {
              pattern: child.title,
              description: child.content || 'No description provided',
              signals: extractSignals(child.content),
              protocol: extractProtocol(child.content)
            };
            issueSection.entries.push(childEntry);
          });
        }
        
        issuesSections.push(issueSection);
        parentIndex++;
      }
    });
  };
  
  processSections(draftSections);
  return issuesSections;
}

function extractSignals(content: string): string[] {
  // Simple heuristic to extract signals from content
  const signalKeywords = ['when', 'if', 'warning', 'alert', 'issue', 'problem', 'symptom'];
  const sentences = content.split('.').map(s => s.trim()).filter(s => s.length > 0);
  
  const signals = sentences.filter(sentence => 
    signalKeywords.some(keyword => 
      sentence.toLowerCase().includes(keyword)
    )
  ).slice(0, 3); // Limit to 3 signals
  
  return signals.length > 0 ? signals : ['Implementation needed', 'System complexity', 'Performance considerations'];
}

function extractProtocol(content: string): string {
  // Simple heuristic to extract protocol from content
  const protocolKeywords = ['step', 'first', 'then', 'finally', 'process', 'method', 'approach'];
  const sentences = content.split('.').map(s => s.trim()).filter(s => s.length > 0);
  
  const protocolSentences = sentences.filter(sentence =>
    protocolKeywords.some(keyword =>
      sentence.toLowerCase().includes(keyword)
    )
  );
  
  if (protocolSentences.length > 0) {
    return protocolSentences.join(' → ');
  }
  
  // Fallback protocol
  return '1. Analyze requirements 2. Design solution 3. Implement changes 4. Test and validate';
}

function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50);
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAdminStatus(id: string, isAdmin: boolean): Promise<User | undefined>;

  // Admin session methods
  createAdminSession(session: InsertAdminSession): Promise<AdminSession>;
  getAdminSession(token: string): Promise<AdminSession | undefined>;
  deleteAdminSession(token: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<number>;

  // Issues methods
  getIssues(): Promise<Issue[]>;
  getIssue(slug: string): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(slug: string, issue: Partial<InsertIssue>): Promise<Issue | undefined>;
  deleteIssue(slug: string): Promise<boolean>;

  // Content import methods
  createContentImport(contentImport: InsertContentImport): Promise<ContentImport>;
  getContentImports(userId?: string): Promise<ContentImport[]>;
  getContentImport(id: string): Promise<ContentImport | undefined>;
  updateContentImport(id: string, updates: Partial<InsertContentImport>): Promise<ContentImport | undefined>;

  // Workspace methods
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  getWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | undefined>;
  updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<Workspace | undefined>;
  deleteWorkspace(id: string): Promise<boolean>;

  // Draft methods
  createDraft(draft: InsertDraft): Promise<Draft>;
  getDraft(workspaceId: string): Promise<Draft | undefined>;
  updateDraft(workspaceId: string, updates: Partial<InsertDraft>): Promise<Draft | undefined>;

  // Revision methods
  createRevision(revision: InsertRevision): Promise<Revision>;
  getRevisions(workspaceId: string): Promise<Revision[]>;

  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(workspaceId: string): Promise<Message[]>;

  // Suggestion methods
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  getSuggestions(workspaceId: string): Promise<Suggestion[]>;
  updateSuggestion(id: string, updates: Partial<InsertSuggestion>): Promise<Suggestion | undefined>;

  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivities(workspaceId: string): Promise<Activity[]>;

  // Publishing methods
  publishWorkspace(workspaceId: string, publishData: { slug: string, version: string, publishedAt?: Date }): Promise<{ issue: Issue, workspace: Workspace }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private adminSessions: Map<string, AdminSession>;
  private issues: Map<string, Issue>;
  private contentImports: Map<string, ContentImport>;
  private workspaces: Map<string, Workspace>;
  private drafts: Map<string, Draft>;
  private revisions: Map<string, Revision>;
  private messages: Map<string, Message>;
  private suggestions: Map<string, Suggestion>;
  private activities: Map<string, Activity>;

  constructor() {
    this.users = new Map();
    this.adminSessions = new Map();
    this.issues = new Map();
    this.contentImports = new Map();
    this.workspaces = new Map();
    this.drafts = new Map();
    this.revisions = new Map();
    this.messages = new Map();
    this.suggestions = new Map();
    this.activities = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      isAdmin: insertUser.isAdmin || false, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserAdminStatus(id: string, isAdmin: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, isAdmin };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Admin session methods
  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    const id = randomUUID();
    const adminSession: AdminSession = { 
      ...session, 
      id, 
      createdAt: new Date() 
    };
    this.adminSessions.set(session.token, adminSession);
    return adminSession;
  }

  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const session = this.adminSessions.get(token);
    if (!session) return undefined;
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.adminSessions.delete(token);
      return undefined;
    }
    
    return session;
  }

  async deleteAdminSession(token: string): Promise<boolean> {
    return this.adminSessions.delete(token);
  }

  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [token, session] of Array.from(this.adminSessions.entries())) {
      if (session.expiresAt < now) {
        this.adminSessions.delete(token);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  // Issues methods
  async getIssues(): Promise<Issue[]> {
    return Array.from(this.issues.values())
      .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
  }

  async getIssue(slug: string): Promise<Issue | undefined> {
    return this.issues.get(slug);
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const id = randomUUID();
    const newIssue: Issue = { 
      ...issue, 
      id, 
      subtitle: issue.subtitle || null,
      tagline: issue.tagline || null,
      intro: issue.intro || null,
      metadata: issue.metadata || null,
      publishedAt: issue.publishedAt || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.issues.set(issue.slug, newIssue);
    return newIssue;
  }

  async updateIssue(slug: string, updates: Partial<InsertIssue>): Promise<Issue | undefined> {
    const issue = this.issues.get(slug);
    if (!issue) return undefined;
    
    const updatedIssue: Issue = { 
      ...issue, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.issues.set(slug, updatedIssue);
    return updatedIssue;
  }

  async deleteIssue(slug: string): Promise<boolean> {
    return this.issues.delete(slug);
  }

  // Content import methods
  async createContentImport(contentImport: InsertContentImport): Promise<ContentImport> {
    const id = randomUUID();
    const newImport: ContentImport = { 
      ...contentImport, 
      id, 
      status: contentImport.status || 'pending',
      metadata: contentImport.metadata || null,
      transformedContent: contentImport.transformedContent || null,
      issueSlug: contentImport.issueSlug || null,
      createdAt: new Date() 
    };
    this.contentImports.set(id, newImport);
    return newImport;
  }

  async getContentImports(userId?: string): Promise<ContentImport[]> {
    const imports = Array.from(this.contentImports.values());
    if (userId) {
      return imports.filter(imp => imp.userId === userId);
    }
    return imports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getContentImport(id: string): Promise<ContentImport | undefined> {
    return this.contentImports.get(id);
  }

  async updateContentImport(id: string, updates: Partial<InsertContentImport>): Promise<ContentImport | undefined> {
    const contentImport = this.contentImports.get(id);
    if (!contentImport) return undefined;
    
    const updatedImport: ContentImport = { 
      ...contentImport, 
      ...updates 
    };
    this.contentImports.set(id, updatedImport);
    return updatedImport;
  }

  // Workspace methods
  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const id = randomUUID();
    const workspace: Workspace = {
      ...insertWorkspace,
      id,
      status: insertWorkspace.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workspaces.set(id, workspace);
    return workspace;
  }

  async getWorkspaces(userId: string): Promise<Workspace[]> {
    return Array.from(this.workspaces.values())
      .filter(workspace => workspace.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    return this.workspaces.get(id);
  }

  async updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<Workspace | undefined> {
    const workspace = this.workspaces.get(id);
    if (!workspace) return undefined;

    const updatedWorkspace: Workspace = {
      ...workspace,
      ...updates,
      updatedAt: new Date()
    };
    this.workspaces.set(id, updatedWorkspace);
    return updatedWorkspace;
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    return this.workspaces.delete(id);
  }

  // Draft methods
  async createDraft(insertDraft: InsertDraft): Promise<Draft> {
    const id = randomUUID();
    const draft: Draft = {
      ...insertDraft,
      id,
      currentRevision: insertDraft.currentRevision || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.drafts.set(id, draft);
    return draft;
  }

  async getDraft(workspaceId: string): Promise<Draft | undefined> {
    return Array.from(this.drafts.values()).find(draft => draft.workspaceId === workspaceId);
  }

  async updateDraft(workspaceId: string, updates: Partial<InsertDraft>): Promise<Draft | undefined> {
    const draft = Array.from(this.drafts.values()).find(d => d.workspaceId === workspaceId);
    if (!draft) return undefined;

    const updatedDraft: Draft = {
      ...draft,
      ...updates,
      updatedAt: new Date()
    };
    this.drafts.set(draft.id, updatedDraft);
    return updatedDraft;
  }

  // Revision methods
  async createRevision(insertRevision: InsertRevision): Promise<Revision> {
    const id = randomUUID();
    const revision: Revision = {
      ...insertRevision,
      id,
      createdAt: new Date()
    };
    this.revisions.set(id, revision);
    return revision;
  }

  async getRevisions(workspaceId: string): Promise<Revision[]> {
    return Array.from(this.revisions.values())
      .filter(revision => revision.workspaceId === workspaceId)
      .sort((a, b) => b.number - a.number);
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      sectionPath: insertMessage.sectionPath || null,
      metadata: insertMessage.metadata || null,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(workspaceId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.workspaceId === workspaceId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Suggestion methods
  async createSuggestion(insertSuggestion: InsertSuggestion): Promise<Suggestion> {
    const id = randomUUID();
    const suggestion: Suggestion = {
      ...insertSuggestion,
      id,
      sectionPath: insertSuggestion.sectionPath || null,
      status: insertSuggestion.status || 'proposed',
      createdAt: new Date()
    };
    this.suggestions.set(id, suggestion);
    return suggestion;
  }

  async getSuggestions(workspaceId: string): Promise<Suggestion[]> {
    return Array.from(this.suggestions.values())
      .filter(suggestion => suggestion.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateSuggestion(id: string, updates: Partial<InsertSuggestion>): Promise<Suggestion | undefined> {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return undefined;

    const updatedSuggestion: Suggestion = {
      ...suggestion,
      ...updates
    };
    this.suggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = {
      ...insertActivity,
      id,
      createdAt: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  async getActivities(workspaceId: string): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Publishing methods
  async publishWorkspace(workspaceId: string, publishData: { slug: string, version: string, publishedAt?: Date }): Promise<{ issue: Issue, workspace: Workspace }> {
    // Get workspace
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get draft
    const draft = this.drafts.get(workspaceId);
    if (!draft || !draft.outline?.sections) {
      throw new Error('No draft content found for workspace');
    }

    // Check if slug already exists
    const existingIssue = this.issues.get(publishData.slug);
    if (existingIssue) {
      throw new Error(`An issue with slug "${publishData.slug}" already exists`);
    }

    // Convert draft sections to issue format
    const convertedSections = convertDraftToIssueFormat(draft.outline.sections);
    
    // Create the issue
    const issueData: InsertIssue = {
      slug: publishData.slug,
      title: draft.title || workspace.title,
      subtitle: `Published from workspace: ${workspace.title}`,
      version: publishData.version,
      tagline: workspace.goal || 'Collaborative workspace content',
      intro: `This content was collaboratively created in workspace "${workspace.title}" and represents the collective insights and patterns discovered during the ideation process.`,
      sections: convertedSections,
      metadata: {
        sourceWorkspaceId: workspaceId,
        publishedBy: workspace.userId,
        originalGoal: workspace.goal
      },
      publishedAt: publishData.publishedAt || new Date()
    };

    const issue = await this.createIssue(issueData);

    // Update workspace status
    const updatedWorkspace = await this.updateWorkspace(workspaceId, { 
      status: 'completed' 
    });

    if (!updatedWorkspace) {
      throw new Error('Failed to update workspace status');
    }

    // Create activity record
    await this.createActivity({
      workspaceId,
      userId: workspace.userId,
      type: 'publish',
      description: `Published draft as Issue "${issue.title}" (${issue.slug})`,
      metadata: {
        issueSlug: issue.slug,
        publishedAt: issue.publishedAt
      }
    });

    return { issue, workspace: updatedWorkspace };
  }
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      isAdmin: insertUser.isAdmin || false
    }).returning();
    return result[0];
  }

  async updateUserAdminStatus(id: string, isAdmin: boolean): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Admin session methods
  async createAdminSession(session: InsertAdminSession): Promise<AdminSession> {
    const result = await db.insert(adminSessions).values(session).returning();
    return result[0];
  }

  async getAdminSession(token: string): Promise<AdminSession | undefined> {
    const now = new Date();
    const result = await db.select()
      .from(adminSessions)
      .where(eq(adminSessions.token, token))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    // Check if session is expired
    if (result[0].expiresAt < now) {
      await this.deleteAdminSession(token);
      return undefined;
    }
    
    return result[0];
  }

  async deleteAdminSession(token: string): Promise<boolean> {
    const result = await db.delete(adminSessions)
      .where(eq(adminSessions.token, token))
      .returning();
    return result.length > 0;
  }

  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db.delete(adminSessions)
      .where(lt(adminSessions.expiresAt, now))
      .returning();
    return result.length;
  }

  // Issues methods
  async getIssues(): Promise<Issue[]> {
    const result = await db.select()
      .from(issues)
      .orderBy(desc(issues.publishedAt));
    return result;
  }

  async getIssue(slug: string): Promise<Issue | undefined> {
    const result = await db.select()
      .from(issues)
      .where(eq(issues.slug, slug))
      .limit(1);
    return result[0];
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const result = await db.insert(issues).values({
      ...issue,
      subtitle: issue.subtitle || null,
      tagline: issue.tagline || null,
      intro: issue.intro || null,
      metadata: issue.metadata || null,
      publishedAt: issue.publishedAt || null
    }).returning();
    return result[0];
  }

  async updateIssue(slug: string, updates: Partial<InsertIssue>): Promise<Issue | undefined> {
    const result = await db.update(issues)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(issues.slug, slug))
      .returning();
    return result[0];
  }

  async deleteIssue(slug: string): Promise<boolean> {
    const result = await db.delete(issues)
      .where(eq(issues.slug, slug))
      .returning();
    return result.length > 0;
  }

  // Content import methods
  async createContentImport(contentImport: InsertContentImport): Promise<ContentImport> {
    const result = await db.insert(contentImports).values({
      ...contentImport,
      status: contentImport.status || 'pending',
      metadata: contentImport.metadata || null,
      transformedContent: contentImport.transformedContent || null,
      issueSlug: contentImport.issueSlug || null
    }).returning();
    return result[0];
  }

  async getContentImports(userId?: string): Promise<ContentImport[]> {
    if (userId) {
      const result = await db.select()
        .from(contentImports)
        .where(eq(contentImports.userId, userId))
        .orderBy(desc(contentImports.createdAt));
      return result;
    }
    
    const result = await db.select()
      .from(contentImports)
      .orderBy(desc(contentImports.createdAt));
    return result;
  }

  async getContentImport(id: string): Promise<ContentImport | undefined> {
    const result = await db.select()
      .from(contentImports)
      .where(eq(contentImports.id, id))
      .limit(1);
    return result[0];
  }

  async updateContentImport(id: string, updates: Partial<InsertContentImport>): Promise<ContentImport | undefined> {
    const result = await db.update(contentImports)
      .set(updates)
      .where(eq(contentImports.id, id))
      .returning();
    return result[0];
  }

  // Workspace methods
  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const result = await db.insert(workspaces).values({
      ...insertWorkspace,
      status: insertWorkspace.status || 'active'
    }).returning();
    return result[0];
  }

  async getWorkspaces(userId: string): Promise<Workspace[]> {
    const result = await db.select()
      .from(workspaces)
      .where(eq(workspaces.userId, userId))
      .orderBy(desc(workspaces.updatedAt));
    return result;
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const result = await db.select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);
    return result[0];
  }

  async updateWorkspace(id: string, updates: Partial<InsertWorkspace>): Promise<Workspace | undefined> {
    const result = await db.update(workspaces)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(workspaces.id, id))
      .returning();
    return result[0];
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    const result = await db.delete(workspaces)
      .where(eq(workspaces.id, id))
      .returning();
    return result.length > 0;
  }

  // Draft methods
  async createDraft(insertDraft: InsertDraft): Promise<Draft> {
    const result = await db.insert(drafts).values({
      ...insertDraft,
      currentRevision: insertDraft.currentRevision || 1
    }).returning();
    return result[0];
  }

  async getDraft(workspaceId: string): Promise<Draft | undefined> {
    const result = await db.select()
      .from(drafts)
      .where(eq(drafts.workspaceId, workspaceId))
      .limit(1);
    return result[0];
  }

  async updateDraft(workspaceId: string, updates: Partial<InsertDraft>): Promise<Draft | undefined> {
    const result = await db.update(drafts)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(drafts.workspaceId, workspaceId))
      .returning();
    return result[0];
  }

  // Revision methods
  async createRevision(insertRevision: InsertRevision): Promise<Revision> {
    const result = await db.insert(revisions).values(insertRevision).returning();
    return result[0];
  }

  async getRevisions(workspaceId: string): Promise<Revision[]> {
    const result = await db.select()
      .from(revisions)
      .where(eq(revisions.workspaceId, workspaceId))
      .orderBy(desc(revisions.number));
    return result;
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values({
      ...insertMessage,
      sectionPath: insertMessage.sectionPath || null,
      metadata: insertMessage.metadata || null
    }).returning();
    return result[0];
  }

  async getMessages(workspaceId: string): Promise<Message[]> {
    const result = await db.select()
      .from(messages)
      .where(eq(messages.workspaceId, workspaceId))
      .orderBy(messages.createdAt);
    return result;
  }

  // Suggestion methods
  async createSuggestion(insertSuggestion: InsertSuggestion): Promise<Suggestion> {
    const result = await db.insert(suggestions).values({
      ...insertSuggestion,
      sectionPath: insertSuggestion.sectionPath || null,
      status: insertSuggestion.status || 'proposed'
    }).returning();
    return result[0];
  }

  async getSuggestions(workspaceId: string): Promise<Suggestion[]> {
    const result = await db.select()
      .from(suggestions)
      .where(eq(suggestions.workspaceId, workspaceId))
      .orderBy(desc(suggestions.createdAt));
    return result;
  }

  async updateSuggestion(id: string, updates: Partial<InsertSuggestion>): Promise<Suggestion | undefined> {
    const result = await db.update(suggestions)
      .set(updates)
      .where(eq(suggestions.id, id))
      .returning();
    return result[0];
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(insertActivity).returning();
    return result[0];
  }

  async getActivities(workspaceId: string): Promise<Activity[]> {
    const result = await db.select()
      .from(activities)
      .where(eq(activities.workspaceId, workspaceId))
      .orderBy(desc(activities.createdAt));
    return result;
  }

  // Publishing methods
  async publishWorkspace(workspaceId: string, publishData: { slug: string, version: string, publishedAt?: Date }): Promise<{ issue: Issue, workspace: Workspace }> {
    // Get workspace
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get draft
    const draft = await this.getDraft(workspaceId);
    if (!draft || !draft.outline?.sections) {
      throw new Error('No draft content found for workspace');
    }

    // Check if slug already exists
    const existingIssue = await this.getIssue(publishData.slug);
    if (existingIssue) {
      throw new Error(`An issue with slug "${publishData.slug}" already exists`);
    }

    // Convert draft sections to issue format
    const convertedSections = convertDraftToIssueFormat(draft.outline.sections);
    
    // Create the issue
    const issueData: InsertIssue = {
      slug: publishData.slug,
      title: draft.title || workspace.title,
      subtitle: `Published from workspace: ${workspace.title}`,
      version: publishData.version,
      tagline: workspace.goal || 'Collaborative workspace content',
      intro: `This content was collaboratively created in workspace "${workspace.title}" and represents the collective insights and patterns discovered during the ideation process.`,
      sections: convertedSections,
      metadata: {
        sourceWorkspaceId: workspaceId,
        publishedBy: workspace.userId,
        originalGoal: workspace.goal
      },
      publishedAt: publishData.publishedAt || new Date()
    };

    const issue = await this.createIssue(issueData);

    // Update workspace status
    const updatedWorkspace = await this.updateWorkspace(workspaceId, { 
      status: 'completed' 
    });

    if (!updatedWorkspace) {
      throw new Error('Failed to update workspace status');
    }

    // Create activity record
    await this.createActivity({
      workspaceId,
      userId: workspace.userId,
      type: 'publish',
      description: `Published draft as Issue "${issue.title}" (${issue.slug})`,
      metadata: {
        issueSlug: issue.slug,
        publishedAt: issue.publishedAt
      }
    });

    return { issue, workspace: updatedWorkspace };
  }
}

export const storage = new DbStorage();
