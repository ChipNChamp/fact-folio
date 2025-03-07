import { EntryData, EntryType } from './storage';
import { supabase } from "@/integrations/supabase/client";

const SYNC_EVENT_KEY = 'knowledge-entries-sync';
const LAST_SYNC_KEY = 'knowledge-entries-last-sync';
const DELETED_ENTRIES_KEY = 'knowledge-entries-deleted';

let db: IDBDatabase | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open('knowledge-entries-db', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject('Error opening IndexedDB');
    };
  });
};

export const getAllEntriesFromDB = async (): Promise<EntryData[]> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['entries'], 'readonly');
      const store = transaction.objectStore('entries');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error('Error fetching entries:', event);
        reject('Error fetching entries');
      };
    });
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    const entries = localStorage.getItem('knowledge-entries');
    return entries ? JSON.parse(entries) : [];
  }
};

export const saveEntryToDB = async (entry: EntryData): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.put(entry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error saving entry:', event);
        reject('Error saving entry');
      };
    });
  } catch (error) {
    console.error('Failed to save entry:', error);
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.map(e => e.id === entry.id ? entry : e);
    
    if (!updatedEntries.some(e => e.id === entry.id)) {
      updatedEntries.push(entry);
    }
    
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
  }
};

// Track deleted entries to prevent resyncing them
export const addToDeletedEntries = async (id: string): Promise<void> => {
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  const deletedEntries = JSON.parse(deletedEntriesStr);
  
  if (!deletedEntries.includes(id)) {
    deletedEntries.push(id);
    localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(deletedEntries));
  }
};

export const getDeletedEntries = (): string[] => {
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  return JSON.parse(deletedEntriesStr);
};

export const clearDeletedEntries = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  let deletedEntries = JSON.parse(deletedEntriesStr);
  
  // Remove the specified IDs from the deleted entries list
  deletedEntries = deletedEntries.filter((id: string) => !ids.includes(id));
  
  localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(deletedEntries));
};

export const deleteEntryFromDB = async (id: string): Promise<void> => {
  try {
    // First delete from Supabase to ensure it's deleted server-side
    const { error } = await supabase
      .from('knowledge_entries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting entry from Supabase:', error);
      // If it fails, we'll add it to the deleted entries list to try again later
      await addToDeletedEntries(id);
    } else {
      console.log(`Entry ${id} deleted from Supabase successfully`);
    }
    
    // Delete from IndexedDB
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error deleting entry from IndexedDB:', event);
        reject('Error deleting entry');
      };
    });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    // Fallback to localStorage
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.filter(e => e.id !== id);
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
    
    // Still track the deletion even if it failed
    await addToDeletedEntries(id);
  }
};

export const clearAllEntriesFromDB = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error clearing entries:', event);
        reject('Error clearing entries');
      };
    });
  } catch (error) {
    console.error('Failed to clear entries:', error);
    localStorage.removeItem('knowledge-entries');
  }
};

export const getEntriesByTypeFromDB = async (type: EntryType): Promise<EntryData[]> => {
  const allEntries = await getAllEntriesFromDB();
  return allEntries.filter(entry => entry.type === type);
};

