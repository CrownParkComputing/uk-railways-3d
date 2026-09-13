// Entry point — wires the world, the scene, the UI and the animation
// loop into one coherent Vite-served app.

import * as THREE from 'three';
import { createWorld } from './scene/world';
import { buildLand } from './scene/land';
import { buildStations, makeGetPos } from './scene/stations';
import { buildNetwork } from './scene/network';
import { buildTrains } from './scene/trains';
import { CITIES } from './data/cities';
import { LINES } from './data/lines';
import { OPERATORS } from './data/operators';
import { buildUI } from './ui';
import { buildLabels } from './labels';
import { createLiveData } from './livedata';

const container = document.getElementById('app')!;

// 1) World (renderer + camera + controls + lights + resize)
const world = createWorld(container);
const { scene, camera, controls, flyCamera, renderer } = world;

// 2) Land
buildLand(scene);

// 3) Stations
const { cityData, pickables } = buildStations(scene, CITIES);
const getPos = makeGetPos(cityData);

// 4) Rail + road network
const network = buildNetwork(scene, cityData);

// 5) Trains
const trains = buildTrains(scene, cityData);

// 6) UI
const ui = buildUI();
ui.refreshStats();
ui.wireNetwork(network);

// 6b) Floating HTML labels (city names + train flags)
const labels = buildLabels();

// Pre-compute total length once for the "Network length" stat
{
  let total = 0;
  for (const line of LINES) {
    const pts = line.route.map((n) => getPos(n)).filter((p): p is THREE.Vector3 => !!p);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dLng = (a.x - b.x);
      const dLat = (a.z - b.z);
      total += Math.hypot(dLng, dLat);
    }
  }
  document.getElementById('netLength')!.textContent =
    `${Math.round(total * 40).toLocaleString()} mi`; // 1 scene unit ≈ 40 mi
}

// 7) Hover tooltips
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltipEl = document.getElementById('tooltip')!;
const visibleTrains = trains.getVisibleTrains();

renderer.domElement.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // 1) Cities
  const cityHit = raycaster.intersectObjects(pickables, false);
  if (cityHit.length) {
    const cap = cityHit[0].object;
    let name: string | null = null;
    let info: any = null;
    for (const [n, d] of Object.entries(cityData)) {
      if (d.cap === cap) { name = n; info = d.info; break; }
    }
    if (name) {
      tooltipEl.innerHTML =
        `<div class="tt-name">${name}</div>` +
        (info ? `<div class="tt-meta">Population ${info.pop}${info.major ? ' · Major city' : ''}</div>` : '');
      tooltipEl.style.display = 'block';
      tooltipEl.style.left = (e.clientX + 14) + 'px';
      tooltipEl.style.top = (e.clientY + 14) + 'px';
      document.body.style.cursor = 'pointer';
      return;
    }
  }

  // 2) Trains
  const visibleGroups = visibleTrains.map((t) => t.group);
  if (visibleGroups.length) {
    const tHit = raycaster.intersectObjects(visibleGroups, true);
    if (tHit.length) {
      const obj = tHit[0].object;
      const t = visibleTrains.find(
        (tt) => tt.group === obj || obj.parent === tt.group || obj.parent?.parent === tt.group,
      );
      if (t) {
        const line = LINES.find((l) => l.name === t.lineName);
        const stops = line ? line.route : [];
        const N = stops.length;
        const u = (Date.now() - t.departMs) / (t.arriveMs - t.departMs);
        const idxFloat = Math.max(0, Math.min(N - 1, u * (N - 1)));
        const prevIdx = Math.min(N - 1, Math.floor(idxFloat));
        const nextIdx = Math.min(N - 1, prevIdx + 1);
        const prev = stops[prevIdx] || '?';
        const next = stops[nextIdx] || prev;
        const frac = Math.max(0, idxFloat - prevIdx);
        const journeyLeft = Math.max(0, (t.arriveMs - Date.now()) / 60_000);
        const legsLeft = Math.max(1, (N - 1) - prevIdx);
        const eta = Math.max(0, Math.round(frac * (journeyLeft / legsLeft)));
        tooltipEl.innerHTML =
          `<div class="tt-name">🚂 ${t.operator}</div>` +
          `<div class="tt-meta"><b>${t.lineName}</b><br>` +
          `${prev} → <b style="color:#60a5fa">${next}</b> · ~${eta} min<br>` +
          `Stop ${prevIdx + 1} / ${N} · ${Math.round(journeyLeft)} min left</div>`;
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = (e.clientX + 14) + 'px';
        tooltipEl.style.top = (e.clientY + 14) + 'px';
        document.body.style.cursor = 'pointer';
        return;
      }
    }
  }

  // 3) Rail line tubes — hover on the coloured line itself
  const lineMeshes = network.getLineMeshes();
  if (lineMeshes.length) {
    const lineHit = raycaster.intersectObjects(lineMeshes, false);
    if (lineHit.length) {
      const grp = lineHit[0].object.parent as THREE.Group;
      const line = grp.userData.line;
      if (line) {
        const op = OPERATORS[line.name];
        const N = line.route.length;
        tooltipEl.innerHTML =
          `<div class="tt-name">${line.name}</div>` +
          `<div class="tt-meta">${op ? op[0] : '—'}<br>` +
          `${N} stops · ${line.cat}</div>`;
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = (e.clientX + 14) + 'px';
        tooltipEl.style.top = (e.clientY + 14) + 'px';
        document.body.style.cursor = 'pointer';
        return;
      }
    }
  }

  tooltipEl.style.display = 'none';
  document.body.style.cursor = '';
});

