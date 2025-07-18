import { users, type User, type InsertUserDb } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUserDb): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getArticles(): Promise<any[]>;
  getMyArticles(userId: string): Promise<any[]>;
  getRecommendedArticles(userId: string): Promise<any[]>;
  getArticleById(id: string): Promise<any | undefined>;
  getFeaturedArticles(): Promise<any[]>;
  addFeaturedArticle(articleId: string, userId: string): Promise<boolean>;
  removeFeaturedArticle(articleId: string): Promise<boolean>;
  resetFeaturedArticles(): Promise<boolean>;
  getUserReadArticles(userName: string): Promise<any[]>;
  getUserLikedArticles(userName: string): Promise<any[]>;
  getAllUsers(): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    // First check memory cache
    const cached = this.users.get(id);
    if (cached) return cached;
    
    // If not in cache, query database
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const dbUser = result[0];
    const user: User = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      joinDate: dbUser.joinDate,
      lastActive: dbUser.lastActive,
      preferences: JSON.parse(dbUser.preferences),
      readArticles: JSON.parse(dbUser.readArticles),
      streakData: JSON.parse(dbUser.streakData)
    };
    
    // Cache for future use
    this.users.set(id, user);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Check memory first
    const cached = Array.from(this.users.values()).find(user => user.name === username);
    if (cached) return cached;
    
    // Query database
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const result = await db.select().from(users).where(eq(users.name, username)).limit(1);
    if (result.length === 0) return undefined;
    
    const dbUser = result[0];
    const user: User = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      joinDate: dbUser.joinDate,
      lastActive: dbUser.lastActive,
      preferences: JSON.parse(dbUser.preferences),
      readArticles: JSON.parse(dbUser.readArticles),
      streakData: JSON.parse(dbUser.streakData)
    };
    
    this.users.set(dbUser.id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Check memory first
    const cached = Array.from(this.users.values()).find(user => user.email === email);
    if (cached) return cached;
    
    // Query database
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) return undefined;
    
    const dbUser = result[0];
    const user: User = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      joinDate: dbUser.joinDate,
      lastActive: dbUser.lastActive,
      preferences: JSON.parse(dbUser.preferences),
      readArticles: JSON.parse(dbUser.readArticles),
      streakData: JSON.parse(dbUser.streakData)
    };
    
    this.users.set(dbUser.id, user);
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      // Delete from database
      const result = await db.delete(users).where(eq(users.id, id));
      
      // Remove from memory cache
      this.users.delete(id);
      
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async createUser(insertUser: InsertUserDb): Promise<User> {
    try {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      
      // Generate a unique ID
      const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert into database
      const dbUser = {
        id,
        ...insertUser
      };
      
      await db.insert(users).values(dbUser);
      
      // Create User object with parsed JSON fields
      const user: User = {
        id,
        name: insertUser.name,
        email: insertUser.email,
        joinDate: insertUser.joinDate,
        lastActive: insertUser.lastActive,
        preferences: JSON.parse(insertUser.preferences),
        readArticles: JSON.parse(insertUser.readArticles),
        streakData: JSON.parse(insertUser.streakData)
      };
      
      // Also store in memory for quick access
      this.users.set(id, user);
      return user;
    } catch (error) {
      console.error("Error creating user in database:", error);
      throw error;
    }
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
    
    // Transform the data to match frontend schema expectations
    return allArticles.map((article: any) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      categoryId: article.categoryId,
      sourceUrl: article.sourceUrl,
      imageUrl: article.imageUrl,
      estimatedReadingTime: article.estimatedReadingTime,
      publishDate: article.publishDate,
      featured: article.featured,
      createdAt: article.createdAt,
      youtubeVideoId: article.youtubeVideoId,
      channelName: article.channelName,
      transcript: article.transcript,
      isSummarized: article.isSummarized,
      processingStatus: article.processingStatus
    }));
  }

  async getMyArticles(userId: string): Promise<any[]> {
    const { db } = await import("./db");
    const { articles } = await import("@shared/schema");
    const { eq, desc, isNotNull } = await import("drizzle-orm");
    
    try {
      const myArticles = await db
        .select()
        .from(articles)
        .where(eq(articles.recommendedBy, userId))
        .orderBy(desc(articles.recommendedAt));
      
      return myArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        categoryId: article.categoryId,
        sourceUrl: article.sourceUrl,
        imageUrl: article.imageUrl,
        estimatedReadingTime: article.estimatedReadingTime,
        publishDate: article.publishDate,
        featured: article.featured,
        recommendedBy: article.recommendedBy,
        recommendedAt: article.recommendedAt,
        userCommentary: article.userCommentary,
        likesCount: article.likesCount || 0
      }));
    } catch (error) {
      console.error("Error fetching my articles:", error);
      return [];
    }
  }

  async getRecommendedArticles(userId: string): Promise<any[]> {
    const { db } = await import("./db");
    const { articles, users } = await import("@shared/schema");
    const { ne, isNotNull, desc, eq } = await import("drizzle-orm");
    
    try {
      const recommendedArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          categoryId: articles.categoryId,
          sourceUrl: articles.sourceUrl,
          imageUrl: articles.imageUrl,
          estimatedReadingTime: articles.estimatedReadingTime,
          publishDate: articles.publishDate,
          featured: articles.featured,
          recommendedBy: articles.recommendedBy,
          recommendedAt: articles.recommendedAt,
          userCommentary: articles.userCommentary,
          likesCount: articles.likesCount,
          recommenderName: users.name
        })
        .from(articles)
        .leftJoin(users, eq(articles.recommendedBy, users.id))
        .where(isNotNull(articles.recommendedBy))
        .orderBy(desc(articles.recommendedAt));
      
      return recommendedArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        categoryId: article.categoryId,
        sourceUrl: article.sourceUrl,
        imageUrl: article.imageUrl,
        estimatedReadingTime: article.estimatedReadingTime,
        publishDate: article.publishDate,
        featured: article.featured,
        recommendedBy: article.recommendedBy,
        recommendedAt: article.recommendedAt,
        userCommentary: article.userCommentary,
        likesCount: article.likesCount || 0,
        recommenderName: article.recommenderName || 'Unknown User'
      }));
    } catch (error) {
      console.error("Error fetching recommended articles:", error);
      return [];
    }
  }

  async getArticleById(id: string): Promise<any | undefined> {
    const { db } = await import("./db");
    const { articles, users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    try {
      const result = await db
        .select({
          id: articles.id,
          title: articles.title,
          categoryId: articles.categoryId,
          sourceUrl: articles.sourceUrl,
          imageUrl: articles.imageUrl,
          estimatedReadingTime: articles.estimatedReadingTime,
          publishDate: articles.publishDate,
          featured: articles.featured,
          recommendedBy: articles.recommendedBy,
          recommendedAt: articles.recommendedAt,
          userCommentary: articles.userCommentary,
          likesCount: articles.likesCount,
          recommenderName: users.name
        })
        .from(articles)
        .leftJoin(users, eq(articles.recommendedBy, users.id))
        .where(eq(articles.id, id))
        .limit(1);
      
      if (result.length === 0) {
        return undefined;
      }
      
      const article = result[0];
      return {
        id: article.id,
        title: article.title,
        categoryId: article.categoryId,
        sourceUrl: article.sourceUrl,
        imageUrl: article.imageUrl,
        estimatedReadingTime: article.estimatedReadingTime,
        publishDate: article.publishDate,
        featured: article.featured,
        recommendedBy: article.recommendedBy,
        recommendedAt: article.recommendedAt,
        userCommentary: article.userCommentary,
        likesCount: article.likesCount || 0,
        recommenderName: article.recommenderName || 'Unknown User'
      };
    } catch (error) {
      console.error("Error fetching article by ID:", error);
      return undefined;
    }
  }

  async getFeaturedArticles(): Promise<any[]> {
    const { db } = await import("./db");
    const { featuredArticles, articles, users } = await import("@shared/schema");
    const { eq, asc } = await import("drizzle-orm");
    
    try {
      const featured = await db
        .select({
          id: articles.id,
          title: articles.title,
          categoryId: articles.categoryId,
          sourceUrl: articles.sourceUrl,
          imageUrl: articles.imageUrl,
          estimatedReadingTime: articles.estimatedReadingTime,
          publishDate: articles.publishDate,
          featured: articles.featured,
          createdAt: articles.createdAt,
          recommendedBy: articles.recommendedBy,
          recommendedAt: articles.recommendedAt,
          userCommentary: articles.userCommentary,
          likesCount: articles.likesCount,
          recommenderName: users.name,
          featuredAt: featuredArticles.featuredAt,
          position: featuredArticles.position
        })
        .from(featuredArticles)
        .innerJoin(articles, eq(featuredArticles.articleId, articles.id))
        .leftJoin(users, eq(articles.recommendedBy, users.id))
        .orderBy(asc(featuredArticles.position));
      
      return featured;
    } catch (error) {
      console.error("Error fetching featured articles:", error);
      return [];
    }
  }

  async addFeaturedArticle(articleId: string, userId: string): Promise<boolean> {
    const { db } = await import("./db");
    const { featuredArticles } = await import("@shared/schema");
    
    try {
      // Get current max position
      const maxPosition = await db
        .select({ maxPos: featuredArticles.position })
        .from(featuredArticles)
        .orderBy(featuredArticles.position)
        .limit(1);
      
      const newPosition = (maxPosition[0]?.maxPos || 0) + 1;
      
      await db.insert(featuredArticles).values({
        id: `featured-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        articleId,
        featuredBy: userId,
        position: newPosition
      });
      
      return true;
    } catch (error) {
      console.error("Error adding featured article:", error);
      return false;
    }
  }

  async removeFeaturedArticle(articleId: string): Promise<boolean> {
    const { db } = await import("./db");
    const { featuredArticles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    try {
      await db.delete(featuredArticles).where(eq(featuredArticles.articleId, articleId));
      return true;
    } catch (error) {
      console.error("Error removing featured article:", error);
      return false;
    }
  }

  async resetFeaturedArticles(): Promise<boolean> {
    const { db } = await import("./db");
    const { featuredArticles } = await import("@shared/schema");
    
    try {
      await db.delete(featuredArticles);
      return true;
    } catch (error) {
      console.error("Error resetting featured articles:", error);
      return false;
    }
  }

  async getUserReadArticles(userName: string): Promise<any[]> {
    const { db } = await import("./db");
    const { users, articles, articleReads } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    
    try {
      // First find the user by name
      const user = await db.select().from(users).where(eq(users.name, userName)).limit(1);
      if (user.length === 0) return [];
      
      const userId = user[0].id;
      
      // Get articles read by this user from articleReads table
      const readArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          categoryId: articles.categoryId,
          sourceUrl: articles.sourceUrl,
          imageUrl: articles.imageUrl,
          estimatedReadingTime: articles.estimatedReadingTime,
          publishDate: articles.publishDate,
          readAt: articleReads.readAt,
          recommendedBy: articles.recommendedBy,
          userCommentary: articles.userCommentary,
          likesCount: articles.likesCount
        })
        .from(articleReads)
        .innerJoin(articles, eq(articleReads.articleId, articles.id))
        .where(eq(articleReads.userId, userId))
        .orderBy(desc(articleReads.readAt));
      
      return readArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        categoryId: article.categoryId,
        sourceUrl: article.sourceUrl,
        imageUrl: article.imageUrl,
        estimatedReadingTime: article.estimatedReadingTime,
        publishDate: article.publishDate,
        readAt: article.readAt,
        recommendedBy: article.recommendedBy,
        userCommentary: article.userCommentary,
        likesCount: article.likesCount || 0
      }));
    } catch (error) {
      console.error("Error fetching user read articles:", error);
      return [];
    }
  }

  async getUserLikedArticles(userName: string): Promise<any[]> {
    const { db } = await import("./db");
    const { users, articles, articleLikes } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    
    try {
      // First find the user by name
      const user = await db.select().from(users).where(eq(users.name, userName)).limit(1);
      if (user.length === 0) return [];
      
      const userId = user[0].id;
      
      // Get articles liked by this user
      const likedArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          categoryId: articles.categoryId,
          sourceUrl: articles.sourceUrl,
          imageUrl: articles.imageUrl,
          estimatedReadingTime: articles.estimatedReadingTime,
          publishDate: articles.publishDate,
          likedAt: articleLikes.likedAt,
          recommendedBy: articles.recommendedBy,
          userCommentary: articles.userCommentary,
          likesCount: articles.likesCount
        })
        .from(articleLikes)
        .innerJoin(articles, eq(articleLikes.articleId, articles.id))
        .where(eq(articleLikes.userId, userId))
        .orderBy(desc(articleLikes.likedAt));
      
      return likedArticles.map((article: any) => ({
        id: article.id,
        title: article.title,
        categoryId: article.categoryId,
        sourceUrl: article.sourceUrl,
        imageUrl: article.imageUrl,
        estimatedReadingTime: article.estimatedReadingTime,
        publishDate: article.publishDate,
        likedAt: article.likedAt,
        recommendedBy: article.recommendedBy,
        userCommentary: article.userCommentary,
        likesCount: article.likesCount || 0
      }));
    } catch (error) {
      console.error("Error fetching user liked articles:", error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
    try {
      const allUsers = await db.select().from(users);
      return allUsers.map((dbUser: any) => ({
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        joinDate: dbUser.joinDate,
        lastActive: dbUser.lastActive,
        preferences: JSON.parse(dbUser.preferences || '{"categories":["technology","business","health"]}'),
        readArticles: JSON.parse(dbUser.readArticles || '[]'),
        streakData: JSON.parse(dbUser.streakData || '{"currentStreak":0,"lastReadDate":"","longestStreak":0}'),
        articlesShared: JSON.parse(dbUser.articlesShared || '[]')
      }));
    } catch (error) {
      console.error("Error fetching all users:", error);
      return [];
    }
  }
}

export const storage = new MemStorage();
