import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Check, X, Trophy } from "lucide-react";
import { format } from "date-fns";

interface PlayerPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: any;
}

export const PlayerPointsDialog = ({ open, onOpenChange, player }: PlayerPointsDialogProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");

  const { data: scores, isLoading } = useQuery({
    queryKey: ["player_scores", player?.id],
    queryFn: async () => {
      if (!player?.id) return [];
      const { data, error } = await supabase
        .from("round_scores")
        .select(`
          *,
          events (
            id,
            date,
            course_name
          )
        `)
        .eq("player_id", player.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!player?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, points, notes }: { id: string; points: number; notes: string }) => {
      const { error } = await supabase
        .from("round_scores")
        .update({ points, notes })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_scores", player.id] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      toast.success("Points updated successfully");
      setEditingId(null);
    },
    onError: (error) => {
      toast.error("Failed to update points");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("round_scores")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player_scores", player.id] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      toast.success("Score deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete score");
      console.error(error);
    },
  });

  const handleEdit = (score: any) => {
    setEditingId(score.id);
    setEditPoints(score.points);
    setEditNotes(score.notes || "");
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        points: editPoints,
        notes: editNotes,
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditPoints(0);
    setEditNotes("");
  };

  // Calculate 6-round average
  const recentScores = scores?.slice(0, 6) || [];
  const sixRoundAverage = recentScores.length > 0
    ? (recentScores.reduce((sum, s) => sum + Number(s.points), 0) / recentScores.length).toFixed(2)
    : "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {player?.name} - Points History
          </DialogTitle>
          <DialogDescription>
            View and edit all historical scores for this player.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-4 bg-sidebar rounded-lg border border-sidebar-primary">
          <div className="text-sm text-muted-foreground">6-Round Average</div>
          <div className="text-3xl font-bold text-primary">{sixRoundAverage}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Based on {recentScores.length} most recent rounds
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading scores...</div>
        ) : scores && scores.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score: any) => (
                <TableRow key={score.id}>
                  <TableCell className="font-medium">
                    {score.events ? format(new Date(score.events.date), "MMM d, yyyy") : "N/A"}
                  </TableCell>
                  <TableCell>{score.events?.course_name || "N/A"}</TableCell>
                  <TableCell>
                    {editingId === score.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={editPoints}
                        onChange={(e) => setEditPoints(parseFloat(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      <span className="font-semibold text-primary">{score.points}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === score.id ? (
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        className="min-w-[200px]"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{score.notes || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === score.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSave}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(score)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No scores recorded for this player yet.
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
