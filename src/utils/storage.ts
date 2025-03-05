
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

// Generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Get all entries
export const getAllEntries = (): EntryData[] => {
  const entries = localStorage.getItem('knowledge-entries');
  return entries ? JSON.parse(entries) : [];
};

// Get entries of a specific type
export const getEntriesByType = (type: EntryType): EntryData[] => {
  return getAllEntries().filter(entry => entry.type === type);
};

// Add a new entry
export const addEntry = (
  type: EntryType,
  input: string,
  output: string,
  additionalInput?: string
): EntryData => {
  const entries = getAllEntries();
  
  const newEntry: EntryData = {
    id: generateId(),
    type,
    input,
    output,
    additionalInput,
    createdAt: Date.now(),
    knowledge: -1 // Not reviewed yet
  };
  
  localStorage.setItem('knowledge-entries', JSON.stringify([...entries, newEntry]));
  return newEntry;
};

// Update entry knowledge level
export const updateEntryKnowledge = (id: string, knowledge: number): void => {
  const entries = getAllEntries();
  const updatedEntries = entries.map(entry => 
    entry.id === id ? { ...entry, knowledge } : entry
  );
  
  localStorage.setItem('knowledge-entries', JSON.stringify(updatedEntries));
};

// Get entries for review
export const getEntriesForReview = (count: number = 10): EntryData[] => {
  const allEntries = getAllEntries();
  
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

// Delete an entry
export const deleteEntry = (id: string): void => {
  const entries = getAllEntries();
  const filteredEntries = entries.filter(entry => entry.id !== id);
  localStorage.setItem('knowledge-entries', JSON.stringify(filteredEntries));
};

// Clear all entries
export const clearAllEntries = (): void => {
  localStorage.removeItem('knowledge-entries');
};
