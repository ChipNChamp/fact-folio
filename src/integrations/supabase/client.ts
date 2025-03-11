
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dfcwzqazcvfiveifvnok.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY3d6cWF6Y3ZmaXZlaWZ2bm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyODYxNjYsImV4cCI6MjA1Njg2MjE2Nn0.zf3xxDRiAg3nsRa9B3rF7QLMMGomjyqO7zWCzvPW-X0";

// Create Supabase client with app version for tracking
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    global: {
      headers: {
        'x-app-version': '1.0.0',
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
