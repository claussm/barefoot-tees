import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Search, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlayerPointsDialog } from "./PlayerPointsDialog";

type SortField = "name" | "average" | "roundsPlayed";
type SortOrder = "asc" | "desc";

interface PlayerStat {
  id: string;
  name: string;
  average: string;
  roundsPlayed: number;
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  lastScore?: number;
}

interface PlayerLeaderboardProps {
  playerStats: PlayerStat[];
  teams?: Array<{ id: string; name: string; color?: string }>;
  isLoading: boolean;
}

export function PlayerLeaderboard({ playerStats, teams, isLoading }: PlayerLeaderboardProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("average");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "average" ? "desc" : "asc");
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    let filtered = playerStats;

    if (searchQuery) {
      filtered = filtered.filter((player) =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (teamFilter !== "all") {
      filtered = filtered.filter((player) => player.teamId === teamFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      let compareA: number | string = a[sortField];
      let compareB: number | string = b[sortField];

      if (sortField === "average") {
        compareA = Number(a.average);
        compareB = Number(b.average);
      } else if (sortField === "name") {
        compareA = a.name.toLowerCase();
        compareB = b.name.toLowerCase();
      }

      if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
      if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [playerStats, searchQuery, teamFilter, sortField, sortOrder]);

  const handleViewPoints = (player: PlayerStat) => {
    setSelectedPlayer(player);
    setPointsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading player stats...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {teams && teams.length > 0 && (
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: team.color || "#3B82F6" }}
                    />
                    {team.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="hover:bg-muted/50 px-2"
                >
                  Player
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              {teams && teams.length > 0 && <TableHead>Team</TableHead>}
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("roundsPlayed")}
                  className="hover:bg-muted/50 px-2"
                >
                  Rounds
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("average")}
                  className="hover:bg-muted/50 px-2"
                >
                  Avg Points (6)
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={teams && teams.length > 0 ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No players found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedStats.map((player, index) => (
                <TableRow key={player.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell className="font-medium">#{index + 1}</TableCell>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  {teams && teams.length > 0 && (
                    <TableCell>
                      {player.teamName ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: player.teamColor || "#3B82F6" }}
                          />
                          <span className="text-sm">{player.teamName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{player.roundsPlayed}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {player.average}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPoints(player)}
                    >
                      <Trophy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedPlayer && (
        <PlayerPointsDialog
          player={selectedPlayer}
          open={pointsDialogOpen}
          onOpenChange={setPointsDialogOpen}
        />
      )}
    </div>
  );
}