// Supabase sync functions
const syncWithSupabase = async () => {
  console.log('Starting Supabase sync');
  try {
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY) 
      ? parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0') 
      : 0;
    
    // Fetch local entries
    const localEntries = await getAllEntriesFromDB();
    
    // Get deleted entries list
    const deletedEntryIds = getDeletedEntries();
    
    // Get entries from Supabase that were updated since the last sync
    const { data: remoteEntries, error: fetchError } = await supabase
      .from('knowledge_entries')
      .select('*')
      .gt('last_synced_at', lastSyncTime);
    
    if (fetchError) {
      console.error('Error fetching from Supabase:', fetchError);
      return;
    }
    
    // Process remote entries and update local storage
    if (remoteEntries && remoteEntries.length > 0) {
      console.log(`Found ${remoteEntries.length} entries to sync from Supabase`);
      
      for (const remoteEntry of remoteEntries) {
        // Skip entries that are in the deleted list
        if (deletedEntryIds.includes(remoteEntry.id)) {
          console.log(`Skipping deleted entry: ${remoteEntry.id}`);
          continue;
        }
        
        // Convert Supabase entry to local format
        const entry: EntryData = {
          id: remoteEntry.id,
          type: remoteEntry.type as EntryType,
          input: remoteEntry.input,
          output: remoteEntry.output,
          additionalInput: remoteEntry.additional_input || undefined,
          createdAt: remoteEntry.created_at,
          knowledge: remoteEntry.knowledge
        };
        
        // Save to local IndexedDB
        await saveEntryToDB(entry);
      }
    }
    
    // Upload local entries to Supabase
    for (const localEntry of localEntries) {
      // Skip entries that are in the deleted list
      if (deletedEntryIds.includes(localEntry.id)) {
        console.log(`Skipping deleted entry from upload: ${localEntry.id}`);
        continue;
      }
      
      const { error: upsertError } = await supabase
        .from('knowledge_entries')
        .upsert({
          id: localEntry.id,
          type: localEntry.type,
          input: localEntry.input,
          output: localEntry.output,
          additional_input: localEntry.additionalInput,
          created_at: localEntry.createdAt,
          knowledge: localEntry.knowledge,
          last_synced_at: Date.now()
        });
      
      if (upsertError) {
        console.error('Error upserting to Supabase:', upsertError);
      }
    }
    
    // Delete entries from Supabase that are in the deleted list
    if (deletedEntryIds.length > 0) {
      console.log(`Deleting ${deletedEntryIds.length} entries from Supabase`);
      
      const { error: deleteError, data: deleteData } = await supabase
        .from('knowledge_entries')
        .delete()
        .in('id', deletedEntryIds);
      
      if (deleteError) {
        console.error('Error deleting entries from Supabase:', deleteError);
      } else {
        console.log('Deleted entries from Supabase successfully');
        // Clear the successfully deleted entries from our tracking list
        await clearDeletedEntries(deletedEntryIds);
      }
    }
    
    // Update last sync time
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    console.log('Supabase sync completed');
  } catch (error) {
    console.error('Supabase sync failed:', error);
  }
};

const supportsBackgroundSync = () => {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
};

export const manualSync = async () => {
  console.log('Performing manual sync');
  
  try {
    // First sync local storage with IndexedDB
    const localStorageEntries = localStorage.getItem('knowledge-entries');
    if (localStorageEntries) {
      const entries: EntryData[] = JSON.parse(localStorageEntries);
      for (const entry of entries) {
        await saveEntryToDB(entry);
      }
      
      const allEntries = await getAllEntriesFromDB();
      localStorage.setItem('knowledge-entries', JSON.stringify(allEntries));
    }
    
    // Then sync with Supabase
    await syncWithSupabase();
    
    localStorage.setItem('last-sync-time', Date.now().toString());
    console.log('Manual sync completed');
  } catch (error) {
    console.error('Manual sync failed:', error);
  }
};

export const initializeSync = async () => {
  // Initialize IndexedDB from localStorage if needed
  const localStorageEntries = localStorage.getItem('knowledge-entries');
  if (localStorageEntries) {
    const entries: EntryData[] = JSON.parse(localStorageEntries);
    for (const entry of entries) {
      await saveEntryToDB(entry);
    }
  }

  // Perform initial sync with Supabase
  await syncWithSupabase();

  // Set up background sync if supported
  if (supportsBackgroundSync()) {
    try {
      navigator.serviceWorker.ready.then((registration) => {
        if ('sync' in registration) {
          const syncManager = (registration as any).sync;
          syncManager.register(SYNC_EVENT_KEY).catch((err: Error) => {
            console.error('Background sync registration failed:', err);
          });
        } else {
          console.log('Background Sync API not available in this browser');
          setupManualSync();
        }
      });
    } catch (err) {
      console.error('Sync registration error:', err);
      setupManualSync();
    }
  } else {
    console.log('Background Sync not supported in this browser');
    setupManualSync();
  }
};

const setupManualSync = () => {
  manualSync();
  
  setInterval(manualSync, 30000); // Sync every 30 seconds
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      manualSync();
    }
  });
  
  window.addEventListener('online', manualSync);
};
