
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { EntriesTable } from "@/components/EntriesTable";
import { EntryType, getAllEntries, initializeStorage } from "@/utils/storage";
import { Button } from "@/components/Button";
import { useNavigate } from "react-router-dom";
import { manualSync } from "@/utils/syncStorage";

const EntryTypes: { value: EntryType; label: string }[] = [
  { value: "vocabulary", label: "Vocabulary" },
  { value: "phrases", label: "Phrases" },
  { value: "definitions", label: "Definitions" },
  { value: "questions", label: "Questions" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
];

const EntriesPage = () => {
  const [selectedType, setSelectedType] = useState<EntryType | undefined>(undefined);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [hasEntries, setHasEntries] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Initialize storage and sync
  useEffect(() => {
    const init = async () => {
      await initializeStorage();
      await manualSync(); // Sync with Supabase on load
      setIsLoading(false);
    };
    
    init();
  }, []);
  
  // Check if there are any entries
  useEffect(() => {
    const checkEntries = async () => {
      try {
        setIsLoading(true);
        const entries = await getAllEntries();
        setHasEntries(entries.length > 0);
      } catch (error) {
        console.error("Error checking entries:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkEntries();
  }, [refreshFlag]);
  
  const handleRefresh = () => {
    setRefreshFlag(prev => prev + 1);
  };
  
  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <Header title="Entries" />
      
      <main className="flex-1 px-2 py-3 sm:px-4 sm:py-6 max-w-5xl mx-auto w-full overflow-auto">
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Button
                variant={!selectedType ? "default" : "outline"}
                onClick={() => setSelectedType(undefined)}
                size="sm"
              >
                All
              </Button>
              
              {EntryTypes.map(type => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? "default" : "outline"}
                  onClick={() => setSelectedType(type.value)}
                  size="sm"
                >
                  {type.label}
                </Button>
              ))}
            </div>
            
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              size="sm"
            >
              Add New
            </Button>
          </div>
          
          <div className="border rounded-lg p-2 sm:p-4">
            {isLoading && !hasEntries ? (
              <div className="text-center p-8">
                <p className="text-muted-foreground">Loading entries...</p>
              </div>
            ) : (
              <EntriesTable 
                key={`${selectedType || 'all'}-${refreshFlag}`}
                type={selectedType} 
                onUpdate={handleRefresh}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EntriesPage;
