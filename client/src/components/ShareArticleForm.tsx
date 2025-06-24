import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Link, ExternalLink } from "lucide-react";

interface ShareArticleFormProps {
  user: User;
  onSuccess?: () => void;
}

export function ShareArticleForm({ user, onSuccess }: ShareArticleFormProps) {
  const [url, setUrl] = useState("");
  const [commentary, setCommentary] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shareArticleMutation = useMutation({
    mutationFn: async (data: { url: string; commentary: string; userId: string; userName: string; userEmail: string }) => {
      const response = await fetch("/api/articles/share", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to share article");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Article shared successfully!",
        description: "Your article has been shared with the community."
      });
      setUrl("");
      setCommentary("");
      queryClient.invalidateQueries({ queryKey: ["/api/articles/my", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles/recommended", user.id] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share article",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL to share.",
        variant: "destructive"
      });
      return;
    }

    shareArticleMutation.mutate({
      url: url.trim(),
      commentary: commentary.trim(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email
    });
  };

  return (
    <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Article URL</Label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentary">Your Commentary (Optional)</Label>
            <Textarea
              id="commentary"
              placeholder="Why is this article interesting? What are your thoughts?"
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={shareArticleMutation.isPending}
          >
            {shareArticleMutation.isPending ? "Sharing..." : "Share Article"}
          </Button>
        </form>
    </div>
  );
}