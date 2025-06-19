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
  sourceUrl: z.string(),
  imageUrl: z.string(),
  estimatedReadingTime: z.number(),
  categoryId: z.string(),
  publishDate: z.string(),
  featured: z.boolean(),
  userCommentary: z.string().optional(),
  recommendedBy: z.string().optional(),
  recommendedAt: z.string().optional(),
  likesCount: z.number().optional(),
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
  email: z.string().email(),
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
  sourceUrl: text("source_url").notNull(),
  imageUrl: text("image_url").notNull(),
  estimatedReadingTime: integer("estimated_reading_time").notNull(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  publishDate: text("publish_date").notNull(),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  // User sharing fields
  recommendedBy: text("recommended_by").references(() => users.id),
  recommendedAt: text("recommended_at"),
  userCommentary: text("user_commentary"),
  likesCount: integer("likes_count").default(0),
  // YouTube-specific fields (keeping for migration)
  youtubeVideoId: text("youtube_video_id"),
  channelName: text("channel_name"),
  transcript: text("transcript"),
  isSummarized: boolean("is_summarized").default(false),
  processingStatus: text("processing_status").default("pending"),
});

export const articleLikes = pgTable("article_likes", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  likedAt: text("liked_at").notNull(),
});

export const articleComments = pgTable("article_comments", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  commentedAt: text("commented_at").notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  joinDate: text("join_date").notNull(),
  lastActive: text("last_active").notNull(),
  preferences: text("preferences").notNull(), // JSON string
  readArticles: text("read_articles").notNull(), // JSON string
  streakData: text("streak_data").notNull(), // JSON string
  articlesShared: text("articles_shared").notNull().default("[]"), // JSON string array of article IDs
});

// Analytics Tables
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionStart: timestamp("session_start").notNull().defaultNow(),
  sessionEnd: timestamp("session_end"),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  deviceInfo: text("device_info"), // Browser/device information
  ipAddress: text("ip_address"),
});

export const articleReads = pgTable("article_reads", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").notNull().defaultNow(),
  sessionId: text("session_id").references(() => userSessions.id, { onDelete: "set null" }),
  deviceInfo: text("device_info"),
});

// Database insert schemas
export const insertCategorySchema = createInsertSchema(categories);
export const insertArticleSchema = createInsertSchema(articles);
export const insertUserDbSchema = createInsertSchema(users).omit({ id: true });
export const insertArticleLikeSchema = createInsertSchema(articleLikes);
export const insertArticleCommentSchema = createInsertSchema(articleComments);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertArticleReadSchema = createInsertSchema(articleReads);

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type InsertUserDb = z.infer<typeof insertUserDbSchema>;
export type InsertArticleLike = z.infer<typeof insertArticleLikeSchema>;
export type InsertArticleComment = z.infer<typeof insertArticleCommentSchema>;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type InsertArticleRead = z.infer<typeof insertArticleReadSchema>;
