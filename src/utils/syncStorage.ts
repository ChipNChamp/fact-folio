
// Re-export all functionality from the service files
export { 
  getAllEntriesFromDB, 
  saveEntryToDB,
  clearAllEntriesFromDB,
  openDatabase
} from './db-service';

export {
  markEntryAsDeleted,
  addToDeletedEntries,
  getDeletedEntries,
  getDeletedEntryTimestamp,
  clearDeletedEntries,
  deleteEntryFromDB
} from './deletion-service';

export {
  getEntriesByTypeFromDB,
  syncWithSupabase,
  manualSync,
  setupManualSync,
  initializeSync
} from './sync-service';
