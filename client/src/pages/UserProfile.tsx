import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ArticleCard } from "../components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, BookOpen, User, Calendar } from "lucide-react";
import { formatDate } from "../lib/utils";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActive: string;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastReadDate: string;
  };
  readArticles: any[];
  articlesShared: string[];
}

export function UserProfile() {
  const { userName } = useParams();
  const [activeTab, setActiveTab] = useState("read");

  // Fetch user's read articles
  const { data: readArticles = [], isLoading: readLoading } = useQuery({
    queryKey: [`/api/users/${userName}/read-articles`],
    enabled: !!userName
  });

  // Fetch user's liked articles
  const { data: likedArticles = [], isLoading: likedLoading } = useQuery({
    queryKey: [`/api/users/${userName}/liked-articles`],
    enabled: !!userName
  });

  // Fetch all users to get user profile data
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users']
  });

  const userProfile = users.find((user: UserProfileData) => user.name === userName);

  if (!userName) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Profile</h1>
          <p className="text-gray-600">No user specified</p>
        </div>
      </div>
    );
  }

  const formatDateString = (dateString: string) => {
    try {
      return formatDate(dateString);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* User Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{userName}</CardTitle>
                {userProfile && (
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Joined {formatDateString(userProfile.joinDate)}
                    </div>
                    <Badge variant="secondary">
                      {userProfile.streakData.currentStreak} day streak
                    </Badge>
                    <Badge variant="outline">
                      {userProfile.articlesShared.length} articles shared
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Articles Read</p>
                  <p className="text-2xl font-bold">{readArticles.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Articles Liked</p>
                  <p className="text-2xl font-bold">{likedArticles.length}</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Longest Streak</p>
                  <p className="text-2xl font-bold">
                    {userProfile?.streakData.longestStreak || 0}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">🔥</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Articles Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="read">
              <BookOpen className="w-4 h-4 mr-2" />
              Read Articles ({readArticles.length})
            </TabsTrigger>
            <TabsTrigger value="liked">
              <Heart className="w-4 h-4 mr-2" />
              Liked Articles ({likedArticles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="read" className="mt-6">
            {readLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading read articles...</p>
              </div>
            ) : readArticles.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Articles that {userName} has read, most recent first
                </p>
                <div className="grid gap-6">
                  {readArticles.map((article: any) => (
                    <div key={article.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{article.title}</h3>
                        <Badge variant="outline">
                          Read {formatDateString(article.readAt)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Category: {article.categoryId}</span>
                        <span>{article.estimatedReadingTime} min read</span>
                        {article.likesCount > 0 && (
                          <span className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {article.likesCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(article.sourceUrl, '_blank')}
                        >
                          Read Article
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">{userName} hasn't read any articles yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked" className="mt-6">
            {likedLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading liked articles...</p>
              </div>
            ) : likedArticles.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Articles that {userName} has liked, most recent first
                </p>
                <div className="grid gap-6">
                  {likedArticles.map((article: any) => (
                    <div key={article.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{article.title}</h3>
                        <Badge variant="outline" className="text-red-600">
                          <Heart className="w-3 h-3 mr-1" />
                          Liked {formatDateString(article.likedAt)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Category: {article.categoryId}</span>
                        <span>{article.estimatedReadingTime} min read</span>
                        {article.likesCount > 0 && (
                          <span className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {article.likesCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(article.sourceUrl, '_blank')}
                        >
                          Read Article
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">{userName} hasn't liked any articles yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}