import { 
  type User, 
  type InsertUser,
  type AdminSession,
  type InsertAdminSession,
  type Issue,
  type InsertIssue,
  type ContentImport,
  type InsertContentImport
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private adminSessions: Map<string, AdminSession>;
  private issues: Map<string, Issue>;
  private contentImports: Map<string, ContentImport>;

  constructor() {
    this.users = new Map();
    this.adminSessions = new Map();
    this.issues = new Map();
    this.contentImports = new Map();
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
}

export const storage = new MemStorage();
