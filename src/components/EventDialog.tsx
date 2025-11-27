import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
}

export const EventDialog = ({ open, onOpenChange, event }: EventDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: event || {
      holes: 18,
      slots_per_group: 4,
      max_players: 40,
      tee_interval_minutes: 10,
    },
  });

  const holes = watch("holes");
  const courseId = watch("course_id");

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (event) {
      reset(event);
    }
  }, [event, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Get course name for backward compatibility
      const selectedCourse = courses?.find(c => c.id === data.course_id);
      const eventData = {
        ...data,
        course_name: selectedCourse?.name || data.course_name,
      };

      if (event) {
        const { error } = await supabase.from("events").update(eventData).eq("id", event.id);
        if (error) throw error;
      } else {
        // Create event
        const { data: newEvent, error: eventError } = await supabase
          .from("events")
          .insert(eventData)
          .select()
          .single();

        if (eventError) throw eventError;

        // Auto-generate groups
        const groups = [];
        const numGroups = Math.ceil(data.max_players / data.slots_per_group);
        const [hours, minutes] = data.first_tee_time.split(":").map(Number);
        
        for (let i = 0; i < numGroups; i++) {
          const totalMinutes = hours * 60 + minutes + i * data.tee_interval_minutes;
          const teeHours = Math.floor(totalMinutes / 60);
          const teeMinutes = totalMinutes % 60;
          const teeTime = `${String(teeHours).padStart(2, "0")}:${String(teeMinutes).padStart(2, "0")}:00`;

          groups.push({
            event_id: newEvent.id,
            tee_time: teeTime,
            group_index: i + 1,
          });
        }

        const { error: groupsError } = await supabase.from("groups").insert(groups);
        if (groupsError) throw groupsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
      reset();
    },
  });

  const onSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="course_id">Course *</Label>
            <Select
              value={courseId}
              onValueChange={(value) => setValue("course_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!courses || courses.length === 0) && (
              <p className="text-sm text-muted-foreground mt-1">
                No courses available. Add courses in the Courses page first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date", { required: true })} />
            </div>

            <div>
              <Label htmlFor="first_tee_time">First Tee Time *</Label>
              <Input id="first_tee_time" type="time" {...register("first_tee_time", { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="holes">Holes *</Label>
              <Select
                value={String(holes)}
                onValueChange={(value) => setValue("holes", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9 holes</SelectItem>
                  <SelectItem value="18">18 holes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tee_interval_minutes">Tee Interval (min) *</Label>
              <Input
                id="tee_interval_minutes"
                type="number"
                {...register("tee_interval_minutes", { required: true, valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slots_per_group">Slots per Group *</Label>
              <Input
                id="slots_per_group"
                type="number"
                min="2"
                max="4"
                {...register("slots_per_group", { required: true, valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="max_players">Max Players *</Label>
              <Input
                id="max_players"
                type="number"
                {...register("max_players", { required: true, valueAsNumber: true })}
              />
            </div>
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
              {event ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};