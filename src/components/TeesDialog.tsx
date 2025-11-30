import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: any;
}

export function TeesDialog({ open, onOpenChange, course }: TeesDialogProps) {
  const queryClient = useQueryClient();
  const [editingTeeId, setEditingTeeId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ id: string; data: any } | null>(null);
  const [editValues, setEditValues] = useState({
    total_yardage: "",
    slope_rating: "",
    course_rating: "",
  });

  const { data: tees, refetch } = useQuery({
    queryKey: ["course_tees", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_tees")
        .select("*")
        .eq("course_id", course.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Auto-create standard tees if none exist
  useEffect(() => {
    if (open && tees && tees.length === 0) {
      const createStandardTees = async () => {
        const standardTees = [
          { name: "Platinum", color: "#E5E7EB", sort_order: 0 },
          { name: "Black", color: "#000000", sort_order: 1 },
          { name: "White", color: "#FFFFFF", sort_order: 2 },
          { name: "Green", color: "#22C55E", sort_order: 3 },
          { name: "Gold", color: "#EAB308", sort_order: 4 },
        ];

        const teesToInsert = standardTees.map(tee => ({
          ...tee,
          course_id: course.id,
        }));

        const { error } = await supabase.from("course_tees").insert(teesToInsert);
        if (!error) {
          refetch();
          toast.success("Standard tees created");
        }
      };
      createStandardTees();
    }
  }, [open, tees, course.id, refetch]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const payload = {
        total_yardage: data.total_yardage ? parseInt(data.total_yardage) : null,
        slope_rating: data.slope_rating ? parseFloat(data.slope_rating) : null,
        course_rating: data.course_rating ? parseFloat(data.course_rating) : null,
      };

      const { error } = await supabase
        .from("course_tees")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_tees", course.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Tee updated");
      setEditingTeeId(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const startEdit = (tee: any) => {
    setEditingTeeId(tee.id);
    setEditValues({
      total_yardage: tee.total_yardage?.toString() || "",
      slope_rating: tee.slope_rating?.toString() || "",
      course_rating: tee.course_rating?.toString() || "",
    });
  };

  const cancelEdit = () => {
    setEditingTeeId(null);
    setEditValues({
      total_yardage: "",
      slope_rating: "",
      course_rating: "",
    });
  };

  const saveEdit = (teeId: string) => {
    setPendingSave({ id: teeId, data: editValues });
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (pendingSave) {
      updateMutation.mutate(pendingSave);
    }
    setShowConfirmation(false);
    setPendingSave(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Tees - {course.name}</DialogTitle>
          </DialogHeader>

          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Click on a value to edit yardage, slope rating, or course rating
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tee</TableHead>
                  <TableHead>Yardage</TableHead>
                  <TableHead>Slope Rating</TableHead>
                  <TableHead>Course Rating</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tees?.map((tee) => {
                  const isEditing = editingTeeId === tee.id;
                  return (
                    <TableRow key={tee.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tee.color && (
                            <div
                              className="w-4 h-4 rounded-full border shadow-md"
                              style={{ backgroundColor: tee.color }}
                            />
                          )}
                          <span className="font-medium">{tee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.total_yardage}
                            onChange={(e) => setEditValues({ ...editValues, total_yardage: e.target.value })}
                            className="w-24"
                            placeholder="6500"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(tee)}
                            className="text-left hover:underline"
                          >
                            {tee.total_yardage || "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.slope_rating}
                            onChange={(e) => setEditValues({ ...editValues, slope_rating: e.target.value })}
                            className="w-24"
                            placeholder="125.5"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(tee)}
                            className="text-left hover:underline"
                          >
                            {tee.slope_rating || "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValues.course_rating}
                            onChange={(e) => setEditValues({ ...editValues, course_rating: e.target.value })}
                            className="w-24"
                            placeholder="72.5"
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(tee)}
                            className="text-left hover:underline"
                          >
                            {tee.course_rating || "-"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveEdit(tee.id)}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!tees || tees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Creating standard tees...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Tee Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these tee changes? This will update the course tee data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
