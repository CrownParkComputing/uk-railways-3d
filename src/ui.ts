// Side panel: stats, layer/view toggle buttons, and a clickable
// legend that toggles individual rail lines on/off.

import { LINES } from './data/lines';
import type { NetworkHandle } from './scene/network';

export interface UIHandle {
  refreshStats: () => void;
  wireNetwork: (net: NetworkHandle) => () => void;
  setTrainsLabel: (n: number) => void;
}

export function buildUI(): UIHandle {
  const root = document.createElement('div');
  root.id = 'ui';
  root.innerHTML = `
    <h1>UK Rail Network</h1>
    <div class="subtitle">British Isles · 3D Map</div>
    <div class="row"><span>Cities highlighted</span><strong id="cityCount">0</strong></div>
    <div class="row"><span>Railway lines</span><strong id="lineCount">0 / 0</strong></div>
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

    <div class="section">View</div>
    <div class="btnrow">
      <button class="btn" id="viewAll">🌍 Whole map</button>
      <button class="btn" id="viewLondon">🔍 London</button>
    </div>
    <div class="btnrow">
      <button class="btn" id="viewScotland">🔍 Scotland</button>
      <button class="btn" id="viewWales">🔍 Wales</button>
    </div>

    <div class="section">Trains</div>
    <div class="btnrow">
      <button class="btn on" id="trainsBtn">🚂 Show trains</button>
      <button class="btn" id="refreshTrains">↻ Refresh</button>
    </div>

    <div class="section">Map overlay</div>
    <div class="btnrow">
      <button class="btn" id="roadsBtn">🛣 Motorways</button>
    </div>
    <div class="row" style="margin-top:6px;font-size:11px;color:var(--line-dim)">
      <span>Traffic:</span>
      <span>
        <span style="color:#003B8E">●</span> free &nbsp;
        <span style="color:#ef4444">●</span> delayed
      </span>
    </div>

    <div class="section">Major lines</div>
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

  // Legend
  const legend = root.querySelector('#legend') as HTMLElement;
  for (const line of LINES) {
    const row = document.createElement('div');
    row.className = 'lg-row';
    row.dataset.line = line.name;
    const hex = line.color.toString(16).padStart(6, '0');
    row.innerHTML = `<div class="lg-swatch" style="background:#${hex}"></div><span>${line.name}</span>`;
    row.addEventListener('click', () => {
      row.classList.toggle('off');
      const isOff = row.classList.contains('off');
      handleLine?.(line.name, !isOff);
    });
    legend.appendChild(row);
  }

  let handleLine: ((name: string, on: boolean) => void) | null = null;

  return {
    refreshStats() {
      const active = document.querySelectorAll('.lg-row:not(.off)').length;
      const total = LINES.length;
      document.getElementById('lineCount')!.textContent = `${active} / ${total}`;
    },
    wireNetwork(net: NetworkHandle) {
      handleLine = (name, on) => net.setLineVisible(name, on);
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
  };
}