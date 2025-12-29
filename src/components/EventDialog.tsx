import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const eventSchema = z.object({
  course_id: z.string().min(1, "Course is required"),
  course_name: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  first_tee_time: z.string().min(1, "First tee time is required"),
  holes: z.number().min(9).max(18),
  slots_per_group: z.number().min(2, "Minimum 2 slots per group").max(4, "Maximum 4 slots per group"),
  max_players: z.number().min(4, "Minimum 4 players").max(100, "Maximum 100 players"),
  tee_interval_minutes: z.number().optional(),
  notes: z.string().trim().max(500, "Notes must be less than 500 characters").optional().or(z.literal("")),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
}

export const EventDialog = ({ open, onOpenChange, event }: EventDialogProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      course_id: "",
      date: "",
      first_tee_time: "",
      holes: 18,
      slots_per_group: 4,
      max_players: 40,
      tee_interval_minutes: 8,
      notes: "",
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
      reset({
        course_id: event.course_id || "",
        date: event.date || "",
        first_tee_time: event.first_tee_time?.slice(0, 5) || "",
        holes: event.holes || 18,
        slots_per_group: event.slots_per_group || 4,
        max_players: event.max_players || 40,
        tee_interval_minutes: event.tee_interval_minutes || 8,
        notes: event.notes || "",
      });
    } else {
      reset({
        course_id: "",
        date: "",
        first_tee_time: "",
        holes: 18,
        slots_per_group: 4,
        max_players: 40,
        tee_interval_minutes: 8,
        notes: "",
      });
    }
  }, [event, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Get course name for backward compatibility
      const selectedCourse = courses?.find(c => c.id === data.course_id);
      const eventData = {
        course_id: data.course_id,
        course_name: selectedCourse?.name || "",
        date: data.date,
        first_tee_time: data.first_tee_time,
        holes: data.holes,
        slots_per_group: data.slots_per_group,
        max_players: data.max_players,
        tee_interval_minutes: data.tee_interval_minutes || 8,
        notes: data.notes || null,
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
          const totalMinutes = hours * 60 + minutes + i * 8;
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

        // Auto-import all active players with "invited" status
        const { data: activePlayers, error: playersError } = await supabase
          .from("players")
          .select("id")
          .eq("is_active", true);
        
        if (playersError) throw playersError;

        if (activePlayers && activePlayers.length > 0) {
          const eventPlayers = activePlayers.map(player => ({
            event_id: newEvent.id,
            player_id: player.id,
            status: "invited",
          }));

          const { error: eventPlayersError } = await supabase
            .from("event_players")
            .insert(eventPlayers);
          
          if (eventPlayersError) throw eventPlayersError;
        }
      }
    },
    onSuccess: () => {
      // Invalidate all event-related queries for immediate UI updates across all pages
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["all_events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming_events_dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["scorer-events"] });
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
    },
  });

  const onSubmit = (data: EventFormData) => {
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
            {errors.course_id && <p className="text-sm text-destructive mt-1">{errors.course_id.message}</p>}
            {(!courses || courses.length === 0) && (
              <p className="text-sm text-muted-foreground mt-1">
                No courses available. Add courses in the Courses page first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="first_tee_time">First Tee Time *</Label>
              <Input id="first_tee_time" type="time" {...register("first_tee_time")} />
              {errors.first_tee_time && <p className="text-sm text-destructive mt-1">{errors.first_tee_time.message}</p>}
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slots_per_group">Slots per Group *</Label>
              <Input
                id="slots_per_group"
                type="number"
                min="2"
                max="4"
                {...register("slots_per_group", { valueAsNumber: true })}
              />
              {errors.slots_per_group && <p className="text-sm text-destructive mt-1">{errors.slots_per_group.message}</p>}
            </div>

            <div>
              <Label htmlFor="max_players">Max Players *</Label>
              <Input
                id="max_players"
                type="number"
                {...register("max_players", { valueAsNumber: true })}
              />
              {errors.max_players && <p className="text-sm text-destructive mt-1">{errors.max_players.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
            {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>}
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
