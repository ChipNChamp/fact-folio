
import { useState, useEffect } from "react";
import { Button } from "./Button";
import { getApiKey, setApiKey, clearApiKey } from "@/utils/contentGenerator";
import { useToast } from "@/hooks/use-toast";

export const ApiKeyInput = () => {
  const [key, setKey] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = getApiKey();
    setHasStoredKey(!!storedKey);
    if (storedKey) {
      setKey(storedKey);
    }
  }, []);

  const handleSaveKey = () => {
    if (!key.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setApiKey(key.trim());
    setHasStoredKey(true);
    
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
  };

  const handleClearKey = () => {
    clearApiKey();
    setKey("");
    setHasStoredKey(false);
    
    toast({
      title: "Success",
      description: "API key removed",
    });
  };

  return (
    <div className="rounded-lg border border-border/40 p-4 bg-muted/30">
      <h2 className="text-lg font-medium mb-2">OpenAI API Key</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Your API key is stored locally in your browser and never sent to our servers.
      </p>
      
      <div className="space-y-4">
        <div className="relative">
          <input
            type={isVisible ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your OpenAI API key"
            className="w-full px-4 py-3 rounded-lg border border-input bg-background shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200 pr-12"
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {isVisible ? "Hide" : "Show"}
          </button>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={handleSaveKey}
            className="flex-1"
          >
            Save Key
          </Button>
          
          {hasStoredKey && (
            <Button
              variant="outline"
              onClick={handleClearKey}
              className="flex-1"
            >
              Clear Key
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
