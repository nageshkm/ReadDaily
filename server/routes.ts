import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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
