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
    
    await addToDeletedEntries(id);
    
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
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.filter(e => e.id !== id);
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

const syncWithSupabase = async () => {
  console.log('Starting Supabase sync');
  try {
    const deletedEntryIds = getDeletedEntries();
    console.log('Currently deleted entry IDs:', deletedEntryIds);
    
    if (deletedEntryIds.length > 0) {
      console.log(`Processing ${deletedEntryIds.length} entries for deletion in Supabase`);
      
      const successfullyDeletedIds = [];
      
      for (const id of deletedEntryIds) {
        const timestamp = getDeletedEntryTimestamp(id);
        
        const { error: upsertError } = await supabase
          .from('knowledge_entries')
          .upsert({
            id: id,
            type: 'deleted',
            input: 'DELETED', 
            output: 'DELETED',
            created_at: 0,
            knowledge: -999,
            last_synced_at: timestamp
          });
        
        if (upsertError) {
          console.error(`Error marking entry ${id} as deleted in Supabase:`, upsertError);
        } else {
          console.log(`Entry ${id} marked as deleted in Supabase with timestamp ${timestamp}`);
          successfullyDeletedIds.push(id);
        }
      }
      
      if (successfullyDeletedIds.length > 0) {
        await clearDeletedEntries(successfullyDeletedIds);
        console.log('Cleared successfully deleted entries from tracking list');
      }
    }
    
    const lastSyncTime = localStorage.getItem(LAST_SYNC_KEY) 
      ? parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0') 
      : 0;
    
    const updatedDeletedEntryIds = getDeletedEntries();
    
    const localEntries = await getAllEntriesFromDB();
    console.log(`Found ${localEntries.length} local entries to consider for upload`);
    
    for (const localEntry of localEntries) {
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
    
    console.log(`Fetching entries from Supabase updated since ${new Date(lastSyncTime).toISOString()}`);
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
      
      const remoteDeletedIds = remoteEntries
        .filter(entry => entry.type === 'deleted' || entry.knowledge === -999)
        .map(entry => entry.id);
      
      console.log(`Found ${remoteDeletedIds.length} remotely deleted entries`);
      
      for (const deletedId of remoteDeletedIds) {
        if (!updatedDeletedEntryIds.includes(deletedId)) {
          await addToDeletedEntries(deletedId);
          try {
            const db = await openDatabase();
            const transaction = db.transaction(['entries'], 'readwrite');
            const store = transaction.objectStore('entries');
            store.delete(deletedId);
            console.log(`Removed remotely deleted entry ${deletedId} from local DB`);
          } catch (err) {
            console.error(`Error removing deleted entry ${deletedId} from local DB:`, err);
          }
        }
      }
      
      for (const remoteEntry of remoteEntries) {
        if (remoteEntry.type === 'deleted' || remoteEntry.knowledge === -999 || updatedDeletedEntryIds.includes(remoteEntry.id)) {
          console.log(`Skipping deleted entry from sync: ${remoteEntry.id}`);
          continue;
        }
        
        const entry: EntryData = {
          id: remoteEntry.id,
          type: remoteEntry.type as EntryType,
          input: remoteEntry.input,
          output: remoteEntry.output,
          additionalInput: remoteEntry.additional_input || undefined,
          createdAt: remoteEntry.created_at,
          knowledge: remoteEntry.knowledge
        };
        
        if (!updatedDeletedEntryIds.includes(entry.id)) {
          await saveEntryToDB(entry);
        }
      }
    }
    
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    console.log('Supabase sync completed successfully');
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
