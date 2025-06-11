import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
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
import NotFound from "@/pages/not-found";
import { Home as HomeIcon, History as HistoryIcon, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

function MobileNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-around">
        <Link href="/" className={`flex flex-col items-center space-y-1 ${
          isActive("/") ? "text-accent" : "text-gray-500"
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
        <Link href="/profile" className={`flex flex-col items-center space-y-1 ${
          isActive("/profile") ? "text-accent" : "text-gray-500"
        }`}>
          <UserIcon size={20} />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={History} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const existingUser = LocalStorage.getUser();
    if (existingUser) {
      setUser(existingUser);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-warm-white pb-16 sm:pb-0">
          <Header user={user} />
          <Router />
          <MobileNavigation />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
