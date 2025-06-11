import { z } from "zod";

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
export const insertUserSchema = userSchema.omit({ id: true, joinDate: true, lastActive: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

export const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categories: z.array(z.string()).min(1, "Please select at least one category"),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
