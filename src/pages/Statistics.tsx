import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { PlayerLeaderboard } from "@/components/PlayerLeaderboard";
import { TeamStandings } from "@/components/TeamStandings";
import { RecentEventsScoring } from "@/components/RecentEventsScoring";
import { PageHeader } from "@/components/PageHeader";

export default function Statistics() {
  const { role } = useAuth();
  const [showTeams, setShowTeams] = useState(false);

  const { data: playerStats, isLoading: loadingPlayers } = useQuery({
    queryKey: ["player-statistics"],
    queryFn: async () => {
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select(`
          id,
          name,
          default_team_id,
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
          .select("points, created_at")
          .eq("player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(6);
        if (scoresError) throw scoresError;

        const totalPoints = scores.reduce((sum, s) => sum + Number(s.points), 0);
        const average = scores.length > 0 ? totalPoints / scores.length : 0;
        const roundsPlayed = scores.length;
        const lastScore = scores.length > 0 ? Number(scores[0].points) : undefined;

        return {
          id: player.id,
          name: player.name,
          average: average.toFixed(2),
          roundsPlayed,
          lastScore,
          teamId: player.default_team_id,
          teamName: player.player_teams?.name,
          teamColor: player.player_teams?.color,
        };
      });

      const stats = await Promise.all(statsPromises);
      return stats.sort((a, b) => Number(b.average) - Number(a.average));
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_teams")
        .select("id, name, color")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teamStats, isLoading: loadingTeams } = useQuery({
    queryKey: ["team-statistics"],
    queryFn: async () => {
      const { data: teams, error: teamsError } = await supabase
        .from("player_teams")
        .select(`
          id,
          name,
          color,
          player_team_members (
            player_id,
            players (
              name
            )
          )
        `)
        .eq("is_active", true);
      if (teamsError) throw teamsError;

      const teamStatsPromises = teams.map(async (team) => {
        const members = team.player_team_members;
        
        if (members.length === 0) {
          return {
            id: team.id,
            name: team.name,
            color: team.color,
            average: "0.00",
            memberCount: 0,
            members: [],
          };
        }

        const memberStatsPromises = members.map(async (member: any) => {
          const { data: scores } = await supabase
            .from("round_scores")
            .select("points")
            .eq("player_id", member.player_id)
            .order("created_at", { ascending: false })
            .limit(6);

          if (!scores || scores.length === 0) {
            return {
              name: member.players.name,
              average: "0.00",
              avgNum: 0,
            };
          }

          const total = scores.reduce((sum, s) => sum + Number(s.points), 0);
          const avg = total / scores.length;
          return {
            name: member.players.name,
            average: avg.toFixed(2),
            avgNum: avg,
          };
        });

        const memberStats = await Promise.all(memberStatsPromises);
        const teamAverage = memberStats.length > 0
          ? memberStats.reduce((sum, m) => sum + m.avgNum, 0) / memberStats.length
          : 0;

        return {
          id: team.id,
          name: team.name,
          color: team.color,
          average: teamAverage.toFixed(2),
          memberCount: members.length,
          members: memberStats,
        };
      });

      const stats = await Promise.all(teamStatsPromises);
      return stats.sort((a, b) => Number(b.average) - Number(a.average));
    },
  });

  const { data: recentEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["recent-events-scoring"],
    queryFn: async () => {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select(`
          id,
          course_name,
          date,
          event_players!inner (
            player_id,
            status
          )
        `)
        .eq("event_players.status", "yes")
        .order("date", { ascending: false })
        .limit(5);
      if (eventsError) throw eventsError;

      const eventsWithScores = await Promise.all(
        events.map(async (event) => {
          const playerIds = event.event_players.map((ep: any) => ep.player_id);
          
          const { data: scores } = await supabase
            .from("round_scores")
            .select("player_id")
            .eq("event_id", event.id)
            .in("player_id", playerIds);

          return {
            eventId: event.id,
            courseName: event.course_name,
            date: event.date,
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
      <PageHeader 
        title="Statistics & Scoring"
        subtitle={`View player and team performance${role === "scorer" ? ", and manage event scoring" : ""}`}
        action={
          <Button
            size="lg"
            onClick={() => setShowTeams(!showTeams)}
            className="shadow-2xl [filter:_drop-shadow(0_4px_12px_rgb(0_0_0_/_60%))]"
          >
            <Users className="h-4 w-4 mr-2" />
            {showTeams ? "View Players" : "View Teams"}
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8">

      <div className="space-y-6">
        {!showTeams ? (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Player Leaderboard</h2>
            <PlayerLeaderboard
              playerStats={playerStats || []}
              teams={teams}
              isLoading={loadingPlayers}
            />
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Team Standings</h2>
            <TeamStandings
              teamStats={teamStats || []}
              isLoading={loadingTeams}
            />
          </div>
        )}

        {role === "scorer" && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Recent Events</h2>
            <RecentEventsScoring
              events={recentEvents || []}
              isLoading={loadingEvents}
            />
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
