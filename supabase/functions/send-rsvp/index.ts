import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRSVPRequest {
  eventId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { eventId } = await req.json() as SendRSVPRequest;

    // Fetch event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*, courses(name)')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Fetch players with status "playing" who have phone numbers
    const { data: eventPlayers, error: playersError } = await supabaseClient
      .from('event_players')
      .select('id, players(id, name, phone)')
      .eq('event_id', eventId)
      .eq('status', 'playing');

    if (playersError) {
      throw new Error('Failed to fetch players');
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Format the message
    const courseName = event.courses?.name || event.course_name;
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const teeTime = new Date(`2000-01-01T${event.first_tee_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const message = `Golf League RSVP:\n${courseName}\n${eventDate}\nFirst Tee Time: ${teeTime}\n\nReply Y for Yes or N for No`;

    const results = [];
    
    for (const ep of eventPlayers) {
      const player = ep.players as any;
      
      if (!player?.phone) {
        results.push({
          playerId: player?.id,
          playerName: player?.name,
          success: false,
          error: 'No phone number'
        });
        continue;
      }

      try {
        // Send SMS via Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            },
            body: new URLSearchParams({
              To: player.phone,
              From: twilioPhoneNumber,
              Body: message,
            }),
          }
        );

        if (!twilioResponse.ok) {
          const error = await twilioResponse.text();
          throw new Error(error);
        }

        // Update rsvp_sent_at timestamp
        await supabaseClient
          .from('event_players')
          .update({ rsvp_sent_at: new Date().toISOString() })
          .eq('id', ep.id);

        results.push({
          playerId: player.id,
          playerName: player.name,
          success: true
        });

        console.log(`Sent RSVP to ${player.name} at ${player.phone}`);
      } catch (error) {
        console.error(`Failed to send to ${player.name}:`, error);
        results.push({
          playerId: player.id,
          playerName: player.name,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${results.filter(r => r.success).length} of ${results.length} RSVPs`,
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-rsvp function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
