// Animated trains that follow each visible rail line based on a
// generated schedule anchored to wall-clock time. Each train is a real
// 3D mini-locomotive + 2 carriages, oriented along the line's tangent.

import * as THREE from 'three';
import { LINES } from '../data/lines';
import { OPERATORS } from '../data/operators';
import { makeGetPos } from './stations';

export interface TrainHandle {
  rebuild: () => void;
  setVisible: (on: boolean) => void;
  update: (nowMs: number) => void;
  getVisibleTrains: () => Array<{
    group: THREE.Group; curve: THREE.CatmullRomCurve3;
    departMs: number; arriveMs: number;
    lineName: string; operator: string; color: number;
  }>;
}

function buildMiniTrain(color: number): THREE.Group {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.4,
  });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const matLight = new THREE.MeshStandardMaterial({
    color: 0xfff5d0, emissive: 0xfff5d0, emissiveIntensity: 0.8,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.035), mat);
  body.position.set(0.04, 0.04, 0);
  grp.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.030), mat);
  nose.position.set(0.075, 0.035, 0);
  grp.add(nose);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.055, 0.028), mat);
  cab.position.set(0.012, 0.060, 0);
  grp.add(cab);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), matLight);
  head.position.set(0.088, 0.04, 0);
  grp.add(head);
  for (const w of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.022, 8), matDark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0.04 + w * 0.018, 0.005, 0);
    grp.add(wheel);
  }
  for (let i = 0; i < 2; i++) {
    const cz = -0.005 - i * 0.06;
    const car = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.038, 0.032), mat);
    car.position.set(cz, 0.038, 0);
    grp.add(car);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.005, 0.032), matDark);
    roof.position.set(cz, 0.058, 0);
    grp.add(roof);
    for (const w of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.022, 8), matDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(cz + w * 0.018, 0.005, 0);
      grp.add(wheel);
    }
  }
  return grp;
}

export function buildTrains(scene: THREE.Scene, cityData: Record<string, any>): TrainHandle {
  const getPos = makeGetPos(cityData);
  const trainGroup = new THREE.Group();
  scene.add(trainGroup);

  interface ActiveTrain {
    group: THREE.Group; curve: THREE.CatmullRomCurve3;
    departMs: number; arriveMs: number;
    lineName: string; operator: string; color: number;
  }
  const activeTrains: ActiveTrain[] = [];

  function buildAll(nowMs: number) {
    while (trainGroup.children.length) {
      const m = trainGroup.children[0];
      trainGroup.remove(m);
      m.traverse((c) => { (c as THREE.Mesh).geometry?.dispose(); });
    }
    activeTrains.length = 0;

    const dayStart = new Date(nowMs);
    dayStart.setHours(0, 0, 0, 0);
    const dayMs = dayStart.getTime();

    for (const line of LINES) {
      const pts = line.route.map((n) => getPos(n)).filter((p): p is THREE.Vector3 => !!p);
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      const freqMin = line.cat === 'main' ? 22 : line.cat === 'regional' ? 55 : 8;
      const durMin = Math.max(45, curve.getLength() * 5);
      const op = OPERATORS[line.name] ?? [line.name, line.color];
      let departMs = dayMs + 5 * 3600_000;
      let attempts = 0;
      while (departMs < dayMs + 24 * 3600_000 && attempts < 240) {
        const arriveMs = departMs + durMin * 60_000;
        if (nowMs >= departMs && nowMs <= arriveMs) {
          const grp = buildMiniTrain(op[1] as number);
          trainGroup.add(grp);
          activeTrains.push({
            group: grp, curve, departMs, arriveMs,
            lineName: line.name, operator: op[0] as string, color: op[1] as number,
          });
        }
        departMs += freqMin * 60_000;
        attempts++;
      }
    }
  }

  function update(nowMs: number) {
    for (const t of activeTrains) {
      if (nowMs < t.departMs || nowMs > t.arriveMs) { t.group.visible = false; continue; }
      const u = (nowMs - t.departMs) / (t.arriveMs - t.departMs);
      const pos = t.curve.getPointAt(u);
      const tan = t.curve.getTangentAt(u);
      t.group.position.x = pos.x;
      t.group.position.z = pos.z;
      t.group.position.y = 0.22;
      t.group.rotation.y = Math.atan2(-tan.z, tan.x);
      t.group.visible = true;
    }
  }

  buildAll(Date.now());

  return {
    rebuild: () => buildAll(Date.now()),
    setVisible: (on) => { trainGroup.visible = on; },
    update,
    getVisibleTrains: () => activeTrains,
  };
}