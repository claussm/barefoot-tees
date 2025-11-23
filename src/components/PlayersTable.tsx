import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";

interface PlayersTableProps {
  players: any[];
  isLoading: boolean;
  onEdit: (player: any) => void;
  onDeactivate: (id: string) => void;
}

export const PlayersTable = ({ players, isLoading, onEdit, onDeactivate }: PlayersTableProps) => {
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
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Handicap</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>{player.phone || "-"}</TableCell>
              <TableCell>{player.email || "-"}</TableCell>
              <TableCell>{player.handicap || "-"}</TableCell>
              <TableCell>
                <span className={player.is_active ? "text-primary" : "text-muted"}>
                  {player.is_active ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(player)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {player.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeactivate(player.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};