import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Calendar, TrendingUp, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { EventDialog } from "@/components/EventDialog";
import { format } from "date-fns";
import heroImage from "@/assets/golf-hero.jpg";

const Index = () => {
  const { signOut, user } = useAuth();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const { data: players } = useQuery({
    queryKey: ["players_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming_events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          event_players(count)
        `)
        .gte("date", today)
        .order("date")
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-80 overflow-hidden">
        <img
          src={heroImage}
          alt="Golf course at sunrise"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary-foreground mb-2">
                Golf League Manager
              </h1>
              <p className="text-lg text-primary-foreground/90">
                Organize players, events, and tee times with ease
              </p>
            </div>
            <Button variant="outline" onClick={signOut} className="bg-background/10 backdrop-blur-sm border-primary-foreground/20 text-primary-foreground hover:bg-background/20">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Players</CardTitle>
              <Users className="h-4 w-4 text-muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{players || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {upcomingEvents?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted" />
            </CardHeader>
            <CardContent className="flex gap-2">
              <NavLink to="/players">
                <Button variant="outline" size="sm">
                  Players
                </Button>
              </NavLink>
              <NavLink to="/teams">
                <Button variant="outline" size="sm">
                  Teams
                </Button>
              </NavLink>
              <NavLink to="/statistics">
                <Button variant="outline" size="sm">
                  Stats
                </Button>
              </NavLink>
              <Button size="sm" onClick={() => setEventDialogOpen(true)}>
                <Plus className="mr-1 h-3 w-3" />
                Event
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Events</CardTitle>
            <Button onClick={() => setEventDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <NavLink key={event.id} to={`/events/${event.id}`}>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {event.course_name}
                        </h3>
                        <p className="text-sm text-muted">
                          {format(new Date(event.date), "MMMM d, yyyy")} • {event.holes} holes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {event.is_locked ? "🔒 Locked" : "📝 Open"}
                        </p>
                        <p className="text-xs text-muted">
                          {event.event_players[0]?.count || 0} players
                        </p>
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No upcoming events</p>
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

export default Index;
