
import { supabase } from '@/integrations/supabase/client';

// Helper function to execute queries directly using the supabase client
export const execSQL = async (sql: string, params?: any[]) => {
  try {
    // For INSERT/UPDATE/DELETE operations
    if (sql.trim().toUpperCase().startsWith('INSERT') || 
        sql.trim().toUpperCase().startsWith('UPDATE') || 
        sql.trim().toUpperCase().startsWith('DELETE')) {
      
      // Handle parameterized queries by replacing $1, $2, etc. with actual values
      let processedSql = sql;
      if (params) {
        params.forEach((param, index) => {
          const placeholder = `$${index + 1}`;
          const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
          processedSql = processedSql.replace(new RegExp(`\\${placeholder}\\b`, 'g'), value);
        });
      }
      
      const { data, error } = await supabase.rpc('exec_sql', { query: processedSql });
      if (error) throw error;
      return { data, error: null };
    }
    
    // For SELECT operations, we'll use the client directly
    throw new Error('Use direct supabase client methods for SELECT queries');
  } catch (error) {
    console.error('SQL execution error:', error);
    return { data: null, error };
  }
};
