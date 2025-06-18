import { CheckCircle, ArrowRight, Circle, Heart, MessageCircle, User, ExternalLink, FileText, Code, Building, Heart as HealthIcon, BookOpen, Send, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Article, Category } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ArticleImageProps {
  src: string;
  alt: string;
  categoryId: string;
}

function ArticleImage({ src, alt, categoryId }: ArticleImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case "technology":
        return <Code className="h-12 w-12 text-blue-500" />;
      case "business":
        return <Building className="h-12 w-12 text-purple-500" />;
      case "health":
        return <HealthIcon className="h-12 w-12 text-pink-500" />;
      case "science":
        return <BookOpen className="h-12 w-12 text-green-500" />;
      default:
        return <FileText className="h-12 w-12 text-gray-500" />;
    }
  };

  const getCategoryGradient = (categoryId: string) => {
    switch (categoryId) {
      case "technology":
        return "from-blue-100 to-blue-200";
      case "business":
        return "from-purple-100 to-purple-200";
      case "health":
        return "from-pink-100 to-pink-200";
      case "science":
        return "from-green-100 to-green-200";
      default:
        return "from-gray-100 to-gray-200";
    }
  };

  if (!src || imageError) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(categoryId)} flex items-center justify-center`}>
        {getCategoryIcon(categoryId)}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(categoryId)} flex items-center justify-center animate-pulse`}>
          {getCategoryIcon(categoryId)}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}

interface ArticleCardProps {
  article: Article & {
    recommendedBy?: string;
    recommendedAt?: string;
    userCommentary?: string;
    likesCount?: number;
  };
  category: Category;
  isRead: boolean;
  onReadClick: (article: Article) => void;
  onViewClick: (article: Article) => void;
  onLikeClick?: (article: Article) => void;
  showSocialActions?: boolean;
  recommenderName?: string;
  currentUserId?: string;
}

export function ArticleCard({
  article,
  category,
  isRead,
  onReadClick,
  onViewClick,
  onLikeClick,
  showSocialActions = false,
  recommenderName,
  currentUserId,
}: ArticleCardProps) {
  const [comment, setComment] = useState("");
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; userId: string; articleId: string }) => {
      const response = await fetch(`/api/articles/${data.articleId}/comment`, {
        method: "POST",
        body: JSON.stringify({ content: data.content, userId: data.userId }),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add comment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment added!",
        description: "Your comment has been posted."
      });
      setComment("");
      setIsCommentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/articles/recommended'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comment",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/article/${article.id}`;
    const shareText = `Check out this article on ReadDaily: ${article.title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled sharing or share failed
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied!",
        description: "Article link has been copied to clipboard."
      });
    }).catch(() => {
      toast({
        title: "Could not copy link",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    });
  };
  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case "tech":
        return "bg-blue-100 text-blue-800";
      case "science":
        return "bg-green-100 text-green-800";
      case "business":
        return "bg-purple-100 text-purple-800";
      case "health":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 h-48 sm:h-auto">
          <ArticleImage 
            src={article.imageUrl} 
            alt={article.title}
            categoryId={article.categoryId}
          />
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-center space-x-2 mb-2">
            <Badge className={getCategoryColor(article.categoryId)}>
              {category.name}
            </Badge>
            <span className="text-xs text-gray-500">
              {article.estimatedReadingTime} min read
            </span>
            {isRead ? (
              <div className="flex items-center space-x-1">
                <CheckCircle className="text-success text-sm" size={16} />
                <span className="text-xs text-success font-medium">Read</span>
              </div>
            ) : (
              <Circle className="text-accent fill-accent animate-pulse" size={8} />
            )}
          </div>
          
          <h3 className="text-xl font-semibold mb-2 line-clamp-2">
            {article.title}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-3">{article.summary}</p>
          
          {/* User commentary */}
          {article.userCommentary && (
            <div className="mb-3 p-3 bg-muted/50 rounded-md">
              <p className="text-sm italic text-foreground/80">
                "{article.userCommentary}"
              </p>
            </div>
          )}

          {/* Recommender info */}
          {recommenderName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <User className="h-3 w-3" />
              <span>Shared by {recommenderName}</span>
              {article.recommendedAt && (
                <span>• {formatDate(article.recommendedAt)}</span>
              )}
            </div>
          )}

          {/* Social actions */}
          {showSocialActions && (
            <div className="flex items-center gap-4 mb-3 pb-3 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLikeClick?.(article)}
                className="flex items-center gap-1 text-muted-foreground hover:text-red-500"
              >
                <Heart className="h-4 w-4" />
                <span>{article.likesCount || 0}</span>
              </Button>
              <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-muted-foreground"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Comment</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Comment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">{article.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                    </div>
                    <Textarea
                      placeholder="Share your thoughts about this article..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCommentDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (comment.trim() && currentUserId) {
                            commentMutation.mutate({
                              content: comment.trim(),
                              userId: currentUserId,
                              articleId: article.id
                            });
                          }
                        }}
                        disabled={!comment.trim() || commentMutation.isPending}
                      >
                        {commentMutation.isPending ? "Posting..." : "Post Comment"}
                        <Send className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-1 text-muted-foreground"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{article.sourceUrl?.split("/")[2] || "Unknown"}</span>
              <span>•</span>
              <span>Today</span>
            </div>
            {isRead ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(article.sourceUrl, '_blank', 'noopener,noreferrer')}
                className="text-accent hover:text-blue-700 font-medium"
              >
                View Article <ExternalLink className="ml-1" size={16} />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
                  onReadClick(article); // Mark as read
                }}
                className="bg-accent text-white hover:bg-blue-700 font-medium"
              >
                Read Now <ExternalLink className="ml-1" size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
