import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log("RSVP request received:", req.method, url.pathname, url.search.replace(/token=[^&]+/, "token=REDACTED"));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appUrl = Deno.env.get("APP_URL");
  
  // GET requests: redirect to the React app route
  if (req.method === "GET") {
    const token = url.searchParams.get("token");
    const response = url.searchParams.get("response");
    
    if (!token || !response || !appUrl) {
      console.error("GET redirect failed: missing token, response, or APP_URL");
      return new Response("Bad Request", { status: 400 });
    }
    
    const redirectUrl = `${appUrl}/rsvp?token=${encodeURIComponent(token)}&response=${encodeURIComponent(response)}`;
    console.log("Redirecting GET to:", redirectUrl.replace(/token=[^&]+/, "token=REDACTED"));
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": redirectUrl,
      },
    });
  }

  // POST requests: process RSVP and return JSON
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { token, response } = body;

      if (!token || !response) {
        return new Response(
          JSON.stringify({ result: "error", message: "Missing token or response parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response !== "yes" && response !== "no") {
        return new Response(
          JSON.stringify({ result: "error", message: "Invalid response. Must be 'yes' or 'no'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Find the event_player by rsvp_token
      const { data: eventPlayer, error: fetchError } = await supabase
        .from("event_players")
        .select(`
          id,
          event_id,
          status,
          responded_at,
          players!inner(name),
          events!inner(course_name, date, first_tee_time, holes)
        `)
        .eq("rsvp_token", token)
        .single();

      if (fetchError || !eventPlayer) {
        console.error("Token lookup failed:", fetchError);
        return new Response(
          JSON.stringify({ result: "invalid", message: "This RSVP link is invalid or has expired. Please contact the event organizer." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const player = eventPlayer.players as any;
      const event = eventPlayer.events as any;

      const eventDetails = {
        course: event.course_name,
        date: formatDate(event.date),
        teeTime: formatTeeTime(event.first_tee_time),
        holes: event.holes,
      };

      // Check if already responded
      if (eventPlayer.responded_at) {
        return new Response(
          JSON.stringify({
            result: "already_responded",
            status: eventPlayer.status,
            playerName: player.name,
            message: `Hi ${player.name}! You've already responded to this invite. Your current status is: ${eventPlayer.status.toUpperCase()}.`,
            eventDetails,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the status
      const { error: updateError } = await supabase
        .from("event_players")
        .update({
          status: response,
          responded_at: new Date().toISOString(),
        })
        .eq("id", eventPlayer.id);

      if (updateError) {
        console.error("Update failed:", updateError);
        return new Response(
          JSON.stringify({ result: "error", message: "Failed to update your response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isYes = response === "yes";
      console.log("RSVP updated successfully:", { playerId: eventPlayer.id, response });

      return new Response(
        JSON.stringify({
          result: "success",
          status: response,
          playerName: player.name,
          message: isYes
            ? `Thanks ${player.name}! We've got you down for the event. See you on the course!`
            : `Thanks for letting us know, ${player.name}. Hope to see you at a future event!`,
          eventDetails,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Error in handle-rsvp POST:", error);
      return new Response(
        JSON.stringify({ result: "error", message: error.message || "An error occurred processing your response." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTeeTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
