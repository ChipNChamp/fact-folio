
import { useState, useEffect } from "react";
import { 
  getAllEntries, 
  getEntriesByType, 
  deleteEntry, 
  updateEntry,
  EntryData, 
  EntryType 
} from "@/utils/storage";
import { 
  Pencil, 
  Trash2, 
  Save, 
  X 
} from "lucide-react";
import { Button } from "@/components/Button";
import { useToast } from "@/hooks/use-toast";

interface EntriesTableProps {
  type?: EntryType;
  onUpdate?: () => void;
}

export const EntriesTable = ({ type, onUpdate }: EntriesTableProps) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [editAdditionalInput, setEditAdditionalInput] = useState<string>("");
  const [editOutput, setEditOutput] = useState("");
  
  // Load entries when type changes
  useEffect(() => {
    refreshEntries();
  }, [type]);
  
  // Delete an entry
  const handleDelete = (id: string) => {
    try {
      deleteEntry(id);
      setEntries(entries.filter(entry => entry.id !== id));
      toast({
        title: "Entry deleted",
        description: "The entry has been removed",
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete the entry",
        variant: "destructive",
      });
    }
  };
  
  // Edit an entry
  const startEditing = (entry: EntryData) => {
    setEditingId(entry.id);
    setEditInput(entry.input);
    setEditAdditionalInput(entry.additionalInput || "");
    setEditOutput(entry.output);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditInput("");
    setEditAdditionalInput("");
    setEditOutput("");
  };
  
  // Save edited entry
  const saveEdit = (entry: EntryData) => {
    try {
      const updatedEntry = {
        ...entry,
        input: editInput,
        additionalInput: editAdditionalInput || undefined,
        output: editOutput
      };
      
      updateEntry(updatedEntry);
      
      setEntries(entries.map(e => 
        e.id === entry.id ? updatedEntry : e
      ));
      
      toast({
        title: "Entry updated",
        description: "Changes have been saved",
      });
      
      cancelEditing();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Could not update the entry",
        variant: "destructive",
      });
    }
  };
  
  // Refresh entries
  const refreshEntries = () => {
    const refreshedEntries = type ? getEntriesByType(type) : getAllEntries();
    setEntries(refreshedEntries);
    if (onUpdate) onUpdate();
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  
  if (entries.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No entries found</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto animate-fade-in">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-3 text-left font-medium text-sm">Input</th>
            {entries.some(e => e.additionalInput) && (
              <th className="p-3 text-left font-medium text-sm">Additional</th>
            )}
            <th className="p-3 text-left font-medium text-sm">Date</th>
            <th className="p-3 text-left font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <>
              <tr 
                key={entry.id} 
                className="border-b border-border hover:bg-muted/20"
              >
                <td className="p-3">
                  {editingId === entry.id ? (
                    <input
                      type="text"
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full p-2 border rounded"
                      autoFocus
                    />
                  ) : (
                    entry.input
                  )}
                </td>
                
                {entries.some(e => e.additionalInput) && (
                  <td className="p-3">
                    {editingId === entry.id ? (
                      <input
                        type="text"
                        value={editAdditionalInput}
                        onChange={(e) => setEditAdditionalInput(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    ) : (
                      entry.additionalInput || "-"
                    )}
                  </td>
                )}
                
                <td className="p-3 whitespace-nowrap">
                  {formatDate(entry.createdAt)}
                </td>
                
                <td className="p-3 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {editingId === entry.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => saveEdit(entry)}
                          title="Save changes"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={cancelEditing}
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => startEditing(entry)}
                          title="Edit entry"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              
              {/* Output row when editing */}
              {editingId === entry.id && (
                <tr className="bg-muted/10">
                  <td colSpan={entries.some(e => e.additionalInput) ? 4 : 3} className="p-3">
                    <div className="mb-1 font-medium text-sm">Output:</div>
                    <textarea
                      value={editOutput}
                      onChange={(e) => setEditOutput(e.target.value)}
                      className="w-full p-2 border rounded min-h-[100px]"
                      rows={4}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};
