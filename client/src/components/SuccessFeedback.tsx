import { CheckCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface SuccessFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  onNextArticle?: () => void;
  hasNextArticle?: boolean;
  articleTitle: string;
}

export function SuccessFeedback({
  isOpen,
  onClose,
  onNextArticle,
  hasNextArticle = false,
  articleTitle,
}: SuccessFeedbackProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full text-center">
        <VisuallyHidden>
          <DialogTitle>Article marked as read</DialogTitle>
        </VisuallyHidden>
        
        <div className="p-8">
          <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-white" size={48} />
          </div>
          
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            Great job!
          </h2>
          
          <p className="text-gray-600 mb-6">
            You've successfully completed reading "{articleTitle}". Keep up your reading streak!
          </p>
          
          <div className="flex flex-col space-y-3">
            {hasNextArticle && onNextArticle ? (
              <Button
                onClick={onNextArticle}
                className="bg-accent text-white hover:bg-blue-700 font-medium"
              >
                Read Next Article <ArrowRight className="ml-2" size={16} />
              </Button>
            ) : null}
            
            <Button
              variant="outline"
              onClick={onClose}
              className="font-medium"
            >
              Back to Today's Articles
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}