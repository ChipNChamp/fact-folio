
import { openDatabase, saveEntryToDB, getAllEntriesFromDB } from './db-service';

const DELETED_ENTRIES_KEY = 'knowledge-entries-deleted';
const DELETION_TIMESTAMP_KEY = 'knowledge-entries-deletion-timestamp';

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
