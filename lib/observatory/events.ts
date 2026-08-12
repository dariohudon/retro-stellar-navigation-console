import {
  Body, Observer, SearchMoonQuarter, NextMoonQuarter,
  SearchLunarEclipse, SearchLocalSolarEclipse,
} from 'astronomy-engine';
import { SITE } from './site';

export interface EventItem {
  id: string;
  title: string;
  type: 'METEOR SHOWER' | 'SOLAR ECLIPSE' | 'LUNAR ECLIPSE' | 'FULL MOON' | 'NEW MOON';
  date: string;        // ISO of the peak/event moment
  dateLabel: string;   // e.g. "AUG 12"
  daysAway: number;
  window: string;      // active/visibility window
  best: string;        // when & where to look
  stat: string;        // headline number: ZHR, obscuration, phase...
  blurb: string;
}

export interface EventsData {
  events: EventItem[];
  fetchedAt: string;
}

interface Shower {
  name: string; month: number; day: number;
  activeFrom: string; activeTo: string; zhr: number;
  radiant: string; best: string; parent: string; blurb: string;
}

const SHOWERS: Shower[] = [
  { name: 'QUADRANTIDS', month: 1, day: 3, activeFrom: 'Jan 1', activeTo: 'Jan 5', zhr: 120, radiant: 'NE (Boötes)', best: 'pre-dawn, NE sky', parent: 'asteroid 2003 EH1',
    blurb: 'One of the strongest showers of the year, but with a sharp peak lasting only ~6 hours. Blue-tinged meteors from a mysterious "rock comet".' },
  { name: 'LYRIDS', month: 4, day: 22, activeFrom: 'Apr 14', activeTo: 'Apr 30', zhr: 18, radiant: 'E (Lyra)', best: 'after 22:30, E sky', parent: 'comet C/1861 G1 Thatcher',
    blurb: 'The oldest recorded shower — Chinese observers noted it 2,700 years ago. Occasionally produces surprise outbursts of fast, bright meteors.' },
  { name: 'ETA AQUARIIDS', month: 5, day: 5, activeFrom: 'Apr 19', activeTo: 'May 28', zhr: 50, radiant: 'E (Aquarius)', best: 'pre-dawn, low E horizon', parent: "Halley's Comet",
    blurb: "Debris from Halley's Comet. The radiant sits low from Canadian latitudes, so expect fewer but dramatic 'earthgrazer' meteors skimming the horizon." },
  { name: 'S. DELTA AQUARIIDS', month: 7, day: 30, activeFrom: 'Jul 12', activeTo: 'Aug 23', zhr: 25, radiant: 'S (Aquarius)', best: 'after midnight, S sky', parent: 'comet 96P/Machholz',
    blurb: 'A steady mid-summer shower of faint meteors. Overlaps with the early Perseids, making late-July nights doubly active.' },
  { name: 'PERSEIDS', month: 8, day: 12, activeFrom: 'Jul 17', activeTo: 'Aug 24', zhr: 100, radiant: 'NE (Perseus)', best: '23:00 to dawn, NE sky', parent: 'comet 109P/Swift-Tuttle',
    blurb: 'The summer classic — fast, bright meteors with persistent trains, from dust shed by comet Swift-Tuttle. Warm nights make this the most-watched shower of the year.' },
  { name: 'ORIONIDS', month: 10, day: 21, activeFrom: 'Oct 2', activeTo: 'Nov 7', zhr: 20, radiant: 'SE (Orion)', best: 'after midnight, SE sky', parent: "Halley's Comet",
    blurb: "Halley's Comet's second annual gift. Swift meteors that often leave glowing trains near Orion's club." },
  { name: 'LEONIDS', month: 11, day: 17, activeFrom: 'Nov 6', activeTo: 'Nov 30', zhr: 15, radiant: 'E (Leo)', best: 'pre-dawn, E sky', parent: 'comet 55P/Tempel-Tuttle',
    blurb: 'Modest most years, but famous for historic meteor storms (thousands per hour in 1833 and 1966). The fastest meteors of any shower at 71 km/s.' },
  { name: 'GEMINIDS', month: 12, day: 13, activeFrom: 'Dec 4', activeTo: 'Dec 20', zhr: 150, radiant: 'S (Gemini)', best: '21:00 to 02:00, high S sky', parent: 'asteroid 3200 Phaethon',
    blurb: 'The best shower of the year — slow, bright, often colourful meteors from an asteroid rather than a comet. Peaks conveniently before midnight.' },
  { name: 'URSIDS', month: 12, day: 22, activeFrom: 'Dec 17', activeTo: 'Dec 26', zhr: 10, radiant: 'N (Ursa Minor)', best: 'pre-dawn, N sky', parent: 'comet 8P/Tuttle',
    blurb: 'A quiet solstice shower radiating from the Little Dipper — circumpolar from Canada, so the radiant never sets.' },
];

function fmtDate(d: Date, tz: string): string {
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: tz }).toUpperCase();
}
function fmtDateTime(d: Date, tz: string): string {
  return d.toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz });
}
function days(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
}

