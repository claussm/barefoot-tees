import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse Twilio webhook data (form-urlencoded)
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = (formData.get('Body') as string)?.trim().toUpperCase();

    console.log(`Received SMS from ${from}: ${body}`);

    // Normalize the response
    let rsvpStatus: string | null = null;
    if (body === 'Y' || body === 'YES') {
      rsvpStatus = 'yes';
    } else if (body === 'N' || body === 'NO') {
      rsvpStatus = 'no';
    }

    if (!rsvpStatus) {
      // Invalid response, send help message
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Please reply Y for Yes or N for No</Message></Response>',
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200,
        }
      );
    }

    // Find the player by phone number
    const { data: players, error: playerError } = await supabaseClient
      .from('players')
      .select('id, name')
      .eq('phone', from)
      .limit(1);

    if (playerError || !players || players.length === 0) {
      console.error('Player not found for phone:', from);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Phone number not recognized</Message></Response>',
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200,
        }
      );
    }

    const player = players[0];

    // Find the most recent event with RSVP sent for this player
    const { data: eventPlayers, error: epError } = await supabaseClient
      .from('event_players')
      .select('id, event_id, events(date, course_name)')
      .eq('player_id', player.id)
      .not('rsvp_sent_at', 'is', null)
      .order('rsvp_sent_at', { ascending: false })
      .limit(1);

    if (epError || !eventPlayers || eventPlayers.length === 0) {
      console.error('No recent RSVP found for player:', player.name);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>No recent RSVP request found</Message></Response>',
        {
          headers: { 'Content-Type': 'text/xml' },
          status: 200,
        }
      );
    }

    const eventPlayer = eventPlayers[0];

    // Update the RSVP status
    const newStatus = rsvpStatus === 'yes' ? 'playing' : 'not_playing';
    const { error: updateError } = await supabaseClient
      .from('event_players')
      .update({ 
        rsvp_status: rsvpStatus,
        status: newStatus
      })
      .eq('id', eventPlayer.id);

    if (updateError) {
      console.error('Failed to update RSVP:', updateError);
      throw updateError;
    }

    console.log(`Updated RSVP for ${player.name}: ${rsvpStatus}`);

    // Send confirmation
    const confirmMessage = rsvpStatus === 'yes' 
      ? `Thanks ${player.name}! You're confirmed for the game.`
      : `Thanks ${player.name}. Sorry you can't make it this time.`;

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmMessage}</Message></Response>`,
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in rsvp-webhook function:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing your response</Message></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
        status: 200,
      }
    );
  }
});
