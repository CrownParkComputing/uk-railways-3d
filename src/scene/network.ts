// Renders the rail line tubes + road (motorway) bars, both toggleable
// via category/group filters.
//
// Rail lines: DASHED lines (LineDashedMaterial) along each route,
// coloured by operator. The dashed style reads as a railway track on
// a printed map and clearly distinguishes rail from solid road bars.
//
// Roads (motorways/A-roads): long thin rectangular bars following the
// road path, coloured UK motorway blue (free) or red (delayed).

import * as THREE from 'three';
import type { RailLine } from '../data/lines';
import { LINES } from '../data/lines';
import { OPERATORS } from '../data/operators';
import { ROADS } from '../data/motorways';
import { makeGetPos } from './stations';

// Region buckets used by the filter chips
function regionOf(lineName: string): string {
  const lo = lineName.toLowerCase();
  if (lo.includes('london') || lo.includes('thameslink') || lo.includes('elizabeth') ||
      lo.includes('chiltern') || lo.includes('midland') || lo.includes('great western')) return 'South East';
  if (lo.includes('wrexham') || lo.includes('cambrian') || lo.includes('wales') || lo.includes('rhondda') ||
      lo.includes('cynon') || lo.includes('merthyr') || lo.includes('coryton') ||
      lo.includes('vale of glamorgan') || lo.includes('shrewsbury')) return 'Wales';
  if (lo.includes('scotrail') || lo.includes('edinburgh') || lo.includes('glasgow') ||
      lo.includes('inverness') || lo.includes('highland') || lo.includes('kyle') ||
      lo.includes('far north') || lo.includes('west highland') || lo.includes('borders') ||
      lo.includes('ayrshire') || lo.includes('oban') || lo.includes('cumbrian')) return 'Scotland';
  if (lo.includes('merseyrail')) return 'Merseyside';
  if (lo.includes('settle') || lo.includes('tyne valley') || lo.includes('durham coast') ||
      lo.includes('calder') || lo.includes('huddersfield') || lo.includes('trans-pennine') ||
      lo.includes('east lancashire') || lo.includes('copy pit') || lo.includes('rosedale') ||
      lo.includes('hadfield') || lo.includes('hope valley') || lo.includes('yorkshire') ||
      lo.includes('bridlington') || lo.includes('esk valley') || lo.includes('airdale') ||
      lo.includes('wharfedale') || lo.includes('harrogate') || lo.includes('selside') ||
      lo.includes('blackpool') || lo.includes('burnley')) return 'North';
  if (lo.includes('cross-country') || lo.includes('birmingham') || lo.includes('newcastle-under-lyme') ||
      lo.includes('cannock') || lo.includes('midlands') || lo.includes('stoke') ||
      lo.includes('nottingham') || lo.includes('derby') || lo.includes('leicester')) return 'Midlands';
  return 'Other';
}

const STROKE = {
  main:     { radius: 0.06, opacity: 0.98, emissive: 0.6 },
  regional: { radius: 0.04, opacity: 0.92, emissive: 0.35 },
  london:   { radius: 0.035, opacity: 0.95, emissive: 0.45 },
};

// Shared rectangular road-bar geometry (long thin box, oriented +X)
const roadBarGeo = new THREE.BoxGeometry(0.20, 0.012, 0.06);   // 0.20 long × 0.012 tall × 0.06 wide

export interface NetworkHandle {
  rebuild: () => void;
  setCategoryVisible: (cat: keyof typeof STROKE, on: boolean) => void;
  setLineVisible: (name: string, on: boolean) => void;
  setRoadsVisible: (on: boolean) => void;
  getVisibleLineNames: () => string[];
  refreshTraffic: () => void;
  refreshRailDelays: () => void;
  getLineMeshes: () => THREE.Mesh[];
  getMotorwayDelaySummary: () => {
    totalDelays: number; total: number; lines: { name: string; count: number }[];
  };
  getRailDelays: () => Array<{ lineName: string; reason: string; station: string; extraMin: number }>;
  setOperatorFilter: (ops: Set<string> | null) => void;
  setRegionFilter: (regions: Set<string> | null) => void;
}

