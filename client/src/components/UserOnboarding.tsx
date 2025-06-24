import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LocalStorage } from "@/lib/storage";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { apiRequest } from "@/lib/queryClient";
import { getTodayString } from "@/lib/utils";

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (_e) {
    return {};
  }
}

interface UserOnboardingProps {
  isOpen: boolean;
  onComplete: (user: any) => void;
}

export function UserOnboarding({ isOpen, onComplete }: UserOnboardingProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleServerAuth = async (userName: string, userEmail: string) => {
    setIsSubmitting(true);
    
    try {
      // Get existing localStorage data for migration
      const existingUser = LocalStorage.getUser();
      
      // Check for shared article in localStorage
      const sharedArticleId = localStorage.getItem('pendingSharedArticle');
      console.log('AUTH: Retrieved from localStorage:', sharedArticleId);
      console.log('AUTH: Type of sharedArticleId:', typeof sharedArticleId);
      console.log('AUTH: Sending sharedArticleId to server:', sharedArticleId);
      
      // Sign in with server, migrating local data and shared article
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          localData: existingUser,
          sharedArticleId
        })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { user, sessionId } = await response.json();
      
      // Save synced user data and session info
      LocalStorage.saveUser(user);
      localStorage.setItem('sessionId', sessionId);
      
      // Clear the pending shared article as it's now in session
      if (sharedArticleId) {
        localStorage.removeItem('pendingSharedArticle');
      }
      
      onComplete(user);
    } catch (error) {
      console.error('Server authentication failed:', error);
      // Fallback to local-only creation
      const localUser = LocalStorage.createUser(
        userName.trim(),
        userEmail.trim(),
        ['general']
      );
      
      // Check if there's a pending shared article and redirect with it
      const pendingShared = localStorage.getItem('pendingSharedArticle');
      if (pendingShared) {
        localStorage.removeItem('pendingSharedArticle');
        // Redirect to home with shared parameter to maintain the shared article flow
        window.location.href = `/?shared=${pendingShared}`;
        return;
      }
      
      onComplete(localUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    if (cred.credential) {
      const payload = parseJwt(cred.credential);
      if (payload?.name && payload?.email) {
        setName(payload.name);
        await handleServerAuth(payload.name, payload.email);
      }
    }
  };

  const handleGoogleError = (error?: any) => {
    console.error("Google login failed:", error);
  };

  const handleSubmit = async (userName: string, userEmail: string) => {
    if (!userName.trim() || !userEmail.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const today = getTodayString();
      
      // Create user data for server (without ID - server will generate it)
      const userData = {
        name: userName.trim(),
        email: userEmail.trim(),
        joinDate: today,
        lastActive: today,
        preferences: JSON.stringify({ categories: ['general'] }),
        readArticles: JSON.stringify([]),
        streakData: JSON.stringify({
          currentStreak: 0,
          lastReadDate: "",
          longestStreak: 0
        })
      };

      // Store user on server
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create user');
      }
      
      const serverUser = await response.json();

      // Use server user data for local storage to maintain consistency
      const localUser = {
        id: serverUser.id,
        name: serverUser.name,
        email: serverUser.email,
        joinDate: serverUser.joinDate,
        lastActive: serverUser.lastActive,
        preferences: { categories: ['general'] },
        readArticles: [],
        streakData: {
          currentStreak: 0,
          lastReadDate: "",
          longestStreak: 0
        }
      };
      
      LocalStorage.saveUser(localUser);
      
      // Check if there's a pending shared article and redirect with it
      const pendingShared = localStorage.getItem('pendingSharedArticle');
      if (pendingShared) {
        localStorage.removeItem('pendingSharedArticle');
        // Redirect to home with shared parameter to maintain the shared article flow
        window.location.href = `/?shared=${pendingShared}`;
        return;
      }
      
      onComplete(localUser);
    } catch (error) {
      console.error("Error creating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md w-full">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-white text-2xl" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to ReadDaily</h2>
            <p className="text-gray-600 text-center">
              Build your daily reading habit with curated articles
            </p>
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
