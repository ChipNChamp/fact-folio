
import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/Button";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getLessonPlanById,
  LessonPlan,
  LessonTopic
} from "@/utils/lessonPlanGenerator";
import { ChevronDown, ChevronUp, Book, FileText, ListMusic } from "lucide-react";

const LessonPlayerPage = () => {
  const { id } = useParams<{ id: string }>();
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    if (id) {
      const plan = getLessonPlanById(id);
      if (plan) {
        setLessonPlan(plan);
      } else {
        toast.error("Lesson plan not found");
        navigate("/lessons");
      }
    }
  }, [id, navigate]);
  
  const toggleTopic = (index: number) => {
    const newExpandedTopics = new Set(expandedTopics);
    if (expandedTopics.has(index)) {
      newExpandedTopics.delete(index);
    } else {
      newExpandedTopics.add(index);
    }
    setExpandedTopics(newExpandedTopics);
  };
  
  if (!lessonPlan) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden">
        <Header title="Loading Lesson..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading lesson...</div>
        </div>
      </div>
    );
  }
  
  if (!lessonPlan.audioContent) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden">
        <Header title="Lesson Error" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Audio content not found</h2>
            <p className="text-muted-foreground mb-4">This lesson plan doesn't have any audio content.</p>
            <Button onClick={() => navigate("/lessons")}>
              Back to Lesson Plans
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <Header title={lessonPlan.title} />
      
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-card border rounded-lg shadow-sm p-4 mb-4">
            <h1 className="text-xl font-semibold mb-2">{lessonPlan.title}</h1>
            <p className="text-muted-foreground text-sm mb-4">
              {lessonPlan.topics.length} topics • {lessonPlan.topics.reduce(
                (count, topic) => count + topic.entries.length, 0
              )} entries
            </p>
            
            <div className="mb-4">
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="flex-1"
                >
                  {showTranscript ? (
                    <>
                      <ListMusic className="h-4 w-4 mr-2" /> Show Topics
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" /> Show Transcript
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {showTranscript ? (
              <div className="bg-muted/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                <h3 className="font-medium mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-2" /> 
                  Full Lesson Transcript
                </h3>
                <div className="text-sm whitespace-pre-wrap">
                  {lessonPlan.topics.map((topic, index) => (
                    <div key={index} className="mb-4">
                      <h4 className="font-medium">Topic {index + 1}: {topic.title}</h4>
                      <p>{topic.summary}</p>
                      <ul className="mt-2 ml-4">
                        {topic.entries.map((entry, entryIndex) => (
                          <li key={entryIndex} className="mb-1">
                            <span className="font-medium">{entry.input}:</span> {entry.output}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {lessonPlan.topics.map((topic, index) => (
                  <div 
                    key={index}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div 
                      className="p-3 bg-muted/30 flex justify-between items-center cursor-pointer"
                      onClick={() => toggleTopic(index)}
                    >
                      <h3 className="font-medium flex items-center">
                        <Book className="h-4 w-4 mr-2 text-primary" /> 
                        {topic.title}
                      </h3>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {expandedTopics.has(index) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {expandedTopics.has(index) && (
                      <div className="p-3 text-sm border-t">
                        <p className="text-muted-foreground mb-2">{topic.summary}</p>
                        <div className="space-y-2">
                          {topic.entries.map((entry, entryIndex) => (
                            <div 
                              key={entryIndex}
                              className="border rounded p-2"
                            >
                              <p className="font-medium">{entry.input}</p>
                              <p className="text-muted-foreground text-xs">{entry.output}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
        <div className="container mx-auto max-w-2xl">
          <AudioPlayer audioSrc={lessonPlan.audioContent} />
        </div>
      </div>
    </div>
  );
};

export default LessonPlayerPage;