export function buildNetwork(
  scene: THREE.Scene,
  cityData: Record<string, any>,
): NetworkHandle {
  const getPos = makeGetPos(cityData);
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  const roadGroup = new THREE.Group();
  scene.add(roadGroup);

  const visibleCats = { main: true, regional: false, };
  const visibleLines = new Set<string>(LINES.map((l) => l.name));
  const lineMeshes = new Map<string, THREE.Group>();
  let operatorFilter: Set<string> | null = null;
  let regionFilter: Set<string> | null = null;

  function buildRailLine(line: RailLine): THREE.Group | null {
    const pts = line.route.map((n) => getPos(n)).filter((p): p is THREE.Vector3 => !!p);
    if (pts.length < 2) return null;
    const lifted = pts.map((p) => new THREE.Vector3(p.x, 0.21, p.z));
    const curve = new THREE.CatmullRomCurve3(lifted, false, 'centripetal', 0.5);
    const segs = Math.max(50, pts.length * 6);
    const def = STROKE[line.cat];
    // Bolder tube — visible from UK-overview down to city-zoom
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, segs, def.radius, 10, false),
      new THREE.MeshStandardMaterial({
        color: line.color,
        emissive: line.color,
        emissiveIntensity: def.emissive,
        roughness: 0.45,
        metalness: 0.2,
        transparent: true,
        opacity: def.opacity,
      }),
    );
    const grp = new THREE.Group();
    grp.add(tube);
    grp.userData.line = line;
    return grp;
  }

  function rebuildRail() {
    while (lineGroup.children.length) {
      const m = lineGroup.children[0];
      lineGroup.remove(m);
      m.traverse((c) => { (c as THREE.Mesh).geometry?.dispose(); });
    }
    lineMeshes.clear();
    for (const line of LINES) {
      if (!visibleCats[line.cat]) continue;
      if (!visibleLines.has(line.name)) continue;
      if (operatorFilter && operatorFilter.size > 0) {
        const op = OPERATORS[line.name]?.[0];
        if (!op || !operatorFilter.has(op)) continue;
      }
      if (regionFilter && regionFilter.size > 0) {
        const r = regionOf(line.name);
        if (!regionFilter.has(r)) continue;
      }
      const mesh = buildRailLine(line);
      if (mesh) { lineGroup.add(mesh); lineMeshes.set(line.name, mesh); }
    }
  }

  // -------------------- MOTORWAYS / ROADS --------------------
  // Each road is built as a series of small triangle meshes placed at
  // regular intervals along its smooth curve. Triangle colour is the
  // simulated traffic state for that segment.

  interface RoadMesh {
    road: { name: string; route: string[] };
    curve: THREE.CatmullRomCurve3;
    segMeshes: THREE.Mesh[];   // many small triangles along the path
  }
  const roadRecords: RoadMesh[] = [];

  // Simulated traffic state per road segment
  // 0 = free (motorway blue), 1 = delayed (red)
  const trafficState: Map<string, number[]> = new Map();

  function makeRoadBars(road: { name: string; route: string[] }, curve: THREE.CatmullRomCurve3): THREE.Mesh[] {
    const length = curve.getLength();
    const count = Math.max(8, Math.floor(length / 0.30));   // one bar every ~0.3 unit
    const meshes: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const pos = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const m = new THREE.Mesh(
        roadBarGeo,
        new THREE.MeshStandardMaterial({
          color: 0x003B8E,     // UK motorway blue
          emissive: 0x003B8E, emissiveIntensity: 0.25,
          roughness: 0.85, metalness: 0.05,
          transparent: true, opacity: 0.95,
        }),
      );
      m.position.set(pos.x, 0.205, pos.z);
      m.rotation.y = Math.atan2(-tan.z, tan.x);   // long axis along travel direction
      meshes.push(m);
      roadGroup.add(m);
    }
    return meshes;
  }

  function buildRoads() {
    while (roadGroup.children.length) {
      const m = roadGroup.children[0];
      roadGroup.remove(m);
      m.geometry === roadBarGeo ? null : m.geometry?.dispose();
      m.material?.dispose();
    }
    roadRecords.length = 0;
    for (const r of ROADS) {
      const pts = r.route.map((n) => getPos(n)).filter((p): p is THREE.Vector3 => !!p);
      if (pts.length < 2) continue;
      const lifted = pts.map((p) => new THREE.Vector3(p.x, 0.21, p.z));
      const curve = new THREE.CatmullRomCurve3(lifted, false, 'centripetal', 0.5);
      const segs = makeRoadBars(r, curve);
      if (segs.length) {
        roadRecords.push({ road: r, curve, segMeshes: segs });
        trafficState.set(r.name, segs.map(() => Math.random() < 0.80 ? 0 : 1));
      }
    }
    refreshTraffic();
  }

  // ---- Live delays ----
  // Each refresh of motorway traffic also recomputes a summary of how many
  // segments per road are delayed. Caller pulls via getMotorwayDelaySummary().

  const RAIL_DELAY_REASONS = [
    'signal failure', 'earlier incident', 'engineering works',
    'points failure', 'overhead wire problem', 'train crew unavailable',
    'late-running connection', 'track defect', 'heavy rain',
  ];
  let railDelays: { lineName: string; reason: string; station: string; extraMin: number }[] = [];

  function simulateRailDelays() {
    // Pick 2-4 random main lines to have a delay
    const mainLines = LINES.filter((l) => l.cat === 'main');
    const count = 2 + Math.floor(Math.random() * 3);
    const picked: typeof mainLines = [];
    while (picked.length < count && picked.length < mainLines.length) {
      const candidate = mainLines[Math.floor(Math.random() * mainLines.length)];
      if (!picked.includes(candidate)) picked.push(candidate);
    }
    railDelays = picked.map((line) => {
      const reason = RAIL_DELAY_REASONS[Math.floor(Math.random() * RAIL_DELAY_REASONS.length)];
      const mid = line.route[Math.floor(line.route.length / 2)];
      return {
        lineName: line.name,
        reason,
        station: mid,
        extraMin: 5 + Math.floor(Math.random() * 30),
      };
    });
  }
  simulateRailDelays();

  // UK motorway signage blue (Pantone 287) for clear, red for delays.
