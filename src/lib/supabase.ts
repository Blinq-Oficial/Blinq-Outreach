import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl && typeof window === 'undefined') {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is not set.');
}

if (!supabaseKey && typeof window === 'undefined') {
  console.warn('Warning: Supabase keys are not set.');
}

// Create a single supabase client for interacting with the database
export const supabase = createClient(supabaseUrl, supabaseKey);
