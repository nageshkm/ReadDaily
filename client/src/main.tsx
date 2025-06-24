import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";
import { registerServiceWorker } from "./lib/firebase";

function AppWithAuth() {
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        setGoogleClientId(data.googleClientId);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load config:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!googleClientId) {
    return <div>Error: Google Client ID not configured</div>;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  );
}

// Register service worker for PWA
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<AppWithAuth />);
