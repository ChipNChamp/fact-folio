import React, { useState, useEffect } from "react";
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
  Download,
  RefreshCw,
  CheckSquare,
  Square,
  XCircle
} from "lucide-react";
import { Button } from "@/components/Button";
import { useToast } from "@/hooks/use-toast";
import { manualSync } from "@/utils/syncStorage";
import { Input } from "@/components/ui/input";
import { addToDeletedEntries } from "@/utils/syncStorage";

interface EntriesTableProps {
  type?: EntryType;
  onUpdate?: () => void;
}

export const EntriesTable = ({ type, onUpdate }: EntriesTableProps) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [editOutput, setEditOutput] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  
  useEffect(() => {
    refreshEntries();
  }, [type]);
  
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      
      // Mark for deletion but don't delete locally yet
      await addToDeletedEntries(id);
      
      // Update UI to remove the entry
      setEntries(entries.filter(entry => entry.id !== id));
      
      // Now sync with Supabase to properly mark the entry as deleted
      await manualSync();
      
      toast({
        title: "Entry marked for deletion",
        description: "The entry will be removed during sync",
      });
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error marking entry for deletion:", error);
      toast({
        title: "Delete failed",
        description: "Could not mark the entry for deletion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No entries selected",
        description: "Please select entries to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Mark all selected entries for deletion
      for (const id of selectedEntries) {
        await addToDeletedEntries(id);
      }
      
      // Visual feedback - update UI to hide these items
      setEntries(entries.filter(entry => !selectedEntries.includes(entry.id)));
      
      // Now sync with Supabase to perform the actual deletion
      await manualSync();
      
      toast({
        title: "Entries marked for deletion",
        description: `${selectedEntries.length} entries have been marked for deletion and synced with the server.`,
      });
      
      setSelectedEntries([]);
      setSelectMode(false);
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error marking entries for deletion:", error);
      toast({
        title: "Operation failed",
        description: "Could not mark some entries for deletion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSelectEntry = (id: string) => {
    setSelectedEntries(prev => 
      prev.includes(id) 
        ? prev.filter(entryId => entryId !== id) 
        : [...prev, id]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedEntries.length === entries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries.map(e => e.id));
    }
  };
  
  const startEditing = (entry: EntryData) => {
    setEditingId(entry.id);
    setEditInput(entry.input);
    setEditOutput(entry.output);
  };
  
  const cancelEditing = () => {
    setEditingId(null);
    setEditInput("");
    setEditOutput("");
  };
  
  const saveEdit = async (entry: EntryData) => {
    try {
      setLoading(true);
      const updatedEntry = {
        ...entry,
        input: editInput,
        output: editOutput,
        additionalInput: undefined
      };
      
      await updateEntry(updatedEntry);
      
      setEntries(entries.map(e => 
        e.id === entry.id ? updatedEntry : e
      ));
      
      toast({
        title: "Entry updated",
        description: "Changes have been saved",
      });
      
      cancelEditing();
      
      // Sync after update
      await manualSync();
      
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Could not update the entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const refreshEntries = async () => {
    setLoading(true);
    try {
      const refreshedEntries = type 
        ? await getEntriesByType(type) 
        : await getAllEntries();
      setEntries(refreshedEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast({
        title: "Error",
        description: "Failed to load entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await manualSync();
      await refreshEntries();
      toast({
        title: "Sync complete",
        description: "Entries have been synchronized with the server",
      });
    } catch (error) {
      console.error("Error syncing entries:", error);
      toast({
        title: "Sync failed",
        description: "Could not synchronize entries with the server",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const exportToCSV = () => {
    if (entries.length === 0) {
      toast({
        title: "Export failed",
        description: "No entries to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Input", "Output", "Date", "Knowledge Level"];
    const rows = entries.map(entry => [
      `"${entry.input.replace(/"/g, '""')}"`,
      `"${entry.output.replace(/"/g, '""')}"`,
      `"${new Date(entry.createdAt).toLocaleDateString()}"`,
      `"${entry.knowledge === -1 ? "Not Reviewed" : entry.knowledge === 0 ? "Fail" : entry.knowledge === 1 ? "Eh" : "Pass"}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

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
  
  if (loading && entries.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">Loading entries...</p>
      </div>
    );
  }
  
  if (entries.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No entries found</p>
        <Button 
          variant="default"
          size="sm" 
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 mt-4 mx-auto"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? "Syncing..." : "Sync with Server"}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto animate-fade-in">
      <div className="sticky top-0 z-10 bg-background p-4 border-b border-border mb-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectMode(!selectMode)}
              className="flex items-center gap-2"
            >
              {selectMode ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Cancel Selection
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Select Mode
                </>
              )}
            </Button>
            
            {selectMode && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedEntries.length === entries.length ? (
                    <>
                      <Square className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Select All
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="fail" 
                  size="sm" 
                  onClick={handleBatchDelete}
                  disabled={selectedEntries.length === 0}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedEntries.length})
                </Button>
              </>
            )}
          </div>
          
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
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
        </div>
      </div>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {selectMode && (
              <th className="p-3 text-left font-medium text-sm w-10"></th>
            )}
            <th className="p-3 text-left font-medium text-sm">Input</th>
            <th className="p-3 text-left font-medium text-sm">Output</th>
            <th className="p-3 text-left font-medium text-sm">Date</th>
            <th className="p-3 text-left font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr 
              key={entry.id} 
              className={`border-b border-border hover:bg-muted/20 ${selectedEntries.includes(entry.id) ? 'bg-muted/30' : ''}`}
            >
              {selectMode && (
                <td className="p-3 text-center">
                  <button 
                    onClick={() => toggleSelectEntry(entry.id)} 
                    className="cursor-pointer"
                    aria-label={selectedEntries.includes(entry.id) ? "Deselect entry" : "Select entry"}
                  >
                    {selectedEntries.includes(entry.id) ? (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </td>
              )}
              
              <td className="p-3">
                {editingId === entry.id ? (
                  <Input
                    type="text"
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                ) : (
                  entry.input
                )}
              </td>
              
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
                      {!selectMode && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
