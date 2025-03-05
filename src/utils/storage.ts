
export type EntryType = 'vocabulary' | 'phrases' | 'definitions' | 'questions' | 'business' | 'other';

export interface EntryData {
  id: string;
  type: EntryType;
  input: string;
  output: string;
  additionalInput?: string;
  createdAt: number;
  knowledge: number; // 0 = fail, 1 = eh, 2 = pass, -1 = not reviewed
}

import { 
  getAllEntriesFromDB, 
  getEntriesByTypeFromDB, 
  saveEntryToDB, 
  deleteEntryFromDB, 
  clearAllEntriesFromDB, 
  initializeSync 
} from './syncStorage';

// Generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Get all entries
export const getAllEntries = async (): Promise<EntryData[]> => {
  return await getAllEntriesFromDB();
};

// Get entries of a specific type
export const getEntriesByType = async (type: EntryType): Promise<EntryData[]> => {
  return await getEntriesByTypeFromDB(type);
};

// Add a new entry
export const addEntry = async (
  type: EntryType,
  input: string,
  output: string,
  additionalInput?: string
): Promise<EntryData> => {
  const newEntry: EntryData = {
    id: generateId(),
    type,
    input,
    output,
    additionalInput,
    createdAt: Date.now(),
    knowledge: -1 // Not reviewed yet
  };
  
  await saveEntryToDB(newEntry);
  return newEntry;
};

// Update entry knowledge level
export const updateEntryKnowledge = async (id: string, knowledge: number): Promise<void> => {
  const entries = await getAllEntriesFromDB();
  const entry = entries.find(e => e.id === id);
  
  if (entry) {
    entry.knowledge = knowledge;
    await saveEntryToDB(entry);
  }
};

// Get entries for review
export const getEntriesForReview = async (count: number = 10): Promise<EntryData[]> => {
  const allEntries = await getAllEntriesFromDB();
  
  if (allEntries.length === 0) return [];
  
  // Weight entries based on knowledge level
  const weightedEntries = allEntries.map(entry => {
    // Default weight for unreviewed items
    let weight = 5;
    
    if (entry.knowledge === 0) { // Fail - highest priority
      weight = 10;
    } else if (entry.knowledge === 1) { // Eh - medium priority
      weight = 5;
    } else if (entry.knowledge === 2) { // Pass - lowest priority
      weight = 1;
    }
    
    return { entry, weight };
  });
  
  // Randomly select entries based on weights
  const reviewEntries: EntryData[] = [];
  const totalWeight = weightedEntries.reduce((sum, item) => sum + item.weight, 0);
  
  while (reviewEntries.length < count && reviewEntries.length < allEntries.length) {
    let randomWeight = Math.random() * totalWeight;
    let selectedEntry: EntryData | null = null;
    
    for (const { entry, weight } of weightedEntries) {
      randomWeight -= weight;
      if (randomWeight <= 0 && !reviewEntries.includes(entry)) {
        selectedEntry = entry;
        break;
      }
    }
    
    if (selectedEntry && !reviewEntries.includes(selectedEntry)) {
      reviewEntries.push(selectedEntry);
    }
  }
  
  return reviewEntries;
};

// Update an existing entry
export const updateEntry = async (updatedEntry: EntryData): Promise<void> => {
  await saveEntryToDB(updatedEntry);
};

// Delete an entry
export const deleteEntry = async (id: string): Promise<void> => {
  await deleteEntryFromDB(id);
};

// Clear all entries
export const clearAllEntries = async (): Promise<void> => {
  await clearAllEntriesFromDB();
};

// Initialize sync on app start
export const initializeStorage = async (): Promise<void> => {
  await initializeSync();
};
