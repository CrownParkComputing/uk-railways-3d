// Side panel for the UK Railways 3D map. Redesigned to surface
// every option on screen at once: layer toggles, operator chips,
// region chips, map-overlay toggles, view presets, and a
// scrollable per-line legend.

import { LINES } from './data/lines';
import { OPERATORS } from './data/operators';
import type { NetworkHandle } from './scene/network';

export interface UIHandle {
  refreshStats: () => void;
  wireNetwork: (net: NetworkHandle) => () => void;
  setTrainsLabel: (n: number) => void;
  setOperatorFilter: (filter: Set<string> | null) => void;
  setRegionFilter: (filter: Set<string> | null) => void;
  setColorMode: (mode: 'operator' | 'region' | 'status') => void;
}

const OPERATOR_NAMES = [
  'Avanti West Coast',
  'LNER',
  'East Midlands Railway',
  'Great Western Railway',
  'CrossCountry',
  'Chiltern Railways',
  'Greater Anglia',
  'TransPennine Express',
  'South Western Railway',
  'Southern',
  'Southeastern',
  'ScotRail',
  'Northern',
  'Transport for Wales',
  'Merseyrail',
  'c2c',
  'Heathrow Express',
  'Eurostar',
  'Elizabeth line',
  'London Underground',
];

// Lines → region buckets (by where they primarily serve)
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

