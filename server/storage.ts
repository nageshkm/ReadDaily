import { users, type User, type InsertUserDb } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUserDb): Promise<User>;
  getArticles(): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.name === username,
    );
  }

  async createUser(insertUser: InsertUserDb): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id: id.toString() };
    this.users.set(id.toString(), user);
    return user;
  }

  async getArticles(): Promise<any[]> {
    const { db } = await import("./db");
    const { articles } = await import("@shared/schema");
    const { desc } = await import("drizzle-orm");
    
    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.createdAt))
      .limit(50);
    
    return allArticles;
  }
}

export const storage = new MemStorage();
