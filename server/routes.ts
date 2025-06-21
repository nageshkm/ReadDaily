import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserDbSchema, insertArticleCommentSchema, insertArticleLikeSchema } from "@shared/schema";
import { z } from "zod";
import { urlMetadataService } from "./url-metadata";
import { contentExtractor } from "./content-extractor";
import { db } from "./db";
import { articles, articleLikes, articleComments, users } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { analyticsService } from "./analytics";
import { userSyncService } from "./user-sync";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper function to get device info from request
  const getDeviceInfo = (req: any) => {
    return req.headers['user-agent'] || 'unknown';
  };

  const getIpAddress = (req: any) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  };

  // Configuration endpoint
  app.get("/api/config", (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
  });

  // Authentication and user sync endpoints
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, name, localData } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ message: "Email and name are required" });
      }

      // Find or create user with local data migration
      const user = await userSyncService.findOrCreateUser(email, name, localData);
      
      // Start analytics session
      const sessionId = await analyticsService.startSession({
        userId: user.id,
        deviceInfo: getDeviceInfo(req),
        ipAddress: getIpAddress(req)
      });

      res.json({ 
        user, 
        sessionId,
        message: localData ? "User data synced successfully" : "User signed in successfully" 
      });
    } catch (error) {
      console.error("Sign-in error:", error);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });

  app.post("/api/auth/activity", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      await userSyncService.updateUserActivity(userId);
      res.json({ message: "Activity updated" });
    } catch (error) {
      console.error("Activity update error:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.post("/api/auth/signout", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (userId) {
        await analyticsService.endUserActiveSessions(userId);
      }
      
      res.json({ message: "Signed out successfully" });
    } catch (error) {
      console.error("Sign-out error:", error);
      res.status(500).json({ message: "Failed to sign out" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const analytics = await analyticsService.getUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("User analytics error:", error);
      res.status(500).json({ message: "Failed to get user analytics" });
    }
  });

  app.get("/api/analytics/all-users", async (req, res) => {
    try {
      const analytics = await analyticsService.getAllUsersAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("All users analytics error:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Article read tracking endpoint
  app.post("/api/articles/read", async (req, res) => {
    try {
      const { userId, articleId } = req.body;
      
      if (!userId || !articleId) {
        return res.status(400).json({ message: "User ID and article ID are required" });
      }

      const user = await userSyncService.addArticleRead(
        userId, 
        articleId, 
        getDeviceInfo(req)
      );
      
      res.json({ user, message: "Article marked as read" });
    } catch (error) {
      console.error("Article read tracking error:", error);
      res.status(500).json({ message: "Failed to track article read" });
    }
  });

  // Analytics article read endpoint (matches client expectation)
  app.post("/api/analytics/article-read", async (req, res) => {
    try {
      const { userId, articleId, deviceInfo } = req.body;
      
      console.log("Article read request:", { userId, articleId, deviceInfo });
      
      if (!userId || !articleId) {
        console.error("Missing userId or articleId:", { userId, articleId });
        return res.status(400).json({ message: "User ID and article ID are required" });
      }

      // Record in analytics table
      console.log("Recording article read in analytics...");
      await analyticsService.recordArticleRead(userId, articleId, deviceInfo);
      
      // Also update user's read articles for streak tracking
      console.log("Updating user streak data...");
      const user = await userSyncService.addArticleRead(userId, articleId, deviceInfo);
      
      console.log("Article read tracking completed successfully");
      res.json({ user, message: "Article read tracked successfully" });
    } catch (error) {
      console.error("Analytics article read tracking error:", error);
      res.status(500).json({ message: "Failed to track article read" });
    }
  });

  // Get articles endpoint
  app.get("/api/articles", async (req, res) => {
    try {
      const allArticles = await storage.getArticles();
      res.json(allArticles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  // Get my articles (shared by user)
  app.get("/api/articles/my", async (req, res) => {
    try {
      const userId = req.headers.authorization || req.query.userId as string;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }
      const myArticles = await storage.getMyArticles(userId);
      res.json(myArticles);
    } catch (error) {
      console.error("Error fetching my articles:", error);
      res.status(500).json({ message: "Failed to fetch my articles" });
    }
  });

  // Get recommended articles (shared by others)
  app.get("/api/articles/recommended", async (req, res) => {
    try {
      const userId = req.headers.authorization || req.query.userId as string;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }
      const recommendedArticles = await storage.getRecommendedArticles(userId);
      res.json(recommendedArticles);
    } catch (error) {
      console.error("Error fetching recommended articles:", error);
      res.status(500).json({ message: "Failed to fetch recommended articles" });
    }
  });

  // Get featured articles
  app.get("/api/featured", async (req, res) => {
    try {
      const featuredArticles = await storage.getFeaturedArticles();
      res.json(featuredArticles);
    } catch (error) {
      console.error("Error fetching featured articles:", error);
      res.status(500).json({ message: "Failed to fetch featured articles" });
    }
  });

  // Add article to featured (admin only)
  app.post("/api/articles/:id/feature", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || user.email !== "readdailyco@gmail.com") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const success = await storage.addFeaturedArticle(id, userId);
      if (success) {
        res.json({ message: "Article featured successfully" });
      } else {
        res.status(500).json({ message: "Failed to feature article" });
      }
    } catch (error) {
      console.error("Error featuring article:", error);
      res.status(500).json({ message: "Failed to feature article" });
    }
  });

  // Remove article from featured (admin only)
  app.delete("/api/articles/:id/feature", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || user.email !== "readdailyco@gmail.com") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const success = await storage.removeFeaturedArticle(id);
      if (success) {
        res.json({ message: "Article unfeatured successfully" });
      } else {
        res.status(500).json({ message: "Failed to unfeature article" });
      }
    } catch (error) {
      console.error("Error unfeaturing article:", error);
      res.status(500).json({ message: "Failed to unfeature article" });
    }
  });

  // Reset featured articles (admin only)
  app.post("/api/articles/featured/reset", async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || user.email !== "readdailyco@gmail.com") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const success = await storage.resetFeaturedArticles();
      if (success) {
        res.json({ message: "Featured articles reset successfully" });
      } else {
        res.status(500).json({ message: "Failed to reset featured articles" });
      }
    } catch (error) {
      console.error("Error resetting featured articles:", error);
      res.status(500).json({ message: "Failed to reset featured articles" });
    }
  });

  // Get single article by ID for sharing
  app.get("/api/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.getArticleById(id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // User management endpoints
  app.post("/api/users", async (req, res) => {
    try {
      const now = new Date().toISOString();
      const userData = {
        ...req.body,
        joinDate: now,
        lastActive: now
      };
      const validatedData = insertUserDbSchema.parse(userData);
      const user = await storage.createUser(validatedData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (deleted) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Share article endpoint
  app.post("/api/articles/share", async (req, res) => {
    try {
      const { url, commentary, userId, userName, userEmail } = req.body;
      
      if (!url || !userId) {
        return res.status(400).json({ message: "URL and userId are required" });
      }

      // Check if user exists by ID first, then by email, create if missing
      let user = await storage.getUser(userId);
      if (!user && userEmail) {
        // Try finding by email in case they have an old random ID
        user = await storage.getUserByEmail(userEmail);
      }
      
      if (!user && userName && userEmail) {
        console.log(`User not found, creating new user: ${userId} (${userEmail})`);
        const today = new Date().toISOString();
        const userData = {
          id: userId,
          name: userName,
          email: userEmail,
          joinDate: today,
          lastActive: today,
          preferences: JSON.stringify({ categories: ['technology', 'business', 'health'] }),
          readArticles: JSON.stringify([]),
          streakData: JSON.stringify({
            currentStreak: 0,
            lastReadDate: "",
            longestStreak: 0
          })
        };
        user = await storage.createUser(userData);
        console.log(`User created: ${user.name} (${user.id})`);
      } else if (!user) {
        console.log(`User not found in database: ${userId} / ${userEmail}`);
        return res.status(400).json({ message: "User not found. Please try signing in again." });
      } else {
        console.log(`User found: ${user.name} (${user.id})`);
      }

      // Extract metadata from URL
      const metadata = await urlMetadataService.extractMetadata(url);
      if (!metadata) {
        return res.status(400).json({ message: "Invalid or blocked URL" });
      }

      // Create article
      const articleId = `shared-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const today = new Date().toISOString().split('T')[0];
      
      await db.insert(articles).values({
        id: articleId,
        title: metadata.title,
        sourceUrl: url,
        imageUrl: metadata.image,
        estimatedReadingTime: metadata.estimatedReadTime,
        categoryId: metadata.category,
        publishDate: today,
        featured: false,
        recommendedBy: userId,
        recommendedAt: new Date().toISOString(),
        userCommentary: commentary || null,
        likesCount: 0
      });

      res.json({ message: "Article shared successfully", articleId });
    } catch (error) {
      console.error("Error sharing article:", error);
      res.status(500).json({ message: "Failed to share article" });
    }
  });

  // Like article endpoint
  app.post("/api/articles/:id/like", async (req, res) => {
    try {
      const { id: articleId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      // Simply add like and increment count - let database handle duplicates
      const likeId = `like-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        await db.insert(articleLikes).values({
          id: likeId,
          articleId,
          userId,
          likedAt: new Date().toISOString()
        });
        
        const result = await db
          .update(articles)
          .set({ likesCount: sql`${articles.likesCount} + 1` })
          .where(eq(articles.id, articleId))
          .returning({ likesCount: articles.likesCount });

        const likesCount = result[0]?.likesCount || 1;
        res.json({ message: "Article liked successfully", action: "liked", likesCount });
      } catch (dbError: any) {
        // If duplicate key error (user already liked), just return current count
        if (dbError.code === '23505') {
          const article = await db
            .select({ likesCount: articles.likesCount })
            .from(articles)
            .where(eq(articles.id, articleId))
            .limit(1);
          
          res.json({ 
            message: "Already liked", 
            action: "already_liked", 
            likesCount: article[0]?.likesCount || 0 
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error("Error liking article:", error);
      res.status(500).json({ message: "Failed to like article" });
    }
  });

  // Comment on article endpoint
  app.post("/api/articles/:id/comment", async (req, res) => {
    try {
      const { id: articleId } = req.params;
      const { content, userId } = req.body;

      if (!content || !userId) {
        return res.status(400).json({ message: "Content and userId are required" });
      }

      const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(articleComments).values({
        id: commentId,
        articleId,
        userId,
        content,
        commentedAt: new Date().toISOString()
      });

      res.json({ message: "Comment added successfully", commentId });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Get article details with likes and comments
  app.get("/api/articles/:id/details", async (req, res) => {
    try {
      const { id: articleId } = req.params;

      // Get article
      const article = await db
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (article.length === 0) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Get likes with user info
      const likes = await db
        .select({
          id: articleLikes.id,
          userId: articleLikes.userId,
          userName: users.name,
          likedAt: articleLikes.likedAt
        })
        .from(articleLikes)
        .leftJoin(users, eq(articleLikes.userId, users.id))
        .where(eq(articleLikes.articleId, articleId))
        .orderBy(desc(articleLikes.likedAt));

      // Get comments with user info
      const comments = await db
        .select({
          id: articleComments.id,
          content: articleComments.content,
          userId: articleComments.userId,
          userName: users.name,
          commentedAt: articleComments.commentedAt
        })
        .from(articleComments)
        .leftJoin(users, eq(articleComments.userId, users.id))
        .where(eq(articleComments.articleId, articleId))
        .orderBy(desc(articleComments.commentedAt));

      // Get recommender info
      let recommender = null;
      if (article[0].recommendedBy) {
        const recommenderData = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, article[0].recommendedBy))
          .limit(1);
        
        if (recommenderData.length > 0) {
          recommender = recommenderData[0];
        }
      }

      res.json({
        article: article[0],
        recommender,
        likes,
        comments,
        likesCount: likes.length
      });
    } catch (error) {
      console.error("Error fetching article details:", error);
      res.status(500).json({ message: "Failed to fetch article details" });
    }
  });

  // Extract full article content
  app.get("/api/articles/:id/content", async (req, res) => {
    try {
      const { id: articleId } = req.params;
      
      // Get article from database
      const article = await db
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (article.length === 0) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Extract full content from source URL
      const extractedContent = await contentExtractor.extractArticleContent(article[0].sourceUrl);
      
      if (!extractedContent || !extractedContent.isExtractable) {
        return res.status(200).json({ 
          success: false, 
          message: "Content not extractable",
          fallbackUrl: article[0].sourceUrl 
        });
      }

      res.json({
        success: true,
        content: extractedContent
      });
    } catch (error) {
      console.error("Error extracting article content:", error);
      res.status(500).json({ message: "Failed to extract content" });
    }
  });

  // Get articles read by a specific user
  app.get("/api/users/:userName/read-articles", async (req, res) => {
    try {
      const { userName } = req.params;
      const readArticles = await storage.getUserReadArticles(userName);
      res.json(readArticles);
    } catch (error) {
      console.error("Error fetching user read articles:", error);
      res.status(500).json({ message: "Failed to fetch user read articles" });
    }
  });

  // Get articles liked by a specific user
  app.get("/api/users/:userName/liked-articles", async (req, res) => {
    try {
      const { userName } = req.params;
      const likedArticles = await storage.getUserLikedArticles(userName);
      res.json(likedArticles);
    } catch (error) {
      console.error("Error fetching user liked articles:", error);
      res.status(500).json({ message: "Failed to fetch user liked articles" });
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Manual content automation trigger (for testing)
  app.post("/api/automation/run", async (req, res) => {
    try {
      const { contentAutomation } = await import("./content-automation");
      await contentAutomation.runOnce();
      res.json({ message: "Content automation completed successfully" });
    } catch (error) {
      console.error("Content automation failed:", error);
      res.status(500).json({ message: "Content automation failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
