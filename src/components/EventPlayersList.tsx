import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, History, CheckCircle, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface EventPlayersListProps {
  eventId: string;
  maxPlayers: number;
}

type SortField = "name" | "points" | null;
type SortDirection = "asc" | "desc";

export const EventPlayersList = ({ eventId, maxPlayers }: EventPlayersListProps) => {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [scores, setScores] = useState<Record<string, string>>({});

  const { data: eventPlayers } = useQuery({
    queryKey: ["event_players", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_players")
        .select("*, players(*)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
  });

  const { data: existingScores } = useQuery({
    queryKey: ["player_points", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("round_scores")
        .select("player_id, points")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
  });

  const { data: playerAverages } = useQuery({
    queryKey: ["player_averages", eventPlayers],
    queryFn: async () => {
      if (!eventPlayers) return {};
      
      const averages: Record<string, number> = {};
      await Promise.all(
        eventPlayers.map(async (ep) => {
          const { data } = await supabase
            .from("round_scores")
            .select("points")
            .eq("player_id", ep.player_id)
            .order("created_at", { ascending: false })
            .limit(6);
          
          if (data && data.length > 0) {
            const total = data.reduce((sum, s) => sum + Number(s.points), 0);
            averages[ep.player_id] = total / data.length;
          } else {
            averages[ep.player_id] = 0;
          }
        })
      );
      return averages;
    },
    enabled: !!eventPlayers,
  });

  const { data: availablePlayers } = useQuery({
    queryKey: ["available_players", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;

      const alreadyAdded = eventPlayers?.map((ep) => ep.player_id) || [];
      return data.filter((p) => !alreadyAdded.includes(p.id));
    },
    enabled: addDialogOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const playingCount = eventPlayers?.filter((ep) => ep.status === "playing").length || 0;
      
      if (status === "playing" && playingCount >= maxPlayers) {
        throw new Error("Max players reached. Consider setting status to waitlist.");
      }

      const { error } = await supabase
        .from("event_players")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      toast.success("Status updated");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateRsvpMutation = useMutation({
    mutationFn: async ({ id, rsvp_status }: { id: string; rsvp_status: string | null }) => {
      const { error } = await supabase
        .from("event_players")
        .update({ rsvp_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      toast.success("RSVP updated");
    },
  });

  const addPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from("event_players").insert({
        event_id: eventId,
        player_id: playerId,
        status: "invited",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      queryClient.invalidateQueries({ queryKey: ["available_players", eventId] });
      toast.success("Player added");
      setAddDialogOpen(false);
    },
  });

  const bulkAddActiveMutation = useMutation({
    mutationFn: async () => {
      const { data: activePlayers, error: playersError } = await supabase
        .from("players")
        .select("id")
        .eq("is_active", true);
      if (playersError) throw playersError;

      const alreadyAdded = eventPlayers?.map((ep) => ep.player_id) || [];
      const toAdd = activePlayers.filter((p) => !alreadyAdded.includes(p.id));

      if (toAdd.length === 0) {
        throw new Error("All active players are already in this event");
      }

      const { error: insertError } = await supabase.from("event_players").insert(
        toAdd.map((p) => ({
          event_id: eventId,
          player_id: p.id,
          status: "playing",
        }))
      );
      if (insertError) throw insertError;
      return toAdd.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      toast.success(`Added ${count} active players`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const bulkAddFromLastEventMutation = useMutation({
    mutationFn: async () => {
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("id")
        .neq("id", eventId)
        .order("date", { ascending: false })
        .limit(1);
      if (eventsError) throw eventsError;
      if (!events || events.length === 0) {
        throw new Error("No previous events found");
      }

      const lastEventId = events[0].id;
      const { data: lastEventPlayers, error: lastPlayersError } = await supabase
        .from("event_players")
        .select("player_id")
        .eq("event_id", lastEventId)
        .eq("status", "playing");
      if (lastPlayersError) throw lastPlayersError;

      const alreadyAdded = eventPlayers?.map((ep) => ep.player_id) || [];
      const toAdd = lastEventPlayers.filter((p) => !alreadyAdded.includes(p.player_id));

      if (toAdd.length === 0) {
        throw new Error("All players from last event are already in this event");
      }

      const { error: insertError } = await supabase.from("event_players").insert(
        toAdd.map((p) => ({
          event_id: eventId,
          player_id: p.player_id,
          status: "playing",
        }))
      );
      if (insertError) throw insertError;
      return toAdd.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      toast.success(`Added ${count} players from last event`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const bulkAddRsvpYesMutation = useMutation({
    mutationFn: async () => {
      const yesPlayers = eventPlayers?.filter((ep) => ep.rsvp_status === "yes") || [];
      
      if (yesPlayers.length === 0) {
        throw new Error("No players have RSVP'd yes");
      }

      const { error } = await supabase
        .from("event_players")
        .update({ status: "playing" })
        .eq("event_id", eventId)
        .eq("rsvp_status", "yes");
      if (error) throw error;
      return yesPlayers.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      toast.success(`Added ${count} players who RSVP'd yes`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (eventPlayerId: string) => {
      const { error } = await supabase
        .from("event_players")
        .delete()
        .eq("id", eventPlayerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      queryClient.invalidateQueries({ queryKey: ["groups", eventId] });
      toast.success("Player removed from event");
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Failed to remove player: " + error.message);
    },
  });

  const handleDeleteClick = (eventPlayerId: string, playerName: string) => {
    setPlayerToDelete({ id: eventPlayerId, name: playerName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (playerToDelete) {
      deletePlayerMutation.mutate(playerToDelete.id);
    }
  };

  const bulkUpdateRsvpMutation = useMutation({
    mutationFn: async (rsvpStatus: string | null) => {
      const { error } = await supabase
        .from("event_players")
        .update({ rsvp_status: rsvpStatus })
        .in("id", Array.from(selectedPlayers));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_players", eventId] });
      setSelectedPlayers(new Set());
      toast.success("Bulk RSVP updated");
    },
  });

  const saveScoresMutation = useMutation({
    mutationFn: async () => {
      const scoresToSave = Object.entries(scores)
        .filter(([_, points]) => points.trim() !== "")
        .map(([playerId, points]) => ({
          event_id: eventId,
          player_id: playerId,
          points: parseFloat(points),
        }));

      if (scoresToSave.length === 0) {
        throw new Error("No scores to save");
      }

      // Delete existing scores for players being updated
      const playerIds = scoresToSave.map(s => s.player_id);
      await supabase
        .from("round_scores")
        .delete()
        .eq("event_id", eventId)
        .in("player_id", playerIds);

      // Insert new scores
      const { error } = await supabase.from("round_scores").insert(scoresToSave);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_points", eventId] });
      queryClient.invalidateQueries({ queryKey: ["player_averages"] });
      queryClient.invalidateQueries({ queryKey: ["player-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["team-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["top_players_dashboard"] });
      toast.success("Scores saved successfully");
      setScores({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save scores");
    },
  });

  const handleScoreChange = (playerId: string, value: string) => {
    setScores((prev) => ({ ...prev, [playerId]: value }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-2 inline" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="h-4 w-4 ml-2 inline" /> : 
      <ArrowDown className="h-4 w-4 ml-2 inline" />;
  };

  const toggleSelectAll = () => {
    if (selectedPlayers.size === sortedAndFilteredPlayers?.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(sortedAndFilteredPlayers?.map(ep => ep.id) || []));
    }
  };

  const toggleSelectPlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const sortedAndFilteredPlayers = useMemo(() => {
    let filtered = eventPlayers?.filter((ep) => 
      statusFilter === "all" || ep.status === statusFilter
    ) || [];

    if (sortField === "name") {
      filtered = [...filtered].sort((a, b) => {
        const nameA = a.players.name.toLowerCase();
        const nameB = b.players.name.toLowerCase();
        return sortDirection === "asc" 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    } else if (sortField === "points") {
      filtered = [...filtered].sort((a, b) => {
        const pointsA = existingScores?.find(p => p.player_id === a.player_id)?.points || 0;
        const pointsB = existingScores?.find(p => p.player_id === b.player_id)?.points || 0;
        return sortDirection === "asc" 
          ? pointsA - pointsB
          : pointsB - pointsA;
      });
    }

    return filtered;
  }, [eventPlayers, statusFilter, sortField, sortDirection, existingScores]);

  const hasUnsavedScores = Object.keys(scores).length > 0;

  const playingCount = eventPlayers?.filter((ep) => ep.status === "playing").length || 0;

  return (
    <div className="space-y-4">
      {hasUnsavedScores && (
        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">
            You have unsaved score changes
          </span>
          <Button onClick={() => saveScoresMutation.mutate()} disabled={saveScoresMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveScoresMutation.isPending ? "Saving..." : "Save Scores"}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="playing">Playing</SelectItem>
              <SelectItem value="waitlist">Waitlist</SelectItem>
              <SelectItem value="not_playing">Not Playing</SelectItem>
            </SelectContent>
          </Select>

          <p className="text-sm text-muted">
            {playingCount} / {maxPlayers} players
          </p>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Bulk Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => bulkAddActiveMutation.mutate()}>
                <Users className="mr-2 h-4 w-4" />
                Add All Active Players
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkAddFromLastEventMutation.mutate()}>
                <History className="mr-2 h-4 w-4" />
                Add Players from Last Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkAddRsvpYesMutation.mutate()}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Add All RSVP Yes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Player to Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePlayers?.map((player) => (
                  <Button
                    key={player.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addPlayerMutation.mutate(player.id)}
                  >
                    {player.name}
                  </Button>
                ))}
                {availablePlayers?.length === 0 && (
                  <p className="text-center text-muted py-4">No available players</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedPlayers.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">
            {selectedPlayers.size} player{selectedPlayers.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateRsvpMutation.mutate("yes")}
            >
              Set RSVP: Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateRsvpMutation.mutate("no")}
            >
              Set RSVP: No
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateRsvpMutation.mutate(null)}
            >
              Set RSVP: No Response
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedPlayers(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedPlayers.size === sortedAndFilteredPlayers?.length && sortedAndFilteredPlayers?.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Name {getSortIcon("name")}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("points")}>
                Points {getSortIcon("points")}
              </TableHead>
              <TableHead>6-Rnd Avg</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredPlayers?.map((ep) => {
              const existingScore = existingScores?.find(p => p.player_id === ep.player_id)?.points;
              const average = playerAverages?.[ep.player_id] || 0;
              const isPlaying = ep.status === "playing";
              
              return (
                <TableRow key={ep.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPlayers.has(ep.id)}
                      onCheckedChange={() => toggleSelectPlayer(ep.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{ep.players.name}</TableCell>
                  <TableCell>
                    {isPlaying ? (
                      <Input
                        type="number"
                        step="0.5"
                        placeholder={existingScore?.toString() || "0"}
                        value={scores[ep.player_id] || ""}
                        onChange={(e) => handleScoreChange(ep.player_id, e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{average.toFixed(2)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ep.rsvp_status || "no_response"}
                      onValueChange={(value) =>
                        updateRsvpMutation.mutate({ 
                          id: ep.id, 
                          rsvp_status: value === "no_response" ? null : value 
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_response">No Response</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ep.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({ id: ep.id, status: value })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invited">Invited</SelectItem>
                        <SelectItem value="playing">Playing</SelectItem>
                        <SelectItem value="waitlist">Waitlist</SelectItem>
                        <SelectItem value="not_playing">Not Playing</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(ep.id, ep.players.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player from Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {playerToDelete?.name} from this event? This will also remove them from any assigned groups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};