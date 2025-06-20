import { BookOpen, User as UserIcon, Settings, Activity, BarChart3, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { User, Category } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalStorage } from "@/lib/storage";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  const categories = LocalStorage.getCategories();

  // Fetch user analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/user', currentUser?.id],
    enabled: !!currentUser?.id,
  }) as { data: any, isLoading: boolean };

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const isActive = (path: string) => {
    if (path === "/today" && (location === "/" || location === "/today")) return true;
    if (path !== "/today" && location.startsWith(path)) return true;
    return false;
  };

  const handleSignOut = async () => {
    try {
      if (currentUser?.id) {
        await fetch('/api/auth/signout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      }
      
      LocalStorage.clearUser();
      localStorage.removeItem('sessionId');
      setCurrentUser(null);
      setLocation('/landing');
    } catch (error) {
      console.error("Error signing out:", error);
      LocalStorage.clearUser();
      localStorage.removeItem('sessionId');
      setCurrentUser(null);
      setLocation('/landing');
    }
  };

  const getUserCategories = (): Category[] => {
    if (!currentUser) return [];
    return categories.filter(cat => currentUser.preferences.categories.includes(cat.id));
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="text-accent text-xl" size={24} />
              <h1 className="text-xl font-semibold">ReadDaily</h1>
            </Link>
          </div>
          
          <nav className="hidden sm:flex items-center space-x-6">
            <Link href="/today">
              <span className={`transition-colors pb-1 ${
                isActive("/today")
                  ? "text-accent font-medium border-b-2 border-accent"
                  : "text-gray-600 hover:text-primary"
              }`}>
                Today
              </span>
            </Link>
            <Link href="/history">
              <span className={`transition-colors pb-1 ${
                isActive("/history")
                  ? "text-accent font-medium border-b-2 border-accent"
                  : "text-gray-600 hover:text-primary"
              }`}>
                History
              </span>
            </Link>
          </nav>
          
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {getInitials(currentUser.name)}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {currentUser.name}
                  </span>
                  <ChevronDown size={16} className="hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="max-h-[80vh] overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* User Profile Header */}
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {getInitials(currentUser.name)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{currentUser.name}</h2>
                        <p className="text-gray-500">{currentUser.email}</p>
                        <p className="text-sm text-gray-400">
                          Joined {new Date(currentUser.joinDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Reading Stats Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Activity size={20} />
                          <span>Reading Stats</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-accent">
                              {currentUser.streakData.currentStreak}
                            </div>
                            <div className="text-sm text-gray-600">Current Streak</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-accent">
                              {currentUser.streakData.longestStreak}
                            </div>
                            <div className="text-sm text-gray-600">Best Streak</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-accent">
                              {currentUser.readArticles.length}
                            </div>
                            <div className="text-sm text-gray-600">Articles Read</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-accent">
                              {LocalStorage.getTodayReadCount(currentUser)}
                            </div>
                            <div className="text-sm text-gray-600">Today</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Analytics Card */}
                    {!analyticsLoading && analytics && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 size={20} />
                            <span>Analytics</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-accent">
                                {analytics.totalSessions || 0}
                              </div>
                              <div className="text-sm text-gray-600">Total Sessions</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-accent">
                                {analytics.totalReadingTime ? Math.round(analytics.totalReadingTime / 60) : 0}m
                              </div>
                              <div className="text-sm text-gray-600">Reading Time</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-accent">
                                {analytics.articlesReadThisWeek || 0}
                              </div>
                              <div className="text-sm text-gray-600">This Week</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-accent">
                                {analytics.averageSessionLength ? Math.round(analytics.averageSessionLength / 60) : 0}m
                              </div>
                              <div className="text-sm text-gray-600">Avg Session</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

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
                            <UserIcon className="mr-2" size={16} />
                            Sign Out
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
