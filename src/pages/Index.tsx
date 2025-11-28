import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Calendar, Award } from "lucide-react";
import { EventDialog } from "@/components/EventDialog";
import { format } from "date-fns";
import heroImage from "@/assets/golf-hero.jpg";
const Index = () => {
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const {
    data: players
  } = useQuery({
    queryKey: ["players_count"],
    queryFn: async () => {
      const {
        count,
        error
      } = await supabase.from("players").select("*", {
        count: "exact",
        head: true
      }).eq("is_active", true);
      if (error) throw error;
      return count || 0;
    }
  });
  const {
    data: pointsLeader
  } = useQuery({
    queryKey: ["points_leader"],
    queryFn: async () => {
      const {
        data: players,
        error: playersError
      } = await supabase.from("players").select("id, name").eq("is_active", true);
      if (playersError) throw playersError;
      const statsPromises = players.map(async player => {
        const {
          data: scores,
          error: scoresError
        } = await supabase.from("round_scores").select("points").eq("player_id", player.id).order("created_at", {
          ascending: false
        }).limit(6);
        if (scoresError) throw scoresError;
        if (scores.length === 0) return null;
        const totalPoints = scores.reduce((sum, s) => sum + Number(s.points), 0);
        const average = totalPoints / scores.length;
        return {
          ...player,
          average
        };
      });
      const stats = (await Promise.all(statsPromises)).filter(s => s !== null);
      const sorted = stats.sort((a, b) => (b?.average || 0) - (a?.average || 0));
      return sorted[0] || null;
    }
  });
  const {
    data: upcomingEvents
  } = useQuery({
    queryKey: ["upcoming_events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const {
        data,
        error
      } = await supabase.from("events").select(`
          *,
          event_players(count)
        `).gte("date", today).order("date").limit(5);
      if (error) throw error;
      return data;
    }
  });
  return <div className="min-h-screen bg-background">
      <div className="relative h-64 overflow-hidden">
        <img src={heroImage} alt="Golf course at sunrise" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold text-primary-foreground mb-2">
              Barefoot Tees 
            </h1>
            <p className="text-lg text-primary-foreground/90">
              Organize players, events, and tee times with ease
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 mb-8">
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
              <CardTitle className="text-sm font-medium">Points Leader</CardTitle>
              <Award className="h-4 w-4 text-muted" />
            </CardHeader>
            <CardContent>
              {pointsLeader ? <div>
                  <div className="text-2xl font-bold text-foreground">{pointsLeader.name}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pointsLeader.average.toFixed(2)} avg
                  </p>
                </div> : <div className="text-2xl font-bold text-muted-foreground">-</div>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Games</CardTitle>
            <Button onClick={() => setEventDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents && upcomingEvents.length > 0 ? <div className="space-y-4">
                {upcomingEvents.map(event => <a key={event.id} href={`/events/${event.id}`} className="block">
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
                  </a>)}
              </div> : <div className="text-center py-12 text-muted">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No upcoming events</p>
                <p className="text-sm">Create your first event to get started</p>
              </div>}
          </CardContent>
        </Card>

        <EventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
      </main>
    </div>;
};
export default Index;