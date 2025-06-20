import { Switch, Route } from "wouter";
import React, { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { LocalStorage } from "@/lib/storage";
import { User } from "@shared/schema";
import Home from "@/pages/Home";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import ArticleShare from "@/pages/ArticleShare";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import { Home as HomeIcon, History as HistoryIcon, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

function MobileNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/today" && (location === "/" || location === "/today")) return true;
    if (path !== "/today" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around">
        <Link href="/today" className={`flex flex-col items-center space-y-1 ${
          isActive("/today") ? "text-accent" : "text-gray-500"
        }`}>
          <HomeIcon size={20} />
          <span className="text-xs font-medium">Today</span>
        </Link>
        <Link href="/history" className={`flex flex-col items-center space-y-1 ${
          isActive("/history") ? "text-accent" : "text-gray-500"
        }`}>
          <HistoryIcon size={20} />
          <span className="text-xs">History</span>
        </Link>
      </div>
    </nav>
  );
}

function Router() {
  const [location, setLocation] = useLocation();
  
  // Handle shared article routes - redirect to home with stored article ID
  useEffect(() => {
    if (location.startsWith("/share/")) {
      const articleId = location.replace("/share/", "");
      LocalStorage.setSharedArticleId(articleId);
      setLocation("/");
    }
  }, [location, setLocation]);
  
  // Handle legacy article routes
  if (location.startsWith("/article/")) {
    return <ArticleShare />;
  }
  
  switch (location) {
    case "/":
      // Check if user exists - show landing page to new visitors
      const existingUser = LocalStorage.getUser();
      return existingUser ? <Home /> : <Landing />;
    case "/today":
      return <Home />;
    case "/landing":
      return <Landing />;
    case "/history":
      return <History />;
    case "/profile":
      return <Profile />;
    case "/admin":
      return <Admin />;
    default:
      return <NotFound />;
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    setUser(existingUser);
  }, [location]); // React to location changes

  const showNavigation = user !== null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-warm-white pb-16 sm:pb-0">
          {showNavigation && <Header user={user} />}
          <Router />
          {showNavigation && <MobileNavigation />}
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
