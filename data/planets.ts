export interface Planet {
  id: string;
  name: string;
  type: string;
  distanceAU: number;
  distanceKm: string;
  moons: number;
  orbitalPeriodDays: number;
  orbitalPeriodYears: string;
  description: string;
  nodeRadius: number;
  orbitRadius: number;
  initialAngleDeg: number;
}

export const PLANETS: Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    type: 'Terrestrial',
    distanceAU: 0.39,
    distanceKm: '57.9M km',
    moons: 0,
    orbitalPeriodDays: 88,
    orbitalPeriodYears: '0.24 yr',
    description: 'Smallest planet. No atmosphere. Extreme temperature swings between 430°C and -180°C. Heavily cratered surface similar to Earth\'s Moon.',
    nodeRadius: 4,
    orbitRadius: 68,
    initialAngleDeg: 40,
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'Terrestrial',
    distanceAU: 0.72,
    distanceKm: '108.2M km',
    moons: 0,
    orbitalPeriodDays: 225,
    orbitalPeriodYears: '0.62 yr',
    description: 'Dense CO2 atmosphere creates runaway greenhouse effect. Surface temperature 465°C. Retrograde rotation. Volcanic plains and highlands.',
    nodeRadius: 5,
    orbitRadius: 108,
    initialAngleDeg: 90,
  },
  {
    id: 'earth',
    name: 'Earth',
    type: 'Terrestrial',
    distanceAU: 1.0,
    distanceKm: '149.6M km',
    moons: 1,
    orbitalPeriodDays: 365,
    orbitalPeriodYears: '1.00 yr',
    description: 'Only confirmed inhabited world. Liquid water oceans cover 71% of surface. Nitrogen-oxygen atmosphere. Single large natural satellite.',
    nodeRadius: 5,
    orbitRadius: 148,
    initialAngleDeg: 155,
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'Terrestrial',
    distanceAU: 1.52,
    distanceKm: '227.9M km',
    moons: 2,
    orbitalPeriodDays: 687,
    orbitalPeriodYears: '1.88 yr',
    description: 'Red iron-oxide regolith. Olympus Mons is the largest volcano in the system at 21km height. Thin CO2 atmosphere. Polar ice caps.',
    nodeRadius: 4,
    orbitRadius: 192,
    initialAngleDeg: 225,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'Gas Giant',
    distanceAU: 5.2,
    distanceKm: '778.5M km',
    moons: 95,
    orbitalPeriodDays: 4333,
    orbitalPeriodYears: '11.86 yr',
    description: 'Largest planet. Great Red Spot storm active for centuries. 95 confirmed moons including Ganymede, larger than Mercury. Intense radiation belts.',
    nodeRadius: 13,
    orbitRadius: 268,
    initialAngleDeg: 285,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    type: 'Gas Giant',
    distanceAU: 9.58,
    distanceKm: '1.43B km',
    moons: 146,
    orbitalPeriodDays: 10759,
    orbitalPeriodYears: '29.46 yr',
    description: 'Iconic ring system spans 282,000 km but only ~1km thick. Lowest density of all planets — would float on water. 146 confirmed moons.',
    nodeRadius: 10,
    orbitRadius: 342,
    initialAngleDeg: 340,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    type: 'Ice Giant',
    distanceAU: 19.22,
    distanceKm: '2.87B km',
    moons: 28,
    orbitalPeriodDays: 30687,
    orbitalPeriodYears: '84.01 yr',
    description: 'Axial tilt of 98° — rotates on its side relative to the ecliptic. Faint ring system. Methane upper atmosphere. 28 known moons.',
    nodeRadius: 8,
    orbitRadius: 405,
    initialAngleDeg: 55,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    type: 'Ice Giant',
    distanceAU: 30.05,
    distanceKm: '4.50B km',
    moons: 16,
    orbitalPeriodDays: 60190,
    orbitalPeriodYears: '164.8 yr',
    description: 'Strongest recorded winds in the system exceeding 2,100 km/h. Dark storm vortices. Triton orbits retrograde — likely a captured Kuiper Belt object.',
    nodeRadius: 8,
    orbitRadius: 460,
    initialAngleDeg: 170,
  },
];
