
import { EntryData, EntryType } from './storage';
import { supabase } from "@/integrations/supabase/client";

const SYNC_EVENT_KEY = 'knowledge-entries-sync';
const LAST_SYNC_KEY = 'knowledge-entries-last-sync';
const DELETED_ENTRIES_KEY = 'knowledge-entries-deleted';
const DELETION_TIMESTAMP_KEY = 'knowledge-entries-deletion-timestamp';

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
  // Check if this entry is in the deleted list before saving
  const deletedEntries = getDeletedEntries();
  if (deletedEntries.includes(entry.id)) {
    console.log(`Not saving entry ${entry.id} as it's marked for deletion`);
    return;
  }

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

// Track deleted entries with timestamps
export const addToDeletedEntries = async (id: string): Promise<void> => {
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  const deletedEntries = JSON.parse(deletedEntriesStr);
  
  if (!deletedEntries.includes(id)) {
    deletedEntries.push(id);
    localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(deletedEntries));
    
    // Also update deletion timestamp
    const now = Date.now();
    const timestampsStr = localStorage.getItem(DELETION_TIMESTAMP_KEY) || '{}';
    const timestamps = JSON.parse(timestampsStr);
    timestamps[id] = now;
    localStorage.setItem(DELETION_TIMESTAMP_KEY, JSON.stringify(timestamps));
    
    console.log(`Added ID ${id} to deleted entries list with timestamp ${now}`);
  }
};

export const getDeletedEntries = (): string[] => {
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  return JSON.parse(deletedEntriesStr);
};

export const getDeletedEntryTimestamp = (id: string): number => {
  const timestampsStr = localStorage.getItem(DELETION_TIMESTAMP_KEY) || '{}';
  const timestamps = JSON.parse(timestampsStr);
  return timestamps[id] || 0;
};

export const clearDeletedEntries = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  let deletedEntries = JSON.parse(deletedEntriesStr);
  
  // Remove the specified IDs from the deleted entries list
  deletedEntries = deletedEntries.filter((id: string) => !ids.includes(id));
  
  localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(deletedEntries));
  
  // Also clean up timestamps
  const timestampsStr = localStorage.getItem(DELETION_TIMESTAMP_KEY) || '{}';
  const timestamps = JSON.parse(timestampsStr);
  
  ids.forEach(id => {
    delete timestamps[id];
  });
  
  localStorage.setItem(DELETION_TIMESTAMP_KEY, JSON.stringify(timestamps));
  console.log(`Cleared ${ids.length} IDs from deleted entries list`);
};

export const deleteEntryFromDB = async (id: string): Promise<void> => {
  try {
    console.log(`Attempting to delete entry with ID: ${id} from local and mark for Supabase deletion`);
    
    // Mark for deletion in Supabase (to be processed during next sync)
    await addToDeletedEntries(id);
    
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

// Enhanced Supabase sync functions
const syncWithSupabase = async () => {
  console.log('Starting Supabase sync');
  try {
    // STEP 1: Process all deletions first and wait for them to complete
    const deletedEntryIds = getDeletedEntries();
    console.log('Currently deleted entry IDs:', deletedEntryIds);
    
    if (deletedEntryIds.length > 0) {
      console.log(`Deleting ${deletedEntryIds.length} entries from Supabase`);
      
      // Perform deletion for each ID individually to catch any failures
      const successfullyDeletedIds = [];
      
      for (const id of deletedEntryIds) {
        const timestamp = getDeletedEntryTimestamp(id);
        
        // Add a deletion marker in Supabase with timestamp
        const { error: upsertError } = await supabase
          .from('knowledge_entries')
          .upsert({
            id: id,
            type: 'deleted', // Mark as deleted type
            input: 'DELETED', 
            output: 'DELETED',
            created_at: 0,
            knowledge: -999, // Special marker for deleted entries
            last_synced_at: timestamp // Use deletion timestamp
          });
        
        if (upsertError) {
          console.error(`Error marking entry ${id} as deleted in Supabase:`, upsertError);
        } else {
          console.log(`Entry ${id} marked as deleted in Supabase successfully with timestamp ${timestamp}`);
          successfullyDeletedIds.push(id);
        }
      }
      
      // Clear successfully deleted entries from tracking list
      if (successfullyDeletedIds.length > 0) {
        await clearDeletedEntries(successfullyDeletedIds);
        console.log('Cleared successfully deleted entries from tracking list');
      }
    }
    
    // STEP 2: Get the last sync time AFTER deletions are processed
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY) 
      ? parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0') 
      : 0;
    
    // Get an updated list of deleted entries (after potential clearing)
    const updatedDeletedEntryIds = getDeletedEntries();
    
    // STEP 3: Now fetch local entries for uploading to Supabase
    const localEntries = await getAllEntriesFromDB();
    
    // Upload local entries to Supabase
    for (const localEntry of localEntries) {
      // Skip entries that are in the deleted list
      if (updatedDeletedEntryIds.includes(localEntry.id)) {
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
    
    // STEP 4: Finally, fetch from Supabase and update local DB
    // Get entries from Supabase that were updated since the last sync
    // but exclude the ones that we know were deleted
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
        // Skip entries that are in the deleted list or marked with knowledge: -999
        if (updatedDeletedEntryIds.includes(remoteEntry.id) || remoteEntry.knowledge === -999) {
          console.log(`Skipping deleted entry: ${remoteEntry.id}`);
          
          // If it's a deletion marker from another device, add it to our local deletion list
          if (remoteEntry.knowledge === -999 && !updatedDeletedEntryIds.includes(remoteEntry.id)) {
            await addToDeletedEntries(remoteEntry.id);
            
            // Also delete from local DB
            try {
              const db = await openDatabase();
              const transaction = db.transaction(['entries'], 'readwrite');
              const store = transaction.objectStore('entries');
              store.delete(remoteEntry.id);
            } catch (err) {
              console.error(`Error removing deleted entry ${remoteEntry.id} from local DB:`, err);
            }
          }
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
