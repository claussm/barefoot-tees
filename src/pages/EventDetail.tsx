import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lock, Unlock, FileText } from "lucide-react";
import { EventPlayersList } from "@/components/EventPlayersList";
import { TeeSheet } from "@/components/TeeSheet";
import { EventScoring } from "@/components/EventScoring";
import { toast } from "sonner";
import { format } from "date-fns";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState(role === "scorer" ? "scoring" : "players");

  const { data: event } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
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
    </div>
  );
};

export default EventDetail;