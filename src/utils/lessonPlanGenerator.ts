import { EntryData, getAllEntries, getEntriesByType } from "./storage";
import { getApiKey } from "./contentGenerator";

export interface LessonTopic {
  title: string;
  entries: EntryData[];
  summary: string;
}

export interface LessonPlan {
  id: string;
  title: string;
  topics: LessonTopic[];
  audioContent?: string; // Base64 encoded audio
  createdAt: number;
}

// Function to group entries by semantic similarity using GPT
export const generateLessonPlan = async (
  selectedCategories?: string[]
): Promise<LessonPlan> => {
  try {
    // Get all entries or filter by categories if provided
    let entries: EntryData[] = [];
    
    if (selectedCategories && selectedCategories.length > 0) {
      // Get entries from selected categories
      for (const category of selectedCategories) {
        const categoryEntries = await getEntriesByType(category as any);
        entries = [...entries, ...categoryEntries];
      }
    } else {
      // Get all entries
      entries = await getAllEntries();
    }
    
    // If no entries, return empty plan
    if (entries.length === 0) {
      throw new Error("No entries found to create a lesson plan.");
    }
    
    // Sort entries by type to aid in organization
    entries.sort((a, b) => a.type.localeCompare(b.type));
    
    // Prepare data for GPT analysis
    const entriesData = entries.map(entry => ({
      id: entry.id,
      type: entry.type,
      input: entry.input,
      output: entry.output,
      additionalInput: entry.additionalInput
    }));
    
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key not set");
    }
    
    // Call OpenAI API to organize entries into topics
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an educational content organizer. Your task is to organize learning materials into cohesive topics for an audio lesson plan. 
            
            For vocabulary, phrases, questions, and simple definitions, group them into quick back-and-forth sections.
            For business topics, complex definitions, and other categories, group them into longer narrative sections.
            
            Create 2-5 topics based on semantic similarities in the content. Each topic should have a clear theme.
            
            IMPORTANT: The total lesson should be between 3-7 minutes in length when read aloud at a normal pace.`
          },
          {
            role: "user",
            content: `Organize these learning materials into cohesive topics for a lesson plan. Return the result as a valid JSON object with this structure:
            {
              "title": "Overall lesson plan title",
              "topics": [
                {
                  "title": "Topic title",
                  "entryIds": ["id1", "id2"],
                  "summary": "Brief description of this topic group"
                }
              ]
            }
            
            Here are the entries: ${JSON.stringify(entriesData)}`
          }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error organizing lesson plan");
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    const parsedContent = JSON.parse(content);
    
    // Create topic objects with the actual entries
    const topics: LessonTopic[] = parsedContent.topics.map((topic: any) => {
      const topicEntries = entries.filter(entry => topic.entryIds.includes(entry.id));
      
      return {
        title: topic.title,
        entries: topicEntries,
        summary: topic.summary
      };
    });
    
    // Generate a unique ID for the lesson plan
    const lessonPlanId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Create and return the lesson plan
    const lessonPlan: LessonPlan = {
      id: lessonPlanId,
      title: parsedContent.title,
      topics,
      createdAt: Date.now()
    };
    
    return lessonPlan;
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    throw error;
  }
};

// Function to generate audio for a lesson plan using OpenAI TTS
export const generateLessonAudio = async (lessonPlan: LessonPlan): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key not set");
    }
    
    // Generate script for the entire lesson
    const script = generateLessonScript(lessonPlan);
    
    // Call OpenAI API to generate audio - ensure it's 3-7 minutes in length
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx",
        input: script,
        response_format: "mp3"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error generating audio");
    }
    
    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(
      new Uint8Array(audioBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return audioBase64;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};

// Helper function to generate a script for the lesson - aim for 3-7 minutes in length
const generateLessonScript = (lessonPlan: LessonPlan): string => {
  let script = `Welcome to today's lesson: ${lessonPlan.title}.\n\n`;
  
  // Add each topic
  lessonPlan.topics.forEach((topic, index) => {
    script += `Topic ${index + 1}: ${topic.title}.\n${topic.summary}\n\n`;
    
    // Process entries differently based on type
    const quickEntries = topic.entries.filter(entry => 
      ['vocabulary', 'phrases', 'questions'].includes(entry.type) ||
      (entry.type === 'definitions' && entry.output.length < 100)
    );
    
    const narrativeEntries = topic.entries.filter(entry => 
      ['business', 'other'].includes(entry.type) ||
      (entry.type === 'definitions' && entry.output.length >= 100)
    );
    
    // Process quick back-and-forth entries
    if (quickEntries.length > 0) {
      script += "Let's review some key terms and phrases:\n\n";
      
      quickEntries.forEach(entry => {
        switch (entry.type) {
          case 'vocabulary':
            script += `The term "${entry.input}": ${entry.output}\n`;
            break;
          case 'phrases':
            script += `The phrase "${entry.input}": ${entry.output}\n`;
            break;
          case 'questions':
            script += `Question: ${entry.input}\nAnswer: ${entry.output}\n`;
            break;
          case 'definitions':
            script += `${entry.input}: ${entry.output}\n`;
            break;
        }
        script += "\n";
      });
    }
    
    // Process narrative entries
    if (narrativeEntries.length > 0) {
      script += "Now, let's explore some concepts in more detail:\n\n";
      
      narrativeEntries.forEach(entry => {
        switch (entry.type) {
          case 'business':
            script += `Business concept - ${entry.input}: ${entry.output}\n`;
            break;
          case 'definitions':
            script += `${entry.input}: ${entry.output}\n`;
            break;
          case 'other':
            script += `${entry.input}: ${entry.output}\n`;
            break;
        }
        script += "\n";
      });
    }
    
    script += "\n";
  });
  
  script += "This concludes today's lesson. Thank you for listening.";
  
  return script;
};

// Function to store lesson plans for retrieval
const LESSON_PLANS_STORAGE_KEY = 'lesson_plans';

export const saveLessonPlan = (plan: LessonPlan): void => {
  try {
    // Get existing lesson plans
    const existingPlans = getLessonPlans();
    
    // Add new plan to the beginning of the array
    const updatedPlans = [plan, ...existingPlans];
    
    // Save to localStorage
    localStorage.setItem(LESSON_PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
  } catch (error) {
    console.error("Error saving lesson plan:", error);
  }
};

export const getLessonPlans = (): LessonPlan[] => {
  try {
    const plansString = localStorage.getItem(LESSON_PLANS_STORAGE_KEY);
    return plansString ? JSON.parse(plansString) : [];
  } catch (error) {
    console.error("Error retrieving lesson plans:", error);
    return [];
  }
};

export const getLessonPlanById = (id: string): LessonPlan | undefined => {
  const plans = getLessonPlans();
  return plans.find(plan => plan.id === id);
};

export const deleteLessonPlan = (id: string): void => {
  try {
    const plans = getLessonPlans();
    const filteredPlans = plans.filter(plan => plan.id !== id);
    localStorage.setItem(LESSON_PLANS_STORAGE_KEY, JSON.stringify(filteredPlans));
  } catch (error) {
    console.error("Error deleting lesson plan:", error);
  }
};
