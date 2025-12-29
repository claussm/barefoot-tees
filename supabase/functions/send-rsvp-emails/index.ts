import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRsvpRequest {
  event_id: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Golf League <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_id }: SendRsvpRequest = await req.json();

    if (!event_id) {
      throw new Error("event_id is required");
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Fetch players who:
    // 1. Have status = 'invited'
    // 2. Have not been sent an invite yet (invite_sent_at IS NULL)
    // 3. Have an email address
    const { data: eventPlayers, error: playersError } = await supabase
      .from("event_players")
      .select(`
        id,
        player_id,
        rsvp_token,
        players!inner(id, name, email)
      `)
      .eq("event_id", event_id)
      .eq("status", "invited")
      .is("invite_sent_at", null);

    if (playersError) {
      throw new Error("Failed to fetch players: " + playersError.message);
    }

    // Filter players with valid emails
    const playersWithEmail = eventPlayers?.filter(
      (ep: any) => ep.players?.email && ep.players.email.trim() !== ""
    ) || [];

    if (playersWithEmail.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: "No players with email addresses to invite" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || `https://${Deno.env.get("SUPABASE_PROJECT_REF")}.lovable.app`;
    
    // Format event date
    const eventDate = new Date(event.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format tee time
    const formatTeeTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    let sentCount = 0;
    const errors: string[] = [];

    for (const ep of playersWithEmail) {
      const player = ep.players as any;
      const rsvpToken = ep.rsvp_token;

      const yesUrl = `${appUrl}/rsvp/${rsvpToken}?response=yes`;
      const noUrl = `${appUrl}/rsvp/${rsvpToken}?response=no`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px;">
                  <tr>
                    <td style="padding: 40px 40px 30px;">
                      <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
                        Hey ${player.name}! 🏌️
                      </h1>
                      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                        You're invited to an upcoming golf event. Can you make it?
                      </p>
                      
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #71717a; font-size: 14px;">Course</span><br>
                              <span style="color: #18181b; font-size: 16px; font-weight: 500;">${event.course_name}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #71717a; font-size: 14px;">Date</span><br>
                              <span style="color: #18181b; font-size: 16px; font-weight: 500;">${eventDate}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #71717a; font-size: 14px;">First Tee Time</span><br>
                              <span style="color: #18181b; font-size: 16px; font-weight: 500;">${formatTeeTime(event.first_tee_time)}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #71717a; font-size: 14px;">Format</span><br>
                              <span style="color: #18181b; font-size: 16px; font-weight: 500;">${event.holes} Holes</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding-bottom: 12px;">
                            <a href="${yesUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 48px; border-radius: 8px;">
                              I'm In! ✓
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <a href="${noUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 48px; border-radius: 8px;">
                              Can't Make It
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                        This is an automated message. Please click one of the buttons above to respond.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const emailResult = await sendEmail(
          player.email,
          `Golf Event Invite - ${eventDate} at ${event.course_name}`,
          emailHtml
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error);
        }

        console.log(`Email sent to ${player.email}`);

        // Update invite_sent_at timestamp
        const { error: updateError } = await supabase
          .from("event_players")
          .update({ invite_sent_at: new Date().toISOString() })
          .eq("id", ep.id);

        if (updateError) {
          console.error(`Failed to update invite_sent_at for ${player.email}:`, updateError);
        }

        sentCount++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${player.email}:`, emailError);
        errors.push(`${player.name}: ${emailError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        total: playersWithEmail.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-rsvp-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
