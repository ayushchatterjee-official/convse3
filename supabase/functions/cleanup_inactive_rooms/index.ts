
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.22.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with Deno runtime
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the current timestamp
    const now = new Date();
    
    // Get timestamp from 30 minutes ago
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
    
    // Find rooms with last activity older than 30 minutes
    const { data: inactiveRooms, error: findError } = await supabase
      .from('video_call_rooms')
      .select('id')
      .eq('active', true)
      .lt('last_activity', thirtyMinutesAgo.toISOString());

    if (findError) {
      throw findError;
    }

    if (inactiveRooms && inactiveRooms.length > 0) {
      console.log(`Found ${inactiveRooms.length} inactive rooms to clean up`);
      
      // Extract room IDs
      const roomIds = inactiveRooms.map(room => room.id);
      
      // Mark rooms as inactive
      const { error: updateError } = await supabase
        .from('video_call_rooms')
        .update({ active: false })
        .in('id', roomIds);
      
      if (updateError) {
        throw updateError;
      }
      
      // Optional: Clean up participants
      const { error: participantError } = await supabase
        .from('video_call_participants')
        .delete()
        .in('room_id', roomIds);
      
      if (participantError) {
        throw participantError;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Cleaned up ${inactiveRooms.length} inactive rooms`,
          rooms: roomIds
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No inactive rooms found"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
