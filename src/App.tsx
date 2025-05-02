import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Review from "./pages/Review";
import EntriesPage from "./pages/EntriesPage";
import NotFound from "./pages/NotFound";
import LessonPlansPage from "./pages/LessonPlansPage";
import CreateLessonPage from "./pages/CreateLessonPage";
import LessonPlayerPage from "./pages/LessonPlayerPage";

const App = () => {

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/review/:category?" element={<Review />} />
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/lessons" element={<LessonPlansPage />} />
          <Route path="/create-lesson" element={<CreateLessonPage />} />
          <Route path="/lesson/:id" element={<LessonPlayerPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
