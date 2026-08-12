export interface Mission {
  id: string;
  name: string;
  provider: string;
  vehicle: string;
  site: string;
  net: string;          // ISO launch time
  status: string;
  blurb: string;
}

export interface MissionsData {
  missions: Mission[];
  fetchedAt: string;
}

interface Ll2Launch {
  id: string;
  name: string;
  net: string;
  status?: { abbrev?: string; name?: string };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { full_name?: string } };
  pad?: { name?: string; location?: { name?: string } };
  mission?: { name?: string; description?: string };
}

export async function fetchMissions(): Promise<MissionsData> {
  const res = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=12', {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`launch library ${res.status}`);
  const j = await res.json();
  const now = Date.now();

  const missions: Mission[] = (j.results as Ll2Launch[])
    .filter(l => new Date(l.net).getTime() > now - 30 * 60 * 1000)
    .filter(l => !['Success', 'Failure', 'Partial Failure'].includes(l.status?.name ?? ''))
    .slice(0, 6)
    .map(l => {
      const [vehicle, missionName] = l.name.includes(' | ') ? l.name.split(' | ') : [l.rocket?.configuration?.full_name ?? '?', l.name];
      const desc = (l.mission?.description ?? '').trim();
      return {
        id: l.id,
        name: (missionName || l.mission?.name || l.name).toUpperCase(),
        provider: (l.launch_service_provider?.name ?? 'UNKNOWN').toUpperCase(),
        vehicle: (l.rocket?.configuration?.full_name ?? vehicle).toUpperCase(),
        site: `${l.pad?.name ?? '?'} · ${l.pad?.location?.name ?? '?'}`.toUpperCase(),
        net: l.net,
        status: (l.status?.abbrev ?? l.status?.name ?? 'TBD').toUpperCase(),
        blurb: desc.length > 260 ? desc.slice(0, 257).trimEnd() + '…' : desc || 'No mission description published yet.',
      };
    });

  return { missions, fetchedAt: new Date().toISOString() };
}
