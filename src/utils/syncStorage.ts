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

export const markEntryAsDeleted = async (id: string): Promise<void> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const entry = getRequest.result;
      if (entry) {
        const now = Date.now();
        entry.deleted = true;
        entry.deletedAt = now;
        // Set purge_after to 30 days from now
        entry.purgeAfter = now + (30 * 24 * 60 * 60 * 1000);
        
        store.put(entry);
        console.log(`Marked entry ${id} as deleted with timestamp ${entry.deletedAt}`);
      }
    };
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to mark entry as deleted:', error);
    
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.map(e => {
      if (e.id === id) {
        const now = Date.now();
        return {
          ...e, 
          deleted: true, 
          deletedAt: now,
          purgeAfter: now + (30 * 24 * 60 * 60 * 1000)
        };
      }
      return e;
    });
    
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
  }
};

const syncWithSupabase = async () => {
  console.log('Starting Supabase sync');
  try {
    const localEntries = await getAllEntriesFromDB();
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY) 
      ? parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0') 
      : 0;
    
    console.log(`Fetching entries from Supabase updated since ${new Date(lastSyncTime).toISOString()}`);
    
    // Fetch all entries that have been updated since last sync
    const { data: remoteEntries, error: fetchError } = await supabase
      .from('knowledge_entries')
      .select('*')
      .gt('last_synced_at', lastSyncTime);
    
    if (fetchError) {
      console.error('Error fetching from Supabase:', fetchError);
      return;
    }
    
    if (remoteEntries && remoteEntries.length > 0) {
      console.log(`Found ${remoteEntries.length} entries to sync from Supabase`);
      
      for (const remoteEntry of remoteEntries) {
        const localEntry = localEntries.find(e => e.id === remoteEntry.id);
        
        // If remote entry is newer version or we don't have it locally
        if (!localEntry || (localEntry && remoteEntry.version > (localEntry.version || 1))) {
          if (remoteEntry.deleted_at) {
            // Handle deleted entry
            await markEntryAsDeleted(remoteEntry.id);
          } else {
            // Handle active entry
            const entry: EntryData = {
              id: remoteEntry.id,
              type: remoteEntry.type as EntryType,
              input: remoteEntry.input,
              output: remoteEntry.output,
              additionalInput: remoteEntry.additional_input || undefined,
              createdAt: remoteEntry.created_at,
              knowledge: remoteEntry.knowledge,
              version: remoteEntry.version,
              deleted: false,
              deletedAt: undefined,
              purgeAfter: undefined
            };
            
            await saveEntryToDB(entry);
          }
        }
      }
    }
    
    // Sync local changes to Supabase
    for (const localEntry of localEntries) {
      if (localEntry.deleted && localEntry.deletedAt && localEntry.deletedAt > lastSyncTime) {
        // Sync deleted entry
        const { error: upsertError } = await supabase
          .from('knowledge_entries')
          .upsert({
            id: localEntry.id,
            type: localEntry.type,
            input: localEntry.input,
            output: localEntry.output,
            additional_input: localEntry.additionalInput,
            created_at: localEntry.createdAt,
            version: localEntry.version || 1,
            deleted_at: localEntry.deletedAt,
            purge_after: localEntry.purgeAfter,
            last_synced_at: Date.now()
          });
        
        if (upsertError) {
          console.error(`Error syncing deleted entry ${localEntry.id}:`, upsertError);
        }
      } else if (!localEntry.deleted) {
        // Sync active entry
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
            version: localEntry.version || 1,
            deleted_at: null,
            purge_after: null,
            last_synced_at: Date.now()
          });
        
        if (upsertError) {
          console.error('Error upserting to Supabase:', upsertError);
        }
      }
    }
    
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    console.log('Supabase sync completed successfully');
  } catch (error) {
    console.error('Supabase sync failed:', error);
  }
};

export const addToDeletedEntries = async (id: string): Promise<void> => {
  const deletedEntriesStr = localStorage.getItem(DELETED_ENTRIES_KEY) || '[]';
  const deletedEntries = JSON.parse(deletedEntriesStr);
  
  if (!deletedEntries.includes(id)) {
    deletedEntries.push(id);
    localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(deletedEntries));
    
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
  
  deletedEntries = deletedEntries.filter((id: string) => !ids.includes(id));
  
  localStorage.setItem(DELETED_ENTRIES_KEY, JSON.stringify(deletedEntries));
  
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
    
    await markEntryAsDeleted(id);
    
    await addToDeletedEntries(id);
  } catch (error) {
    console.error('Failed to delete entry:', error);
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.map(e => {
      if (e.id === id) {
        return {...e, deleted: true, deletedAt: Date.now()};
      }
      return e;
    });
    
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
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

const supportsBackgroundSync = () => {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
};

export const manualSync = async () => {
  console.log('Performing manual sync');
  
  try {
    const localStorageEntries = localStorage.getItem('knowledge-entries');
    if (localStorageEntries) {
      const entries: EntryData[] = JSON.parse(localStorageEntries);
      for (const entry of entries) {
        await saveEntryToDB(entry);
      }
      
      const allEntries = await getAllEntriesFromDB();
      localStorage.setItem('knowledge-entries', JSON.stringify(allEntries));
    }
    
    await syncWithSupabase();
    
    localStorage.setItem('last-sync-time', Date.now().toString());
    console.log('Manual sync completed');
  } catch (error) {
    console.error('Manual sync failed:', error);
  }
};

export const initializeSync = async () => {
  const localStorageEntries = localStorage.getItem('knowledge-entries');
  if (localStorageEntries) {
    const entries: EntryData[] = JSON.parse(localStorageEntries);
    for (const entry of entries) {
      await saveEntryToDB(entry);
    }
  }

  await syncWithSupabase();

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
  
  setInterval(manualSync, 30000);
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      manualSync();
    }
  });
  
  window.addEventListener('online', manualSync);
};
