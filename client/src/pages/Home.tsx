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
import { Loader2, Plus, Star, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [todayReadCount, setTodayReadCount] = useState(0);
  const [sharedArticleId, setSharedArticleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("featured");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const categories = LocalStorage.getCategories();

  const { data: recommendedArticles = [], isLoading: isLoadingRecommended } =
    useQuery({
      queryKey: ["/api/articles/recommended", user?.id],
      enabled: !!user,
    });

  const { data: featuredArticles = [], isLoading: isLoadingFeatured } =
    useQuery({
      queryKey: ["/api/featured"],
      enabled: !!user,
    });

  const likeArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/articles/${articleId}/like`, {
        method: "POST",
        body: JSON.stringify({ userId: user?.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to like article");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/articles/recommended"],
      });
      toast({
        title: data.action === "liked" ? "Article liked!" : "Article unliked!",
        description: `${data.likesCount} total likes`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to like article",
        variant: "destructive",
      });
    },
  });

  const featureArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/articles/${articleId}/feature`, {
        method: "POST",
        body: JSON.stringify({ userId: user?.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to feature article");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured"] });
      toast({ title: "Article featured successfully!" });
    },
  });

  const unfeatureArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/articles/${articleId}/feature`, {
        method: "DELETE",
        body: JSON.stringify({ userId: user?.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to unfeature article");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured"] });
      toast({ title: "Article removed from featured!" });
    },
  });

  const resetFeaturedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/articles/featured/reset", {
        method: "POST",
        body: JSON.stringify({ userId: user?.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to reset featured articles");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/featured"] });
      toast({ title: "Featured articles reset!" });
    },
  });

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find((cat) => cat.id === id);
  };

  const isArticleRead = (articleId: string): boolean => {
    if (!user) return false;
    return LocalStorage.isArticleRead(user, articleId);
  };

  const isAdmin = (): boolean => {
    return user?.email === "readdailyco@gmail.com";
  };

  const isFeatured = (articleId: string): boolean => {
    return (featuredArticles as any[]).some(
      (article) => article.id === articleId,
    );
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
    const shared = urlParams.get("shared");
    if (shared) {
      setSharedArticleId(shared);
      LocalStorage.setSharedArticleId(shared);
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      const storedSharedId = LocalStorage.getSharedArticleId();
      if (storedSharedId && LocalStorage.isFirstViewOfSharedArticle()) {
        setSharedArticleId(storedSharedId);
      }
    }
  }, []);

  const startUserSession = async (user: User) => {
    try {
      await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          deviceInfo: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error("Failed to start analytics session:", error);
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

      await fetch("/api/analytics/article-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          articleId: article.id,
          deviceInfo: navigator.userAgent,
        }),
      });

      if (
        sharedArticleId === article.id &&
        LocalStorage.isFirstViewOfSharedArticle()
      ) {
        LocalStorage.markSharedArticleViewed();
      }
    } catch (error) {
      console.error("Error marking article as read:", error);
      toast({
        title: "Error",
        description: "Failed to track reading progress",
        variant: "destructive",
      });
    }
  };

  const handleViewArticle = (article: Article) => {
    const url = `/article/${article.id}`;
    window.open(url, "_blank");
  };

  const handleMarkAsRead = (article: Article) => {
    handleReadArticle(article);
  };

  const handleLikeArticle = (article: Article) => {
    if (!user) return;
    likeArticleMutation.mutate(article.id);
  };

  const handleFeatureArticle = (article: Article) => {
    if (!user || !isAdmin()) return;
    featureArticleMutation.mutate(article.id);
  };

  const handleUnfeatureArticle = (article: Article) => {
    if (!user || !isAdmin()) return;
    unfeatureArticleMutation.mutate(article.id);
  };

  const handleResetFeatured = () => {
    if (!user || !isAdmin()) return;
    resetFeaturedMutation.mutate();
  };

  if (showOnboarding) {
    return (
      <UserOnboarding isOpen={true} onComplete={handleOnboardingComplete} />
    );
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
          <div>
            <p className="text-sm text-gray-600">
              Share what's worth reading today
            </p>
          </div>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="featured">Featured Today</TabsTrigger>
              <TabsTrigger value="shared">Community Shares</TabsTrigger>
            </TabsList>

            {isAdmin() && activeTab === "featured" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFeatured}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <RotateCcw size={14} />
                Reset Featured
              </Button>
            )}
          </div>

          <TabsContent value="featured" className="space-y-6">
            {isLoadingFeatured ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (featuredArticles as any[]).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">
                    No Featured Articles Yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {isAdmin()
                      ? "Add articles to the featured section to showcase the best content."
                      : "Check back soon for today's handpicked articles!"}
                  </p>
                  {!isAdmin() && (
                    <p className="text-sm text-gray-500">
                      In the meantime, share something interesting with the
                      community! 📚
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="text-left">
                  <p className="text-sm text-gray-600">
                    Handpicked articles worth your time
                  </p>
                </div>
                <div className="grid gap-6">
                  {(featuredArticles as any[]).map((article: any) => {
                    const category = getCategoryById(article.categoryId);
                    const displayCategory = category || {
                      id: "general",
                      name: "General",
                      description: "General content",
                    };

                    return (
                      <div key={article.id} className="relative">
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <Star size={12} fill="currentColor" />
                            Featured
                          </div>
                        </div>
                        <ArticleCard
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
                        {isAdmin() && (
                          <div className="absolute top-2 right-2 z-10">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUnfeatureArticle(article)}
                              className="opacity-80 hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared" className="space-y-6">
            {isLoadingRecommended ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (recommendedArticles as any[]).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-semibold mb-2">
                    Be the First to Share!
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Found something fascinating? Don't keep it to yourself!
                  </p>
                  <p className="text-sm text-gray-500">
                    The best discoveries happen when curious minds share their
                    finds ✨
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {(() => {
                  const articles = recommendedArticles as any[];
                  const sharedArticle = sharedArticleId
                    ? articles.find((a) => a.id === sharedArticleId)
                    : null;
                  const otherArticles = articles.filter(
                    (a) => a.id !== sharedArticleId,
                  );

                  return (
                    <>
                      {/* Highlighted shared article */}
                      {sharedArticle && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-blue-600">
                            Shared with You
                          </h3>
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg transform -rotate-1"></div>
                            <div className="relative bg-white rounded-lg shadow-md border-2 border-blue-200">
                              <ArticleCard
                                key={sharedArticle.id}
                                article={sharedArticle}
                                category={
                                  getCategoryById(sharedArticle.categoryId) || {
                                    id: "general",
                                    name: "General",
                                    description: "General content",
                                  }
                                }
                                isRead={isArticleRead(sharedArticle.id)}
                                onReadClick={handleReadArticle}
                                onViewClick={handleViewArticle}
                                onLikeClick={handleLikeArticle}
                                showSocialActions={true}
                                recommenderName={sharedArticle.recommenderName}
                                currentUserId={user?.id}
                              />
                              {isAdmin() && !isFeatured(sharedArticle.id) && (
                                <div className="absolute top-2 right-2 z-10">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleFeatureArticle(sharedArticle)
                                    }
                                    className="opacity-80 hover:opacity-100"
                                  >
                                    <Star size={14} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Other shared articles */}
                      {otherArticles.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-left">
                            <p className="text-sm text-gray-600">
                              Articles discovered and shared by readers like you
                            </p>
                          </div>
                          <div className="grid gap-6">
                            {otherArticles.map((article: any) => {
                              const category = getCategoryById(
                                article.categoryId,
                              );
                              const displayCategory = category || {
                                id: "general",
                                name: "General",
                                description: "General content",
                              };

                              return (
                                <div key={article.id} className="relative">
                                  <ArticleCard
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
                                  {isAdmin() && !isFeatured(article.id) && (
                                    <div className="absolute top-2 right-2 z-10">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleFeatureArticle(article)
                                        }
                                        className="opacity-80 hover:opacity-100"
                                      >
                                        <Star size={14} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
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
          </TabsContent>
        </Tabs>
      </main>

      <SuccessFeedback
        isOpen={showSuccessFeedback}
        onClose={() => setShowSuccessFeedback(false)}
        articleTitle=""
      />
    </div>
  );
}
