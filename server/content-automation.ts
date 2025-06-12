import cron from "node-cron";
import { YouTubeContentService } from "./youtube-service";
import { db } from "./db";
import { articles, categories } from "@shared/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";

interface ProcessedArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  sourceUrl: string;
  imageUrl: string;
  estimatedReadingTime: number;
  categoryId: string;
  publishDate: string;
  youtubeVideoId: string;
  channelName: string;
  transcript: string;
  isSummarized: boolean;
  processingStatus: string;
}

export class ContentAutomationService {
  private youtubeService: YouTubeContentService;
  private summarizationCount = 0;
  private readonly MAX_SUMMARIZATIONS = 5;

  constructor() {
    this.youtubeService = new YouTubeContentService();
  }

  startScheduler() {
    // Run daily at 4:00 AM IST (22:30 UTC previous day)
    cron.schedule("30 22 * * *", async () => {
      console.log("Starting daily content automation at 4:00 AM IST");
      await this.processeDailyContent();
    }, {
      timezone: "UTC"
    });

    console.log("Content automation scheduler started - will run daily at 4:00 AM IST");
  }

  async processeDailyContent() {
    try {
      this.summarizationCount = 0; // Reset counter for each run
      
      console.log("Fetching trending YouTube videos...");
      const videos = await this.youtubeService.fetchTrendingVideos();
      
      console.log(`Found ${videos.length} potential videos to process`);
      
      // Check for duplicates against existing articles
      const uniqueVideos = await this.filterExistingVideos(videos);
      console.log(`${uniqueVideos.length} new videos after duplicate filtering`);

      const processedArticles: ProcessedArticle[] = [];

      for (const video of uniqueVideos) {
        try {
          console.log(`Processing video: ${video.title}`);
          
          // Extract content (transcript or video metadata)
          const transcript = await this.youtubeService.extractTranscript(video.id);
          
          if (!transcript) {
            console.log(`No content available for ${video.title}, skipping...`);
            continue;
          }

          // Always summarize all videos
          console.log(`Summarizing video: ${video.title}`);
          const summarized = await this.youtubeService.summarizeContent(transcript, video.title);
          const content = summarized.summary;
          const summary = summarized.keyTakeaways.join(" • ");
          const improvedTitle = summarized.improvedTitle;
          const isSummarized = true;

          const estimatedReadingTime = await this.youtubeService.estimateReadingTime(content);
          const categoryId = await this.assignCategory(video.channelTitle, video.title);
          
          // Skip videos that don't fit target categories
          if (!categoryId) {
            console.log(`Skipping video "${video.title}" - no suitable category`);
            continue;
          }

          const article: ProcessedArticle = {
            id: `yt-${video.id}-${Date.now()}`,
            title: improvedTitle,
            content,
            summary,
            sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
            imageUrl: video.thumbnail,
            estimatedReadingTime,
            categoryId,
            publishDate: new Date().toISOString().split('T')[0],
            youtubeVideoId: video.id,
            channelName: video.channelTitle,
            transcript,
            isSummarized,
            processingStatus: 'completed'
          };

          processedArticles.push(article);
          
          // Save to database immediately
          await this.saveArticle(article);
          console.log(`Saved article: ${article.title}`);

        } catch (error) {
          console.error(`Failed to process video ${video.title}:`, error);
        }
      }

      console.log(`Daily content automation completed. Processed ${processedArticles.length} articles.`);
      
      // Clean up old articles (keep last 30 days)
      await this.cleanupOldArticles();

    } catch (error) {
      console.error("Daily content automation failed:", error);
    }
  }

  private async filterExistingVideos(videos: any[]) {
    const videoIds = videos.map(v => v.id);
    
    const existingArticles = await db
      .select({ youtubeVideoId: articles.youtubeVideoId })
      .from(articles)
      .where(isNotNull(articles.youtubeVideoId));

    const existingIds = new Set(
      existingArticles
        .map(row => row.youtubeVideoId)
        .filter(id => id && videoIds.includes(id))
    );
    
    return videos.filter(video => !existingIds.has(video.id));
  }

  private async assignCategory(channelName: string, title: string): Promise<string | null> {
    const titleLower = title.toLowerCase();
    const channelLower = channelName.toLowerCase();

    // Technology & AI
    if (channelLower.includes('lex fridman') || titleLower.includes('ai') || 
        titleLower.includes('technology') || titleLower.includes('tech') ||
        titleLower.includes('apple') || titleLower.includes('google') ||
        titleLower.includes('software') || titleLower.includes('update')) {
      return 'technology';
    }

    // Business & Productivity
    if (channelLower.includes('ali abdaal') || channelLower.includes('thomas frank') || 
        channelLower.includes('tim ferriss') || titleLower.includes('productivity') || 
        titleLower.includes('business') || titleLower.includes('entrepreneur') ||
        titleLower.includes('work') || titleLower.includes('guide') ||
        titleLower.includes('tips') || titleLower.includes('study')) {
      return 'productivity';
    }

    // Science & Health channels
    if (channelLower.includes('huberman') || channelLower.includes('veritasium') || 
        titleLower.includes('science') || titleLower.includes('health') ||
        titleLower.includes('fitness') || titleLower.includes('workout') ||
        titleLower.includes('exercise') || titleLower.includes('nutrition')) {
      return 'health';
    }

    // Education
    if (titleLower.includes('learn') || titleLower.includes('education') ||
        titleLower.includes('tutorial') || titleLower.includes('course') ||
        channelLower.includes('education')) {
      return 'education';
    }

    // Skip videos that don't fit specific categories
    return null;
  }

  private async saveArticle(article: ProcessedArticle) {
    await db.insert(articles).values({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      sourceUrl: article.sourceUrl,
      imageUrl: article.imageUrl,
      estimatedReadingTime: article.estimatedReadingTime,
      categoryId: article.categoryId,
      publishDate: article.publishDate,
      featured: false,
      youtubeVideoId: article.youtubeVideoId,
      channelName: article.channelName,
      transcript: article.transcript,
      isSummarized: article.isSummarized,
      processingStatus: article.processingStatus,
    });
  }

  private async cleanupOldArticles() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedCount = await db
      .delete(articles)
      .where(eq(articles.publishDate, thirtyDaysAgo.toISOString().split('T')[0]));
    
    console.log(`Cleaned up old articles: ${deletedCount} removed`);
  }

  // Manual trigger for testing
  async runOnce() {
    console.log("Running content automation manually...");
    await this.processeDailyContent();
  }
}

export const contentAutomation = new ContentAutomationService();