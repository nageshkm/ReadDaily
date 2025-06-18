import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserDbSchema, insertArticleCommentSchema, insertArticleLikeSchema } from "@shared/schema";
import { z } from "zod";
import { urlMetadataService } from "./url-metadata";
import { db } from "./db";
import { articles, articleLikes, articleComments, users } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration endpoint
  app.get("/api/config", (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    });
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

  // User management endpoints
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserDbSchema.parse(req.body);
      const user = await storage.createUser(userData);
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
      const { url, commentary, userId } = req.body;
      
      if (!url || !userId) {
        return res.status(400).json({ message: "URL and userId are required" });
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
        content: metadata.description,
        summary: metadata.description.substring(0, 200) + "...",
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

      // Update user's shared articles in database
      const userData = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userData.length > 0) {
        const sharedArticles = JSON.parse(userData[0].articlesShared || "[]");
        sharedArticles.push(articleId);
        
        await db.update(users)
          .set({ articlesShared: JSON.stringify(sharedArticles) })
          .where(eq(users.id, userId));
      }

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

      // Check if already liked
      const existingLike = await db
        .select()
        .from(articleLikes)
        .where(and(eq(articleLikes.articleId, articleId), eq(articleLikes.userId, userId)))
        .limit(1);

      if (existingLike.length > 0) {
        return res.status(400).json({ message: "Article already liked" });
      }

      // Add like
      const likeId = `like-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(articleLikes).values({
        id: likeId,
        articleId,
        userId,
        likedAt: new Date().toISOString()
      });

      // Update likes count
      const likesCountResult = await db
        .select()
        .from(articleLikes)
        .where(eq(articleLikes.articleId, articleId));
      
      await db
        .update(articles)
        .set({ likesCount: likesCountResult.length })
        .where(eq(articles.id, articleId));

      res.json({ message: "Article liked successfully" });
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
