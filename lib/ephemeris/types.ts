export interface EphemerisPosition {
  id: string;
  name: string;
  x: number;            // heliocentric ecliptic J2000, AU
  y: number;            // heliocentric ecliptic J2000, AU
  z: number;            // heliocentric ecliptic J2000, AU
  distanceAU: number;   // sqrt(x²+y²+z²)
  angleDeg: number;     // atan2(-y, x) in degrees — SVG-mapped, north-up
  timestamp: string;    // ISO UTC of ephemeris epoch
  source: string;
  isLive: boolean;
  error?: string;
}

export interface EphemerisResponse {
  positions: Record<string, EphemerisPosition>;
  timestamp: string;    // ISO UTC of this response
  source: string;
  isLive: boolean;      // true if at least one planet has live data
  fromCache: boolean;
  cacheAgeSeconds: number;
}

// JPL Horizons small-body / planet IDs (planet center targets)
export const PLANET_HORIZONS_IDS: Record<string, { horizonsId: string; name: string }> = {
  mercury: { horizonsId: '199', name: 'Mercury' },
  venus:   { horizonsId: '299', name: 'Venus'   },
  earth:   { horizonsId: '399', name: 'Earth'   },
  mars:    { horizonsId: '499', name: 'Mars'     },
  jupiter: { horizonsId: '599', name: 'Jupiter'  },
  saturn:  { horizonsId: '699', name: 'Saturn'   },
  uranus:  { horizonsId: '799', name: 'Uranus'   },
  neptune: { horizonsId: '899', name: 'Neptune'  },
};

export type DisplayMode = 'schematic' | 'live';
export type EphemerisStatus = 'idle' | 'loading' | 'live' | 'error';
