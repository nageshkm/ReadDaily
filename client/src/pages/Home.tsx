import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleView } from "@/components/ArticleView";
import { UserOnboarding } from "@/components/UserOnboarding";
import { ShareArticleForm } from "@/components/ShareArticleForm";

import { SuccessFeedback } from "@/components/SuccessFeedback";

import { LocalStorage } from "@/lib/storage";
import { getTodayString } from "@/lib/utils";
import { User, Article, Category } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("recommended");
  const [todayReadCount, setTodayReadCount] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const categories = LocalStorage.getCategories();

  const { data: myArticles = [], isLoading: isLoadingMy } = useQuery({
    queryKey: ['/api/articles/my', user?.id],
    enabled: !!user,
  });

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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to like article");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/articles/recommended', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to like article",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

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
    LocalStorage.saveUser(newUser);
    setUser(newUser);
    setTodayReadCount(LocalStorage.getTodayReadCount(newUser));
    setShowOnboarding(false);
  };

  const handleReadArticle = (article: Article) => {
    if (!user) return;
    
    const updatedUser = LocalStorage.markArticleAsRead(user, article.id);
    setUser(updatedUser);
    setTodayReadCount(LocalStorage.getTodayReadCount(updatedUser));
    setSelectedArticle(article);
    setIsArticleViewOpen(true);
  };

  const handleViewArticle = (article: Article) => {
    setSelectedArticle(article);
    setIsArticleViewOpen(true);
  };

  const handleMarkAsRead = (article: Article) => {
    if (!user) return;
    
    const updatedUser = LocalStorage.markArticleAsRead(user, article.id);
    setUser(updatedUser);
    setTodayReadCount(LocalStorage.getTodayReadCount(updatedUser));
    setShowSuccessFeedback(true);
  };

  const handleLikeArticle = (article: Article) => {
    if (!user) return;
    likeArticleMutation.mutate(article.id);
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

  const selectedCategory = selectedArticle 
    ? getCategoryById(selectedArticle.categoryId) || null
    : null;

  const isSelectedRead = selectedArticle ? isArticleRead(selectedArticle.id) : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <StreakDisplay user={user} todayReadCount={todayReadCount} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Articles</h2>
          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Share Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <ShareArticleForm 
                user={user} 
                onSuccess={() => setIsShareDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recommended">Recommended Articles</TabsTrigger>
            <TabsTrigger value="my">My Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="space-y-6">
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
              <div className="grid gap-6">
                {(recommendedArticles as any[]).map((article: any) => {
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
                      onLikeClick={handleLikeArticle}
                      showSocialActions={true}
                      recommenderName={article.recommenderName}
                      currentUserId={user?.id}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="space-y-6">
            {isLoadingMy ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (myArticles as any[]).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">You haven't shared any articles yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Share Article" to add your first article.
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
          </TabsContent>
        </Tabs>
      </main>

      <ArticleView
        article={selectedArticle}
        category={selectedCategory}
        isOpen={isArticleViewOpen}
        isRead={isSelectedRead}
        onClose={() => setIsArticleViewOpen(false)}
        onMarkAsRead={handleMarkAsRead}
      />

      <SuccessFeedback
        isOpen={showSuccessFeedback}
        onClose={() => setShowSuccessFeedback(false)}
        articleTitle={selectedArticle?.title || ""}
      />
    </div>
  );
}