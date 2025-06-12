import { User, Article, Category, ReadArticle, StreakData } from "@shared/schema";
import categoriesData from "../data/categories.json";
import articlesData from "../data/articles.json";

const STORAGE_KEY = "readingHabitUser";

export class LocalStorage {
  static getUser(): User | null {
    try {
      const userData = localStorage.getItem(STORAGE_KEY);
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error retrieving user data:", error);
      return null;
    }
  }

  static saveUser(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  }

  static clearUser(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static getCategories(): Category[] {
    return categoriesData as Category[];
  }

  static getArticles(): Article[] {
    return articlesData as Article[];
  }

  static getDailyArticles(user: User): Article[] {
    const today = new Date().toISOString().split('T')[0];
    const userCategories = user.preferences.categories;
    const readArticleIds = user.readArticles.map(item => item.articleId);
    const articles = this.getArticles();
    
    // Get today's featured articles in user's categories
    let dailyArticles = articles
      .filter(article => 
        article.publishDate === today && 
        userCategories.includes(article.categoryId) &&
        article.featured &&
        !readArticleIds.includes(article.id)
      )
      .slice(0, 3);
    
    // If we don't have 3 featured articles, add non-featured ones
    if (dailyArticles.length < 3) {
      const nonFeatured = articles
        .filter(article => 
          article.publishDate === today && 
          userCategories.includes(article.categoryId) &&
          !article.featured &&
          !readArticleIds.includes(article.id)
        )
        .slice(0, 3 - dailyArticles.length);
      
      dailyArticles = [...dailyArticles, ...nonFeatured];
    }
    
    // If still fewer than 3, add recent unread articles
    if (dailyArticles.length < 3) {
      const recentArticles = articles
        .filter(article => 
          article.publishDate < today &&
          userCategories.includes(article.categoryId) &&
          !readArticleIds.includes(article.id)
        )
        .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
        .slice(0, 3 - dailyArticles.length);
      
      dailyArticles = [...dailyArticles, ...recentArticles];
    }
    
    return dailyArticles;
  }

  static markArticleAsRead(user: User, articleId: string): User {
    const today = new Date().toISOString().split('T')[0];
    console.log('markArticleAsRead called with:', { userId: user.id, articleId, readArticles: user.readArticles });
    
    // Add to read articles if not already read
    const alreadyRead = user.readArticles.some(ra => ra.articleId === articleId);
    console.log('Already read?', alreadyRead);
    
    if (!alreadyRead) {
      user.readArticles.push({
        articleId,
        readDate: today
      });
      console.log('Added to read articles. New array:', user.readArticles);
    }

    // Update streak
    user = this.updateStreak(user);
    user.lastActive = today;

    console.log('Before saving user:', user.readArticles);
    this.saveUser(user);
    console.log('After saving user, checking localStorage:', localStorage.getItem(`user_${user.id}`));
    return user;
  }

  static updateStreak(user: User): User {
    const today = new Date().toISOString().split('T')[0];
    const lastReadDate = user.streakData.lastReadDate;
    
    // Check if user has read any articles today
    const readToday = user.readArticles.some(ra => ra.readDate === today);
    
    if (readToday && lastReadDate !== today) {
      // Check if streak is maintained (read yesterday or first time)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastReadDate === yesterdayStr || user.readArticles.length === 1) {
        // Streak continues or starts
        user.streakData.currentStreak += 1;
        
        // Update longest streak if needed
        if (user.streakData.currentStreak > user.streakData.longestStreak) {
          user.streakData.longestStreak = user.streakData.currentStreak;
        }
      } else {
        // Check if streak should be broken (missed a day)
        const lastRead = new Date(lastReadDate);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) {
          // Streak broken
          user.streakData.currentStreak = 1;
        }
      }
      
      // Update last read date
      user.streakData.lastReadDate = today;
    }
    
    return user;
  }

  static getTodayReadCount(user: User): number {
    const today = new Date().toISOString().split('T')[0];
    return user.readArticles.filter(ra => ra.readDate === today).length;
  }

  static isArticleRead(user: User, articleId: string): boolean {
    return user.readArticles.some(ra => ra.articleId === articleId);
  }

  static createUser(name: string, email: string, categories: string[]): User {
    const today = new Date().toISOString().split('T')[0];
    const userId = `user-${Date.now()}`;
    
    const newUser: User = {
      id: userId,
      name,
      email,
      joinDate: today,
      lastActive: today,
      preferences: {
        categories
      },
      readArticles: [],
      streakData: {
        currentStreak: 0,
        lastReadDate: "",
        longestStreak: 0
      }
    };

    this.saveUser(newUser);
    return newUser;
  }
}
