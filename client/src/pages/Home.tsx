import { useState, useEffect } from "react";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleView } from "@/components/ArticleView";
import { UserOnboarding } from "@/components/UserOnboarding";

import { LocalStorage } from "@/lib/storage";
import { getTodayString } from "@/lib/utils";
import { User, Article, Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [todayReadCount, setTodayReadCount] = useState(0);

  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);

  // Fetch articles from backend
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/articles"],
  });

  const categories = LocalStorage.getCategories();

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    if (existingUser) {
      setUser(existingUser);
      setTodayReadCount(LocalStorage.getTodayReadCount(existingUser));
    } else {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (newUser: User) => {
    setUser(newUser);
    setTodayReadCount(LocalStorage.getTodayReadCount(newUser));
    setShowOnboarding(false);
  };

  const handleReadArticle = (article: Article) => {
    const index = (articles as any[]).findIndex((a: any) => a.id === article.id);
    setCurrentArticleIndex(index);
    setSelectedArticle(article);
    setIsArticleViewOpen(true);
  };

  const handleViewArticle = (article: Article) => {
    const index = (articles as any[]).findIndex((a: any) => a.id === article.id);
    setCurrentArticleIndex(index);
    setSelectedArticle(article);
    setIsArticleViewOpen(true);
  };

  const handleMarkAsRead = (article: Article) => {
    if (!user) return;
    
    const updatedUser = LocalStorage.markArticleAsRead(user, article.id);
    setUser(updatedUser);
    setTodayReadCount(LocalStorage.getTodayReadCount(updatedUser));
    setIsArticleViewOpen(false);
  };

  const handleNextArticle = () => {
    const unreadArticles = (articles as any[]).filter((article: any) => !isArticleRead(article.id));
    const currentUnreadIndex = unreadArticles.findIndex((article: any) => article.id === selectedArticle?.id);
    const nextIndex = currentUnreadIndex + 1;
    
    if (nextIndex < unreadArticles.length) {
      const nextArticle = unreadArticles[nextIndex];
      const originalIndex = (articles as any[]).findIndex((a: any) => a.id === nextArticle.id);
      setCurrentArticleIndex(originalIndex);
      setSelectedArticle(nextArticle);
      // Keep dialog open, just change the article
    } else {
      // No more unread articles, close the dialog
      setIsArticleViewOpen(false);
      setSelectedArticle(null);
    }
  };



  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  const isArticleRead = (articleId: string): boolean => {
    if (!user) return false;
    return LocalStorage.isArticleRead(user, articleId);
  };

  if (showOnboarding) {
    return (
      <UserOnboarding
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  if (articlesLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading articles...</div>;
  }

  const selectedCategory = selectedArticle 
    ? getCategoryById(selectedArticle.categoryId) 
    : null;

  const hasNextArticle = currentArticleIndex < (articles as any[]).length - 1;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StreakDisplay user={user} todayReadCount={todayReadCount} />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Today's Articles</h2>
          <span className="text-sm text-gray-500">{getTodayString()}</span>
        </div>

        <div className="grid gap-6">
          {(articles as any[]).filter((article: any) => !isArticleRead(article.id)).map((article: any) => {
            const category = getCategoryById(article.categoryId);
            if (!category) return null;

            return (
              <ArticleCard
                key={article.id}
                article={article}
                category={category}
                isRead={false}
                onReadClick={handleReadArticle}
                onViewClick={handleViewArticle}
              />
            );
          })}
        </div>

        {(articles as any[]).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No articles available for today.</p>
            <p className="text-sm text-gray-400 mt-2">
              Check back later for new content!
            </p>
          </div>
        )}
      </div>

      <ArticleView
        article={selectedArticle}
        category={selectedCategory}
        isOpen={isArticleViewOpen}
        isRead={selectedArticle ? isArticleRead(selectedArticle.id) : false}
        onClose={() => setIsArticleViewOpen(false)}
        onMarkAsRead={handleMarkAsRead}
        onNextArticle={hasNextArticle ? handleNextArticle : undefined}
        hasNextArticle={hasNextArticle}
      />


    </main>
  );
}