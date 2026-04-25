export interface NeoObject {
  id: string;
  name: string;                    // e.g. "(2025 FM3)" or "469219 Kamo'oalewa"
  closeApproachDate: string;       // YYYY-MM-DD
  closeApproachDateFull: string;   // "2025-Apr-25 14:23"
  velocityKmS: number;
  missDistanceKm: number;
  missDistanceLunar: number;       // lunar distances (1 LD ≈ 384,400 km)
  diameterMinKm: number;
  diameterMaxKm: number;
  isPotentiallyHazardous: boolean;
  orbitingBody: string;
  absoluteMagnitude: number;
  nasaJplUrl: string;
}

export type NeoErrorCode =
  | 'RATE_LIMITED'    // HTTP 429 — API quota exhausted
  | 'UNAUTHORIZED'    // HTTP 403 — bad or missing key
  | 'API_ERROR'       // other non-2xx from NASA
  | 'NETWORK_ERROR'   // timeout / connection failure
  | 'NO_DATA';        // 200 but zero objects returned

export interface NeoResponse {
  objects: NeoObject[];
  windowDays: number;
  startDate: string;
  endDate: string;
  timestamp: string;
  source: string;
  isLive: boolean;
  fromCache: boolean;
  cacheAgeSeconds: number;
  error?: string;
  errorCode?: NeoErrorCode;
  hasApiKey?: boolean;   // whether a real key (not DEMO_KEY) is configured
}

// ── Tactical status classification ────────────────────────────────────────────

export type NeoStatus =
  | 'POTENTIALLY_HAZARDOUS'
  | 'CLOSE_APPROACH'
  | 'WATCHLIST'
  | 'TRACKING';

export function getNeoStatus(obj: NeoObject): NeoStatus {
  if (obj.isPotentiallyHazardous) return 'POTENTIALLY_HAZARDOUS';
  if (obj.missDistanceLunar < 10)  return 'CLOSE_APPROACH';
  if (obj.missDistanceLunar < 50)  return 'WATCHLIST';
  return 'TRACKING';
}

export function getNeoStatusColor(status: NeoStatus): string {
  switch (status) {
    case 'POTENTIALLY_HAZARDOUS': return '#FF4A4A';
    case 'CLOSE_APPROACH':        return '#FFC857';
    case 'WATCHLIST':             return '#B8B8B8';
    case 'TRACKING':              return '#7A7A7A';
  }
}

export function getNeoStatusLabel(status: NeoStatus): string {
  switch (status) {
    case 'POTENTIALLY_HAZARDOUS': return 'HAZARDOUS';
    case 'CLOSE_APPROACH':        return 'CLOSE APPROACH';
    case 'WATCHLIST':             return 'WATCHLIST';
    case 'TRACKING':              return 'TRACKING';
  }
}
