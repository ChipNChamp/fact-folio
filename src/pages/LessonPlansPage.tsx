
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { LessonPlanCard } from "@/components/LessonPlanCard";
import { toast } from "sonner";
import { 
  getLessonPlans, 
  deleteLessonPlan, 
  LessonPlan
} from "@/utils/lessonPlanGenerator";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";

const LessonPlansPage = () => {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    loadLessonPlans();
  }, []);
  
  const loadLessonPlans = () => {
    try {
      const plans = getLessonPlans();
      console.log("Loaded lesson plans:", plans); // Debug: log loaded plans
      setLessonPlans(plans);
    } catch (error) {
      console.error("Error loading lesson plans:", error);
      toast.error("Failed to load lesson plans");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeletePlan = (id: string) => {
    try {
      deleteLessonPlan(id);
      setLessonPlans(prev => prev.filter(plan => plan.id !== id));
      toast.success("Lesson plan deleted");
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
      toast.error("Failed to delete lesson plan");
    }
  };
  
  const handleCreateLessonPlan = () => {
    navigate("/create-lesson");
  };
  
  const handleOpenLessonPlan = (id: string) => {
    navigate(`/lesson/${id}`);
  };
  
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <Header title="Lesson Plans" />
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Lesson Plans</h1>
            
            <Button onClick={handleCreateLessonPlan}>
              <Sparkles className="h-4 w-4 mr-2" />
              Create New Lesson
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lessonPlans.length === 0 ? (
            <div className="bg-muted/30 rounded-lg p-8 text-center">
              <h3 className="font-medium text-lg mb-2">No lesson plans yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a lesson plan from your saved entries to start learning
              </p>
              <Button onClick={handleCreateLessonPlan}>
                <Sparkles className="h-4 w-4 mr-2" />
                Create Your First Lesson
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonPlans.map(plan => (
                <LessonPlanCard
                  key={plan.id}
                  plan={plan}
                  onClick={() => handleOpenLessonPlan(plan.id)}
                  onDelete={() => handleDeletePlan(plan.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LessonPlansPage;
