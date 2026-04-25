export interface Sector {
  id: string;
  name: string;
  innerRadius: number;  // SVG schematic units
  outerRadius: number;
  auRange: string;
  description: string;
  primaryBodies: string;
}

export const SECTORS: Sector[] = [
  {
    id: 'inner',
    name: 'Inner System',
    innerRadius: 0,
    outerRadius: 210,
    auRange: '0 – 2.0 AU',
    description: 'Rocky terrestrial worlds and close-range survey zone. High solar radiation environment. Bounded by the frost line beyond Mars.',
    primaryBodies: 'Mercury, Venus, Earth, Mars',
  },
  {
    id: 'asteroid-belt',
    name: 'Asteroid Belt',
    innerRadius: 210,
    outerRadius: 248,
    auRange: '2.0 – 3.5 AU',
    description: 'Dense field of rocky and metallic debris — remnant from solar system formation. Millions of catalogued objects. Mass dominated by Ceres (~1/3 of total belt mass).',
    primaryBodies: 'Ceres, Vesta, Pallas, Hygiea',
  },
  {
    id: 'outer',
    name: 'Outer Planets',
    innerRadius: 248,
    outerRadius: 488,
    auRange: '3.5 – 32 AU',
    description: 'Gas and ice giant territory. High-value moon systems. Extreme magnetic fields. Hazardous radiation zones around Jupiter. Weak solar influence.',
    primaryBodies: 'Jupiter, Saturn, Uranus, Neptune',
  },
  {
    id: 'kuiper',
    name: 'Kuiper Belt',
    innerRadius: 488,
    outerRadius: 540,
    auRange: '32 – 55 AU',
    description: 'Trans-Neptunian region of icy bodies, dwarf planets, and short-period comet sources. Similar in structure to the Asteroid Belt but ~20× wider and ~20–200× more massive.',
    primaryBodies: 'Pluto, Eris, Haumea, Makemake',
  },
  {
    id: 'deep',
    name: 'Deep System',
    innerRadius: 540,
    outerRadius: 620,
    auRange: '55+ AU',
    description: 'Extreme outer system and scattered disc boundary. Inner Oort Cloud precursors. Minimal survey coverage. Nav lock unreliable beyond 80 AU. Sedna-class objects detected.',
    primaryBodies: 'Sedna, 2018 AG37, Scattered TNOs',
  },
];
