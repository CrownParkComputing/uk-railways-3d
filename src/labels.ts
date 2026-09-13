// HTML overlay labels that float above 3D objects (trains and cities).
// Each label is positioned every frame by projecting its world anchor
// into screen coordinates. Three sizes: large / medium / small.

import * as THREE from 'three';
import type { City } from './data/cities';

export type LabelSize = 'large' | 'medium' | 'small';

export interface LabelHandle {
  setSize: (size: LabelSize) => void;
  setTrainsVisible: (on: boolean) => void;
  setCityNamesVisible: (on: boolean) => void;
  rebuildCityLabels: (cities: City[]) => void;
  rebuildTrainLabels: (
    trains: Array<{
      group: THREE.Object3D; lineName: string; operator: string;
    }>,
  ) => void;
  update: (camera: THREE.Camera) => void;
}

const SIZES: Record<LabelSize, string> = {
  large:  '15px',
  medium: '11px',
  small:  '8.5px',
};

export function buildLabels(): LabelHandle {
  const container = document.createElement('div');
  container.id = 'labels';
  container.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 5; overflow: hidden;
  `;
  document.body.appendChild(container);

  // Persistent CSS for label elements
  const style = document.createElement('style');
  style.textContent = `
    .map-label {
      position: absolute;
      transform: translate(-50%, -100%);
      color: #f1f5f9;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-weight: 500;
      letter-spacing: 0.02em;
      white-space: nowrap;
      pointer-events: none;
      text-shadow: 0 0 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95);
      transition: opacity 0.2s;
    }
    .map-label.train-flag {
      color: #fff;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(2px);
    }
    .map-label.major-city {
      color: #60a5fa;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
  `;
  document.head.appendChild(style);

  interface CityLabel { el: HTMLDivElement; pos: THREE.Vector3; }
  interface TrainLabel { el: HTMLDivElement; obj: THREE.Object3D; }

  let cityLabels: CityLabel[] = [];
  let trainLabels: TrainLabel[] = [];
  let size: LabelSize = 'medium';
  let showTrains = true;
  let showCityNames = false;

  function refreshStyles() {
    const fs = SIZES[size];
    for (const l of cityLabels) l.el.style.fontSize = fs;
    for (const l of trainLabels) l.el.style.fontSize = fs;
  }

  function rebuildCityLabels(cities: City[]) {
    cityLabels.forEach((l) => l.el.remove());
    cityLabels = [];
    for (const c of cities) {
      if (!c.major) continue;
      const el = document.createElement('div');
      el.className = 'map-label major-city';
      el.textContent = c.name;
      el.style.fontSize = SIZES[size];
      el.style.display = showCityNames ? 'block' : 'none';
      container.appendChild(el);
      const [lng, lat] = [c.lng ?? 0, c.lat ?? 0];
      // Position is updated each frame from the cities map; for now
      // store a placeholder; we'll fix once we know the world position
      const pos = new THREE.Vector3();
      cityLabels.push({ el, pos });
    }
  }

  function rebuildTrainLabels(
    trains: Array<{ group: THREE.Object3D; lineName: string; operator: string }>,
  ) {
    trainLabels.forEach((l) => l.el.remove());
    trainLabels = [];
    for (const t of trains) {
      const el = document.createElement('div');
      el.className = 'map-label train-flag';
      el.textContent = t.operator;
      el.style.fontSize = SIZES[size];
      el.style.display = showTrains ? 'block' : 'none';
      container.appendChild(el);
      trainLabels.push({ el, obj: t.group });
    }
  }

  const tmp = new THREE.Vector3();
  function update(camera: THREE.Camera) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (showCityNames) {
      for (const l of cityLabels) {
        tmp.copy(l.pos).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * w;
        const y = (-tmp.y * 0.5 + 0.5) * h;
        const behind = tmp.z > 1;
        l.el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 100%))`;
        l.el.style.opacity = behind ? '0' : '1';
      }
    }
    if (showTrains) {
      for (const l of trainLabels) {
        tmp.set(0, 0.18, 0).applyMatrix4(l.obj.matrixWorld).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * w;
        const y = (-tmp.y * 0.5 + 0.5) * h;
        const behind = tmp.z > 1;
        l.el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 100%))`;
        l.el.style.opacity = behind ? '0' : '1';
      }
    }
  }

  return {
    setSize(s) { size = s; refreshStyles(); },
    setTrainsVisible(on) {
      showTrains = on;
      for (const l of trainLabels) l.el.style.display = on ? 'block' : 'none';
    },
    setCityNamesVisible(on) {
      showCityNames = on;
      for (const l of cityLabels) l.el.style.display = on ? 'block' : 'none';
    },
    rebuildCityLabels,
    rebuildTrainLabels,
    update,
  };
}

// Helper to attach city world-positions into the label list.
// (We rebuild labels once we know each city's 3D position from the
// stations builder — see main.ts.)
export function setCityPositions(labels: { el: HTMLDivElement; pos: THREE.Vector3 }[], positions: THREE.Vector3[]): void {
  for (let i = 0; i < labels.length && i < positions.length; i++) {
    labels[i].pos.copy(positions[i]);
  }
}

// Re-export so the types are available.
export type { City } from './data/cities';