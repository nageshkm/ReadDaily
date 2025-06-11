import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Category } from "@shared/schema";
import { LocalStorage } from "@/lib/storage";

interface UserOnboardingProps {
  isOpen: boolean;
  onComplete: (user: any) => void;
}

export function UserOnboarding({ isOpen, onComplete }: UserOnboardingProps) {
  const [name, setName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categories = LocalStorage.getCategories();

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || selectedCategories.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const user = LocalStorage.createUser(name.trim(), selectedCategories);
      onComplete(user);
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
            <p className="text-gray-600">Build your daily reading habit with curated articles</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                What's your name?
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full"
                required
              />
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Choose your interests
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => (
                  <Label
                    key={category.id}
                    className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:border-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) =>
                        handleCategoryChange(category.id, checked as boolean)
                      }
                    />
                    <span className="text-sm">{category.name}</span>
                  </Label>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-accent text-white hover:bg-blue-700 font-medium"
              disabled={!name.trim() || selectedCategories.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Getting Started..." : "Start Reading Journey"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
