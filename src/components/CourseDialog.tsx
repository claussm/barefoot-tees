import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: any;
}

export function CourseDialog({ open, onOpenChange, course }: CourseDialogProps) {
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (course) {
      reset({
        name: course.name || "",
        notes: course.notes || "",
      });
    } else {
      reset({
        name: "",
        notes: "",
      });
    }
  }, [course, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (course) {
        const { error } = await supabase
          .from("courses")
          .update(data)
          .eq("id", course.id);
        if (error) throw error;
      } else {
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert(data)
          .select()
          .single();
        if (error) throw error;

        // Auto-create standard tees for new course
        if (newCourse) {
          const standardTees = [
            { name: "Platinum", color: "#E5E7EB", sort_order: 0 },
            { name: "Black", color: "#000000", sort_order: 1 },
            { name: "White", color: "#FFFFFF", sort_order: 2 },
            { name: "Green", color: "#22C55E", sort_order: 3 },
            { name: "Gold", color: "#EAB308", sort_order: 4 },
          ];

          const teesToInsert = standardTees.map(tee => ({
            ...tee,
            course_id: newCourse.id,
          }));

          const { error: teesError } = await supabase
            .from("course_tees")
            .insert(teesToInsert);
          if (teesError) throw teesError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(course ? "Course updated" : "Course created");
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: any) => {
    setPendingData(data);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (pendingData) {
      saveMutation.mutate(pendingData);
    }
    setShowConfirmation(false);
    setPendingData(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{course ? "Edit Course" : "Add Course"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              {...register("name", { required: true })}
              placeholder="e.g., Norman Golf Club"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any additional information about the course..."
              rows={3}
            />
          </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {course ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {course ? "update" : "create"} this course? This action will modify the course database.
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
