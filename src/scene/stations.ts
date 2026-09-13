// Builds 3D station pillars (small cylinder + glowing cap). Cities get a
// taller version with a blue colour; towns get a white short version.

import * as THREE from 'three';
import { proj } from './projection';
import type { City } from '../data/cities';
import { CITY_COORDS, LONDON_TERMINALS, WAYPOINT_CITIES } from '../data/coords';

const geoSmall = new THREE.CylinderGeometry(0.025, 0.025, 0.30, 8);
const geoMajor = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 10);
const geoSmallCap = new THREE.SphereGeometry(0.04, 8, 6);
const geoMajorCap = new THREE.SphereGeometry(0.06, 10, 8);
const matSmall = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0, roughness: 0.6, emissive: 0xe2e8f0, emissiveIntensity: 0.15,
});
const matMajor = new THREE.MeshStandardMaterial({
  color: 0x60a5fa, roughness: 0.6, emissive: 0x60a5fa, emissiveIntensity: 0.4,
});

export interface CityData {
  pos: THREE.Vector3;
  cap: THREE.Mesh;       // the part the raycaster hits for hover
  info: City | null;
}

export function buildStations(
  scene: THREE.Scene,
  cities: City[],
): { cityData: Record<string, CityData>; pickables: THREE.Mesh[] } {
  const group = new THREE.Group();
  scene.add(group);

  const cityData: Record<string, CityData> = {};
  const pickables: THREE.Mesh[] = [];

  for (const c of cities) {
    const [x, z] = proj(c.lng, c.lat);
    const isMajor = !!c.major;
    const pillar = new THREE.Mesh(isMajor ? geoMajor : geoSmall, isMajor ? matMajor : matSmall);
    pillar.position.y = isMajor ? 0.275 : 0.15;
    const cap = new THREE.Mesh(isMajor ? geoMajorCap : geoSmallCap, isMajor ? matMajor : matSmall);
    cap.position.y = isMajor ? 0.55 : 0.30;
    const item = new THREE.Group();
    item.add(pillar);
    item.add(cap);
    item.position.set(x, 0, z);
    group.add(item);
    cityData[c.name] = { pos: item.position.clone().setY(0.20), cap, info: c };
    pickables.push(cap);
  }

  // Add waypoint stations that aren't already cities
  for (const [name, pair] of Object.entries(WAYPOINT_CITIES)) {
    if (cityData[name]) continue;
    const [x, z] = proj(pair[0], pair[1]);
    const item = new THREE.Group();
    const pillar = new THREE.Mesh(geoSmall, matSmall);
    pillar.position.y = 0.15;
    const cap = new THREE.Mesh(geoSmallCap, matSmall);
    cap.position.y = 0.30;
    item.add(pillar);
    item.add(cap);
    item.position.set(x, 0, z);
    group.add(item);
    cityData[name] = { pos: item.position.clone().setY(0.20), cap, info: null };
    pickables.push(cap);
  }
  for (const [name, pair] of Object.entries(LONDON_TERMINALS)) {
    if (cityData[name]) continue;
    const [x, z] = proj(pair[0], pair[1]);
    const item = new THREE.Group();
    const pillar = new THREE.Mesh(geoSmall, matSmall);
    pillar.position.y = 0.15;
    const cap = new THREE.Mesh(geoSmallCap, matSmall);
    cap.position.y = 0.30;
    item.add(pillar);
    item.add(cap);
    item.position.set(x, 0, z);
    group.add(item);
    cityData[name] = { pos: item.position.clone().setY(0.20), cap, info: null };
    pickables.push(cap);
  }

  return { cityData, pickables };
}

// Look up a station's 3D position by name (resolved from cities,
// waypoints, or London terminals).
export function makeGetPos(cityData: Record<string, CityData>) {
  const cache = new Map<string, THREE.Vector3>();
  return (name: string): THREE.Vector3 | null => {
    if (cache.has(name)) return cache.get(name)!;
    if (cityData[name]) {
      cache.set(name, cityData[name].pos);
      return cityData[name].pos;
    }
    const pair = (CITY_COORDS[name] ?? LONDON_TERMINALS[name] ?? WAYPOINT_CITIES[name]) as [number, number] | undefined;
    if (!pair) return null;
    const [x, z] = proj(pair[0], pair[1]);
    const v = new THREE.Vector3(x, 0.21, z);
    cache.set(name, v);
    return v;
  };
}