import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Room } from './room.js';
import { RoomLights } from './lights.js';
import { Appliances } from './appliances.js';
import { UI } from './ui.js';
import { computeMetrics } from './metrics.js';

/**
 * 慳電英雄 — Three.js dark-room experience
 */

const canvas = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x030306, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030306, 0.035);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  60
);
camera.position.set(2.8, 1.75, 4.2);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0.2, 1.2, -0.5);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.2;
controls.maxDistance = 7.5;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minPolarAngle = 0.2;
controls.enablePan = false;
controls.update();

const room = new Room(scene);
const lights = new RoomLights(
  scene,
  room.ceilingAnchor,
  room.deskAnchor,
  room.bulbMesh
);
const appliances = new Appliances(room);

// Very faint rim so user sees silhouette before choosing a bulb
const rim = new THREE.PointLight(0x334466, 1.2, 14, 2);
rim.position.set(-2.5, 2.4, 2);
scene.add(rim);

const ui = new UI((state) => {
  const m = computeMetrics(state);
  lights.apply(state.type, state.count, m.lightFactor || 0);
  appliances.apply({ acOn: state.acOn, fridgeOn: state.fridgeOn });

  // Dim rim when room is lit so bulb dominates
  rim.intensity = state.type ? 0.25 : 1.2;

  // Slight exposure bump when lit
  renderer.toneMappingExposure = state.type ? 1.15 : 0.95;
});

// Apply default appliance visuals (fridge ON)
appliances.apply({ acOn: false, fridgeOn: true });

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);

let raf = 0;
function tick() {
  raf = requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
}
tick();

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(raf);
  controls.dispose();
  lights.dispose();
  room.dispose();
  renderer.dispose();
});

if (import.meta.env.DEV) {
  window.__powerSave = { scene, camera, room, lights, appliances, ui };
}
