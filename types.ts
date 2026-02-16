
export type Key = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

export type UserRole = 'Admin' | 'Viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  originalKey: Key;
  content: string;
  createdAt: number;
  instrumentParts?: Record<string, string>;
}

export interface Schedule {
  id: string;
  name: string;
  date: string;
  songIds: string[];
  assignments?: Record<string, string>;
}

export type ViewType = 'dashboard' | 'schedules' | 'songs' | 'settings' | 'view-song' | 'view-schedule' | 'login';

export interface AppState {
  songs: Song[];
  schedules: Schedule[];
  members: string[];
  theme: 'light' | 'dark';
  currentView: ViewType;
  selectedSongId?: string;
  selectedScheduleId?: string;
  user: UserProfile | null;
}
