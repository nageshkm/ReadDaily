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
      
      // Sign in with server, migrating local data
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          localData: existingUser
        })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { user, sessionId } = await response.json();
      
      // Save synced user data and session info
      LocalStorage.saveUser(user);
      localStorage.setItem('sessionId', sessionId);
      
      onComplete(user);
    } catch (error) {
      console.error('Server authentication failed:', error);
      // Fallback to local-only creation
      const localUser = LocalStorage.createUser(
        userName.trim(),
        userEmail.trim(),
        ['general']
      );
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
            
            {/* WhatsApp Group Invitation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
              <div className="flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487"/>
                </svg>
                <h3 className="text-lg font-semibold text-green-800">Join Our WhatsApp Community!</h3>
              </div>
              <p className="text-green-700 text-center text-sm mb-4">
                Get regular updates, share feedback, and help shape ReadDaily's future. Connect with other readers and the development team.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => window.open('https://chat.whatsapp.com/CL3gK1feH8C5GuGnN0CvHI', '_blank')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487"/>
                  </svg>
                  Join WhatsApp Group
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
