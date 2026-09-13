// Builds the extruded 3D land masses (GB + Ireland) and the coastline
// outline strokes. The raised top surface is at y = 0.20.

import * as THREE from 'three';
import { proj } from './projection';
import { GB, IRELAND } from './coastlines';

function makeLand(points: [number, number][], color: number) {
  const shape = new THREE.Shape();
  shape.moveTo(proj(points[0][0], points[0][1])[0], proj(points[0][0], points[0][1])[1]);
  for (let i = 1; i < points.length; i++) {
    const [x, z] = proj(points[i][0], points[i][1]);
    shape.lineTo(x, z);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.20, bevelEnabled: false, curveSegments: 16, steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.20, 0);   // sit on y=0
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, roughness: 0.92, metalness: 0.05,
  }));
}

function makeCoast(points: [number, number][], color: number, opacity = 0.8) {
  const pts = points.map(([lng, lat]) => {
    const [x, z] = proj(lng, lat);
    return new THREE.Vector3(x, 0.22, z);
  });
  pts.push(pts[0].clone());
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

// Land material: matte so the directional light doesn't make it look
// like an oily puddle — no specular sheen, no reflection, just flat colour.
const landMat = new THREE.MeshStandardMaterial({
  color: 0x2e3f5e, roughness: 1.0, metalness: 0.0, flatShading: false,
});

export function buildLand(scene: THREE.Scene) {
  scene.add(makeLand(GB, 0x2e3f5e, landMat));
  const ireMat = landMat.clone(); ireMat.color.setHex(0x2a3a55);
  scene.add(makeLand(IRELAND, 0x2a3a55, ireMat));
  scene.add(makeCoast(GB, 0x4a7090));
  scene.add(makeCoast(IRELAND, 0x3a5870, 0.5));
}