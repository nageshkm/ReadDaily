import { X, Check, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Article, Category } from "@shared/schema";

interface ArticleViewProps {
  article: Article | null;
  category: Category | null;
  isOpen: boolean;
  isRead: boolean;
  onClose: () => void;
  onMarkAsRead: (article: Article) => void;
}

export function ArticleView({
  article,
  category,
  isOpen,
  isRead,
  onClose,
  onMarkAsRead,
}: ArticleViewProps) {
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
          {!isRead && (
            <Button
              onClick={() => onMarkAsRead(article)}
              className="bg-success text-white hover:bg-green-700 font-medium"
            >
              <Check className="mr-2" size={16} />
              Mark as Read
            </Button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
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
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
