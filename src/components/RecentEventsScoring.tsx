import { useNavigate } from "react-router-dom";
import { Calendar, Users, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
