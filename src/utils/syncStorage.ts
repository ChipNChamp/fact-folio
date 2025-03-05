import { EntryData, EntryType } from './storage';

const SYNC_EVENT_KEY = 'knowledge-entries-sync';

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

export const deleteEntryFromDB = async (id: string): Promise<void> => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error deleting entry:', event);
        reject('Error deleting entry');
      };
    });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.filter(e => e.id !== id);
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
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
