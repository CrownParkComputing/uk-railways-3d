// Live National Rail data via the public Huxley2 REST proxy. CORS
// is enabled server-side, so no proxy needed.
//
// Polls a handful of major terminus stations every minute, maps each
// service to one of our rail lines (by origin/destination or operator),
// and exposes the live trains so the UI can show real delays.
//
// When the API is down or CORS-blocked, returns an empty array and
// the app falls back to the simulated timetable.

import * as THREE from 'three';
import { LINES, type RailLine } from './data/lines';
import { OPERATORS } from './data/operators';
import { CITY_COORDS, LONDON_TERMINALS, WAYPOINT_CITIES } from './data/coords';

export interface LiveService {
  serviceId: string;
  operator: string;
  operatorCode: string;
  origin: string;
  destination: string;
  originCrs: string;
  destinationCrs: string;
  std: string;          // scheduled depart
  etd: string;          // expected depart ("On time" / "12:45" / "Cancelled" / "Delayed")
  platform: string;
  delayReason: string | null;
  isCancelled: boolean;
  matchedLineName: string | null;   // best match from our LINES
  etaMinutes: number | null;        // minutes late if delayed
  raw: any;                         // full JSON object
}

const TERMINI: { name: string; crs: string }[] = [
  { name: 'London Kings Cross',  crs: 'KGX' },
  { name: 'London Euston',        crs: 'EUS' },
  { name: 'London Paddington',   crs: 'PAD' },
  { name: 'London Waterloo',     crs: 'WAT' },
  { name: 'London Victoria',     crs: 'VIC' },
  { name: 'London Liverpool St', crs: 'LST' },
  { name: 'London St Pancras',    crs: 'STP' },
  { name: 'Manchester Piccadilly',crs: 'MAN' },
  { name: 'Edinburgh Waverley',  crs: 'EDB' },
  { name: 'Glasgow Central',     crs: 'GLC' },
  { name: 'Birmingham New St',   crs: 'BHM' },
  { name: 'Leeds',               crs: 'LDS' },
  { name: 'Bristol Temple Meads',crs: 'BRI' },
  { name: 'Cardiff Central',     crs: 'CDF' },
  { name: 'York',                crs: 'YRK' },
];

// Build a lookup table of station name (lowercased) → CRS code,
// plus a reverse map CRS → friendly name.
const NAME_TO_CRS: Record<string, string> = {};
const CRS_TO_NAME: Record<string, string> = {};
for (const t of TERMINI) {
  NAME_TO_CRS[t.name.toLowerCase()] = t.crs;
  CRS_TO_NAME[t.crs] = t.name;
}
// Also map every known coord/waypoint name to a CRS where possible
// (we don't have a perfect mapping, so we rely on the Huxley CRS for live data).

function parseTime(t: string): { hh: number; mm: number } | null {
  // Huxley returns HH:MM
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return { hh: parseInt(m[1], 10), mm: parseInt(m[2], 10) };
}

function etdToMinutes(etd: string, std: string): number | null {
  if (!etd || etd === 'On time') return 0;
  if (etd === 'Cancelled' || etd === 'Delayed') return null;
  const a = parseTime(std);
  const b = parseTime(etd);
  if (!a || !b) return null;
  let am = a.hh * 60 + a.mm;
  let bm = b.hh * 60 + b.mm;
  if (bm < am) bm += 24 * 60;
  return bm - am;
}

// Find a rail line in LINES whose route goes through both origin and destination
// stations (or close enough). Returns the best match or null.
function findMatchingLine(originName: string, destinationName: string): { line: RailLine; idxOrigin: number; idxDest: number } | null {
  const lo = originName.toLowerCase();
  const ld = destinationName.toLowerCase();
  let best: { line: RailLine; idxOrigin: number; idxDest: number } | null = null;
  let bestScore = 0;
  for (const line of LINES) {
    const idxOrigin = line.route.findIndex((s) => s.toLowerCase().includes(lo) || lo.includes(s.toLowerCase()));
    const idxDest = line.route.findIndex((s) => s.toLowerCase().includes(ld) || ld.includes(s.toLowerCase()));
    if (idxOrigin >= 0 && idxDest >= 0) {
      const score = 1 / (Math.abs(idxOrigin - idxDest) + 1);
      if (score > bestScore) {
        bestScore = score;
        best = { line, idxOrigin, idxDest };
      }
    } else if (idxOrigin >= 0 || idxDest >= 0) {
      // Half match — service touches our line at one end. Score lower.
      const score = 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = { line, idxOrigin: idxOrigin >= 0 ? idxOrigin : 0, idxDest: idxDest >= 0 ? idxDest : line.route.length - 1 };
      }
    }
  }
  return best;
}

