
import { EntryData, EntryType } from './storage';

// Define the sync event names
const SYNC_EVENT_KEY = 'knowledge-entries-sync';

// Initialize db connection
let db: IDBDatabase | null = null;

// Open the IndexedDB database
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

// Get all entries from IndexedDB
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
    // Fall back to localStorage if IndexedDB fails
    const entries = localStorage.getItem('knowledge-entries');
    return entries ? JSON.parse(entries) : [];
  }
};

// Add or update an entry in IndexedDB
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
    // Fallback to localStorage
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.map(e => e.id === entry.id ? entry : e);
    
    if (!updatedEntries.some(e => e.id === entry.id)) {
      updatedEntries.push(entry);
    }
    
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
  }
};

// Delete an entry from IndexedDB
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
    // Fallback to localStorage
    const entries = await getAllEntriesFromDB();
    const updatedEntries = entries.filter(e => e.id !== id);
    localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
  }
};

// Clear all entries from IndexedDB
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
    // Fallback to localStorage
    localStorage.removeItem('knowledge-entries');
  }
};

// Get entries by type from IndexedDB
export const getEntriesByTypeFromDB = async (type: EntryType): Promise<EntryData[]> => {
  const allEntries = await getAllEntriesFromDB();
  return allEntries.filter(entry => entry.type === type);
};

// Initialize sync mechanism
export const initializeSync = async () => {
  // First, ensure we migrate any existing localStorage data to IndexedDB
  const localStorageEntries = localStorage.getItem('knowledge-entries');
  if (localStorageEntries) {
    const entries: EntryData[] = JSON.parse(localStorageEntries);
    for (const entry of entries) {
      await saveEntryToDB(entry);
    }
  }

  // Set up periodic sync if browser supports it
  if ('serviceWorker' in navigator && 'sync' in window) {
    try {
      // Register for sync events
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register(SYNC_EVENT_KEY).catch(err => {
          console.error('Background sync registration failed:', err);
        });
      });
    } catch (err) {
      console.error('Sync registration error:', err);
    }
  } else {
    console.log('Background sync not supported in this browser');
    
    // Alternative: set up a simple periodic check using local storage timestamp
    setInterval(async () => {
      const lastSyncTime = localStorage.getItem('last-sync-time');
      const currentTime = Date.now().toString();
      
      // If it's been more than 5 minutes since last sync
      if (!lastSyncTime || parseInt(lastSyncTime) < (Date.now() - 5 * 60 * 1000)) {
        console.log('Performing manual sync check');
        localStorage.setItem('last-sync-time', currentTime);
      }
    }, 60000); // Check every minute
  }
};
