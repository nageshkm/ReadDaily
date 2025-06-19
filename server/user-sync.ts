import { db } from "./db";
import { users, articleReads } from "@shared/schema";
import { eq } from "drizzle-orm";
import { analyticsService } from "./analytics";
import type { User, ReadArticle, StreakData, UserPreferences } from "@shared/schema";

export interface LocalStorageUserData {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActive: string;
  preferences: UserPreferences;
  readArticles: ReadArticle[];
  streakData: StreakData;
}

export class UserSyncService {
  async findOrCreateUser(email: string, name: string, localData?: LocalStorageUserData): Promise<User> {
    // First, try to find user by email
    let dbUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (dbUser.length > 0) {
      // User exists, merge local data if provided
      return await this.mergeUserData(dbUser[0], localData);
    } else {
      // Create new user with local data or defaults
      return await this.createUserFromLocal(email, name, localData);
    }
  }

  private async createUserFromLocal(email: string, name: string, localData?: LocalStorageUserData): Promise<User> {
    const emailBasedId = `user-${email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    const today = new Date().toISOString();

    const userData = {
      id: emailBasedId,
      name,
      email,
      joinDate: localData?.joinDate || today,
      lastActive: today,
      preferences: JSON.stringify(localData?.preferences || { categories: ['technology', 'business', 'health'] }),
      readArticles: JSON.stringify(localData?.readArticles || []),
      streakData: JSON.stringify(localData?.streakData || {
        currentStreak: 0,
        lastReadDate: "",
        longestStreak: 0
      }),
      articlesShared: "[]"
    };

    await db.insert(users).values(userData);

    // Migrate article reads to analytics if local data exists
    if (localData && localData.readArticles && localData.readArticles.length > 0) {
      await this.migrateArticleReads(emailBasedId, localData.readArticles);
    }

    return this.formatUserForClient(userData);
  }

  private async mergeUserData(dbUser: any, localData?: LocalStorageUserData): Promise<User> {
    if (!localData) {
      return this.formatUserForClient(dbUser);
    }

    // Parse existing data
    const existingReadArticles: ReadArticle[] = JSON.parse(dbUser.readArticles || '[]');
    const existingStreakData: StreakData = JSON.parse(dbUser.streakData || '{"currentStreak":0,"lastReadDate":"","longestStreak":0}');
    const existingPreferences: UserPreferences = JSON.parse(dbUser.preferences || '{"categories":["technology","business","health"]}');

    // Merge read articles (avoid duplicates)
    const mergedReadArticles = [...existingReadArticles];
    for (const localRead of localData.readArticles) {
      const exists = existingReadArticles.some(existing => 
        existing.articleId === localRead.articleId && existing.readDate === localRead.readDate
      );
      if (!exists) {
        mergedReadArticles.push(localRead);
      }
    }

    // Merge streak data (keep the better streak)
    const mergedStreakData: StreakData = {
      currentStreak: Math.max(existingStreakData.currentStreak, localData.streakData.currentStreak),
      longestStreak: Math.max(existingStreakData.longestStreak, localData.streakData.longestStreak),
      lastReadDate: localData.streakData.lastReadDate > existingStreakData.lastReadDate 
        ? localData.streakData.lastReadDate 
        : existingStreakData.lastReadDate
    };

    // Merge preferences (combine categories)
    const allCategories = Array.from(new Set([
      ...existingPreferences.categories,
      ...localData.preferences.categories
    ]));
    const mergedPreferences: UserPreferences = {
      categories: allCategories
    };

    // Update database with merged data
    const updatedData = {
      name: localData.name || dbUser.name,
      lastActive: new Date().toISOString(),
      preferences: JSON.stringify(mergedPreferences),
      readArticles: JSON.stringify(mergedReadArticles),
      streakData: JSON.stringify(mergedStreakData)
    };

    await db
      .update(users)
      .set(updatedData)
      .where(eq(users.id, dbUser.id));

    // Migrate new article reads to analytics
    const newReads = localData.readArticles.filter(localRead => 
      !existingReadArticles.some(existing => 
        existing.articleId === localRead.articleId && existing.readDate === localRead.readDate
      )
    );
    if (newReads.length > 0) {
      await this.migrateArticleReads(dbUser.id, newReads);
    }

    return this.formatUserForClient({
      ...dbUser,
      ...updatedData
    });
  }

  private async migrateArticleReads(userId: string, readArticles: ReadArticle[]): Promise<void> {
    for (const read of readArticles) {
      try {
        const readId = `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(articleReads).values({
          id: readId,
          userId,
          articleId: read.articleId,
          readAt: new Date(read.readDate),
          sessionId: null,
          deviceInfo: 'migrated-from-localStorage'
        });
      } catch (error) {
        console.error(`Failed to migrate article read ${read.articleId} for user ${userId}:`, error);
      }
    }
  }

  private formatUserForClient(dbUser: any): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      joinDate: dbUser.joinDate,
      lastActive: dbUser.lastActive,
      preferences: JSON.parse(dbUser.preferences),
      readArticles: JSON.parse(dbUser.readArticles),
      streakData: JSON.parse(dbUser.streakData)
    };
  }

  async updateUserActivity(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActive: new Date().toISOString() })
      .where(eq(users.id, userId));
    
    await analyticsService.updateSessionActivity(userId);
  }

  async addArticleRead(userId: string, articleId: string, deviceInfo?: string): Promise<User> {
    // Record in analytics
    await analyticsService.recordArticleRead(userId, articleId, deviceInfo);

    // Get current user data
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (dbUser.length === 0) {
      throw new Error('User not found');
    }

    const user = this.formatUserForClient(dbUser[0]);
    const today = new Date().toISOString().split('T')[0];

    // Add to read articles if not already read
    const alreadyRead = user.readArticles.some(ra => ra.articleId === articleId);
    if (!alreadyRead) {
      user.readArticles.push({
        articleId,
        readDate: today
      });

      // Update streak
      user.streakData = this.calculateStreak(user.readArticles, user.streakData);
      user.lastActive = new Date().toISOString();

      // Save to database
      await db
        .update(users)
        .set({
          readArticles: JSON.stringify(user.readArticles),
          streakData: JSON.stringify(user.streakData),
          lastActive: user.lastActive
        })
        .where(eq(users.id, userId));
    }

    return user;
  }

  private calculateStreak(readArticles: ReadArticle[], currentStreakData: StreakData): StreakData {
    const today = new Date().toISOString().split('T')[0];
    const lastReadDate = currentStreakData.lastReadDate;
    
    // Check if user has read any articles today
    const readToday = readArticles.some(ra => ra.readDate === today);
    
    if (readToday && lastReadDate !== today) {
      // Check if streak is maintained (read yesterday or first time)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastReadDate === yesterdayStr || readArticles.length === 1) {
        // Streak continues or starts
        const newStreak = currentStreakData.currentStreak + 1;
        return {
          currentStreak: newStreak,
          lastReadDate: today,
          longestStreak: Math.max(currentStreakData.longestStreak, newStreak)
        };
      } else {
        // Streak broken, start new streak
        return {
          currentStreak: 1,
          lastReadDate: today,
          longestStreak: Math.max(currentStreakData.longestStreak, 1)
        };
      }
    }
    
    return currentStreakData;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (dbUser.length === 0) {
      return null;
    }

    return this.formatUserForClient(dbUser[0]);
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      // End any active sessions
      await analyticsService.endUserActiveSessions(userId);
      
      // Delete user (cascading will handle related records)
      const result = await db
        .delete(users)
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}

export const userSyncService = new UserSyncService();