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
import { EventScoring } from "@/components/EventScoring";
import { EventDialog } from "@/components/EventDialog";
import { toast } from "sonner";
import { format } from "date-fns";
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
  const [activeTab, setActiveTab] = useState(role === "scorer" ? "scoring" : "players");
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

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      // First, get all playing players
      const { data: playingPlayers, error: playersError } = await supabase
        .from("event_players")
        .select("player_id, players(*)")
        .eq("event_id", id)
        .eq("status", "playing");

      if (playersError) throw playersError;

      // Clear existing assignments
      const { error: clearError } = await supabase
        .from("group_assignments")
        .delete()
        .in("group_id", groups?.map(g => g.id) || []);

      if (clearError) throw clearError;

      // Assign players to groups
      let playerIndex = 0;
      const assignments = [];

      for (const group of groups || []) {
        for (let position = 1; position <= (event?.slots_per_group || 4); position++) {
          if (playerIndex < (playingPlayers?.length || 0)) {
            assignments.push({
              group_id: group.id,
              player_id: playingPlayers![playerIndex].player_id,
              position,
            });
            playerIndex++;
          }
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
                  {format(new Date(event.date), "MMMM d, yyyy")} • {event.holes} holes
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
        {role === "scorer" ? (
          <EventScoring eventId={id!} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="teesheet">Tee Sheet</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
            </TabsList>

            <TabsContent value="players" className="mt-6">
              <EventPlayersList eventId={id!} maxPlayers={event.max_players} />
            </TabsContent>

            <TabsContent value="teesheet" className="mt-6">
              <div className="mb-4">
                <Button
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={event.is_locked || autoAssignMutation.isPending}
                >
                  Auto-Assign Groups
                </Button>
              </div>
              <TeeSheet
                eventId={id!}
                groups={groups || []}
                isLocked={event.is_locked}
                slotsPerGroup={event.slots_per_group}
              />
            </TabsContent>

            <TabsContent value="scoring" className="mt-6">
              <EventScoring eventId={id!} />
            </TabsContent>
          </Tabs>
        )}

        <div className="hidden print:block">
          <TeeSheet
            eventId={id!}
            groups={groups || []}
            isLocked={true}
            slotsPerGroup={event.slots_per_group}
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
              Are you sure you want to delete "{event.course_name}" on {format(new Date(event.date), "MMMM d, yyyy")}? 
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