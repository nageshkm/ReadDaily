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
import MyArticles from "@/pages/MyArticles";
import Admin from "@/pages/Admin";
import ArticleShare from "@/pages/ArticleShare";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import { Home as HomeIcon, History as HistoryIcon, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

function MobileNavigation() {
  return null; // Mobile navigation removed - access features via profile
}

function Router() {
  const [location, setLocation] = useLocation();
  
  // Handle shared article routes - redirect to home with shared parameter
  useEffect(() => {
    if (location.startsWith("/share/")) {
      const articleId = location.replace("/share/", "");
      // Redirect to home with shared parameter in URL
      setLocation(`/?shared=${articleId}`);
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
    case "/myarticles":
      return <MyArticles />;
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
        <div className="min-h-screen bg-warm-white">
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
