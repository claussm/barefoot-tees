import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: any;
}

export const PlayerDialog = ({ open, onOpenChange, player }: PlayerDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: player || {},
  });

  useEffect(() => {
    if (open) {
      reset(player || {});
    }
  }, [open, player, reset]);

  const { data: teeBoxes } = useQuery({
    queryKey: ["tee_boxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tee_boxes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_teams")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (player) {
        const { error } = await supabase
          .from("players")
          .update(data)
          .eq("id", player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("players").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(player ? "Player updated" : "Player added");
      onOpenChange(false);
      reset();
    },
  });

  const onSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{player ? "Edit Player" : "Add Player"}</DialogTitle>
          <DialogDescription>
            {player ? "Update player information below." : "Fill in the details to add a new player."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>

          <div>
            <Label htmlFor="handicap">Handicap</Label>
            <Input
              id="handicap"
              type="number"
              step="0.1"
              {...register("handicap")}
            />
          </div>

          <div>
            <Label htmlFor="tee_box_id">Tee Box</Label>
            <Select
              value={watch("tee_box_id") || "none"}
              onValueChange={(value) => setValue("tee_box_id", value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tee box" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teeBoxes?.map((teeBox) => (
                  <SelectItem key={teeBox.id} value={teeBox.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: teeBox.color || "#ccc" }}
                      />
                      {teeBox.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="default_team_id">Default Team</Label>
            <Select
              value={watch("default_team_id") || "none"}
              onValueChange={(value) => setValue("default_team_id", value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: team.color || "#3B82F6" }}
                      />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {player ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};