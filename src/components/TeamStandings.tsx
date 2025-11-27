import { useState, useMemo } from "react";
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SortField = "name" | "average" | "memberCount";
type SortOrder = "asc" | "desc";

interface TeamMember {
  name: string;
  average: string;
}

interface TeamStat {
  id: string;
  name: string;
  color?: string;
  average: string;
  memberCount: number;
  members?: TeamMember[];
}

interface TeamStandingsProps {
  teamStats: TeamStat[];
  isLoading: boolean;
}

export function TeamStandings({ teamStats, isLoading }: TeamStandingsProps) {
  const [sortField, setSortField] = useState<SortField>("average");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "average" ? "desc" : "asc");
    }
  };

  const sortedStats = useMemo(() => {
    return [...teamStats].sort((a, b) => {
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
  }, [teamStats, sortField, sortOrder]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading team stats...</div>;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("name")}
                className="hover:bg-muted/50 px-2"
              >
                Team
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("memberCount")}
                className="hover:bg-muted/50 px-2"
              >
                Members
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => handleSort("average")}
                className="hover:bg-muted/50 px-2"
              >
                Team Avg
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No teams found
              </TableCell>
            </TableRow>
          ) : (
            sortedStats.map((team, index) => (
              <Collapsible key={team.id} asChild>
                <>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell>
                      {team.members && team.members.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTeam(team.id)}
                          >
                            {expandedTeams.has(team.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: team.color || "#3B82F6" }}
                        />
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{team.memberCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {team.average}
                    </TableCell>
                  </TableRow>
                  {team.members && team.members.length > 0 && (
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="p-0">
                          <div className="px-12 py-2 space-y-1">
                            {team.members.map((member, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-sm py-1"
                              >
                                <span className="text-muted-foreground">{member.name}</span>
                                <span className="font-medium">{member.average} avg</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  )}
                </>
              </Collapsible>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
