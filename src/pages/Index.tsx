
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { Book, BookOpen, FileText, HelpCircle, Briefcase, FolderDot, RotateCcw } from "lucide-react";
import { getAllEntries } from "@/utils/storage";
import { useEffect, useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [entryCount, setEntryCount] = useState(0);

  useEffect(() => {
    const entries = getAllEntries();
    setEntryCount(entries.length);
  }, []);

  const categories = [
    {
      name: "Vocabulary",
      icon: <Book className="h-8 w-8 mb-2" />,
      path: "/input/vocabulary",
      color: "bg-blue-50 text-blue-600",
    },
    {
      name: "Phrases",
      icon: <BookOpen className="h-8 w-8 mb-2" />,
      path: "/input/phrases",
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      name: "Definitions",
      icon: <FileText className="h-8 w-8 mb-2" />,
      path: "/input/definitions",
      color: "bg-purple-50 text-purple-600",
    },
    {
      name: "Questions",
      icon: <HelpCircle className="h-8 w-8 mb-2" />,
      path: "/input/questions",
      color: "bg-pink-50 text-pink-600",
    },
    {
      name: "Business",
      icon: <Briefcase className="h-8 w-8 mb-2" />,
      path: "/input/business",
      color: "bg-orange-50 text-orange-600",
    },
    {
      name: "Other",
      icon: <FolderDot className="h-8 w-8 mb-2" />,
      path: "/input/other",
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Fact-Folio" showBackButton={false} />
      
      <main className="flex-1 flex flex-col px-4 py-8 max-w-4xl mx-auto w-full">
        <section className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-medium text-center mb-2">Knowledge Manager</h1>
          <p className="text-muted-foreground text-center">
            Capture and review your learning journey
          </p>
        </section>
        
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 animate-slide-in">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => navigate(category.path)}
              className={`rounded-xl p-4 flex flex-col items-center justify-center text-center h-32 transition-all duration-200 border border-border/30 ${category.color} shadow-sm hover:shadow-md hover:scale-[1.02]`}
            >
              {category.icon}
              <span className="font-medium">{category.name}</span>
            </button>
          ))}
        </section>
        
        <section className="mt-auto pb-8 flex flex-col items-center animate-slide-in" style={{ animationDelay: "0.2s" }}>
          <Button 
            size="wide" 
            className="relative overflow-hidden group animate-floating"
            onClick={() => navigate("/review")}
            disabled={entryCount === 0}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <RotateCcw className="mr-2 h-5 w-5" /> 
            Review ({entryCount})
          </Button>
          
          {entryCount === 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Add some entries to begin reviewing
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
