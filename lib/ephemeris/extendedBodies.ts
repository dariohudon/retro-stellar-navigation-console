// Horizons IDs for secondary bodies — moons and dwarf planets.
// Used exclusively by /api/ephemeris/extended.
// IDs confirmed valid with REF_PLANE='ECLIPTIC', CENTER='500@10'.
export const EXTENDED_HORIZONS_IDS: Record<string, { horizonsId: string; name: string }> = {
  io:       { horizonsId: '501',     name: 'Io'       },
  europa:   { horizonsId: '502',     name: 'Europa'   },
  ganymede: { horizonsId: '503',     name: 'Ganymede' },
  callisto: { horizonsId: '504',     name: 'Callisto' },
  titan:    { horizonsId: '606',     name: 'Titan'    },
  triton:   { horizonsId: '801',     name: 'Triton'   },
  ceres:    { horizonsId: '2000001', name: 'Ceres'    },
  pluto:    { horizonsId: '999',     name: 'Pluto'    },
};
