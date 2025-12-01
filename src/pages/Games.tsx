import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar } from "lucide-react";
import { EventDialog } from "@/components/EventDialog";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/PageHeader";

const Games = () => {
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["all_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          event_players(count)
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Games"
        subtitle="View and manage all golf events"
        action={
          <Button onClick={() => setEventDialogOpen(true)} size="lg" className="shadow-2xl [filter:_drop-shadow(0_4px_12px_rgb(0_0_0_/_60%))]">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8">

        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading events...
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <a
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {event.course_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(event.date + "T00:00:00"), "MMMM d, yyyy")} • {event.holes} holes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {event.is_locked ? "🔒 Locked" : "📝 Open"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.event_players[0]?.count || 0} players
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No events yet</p>
                <p className="text-sm">Create your first event to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

      <EventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
      </main>
    </div>
  );
};

export default Games;
