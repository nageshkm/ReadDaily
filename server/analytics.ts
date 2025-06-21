import { db } from "./db";
import { userSessions, articleReads, users } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface SessionInfo {
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export class AnalyticsService {
  private activeSessions: Map<string, { sessionId: string; lastActivity: Date }> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  async startSession(sessionInfo: SessionInfo): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // End any existing active sessions for this user
    await this.endUserActiveSessions(sessionInfo.userId);
    
    // Create new session
    await db.insert(userSessions).values({
      id: sessionId,
      userId: sessionInfo.userId,
      sessionStart: new Date(),
      lastActivity: new Date(),
      deviceInfo: sessionInfo.deviceInfo,
      ipAddress: sessionInfo.ipAddress,
    });

    // Track in memory for timeout management
    this.activeSessions.set(sessionInfo.userId, {
      sessionId,
      lastActivity: new Date(),
    });

    return sessionId;
  }

  async updateSessionActivity(userId: string): Promise<void> {
    const activeSession = this.activeSessions.get(userId);
    if (!activeSession) return;

    const now = new Date();
    
    // Check if session has timed out
    if (now.getTime() - activeSession.lastActivity.getTime() > this.SESSION_TIMEOUT_MS) {
      await this.endSession(activeSession.sessionId);
      this.activeSessions.delete(userId);
      return;
    }

    // Update activity timestamp
    activeSession.lastActivity = now;
    await db
      .update(userSessions)
      .set({ lastActivity: now })
      .where(eq(userSessions.id, activeSession.sessionId));
  }

  async endSession(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ sessionEnd: new Date() })
      .where(eq(userSessions.id, sessionId));
  }

  async endUserActiveSessions(userId: string): Promise<void> {
    // End any sessions without an end time
    await db
      .update(userSessions)
      .set({ sessionEnd: new Date() })
      .where(
        and(
          eq(userSessions.userId, userId),
          sql`session_end IS NULL`
        )
      );
    
    this.activeSessions.delete(userId);
  }

  async recordArticleRead(
    userId: string,
    articleId: string,
    deviceInfo?: string
  ): Promise<void> {
    try {
      const activeSession = this.activeSessions.get(userId);
      const sessionId = activeSession?.sessionId || null;

      const readId = `read-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await db.insert(articleReads).values({
        id: readId,
        userId,
        articleId,
        readAt: new Date(),
        sessionId,
        deviceInfo,
      });

      console.log(`Article read recorded: ${userId} read ${articleId}`);
    } catch (error: any) {
      // If duplicate key error (user already read this article), ignore silently
      if (error.code === '23505') {
        console.log(`Article already read: ${userId} already read ${articleId}`);
        return;
      }
      console.error("Error recording article read:", error);
      throw error;
    }

    // Update session activity
    if (activeSession) {
      await this.updateSessionActivity(userId);
    }
  }

  async getUserAnalytics(userId: string) {
    // Get session count and total time
    const sessionStats = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        totalTimeMinutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (session_end - session_start))/60), 0)`,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    // Get article read stats
    const readStats = await db
      .select({
        totalReads: sql<number>`COUNT(*)`,
        uniqueArticles: sql<number>`COUNT(DISTINCT article_id)`,
      })
      .from(articleReads)
      .where(eq(articleReads.userId, userId));

    // Get recent sessions
    const recentSessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.sessionStart))
      .limit(10);

    return {
      sessions: {
        total: sessionStats[0]?.totalSessions || 0,
        totalTimeMinutes: Math.round(sessionStats[0]?.totalTimeMinutes || 0),
        recent: recentSessions,
      },
      articles: {
        totalReads: readStats[0]?.totalReads || 0,
        uniqueArticles: readStats[0]?.uniqueArticles || 0,
      },
    };
  }

  async getAllUsersAnalytics() {
    // Get aggregated user statistics
    const userStats = await db
      .select({
        userId: users.id,
        userName: users.name,
        email: users.email,
        joinDate: users.joinDate,
        lastActive: users.lastActive,
        totalSessions: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM user_sessions 
          WHERE user_sessions.user_id = users.id
        ), 0)`,
        totalReads: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM article_reads 
          WHERE article_reads.user_id = users.id
        ), 0)`,
        uniqueArticles: sql<number>`COALESCE((
          SELECT COUNT(DISTINCT article_id) 
          FROM article_reads 
          WHERE article_reads.user_id = users.id
        ), 0)`,
      })
      .from(users)
      .orderBy(desc(users.lastActive));

    return userStats;
  }

  // Cleanup old sessions periodically
  async cleanupOldSessions(): Promise<void> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // End sessions older than a week that don't have an end time
    await db
      .update(userSessions)
      .set({ sessionEnd: sql`session_start + interval '30 minutes'` })
      .where(
        and(
          sql`session_start < ${oneWeekAgo}`,
          sql`session_end IS NULL`
        )
      );
  }
}

export const analyticsService = new AnalyticsService();

// Cleanup old sessions every hour
setInterval(() => {
  analyticsService.cleanupOldSessions().catch(console.error);
}, 60 * 60 * 1000);