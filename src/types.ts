export type Difficulty = 'Easy' | 'Medium' | 'Difficult';
export type Deck = 'official' | 'original';
export type Points = 0 | 4 | 5 | 6;

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Difficult'];
export const DECKS: Deck[] = ['official', 'original'];

export type Range = [number, number];

export interface Timetable {
  masterDetective: Range;
  privateEye: Range;
  flatfoot: Range;
}

export interface Card {
  id: string;
  number: number;
  source: Deck;
  title: string;
  difficulty: Difficulty;
  case: string[];
  mystery: string;
  clues: [string, string];
  timetable: Timetable;
  story: string[];
  specialInformation: string | null;
  solution: string;
}

export interface Filters {
  difficulties: Difficulty[];
  decks: Deck[];
}

export interface Group {
  id: string;
  name: string;
  createdAt: number;
  /** Last rename or toggle change; newest wins when merging. */
  updatedAt: number;
  meAlsoPlaying: boolean;
}

export interface PlayedRecord {
  playedAt: number;
  /** null = marked played by hand */
  points: Points | null;
  /** Effective seconds (elapsed + penalty) when solved with the clock. */
  effectiveSec?: number;
  cluesUsed?: number;
}

export type PlayedMap = { [profileId: string]: { [cardId: string]: PlayedRecord } };

export type LibraryStatus = 'all' | 'unplayed' | 'played';
export type LibrarySort = 'number' | 'title' | 'recent';

export interface LibraryPrefs extends Filters {
  status: LibraryStatus;
  sort: LibrarySort;
}

export interface ClockState {
  cardId: string;
  startedAt: number | null;
  accumulatedMs: number;
  running: boolean;
  penaltyMin: number;
  cluesRevealed: [boolean, boolean];
}

export interface Settings {
  confirmClues: boolean;
  theme: 'system' | 'light' | 'dark';
  textSize: 'normal' | 'large';
}

export const ME = 'me';

/** profileId -> cardId -> time it was un-marked, so merges don't resurrect it. */
export type RemovedMap = { [profileId: string]: { [cardId: string]: number } };

export interface Store {
  schemaVersion: 2;
  activeProfileId: string;
  groups: Group[];
  played: PlayedMap;
  removed: RemovedMap;
  /** groupId -> time it was deleted, so merges don't bring it back. */
  deletedGroups: { [groupId: string]: number };
  filters: { [profileId: string]: Filters };
  libraryPrefs: LibraryPrefs;
  activeClock?: ClockState;
  settings: Settings;
}
