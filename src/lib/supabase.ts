import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if ((!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && typeof window === 'undefined') {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or keys are not set. Using placeholder credentials.');
}

// Create a single supabase client for interacting with the database
export const supabase = createClient(supabaseUrl, supabaseKey);