export interface LiveHandle {
  refresh: () => Promise<LiveService[]>;
  forceRefresh: () => Promise<LiveService[]>;
  getServices: () => LiveService[];
  isLive: () => boolean;
  lastFetch: () => number;
}

export function createLiveData(): LiveHandle {
  let services: LiveService[] = [];
  let live = false;
  let lastFetchMs = 0;
  let lastOkKey = -1;
  let lastLogMs = 0;
  let consecutiveFailures = 0;        // back off after several failed refreshes

  async function refresh(force = false): Promise<LiveService[]> {
    services = [];
    let ok = 0;
    let failed = 0;
    let firstErr: any = null;

    // After 3 failed refreshes, stop auto-polling — keep the panel
    // showing "Simulated" and stop spamming the browser console with
    // network failures every minute. User can still force-refresh.
    if (!force && consecutiveFailures >= 3) {
      (refresh as any).lastError = `paused after ${consecutiveFailures} failures`;
      live = false;
      return [];
    }

    try {
      const results = await Promise.all(
        TERMINI.map(async (t) => {
          try {
            const r = await window.fetch(`/api/huxley/departures/${t.crs}/8`);
            if (!r.ok) { failed++; return { ok: false, crs: t.crs, err: new Error(`HTTP ${r.status}`) }; }
            const j = await r.json();
            return { ok: true, crs: t.crs, name: t.name, j };
          } catch (e: any) {
            failed++;
            return { ok: false, crs: t.crs, err: e };
          }
        }),
      );
      const out: LiveService[] = [];
      for (const r of results) {
        if (!r.ok) { if (!firstErr) firstErr = r.err; continue; }
        const { crs, name, j } = r as any;
        ok++;
        const ts: any[] = j?.trainServices ?? [];
        for (const s of ts) {
          const origin = s.origin?.[0]?.locationName ?? '';
          const dest = s.destination?.[0]?.locationName ?? '';
          const std = s.std ?? '';
          const etd = s.etd ?? 'On time';
          const match = findMatchingLine(origin, dest);
          const delayMin = etdToMinutes(etd, std);
          out.push({
            serviceId: s.serviceID ?? '',
            operator: s.operator ?? '',
            operatorCode: s.operatorCode ?? '',
            origin,
            destination: dest,
            originCrs: crs,
            destinationCrs: s.destination?.[0]?.crs ?? '',
            std,
            etd,
            platform: s.platform ?? '',
            delayReason: s.delayReason ?? null,
            isCancelled: !!s.isCancelled,
            matchedLineName: match?.line.name ?? null,
            etaMinutes: s.isCancelled ? null : delayMin,
            raw: s,
          });
        }
      }
      services = out;
      live = out.length > 0;
      lastFetchMs = Date.now();
      if (live) consecutiveFailures = 0;
      else consecutiveFailures++;
      const okKey = ok;
      if (lastOkKey !== okKey || Date.now() - lastLogMs > 30_000) {
        console.log(`[live] ${ok}/${TERMINI.length} OK · ${out.length} services${firstErr ? ' · ' + String(firstErr?.message ?? firstErr) : ''}`);
        lastOkKey = okKey; lastLogMs = Date.now();
      }
      (refresh as any).lastError = failed === TERMINI.length
        ? (firstErr ? String(firstErr?.message ?? firstErr) : 'all stations failed')
        : null;
      return out;
    } catch (e: any) {
      if (Date.now() - lastLogMs > 30_000) {
        console.log(`[live] outer error: ${e?.message ?? e}`);
        lastLogMs = Date.now();
      }
      (refresh as any).lastError = e?.message ?? String(e);
      live = false;
      consecutiveFailures++;
      return [];
    }
  }

  return {
    refresh: () => refresh(false),
    forceRefresh: () => { consecutiveFailures = 0; return refresh(true); },
    getServices: () => services,
    isLive: () => live,
    lastFetch: () => lastFetchMs,
  };
}