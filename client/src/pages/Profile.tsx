import { useState, useEffect } from "react";
import { User, Settings, Activity, History, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocalStorage } from "@/lib/storage";
import { User as UserType, Category } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { StreakDisplay } from "@/components/StreakDisplay";

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [todayReadCount, setTodayReadCount] = useState(0);
  const [, setLocation] = useLocation();

  const categories = LocalStorage.getCategories();

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    if (existingUser) {
      setUser(existingUser);
      setTodayReadCount(LocalStorage.getTodayReadCount(existingUser));
    }
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

        {/* Streaks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp size={20} />
              <span>Reading Streaks</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StreakDisplay user={user} todayReadCount={todayReadCount} />
          </CardContent>
        </Card>

        {/* Quick Navigation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity size={20} />
              <span>My Reading</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/history">
              <Button variant="outline" className="w-full flex items-center justify-start gap-3">
                <History size={16} />
                Reading History
              </Button>
            </Link>
            <Link href="/myarticles">
              <Button variant="outline" className="w-full flex items-center justify-start gap-3">
                <BookOpen size={16} />
                My Articles
              </Button>
            </Link>
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
              {/* WhatsApp Community Section */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487"/>
                  </svg>
                  <h4 className="text-sm font-semibold text-green-800">WhatsApp Community</h4>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  Connect with other readers and share feedback
                </p>
                <Button
                  onClick={() => window.open('https://chat.whatsapp.com/CL3gK1feH8C5GuGnN0CvHI', '_blank')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                  size="sm"
                >
                  Join WhatsApp Group
                </Button>
              </div>
              
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
