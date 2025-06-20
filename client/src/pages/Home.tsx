import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ArticleCard } from "@/components/ArticleCard";
import { UserOnboarding } from "@/components/UserOnboarding";
import { ShareArticleForm } from "@/components/ShareArticleForm";
import { SuccessFeedback } from "@/components/SuccessFeedback";
import { LocalStorage } from "@/lib/storage";
import { getTodayString } from "@/lib/utils";
import { decodeHtmlEntities } from "@/lib/html-utils";
import { User, Article, Category } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [todayReadCount, setTodayReadCount] = useState(0);
  const [sharedArticleId, setSharedArticleId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const categories = LocalStorage.getCategories();

  const { data: recommendedArticles = [], isLoading: isLoadingRecommended } = useQuery({
    queryKey: ['/api/articles/recommended', user?.id],
    enabled: !!user,
  });

  const likeArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/articles/${articleId}/like`, {
        method: "POST",
        body: JSON.stringify({ userId: user?.id }),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error('Failed to like article');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles/recommended'] });
    }
  });

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const isArticleRead = (articleId: string): boolean => {
    if (!user) return false;
    return LocalStorage.isArticleRead(user, articleId);
  };

  useEffect(() => {
    const storedUser = LocalStorage.getUser();
    if (storedUser) {
      setUser(storedUser);
      setTodayReadCount(LocalStorage.getTodayReadCount(storedUser));
    } else {
      setShowOnboarding(true);
    }

    // Check for shared article in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shared = urlParams.get('shared');
    if (shared) {
      setSharedArticleId(shared);
      LocalStorage.setSharedArticleId(shared);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const storedSharedId = LocalStorage.getSharedArticleId();
      if (storedSharedId && LocalStorage.isFirstViewOfSharedArticle()) {
        setSharedArticleId(storedSharedId);
      }
    }
  }, []);

  const startUserSession = async (user: User) => {
    try {
      await fetch('/api/analytics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          deviceInfo: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }
  };

  const handleOnboardingComplete = (newUser: User) => {
    setUser(newUser);
    setShowOnboarding(false);
    startUserSession(newUser);
  };

  const handleReadArticle = async (article: Article) => {
    if (!user) return;

    try {
      const updatedUser = LocalStorage.markArticleAsRead(user, article.id);
      setUser(updatedUser);
      setTodayReadCount(LocalStorage.getTodayReadCount(updatedUser));
      setShowSuccessFeedback(true);

      await fetch('/api/analytics/article-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          articleId: article.id,
          deviceInfo: navigator.userAgent,
        }),
      });

      if (sharedArticleId === article.id && LocalStorage.isFirstViewOfSharedArticle()) {
        LocalStorage.markSharedArticleViewed();
      }
    } catch (error) {
      console.error('Error marking article as read:', error);
      toast({
        title: "Error",
        description: "Failed to track reading progress",
        variant: "destructive",
      });
    }
  };

  const handleViewArticle = (article: Article) => {
    const url = `/article/${article.id}`;
    window.open(url, '_blank');
  };

  const handleMarkAsRead = (article: Article) => {
    handleReadArticle(article);
  };

  const handleLikeArticle = (article: Article) => {
    if (!user) return;
    likeArticleMutation.mutate(article.id);
  };

  if (showOnboarding) {
    return <UserOnboarding isOpen={true} onComplete={handleOnboardingComplete} />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <main className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Shared Articles</h2>
          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} />
                Share Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <ShareArticleForm 
                user={user} 
                onSuccess={() => setIsShareDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {isLoadingRecommended ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (recommendedArticles as any[]).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No recommended articles yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Articles shared by other users will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                const articles = recommendedArticles as any[];
                const sharedArticle = sharedArticleId ? articles.find(a => a.id === sharedArticleId) : null;
                const otherArticles = articles.filter(a => a.id !== sharedArticleId);
                
                return (
                  <>
                    {/* Highlighted shared article */}
                    {sharedArticle && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-600">Shared with You</h3>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg transform -rotate-1"></div>
                          <div className="relative bg-white rounded-lg shadow-md border-2 border-blue-200">
                            <ArticleCard
                              key={sharedArticle.id}
                              article={sharedArticle}
                              category={getCategoryById(sharedArticle.categoryId) || { id: "general", name: "General", description: "General content" }}
                              isRead={isArticleRead(sharedArticle.id)}
                              onReadClick={handleReadArticle}
                              onViewClick={handleViewArticle}
                              onLikeClick={handleLikeArticle}
                              showSocialActions={true}
                              recommenderName={sharedArticle.recommenderName}
                              currentUserId={user?.id}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Other recommended articles */}
                    {otherArticles.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Recommended for You</h3>
                        <div className="grid gap-6">
                          {otherArticles.map((article: any) => {
                            const category = getCategoryById(article.categoryId);
                            const displayCategory = category || { id: "general", name: "General", description: "General content" };
                            
                            return (
                              <ArticleCard
                                key={article.id}
                                article={article}
                                category={displayCategory}
                                isRead={isArticleRead(article.id)}
                                onReadClick={handleReadArticle}
                                onViewClick={handleViewArticle}
                                onLikeClick={handleLikeArticle}
                                showSocialActions={true}
                                recommenderName={article.recommenderName}
                                currentUserId={user?.id}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      <SuccessFeedback
        isOpen={showSuccessFeedback}
        onClose={() => setShowSuccessFeedback(false)}
        articleTitle=""
      />
    </div>
  );
}