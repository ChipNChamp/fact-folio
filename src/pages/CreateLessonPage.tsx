
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  generateLessonPlan, 
  generateLessonAudio,
  saveLessonPlan,
  LessonPlan
} from "@/utils/lessonPlanGenerator";
import { Loader2, Check } from "lucide-react";

const CATEGORIES = [
  { id: "vocabulary", name: "Vocabulary" },
  { id: "phrases", name: "Phrases" },
  { id: "definitions", name: "Definitions" },
  { id: "questions", name: "Questions" },
  { id: "business", name: "Business" },
  { id: "other", name: "Other" }
];

const CreateLessonPage = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      setSelectedCategories(prev => [...prev, categoryId]);
    }
  };
  
  const handleCreateLesson = async () => {
    try {
      setIsGenerating(true);
      setGenerationStep("Analyzing your entries...");
      
      // Generate lesson plan
      const categories = selectedCategories.length > 0 ? selectedCategories : undefined;
      const lessonPlan = await generateLessonPlan(categories);
      
      setGenerationStep("Generating audio content...");
      
      // Generate audio for the lesson
      const audioContent = await generateLessonAudio(lessonPlan);
      
      // Save the lesson plan with audio
      const completeLessonPlan: LessonPlan = {
        ...lessonPlan,
        audioContent
      };
      
      saveLessonPlan(completeLessonPlan);
      
      toast.success("Lesson plan created successfully");
      navigate(`/lesson/${completeLessonPlan.id}`);
    } catch (error) {
      console.error("Error creating lesson plan:", error);
      toast.error(`Failed to create lesson plan: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };
  
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <Header title="Create Lesson" />
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-md">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h1 className="text-xl font-semibold mb-4">Create a New Lesson</h1>
            
            <p className="text-muted-foreground mb-6">
              Choose which categories to include in your lesson plan. Leave all unchecked to include all categories.
            </p>
            
            <div className="space-y-4 mb-6">
              {CATEGORIES.map(category => (
                <div 
                  key={category.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCategories.includes(category.id) 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 ${
                      selectedCategories.includes(category.id) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {selectedCategories.includes(category.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  
                  <div className="ml-8 mt-1 text-xs text-muted-foreground">
                    {category.id === 'vocabulary' && 'Words with definitions and example sentences'}
                    {category.id === 'phrases' && 'Common expressions and idioms'}
                    {category.id === 'definitions' && 'Explanations of concepts'}
                    {category.id === 'questions' && 'Questions and answers'}
                    {category.id === 'business' && 'Business concepts and terms'}
                    {category.id === 'other' && 'Miscellaneous information'}
                  </div>
                </div>
              ))}
            </div>
            
            {isGenerating ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin text-primary" />
                    <span>{generationStep}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This may take a minute or two depending on how many entries you have.
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleCreateLesson}
                className="w-full"
                size="lg"
                variant="default"
              >
                Generate Lesson Plan
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateLessonPage;
