export interface EphemerisPosition {
  id: string;
  name: string;
  x: number;            // heliocentric ecliptic J2000, AU  (x toward vernal equinox)
  y: number;            // heliocentric ecliptic J2000, AU  (y toward ecliptic lon 90°)
  z: number;            // heliocentric ecliptic J2000, AU  (z toward north ecliptic pole)
  distanceAU: number;   // sqrt(x²+y²+z²)
  angleDeg: number;     // atan2(-y, x) — SVG north-up angle; negate-y maps ecliptic to SVG counter-clockwise
  timestamp: string;    // ISO UTC of ephemeris epoch
  source: string;
  refFrame?: 'ICRF_J2000' | 'ECL_J2000';  // coordinate frame; undefined on fallback positions
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
