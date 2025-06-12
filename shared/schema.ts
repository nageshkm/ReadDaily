import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Category schema
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

// Article schema
export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  sourceUrl: z.string(),
  imageUrl: z.string(),
  estimatedReadingTime: z.number(),
  categoryId: z.string(),
  publishDate: z.string(),
  featured: z.boolean(),
});

export type Article = z.infer<typeof articleSchema>;

// User data schema
export const userPreferencesSchema = z.object({
  categories: z.array(z.string()),
});

export const streakDataSchema = z.object({
  currentStreak: z.number(),
  lastReadDate: z.string(),
  longestStreak: z.number(),
});

export const readArticleSchema = z.object({
  articleId: z.string(),
  readDate: z.string(),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  joinDate: z.string(),
  lastActive: z.string(),
  preferences: userPreferencesSchema,
  readArticles: z.array(readArticleSchema),
  streakData: streakDataSchema,
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type StreakData = z.infer<typeof streakDataSchema>;
export type ReadArticle = z.infer<typeof readArticleSchema>;
export type User = z.infer<typeof userSchema>;

// Insert schemas for form validation  
export const insertUserFormSchema = userSchema.omit({ id: true, joinDate: true, lastActive: true });
export type InsertUserForm = z.infer<typeof insertUserFormSchema>;

export const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categories: z.array(z.string()).min(1, "Please select at least one category"),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

// Database Tables
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url").notNull(),
  imageUrl: text("image_url").notNull(),
  estimatedReadingTime: integer("estimated_reading_time").notNull(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  publishDate: text("publish_date").notNull(),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  // YouTube-specific fields
  youtubeVideoId: text("youtube_video_id"),
  channelName: text("channel_name"),
  transcript: text("transcript"), // Full transcript
  isSummarized: boolean("is_summarized").default(false),
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  joinDate: text("join_date").notNull(),
  lastActive: text("last_active").notNull(),
  preferences: text("preferences").notNull(), // JSON string
  readArticles: text("read_articles").notNull(), // JSON string
  streakData: text("streak_data").notNull(), // JSON string
});

// Database insert schemas
export const insertCategorySchema = createInsertSchema(categories);
export const insertArticleSchema = createInsertSchema(articles);
export const insertUserDbSchema = createInsertSchema(users);

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type InsertUserDb = z.infer<typeof insertUserDbSchema>;
