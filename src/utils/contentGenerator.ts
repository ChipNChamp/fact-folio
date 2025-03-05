
export type ContentType = 'vocabulary' | 'phrases' | 'definitions' | 'questions' | 'business' | 'other';

// Simple mock content generator
export const generateContent = async (type: ContentType, input: string): Promise<string> => {
  // In a real app, this would call an API to generate content
  // For this demo, we'll just return mock responses
  
  switch (type) {
    case 'vocabulary':
      return `
Definition: ${mockDefinition(input)}

Example 1: ${mockSentence(input)}

Example 2: ${mockSentence(input, true)}`;
    
    case 'phrases':
      return `
Description: ${mockPhraseDescription(input)}

Usage: This phrase is typically used ${mockPhraseUsage(input)}`;
    
    case 'definitions':
      return mockDefinition(input);
    
    case 'questions':
      return `Question noted. This would be relevant when discussing ${input.split(' ').slice(-1)[0]}.`;
    
    case 'business':
      return `Business fact recorded. This information is particularly useful in ${input.split(' ').slice(-1)[0]} contexts.`;
    
    case 'other':
      return `Information recorded. This could be categorized under general knowledge.`;
    
    default:
      return 'Content generated successfully.';
  }
};

// Helper functions for mock responses
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
