
import { supabase } from '@/integrations/supabase/client';

// Helper function to execute raw SQL queries
export const execSQL = async (sql: string, params?: any[]) => {
  try {
    // Use supabase.rpc to call a custom function that executes SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql,
      params: params || []
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('SQL execution error:', error);
    return { data: null, error };
  }
};
