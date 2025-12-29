import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const playerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  tee_box_id: z.string().nullable().optional(),
  notes: z.string().trim().max(500, "Notes must be less than 500 characters").optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

type PlayerFormData = z.infer<typeof playerSchema>;

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: any;
}

export const PlayerDialog = ({ open, onOpenChange, player }: PlayerDialogProps) => {
  const queryClient = useQueryClient();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PlayerFormData | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      tee_box_id: null,
      notes: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (player) {
        reset({
          name: player.name || "",
          email: player.email || "",
          phone: player.phone || "",
          tee_box_id: player.tee_box_id || null,
          notes: player.notes || "",
          is_active: player.is_active ?? true,
        });
      } else {
        reset({
          name: "",
          email: "",
          phone: "",
          tee_box_id: null,
          notes: "",
          is_active: true,
        });
      }
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

  const saveMutation = useMutation({
    mutationFn: async (data: PlayerFormData) => {
      const playerData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        tee_box_id: data.tee_box_id || null,
        notes: data.notes || null,
        is_active: data.is_active ?? true,
      };
      
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
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (data: PlayerFormData) => {
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
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="player@example.com"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(843) 555-1234"
                {...register("phone")}
              />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
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
                          className="w-3 h-3 rounded shadow-md"
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} />
              {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
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