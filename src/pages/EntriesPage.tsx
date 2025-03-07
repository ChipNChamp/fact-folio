
import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { EntriesTable } from "@/components/EntriesTable";
import { EntryType, getAllEntries, initializeStorage, addEntry } from "@/utils/storage";
import { Button } from "@/components/Button";
import { useNavigate } from "react-router-dom";
import { manualSync } from "@/utils/syncStorage";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEntryInput, setNewEntryInput] = useState("");
  const [newEntryOutput, setNewEntryOutput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<EntryType>("vocabulary");
  const [uploadStatus, setUploadStatus] = useState<{total: number, processed: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  const handleAddEntry = async () => {
    if (!selectedType) {
      toast({
        title: "Type required",
        description: "Please select a category type first",
        variant: "destructive",
      });
      return;
    }
    
    if (!newEntryInput.trim() || !newEntryOutput.trim()) {
      toast({
        title: "Input required",
        description: "Both input and output are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await addEntry(selectedType, newEntryInput, newEntryOutput);
      
      toast({
        title: "Entry added",
        description: "Your new entry has been saved",
      });
      
      // Reset form and close dialog
      setNewEntryInput("");
      setNewEntryOutput("");
      setIsAddDialogOpen(false);
      
      // Refresh the entries list
      handleRefresh();
    } catch (error) {
      console.error("Error adding entry:", error);
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const csvData = event.target?.result as string;
        const rows = csvData.split('\n');
        
        // Remove header row
        rows.shift();
        
        // Filter out empty rows
        const validRows = rows.filter(row => row.trim().length > 0);
        setUploadStatus({ total: validRows.length, processed: 0 });
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < validRows.length; i++) {
          try {
            const row = validRows[i];
            const columns = parseCSVRow(row);
            
            if (columns.length >= 2) {
              const input = columns[0].trim();
              const output = columns[1].trim();
              
              if (input && output) {
                await addEntry(uploadType, input, output);
                successCount++;
              } else {
                errorCount++;
              }
            } else {
              errorCount++;
            }
            
            setUploadStatus({ total: validRows.length, processed: i + 1 });
          } catch (error) {
            console.error("Error processing row:", error);
            errorCount++;
          }
        }
        
        toast({
          title: "CSV Upload Complete",
          description: `Added ${successCount} entries. Failed ${errorCount} entries.`,
        });
        
        setUploadStatus(null);
        setIsUploadDialogOpen(false);
        handleRefresh();
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error processing CSV:", error);
        toast({
          title: "Upload Failed",
          description: "There was an error processing the CSV file.",
          variant: "destructive",
        });
        setUploadStatus(null);
      }
    };
    
    reader.readAsText(file);
  };
  
  const parseCSVRow = (row: string): string[] => {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && i < row.length - 1 && row[i + 1] === '"') {
          // Double quotes inside quoted string -> escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of column
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
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
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsUploadDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
              {selectedType && (
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Entry
                </Button>
              )}
              <Button 
                onClick={() => navigate("/")}
                variant="outline"
                size="sm"
              >
                Add New
              </Button>
            </div>
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
                hideSelectMode={true}
              />
            )}
          </div>
        </div>
      </main>

      {/* Add Entry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : "Entry"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="input" className="text-sm font-medium">Input</label>
              <Input 
                id="input"
                value={newEntryInput}
                onChange={(e) => setNewEntryInput(e.target.value)}
                placeholder={selectedType === "vocabulary" ? "Enter word" : "Enter input"}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="output" className="text-sm font-medium">Output</label>
              <Textarea 
                id="output"
                value={newEntryOutput}
                onChange={(e) => setNewEntryOutput(e.target.value)}
                placeholder="Enter output content"
                className="w-full min-h-[120px]"
                rows={4}
              />
              
              {selectedType === "vocabulary" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Format as: brief definition, then numbered example sentences (1) and 2))
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEntry}
              disabled={isSubmitting || !newEntryInput.trim() || !newEntryOutput.trim()}
            >
              {isSubmitting ? "Adding..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">Entry Type</label>
              <select
                id="type"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as EntryType)}
                className="w-full p-2 border rounded"
              >
                {EntryTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="csv" className="text-sm font-medium">CSV File</label>
              <Input 
                id="csv"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                CSV format: First column = Input, Second column = Output. Include header row.
              </p>
            </div>
            
            {uploadStatus && (
              <div className="space-y-2">
                <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                  <div 
                    className="h-full bg-primary"
                    style={{ width: `${(uploadStatus.processed / uploadStatus.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center">
                  Processing {uploadStatus.processed} of {uploadStatus.total} entries
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUploadDialogOpen(false);
                setUploadStatus(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={!!uploadStatus}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EntriesPage;
