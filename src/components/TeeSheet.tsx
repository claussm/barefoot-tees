import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, useDraggable } from "@dnd-kit/core";
import { TeeSheetGroup } from "./TeeSheetGroup";
import { toast } from "sonner";

interface TeeSheetProps {
  eventId: string;
  groups: any[];
  isLocked: boolean;
  slotsPerGroup: number;
}

export const TeeSheet = ({ eventId, groups, isLocked, slotsPerGroup }: TeeSheetProps) => {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));

  const { data: unassignedPlayers } = useQuery({
    queryKey: ["unassigned_players", eventId],
    queryFn: async () => {
      const { data: playingPlayers, error } = await supabase
        .from("event_players")
        .select("*, players(*)")
        .eq("event_id", eventId)
        .eq("status", "playing");

      if (error) throw error;

      const assignedIds = new Set();
      groups.forEach((group) => {
        group.group_assignments?.forEach((assignment: any) => {
          assignedIds.add(assignment.player_id);
        });
      });

      return playingPlayers.filter((ep) => !assignedIds.has(ep.player_id));
    },
  });

  const movePlayerMutation = useMutation({
    mutationFn: async ({
      playerId,
      targetGroupId,
      targetPosition,
    }: {
      playerId: string;
      targetGroupId: string;
      targetPosition: number;
    }) => {
      // Get the player's current assignment (if any)
      const { data: currentAssignment } = await supabase
        .from("group_assignments")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle();

      // Check if target position is occupied
      const { data: targetAssignment } = await supabase
        .from("group_assignments")
        .select("*")
        .eq("group_id", targetGroupId)
        .eq("position", targetPosition)
        .maybeSingle();

      // If target is occupied, perform a swap
      if (targetAssignment) {
        // Remove both players from their current positions
        await supabase.from("group_assignments").delete().eq("player_id", playerId);
        await supabase.from("group_assignments").delete().eq("id", targetAssignment.id);

        // Place dragged player in target position
        await supabase.from("group_assignments").insert({
          group_id: targetGroupId,
          player_id: playerId,
          position: targetPosition,
        });

        // Place target player in dragged player's old position (if they had one)
        if (currentAssignment) {
          await supabase.from("group_assignments").insert({
            group_id: currentAssignment.group_id,
            player_id: targetAssignment.player_id,
            position: currentAssignment.position,
          });
        }
        // Otherwise, target player becomes unassigned
      } else {
        // Target slot is empty, just move the player
        if (currentAssignment) {
          await supabase.from("group_assignments").delete().eq("player_id", playerId);
        }

        const { error } = await supabase.from("group_assignments").insert({
          group_id: targetGroupId,
          player_id: playerId,
          position: targetPosition,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", eventId] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_players", eventId] });
      toast.success("Players updated");
    },
    onError: (error) => {
      console.error("Move error:", error);
      toast.error("Failed to move player");
    },
  });

  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase
        .from("group_assignments")
        .delete()
        .eq("player_id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", eventId] });
      queryClient.invalidateQueries({ queryKey: ["unassigned_players", eventId] });
      toast.success("Player removed from group");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || isLocked) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Parse slot ID format: "slot-{uuid-with-dashes}-{position}"
    // We need to handle UUIDs which contain dashes
    if (!overId.startsWith("slot-")) return;
    
    const withoutPrefix = overId.substring(5); // Remove "slot-"
    const lastDashIndex = withoutPrefix.lastIndexOf("-");
    
    if (lastDashIndex === -1) return;
    
    const targetGroupId = withoutPrefix.substring(0, lastDashIndex);
    const targetPosition = parseInt(withoutPrefix.substring(lastDashIndex + 1));

    movePlayerMutation.mutate({
      playerId: activeId,
      targetGroupId,
      targetPosition,
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {!isLocked && unassignedPlayers && unassignedPlayers.length > 0 && (
          <div className="border border-border rounded-lg p-4 bg-accent/20 print:hidden">
            <h3 className="font-semibold mb-3 text-foreground">Unassigned Players</h3>
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map((ep) => (
                <UnassignedPlayer 
                  key={ep.player_id} 
                  playerId={ep.player_id}
                  playerName={ep.players.name}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <TeeSheetGroup
              key={group.id}
              group={group}
              isLocked={isLocked}
              slotsPerGroup={slotsPerGroup}
              onRemovePlayer={removePlayerMutation.mutate}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
};

interface UnassignedPlayerProps {
  playerId: string;
  playerName: string;
}

const UnassignedPlayer = ({ playerId, playerName }: UnassignedPlayerProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: playerId,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "move",
    transition: isDragging ? "none" : "all 0.2s ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-3 py-1 bg-card border border-border rounded text-sm text-foreground hover:border-primary hover:shadow-sm hover:scale-105 transition-all duration-200"
      {...attributes}
      {...listeners}
    >
      {playerName}
    </div>
  );
};