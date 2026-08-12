export interface CrewMember {
  name: string;
  agency: string;
  station: 'ISS' | 'TIANGONG';
  daysInSpace: number;
}

export interface CrewData {
  crew: CrewMember[];
  fetchedAt: string;
}

interface Ll2Astro {
  name: string;
  agency?: { abbrev?: string };
  time_in_space?: string; // ISO8601 duration e.g. P384DT6H39M35S
  type?: { name?: string };
}

function parseDays(dur: string | undefined): number {
  const m = dur?.match(/P(\d+)D/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function fetchCrew(): Promise<CrewData> {
  const res = await fetch('https://ll.thespacedevs.com/2.2.0/astronaut/?in_space=true&limit=30&format=json', {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`launch library ${res.status}`);
  const j = await res.json();
  const crew: CrewMember[] = (j.results as Ll2Astro[])
    .filter(a => a.name !== 'Starman' && !(a.type?.name ?? '').includes('Non-'))
    .map(a => {
      const agency = a.agency?.abbrev ?? '?';
      return {
        name: a.name.toUpperCase(),
        agency,
        // agency-based grouping: CNSA flies Tiangong; everyone else is ISS
        station: (agency === 'CNSA' ? 'TIANGONG' : 'ISS') as CrewMember['station'],
        daysInSpace: parseDays(a.time_in_space),
      };
    })
    .sort((a, b) => b.daysInSpace - a.daysInSpace);
  return { crew, fetchedAt: new Date().toISOString() };
}
