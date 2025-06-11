import { useState, useEffect } from "react";
import { Plus, Save, Eye, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LocalStorage } from "@/lib/storage";
import { Category } from "@shared/schema";

export default function Admin() {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    summary: "",
    sourceUrl: "",
    imageUrl: "",
    estimatedReadingTime: 5,
    categoryId: "",
    publishDate: new Date().toISOString().split('T')[0],
    featured: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  
  const categories = LocalStorage.getCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate unique ID
      const articleId = `article-${Date.now()}`;
      
      // Create article object
      const newArticle = {
        id: articleId,
        ...formData,
      };

      // In a real implementation, this would POST to your backend
      // For now, we'll show instructions to the user
      console.log("New article to add:", newArticle);
      
      toast({
        title: "Article Ready",
        description: "Copy the JSON below and add it to your articles.json file",
      });

      // Show the JSON in console for now
      alert(`Copy this JSON and add it to client/src/data/articles.json:\n\n${JSON.stringify(newArticle, null, 2)}`);
      
      // Reset form
      setFormData({
        title: "",
        content: "",
        summary: "",
        sourceUrl: "",
        imageUrl: "",
        estimatedReadingTime: 5,
        categoryId: "",
        publishDate: new Date().toISOString().split('T')[0],
        featured: false,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Management</h1>
        <p className="text-gray-600">Add new articles for your daily reading app</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus size={20} />
                <span>Add New Article</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="title">Article Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Enter article title"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.categoryId} onValueChange={(value) => handleInputChange("categoryId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="summary">Summary *</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleInputChange("summary", e.target.value)}
                    placeholder="Brief summary of the article"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="content">Full Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => handleInputChange("content", e.target.value)}
                    placeholder="Full article content (separate paragraphs with double line breaks)"
                    rows={10}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="sourceUrl">Source URL *</Label>
                    <Input
                      id="sourceUrl"
                      type="url"
                      value={formData.sourceUrl}
                      onChange={(e) => handleInputChange("sourceUrl", e.target.value)}
                      placeholder="https://source-website.com/article"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="imageUrl">Image URL *</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                      placeholder="https://image-url.com/image.jpg"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="readingTime">Reading Time (minutes)</Label>
                    <Input
                      id="readingTime"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.estimatedReadingTime}
                      onChange={(e) => handleInputChange("estimatedReadingTime", parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="publishDate">Publish Date</Label>
                    <Input
                      id="publishDate"
                      type="date"
                      value={formData.publishDate}
                      onChange={(e) => handleInputChange("publishDate", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => handleInputChange("featured", checked)}
                    />
                    <Label htmlFor="featured">Featured Article</Label>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Button type="submit" disabled={isSubmitting} className="bg-accent text-white hover:bg-blue-700">
                    <Save className="mr-2" size={16} />
                    {isSubmitting ? "Creating..." : "Create Article"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="mr-2" size={16} />
                    {previewMode ? "Hide Preview" : "Preview"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar size={20} />
                <span>Publishing Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <strong>Publish Date:</strong> {formData.publishDate}
                </div>
                <div>
                  <strong>Category:</strong> {categories.find(c => c.id === formData.categoryId)?.name || "Not selected"}
                </div>
                <div>
                  <strong>Reading Time:</strong> {formData.estimatedReadingTime} minutes
                </div>
                <div>
                  <strong>Featured:</strong> {formData.featured ? "Yes" : "No"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Step 1:</strong> Fill out the article form with all required fields</p>
                <p><strong>Step 2:</strong> Click "Create Article" to generate the JSON</p>
                <p><strong>Step 3:</strong> Copy the generated JSON and add it to your articles.json file</p>
                <p><strong>Step 4:</strong> The article will appear in your daily feed on the publish date</p>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-xs">
                    <strong>Tip:</strong> Set the publish date to today to see the article immediately in your daily feed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {previewMode && formData.title && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold mb-2">{formData.title}</h2>
              <p className="text-gray-600 mb-4">{formData.summary}</p>
              {formData.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt={formData.title}
                  className="w-full rounded-lg mb-4"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="whitespace-pre-wrap">{formData.content}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}