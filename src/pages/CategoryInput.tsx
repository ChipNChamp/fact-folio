
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { EntryType, addEntry } from "@/utils/storage";
import { ContentType, generateContent } from "@/utils/contentGenerator";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CategoryInput = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [additionalInput, setAdditionalInput] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  
  // Get the appropriate title based on the category
  const getCategoryTitle = (): string => {
    switch (category) {
      case "vocabulary": return "Add Vocabulary";
      case "phrases": return "Add Phrase";
      case "definitions": return "Add Definition";
      case "questions": return "Add Question";
      case "business": return "Add Business Fact";
      case "other": return "Add Other";
      default: return "Add Entry";
    }
  };
  
  // Get placeholder text for the main input
  const getInputPlaceholder = (): string => {
    switch (category) {
      case "vocabulary": return "Enter a word";
      case "phrases": return "Enter a phrase";
      case "definitions": return "Enter a word";
      case "questions": return "Enter a question";
      case "business": return "Enter a business factoid";
      case "other": return "Enter information";
      default: return "Enter text";
    }
  };
  
  // Get placeholder for the secondary input if needed
  const getAdditionalInputPlaceholder = (): string | null => {
    switch (category) {
      case "questions": return "Enter applicability (where would this be used)";
      case "business": return "Enter applicability (where would this be used)";
      default: return null;
    }
  };
  
  // Get label for the main input
  const getInputLabel = (): string => {
    switch (category) {
      case "vocabulary": return "Word";
      case "phrases": return "Phrase";
      case "definitions": return "Term";
      case "questions": return "Question";
      case "business": return "Business Fact";
      case "other": return "Information";
      default: return "Input";
    }
  };
  
  // Handle content generation
  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({
        title: "Input required",
        description: "Please enter something first",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedContent("");
    
    try {
      const content = await generateContent(category as ContentType, input);
      setGeneratedContent(content);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Generation failed",
        description: "Could not generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle storing the entry
  const handleStore = () => {
    if (!input.trim() || !generatedContent.trim()) {
      toast({
        title: "Content required",
        description: "Please generate content first",
        variant: "destructive",
      });
      return;
    }
    
    setIsStoring(true);
    
    try {
      addEntry(
        category as EntryType,
        input,
        generatedContent,
        additionalInput || undefined
      );
      
      toast({
        title: "Success",
        description: "Entry saved successfully",
      });
      
      // Reset form
      setInput("");
      setAdditionalInput("");
      setGeneratedContent("");
      
      // Navigate back to home after a brief delay
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      console.error("Error storing entry:", error);
      toast({
        title: "Save failed",
        description: "Could not save the entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStoring(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title={getCategoryTitle()} />
      
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        <div className="space-y-6 animate-fade-in">
          {/* Main input */}
          <div className="space-y-2">
            <label htmlFor="main-input" className="text-sm font-medium">
              {getInputLabel()}
            </label>
            <input
              id="main-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getInputPlaceholder()}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200"
            />
          </div>
          
          {/* Additional input for specific categories */}
          {getAdditionalInputPlaceholder() && (
            <div className="space-y-2">
              <label htmlFor="additional-input" className="text-sm font-medium">
                Applicability
              </label>
              <input
                id="additional-input"
                type="text"
                value={additionalInput}
                onChange={(e) => setAdditionalInput(e.target.value)}
                placeholder={getAdditionalInputPlaceholder() || ""}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200"
              />
            </div>
          )}
          
          {/* Generate button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !input.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Generating...
              </>
            ) : (
              <>Generate</>
            )}
          </Button>
          
          {/* Generated content display */}
          {generatedContent && (
            <div className="mt-8 animate-fade-in">
              <h3 className="text-lg font-medium mb-2">Generated Content</h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30 whitespace-pre-wrap">
                {generatedContent}
              </div>
              
              <Button 
                onClick={handleStore} 
                disabled={isStoring}
                className="w-full mt-4"
              >
                {isStoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Saving...
                  </>
                ) : (
                  <>Save Entry</>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CategoryInput;
