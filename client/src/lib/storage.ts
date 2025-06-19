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
    
    // Add to read articles if not already read
    const alreadyRead = user.readArticles.some(ra => ra.articleId === articleId);
    if (!alreadyRead) {
      user.readArticles.push({
        articleId,
        readDate: today
      });
    }

    // Update streak
    user = this.updateStreak(user);
    user.lastActive = today;

    this.saveUser(user);
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
    // Use email-based ID for consistency across Google sign-ins
    const userId = `user-${email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    
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

  // Shared article persistence methods
  static getSharedArticleId(): string | null {
    try {
      return localStorage.getItem('sharedArticleId');
    } catch {
      return null;
    }
  }

  static setSharedArticleId(articleId: string): void {
    try {
      localStorage.setItem('sharedArticleId', articleId);
      // Set a flag to track if this is the first time viewing this shared article
      localStorage.setItem('sharedArticleFirstView', 'true');
    } catch {
      // Ignore localStorage errors
    }
  }

  static clearSharedArticleId(): void {
    try {
      localStorage.removeItem('sharedArticleId');
      localStorage.removeItem('sharedArticleFirstView');
    } catch {
      // Ignore localStorage errors
    }
  }

  static isFirstViewOfSharedArticle(): boolean {
    try {
      return localStorage.getItem('sharedArticleFirstView') === 'true';
    } catch {
      return false;
    }
  }

  static markSharedArticleViewed(): void {
    try {
      localStorage.removeItem('sharedArticleFirstView');
    } catch {
      // Ignore localStorage errors
    }
  }
}
