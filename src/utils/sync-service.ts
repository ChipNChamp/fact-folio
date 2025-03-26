
import { EntryData, EntryType } from './storage';
import { supabase } from "@/integrations/supabase/client";
import { getAllEntriesFromDB, saveEntryToDB } from './db-service';
import { getDeletedEntries } from './deletion-service';

const SYNC_EVENT_KEY = 'knowledge-entries-sync';
const LAST_SYNC_KEY = 'knowledge-entries-last-sync';

export const getEntriesByTypeFromDB = async (type: EntryType): Promise<EntryData[]> => {
  const allEntries = await getAllEntriesFromDB();
  return allEntries.filter(entry => entry.type === type);
};

export const syncWithSupabase = async () => {
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
            // Handle deleted entry - we'd import the deletion service here
            // but we're handling this inline for simplicity
            const localEntry = localEntries.find(e => e.id === remoteEntry.id);
            if (localEntry) {
              localEntry.deleted = true;
              localEntry.deletedAt = remoteEntry.deleted_at;
              localEntry.purgeAfter = remoteEntry.purge_after;
              await saveEntryToDB(localEntry);
            }
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

export const setupManualSync = () => {
  manualSync();
  
  setInterval(manualSync, 30000);
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      manualSync();
    }
  });
  
  window.addEventListener('online', manualSync);
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
