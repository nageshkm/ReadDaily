import { X, Check, ExternalLink, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Article, Category } from "@shared/schema";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useEffect, useRef } from "react";

interface ArticleViewProps {
  article: Article | null;
  category: Category | null;
  isOpen: boolean;
  isRead: boolean;
  onClose: () => void;
  onMarkAsRead: (article: Article) => void;
  onNextArticle?: () => void;
  hasNextArticle?: boolean;
}

export function ArticleView({
  article,
  category,
  isOpen,
  isRead,
  onClose,
  onMarkAsRead,
  onNextArticle,
  hasNextArticle = false,
}: ArticleViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when article changes
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [article?.id, isOpen]);

  if (!article || !category) return null;

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Article: {article.title}</DialogTitle>
        </VisuallyHidden>
        
        {/* Clean header with just close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <Badge className={getCategoryColor(article.categoryId)} variant="secondary">
              {category.name}
            </Badge>
            <span className="text-sm text-gray-500">
              {article.estimatedReadingTime} min read
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X size={18} />
          </Button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)]">
          <article className="p-4 sm:p-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold mb-6 font-serif leading-tight">
                {article.title}
              </h1>

              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
                <span>{article.sourceUrl?.split("/")[2] || "Unknown"}</span>
                <span>•</span>
                <span>{new Date(article.publishDate).toLocaleDateString()}</span>
                <span>•</span>
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline flex items-center"
                >
                  View Original <ExternalLink className="ml-1" size={14} />
                </a>
              </div>

              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full rounded-lg mb-8"
              />

              <div className="prose prose-lg max-w-none font-serif">
                {article.userCommentary && (
                  <p className="leading-relaxed mb-6 italic text-gray-700">
                    {article.userCommentary}
                  </p>
                )}
                <p className="text-gray-600">
                  Click "View Original" above to read the full article.
                </p>
              </div>

              {/* Clean bottom spacing */}
              <div className="mt-12 pb-8">
              </div>
            </div>
          </article>
        </div>

        {/* Floating Next Article Button - positioned outside scroll area */}
        {hasNextArticle && onNextArticle && (
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-none">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onNextArticle();
              }}
              variant="outline"
              className="bg-white/95 hover:bg-white border-gray-200 text-gray-700 hover:text-gray-900 shadow-lg rounded-full px-4 py-2 sm:px-5 sm:py-2 text-sm backdrop-blur-sm pointer-events-auto"
              size="sm"
            >
              Next Article
              <ArrowRight className="ml-1 sm:ml-2" size={14} />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
