import { useNavigate } from "react-router-dom";
import { Calendar, Users, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventScore {
  eventId: string;
  courseName: string;
  date: string;
  playerCount: number;
  scoredCount: number;
}

interface RecentEventsScoringProps {
  events: EventScore[];
  isLoading: boolean;
}

export function RecentEventsScoring({ events, isLoading }: RecentEventsScoringProps) {
  const navigate = useNavigate();

  const { data: allEvents } = useQuery({
    queryKey: ["all-events-for-scoring"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, course_name, date")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleEventSelect = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading recent events...</div>;
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recent events to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Select an event to enter scores
              </label>
              <Select onValueChange={handleEventSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent>
                  {allEvents?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.course_name} - {format(new Date(event.date), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Plus className="h-5 w-5 text-muted-foreground mt-6" />
          </div>
        </CardContent>
      </Card>

      {events.map((event) => {
        const isFullyScored = event.scoredCount === event.playerCount;
        const scoringProgress = event.playerCount > 0
          ? Math.round((event.scoredCount / event.playerCount) * 100)
          : 0;

        return (
          <Card key={event.eventId} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{event.courseName}</h3>
                    {isFullyScored ? (
                      <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-500/50 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Needs Scoring
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(event.date), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.scoredCount} / {event.playerCount} scored ({scoringProgress}%)
                    </div>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${scoringProgress}%` }}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/events/${event.eventId}`)}
                  variant={isFullyScored ? "outline" : "default"}
                >
                  {isFullyScored ? "View Event" : "Enter Scores"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
