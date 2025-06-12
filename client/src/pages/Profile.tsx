import { useState, useEffect } from "react";
import { User, Settings, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalStorage } from "@/lib/storage";
import { User as UserType, Category } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);

  const categories = LocalStorage.getCategories();

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    if (existingUser) {
      setUser(existingUser);
    }
  }, []);

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all your data? This action cannot be undone.")) {
      LocalStorage.clearUser();
      window.location.reload();
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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid gap-6 md:grid-cols-2">
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
            </div>
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

        {/* Data Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Your reading data is stored locally in your browser. You can clear all data if needed.
              </p>
              <Button
                variant="destructive"
                onClick={handleClearData}
                className="w-full"
              >
                <Trash2 className="mr-2" size={16} />
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