// This motorway blue is intentionally distinct from every rail operator
// colour (WCML is 0x60a5fa, Southeastern is 0x1d4ed8, etc.) so a
// viewer can always tell rail blue from road blue at a glance.
const TRAFFIC_COLORS = [0x003B8E, 0xef4444];   // 0 = free (motorway blue), 1 = delayed (red)
  function refreshTraffic() {
    // ~85% free, ~10% slow, ~5% queued. Re-roll a couple segments each
    // refresh so the colours visibly change over time.
    for (const rec of roadRecords) {
      const segs = trafficState.get(rec.road.name)!;
      // Re-randomise the first segment half the time so the user sees motion
      for (let i = 0; i < segs.length; i++) {
        if (Math.random() < 0.04) {
          segs[i] = Math.random() < 0.80 ? 0 : 1;
        }
      }
      for (let i = 0; i < rec.segMeshes.length; i++) {
        const m = rec.segMeshes[i].material as THREE.MeshBasicMaterial;
        m.color.setHex(TRAFFIC_COLORS[segs[i]]);
      }
    }
  }

  rebuildRail();
  buildRoads();

  return {
    rebuild: () => { rebuildRail(); buildRoads(); },
    setCategoryVisible: (cat, on) => {
      visibleCats[cat] = on;
      rebuildRail();
    },
    setLineVisible: (name, on) => {
      if (on) visibleLines.add(name); else visibleLines.delete(name);
      rebuildRail();
    },
    setRoadsVisible: (on) => { roadGroup.visible = on; },
    getVisibleLineNames: () => [...lineMeshes.keys()],
    refreshTraffic,
    refreshRailDelays: () => simulateRailDelays(),
    getLineMeshes: () => {
      const out: THREE.Mesh[] = [];
      lineGroup.traverse((c) => { if ((c as THREE.Mesh).isMesh) out.push(c as THREE.Mesh); });
      return out;
    },
    getMotorwayDelaySummary: () => {
      let totalDelays = 0;
      let totalSegs = 0;
      const lines: { name: string; count: number }[] = [];
      for (const rec of roadRecords) {
        const segs = trafficState.get(rec.road.name)!;
        const d = segs.reduce((a, b) => a + b, 0);
        totalDelays += d;
        totalSegs += segs.length;
        if (d > 0) lines.push({ name: rec.road.name, count: d });
      }
      lines.sort((a, b) => b.count - a.count);
      return { totalDelays, total: totalSegs, lines };
    },
    getRailDelays: () => railDelays,
    setOperatorFilter: (set) => { operatorFilter = set; rebuildRail(); },
    setRegionFilter:  (set) => { regionFilter  = set; rebuildRail(); },
  };
}