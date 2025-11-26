import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { PlayerDialog } from "@/components/PlayerDialog";
import { PlayersTable } from "@/components/PlayersTable";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";

const Players = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: players, isLoading } = useQuery({
    queryKey: ["players", showActiveOnly],
    queryFn: async () => {
      let query = supabase
        .from("players")
        .select(`
          *,
          tee_boxes (*),
          player_teams!players_default_team_id_fkey (*)
        `)
        .order("name");
      
      if (showActiveOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("players").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player deactivated successfully");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("players").update({ is_active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player reactivated successfully");
    },
  });

  const filteredPlayers = players?.filter((player) =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={showActiveOnly ? "default" : "outline"}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              {showActiveOnly ? "Active Only" : "Show All"}
            </Button>
            <Button onClick={() => {
              setEditingPlayer(null);
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </div>
        </div>

        <PlayersTable
          players={filteredPlayers || []}
          isLoading={isLoading}
          onEdit={(player) => {
            setEditingPlayer(player);
            setDialogOpen(true);
          }}
          onDeactivate={(id) => deleteMutation.mutate(id)}
          onReactivate={(id) => reactivateMutation.mutate(id)}
        />

      <PlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={editingPlayer}
      />
    </div>
  );
};

export default Players;