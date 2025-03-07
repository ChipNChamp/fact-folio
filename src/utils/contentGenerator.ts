
export type ContentType = 'vocabulary' | 'phrases' | 'definitions' | 'questions' | 'business' | 'other';

// API key management
let apiKey: string | null = null;

export const setApiKey = (key: string): void => {
  apiKey = key;
  localStorage.setItem('openai_api_key', key);
};

export const getApiKey = (): string | null => {
  if (!apiKey) {
    apiKey = localStorage.getItem('openai_api_key');
  }
  return apiKey;
};

export const clearApiKey = (): void => {
  apiKey = null;
  localStorage.removeItem('openai_api_key');
};

// Generate prompts based on content type
const generatePrompt = (type: ContentType, input: string, additionalInput?: string): string => {
  switch (type) {
    case 'vocabulary':
      return `Provide an extremely brief definition of the word "${input}" (5-10 words max) followed by two short example sentences. Format as:
Definition: [very concise definition, 5-10 words only]

Example 1: [brief sentence using the word "${input}"]

Example 2: [brief sentence using the word "${input}"]

Keep all content extremely concise.`;
    
    case 'phrases':
      return `Briefly describe the phrase "${input}" and its typical usage. Be extremely concise. Format as:
Description: [brief, direct description]

Usage: [concise usage explanation]

Keep all content extremely concise. Fragment sentences are OK.`;
    
    case 'definitions':
      return `Provide a clear, concise definition of "${input}". Keep it very brief and direct. Use fragment sentences if appropriate.`;
    
    case 'questions':
      return `Question recorded: "${input}"
Context: ${additionalInput || 'general'}`;
    
    case 'business':
      return `Business fact: "${input}"
Applies to: ${additionalInput || 'general business'}`;
    
    case 'other':
      return `Information: "${input}"`;
    
    default:
      return `Generate extremely concise content for: ${input}`;
  }
};

// Generate content using OpenAI API
export const generateContent = async (type: ContentType, input: string, additionalInput?: string): Promise<string> => {
  const key = getApiKey();
  
  if (!key) {
    throw new Error('API key not set');
  }

  try {
    const prompt = generatePrompt(type, input, additionalInput);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a concise assistant. Keep responses extremely brief and to the point. Fragment sentences are acceptable as long as they clearly convey meaning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error calling OpenAI API');
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // For vocabulary entries, replace the input word with blanks in example sentences
    if (type === 'vocabulary') {
      const lines = content.split('\n');
      const processedLines = lines.map(line => {
        if (line.startsWith('Example')) {
          // Create a regex that matches the word with word boundaries
          const wordRegex = new RegExp(`\\b${input}\\b`, 'gi');
          return line.replace(wordRegex, '_____');
        }
        return line;
      });
      content = processedLines.join('\n');
    }
    
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
    
    throw new Error('Failed to generate content');
  }
};

// Fallback mock functions (kept for testing purposes)
const mockDefinition = (word: string): string => {
  const definitions = [
    `The state or quality of being ${word.toLowerCase()}, often characterized by distinct features or properties.`,
    `A process involving ${word.toLowerCase()} that typically occurs in specific contexts or environments.`,
    `A term describing the action or state of ${word.toLowerCase()}, frequently observed in various situations.`,
    `An entity or concept related to ${word.toLowerCase()}, studied in multiple disciplines.`
  ];
  
  return definitions[Math.floor(Math.random() * definitions.length)];
};

const mockSentence = (word: string, alternative: boolean = false): string => {
  const sentences = [
    `The concept of ${word.toLowerCase()} was extensively discussed during the conference.`,
    `Researchers have recently discovered new aspects of ${word.toLowerCase()} that challenge previous theories.`,
    `Students are encouraged to explore ${word.toLowerCase()} through practical exercises and discussions.`,
    `The book provides a comprehensive analysis of ${word.toLowerCase()} from various perspectives.`
  ];
  
  const altSentences = [
    `Many experts consider ${word.toLowerCase()} to be fundamental to understanding the subject.`,
    `When examining ${word.toLowerCase()}, it's important to consider its historical context.`,
    `The application of ${word.toLowerCase()} principles has revolutionized the industry.`,
    `Understanding ${word.toLowerCase()} requires both theoretical knowledge and practical experience.`
  ];
  
  const sourceArray = alternative ? altSentences : sentences;
  return sourceArray[Math.floor(Math.random() * sourceArray.length)];
};

const mockPhraseDescription = (phrase: string): string => {
  const descriptions = [
    `"${phrase}" is an idiomatic expression that conveys a specific sentiment or idea in context.`,
    `The phrase "${phrase}" originated in the early 20th century and has evolved in meaning over time.`,
    `"${phrase}" is commonly used to express agreement or appreciation in conversation.`,
    `This expression, "${phrase}", typically indicates a particular attitude or perspective.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
};

const mockPhraseUsage = (phrase: string): string => {
  const usages = [
    `in casual conversations among friends or colleagues.`,
    `when discussing complex topics in a simplified manner.`,
    `to express agreement or acknowledgment in professional settings.`,
    `during informal discussions where shared understanding is assumed.`
  ];
  
  return usages[Math.floor(Math.random() * usages.length)];
};
