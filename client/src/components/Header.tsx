import { BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
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
            <Link href="/">
              <a className={`transition-colors pb-1 ${
                isActive("/")
                  ? "text-accent font-medium border-b-2 border-accent"
                  : "text-gray-600 hover:text-primary"
              }`}>
                Today
              </a>
            </Link>
            <Link href="/history">
              <a className={`transition-colors pb-1 ${
                isActive("/history")
                  ? "text-accent font-medium border-b-2 border-accent"
                  : "text-gray-600 hover:text-primary"
              }`}>
                History
              </a>
            </Link>
            <Link href="/profile">
              <a className={`transition-colors pb-1 ${
                isActive("/profile")
                  ? "text-accent font-medium border-b-2 border-accent"
                  : "text-gray-600 hover:text-primary"
              }`}>
                Profile
              </a>
            </Link>
          </nav>
          
          {user && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials(user.name)}
                </span>
              </div>
              <span className="hidden sm:inline text-sm font-medium">
                {user.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
