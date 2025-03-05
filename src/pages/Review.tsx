
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { FlashCard } from "@/components/FlashCard";
import { Button } from "@/components/Button";
import { getEntriesForReview, getEntriesByType, EntryData, EntryType } from "@/utils/storage";
import { RotateCcw, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const Review = () => {
  const { category } = useParams<{ category?: string }>();
  const [reviewEntries, setReviewEntries] = useState<EntryData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Load review entries on mount or when category changes
  useEffect(() => {
    let entries: EntryData[] = [];
    
    if (category) {
      // Category-specific review
      entries = getEntriesByType(category as EntryType);
    } else {
      // General review
      entries = getEntriesForReview(10);
    }
    
    setReviewEntries(entries);
    setCurrentIndex(0);
    setIsLoading(false);
  }, [category]);
  
  // Handle going to next card
  const handleNext = () => {
    if (currentIndex < reviewEntries.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  // Handle going to previous card
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  // Refresh with new review entries
  const refreshReview = () => {
    setIsLoading(true);
    
    let entries: EntryData[] = [];
    
    if (category) {
      entries = getEntriesByType(category as EntryType);
    } else {
      entries = getEntriesForReview(10);
    }
    
    setReviewEntries(entries);
    setCurrentIndex(0);
    setIsLoading(false);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="" />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center p-6">
            <p>Loading review cards...</p>
          </div>
        </main>
      </div>
    );
  }
  
  // Handle the case where there are no entries to review
  if (reviewEntries.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="" />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4 animate-fade-in">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium">No entries to review</h2>
            <p className="text-muted-foreground">
              {category 
                ? `Add some ${category} entries to start reviewing them.`
                : "Add some entries from the home screen to start reviewing them."}
            </p>
            <Button 
              onClick={() => navigate("/")}
              className="mt-4"
            >
              Go back to home
            </Button>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <Header title="" />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md relative">
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} of {reviewEntries.length}
            </p>
          </div>
          
          <FlashCard
            entry={reviewEntries[currentIndex]}
            onNext={handleNext}
            onPrev={handlePrev}
            canGoNext={currentIndex < reviewEntries.length - 1}
            canGoPrev={currentIndex > 0}
            className="animate-fade-in"
          />
          
          <div className="mt-4 w-full flex justify-center">
            <Button
              variant="outline"
              onClick={refreshReview}
              size="sm"
              className="mx-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> 
              New Session
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Review;
