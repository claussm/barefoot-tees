import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lock, Unlock, FileText, Trash2, Pencil } from "lucide-react";
import { EventPlayersList } from "@/components/EventPlayersList";
import { TeeSheet } from "@/components/TeeSheet";
import { EventDialog } from "@/components/EventDialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("players");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["groups", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_assignments(
            *,
            players:player_id(*)
          )
        `)
        .eq("event_id", id)
        .order("group_index");
      if (error) throw error;
      return data;
    },
  });

  // Fetch player stats (6-game averages) for all assigned players
  const { data: playerStats } = useQuery({
    queryKey: ["player-stats-for-event", id],
    queryFn: async () => {
      if (!groups || groups.length === 0) return {};

      // Collect all unique player IDs from groups
      const playerIds = new Set<string>();
      groups.forEach(group => {
        group.group_assignments?.forEach((assignment: any) => {
          playerIds.add(assignment.player_id);
        });
      });

      if (playerIds.size === 0) return {};

      // Fetch stats for each player
      const statsPromises = Array.from(playerIds).map(async (playerId) => {
        const { data: scores, error } = await supabase
          .from("round_scores")
          .select("points")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) {
          console.error("Error fetching scores for player:", playerId, error);
          return { playerId, average: 0, roundsPlayed: 0 };
        }

        const roundsPlayed = scores?.length || 0;
        const average = roundsPlayed > 0
          ? scores.reduce((sum, s) => sum + Number(s.points), 0) / roundsPlayed
          : 0;

        return { playerId, average, roundsPlayed };
      });

      const stats = await Promise.all(statsPromises);

      // Convert to map for easy lookup: playerId -> stats
      const statsMap: Record<string, { average: number; roundsPlayed: number }> = {};
      stats.forEach(stat => {
        statsMap[stat.playerId] = { average: stat.average, roundsPlayed: stat.roundsPlayed };
      });

      return statsMap;
    },
    enabled: !!groups && groups.length > 0,
  });

  const lockMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      const { error } = await supabase
        .from("events")
        .update({ is_locked: locked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast.success(event?.is_locked ? "Event unlocked" : "Event locked successfully");
    },
  });

  const clearTeeSheetMutation = useMutation({
    mutationFn: async () => {
      const { error: clearError } = await supabase
        .from("group_assignments")
        .delete()
        .in("group_id", groups?.map(g => g.id) || []);

      if (clearError) throw clearError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", id] });
      toast.success("Tee sheet cleared");
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      // Get all "yes" players with their data
      const { data: yesPlayers, error: playersError } = await supabase
        .from("event_players")
        .select("player_id, players(*)")
        .eq("event_id", id)
        .eq("status", "yes");

      if (playersError) throw playersError;

      // Get scores for each player (last 6 rounds)
      const playersWithScores = await Promise.all(
        (yesPlayers || []).map(async (ep) => {
          const { data: scores } = await supabase
            .from("round_scores")
            .select("points")
            .eq("player_id", ep.player_id)
            .order("created_at", { ascending: false })
            .limit(6);

          const avgScore = scores && scores.length > 0
            ? scores.reduce((sum, s) => sum + Number(s.points), 0) / scores.length
            : 0;

          return {
            player_id: ep.player_id,
            name: ep.players.name,
            tee_box_id: ep.players.tee_box_id,
            avg_score: avgScore,
          };
        })
      );

      // Sort players by score (high to low), then by tee box for stability
      const sortedPlayers = playersWithScores.sort((a, b) => {
        if (b.avg_score !== a.avg_score) {
          return b.avg_score - a.avg_score;
        }
        return (a.tee_box_id || "").localeCompare(b.tee_box_id || "");
      });

      // Clear existing assignments
      const { error: clearError } = await supabase
        .from("group_assignments")
        .delete()
        .in("group_id", groups?.map(g => g.id) || []);

      if (clearError) throw clearError;

      // Fill-first assignment: fill each group completely before moving to the next
      const assignments = [];
      const slotsPerGroup = event?.slots_per_group || 4;
      const sortedGroups = [...(groups || [])].sort((a, b) => a.group_index - b.group_index);
      
      let playerIndex = 0;
      for (const group of sortedGroups) {
        for (let position = 1; position <= slotsPerGroup && playerIndex < sortedPlayers.length; position++) {
          assignments.push({
            group_id: group.id,
            player_id: sortedPlayers[playerIndex].player_id,
            position,
          });
          playerIndex++;
        }
      }

      if (assignments.length > 0) {
        const { error: insertError } = await supabase
          .from("group_assignments")
          .insert(assignments);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", id] });
      toast.success("Groups auto-assigned successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete in order: group_assignments -> groups -> event_players -> round_scores -> event
      // First delete group assignments
      if (groups && groups.length > 0) {
        const { error: assignmentsError } = await supabase
          .from("group_assignments")
          .delete()
          .in("group_id", groups.map(g => g.id));
        if (assignmentsError) throw assignmentsError;
      }

      // Delete groups
      const { error: groupsError } = await supabase
        .from("groups")
        .delete()
        .eq("event_id", id);
      if (groupsError) throw groupsError;

      // Delete event players
      const { error: playersError } = await supabase
        .from("event_players")
        .delete()
        .eq("event_id", id);
      if (playersError) throw playersError;

      // Delete round scores
      const { error: scoresError } = await supabase
        .from("round_scores")
        .delete()
        .eq("event_id", id);
      if (scoresError) throw scoresError;

      // Finally delete the event
      const { error: eventError } = await supabase
        .from("events")
        .delete()
        .eq("id", id);
      if (eventError) throw eventError;
    },
    onSuccess: () => {
      // Invalidate all event-related queries for immediate UI updates across all pages
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["all_events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming_events_dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["scorer-events"] });
      queryClient.invalidateQueries({ queryKey: ["top_players_dashboard"] });
      toast.success("Event deleted successfully");
      navigate("/");
    },
    onError: (error) => {
      toast.error("Failed to delete event: " + error.message);
    },
  });

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!event) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Print-only header */}
      <div className="print-header hidden">
        <h1 className="text-2xl font-bold">{event.course_name}</h1>
        <p className="text-sm">
          {format(parseISO(event.date + "T00:00:00"), "MMMM d, yyyy")} • {event.holes} holes • First Tee: {event.first_tee_time}
        </p>
      </div>

      <header className="border-b border-border bg-card print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(role === "admin" ? "/" : "/scorer")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{event.course_name}</h1>
                <p className="text-sm text-muted">
                  {format(parseISO(event.date + "T00:00:00"), "MMMM d, yyyy")} • {event.holes} holes
                </p>
              </div>
            </div>

            {role === "admin" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <FileText className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant={event.is_locked ? "outline" : "default"}
                  onClick={() => lockMutation.mutate(!event.is_locked)}
                >
                  {event.is_locked ? (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Lock
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          {role === "admin" && (
            <TabsList className="grid w-full max-w-xl grid-cols-2">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="teesheet">Tee Sheet</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="players" className="mt-6">
            <EventPlayersList eventId={id!} maxPlayers={event.max_players} />
          </TabsContent>

          {role === "admin" && (
            <TabsContent value="teesheet" className="mt-6">
              <div className="mb-4 flex gap-2">
                <Button
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={event.is_locked || autoAssignMutation.isPending}
                >
                  Auto-Assign Groups
                </Button>
                <Button
                  variant="outline"
                  onClick={() => clearTeeSheetMutation.mutate()}
                  disabled={event.is_locked || clearTeeSheetMutation.isPending}
                >
                  Clear Tee Sheet
                </Button>
              </div>
              <TeeSheet
                eventId={id!}
                groups={groups || []}
                isLocked={event.is_locked}
                slotsPerGroup={event.slots_per_group}
                playerStats={playerStats || {}}
              />
            </TabsContent>
          )}
        </Tabs>

        <div className="hidden print:block">
          <TeeSheet
            eventId={id!}
            groups={groups || []}
            isLocked={true}
            slotsPerGroup={event.slots_per_group}
            playerStats={playerStats || {}}
          />
        </div>
      </main>

      <EventDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["event", id] });
          }
        }}
        event={event}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.course_name}" on {format(parseISO(event.date + "T00:00:00"), "MMMM d, yyyy")}? 
              This will permanently delete the event along with all player assignments, groups, and scores. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventDetail;