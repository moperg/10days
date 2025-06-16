import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Streak = {
  id: number;
  name: string;
  day: number;
  complete: boolean;
  created_at: string;
};

export type Challenge = {
  id: number;
  goal: string;
  admin_email: string;
  created_at: string;
}; 