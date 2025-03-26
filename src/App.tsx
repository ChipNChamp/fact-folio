
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import IndexPage from "@/pages/Index";
import ReviewPage from "@/pages/Review";
import CategoryInput from "@/pages/CategoryInput";
import EntriesPage from "@/pages/EntriesPage";
import NotFound from "@/pages/NotFound";
import { PasswordProtection } from "@/components/PasswordProtection";
import { initializeStorage } from "@/utils/storage";
import { manualSync } from "@/utils/syncStorage";
import { IOSInstallPrompt } from "@/components/IOSInstallPrompt";
import "./App.css";

// Make manualSync available globally for the service worker
declare global {
  interface Window {
    manualSync: () => Promise<void>;
  }
}

// KeyboardNavigation component to handle keyboard shortcuts
const KeyboardNavigation = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case "1":
          navigate("/input/vocabulary");
          break;
        case "2":
          navigate("/input/phrases");
          break;
        case "3":
          navigate("/input/definitions");
          break;
        case "4":
          navigate("/input/questions");
          break;
        case "5":
          navigate("/input/business");
          break;
        case "6":
          navigate("/input/other");
          break;
        case "Escape":
          navigate("/");
          break;
        default:
          return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return null;
};

function App() {
  useEffect(() => {
    document.title = "Knowledge Base";
    
    // Initialize storage and sync when app starts
    const initStorage = async () => {
      await initializeStorage();
      
      // Sync whenever the app loads
      manualSync();
    };
    
    initStorage();
    
    // Set up a periodic sync for when the app is open
    const syncInterval = setInterval(manualSync, 60000); // Sync every minute
    
    // Make manualSync available globally for service worker
    window.manualSync = manualSync;
    
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <PasswordProtection password="AOW">
      <BrowserRouter>
        <KeyboardNavigation />
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/:category" element={<ReviewPage />} />
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/input/:category" element={<CategoryInput />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
        <IOSInstallPrompt />
      </BrowserRouter>
    </PasswordProtection>
  );
}

export default App;
