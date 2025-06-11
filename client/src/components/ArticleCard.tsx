import { CheckCircle, ArrowRight, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Article, Category } from "@shared/schema";

interface ArticleCardProps {
  article: Article;
  category: Category;
  isRead: boolean;
  onReadClick: (article: Article) => void;
  onViewClick: (article: Article) => void;
}

export function ArticleCard({
  article,
  category,
  isRead,
  onReadClick,
  onViewClick,
}: ArticleCardProps) {
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
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{article.sourceUrl.split("/")[2]}</span>
              <span>•</span>
              <span>Today</span>
            </div>
            {isRead ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewClick(article)}
                className="text-accent hover:text-blue-700 font-medium"
              >
                View Article <ArrowRight className="ml-1" size={16} />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onReadClick(article)}
                className="bg-accent text-white hover:bg-blue-700 font-medium"
              >
                Read Now <ArrowRight className="ml-1" size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
