import {
  CheckCircle,
  ArrowRight,
  Circle,
  Heart,
  MessageCircle,
  User,
  ExternalLink,
  FileText,
  Code,
  Building,
  Heart as HealthIcon,
  BookOpen,
  Send,
  Share2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Article, Category } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { decodeHtmlEntities } from "@/lib/html-utils";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
      <div
        className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(categoryId)} flex items-center justify-center`}
      >
        {getCategoryIcon(categoryId)}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(categoryId)} flex items-center justify-center animate-pulse`}
        >
          {getCategoryIcon(categoryId)}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
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
  const [isAllCommentsDialogOpen, setIsAllCommentsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch article comments
  const { data: articleDetails } = useQuery({
    queryKey: [`/api/articles/${article.id}/details`],
    enabled: true, // Always fetch comments for all articles
  });

  const typedArticleDetails = articleDetails as
    | {
        article: any;
        comments: Array<{
          id: string;
          content: string;
          userName: string;
          commentedAt: string;
        }>;
        likes: Array<{
          id: string;
          userId: string;
          userName: string;
          likedAt: string;
        }>;
        likesCount: number;
        likesDisplay: string;
        recommender: any;
      }
    | undefined;

  // Comments are fetched and available

  // Utility functions

  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace("www.", "");
    } catch {
      return url;
    }
  };

  const commentMutation = useMutation({
    mutationFn: async (data: {
      content: string;
      userId: string;
      articleId: string;
    }) => {
      const response = await fetch(`/api/articles/${data.articleId}/comment`, {
        method: "POST",
        body: JSON.stringify({ content: data.content, userId: data.userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add comment");
      }
      return response.json();
    },
    onSuccess: () => {
      setComment("");
      setIsCommentDialogOpen(false);
      // Refresh the specific article details to show new comment immediately
      queryClient.invalidateQueries({
        queryKey: [`/api/articles/${article.id}/details`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comment",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/share/${article.id}`;
    copyToClipboard(shareUrl);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "Article link has been copied to clipboard.",
        });
      })
      .catch(() => {
        toast({
          title: "Could not copy link",
          description: "Please copy the link manually.",
          variant: "destructive",
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
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => {
        window.open(article.sourceUrl, "_blank", "noopener,noreferrer");
        onReadClick(article); // Mark as read
      }}
    >
      <div className="flex flex-row">
        <div className="w-24 h-16 sm:w-44 sm:h-32 flex-shrink-0">
          <ArticleImage
            src={article.imageUrl}
            alt={article.title}
            categoryId={article.categoryId}
          />
        </div>
        <div className="flex-1 p-3 sm:p-5 pb-2">
          <div className="flex items-center space-x-2 mb-1 sm:mb-2">
            <Badge className={`${getCategoryColor(article.categoryId)} text-xs px-1 py-0.5 sm:px-2 sm:py-1`}>
              {category.name}
            </Badge>
            <span className="text-xs text-gray-500">
              {article.estimatedReadingTime} min
            </span>
            {isRead ? (
              <div className="flex items-center space-x-1">
                <CheckCircle className="text-success text-sm" size={12} />
                <span className="text-xs text-success font-medium hidden sm:inline">Read</span>
              </div>
            ) : (
              <Circle
                className="text-accent fill-accent animate-pulse"
                size={6}
              />
            )}
          </div>

          <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 line-clamp-2">
            {decodeHtmlEntities(article.title)}
          </h3>

          {/* Source URL as domain */}
          <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">
            {extractDomain(article.sourceUrl)}
          </p>

          {/* User commentary as description - hidden on mobile for more compact view */}
          {article.userCommentary && (
            <p className="hidden sm:block text-gray-600 mb-3 line-clamp-2 text-sm italic">
              "{article.userCommentary}"
            </p>
          )}

          {/* Recommender info */}
          {recommenderName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 sm:mb-2">
              <User className="h-3 w-3" />
              <span className="truncate">Shared by {recommenderName}</span>
              {article.recommendedAt && (
                <span className="hidden sm:inline">• {formatDate(article.recommendedAt)}</span>
              )}
            </div>
          )}

          {/* Social actions */}
          {showSocialActions && (
            <div
              className="flex items-center gap-2 sm:gap-4 mb-1 sm:mb-2 pb-1 sm:pb-2 border-b"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLikeClick?.(article)}
                className={`flex items-center gap-1 hover:text-red-500 p-1 sm:px-3 sm:py-2 h-auto ${
                  typedArticleDetails?.likes?.some(
                    (like) => like.userId === currentUserId,
                  )
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                <Heart
                  className={`h-3 w-3 sm:h-4 sm:w-4 ${
                    typedArticleDetails?.likes?.some(
                      (like) => like.userId === currentUserId,
                    )
                      ? "fill-current"
                      : ""
                  }`}
                />
                <span className="text-xs sm:text-sm">
                  {typedArticleDetails?.likesCount || article.likesCount || 0}
                </span>
              </Button>
              <Dialog
                open={isCommentDialogOpen}
                onOpenChange={setIsCommentDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-muted-foreground p-1 sm:px-3 sm:py-2 h-auto"
                  >
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline text-xs sm:text-sm">Comment</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Comment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        {article.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {article.userCommentary ||
                          "Share your thoughts about this article..."}
                      </p>
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
                              articleId: article.id,
                            });
                          }
                        }}
                        disabled={!comment.trim() || commentMutation.isPending}
                      >
                        {commentMutation.isPending
                          ? "Posting..."
                          : "Post Comment"}
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
                className="flex items-center gap-1 text-muted-foreground p-1 sm:px-3 sm:py-2 h-auto"
              >
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs sm:text-sm">Share</span>
              </Button>
            </div>
          )}

          {/* Likes display - hidden for now */}
          {false && typedArticleDetails?.likesDisplay && (
            <div
              className="text-xs text-muted-foreground mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {typedArticleDetails.likesDisplay}
            </div>
          )}

          {/* Comments display - always show if comments exist */}
          {typedArticleDetails?.comments &&
            typedArticleDetails.comments.length > 0 && (
              <div
                className="mt-4 pt-3 border-t"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="text-sm font-medium mb-2">
                  Comments ({typedArticleDetails.comments.length})
                </h4>
                <div className="space-y-2">
                  {typedArticleDetails.comments
                    .slice(0, 2)
                    .map((comment: any) => (
                      <div
                        key={comment.id}
                        className="text-xs bg-gray-50 p-2 rounded"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-gray-600">
                            {comment.userName || "Anonymous"}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">
                            {formatDate(comment.commentedAt)}
                          </span>
                        </div>
                        <p className="text-gray-700 italic text-sm">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  {typedArticleDetails.comments.length > 2 && (
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                      onClick={() => setIsAllCommentsDialogOpen(true)}
                    >
                      See more comments (
                      {typedArticleDetails.comments.length - 2} more)
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* All Comments Dialog */}
      <Dialog
        open={isAllCommentsDialogOpen}
        onOpenChange={setIsAllCommentsDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Comments - {article.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {typedArticleDetails &&
              "comments" in typedArticleDetails &&
              typedArticleDetails.comments.map((comment: any) => (
                <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-600 text-sm">
                      {comment.userName || "Anonymous"}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 text-xs">
                      {formatDate(comment.commentedAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm italic">
                    {comment.content}
                  </p>
                </div>
              ))}
            {(!typedArticleDetails ||
              !("comments" in typedArticleDetails) ||
              typedArticleDetails.comments.length === 0) && (
              <p className="text-gray-500 text-center py-4">No comments yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
