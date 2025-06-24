import { useEffect, useState } from "react";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

interface PWANotificationsProps {
  user: User | null;
  onFCMTokenUpdate: (token: string) => void;
}

export function PWANotifications({ user, onFCMTokenUpdate }: PWANotificationsProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  useEffect(() => {
    // Check current notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Set up foreground message listener
    const unsubscribe = onForegroundMessage((payload) => {
      toast({
        title: payload.notification?.title || "ReadDaily",
        description: payload.notification?.body || "You have a new notification",
      });
    });

    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    // Request notification permission after user signs in
    if (user && notificationPermission === "default") {
      handleRequestPermission();
    }
  }, [user, notificationPermission]);

  const handleRequestPermission = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationPermission("granted");
        onFCMTokenUpdate(token);
        toast({
          title: "Notifications enabled",
          description: "You'll receive notifications when someone likes your articles",
        });
      } else {
        setNotificationPermission("denied");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Notification setup failed",
        description: "Please check your browser settings and try again",
        variant: "destructive",
      });
    }
  };

  // Don't render anything, this is just a service component
  return null;
}