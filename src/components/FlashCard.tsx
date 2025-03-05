
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

  return (
    <div className={cn("w-full max-w-md", className)}>
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
      
      {/* Navigation arrows */}
      <div className="flex justify-between mt-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onPrev} 
          disabled={!canGoPrev}
          className="opacity-70 hover:opacity-100"
          aria-label="Previous card"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onNext} 
          disabled={!canGoNext}
          className="opacity-70 hover:opacity-100"
          aria-label="Next card"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
