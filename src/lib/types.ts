export interface Player {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  handicap?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  date: string;
  course_name: string;
  first_tee_time: string;
  tee_interval_minutes: number;
  holes: number;
  max_players: number;
  slots_per_group: number;
  signup_deadline?: string;
  notes?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventPlayer {
  id: string;
  event_id: string;
  player_id: string;
  status: "invited" | "playing" | "not_playing" | "waitlist";
  note?: string;
  created_at: string;
  players: Player;
}

export interface Group {
  id: string;
  event_id: string;
  tee_time: string;
  group_index: number;
  created_at: string;
  group_assignments?: GroupAssignment[];
}

export interface GroupAssignment {
  id: string;
  group_id: string;
  player_id: string;
  position: number;
  created_at: string;
  players?: Player;
}