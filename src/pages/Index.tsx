
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { Book, BookOpen, FileText, HelpCircle, Briefcase, FolderDot, BookText } from "lucide-react";
import { getAllEntries } from "@/utils/storage";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

const Index = () => {
  const navigate = useNavigate();
  const [entryCount, setEntryCount] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      const entries = await getAllEntries();
      setEntryCount(entries.length);
    };
    
    fetchEntries();

    // Detect if user is on desktop browser to show keyboard shortcuts
    const isDesktop = window.innerWidth > 768 && !window.navigator.userAgent.includes('Mobile');
    setShowShortcuts(isDesktop);

    // Add detection for browser vs mobile
    setIsBrowser(typeof window !== 'undefined' && !navigator.userAgent.match(/iPhone|iPad|iPod|Android/i));
  }, []);

  const categories = [
    {
      name: "Vocabulary",
      icon: <Book className="h-8 w-8 mb-2" />,
      path: "/input/vocabulary",
      reviewPath: "/review/vocabulary",
      color: "bg-blue-50 text-blue-600",
      shortcut: "1"
    },
    {
      name: "Phrases",
      icon: <BookOpen className="h-8 w-8 mb-2" />,
      path: "/input/phrases",
      reviewPath: "/review/phrases",
      color: "bg-indigo-50 text-indigo-600",
      shortcut: "2"
    },
    {
      name: "Definitions",
      icon: <FileText className="h-8 w-8 mb-2" />,
      path: "/input/definitions",
      reviewPath: "/review/definitions",
      color: "bg-purple-50 text-purple-600",
      shortcut: "3"
    },
    {
      name: "Questions",
      icon: <HelpCircle className="h-8 w-8 mb-2" />,
      path: "/input/questions",
      reviewPath: "/review/questions",
      color: "bg-pink-50 text-pink-600",
      shortcut: "4"
    },
    {
      name: "Business",
      icon: <Briefcase className="h-8 w-8 mb-2" />,
      path: "/input/business",
      reviewPath: "/review/business",
      color: "bg-orange-50 text-orange-600",
      shortcut: "5"
    },
    {
      name: "Other",
      icon: <FolderDot className="h-8 w-8 mb-2" />,
      path: "/input/other",
      reviewPath: "/review/other",
      color: "bg-emerald-50 text-emerald-600",
      shortcut: "6"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Fact-Folio" showBackButton={false} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <main className="flex-1 flex flex-col px-4 py-4 max-w-4xl mx-auto w-full">
            <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 animate-slide-in">
              {categories.map((category) => (
                <div key={category.name} className="flex flex-col space-y-1">
                  <button
                    onClick={() => navigate(category.path)}
                    className={`rounded-xl p-3 flex flex-col items-center justify-center text-center h-28 transition-all duration-200 border border-border/30 ${category.color} shadow-sm hover:shadow-md hover:scale-[1.02]`}
                  >
                    {category.icon}
                    <span className="font-medium">{category.name}</span>
                    {showShortcuts && (
                      <span className="keyboard-shortcut mt-1">{category.shortcut}</span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(category.reviewPath)}
                    className={`rounded-lg p-1 flex items-center justify-center text-center text-xs font-medium transition-all duration-200 border border-border/30 ${category.color} bg-opacity-30 hover:bg-opacity-50`}
                  >
                    Review
                  </button>
                </div>
              ))}
            </section>
            
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <Button 
                size="wide" 
                className="relative overflow-hidden group h-14"
                onClick={() => navigate("/review")}
                disabled={entryCount === 0}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                Omni-Review
              </Button>
              
              <Button 
                size="wide"
                variant="outline"
                className="relative overflow-hidden group flex items-center justify-center h-14"
                onClick={() => navigate("/lessons")}
              >
                <BookText className="h-5 w-5 mr-2" />
                Lessons
              </Button>
            </section>
            
            {/* New Lessons button */}
            <section className="mb-6">
              <Button 
                size="wide"
                variant="pass"
                className="relative overflow-hidden group flex items-center justify-center h-14 w-full"
                onClick={() => navigate("/lessons")}
              >
                <BookText className="h-6 w-6 mr-2" />
                <span className="text-lg font-medium">Access Lessons</span>
              </Button>
            </section>
            
            {entryCount === 0 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Add some entries to begin reviewing
              </p>
            )}
            
            {showShortcuts && (
              <div className="mt-2 mb-6 text-xs text-muted-foreground text-center animate-fade-in">
                <p>Keyboard shortcuts: Press 1-6 to navigate to categories • Press Esc to return home</p>
              </div>
            )}
          </main>
        </ScrollArea>
      </div>
      
      {/* Show keyboard shortcuts on desktop */}
      {isBrowser && <KeyboardShortcuts />}
    </div>
  );
};

export default Index;
