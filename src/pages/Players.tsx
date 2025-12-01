import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search } from "lucide-react";
import { PlayerDialog } from "@/components/PlayerDialog";
import { PlayersTable } from "@/components/PlayersTable";
import { toast } from "sonner";
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
const Players = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [playerToDeactivate, setPlayerToDeactivate] = useState<any>(null);
  const queryClient = useQueryClient();

  const headerImage = useMemo(() => {
    return courseImages[Math.floor(Math.random() * courseImages.length)];
  }, []);
  const {
    data: players,
    isLoading
  } = useQuery({
    queryKey: ["players", showActiveOnly],
    queryFn: async () => {
      let query = supabase.from("players").select(`
          *,
          tee_boxes (*)
        `).order("name");
      if (showActiveOnly) {
        query = query.eq("is_active", true);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return data;
    }
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.from("players").update({
        is_active: false
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["players"]
      });
      toast.success("Player deactivated successfully");
      setShowDeactivateDialog(false);
      setPlayerToDeactivate(null);
    }
  });
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.from("players").update({
        is_active: true
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["players"]
      });
      toast.success("Player reactivated successfully");
    }
  });
  const handleDeactivateClick = (player: any) => {
    setPlayerToDeactivate(player);
    setShowDeactivateDialog(true);
  };
  const handleConfirmDeactivate = () => {
    if (playerToDeactivate) {
      deleteMutation.mutate(playerToDeactivate.id);
    }
  };
  const handleCancelDeactivate = () => {
    setShowDeactivateDialog(false);
    setPlayerToDeactivate(null);
  };
  const filteredPlayers = players?.filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
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
              Players
            </h1>
            <p className="text-lg text-primary-foreground/90 drop-shadow-md">
              Manage your league roster
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search players..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowActiveOnly(!showActiveOnly)} className="bg-sidebar text-muted-foreground border-sidebar-primary">
              {showActiveOnly ? "Active Only" : "All"}
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

        <PlayersTable players={filteredPlayers || []} isLoading={isLoading} onEdit={player => {
      setEditingPlayer(player);
      setDialogOpen(true);
    }} onDeactivate={handleDeactivateClick} onReactivate={id => reactivateMutation.mutate(id)} />

      <PlayerDialog open={dialogOpen} onOpenChange={setDialogOpen} player={editingPlayer} />

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Player?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {playerToDeactivate?.name}? This player will no longer appear in the active players list, but their data and history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeactivate}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </main>
    </div>
  );
};
export default Players;