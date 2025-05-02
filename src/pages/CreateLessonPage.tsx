
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EntryType } from "@/utils/storage";
import { generateLessonPlan, generateLessonAudio, saveLessonPlan } from "@/utils/lessonPlanGenerator";
import { Sparkles, Loader2, Check } from "lucide-react";

const EntryTypeOptions: { value: EntryType; label: string }[] = [
  { value: "vocabulary", label: "Vocabulary" },
  { value: "phrases", label: "Phrases" },
  { value: "definitions", label: "Definitions" },
  { value: "questions", label: "Questions" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
];

const CreateLessonPage = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [step, setStep] = useState<'options' | 'generating' | 'complete'>('options');
  
  const navigate = useNavigate();
  
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  const handleCreateLesson = async () => {
    try {
      setStep('generating');
      setIsGenerating(true);
      
      // Generate lesson plan based on selected categories or all entries
      const lessonPlan = await generateLessonPlan(
        selectedCategories.length > 0 ? selectedCategories : undefined
      );
      
      toast.success("Lesson plan generated successfully");
      
      // Generate audio for the lesson plan
      setIsGeneratingAudio(true);
      const audioContent = await generateLessonAudio(lessonPlan);
      
      // Add audio content to lesson plan
      lessonPlan.audioContent = audioContent;
      
      // Save lesson plan
      saveLessonPlan(lessonPlan);
      
      toast.success("Lesson audio generated successfully");
      setStep('complete');
      
      // Navigate to the lesson player
      setTimeout(() => {
        navigate(`/lesson/${lessonPlan.id}`);
      }, 1500);
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create lesson");
      setStep('options');
    } finally {
      setIsGenerating(false);
      setIsGeneratingAudio(false);
    }
  };
  
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <Header title="Create Lesson" />
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-2xl">
          {step === 'options' && (
            <>
              <h1 className="text-2xl font-semibold mb-6">Create New Lesson Plan</h1>
              
              <div className="bg-card border rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-medium mb-4">Select Categories</h2>
                <p className="text-muted-foreground mb-4">
                  Choose specific categories to include in your lesson, or leave all unchecked to include everything.
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {EntryTypeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedCategories.includes(option.value) ? "default" : "outline"}
                      onClick={() => toggleCategory(option.value)}
                      className="justify-start"
                    >
                      {selectedCategories.includes(option.value) && (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {option.label}
                    </Button>
                  ))}
                </div>
                
                <Button 
                  onClick={handleCreateLesson} 
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Lesson Plan
                </Button>
              </div>
            </>
          )}
          
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="bg-card border rounded-lg shadow-sm p-8 text-center max-w-md">
                <div className="mb-6">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                </div>
                <h2 className="text-xl font-medium mb-2">
                  {isGeneratingAudio ? "Generating Audio" : "Creating Lesson Plan"}
                </h2>
                <p className="text-muted-foreground">
                  {isGeneratingAudio 
                    ? "Converting your lesson plan into audio. This may take a moment..."
                    : "Organizing your entries into a cohesive lesson plan..."}
                </p>
              </div>
            </div>
          )}
          
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="bg-card border rounded-lg shadow-sm p-8 text-center max-w-md">
                <div className="bg-primary/10 rounded-full p-3 w-16 h-16 mx-auto mb-6">
                  <Check className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-medium mb-2">Lesson Created!</h2>
                <p className="text-muted-foreground mb-4">
                  Your lesson plan and audio have been successfully created.
                </p>
                <p className="text-muted-foreground mb-6">
                  Redirecting to the lesson player...
                </p>
                <Button 
                  onClick={() => navigate("/lessons")}
                  variant="outline"
                >
                  View All Lessons
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateLessonPage;
