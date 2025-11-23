import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface EventPlayersListProps {
  eventId: string;
  maxPlayers: number;
}

export const EventPlayersList = ({ eventId, maxPlayers }: EventPlayersListProps) => {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const filteredPlayers = eventPlayers?.filter((ep) => 
    statusFilter === "all" || ep.status === statusFilter
  );

  const playingCount = eventPlayers?.filter((ep) => ep.status === "playing").length || 0;

  return (
    <div className="space-y-4">
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

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Handicap</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers?.map((ep) => (
              <TableRow key={ep.id}>
                <TableCell className="font-medium">{ep.players.name}</TableCell>
                <TableCell>{ep.players.phone || "-"}</TableCell>
                <TableCell>{ep.players.handicap || "-"}</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};