
import { GoogleOAuthProvider, CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useQuery } from "@tanstack/react-query";
import { LocalStorage } from "@/lib/storage";
import { useLocation } from "wouter";

function parseJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

export default function Landing() {
  const [, setLocation] = useLocation();

  const { data: config } = useQuery({
    queryKey: ['/api/config']
  });

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) return;
      
      const userInfo = parseJwt(credentialResponse.credential);
      
      // Check if user already exists with old random ID
      const existingUser = LocalStorage.getUser();
      let newUser;
      
      if (existingUser && existingUser.email === userInfo.email) {
        // User exists but might have old random ID - update to email-based ID
        const emailBasedId = `user-${userInfo.email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        if (existingUser.id !== emailBasedId) {
          // Update user with new consistent ID
          existingUser.id = emailBasedId;
          LocalStorage.saveUser(existingUser);
        }
        newUser = existingUser;
      } else {
        // Create new user with email-based ID
        newUser = LocalStorage.createUser(
          userInfo.name,
          userInfo.email,
          ['technology', 'business', 'health']
        );
      }
      
      // Then create user on server
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newUser.id,
            name: userInfo.name,
            email: userInfo.email,
            preferences: { categories: ['technology', 'business', 'health'] },
            readArticles: [],
            streakData: {
              currentStreak: 0,
              lastReadDate: "",
              longestStreak: 0
            }
          })
        });
      } catch (serverError) {
        console.error('Failed to create user on server:', serverError);
        // Continue anyway - user will work locally but may have issues with sharing
      }
      
      // Navigate to Today section
      setLocation('/today');
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  if (!config || !(config as any).googleClientId) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <GoogleOAuthProvider clientId={(config as any).googleClientId}>
      <div className="bg-[#f9f6f1] text-[#3e2c13] min-h-screen">
        <header className="text-center p-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">Your Trusted Reading List. Every Day.</h1>
          <p className="text-lg sm:text-xl text-[#7b5e3b] max-w-xl mx-auto">
            Curated by people you know. Designed to help you read more.
          </p>
        </header>

        <section className="text-center px-6 py-12 bg-[#fff6e5]">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h2 className="text-xl font-semibold mb-2">📚 Curated by your circle</h2>
                <p className="text-[#5a4630]">No algorithms. Just great links from people you trust.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h2 className="text-xl font-semibold mb-2">🔥 Build your streak</h2>
                <p className="text-[#5a4630]">Track your reading habit, one link at a time.</p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Want to see what your circle is reading?</h2>
              <p className="text-[#5a4630] mb-8">Sign up to access your private reading list and start your streak today.</p>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error('Login Failed')}
                  theme="filled_blue"
                  size="large"
                  text="signup_with"
                />
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-sm text-[#7b5e3b] py-6">
          &copy; 2025 ReadDaily – Curated Reading Habit Builder
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
}