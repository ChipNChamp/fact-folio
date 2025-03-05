
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
  X,
  Download
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
  
  // Refresh entries - Fix the infinite update loop
  const refreshEntries = () => {
    const refreshedEntries = type ? getEntriesByType(type) : getAllEntries();
    setEntries(refreshedEntries);
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Export table to CSV
  const exportToCSV = () => {
    if (entries.length === 0) {
      toast({
        title: "Export failed",
        description: "No entries to export",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ["Input", "Additional Input", "Output", "Date", "Knowledge Level"];
    const rows = entries.map(entry => [
      `"${entry.input.replace(/"/g, '""')}"`,
      `"${(entry.additionalInput || "").replace(/"/g, '""')}"`,
      `"${entry.output.replace(/"/g, '""')}"`,
      `"${new Date(entry.createdAt).toLocaleDateString()}"`,
      `"${entry.knowledge === -1 ? "Not Reviewed" : entry.knowledge === 0 ? "Fail" : entry.knowledge === 1 ? "Eh" : "Pass"}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${type || "all"}-entries.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${entries.length} entries to CSV`,
    });
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
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToCSV}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-3 text-left font-medium text-sm">Input</th>
            {entries.some(e => e.additionalInput) && (
              <th className="p-3 text-left font-medium text-sm">Additional</th>
            )}
            <th className="p-3 text-left font-medium text-sm">Output</th>
            <th className="p-3 text-left font-medium text-sm">Date</th>
            <th className="p-3 text-left font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <React.Fragment key={entry.id}>
              <tr className="border-b border-border hover:bg-muted/20">
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
                
                <td className="p-3">
                  {editingId === entry.id ? (
                    <textarea
                      value={editOutput}
                      onChange={(e) => setEditOutput(e.target.value)}
                      className="w-full p-2 border rounded min-h-[50px]"
                      rows={2}
                    />
                  ) : (
                    <div className="max-h-[80px] overflow-y-auto text-sm">
                      {entry.output}
                    </div>
                  )}
                </td>
                
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
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
