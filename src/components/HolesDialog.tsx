import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: any;
}

export function HolesDialog({ open, onOpenChange, course }: HolesDialogProps) {
  const queryClient = useQueryClient();
  const [holes, setHoles] = useState<any[]>([]);

  const { data: existingHoles } = useQuery({
    queryKey: ["course_holes", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_holes")
        .select("*")
        .eq("course_id", course.id)
        .order("hole_number");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (existingHoles && existingHoles.length > 0) {
      setHoles(existingHoles);
    } else {
      // Initialize with 18 holes
      const defaultHoles = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
        par: 4,
        handicap_index: null,
        is_ctp_hole: false,
      }));
      setHoles(defaultHoles);
    }
  }, [existingHoles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing holes
      await supabase.from("course_holes").delete().eq("course_id", course.id);

      // Insert new holes
      const holesData = holes.map((hole) => ({
        course_id: course.id,
        hole_number: hole.hole_number,
        par: parseInt(hole.par),
        handicap_index: hole.handicap_index ? parseInt(hole.handicap_index) : null,
        is_ctp_hole: hole.is_ctp_hole,
      }));

      const { error } = await supabase.from("course_holes").insert(holesData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course_holes", course.id] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Holes saved successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateHole = (index: number, field: string, value: any) => {
    const newHoles = [...holes];
    newHoles[index] = { ...newHoles[index], [field]: value };
    setHoles(newHoles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Holes - {course.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure each hole's par, handicap index, and mark par 3s for "Closest to Pin" bets
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Hole</TableHead>
                <TableHead className="w-24">Par</TableHead>
                <TableHead className="w-32">Handicap Index</TableHead>
                <TableHead>CTP Eligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holes.map((hole, index) => (
                <TableRow key={hole.hole_number}>
                  <TableCell className="font-semibold">{hole.hole_number}</TableCell>
                  <TableCell>
                    <Select
                      value={hole.par?.toString()}
                      onValueChange={(value) => updateHole(index, "par", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="18"
                      value={hole.handicap_index || ""}
                      onChange={(e) => updateHole(index, "handicap_index", e.target.value)}
                      placeholder="-"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={hole.is_ctp_hole}
                      onCheckedChange={(checked) => updateHole(index, "is_ctp_hole", checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save All Holes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
