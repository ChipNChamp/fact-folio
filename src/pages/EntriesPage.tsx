
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { EntriesTable } from "@/components/EntriesTable";
import { EntryType, getAllEntries } from "@/utils/storage";
import { Button } from "@/components/Button";
import { useNavigate } from "react-router-dom";
import { useMobile } from "@/hooks/use-mobile";

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
  const isMobile = useMobile();
  const navigate = useNavigate();
  
  // Check if there are any entries
  useEffect(() => {
    const entries = getAllEntries();
    setHasEntries(entries.length > 0);
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
            <EntriesTable 
              key={`${selectedType || 'all'}-${refreshFlag}`}
              type={selectedType} 
              onUpdate={handleRefresh}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EntriesPage;
