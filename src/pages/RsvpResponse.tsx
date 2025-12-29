import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function RsvpResponse() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const response = searchParams.get("response");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleRsvp = async () => {
      if (!token || !response) {
        setStatus("error");
        setMessage("Invalid RSVP link. Missing token or response.");
        return;
      }

      if (response !== "yes" && response !== "no") {
        setStatus("error");
        setMessage("Invalid response. Must be 'yes' or 'no'.");
        return;
      }

      try {
        // Call the edge function
        const { data, error } = await supabase.functions.invoke("handle-rsvp", {
          body: null,
          headers: {
            "Content-Type": "application/json",
          },
        });

        // The edge function returns HTML, so we need to handle it differently
        // For now, we'll make a direct fetch to the edge function URL
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "eondrbhasvkvcbbfmuew";
        const functionUrl = `https://${projectId}.supabase.co/functions/v1/handle-rsvp?token=${token}&response=${response}`;
        
        const functionResponse = await fetch(functionUrl);
        const html = await functionResponse.text();
        
        // Replace the entire page with the response HTML
        document.open();
        document.write(html);
        document.close();
      } catch (err: any) {
        console.error("RSVP error:", err);
        setStatus("error");
        setMessage(err.message || "An error occurred processing your response.");
      }
    };

    handleRsvp();
  }, [token, response]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Processing your response...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  return null;
}
