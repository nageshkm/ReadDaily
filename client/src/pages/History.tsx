import { useState, useEffect } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleView } from "@/components/ArticleView";
import { LocalStorage } from "@/lib/storage";
import { User, Article, Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function History() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);

  // Fetch articles from backend
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/articles"],
  });

  // Fetch categories from backend  
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["/api/config"],
  });
  const categories = (config as any)?.categories || [];

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    if (existingUser) {
      setUser(existingUser);
    }
  }, []);

  if (articlesLoading || configLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">Loading...</div>
      </main>
    );
  }

  // Filter to show only read articles
  const readArticles = user && Array.isArray(articles) ? (articles as any[]).filter((article: any) => {
    const isRead = user.readArticles?.some((ra: any) => ra.articleId === article.id);
    return isRead;
  }).sort((a: any, b: any) => {
    // Sort by read date (most recent first)
    const dateA = user.readArticles?.find((ra: any) => ra.articleId === a.id)?.readDate || '';
    const dateB = user.readArticles?.find((ra: any) => ra.articleId === b.id)?.readDate || '';
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  }) : [];



  const handleViewArticle = (article: Article) => {
    setSelectedArticle(article);
    setIsArticleViewOpen(true);
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find((cat: any) => cat.id === categoryId);
  };

  const handleMarkAsRead = (article: Article) => {
    // Articles in history are already read, no action needed
  };

  const selectedCategory = selectedArticle 
    ? getCategoryById(selectedArticle.categoryId) 
    : null;

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Please complete onboarding first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Reading History</h2>
        <p className="text-gray-600">
          You've read {readArticles.length} article{readArticles.length !== 1 ? 's' : ''} so far
        </p>
      </div>

      <div className="grid gap-6">
        {readArticles.map((article: any) => {
          const category = getCategoryById(article.categoryId);
          if (!category) return null;

          // Get read date for this article
          const readDate = user?.readArticles?.find((ra: any) => ra.articleId === article.id)?.readDate || '';

          return (
            <div key={article.id} className="relative">
              <ArticleCard
                article={article}
                category={category}
                isRead={true}
                onReadClick={() => {}} // Not needed for history view
                onViewClick={handleViewArticle}
              />
              {readDate && (
                <div className="absolute top-4 right-4 text-xs text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">
                  Read on {new Date(readDate).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {readArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No articles read yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Start reading today's articles to build your history!
          </p>
        </div>
      )}

      <ArticleView
        article={selectedArticle}
        category={selectedCategory || null}
        isOpen={isArticleViewOpen}
        isRead={true}
        onClose={() => setIsArticleViewOpen(false)}
        onMarkAsRead={() => {}} // Not needed for history view
      />
    </main>
  );
}
