import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, RefreshCw, Trophy, Mail } from "lucide-react";
import { PlayerPointsDialog } from "./PlayerPointsDialog";

interface PlayersTableProps {
  players: any[];
  isLoading: boolean;
  onEdit: (player: any) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}

export const PlayersTable = ({ players, isLoading, onEdit, onDeactivate, onReactivate }: PlayersTableProps) => {
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  const handleViewPoints = (player: any) => {
    setSelectedPlayer(player);
    setPointsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted">Loading players...</div>;
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-lg">No players found</p>
        <p className="text-sm mt-2">Add your first player to get started</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tee Box</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>
                {player.email ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{player.email}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                {player.tee_boxes ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded shadow-md"
                      style={{ backgroundColor: player.tee_boxes.color || "#ccc" }}
                    />
                    <span className="text-sm">{player.tee_boxes.name}</span>
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                <span className={player.is_active ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                  {player.is_active ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleViewPoints(player)}
                    title="View Points"
                  >
                    <Trophy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(player)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                   {player.is_active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeactivate(player)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReactivate(player.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PlayerPointsDialog
        open={pointsDialogOpen}
        onOpenChange={setPointsDialogOpen}
        player={selectedPlayer}
      />
    </div>
  );
};