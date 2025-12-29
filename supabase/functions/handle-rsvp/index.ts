import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const response = url.searchParams.get("response");

    if (!token || !response) {
      throw new Error("Missing token or response parameter");
    }

    if (response !== "yes" && response !== "no") {
      throw new Error("Invalid response. Must be 'yes' or 'no'");
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
        generateHtmlResponse({
          success: false,
          title: "Invalid Link",
          message: "This RSVP link is invalid or has expired. Please contact the event organizer.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const player = eventPlayer.players as any;
    const event = eventPlayer.events as any;

    // Check if already responded
    if (eventPlayer.responded_at) {
      return new Response(
        generateHtmlResponse({
          success: true,
          title: "Already Responded",
          message: `Hi ${player.name}! You've already responded to this invite. Your current status is: ${eventPlayer.status.toUpperCase()}.`,
          eventDetails: {
            course: event.course_name,
            date: formatDate(event.date),
            teeTime: formatTeeTime(event.first_tee_time),
            holes: event.holes,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
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
      throw new Error("Failed to update your response");
    }

    const isYes = response === "yes";

    return new Response(
      generateHtmlResponse({
        success: true,
        title: isYes ? "You're In! 🎉" : "Maybe Next Time",
        message: isYes 
          ? `Thanks ${player.name}! We've got you down for the event. See you on the course!`
          : `Thanks for letting us know, ${player.name}. Hope to see you at a future event!`,
        eventDetails: {
          course: event.course_name,
          date: formatDate(event.date),
          teeTime: formatTeeTime(event.first_tee_time),
          holes: event.holes,
        },
        isYes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("Error in handle-rsvp:", error);
    return new Response(
      generateHtmlResponse({
        success: false,
        title: "Something Went Wrong",
        message: error.message || "An error occurred processing your response. Please try again or contact the event organizer.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
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

interface HtmlResponseParams {
  success: boolean;
  title: string;
  message: string;
  eventDetails?: {
    course: string;
    date: string;
    teeTime: string;
    holes: number;
  };
  isYes?: boolean;
}

function generateHtmlResponse({ success, title, message, eventDetails, isYes }: HtmlResponseParams): string {
  const bgColor = success ? (isYes ? "#22c55e" : "#ef4444") : "#f59e0b";
  const headerBg = success ? (isYes ? "#16a34a" : "#dc2626") : "#d97706";
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Golf League RSVP</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f4f4f5;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          max-width: 480px;
          width: 100%;
          overflow: hidden;
        }
        .header {
          background: ${headerBg};
          color: white;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .content {
          padding: 32px 24px;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #3f3f46;
          margin-bottom: 24px;
        }
        .event-details {
          background: #f4f4f5;
          border-radius: 12px;
          padding: 20px;
        }
        .event-details h3 {
          font-size: 14px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e4e4e7;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #71717a;
          font-size: 14px;
        }
        .detail-value {
          color: #18181b;
          font-weight: 500;
          font-size: 14px;
        }
        .golf-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="golf-icon">🏌️</div>
          <h1>${title}</h1>
        </div>
        <div class="content">
          <p class="message">${message}</p>
          ${eventDetails ? `
            <div class="event-details">
              <h3>Event Details</h3>
              <div class="detail-row">
                <span class="detail-label">Course</span>
                <span class="detail-value">${eventDetails.course}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${eventDetails.date}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">First Tee Time</span>
                <span class="detail-value">${eventDetails.teeTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Format</span>
                <span class="detail-value">${eventDetails.holes} Holes</span>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    </body>
    </html>
  `;
}