export function computeEvents(lat = SITE.lat, lon = SITE.lon, tz = SITE.timezone): EventsData {
  const now = new Date();
  const events: EventItem[] = [];

  // ── next 3 meteor showers ──
  const upcoming: Array<{ s: Shower; d: Date }> = [];
  for (const s of SHOWERS) {
    for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
      const d = new Date(Date.UTC(y, s.month - 1, s.day, 9)); // peak ~ overnight NA time
      if (d.getTime() >= now.getTime() - 36 * 3600 * 1000) { upcoming.push({ s, d }); break; }
    }
  }
  upcoming.sort((a, b) => a.d.getTime() - b.d.getTime());
  for (const { s, d } of upcoming.slice(0, 3)) {
    events.push({
      id: `shower-${s.name}`,
      title: s.name,
      type: 'METEOR SHOWER',
      date: d.toISOString(),
      dateLabel: fmtDate(d, tz),
      daysAway: days(now, d),
      window: `ACTIVE ${s.activeFrom.toUpperCase()} – ${s.activeTo.toUpperCase()} · PEAK ${fmtDate(d, tz)}`,
      best: s.best.toUpperCase(),
      stat: `UP TO ${s.zhr}/HR · RADIANT ${s.radiant.toUpperCase()}`,
      blurb: `${s.blurb} Source: ${s.parent}.`,
    });
  }

  // ── next full + new moon ──
  let mq = SearchMoonQuarter(now);
  for (let i = 0; i < 8 && (events.filter(e => e.type === 'FULL MOON').length === 0 || events.filter(e => e.type === 'NEW MOON').length === 0); i++) {
    if (mq.quarter === 2 && !events.some(e => e.type === 'FULL MOON')) {
      const d = mq.time.date;
      events.push({
        id: 'full-moon', title: 'FULL MOON', type: 'FULL MOON',
        date: d.toISOString(), dateLabel: fmtDate(d, tz), daysAway: days(now, d),
        window: `EXACT ${fmtDateTime(d, tz).toUpperCase()}`,
        best: 'RISES AT SUNSET, UP ALL NIGHT',
        stat: '100% ILLUMINATED',
        blurb: 'The Moon sits opposite the Sun and shines all night. Beautiful to watch rise — but it washes out faint targets, so deep-sky and meteor watching suffer for a few nights.',
      });
    }
    if (mq.quarter === 0 && !events.some(e => e.type === 'NEW MOON')) {
      const d = mq.time.date;
      events.push({
        id: 'new-moon', title: 'NEW MOON', type: 'NEW MOON',
        date: d.toISOString(), dateLabel: fmtDate(d, tz), daysAway: days(now, d),
        window: `EXACT ${fmtDateTime(d, tz).toUpperCase()}`,
        best: 'DARKEST NIGHTS: ±4 DAYS AROUND THIS DATE',
        stat: '0% ILLUMINATED',
        blurb: 'No moonlight all night — the best window of the month for faint galaxies, the Milky Way, meteors, and aurora hunting. Plan dark-sky trips around this date.',
      });
    }
    mq = NextMoonQuarter(mq);
  }

  // ── next lunar eclipse (within 18 months) ──
  try {
    const le = SearchLunarEclipse(now);
    const d = le.peak.date;
    if (days(now, d) <= 550) {
      events.push({
        id: 'lunar-eclipse', title: `${le.kind.toUpperCase()} LUNAR ECLIPSE`, type: 'LUNAR ECLIPSE',
        date: d.toISOString(), dateLabel: fmtDate(d, tz), daysAway: days(now, d),
        window: `MID-ECLIPSE ${fmtDateTime(d, tz).toUpperCase()}`,
        best: 'VISIBLE ANYWHERE THE MOON IS UP — NO EQUIPMENT NEEDED',
        stat: `TYPE: ${le.kind.toUpperCase()}`,
        blurb: 'Earth passes between the Sun and Moon, casting its shadow across the lunar surface. During totality the Moon glows red from sunlight bent through our atmosphere.',
      });
    }
  } catch { /* none found in range */ }

  // ── next local solar eclipse (sun above horizon at this site, within 2 years) ──
  try {
    const obs = new Observer(lat, lon, 800);
    let se = SearchLocalSolarEclipse(now, obs);
    for (let i = 0; i < 5; i++) {
      if (se.peak.altitude > 0 && days(now, se.peak.time.date) <= 750) break;
      se = SearchLocalSolarEclipse(new Date(se.peak.time.date.getTime() + 86400000 * 10), obs);
    }
    if (se.peak.altitude > 0 && days(now, se.peak.time.date) <= 750) {
      const d = se.peak.time.date;
      const obsc = Math.round(se.obscuration * 100);
      events.push({
        id: 'solar-eclipse', title: `${se.kind.toUpperCase()} SOLAR ECLIPSE`, type: 'SOLAR ECLIPSE',
        date: d.toISOString(), dateLabel: fmtDate(d, tz), daysAway: days(now, d),
        window: `MAX AT ${fmtDateTime(d, tz).toUpperCase()} · FROM YOUR LOCATION`,
        best: 'NEVER LOOK AT THE SUN WITHOUT CERTIFIED ECLIPSE GLASSES',
        stat: `${obsc}% OF SUN COVERED HERE`,
        blurb: 'The Moon passes in front of the Sun. Coverage depends entirely on where you stand — this figure is computed for your exact location.',
      });
    }
  } catch { /* none found in range */ }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return { events: events.slice(0, 5), fetchedAt: new Date().toISOString() };
}