// 8) Double-click a station to fly down to it
renderer.domElement.addEventListener('dblclick', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(pickables, false);
  if (hit.length) {
    const cap = hit[0].object;
    for (const [, d] of Object.entries(cityData)) {
      if (d.cap === cap) {
        flyCamera(
          d.pos.clone().add(new THREE.Vector3(0, 1.2, 1.4)),
          d.pos.clone().setY(0),
        );
        return;
      }
    }
  }
});

// 9) View presets
document.getElementById('viewAll')!.addEventListener('click',
  () => flyCamera(new THREE.Vector3(-6, 38, 42), new THREE.Vector3(0, 0.5, 0)));
document.getElementById('viewLondon')!.addEventListener('click',
  () => flyCamera(new THREE.Vector3(0.7, 4, 8), new THREE.Vector3(-0.13, 0.3, 2.5 * 3.6)));
document.getElementById('viewScotland')!.addEventListener('click',
  () => flyCamera(new THREE.Vector3(-10, 10, 28), new THREE.Vector3(-3 * 3.6, 0.3, -3 * 3.6)));
document.getElementById('viewWales')!.addEventListener('click',
  () => flyCamera(new THREE.Vector3(-12, 7, 13), new THREE.Vector3(-3.5 * 3.6, 0.3, 2 * 3.6)));

// 10) Trains + roads toggles
document.getElementById('trainsBtn')!.addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  const on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  trains.setVisible(on);
});
// (refreshTrains button removed in the new panel; trains rebuild every 30 s in the tick loop)
document.getElementById('roadsBtn')!.addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  const on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  network.setRoadsVisible(on);
});
// Motorways hidden by default — but the user can toggle them on.
network.setRoadsVisible(false);

// 11) Live National Rail data via Huxley2
const live = createLiveData();

async function refreshLive() {
  const services = await live.refresh();
  const el = document.getElementById('dataStatus')!;
  if (live.isLive()) {
    const cancelled = services.filter((s) => s.isCancelled).length;
    const delayed = services.filter((s) => s.etaMinutes !== null && s.etaMinutes > 5).length;
    el.innerHTML =
      `<span style="color:#34d399">●</span> Live ` +
      `<span style="color:var(--line-dim);font-size:11px">` +
      `(${services.length} services · ${delayed} delayed · ${cancelled} cancelled)</span>`;
  } else {
    // Upstream likely down — surface the actual error
    const lastErr = (live.refresh as any).lastError ?? 'upstream offline';
    el.innerHTML =
      `<span style="color:#fbbf24">●</span> Simulated ` +
      `<span style="color:#ef4444;font-size:10px" title="Click ↻ to retry">${lastErr}</span> ` +
      `<button id="liveRetry" style="padding:1px 6px;font-size:10px;background:rgba(125,150,200,0.10);border:1px solid var(--border);color:var(--text);border-radius:4px;cursor:pointer;font-family:inherit">↻</button>`;
    const btn = document.getElementById('liveRetry');
    if (btn) btn.onclick = () => refreshLive();
  }
  // Show a small preview of currently-delayed services in the panel
  const delaysEl = document.getElementById('liveDelays');
  if (delaysEl) {
    const delayed = services.filter((s) => s.etaMinutes !== null && s.etaMinutes > 5);
    if (delayed.length === 0) {
      delaysEl.innerHTML = '<span style="color:var(--line-dim)">No live delays right now</span>';
    } else {
      delaysEl.innerHTML = delayed.slice(0, 6).map((s) =>
        `<div class="delay-item">` +
        `<b>${s.operator}</b> · ${s.origin.replace('London ', 'L.')} → ${s.destination.replace('London ', 'L.')}<br>` +
        `<span style="color:#ef4444">+${s.etaMinutes} min</span> · ${s.matchedLineName ?? '—'}` +
        `</div>`
      ).join('');
    }
  }
}
refreshLive();
setInterval(refreshLive, 60_000);   // refresh every minute

// 12) Animation loop
let lastTrainRebuild = 0;
let lastTrafficRefresh = 0;
function tick() {
  controls.update();
  const now = Date.now();
  if (now - lastTrainRebuild > 30_000) {
    trains.rebuild();
    lastTrainRebuild = now;
  }
  if (now - lastTrafficRefresh > 3000) {
    network.refreshTraffic();
    lastTrafficRefresh = now;
  }
  trains.update(now);
  ui.setTrainsLabel(trains.getVisibleTrains().filter((t) => t.group.visible).length);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();