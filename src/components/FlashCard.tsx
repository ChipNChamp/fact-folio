
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./Button";
import { EntryData, updateEntryKnowledge } from "@/utils/storage";
import { cn } from "@/lib/utils";

interface FlashCardProps {
  entry: EntryData;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  className?: string;
}

export const FlashCard = ({
  entry,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  className
}: FlashCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when entry changes
  useEffect(() => {
    setIsFlipped(false);
  }, [entry]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnowledge = (level: number) => {
    updateEntryKnowledge(entry.id, level);
    
    // Auto advance to next card after rating
    setTimeout(() => {
      if (canGoNext) {
        onNext();
      }
    }, 300);
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key) {
          case " ": // Spacebar to flip the card
            handleFlip();
            break;
          case "ArrowRight": // Right arrow for next
            if (canGoNext) onNext();
            break;
          case "ArrowLeft": // Left arrow for previous
            if (canGoPrev) onPrev();
            break;
          case "1": // 1, 2, 3 for knowledge level (when card is flipped)
            if (isFlipped) handleKnowledge(0); // Fail
            break;
          case "2":
            if (isFlipped) handleKnowledge(1); // Eh
            break;
          case "3":
            if (isFlipped) handleKnowledge(2); // Pass
            break;
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canGoNext, canGoPrev, isFlipped]);

  return (
    <div className={cn("w-full max-w-md relative", className)}>
      {/* Navigation arrows on sides */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 sm:-translate-x-16 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onPrev} 
          disabled={!canGoPrev}
          className="h-12 w-12 sm:h-14 sm:w-14 opacity-70 hover:opacity-100 rounded-full bg-background/80"
          aria-label="Previous card"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 sm:translate-x-16 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onNext} 
          disabled={!canGoNext}
          className="h-12 w-12 sm:h-14 sm:w-14 opacity-70 hover:opacity-100 rounded-full bg-background/80"
          aria-label="Next card"
        >
          <ArrowRight className="h-6 w-6" />
        </Button>
      </div>
      
      <div 
        className="w-full h-[340px] sm:h-[400px] relative cursor-pointer"
        onClick={handleFlip}
      >
        {/* Front of card (Output) */}
        <div className={cn(
          "absolute w-full h-full rounded-2xl p-6 bg-white/90 dark:bg-gray-800/90 shadow-lg border border-border/50 flex flex-col",
          isFlipped && "hidden"
        )}>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-base sm:text-lg">
              {entry.output}
            </pre>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Tap to reveal
          </div>
        </div>
        
        {/* Back of card (Input) */}
        <div className={cn(
          "absolute w-full h-full rounded-2xl p-6 bg-white/90 dark:bg-gray-800/90 shadow-lg border border-border/50 flex flex-col",
          !isFlipped && "hidden"
        )}>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <h3 className="text-xl sm:text-2xl font-semibold mb-3">{entry.input}</h3>
            {entry.additionalInput && (
              <p className="text-muted-foreground">{entry.additionalInput}</p>
            )}
          </div>
          
          <div className="flex justify-center space-x-3 mt-4">
            <Button 
              variant="fail" 
              onClick={(e) => {
                e.stopPropagation();
                handleKnowledge(0);
              }}
            >
              Fail
            </Button>
            <Button 
              variant="eh" 
              onClick={(e) => {
                e.stopPropagation();
                handleKnowledge(1);
              }}
            >
              Eh
            </Button>
            <Button 
              variant="pass" 
              onClick={(e) => {
                e.stopPropagation();
                handleKnowledge(2);
              }}
            >
              Pass
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
