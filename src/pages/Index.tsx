import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trophy, Calendar, ChevronRight } from "lucide-react";
import { EventDialog } from "@/components/EventDialog";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import course1 from "@/assets/course-1.jpg";
import course2 from "@/assets/course-2.jpg";
import course3 from "@/assets/course-3.jpg";
import course4 from "@/assets/course-4.jpg";
import course5 from "@/assets/course-5.jpg";
import course6 from "@/assets/course-6.jpg";
import course7 from "@/assets/course-7.jpg";
import course8 from "@/assets/course-8.jpg";
import course9 from "@/assets/course-9.jpg";

const courseImages = [course1, course2, course3, course4, course5, course6, course7, course8, course9];

const Index = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const headerImage = useMemo(() => {
    return courseImages[Math.floor(Math.random() * courseImages.length)];
  }, []);
  const { data: topPlayers, isLoading: loadingPlayers } = useQuery({
    queryKey: ["top_players_dashboard"],
    queryFn: async () => {
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select(`
          id,
          name,
          player_teams:default_team_id (
            name,
            color
          )
        `)
        .eq("is_active", true);
      if (playersError) throw playersError;

      const statsPromises = players.map(async (player) => {
        const { data: scores, error: scoresError } = await supabase
          .from("round_scores")
          .select("points")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(6);
        if (scoresError) throw scoresError;

        if (scores.length === 0) return null;

        const totalPoints = scores.reduce((sum, s) => sum + Number(s.points), 0);
        const average = totalPoints / scores.length;

        return {
          id: player.id,
          name: player.name,
          average: average.toFixed(2),
          teamName: player.player_teams?.name,
          teamColor: player.player_teams?.color,
        };
      });

      const stats = (await Promise.all(statsPromises)).filter(s => s !== null);
      return stats.sort((a, b) => Number(b.average) - Number(a.average)).slice(0, 5);
    },
  });
  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming_events_dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          course_name,
          date,
          holes,
          is_locked,
          event_players!inner (
            player_id,
            status
          )
        `)
        .eq("event_players.status", "yes")
        .gte("date", today)
        .order("date")
        .limit(5);
      if (error) throw error;

      const eventsWithScores = await Promise.all(
        data.map(async (event) => {
          const playerIds = event.event_players.map((ep: any) => ep.player_id);
          
          const { data: scores } = await supabase
            .from("round_scores")
            .select("player_id")
            .eq("event_id", event.id)
            .in("player_id", playerIds);

          return {
            id: event.id,
            course_name: event.course_name,
            date: event.date,
            holes: event.holes,
            is_locked: event.is_locked,
            playerCount: playerIds.length,
            scoredCount: scores?.length || 0,
          };
        })
      );

      return eventsWithScores;
    },
  });
  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64 overflow-hidden">
        <img
          src={headerImage}
          alt="Golf course"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold text-primary-foreground mb-2 drop-shadow-lg">
              Barefoot Tees 
            </h1>
            <p className="text-lg text-primary-foreground/90 drop-shadow-md">
              Organize players, events, and tee times with ease
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Top Players Leaderboard */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top Players
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/statistics")}
              >
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPlayers ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : topPlayers && topPlayers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPlayers.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">
                          {index === 0 && "🥇"}
                          {index === 1 && "🥈"}
                          {index === 2 && "🥉"}
                          {index > 2 && index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {player.teamColor && (
                              <div
                                className="w-3 h-3 rounded shadow-md"
                                style={{ backgroundColor: player.teamColor }}
                              />
                            )}
                            <span className="font-medium">{player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {player.average}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No player data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Games
              </CardTitle>
              {role === "admin" && (
                <Button onClick={() => setEventDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {event.course_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(event.date + "T00:00:00"), "MMM d, yyyy")} • {event.holes} holes
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Scores: {event.scoredCount}/{event.playerCount}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        Enter Scores
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No upcoming events</p>
                  {role === "admin" && (
                    <p className="text-sm">Create your first event to get started</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <EventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
      </main>
    </div>
  );
};

export default Index;