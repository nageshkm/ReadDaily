import { useState, useEffect } from "react";
import { User, Settings, Trash2, Activity, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalStorage } from "@/lib/storage";
import { User as UserType, Category } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [, setLocation] = useLocation();

  const categories = LocalStorage.getCategories();

  // Fetch user analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/user', user?.id],
    enabled: !!user?.id,
  }) as { data: any, isLoading: boolean };

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    setUser(existingUser);
  }, []);

  const handleSignOut = async () => {
    try {
      // Sign out and end sessions on server
      if (user?.id) {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
      }
      
      // Clear local storage and session
      LocalStorage.clearUser();
      localStorage.removeItem('sessionId');
      
      // Clear local state
      setUser(null);
      
      // Navigate to landing page
      setLocation('/landing');
    } catch (error) {
      console.error("Error signing out:", error);
      // Still clear local storage even if server signout fails
      LocalStorage.clearUser();
      localStorage.removeItem('sessionId');
      setUser(null);
      setLocation('/landing');
    }
  };

  const getUserCategories = (): Category[] => {
    if (!user) return [];
    return categories.filter(cat => user.preferences.categories.includes(cat.id));
  };

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Please complete onboarding first.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User size={20} />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-medium">
                  {getInitials(user.name)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{user.name}</h3>
                <p className="text-gray-600">
                  Member since {new Date(user.joinDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Last active:</strong> {new Date(user.lastActive).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Articles read:</strong> {user.readArticles.length}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 size={20} />
              <span>Your Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="text-center py-4">Loading analytics...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analytics?.sessions?.total || 0}
                    </div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(analytics?.sessions?.totalTimeMinutes || 0)}m
                    </div>
                    <p className="text-sm text-gray-600">Time Spent</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analytics?.articles?.totalReads || 0}
                    </div>
                    <p className="text-sm text-gray-600">Articles Read</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analytics?.articles?.uniqueArticles || 0}
                    </div>
                    <p className="text-sm text-gray-600">Unique Articles</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reading Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Reading Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {user.streakData.currentStreak}
                </div>
                <p className="text-sm text-gray-600">Current Streak</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {user.streakData.longestStreak}
                </div>
                <p className="text-sm text-gray-600">Longest Streak</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {user.readArticles.length}
                </div>
                <p className="text-sm text-gray-600">Total Articles</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(user.readArticles.length * 5)} {/* Assuming 5min avg */}
                </div>
                <p className="text-sm text-gray-600">Minutes Read</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings size={20} />
              <span>Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Interested Categories
              </h4>
              <div className="flex flex-wrap gap-2">
                {getUserCategories().map((category) => (
                  <Badge key={category.id} variant="secondary">
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Sign out of your account. Your reading data will be saved and available when you sign back in.
              </p>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
              >
                <User className="mr-2" size={16} />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
