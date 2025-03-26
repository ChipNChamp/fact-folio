
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import IndexPage from "@/pages/Index";
import ReviewPage from "@/pages/Review";
import CategoryInput from "@/pages/CategoryInput";
import EntriesPage from "@/pages/EntriesPage";
import NotFound from "@/pages/NotFound";
import { PasswordProtection } from "@/components/PasswordProtection";
import { initializeStorage } from "@/utils/storage";
import { manualSync } from "@/utils/syncStorage";
import "./App.css";

// Make manualSync available globally for the service worker
declare global {
  interface Window {
    manualSync: () => Promise<void>;
  }
}

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
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/:category" element={<ReviewPage />} />
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/input/:category" element={<CategoryInput />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </PasswordProtection>
  );
}

export default App;