export function buildUI(): UIHandle {
  const root = document.createElement('div');
  root.id = 'ui';
  root.innerHTML = `
    <h1>UK Rail Network</h1>
    <div class="subtitle">British Isles · 3D Map</div>
    <div class="row"><span>Cities highlighted</span><strong id="cityCount">0</strong></div>
    <div class="row"><span>Lines shown</span><strong id="lineCount">0 / 0</strong></div>
    <div class="row"><span>Trains moving</span><strong id="trainCount">0</strong></div>
    <div class="row"><span>Network length</span><strong id="netLength">0 mi</strong></div>
    <div class="row"><span>Data</span><strong id="dataStatus">…</strong></div>
    <div id="liveDelays" style="margin-top:6px;font-size:11px;line-height:1.4;max-height:160px;overflow-y:auto;"></div>

    <div class="section">Layers</div>
    <div class="btnrow">
      <button class="btn on" id="layerMain">Main</button>
      <button class="btn" id="layerReg">Regional</button>
      <button class="btn" id="layerLon">London</button>
    </div>

    <div class="section">Color by</div>
    <div class="btnrow">
      <button class="btn on" id="colorOp">Operator</button>
      <button class="btn" id="colorReg">Region</button>
      <button class="btn" id="colorStatus">Status</button>
    </div>

    <div class="section">Operator filter</div>
    <div id="operatorChips" class="chip-row"></div>

    <div class="section">Region filter</div>
    <div id="regionChips" class="chip-row"></div>

    <div class="section">Map overlay</div>
    <div class="btnrow">
      <button class="btn on" id="trainsBtn">🚂 Trains</button>
      <button class="btn" id="roadsBtn">🛣 Motorways</button>
      <button class="btn" id="gridBtn">▦ Grid</button>
    </div>

    <div class="section">View</div>
    <div class="btnrow">
      <button class="btn" id="viewAll">🌍 Whole map</button>
      <button class="btn" id="viewLondon">🔍 London</button>
    </div>
    <div class="btnrow">
      <button class="btn" id="viewScotland">🔍 Scotland</button>
      <button class="btn" id="viewWales">🔍 Wales</button>
    </div>

    <div class="section">All lines</div>
    <div class="row" style="font-size:11px;color:var(--line-dim)">
      <span>Click a line to toggle it.</span>
      <span id="lineSummary"></span>
    </div>
    <input id="lineSearch" type="text" placeholder="Search lines…" style="
      width:100%;box-sizing:border-box;margin:4px 0 6px 0;
      background:rgba(125,150,200,0.10);border:1px solid var(--border);
      color:var(--text);padding:5px 8px;border-radius:6px;
      font-family:inherit;font-size:12px;" />
    <div id="legend"></div>
  `;
  document.body.appendChild(root);

  // Bottom help strip
  const help = document.createElement('div');
  help.id = 'help';
  help.innerHTML = `<kbd>Drag</kbd> pan &nbsp; <kbd>Scroll</kbd> zoom &nbsp; <kbd>Right-drag</kbd> rotate &nbsp; <kbd>Double-click</kbd> zoom to station`;
  document.body.appendChild(help);

  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  document.body.appendChild(tooltip);

  // Build operator chips with brand colours
  const operatorChips = root.querySelector('#operatorChips')!;
  const operatorSet = new Set<string>();
  for (const op of OPERATOR_NAMES) {
    const linesForOp = LINES.filter((l) => OPERATORS[l.name]?.[0] === op);
    if (linesForOp.length === 0) continue;
    const colour = '#' + OPERATORS[linesForOp[0].name]![1].toString(16).padStart(6, '0');
    const chip = document.createElement('button');
    chip.className = 'op-chip';
    chip.dataset.op = op;
    chip.style.cssText = `
      background: rgba(125,150,200,0.08);
      border: 1px solid rgba(140,170,210,0.20);
      color: var(--line); padding: 3px 7px; border-radius: 5px;
      font-size: 10.5px; cursor: pointer; margin: 2px;
      display: inline-block; transition: all 0.15s;
    `;
    chip.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colour};margin-right:4px;vertical-align:middle"></span>${op}`;
    chip.addEventListener('click', () => {
      if (operatorSet.has(op)) { operatorSet.delete(op); chip.style.opacity = '0.35'; }
      else { operatorSet.add(op); chip.style.opacity = '1'; }
      handleOperator?.(operatorSet.size ? operatorSet : null);
    });
    operatorChips.appendChild(chip);
  }

  // Build region chips
  const regionChips = root.querySelector('#regionChips')!;
  const REGIONS = ['South East', 'Wales', 'Scotland', 'Merseyside', 'North', 'Midlands', 'Other'];
  const regionSet = new Set<string>();
  for (const region of REGIONS) {
    const linesInRegion = LINES.filter((l) => regionOf(l.name) === region);
    if (linesInRegion.length === 0) continue;
    const chip = document.createElement('button');
    chip.className = 'reg-chip';
    chip.dataset.region = region;
    chip.style.cssText = `
      background: rgba(125,150,200,0.08);
      border: 1px solid rgba(140,170,210,0.20);
      color: var(--line); padding: 3px 7px; border-radius: 5px;
      font-size: 10.5px; cursor: pointer; margin: 2px;
      display: inline-block; transition: all 0.15s;
    `;
    chip.innerHTML = `<b>${region}</b> <span style="color:var(--line-dim)">${linesInRegion.length}</span>`;
    chip.addEventListener('click', () => {
      if (regionSet.has(region)) { regionSet.delete(region); chip.style.opacity = '0.35'; }
      else { regionSet.add(region); chip.style.opacity = '1'; }
      handleRegion?.(regionSet.size ? regionSet : null);
    });
    regionChips.appendChild(chip);
  }

  // Build line legend with search
  const legend = root.querySelector('#legend') as HTMLElement;
  const lineSearch = root.querySelector('#lineSearch') as HTMLInputElement;
  function renderLegend(filter: string) {
    legend.innerHTML = '';
    const f = filter.trim().toLowerCase();
    let shown = 0;
    for (const line of LINES) {
      if (f && !line.name.toLowerCase().includes(f)) continue;
      const row = document.createElement('div');
      row.className = 'lg-row';
      row.dataset.line = line.name;
      const op = OPERATORS[line.name]?.[0] ?? '—';
      const region = regionOf(line.name);
      const hex = line.color.toString(16).padStart(6, '0');
      row.innerHTML = `
        <div class="lg-swatch" style="background:#${hex}"></div>
        <div style="flex:1;min-width:0">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${line.name}</div>
          <div style="font-size:9.5px;color:var(--line-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${op} · ${region}</div>
        </div>`;
      row.addEventListener('click', () => {
        row.classList.toggle('off');
        const isOff = row.classList.contains('off');
        handleLine?.(line.name, !isOff);
      });
      legend.appendChild(row);
      shown++;
    }
    const sumEl = document.getElementById('lineSummary');
    if (sumEl) sumEl.textContent = `${shown} shown`;
  }
  renderLegend('');
  lineSearch.addEventListener('input', () => renderLegend(lineSearch.value));

  let handleNetwork: ((net: NetworkHandle) => void) | null = null;
  let handleLine: ((name: string, on: boolean) => void) | null = null;
  let handleOperator: ((opSet: Set<string> | null) => void) | null = null;
  let handleRegion: ((regSet: Set<string> | null) => void) | null = null;

  return {
    refreshStats() {
      const visible = document.querySelectorAll('.lg-row:not(.off)').length;
      const total = LINES.length;
      document.getElementById('lineCount')!.textContent = `${visible} / ${total}`;
    },
    wireNetwork(net: NetworkHandle) {
      handleNetwork = () => {};
      handleLine = (name, on) => net.setLineVisible(name, on);
      handleOperator = (set) => net.setOperatorFilter(set);
      handleRegion = (set) => net.setRegionFilter(set);
      // Layer toggles
      document.getElementById('layerMain')!.addEventListener('click', () => toggle('layerMain', 'main'));
      document.getElementById('layerReg')!.addEventListener('click', () => toggle('layerReg', 'regional'));
      document.getElementById('layerLon')!.addEventListener('click', () => toggle('layerLon', 'london'));
      function toggle(btnId: string, cat: 'main' | 'regional' | 'london') {
        const btn = document.getElementById(btnId)!;
        const on = !btn.classList.contains('on');
        btn.classList.toggle('on', on);
        net.setCategoryVisible(cat, on);
      }
      return () => {};
    },
    setTrainsLabel(n) {
      document.getElementById('trainCount')!.textContent = String(n);
    },
    setOperatorFilter(set) { handleOperator?.(set); },
    setRegionFilter(set) { handleRegion?.(set); },
    setColorMode(mode) {
      ['colorOp', 'colorReg', 'colorStatus'].forEach((id) => {
        const b = document.getElementById(id)!;
        b.classList.toggle('on', id === 'colorOp' && mode === 'operator' || id === 'colorReg' && mode === 'region' || id === 'colorStatus' && mode === 'status');
      });
    },
  };
}