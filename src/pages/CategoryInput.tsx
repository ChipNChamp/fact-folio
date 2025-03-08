
import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { EntryType, addEntry } from "@/utils/storage";
import { ContentType, generateContent, getApiKey } from "@/utils/contentGenerator";
import { Loader2, RefreshCw } from "lucide-react";
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
  const [showApiKey, setShowApiKey] = useState(false);
  
  const mainInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (needsGeneration()) {
      const apiKey = getApiKey();
      setShowApiKey(!apiKey);
    }
    
    setTimeout(() => {
      if (mainInputRef.current) {
        mainInputRef.current.focus();
      }
    }, 100);
  }, [category]);
  
  const needsGeneration = (): boolean => {
    return !['questions', 'business', 'other'].includes(category || '');
  };
  
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
  
  const getAdditionalInputPlaceholder = (): string | null => {
    switch (category) {
      case "questions": return "Enter applicability (where would this be used)";
      case "business": return "Enter applicability (where would this be used)";
      default: return null;
    }
  };
  
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
  
  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({
        title: "Input required",
        description: "Please enter something first",
        variant: "destructive",
      });
      return;
    }
    
    if (needsGeneration() && !getApiKey()) {
      setShowApiKey(true);
      toast({
        title: "API key required",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedContent("");
    
    try {
      const content = await generateContent(
        category as ContentType, 
        input, 
        additionalInput || undefined
      );
      setGeneratedContent(content);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Could not generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveWithoutGeneration = () => {
    if (!input.trim()) {
      toast({
        title: "Input required",
        description: "Please enter something first",
        variant: "destructive",
      });
      return;
    }
    
    setIsStoring(true);
    
    try {
      // For 'other', 'business', and 'questions', set output to null
      const contentToSave = null; // Store null for these entry types
      
      addEntry(
        category as EntryType,
        input,
        contentToSave,
        additionalInput || undefined
      );
      
      toast({
        title: "Success",
        description: "Entry saved successfully",
      });
      
      setInput("");
      setAdditionalInput("");
      setGeneratedContent("");
      setIsStoring(false);
    } catch (error) {
      console.error("Error storing entry:", error);
      toast({
        title: "Save failed",
        description: "Could not save the entry. Please try again.",
        variant: "destructive",
      });
      setIsStoring(false);
    }
  };
  
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
        undefined
      );
      
      toast({
        title: "Success",
        description: "Entry saved successfully",
      });
      
      setInput("");
      setAdditionalInput("");
      setGeneratedContent("");
      setIsStoring(false);
      
      setTimeout(() => {
        if (mainInputRef.current) {
          mainInputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error("Error storing entry:", error);
      toast({
        title: "Save failed",
        description: "Could not save the entry. Please try again.",
        variant: "destructive",
      });
      setIsStoring(false);
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (needsGeneration()) {
        if (!generatedContent && input.trim()) {
          handleGenerate();
        } else if (generatedContent) {
          handleStore();
        }
      } else {
        if (input.trim()) {
          handleSaveWithoutGeneration();
        }
      }
    }
    
    if (e.key === 'Tab' && generatedContent && needsGeneration()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleDivKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    handleKeyDown(e as unknown as KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title={getCategoryTitle()} />
      
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        <div className="space-y-6 animate-fade-in">
          {showApiKey && needsGeneration() && (
            <div className="mb-8 animate-fade-in">
              <ApiKeyInput />
              <div className="flex justify-center mt-4">
                <button 
                  onClick={() => setShowApiKey(false)} 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {getApiKey() ? "Hide API Key" : "I'll add this later"}
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="main-input" className="text-sm font-medium">
              {getInputLabel()}
            </label>
            <input
              id="main-input"
              ref={mainInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getInputPlaceholder()}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200"
            />
          </div>
          
          {getAdditionalInputPlaceholder() && (
            <div className="space-y-2">
              <label htmlFor="additional-input" className="text-sm font-medium">
                Applicability
              </label>
              <input
                id="additional-input"
                ref={additionalInputRef}
                type="text"
                value={additionalInput}
                onChange={(e) => setAdditionalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getAdditionalInputPlaceholder() || ""}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200"
              />
            </div>
          )}
          
          {needsGeneration() ? (
            <>
              <Button 
                ref={generateButtonRef}
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
              
              {!showApiKey && (
                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {getApiKey() ? "Edit API Key" : "Set API Key"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <Button 
              onClick={handleSaveWithoutGeneration} 
              disabled={isStoring || !input.trim()}
              className="w-full"
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
          )}
          
          {generatedContent && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Generated Content</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
              <div 
                className="p-4 rounded-lg border border-border bg-muted/30 whitespace-pre-wrap"
                onKeyDown={handleDivKeyDown}
                tabIndex={0}
              >
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
