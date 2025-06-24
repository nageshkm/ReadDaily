import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, X } from "lucide-react";
import { useLocation } from "wouter";

interface SharePromptToastProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function SharePromptToast({ isVisible, onDismiss }: SharePromptToastProps) {
  const [, setLocation] = useLocation();

  const handleShareClick = () => {
    setLocation("/profile");
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-md mx-auto bg-background border border-border rounded-lg shadow-lg p-4">
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
        >
          <X size={16} />
        </button>
        
        <div className="pr-8">
          <div className="flex items-center mb-2">
            <Share2 className="w-4 h-4 text-accent mr-2" />
            <h4 className="text-sm font-medium">Enjoying ReadDaily?</h4>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            Share interesting articles you're reading - our community would love to discover them too!
          </p>
          
          <Button
            onClick={handleShareClick}
            size="sm"
            className="w-full"
          >
            Share with Community
          </Button>
        </div>
      </div>
    </div>
  );
}