
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, BookText } from "lucide-react";
import { Button } from "./Button";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export const Header = ({ title, showBackButton = true }: HeaderProps) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <header className="bg-background sticky top-0 z-10 border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/lessons")} 
            className="rounded-full"
            title="Lessons"
          >
            <BookText className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/entries")} 
            className="rounded-full"
            title="Entries"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
