import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: any;
}

export function TeesDialog({ open, onOpenChange, course }: TeesDialogProps) {
  const queryClient = useQueryClient();
  const [editingTee, setEditingTee] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "",
    total_yardage: "",
    slope_rating: "",
    course_rating: "",
    sort_order: "",
  });

  const { data: tees } = useQuery({
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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        course_id: course.id,
        total_yardage: data.total_yardage ? parseInt(data.total_yardage) : null,
        slope_rating: data.slope_rating ? parseFloat(data.slope_rating) : null,
        course_rating: data.course_rating ? parseFloat(data.course_rating) : null,
        sort_order: data.sort_order ? parseInt(data.sort_order) : 0,
      };

      if (editingTee) {
        const { error } = await supabase
          .from("course_tees")
          .update(payload)
          .eq("id", editingTee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("course_tees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_tees", course.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(editingTee ? "Tee updated" : "Tee added");
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (teeId: string) => {
      const { error } = await supabase.from("course_tees").delete().eq("id", teeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_tees", course.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Tee deleted");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setEditingTee(null);
    setFormData({
      name: "",
      color: "",
      total_yardage: "",
      slope_rating: "",
      course_rating: "",
      sort_order: "",
    });
  };

  const handleEdit = (tee: any) => {
    setEditingTee(tee);
    setFormData({
      name: tee.name || "",
      color: tee.color || "",
      total_yardage: tee.total_yardage?.toString() || "",
      slope_rating: tee.slope_rating?.toString() || "",
      course_rating: tee.course_rating?.toString() || "",
      sort_order: tee.sort_order?.toString() || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Tee name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tees - {course.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 border-b pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tee-name">Tee Name *</Label>
              <Input
                id="tee-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Black, Gold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yardage">Yardage</Label>
              <Input
                id="yardage"
                type="number"
                value={formData.total_yardage}
                onChange={(e) => setFormData({ ...formData, total_yardage: e.target.value })}
                placeholder="6500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slope">Slope Rating</Label>
              <Input
                id="slope"
                type="number"
                step="0.1"
                value={formData.slope_rating}
                onChange={(e) => setFormData({ ...formData, slope_rating: e.target.value })}
                placeholder="125.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Course Rating</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                value={formData.course_rating}
                onChange={(e) => setFormData({ ...formData, course_rating: e.target.value })}
                placeholder="72.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort">Sort Order</Label>
              <Input
                id="sort"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {editingTee ? "Update Tee" : "Add Tee"}
            </Button>
            {editingTee && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>
        </form>

        <div>
          <h3 className="font-semibold mb-4">Existing Tees</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Yardage</TableHead>
                <TableHead>Slope</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tees?.map((tee) => (
                <TableRow key={tee.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tee.color && (
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: tee.color }}
                        />
                      )}
                      {tee.name}
                    </div>
                  </TableCell>
                  <TableCell>{tee.total_yardage || "-"}</TableCell>
                  <TableCell>{tee.slope_rating || "-"}</TableCell>
                  <TableCell>{tee.course_rating || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tee)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(tee.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!tees || tees.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No tees added yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
