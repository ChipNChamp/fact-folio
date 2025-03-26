
import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, Share, ArrowDown, PlusCircle } from 'lucide-react';
import { Button } from './Button';

export const IOSInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const isMobile = useIsMobile();
  const [isIOS, setIsIOS] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
    // Check if the user is on iOS
    const isIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Check if the app is already installed as PWA
    const isPWA = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    };

    // Only show on iOS mobile devices that haven't installed the PWA yet
    const checkConditions = () => {
      const isIOSResult = isIOSDevice();
      const isPWAResult = isPWA();
      
      setIsIOS(isIOSResult);
      setIsPWAInstalled(isPWAResult);
      
      // Show prompt only on iOS devices that haven't installed the PWA
      setShowPrompt(isIOSResult && !isPWAResult && isMobile);
    };

    checkConditions();

    // Check if the app is launched in standalone mode (PWA)
    window.addEventListener('appinstalled', () => {
      setIsPWAInstalled(true);
      setShowPrompt(false);
    });

    // Save user preference in localStorage
    const hasClosedPrompt = localStorage.getItem('iosPromptClosed') === 'true';
    if (hasClosedPrompt) {
      setShowPrompt(false);
    }
  }, [isMobile]);

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('iosPromptClosed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border p-4 shadow-lg animate-slide-up">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium">Install App</h3>
        <Button variant="ghost" size="sm" className="p-1" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        Install this app on your iPhone for the best experience:
      </p>
      
      <div className="flex flex-col space-y-2">
        <div className="flex items-center text-xs">
          <span className="bg-primary/10 rounded-full p-1 mr-2">
            <Share className="h-3 w-3 text-primary" />
          </span>
          1. Tap the Share button
        </div>
        
        <div className="flex items-center text-xs">
          <span className="bg-primary/10 rounded-full p-1 mr-2">
            <ArrowDown className="h-3 w-3 text-primary" />
          </span>
          2. Scroll down and tap "Add to Home Screen"
        </div>
        
        <div className="flex items-center text-xs">
          <span className="bg-primary/10 rounded-full p-1 mr-2">
            <PlusCircle className="h-3 w-3 text-primary" />
          </span>
          3. Tap "Add" in the top right
        </div>
      </div>
    </div>
  );
};
