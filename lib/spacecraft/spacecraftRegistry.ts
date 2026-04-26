// Horizons IDs verified 2026-Apr-25 against JPL Horizons OBJ_DATA endpoint.
// Negative SPK IDs are standard for spacecraft in the Horizons system.
// All four targets confirmed active with trajectory coverage through 2026+.
import { SpacecraftEntry } from './types';

export const SPACECRAFT_REGISTRY: Record<string, SpacecraftEntry> = {
  voyager1: {
    horizonsId:    '-31',
    name:          'Voyager 1',
    agency:        'NASA/JPL',
    launchYear:    1977,
    category:      'deep-space',
    missionStatus: 'active',
    note:          'Interstellar space — farthest human-made object',
  },
  voyager2: {
    horizonsId:    '-32',
    name:          'Voyager 2',
    agency:        'NASA/JPL',
    launchYear:    1977,
    category:      'deep-space',
    missionStatus: 'active',
    note:          'Interstellar space — below ecliptic plane',
  },
  newhorizons: {
    horizonsId:    '-98',
    name:          'New Horizons',
    agency:        'NASA/APL',
    launchYear:    2006,
    category:      'deep-space',
    missionStatus: 'active',
    note:          'Post-Pluto Kuiper Belt cruise',
  },
  parker: {
    horizonsId:    '-96',
    name:          'Parker Solar Probe',
    agency:        'NASA/APL',
    launchYear:    2018,
    category:      'deep-space',
    missionStatus: 'active',
    note:          'Solar corona exploration — highly elliptical orbit',
  },
};
