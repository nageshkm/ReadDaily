import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareContent } from "@/lib/firebase";
import { Article } from "@shared/schema";

interface ShareButtonProps {
  article: Article & {
    recommendedBy?: string;
    userCommentary?: string;
    recommenderName?: string;
  };
  className?: string;
}

export function ShareButton({ article, className }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareData = {
        title: article.title,
        text: article.userCommentary 
          ? `"${article.userCommentary}" - ${article.title}`
          : article.title,
        url: article.sourceUrl
      };

      const shared = await shareContent(shareData);
      
      if (!shared) {
        // Fallback to copying URL to clipboard
        await navigator.clipboard.writeText(article.sourceUrl);
        // Could show a toast here indicating URL was copied
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Fallback to copying URL to clipboard
      try {
        await navigator.clipboard.writeText(article.sourceUrl);
      } catch (clipboardError) {
        console.error("Clipboard access failed:", clipboardError);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      disabled={isSharing}
      className={className}
    >
      <Share2 className="h-4 w-4" />
    </Button>
  );
}