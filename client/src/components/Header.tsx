import { BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/today" && (location === "/" || location === "/today")) return true;
    if (path !== "/today" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 py-3">
          <div className="flex flex-col space-y-1">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="text-accent text-xl" size={24} />
              <h1 className="text-xl font-semibold">ReadDaily</h1>
            </Link>
            <p className="text-sm text-gray-600 ml-8">Curated articles. Everyday</p>
          </div>
          
          <nav className="hidden sm:flex items-center space-x-6">
            {/* Navigation items removed - access via profile */}
          </nav>
          
          {user && (
            <Link href="/profile">
              <Button variant="ghost" className="flex items-center space-x-2 p-2">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {getInitials(user.name)}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {user.name}
                </span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}