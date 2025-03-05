
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

export const Header = ({ title, showBackButton = true }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isRootPath = location.pathname === "/";
  
  return (
    <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container flex h-16 items-center px-4">
        {showBackButton && !isRootPath && (
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-secondary transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-xl font-medium">{title}</h1>
      </div>
    </header>
  );
};
