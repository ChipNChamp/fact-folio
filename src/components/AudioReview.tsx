
import { useState, useEffect, useRef } from "react";
import { PlayCircle, PauseCircle, SkipForward, SkipBack, Volume2 } from "lucide-react";
import { Button } from "./Button";
import { EntryData, getAllEntries, getEntriesByType, EntryType } from "@/utils/storage";

interface AudioReviewProps {
  onClose: () => void;
  type?: string;
}

export const AudioReview = ({ onClose, type }: AudioReviewProps) => {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<number | null>(null);

  // Load entries
  useEffect(() => {
    const loadEntries = async () => {
      try {
        let loadedEntries;
        if (type && type !== 'all') {
          loadedEntries = await getEntriesByType(type as EntryType);
        } else {
          loadedEntries = await getAllEntries();
        }
        
        // Sort by most recently created
        loadedEntries.sort((a, b) => b.createdAt - a.createdAt);
        setEntries(loadedEntries);
      } catch (error) {
        console.error("Error loading entries:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEntries();
    
    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis;
    
    // Clean up speech synthesis on unmount
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [type]);

  // Get the best available American English voice
  const getBestVoice = () => {
    if (!speechSynthesisRef.current) return null;
    
    const voices = speechSynthesisRef.current.getVoices();
    
    // First priority: American English premium voices
    const americanVoiceKeywords = ['en-us', 'en_us', 'english-us', 'american'];
    
    // Look for premium American English voices
    const premiumAmericanVoice = voices.find(voice => 
      (voice.lang.toLowerCase().includes('en-us') || 
       voice.lang.toLowerCase().includes('en_us') ||
       voice.name.toLowerCase().includes('american')) && 
      (voice.name.toLowerCase().includes('premium') ||
       voice.name.toLowerCase().includes('enhanced') ||
       voice.name.toLowerCase().includes('neural') ||
       voice.name.toLowerCase().includes('natural'))
    );
    
    if (premiumAmericanVoice) return premiumAmericanVoice;
    
    // Second priority: Specific American English voices known to be good
    const preferredAmericanVoiceNames = [
      "Google US English", "Google US English Female", "Google US English Male",
      "Microsoft David", "Microsoft Mark", "Microsoft Guy", "Microsoft Zira",
      "Alex", "Samantha"
    ];
    
    for (const name of preferredAmericanVoiceNames) {
      const voice = voices.find(v => v.name === name);
      if (voice) return voice;
    }
    
    // Third priority: Any American English voice
    const americanEnglishVoice = voices.find(voice => 
      voice.lang.toLowerCase().includes('en-us') || 
      voice.lang.toLowerCase().includes('en_us') ||
      voice.name.toLowerCase().includes('american')
    );
    
    if (americanEnglishVoice) return americanEnglishVoice;
    
    // Fourth priority: Any English voice
    const englishVoice = voices.find(voice => 
      voice.lang.toLowerCase().includes('en-') || 
      voice.lang.toLowerCase().includes('en_')
    );
    
    if (englishVoice) return englishVoice;
    
    // Last resort: use any available voice
    return voices[0] || null;
  };

  // Play the current entry
  const playCurrentEntry = () => {
    if (!entries.length || !speechSynthesisRef.current) return;
    
    const entry = entries[currentIndex];
    
    // Stop any ongoing speech
    speechSynthesisRef.current.cancel();
    
    // Speak the front of the card (output)
    const frontUtterance = new SpeechSynthesisUtterance(entry.output);
    const bestVoice = getBestVoice();
    
    if (bestVoice) {
      frontUtterance.voice = bestVoice;
    }
    
    // Enhance speech parameters for more natural sound
    frontUtterance.rate = 0.98; // Slightly slower for clarity
    frontUtterance.pitch = 1.02; // Very slight pitch adjustment for naturalness
    frontUtterance.volume = 1.0; // Full volume
    
    frontUtterance.onstart = () => setSpeaking(true);
    frontUtterance.onend = () => {
      // Pause between front and back
      timerRef.current = window.setTimeout(() => {
        // Create answer text (directly use the input as the answer)
        const answerText = entry.input;
        
        // Speak the back of the card (input/answer)
        const backUtterance = new SpeechSynthesisUtterance(answerText);
        
        if (bestVoice) {
          backUtterance.voice = bestVoice;
        }
        
        // Match speech parameters
        backUtterance.rate = 0.98;
        backUtterance.pitch = 1.02;
        backUtterance.volume = 1.0;
        
        backUtterance.onstart = () => setSpeaking(true);
        backUtterance.onend = () => {
          setSpeaking(false);
          
          // Move to next card after a pause if still playing
          timerRef.current = window.setTimeout(() => {
            if (isPlaying && currentIndex < entries.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else if (isPlaying && currentIndex === entries.length - 1) {
              // Stop at the end of the list
              setIsPlaying(false);
            }
          }, 2000);
        };
        
        speechSynthesisRef.current?.speak(backUtterance);
      }, 1500);
    };
    
    speechSynthesisRef.current.speak(frontUtterance);
  };

  // Play/pause the audio review
  const togglePlayback = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    if (newPlayingState) {
      playCurrentEntry();
    } else {
      // Stop speech and clear timers
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      setSpeaking(false);
    }
  };

  // Navigate to previous entry
  const goToPrevious = () => {
    if (currentIndex > 0) {
      // Stop current speech
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      
      setCurrentIndex(currentIndex - 1);
      
      // Resume playing if in play mode
      if (isPlaying) {
        setTimeout(playCurrentEntry, 300);
      }
    }
  };

  // Navigate to next entry
  const goToNext = () => {
    if (currentIndex < entries.length - 1) {
      // Stop current speech
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      
      setCurrentIndex(currentIndex + 1);
      
      // Resume playing if in play mode
      if (isPlaying) {
        setTimeout(playCurrentEntry, 300);
      }
    }
  };

  // Effect to play current entry when it changes or when play state changes
  useEffect(() => {
    if (isPlaying) {
      playCurrentEntry();
    }
  }, [currentIndex, isPlaying]);

  // Effect to initialize voices
  useEffect(() => {
    if (speechSynthesisRef.current) {
      // Force load voices if they're not available
      if (speechSynthesisRef.current.getVoices().length === 0) {
        speechSynthesisRef.current.onvoiceschanged = () => {
          // Voices loaded, potential re-render to get best voice
          if (isPlaying) {
            playCurrentEntry();
          }
        };
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="animate-pulse text-center">
          <p>Loading audio review...</p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 p-6">
        <h2 className="text-xl font-medium mb-4">No entries to review</h2>
        <p className="text-muted-foreground text-center mb-6">
          Add some entries to start your audio review.
        </p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      <header className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Volume2 className="h-5 w-5 mr-2" />
          <h1 className="font-medium">Audio Review</h1>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Exit
        </Button>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-between p-6 overflow-hidden">
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center">
          {entries.length > 0 && (
            <div className="w-full bg-card rounded-2xl shadow-lg border p-6 mb-6">
              <div className="text-center mb-2 text-sm text-muted-foreground">
                Card {currentIndex + 1} of {entries.length}
              </div>
              
              <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-4">
                <pre className="whitespace-pre-wrap font-sans text-base sm:text-lg mb-4">
                  {entries[currentIndex].output}
                </pre>
                
                {speaking && (
                  <div className="flex space-x-1 mt-2">
                    <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="w-full max-w-md flex justify-center space-x-4 p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="h-12 w-12 rounded-full"
          >
            <SkipBack />
          </Button>
          
          <Button
            variant="default"
            size="icon"
            onClick={togglePlayback}
            className="h-16 w-16 rounded-full"
          >
            {isPlaying ? <PauseCircle className="h-8 w-8" /> : <PlayCircle className="h-8 w-8" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={currentIndex === entries.length - 1}
            className="h-12 w-12 rounded-full"
          >
            <SkipForward />
          </Button>
        </div>
      </main>
    </div>
  );
};
