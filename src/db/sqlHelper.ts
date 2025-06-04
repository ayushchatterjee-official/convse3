
import { supabase } from '@/integrations/supabase/client';

// Helper function to execute queries directly using the supabase client
// This file is kept for potential future use but currently unused
export const execSQL = async (sql: string, params?: any[]) => {
  try {
    // This function is currently not implemented as we use direct supabase client methods
    throw new Error('Use direct supabase client methods for database operations');
  } catch (error) {
    console.error('SQL execution error:', error);
    return { data: null, error };
  }
};
