import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: any;
}

export const PlayerDialog = ({ open, onOpenChange, player }: PlayerDialogProps) => {
  const queryClient = useQueryClient();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  
  const { register, handleSubmit, reset, setValue, watch, control } = useForm({
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
      // Remove joined relation data that aren't actual columns
      const { tee_boxes, player_teams, ...playerData } = data;
      console.log('Saving to database:', playerData);
      
      if (player) {
        const { error } = await supabase
          .from("players")
          .update(playerData)
          .eq("id", player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("players").insert(playerData);
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
    console.log('Form submitted with data:', data);
    console.log('Original player:', player);
    
    // Check if deactivating an active player
    if (player && player.is_active && data.is_active === false) {
      setPendingFormData(data);
      setShowDeactivateDialog(true);
      return;
    }
    saveMutation.mutate(data);
  };

  const handleConfirmDeactivate = () => {
    if (pendingFormData) {
      saveMutation.mutate(pendingFormData);
      setShowDeactivateDialog(false);
      setPendingFormData(null);
    }
  };

  const handleCancelDeactivate = () => {
    setShowDeactivateDialog(false);
    setPendingFormData(null);
  };

  return (
    <>
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

            {player && (
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active" className="cursor-pointer">Active Status</Label>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="is_active"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}

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

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Player?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {player?.name}? This player will no longer appear in the active players list, but their data and history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeactivate}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};