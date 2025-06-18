import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserDbSchema, insertArticleCommentSchema, insertArticleLikeSchema } from "@shared/schema";
import { z } from "zod";
import { urlMetadataService } from "./url-metadata";
import { db } from "./db";
import { articles, articleLikes, articleComments, users } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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
