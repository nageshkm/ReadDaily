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
  const hasMarkedAsRead = useRef(false);

  useEffect(() => {
    if (!isOpen || isRead || !article) {
      hasMarkedAsRead.current = false;
      return;
    }

    const handleScroll = () => {
      const element = scrollRef.current;
      if (!element || hasMarkedAsRead.current) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (isNearBottom) {
        hasMarkedAsRead.current = true;
        onMarkAsRead(article);
      }
    };

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen, isRead, article, onMarkAsRead]);

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>Article: {article.title}</DialogTitle>
        </VisuallyHidden>
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
            <div className="flex items-center space-x-2">
              <Badge className={getCategoryColor(article.categoryId)}>
                {category.name}
              </Badge>
              <span className="text-sm text-gray-500">
                {article.estimatedReadingTime} min read
              </span>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <article className="p-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold mb-4 font-serif">
                {article.title}
              </h1>

              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
                <span>{article.sourceUrl.split("/")[2]}</span>
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
                {article.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="leading-relaxed mb-6">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Bottom Action Bar */}
              <div className="border-t border-gray-200 pt-8 mt-12">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Scroll to the bottom to mark as read automatically.
                  </div>
                  <div className="flex items-center space-x-3">
                    {hasNextArticle && onNextArticle && (
                      <Button
                        onClick={onNextArticle}
                        variant="outline"
                        className="font-medium"
                      >
                        Next Article <ArrowRight className="ml-2" size={16} />
                      </Button>
                    )}
                    {isRead && (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="mr-1" size={14} />
                        Read
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
