import { EphemerisPosition } from '@/lib/ephemeris/types';

export type SpacecraftCategory =
  | 'deep-space'      // heliocentric — may be plottable in a future map step
  | 'mars-orbit'      // status display only
  | 'lunar-orbit'     // status display only
  | 'earth-lagrange'  // status display only (e.g. SEL2)
  | 'surface';        // status display only

export type MissionStatus = 'active' | 'legacy' | 'unknown';

// Registry entry — source of truth for metadata, not fetched from Horizons
export interface SpacecraftEntry {
  horizonsId:    string;
  name:          string;
  agency:        string;
  launchYear:    number;
  category:      SpacecraftCategory;
  missionStatus: MissionStatus;
  note?:         string;
}

// Fetched position extended with registry metadata
export interface SpacecraftPosition extends EphemerisPosition {
  category:      SpacecraftCategory;
  agency:        string;
  launchYear:    number;
  missionStatus: MissionStatus;
  note?:         string;
}

export interface SpacecraftResponse {
  assets:          Record<string, SpacecraftPosition>;
  timestamp:       string;
  source:          string;
  isLive:          boolean;
  fromCache:       boolean;
  cacheAgeSeconds: number;
}
