
import { useState } from "react";
import { Play, Pause, Clock, FileText, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { LessonPlan } from "@/utils/lessonPlanGenerator";
import { formatDistanceToNow } from "date-fns";

interface LessonPlanCardProps {
  plan: LessonPlan;
  onClick: () => void;
  onDelete: () => void;
}

export const LessonPlanCard = ({ plan, onClick, onDelete }: LessonPlanCardProps) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };
  
  const entriesCount = plan.topics.reduce((count, topic) => 
    count + topic.entries.length, 0);
    
  return (
    <div 
      className="bg-card border rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg line-clamp-2">{plan.title}</h3>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleDelete}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-muted-foreground text-sm mb-3 line-clamp-2">
        {plan.topics.map(topic => topic.title).join(", ")}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          <span>{formatDistanceToNow(plan.createdAt, { addSuffix: true })}</span>
        </div>
        <div className="flex items-center">
          <FileText className="h-3 w-3 mr-1" />
          <span>{entriesCount} entries</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t">
        <Button 
          variant="default"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Play className="h-4 w-4 mr-2" /> Start Lesson
        </Button>
      </div>
    </div>
  );
};
