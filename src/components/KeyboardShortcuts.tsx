
import { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "./Button";

export const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const shortcuts = [
    { key: "1", description: "Select Vocabulary category / Rate card 'Fail'" },
    { key: "2", description: "Select Phrases category / Rate card 'Eh'" },
    { key: "3", description: "Select Definitions category / Rate card 'Pass'" },
    { key: "4", description: "Select Questions category" },
    { key: "5", description: "Select Business category" },
    { key: "6", description: "Select Other category" },
    { key: "Space", description: "Flip card" },
    { key: "←", description: "Previous card" },
    { key: "→", description: "Next card" },
    { key: "Esc", description: "Navigate back to home" }
  ];
  
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-10"
        onClick={() => setIsOpen(true)}
      >
        <Keyboard className="h-4 w-4 mr-2" />
        Keyboard Shortcuts
      </Button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-10 bg-card shadow-lg rounded-lg border p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium flex items-center">
          <Keyboard className="h-4 w-4 mr-2" />
          Keyboard Shortcuts
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2 text-sm">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-start">
            <div className="bg-muted px-2 py-1 rounded min-w-[30px] text-center font-mono mr-3">
              {shortcut.key}
            </div>
            <div className="text-muted-foreground">{shortcut.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
