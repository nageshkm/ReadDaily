import { useState, useEffect } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleView } from "@/components/ArticleView";
import { LocalStorage } from "@/lib/storage";
import { User, Article, Category } from "@shared/schema";

export default function History() {
  const [user, setUser] = useState<User | null>(null);
  const [readArticles, setReadArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);

  const categories = LocalStorage.getCategories();
  const allArticles = LocalStorage.getArticles();

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    if (existingUser) {
      setUser(existingUser);
      
      // Get articles that user has read
      const userReadArticleIds = existingUser.readArticles.map(ra => ra.articleId);
      const userReadArticles = allArticles.filter(article => 
        userReadArticleIds.includes(article.id)
      );
      
      // Sort by read date (most recent first)
      const sortedArticles = userReadArticles.sort((a, b) => {
        const dateA = existingUser.readArticles.find(ra => ra.articleId === a.id)?.readDate || '';
        const dateB = existingUser.readArticles.find(ra => ra.articleId === b.id)?.readDate || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      setReadArticles(sortedArticles);
    }
  }, []);

  const handleViewArticle = (article: Article) => {
    setSelectedArticle(article);
    setIsArticleViewOpen(true);
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  const getReadDateForArticle = (articleId: string): string => {
    if (!user) return '';
    const readArticle = user.readArticles.find(ra => ra.articleId === articleId);
    return readArticle?.readDate || '';
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
        {readArticles.map((article) => {
          const category = getCategoryById(article.categoryId);
          if (!category) return null;

          return (
            <div key={article.id} className="relative">
              <ArticleCard
                article={article}
                category={category}
                isRead={true}
                onReadClick={() => {}} // Not needed for history view
                onViewClick={handleViewArticle}
              />
              <div className="absolute top-4 right-4 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                Read on {new Date(getReadDateForArticle(article.id)).toLocaleDateString()}
              </div>
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
        category={selectedCategory}
        isOpen={isArticleViewOpen}
        isRead={true}
        onClose={() => setIsArticleViewOpen(false)}
        onMarkAsRead={() => {}} // Not needed for history view
      />
    </main>
  );
}
