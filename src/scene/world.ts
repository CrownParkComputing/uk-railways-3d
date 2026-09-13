// Sets up the renderer / scene / camera / OrbitControls.
// All other modules attach to the returned scene.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface World {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  flyCamera: (toPos: THREE.Vector3, toTarget: THREE.Vector3, durMs?: number) => void;
  dispose: () => void;
}

export function createWorld(container: HTMLElement): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1422);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(-12, 60, 80);   // higher + further for SCALE=3.6

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 110;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.target.set(0, 0.5, 0);

  // Soft, slightly directional lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  sun.position.set(12, 28, 14);
  scene.add(sun);

  // Smooth camera flyTo helper
  function flyCamera(toPos: THREE.Vector3, toTarget: THREE.Vector3, durMs = 700) {
    const sp = camera.position.clone();
    const st = controls.target.clone();
    const t0 = performance.now();
    (function step() {
      const t = Math.min(1, (performance.now() - t0) / durMs);
      const e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(sp, toPos, e);
      controls.target.lerpVectors(st, toTarget, e);
      controls.update();
      if (t < 1) requestAnimationFrame(step);
    })();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    scene, camera, renderer, controls, flyCamera,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
  };
}