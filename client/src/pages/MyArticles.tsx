import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArticleCard } from "@/components/ArticleCard";
import { ShareArticleForm } from "@/components/ShareArticleForm";
import { LocalStorage } from "@/lib/storage";
import { User, Article, Category } from "@shared/schema";
import { Loader2, ArrowLeft, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function MyArticles() {
  const [user, setUser] = useState<User | null>(null);
  const categories = LocalStorage.getCategories();

  const { data: myArticles = [], isLoading } = useQuery({
    queryKey: ['/api/articles/my', user?.id],
    enabled: !!user,
  });

  useEffect(() => {
    const storedUser = LocalStorage.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const isArticleRead = (articleId: string): boolean => {
    if (!user) return false;
    return LocalStorage.isArticleRead(user, articleId);
  };

  const handleReadArticle = async (article: Article) => {
    if (!user) return;
    const updatedUser = LocalStorage.markArticleAsRead(user, article.id);
    setUser(updatedUser);
  };

  const handleViewArticle = (article: Article) => {
    const url = `/article/${article.id}`;
    window.open(url, '_blank');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Profile
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">My Articles</h1>
      </div>

      {/* Share Article Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 size={20} />
            Share Article
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShareArticleForm user={user!} />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (myArticles as any[]).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">You haven't shared any articles yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Use the form above to share your first article with the community.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {(myArticles as any[]).map((article: any) => {
            const category = getCategoryById(article.categoryId);
            const isRead = isArticleRead(article.id);
            
            // If category not found, use a default category to ensure article still displays
            const displayCategory = category || { id: "general", name: "General", description: "General content" };
            
            return (
              <ArticleCard
                key={article.id}
                article={article}
                category={displayCategory}
                isRead={isRead}
                onReadClick={handleReadArticle}
                onViewClick={handleViewArticle}
                showSocialActions={false}
                currentUserId={user?.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}