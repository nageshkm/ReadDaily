import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Clock, User, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { LocalStorage } from "@/lib/storage";
import { useEffect } from "react";

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function ArticleShare() {
  const [location, setLocation] = useLocation();
  
  // Extract ID from both /article/{id} and /share/{id} routes
  const id = location.startsWith('/article/') 
    ? location.replace('/article/', '') 
    : location.replace('/share/', '');

  // Store shared article ID in localStorage for persistence through OAuth
  useEffect(() => {
    if (id && location.startsWith('/share/')) {
      LocalStorage.setSharedArticleId(id);
    }
  }, [id, location]);

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['/api/articles', id],
    enabled: !!id
  });

  // Type guard to ensure article has all required properties
  const typedArticle = article as {
    id: string;
    title: string;
    content: string;
    summary: string;
    categoryId: string;
    sourceUrl: string;
    imageUrl: string;
    estimatedReadingTime: number;
    publishDate: string;
    featured: boolean;
    recommendedBy: string;
    recommendedAt: string;
    userCommentary: string;
    likesCount: number;
    recommenderName: string;
  } | undefined;

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !typedArticle) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const category = categories.find(cat => cat.id === typedArticle.categoryId);

  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case "tech":
        return "bg-blue-100 text-blue-800";
      case "business":
        return "bg-green-100 text-green-800";
      case "health":
        return "bg-red-100 text-red-800";
      case "science":
        return "bg-purple-100 text-purple-800";
      case "education":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to ReadDaily
            </Button>
            <div className="text-sm text-gray-500">
              Shared on ReadDaily
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto p-4">
        <Card className="overflow-hidden">
          {/* Article Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={getCategoryColor(typedArticle.categoryId)}>
                {category?.name || 'General'}
              </Badge>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                {typedArticle.estimatedReadingTime} min read
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
              {typedArticle.title}
            </h1>

            {typedArticle.summary && (
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                {typedArticle.summary}
              </p>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                {typedArticle.recommenderName && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Shared by {typedArticle.recommenderName}
                  </div>
                )}
                {typedArticle.publishDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(typedArticle.publishDate)}
                  </div>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(typedArticle.sourceUrl, '_blank')}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Read Original
              </Button>
            </div>
          </div>

          {/* Article Image */}
          {typedArticle.imageUrl && (
            <div className="px-6 py-4">
              <img 
                src={typedArticle.imageUrl} 
                alt={typedArticle.title}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Article Content */}
          <div className="p-6">
            {typedArticle.userCommentary && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Why {typedArticle.recommenderName} shared this:</h3>
                <p className="text-blue-800">{typedArticle.userCommentary}</p>
              </div>
            )}

            <div className="prose max-w-none">
              {typedArticle.content ? (
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: typedArticle.content }}
                />
              ) : (
                <p className="text-gray-600 italic">
                  Content preview not available. Click "Read Original" to view the full article.
                </p>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gray-50 p-6 text-center border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Want to discover more great articles?
            </h3>
            <p className="text-gray-600 mb-4">
              Join ReadDaily to get personalized article recommendations and build your reading habit.
            </p>
            <Button onClick={() => setLocation("/")}>
              Explore ReadDaily
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}