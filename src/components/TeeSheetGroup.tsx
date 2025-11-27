import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface TeeSheetGroupProps {
  group: any;
  isLocked: boolean;
  slotsPerGroup: number;
  onRemovePlayer: (playerId: string) => void;
}

export const TeeSheetGroup = ({ group, isLocked, slotsPerGroup, onRemovePlayer }: TeeSheetGroupProps) => {
  const slots = Array.from({ length: slotsPerGroup }, (_, i) => i + 1);
  const queryClient = useQueryClient();
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedTime, setEditedTime] = useState(group.tee_time.substring(0, 5));

  const updateTeeTimeMutation = useMutation({
    mutationFn: async (newTime: string) => {
      const { error } = await supabase
        .from("groups")
        .update({ tee_time: newTime })
        .eq("id", group.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Tee time updated");
      setIsEditingTime(false);
    },
    onError: () => {
      toast.error("Failed to update tee time");
      setEditedTime(group.tee_time.substring(0, 5));
    },
  });

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTime(e.target.value);
  };

  const handleTimeBlur = () => {
    if (editedTime !== group.tee_time.substring(0, 5)) {
      updateTeeTimeMutation.mutate(editedTime);
    } else {
      setIsEditingTime(false);
    }
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTimeBlur();
    } else if (e.key === "Escape") {
      setEditedTime(group.tee_time.substring(0, 5));
      setIsEditingTime(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground">Group {group.group_index}</h3>
        {isEditingTime && !isLocked ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="time"
              value={editedTime}
              onChange={handleTimeChange}
              onBlur={handleTimeBlur}
              onKeyDown={handleTimeKeyDown}
              className="h-7 w-28 text-sm"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">{group.tee_time.substring(0, 5)}</p>
            {!isLocked && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 print:hidden"
                onClick={() => setIsEditingTime(true)}
              >
                <Clock className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {slots.map((position) => {
          const assignment = group.group_assignments?.find((a: any) => a.position === position);
          
          return (
            <TeeSheetSlot
              key={`${group.id}-${position}`}
              groupId={group.id}
              position={position}
              assignment={assignment}
              isLocked={isLocked}
              onRemove={onRemovePlayer}
            />
          );
        })}
      </div>
    </div>
  );
};

interface TeeSheetSlotProps {
  groupId: string;
  position: number;
  assignment?: any;
  isLocked: boolean;
  onRemove: (playerId: string) => void;
}

const TeeSheetSlot = ({ groupId, position, assignment, isLocked, onRemove }: TeeSheetSlotProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: assignment ? assignment.player_id : `slot-${groupId}-${position}`,
    disabled: isLocked || !assignment,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`slot-${groupId}-${position}`}
      className={`
        min-h-[2.5rem] px-3 py-2 rounded border
        ${assignment ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-dashed border-border"}
        ${!isLocked && assignment ? "cursor-move" : ""}
        flex items-center justify-between
      `}
      {...attributes}
      {...listeners}
    >
      {assignment ? (
        <>
          <span className="text-sm font-medium text-foreground">
            {assignment.players?.name}
          </span>
          {!isLocked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 print:hidden"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(assignment.player_id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </>
      ) : (
        <span className="text-sm text-muted">Empty</span>
      )}
    </div>
  );
};