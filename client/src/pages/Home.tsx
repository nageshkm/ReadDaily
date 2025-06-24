import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StreakDisplay } from "@/components/StreakDisplay";
import { ArticleCard } from "@/components/ArticleCard";
import { UserOnboarding } from "@/components/UserOnboarding";

import { LocalStorage } from "@/lib/storage";
import { getTodayString } from "@/lib/utils";
import { decodeHtmlEntities } from "@/lib/html-utils";
import { User, Article, Category } from "@shared/schema";
import { Loader2, Star, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PWANotifications } from "@/components/PWANotifications";
import { ShareButton } from "@/components/ShareButton";
import { SharePromptToast } from "@/components/SharePromptToast";

export default function Home() {
  const [location] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWhatsAppInvite, setShowWhatsAppInvite] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [hasReadArticle, setHasReadArticle] = useState(false);

  const [todayReadCount, setTodayReadCount] = useState(0);
  const [sharedArticleId, setSharedArticleId] = useState<string | null>(null);
  const [prioritySharedArticle, setPrioritySharedArticle] = useState<any | null>(null);


  const { toast } = useToast();
  const queryClient = useQueryClient();
  const categories = LocalStorage.getCategories();

  // FCM token update mutation
  const updateFCMTokenMutation = useMutation({
    mutationFn: async (fcmToken: string) => {
      const response = await fetch("/api/users/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, fcmToken }),
      });
      if (!response.ok) throw new Error("Failed to update FCM token");
      return response.json();
    },
  });

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

  // Fetch shared article details when there's a shared article ID
  const { data: sharedArticleDetails } = useQuery({
    queryKey: [`/api/articles/${sharedArticleId}/details`],
    enabled: !!sharedArticleId && !!user,
  });

  const likeArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/articles/${articleId}/like`, {
        method: "POST",
        body: JSON.stringify({ userId: user?.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to process like/unlike");
      const data = await response.json();
      return { articleId, ...data };
    },
    onMutate: async (articleId: string) => {
      // Optimistic update for instant UI feedback
      await queryClient.cancelQueries({ queryKey: [`/api/articles/${articleId}/details`] });
      
      const previousData = queryClient.getQueryData([`/api/articles/${articleId}/details`]);
      
      queryClient.setQueryData([`/api/articles/${articleId}/details`], (old: any) => {
        if (!old) return old;
        
        const userLiked = old.likes?.some((like: any) => like.userId === user?.id) || false;
        const newLikesCount = userLiked ? Math.max(0, (old.likesCount || 0) - 1) : (old.likesCount || 0) + 1;
        
        return {
          ...old,
          likes: userLiked 
            ? (old.likes || []).filter((like: any) => like.userId !== user?.id)
            : [...(old.likes || []), { userId: user?.id, userName: user?.name }],
          likesCount: newLikesCount
        };
      });
      
      return { previousData };
    },
    onError: (error: any, articleId: string, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData([`/api/articles/${articleId}/details`], context.previousData);
      }
    },
    onSettled: () => {
      // No additional invalidation needed since optimistic update handles UI
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

  // Reset share prompt for admin user
  useEffect(() => {
    if (isAdmin()) {
      localStorage.removeItem('share-prompt-shown');
      setShowSharePrompt(false);
      setHasReadArticle(false);
    }
  }, [user]);

  const isFeatured = (articleId: string): boolean => {
    return (featuredArticles as any[]).some(
      (article) => article.id === articleId,
    );
  };

  useEffect(() => {
    const storedUser = LocalStorage.getUser();
    
    // Check for shared article from URL route parameter or query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sharedFromQuery = urlParams.get("shared");
    const sharedFromRoute = location.startsWith("/share/") ? location.replace("/share/", "") : null;
    const shared = sharedFromRoute || sharedFromQuery;
    
    if (shared) {
      // If there's a shared article but no user, require signup first
      if (!storedUser) {
        setSharedArticleId(shared);
        setShowOnboarding(true);
        return;
      }
      // If user exists, set the shared article for priority display
      setSharedArticleId(shared);
    }
    
    if (storedUser) {
      setUser(storedUser);
      setTodayReadCount(LocalStorage.getTodayReadCount(storedUser));
      startUserSession(storedUser);
      
      // Check if this is a new user's first session for WhatsApp invite
      const whatsAppInviteShown = localStorage.getItem('whatsapp-invite-shown');
      const userJoinDate = new Date(storedUser.joinDate);
      const now = new Date();
      const daysSinceJoin = Math.floor((now.getTime() - userJoinDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show WhatsApp invite if user joined today and hasn't seen it before
      if (daysSinceJoin === 0 && !whatsAppInviteShown) {
        setShowWhatsAppInvite(true);
      }
    } else if (!shared) {
      setShowOnboarding(true);
    }
  }, [location]);

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
    
    // Show WhatsApp invite for new users
    setShowWhatsAppInvite(true);
  };

  const handleWhatsAppInviteDismiss = () => {
    setShowWhatsAppInvite(false);
    localStorage.setItem('whatsapp-invite-shown', 'true');
  };

  const handleSharePromptDismiss = () => {
    setShowSharePrompt(false);
    const today = new Date().toDateString();
    localStorage.setItem('share-prompt-shown', today);
  };

  // Check if share prompt should be shown today
  const shouldShowSharePrompt = () => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('share-prompt-shown');
    return lastShown !== today;
  };

  // Handle scroll detection for share prompt
  useEffect(() => {
    if (!hasReadArticle || !shouldShowSharePrompt() || showSharePrompt) return;

    const handleScroll = () => {
      if (window.scrollY > 100) { // Show after minimal scroll
        setShowSharePrompt(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasReadArticle, showSharePrompt]);

  const handleReadArticle = async (article: Article) => {
    if (!user) return;

    try {
      const updatedUser = LocalStorage.markArticleAsRead(user, article.id);
      setUser(updatedUser);
      setTodayReadCount(LocalStorage.getTodayReadCount(updatedUser));
      
      // Mark that user has read an article for share prompt logic
      setHasReadArticle(true);
      
      // Success feedback removed per user request

      const response = await fetch("/api/analytics/article-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          articleId: article.id,
          deviceInfo: navigator.userAgent,
        }),
      });
      
      if (!response.ok) {
        console.error("Failed to track article read:", response.status, response.statusText);
      } else {
        console.log("Article read tracked successfully:", article.title);
      }

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

  const handleFCMTokenUpdate = (token: string) => {
    if (user) {
      updateFCMTokenMutation.mutate(token);
    }
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
      <PWANotifications user={user} onFCMTokenUpdate={handleFCMTokenUpdate} />
      
      {/* WhatsApp Group Invitation for new users */}
      {showWhatsAppInvite && (
        <div className="bg-background border border-border rounded-lg p-4 mb-6 relative">
          <button
            onClick={handleWhatsAppInviteDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487"/>
            </svg>
            <h3 className="text-sm font-medium">Join WhatsApp Community</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Connect with other readers and share feedback in our community group.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              window.open('https://chat.whatsapp.com/CL3gK1feH8C5GuGnN0CvHI', '_blank');
              handleWhatsAppInviteDismiss();
            }}
            className="w-full"
          >
            <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487"/>
            </svg>
            Join WhatsApp Community
          </Button>
        </div>
      )}
      
      <SharePromptToast 
        isVisible={showSharePrompt}
        onDismiss={handleSharePromptDismiss}
      />
      
      <main className="space-y-8">


        <div className="space-y-8">
          <div className="flex justify-between items-center">
            {isAdmin() && (
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

          {isLoadingFeatured || isLoadingRecommended ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Featured Articles Section */}
              {(featuredArticles as any[]).length > 0 && (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:gap-4">
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
                              Featured Today
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

              {/* Community Articles Section */}
              {(recommendedArticles as any[]).length === 0 && (featuredArticles as any[]).length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <h3 className="text-lg font-semibold mb-2">
                      Be the First to Share!
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Found something fascinating? Don't keep it to yourself!
                    </p>
                    <p className="text-sm text-gray-500">
                      The best discoveries happen when curious minds share their finds
                    </p>
                  </CardContent>
                </Card>
              ) : (recommendedArticles as any[]).length > 0 && (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:gap-4">
                    {(() => {
                      const articles = recommendedArticles as any[];
                      const featuredIds = (featuredArticles as any[]).map(a => a.id);
                      
                      // Filter out featured articles from recommended articles
                      const nonFeaturedArticles = articles.filter(
                        (a) => !featuredIds.includes(a.id)
                      );
                      
                      const sharedArticle = sharedArticleId
                        ? nonFeaturedArticles.find((a) => a.id === sharedArticleId)
                        : null;
                      const otherArticles = nonFeaturedArticles.filter(
                        (a) => a.id !== sharedArticleId,
                      );

                      // Combine shared and other articles
                      const orderedArticles = sharedArticle
                        ? [sharedArticle, ...otherArticles]
                        : nonFeaturedArticles;

                      return orderedArticles.map((article: any) => {
                        const category = getCategoryById(article.categoryId);
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
                            {isAdmin() && (
                              <div className="absolute top-4 right-4 z-10">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFeatureArticle(article)}
                                  className="flex items-center gap-1 bg-white shadow-md hover:bg-yellow-50"
                                >
                                  <Star size={12} />
                                  Feature
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>


    </div>
  );
}
