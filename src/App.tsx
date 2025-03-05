
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import IndexPage from "@/pages/Index";
import ReviewPage from "@/pages/Review";
import CategoryInput from "@/pages/CategoryInput";
import EntriesPage from "@/pages/EntriesPage";
import NotFound from "@/pages/NotFound";
import { PasswordProtection } from "@/components/PasswordProtection";
import "./App.css";

function App() {
  useEffect(() => {
    document.title = "Knowledge Base";
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
