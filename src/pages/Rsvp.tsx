import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface RsvpResult {
  result: "success" | "already_responded" | "invalid" | "error";
  status?: string;
  playerName?: string;
  message?: string;
  eventDetails?: {
    course: string;
    date: string;
    teeTime: string;
    holes: number;
  };
}

export default function Rsvp() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RsvpResult | null>(null);

  const token = searchParams.get("token");
  const response = searchParams.get("response");

  useEffect(() => {
    async function processRsvp() {
      if (!token || !response) {
        setResult({
          result: "error",
          message: "Missing token or response parameter",
        });
        setLoading(false);
        return;
      }

      if (response !== "yes" && response !== "no") {
        setResult({
          result: "error",
          message: "Invalid response. Must be 'yes' or 'no'",
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("handle-rsvp", {
          method: "POST",
          body: { token, response },
        });

        if (error) {
          console.error("RSVP error:", error);
          setResult({
            result: "error",
            message: error.message || "Failed to process RSVP",
          });
        } else {
          setResult(data as RsvpResult);
        }
      } catch (err: any) {
        console.error("RSVP exception:", err);
        setResult({
          result: "error",
          message: err.message || "An unexpected error occurred",
        });
      } finally {
        setLoading(false);
      }
    }

    processRsvp();
  }, [token, response]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processing your response...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSuccess = result?.result === "success" || result?.result === "already_responded";
  const isYes = result?.status === "yes";
  const isAlreadyResponded = result?.result === "already_responded";

  const getIcon = () => {
    if (!isSuccess) return <AlertCircle className="h-16 w-16 text-amber-500" />;
    if (isYes) return <CheckCircle className="h-16 w-16 text-green-500" />;
    return <XCircle className="h-16 w-16 text-red-500" />;
  };

  const getTitle = () => {
    if (!isSuccess) return "Something Went Wrong";
    if (isAlreadyResponded) return "Already Responded";
    if (isYes) return "You're In! 🎉";
    return "Maybe Next Time";
  };

  const getMessage = () => {
    if (result?.message) return result.message;
    if (!isSuccess) return "An error occurred processing your response. Please try again or contact the event organizer.";
    if (isAlreadyResponded) {
      return `You've already responded to this invite. Your current status is: ${result?.status?.toUpperCase()}.`;
    }
    if (isYes) return "We've got you down for the event. See you on the course!";
    return "Thanks for letting us know. Hope to see you at a future event!";
  };

  const headerBgClass = !isSuccess 
    ? "bg-amber-500" 
    : isYes 
      ? "bg-green-600" 
      : "bg-red-600";

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden shadow-lg">
        <CardHeader className={`${headerBgClass} text-white py-8 flex flex-col items-center`}>
          <span className="text-5xl mb-2">🏌️</span>
          <h1 className="text-2xl font-bold text-center">{getTitle()}</h1>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {getMessage()}
          </p>
          
          {result?.eventDetails && (
            <div className="bg-muted rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Event Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground text-sm">Course</span>
                  <span className="font-medium text-sm">{result.eventDetails.course}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground text-sm">Date</span>
                  <span className="font-medium text-sm">{result.eventDetails.date}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground text-sm">First Tee Time</span>
                  <span className="font-medium text-sm">{result.eventDetails.teeTime}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground text-sm">Format</span>
                  <span className="font-medium text-sm">{result.eventDetails.holes} Holes</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
