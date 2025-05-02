
/// <reference types="vite/client" />

// Extend the Window interface to include our custom methods
interface Window {
  manualSync?: () => Promise<void>;
}

