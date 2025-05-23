import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { EntryType, addEntry, checkForDuplicate } from "@/utils/storage";
import { ContentType, generateContent, getApiKey } from "@/utils/contentGenerator";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const CategoryInput = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [additionalInput, setAdditionalInput] = useState("");
  const [manualOutput, setManualOutput] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<any>(null);
  
  const mainInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const manualOutputRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  useEffect(() => {
    const checkDuplicate = async () => {
      if (input.trim().length < 2) {
        setIsDuplicate(false);
        setDuplicateItem(null);
        return;
      }
      
      const duplicate = await checkForDuplicate(category as EntryType, input);
      setIsDuplicate(!!duplicate);
      setDuplicateItem(duplicate);
    };
    
    checkDuplicate();
  }, [input, category]);
  
  const needsGeneration = (): boolean => {
    return !['questions', 'business', 'other'].includes(category || '');
  };
  
  const needsManualOutput = (): boolean => {
    return ['questions', 'business', 'other'].includes(category || '');
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
    return null;
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
  
  const getOutputLabel = (): string => {
    switch (category) {
      case "vocabulary": return "Definition";
      case "phrases": return "Explanation";
      case "definitions": return "Definition";
      case "questions": return "Answer";
      case "business": return "Details";
      case "other": return "Additional Information";
      default: return "Output";
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
    
    if (isDuplicate) {
      toast({
        title: "Duplicate detected",
        description: "This entry already exists. Saving will create a duplicate.",
        variant: "warning",
      });
    }
    
    setIsStoring(true);
    
    try {
      addEntry(
        category as EntryType,
        input,
        manualOutput,
        additionalInput
      );
      
      toast({
        title: "Success",
        description: "Entry saved successfully",
      });
      
      setInput("");
      setAdditionalInput("");
      setManualOutput("");
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
  
  const handleStore = () => {
    if (!input.trim()) {
      toast({
        title: "Content required",
        description: "Please enter input first",
        variant: "destructive",
      });
      return;
    }
    
    if (isDuplicate) {
      toast({
        title: "Duplicate detected",
        description: "This entry already exists. Saving will create a duplicate.",
        variant: "warning",
      });
    }
    
    setIsStoring(true);
    
    try {
      addEntry(
        category as EntryType,
        input,
        generatedContent,
        additionalInput
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
    <div className="h-screen max-h-screen overflow-hidden fixed inset-0 flex flex-col">
      <Header title={getCategoryTitle()} />
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
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
                <div className="relative">
                  <Input
                    id="main-input"
                    ref={mainInputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={getInputPlaceholder()}
                    className={`w-full px-4 py-3 rounded-lg ${isDuplicate ? 'border-orange-500 pr-10' : 'border-input'} bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200`}
                  />
                  {isDuplicate && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                  )}
                </div>
                {isDuplicate && (
                  <div className="text-sm text-orange-500 mt-1 animate-fade-in">
                    Duplicate detected: This {getInputLabel().toLowerCase()} already exists
                  </div>
                )}
              </div>
              
              {needsManualOutput() && (
                <div className="space-y-2">
                  <label htmlFor="manual-output" className="text-sm font-medium">
                    {getOutputLabel()} (Optional)
                  </label>
                  <Textarea
                    id="manual-output"
                    ref={manualOutputRef}
                    value={manualOutput}
                    onChange={(e) => setManualOutput(e.target.value)}
                    placeholder={`Enter ${getOutputLabel().toLowerCase()} (optional)`}
                    className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-input bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200"
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
        </ScrollArea>
      </div>
    </div>
  );
};

export default CategoryInput;
