import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Room } from './room.js';
import { RoomLights } from './lights.js';
import { Appliances } from './appliances.js';
import { UI } from './ui.js';
import { computeMetrics, computeInstantWatts } from './metrics.js';
import { DayCycle } from './daycycle.js';

/**
 * 慳電英雄 — Three.js room with day-cycle time play
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
scene.fog = new THREE.FogExp2(0x030306, 0.028);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  80
);
camera.position.set(3.2, 1.85, 3.6);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0.1, 1.35, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.4;
controls.maxDistance = 8.5;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minPolarAngle = 0.15;
controls.enablePan = false;
controls.update();

const room = new Room(scene);
const winPos = room.windowPos
  ? new THREE.Vector3(room.windowPos.x, room.windowPos.y, room.windowPos.z)
  : null;
const lights = new RoomLights(
  scene,
  room.ceilingAnchor,
  room.deskAnchor,
  room.bulbMesh,
  room.size,
  winPos
);
const appliances = new Appliances(room);
const dayCycle = new DayCycle();

const rim = new THREE.PointLight(0x334466, 1.0, 14, 2);
rim.position.set(2.2, 2.4, 2);
scene.add(rim);

/** @type {UI | null} */
let ui = null;

function syncDaylight() {
  const pal = dayCycle.getPalette();
  room.setDaylight(pal);
  lights.applyDaylight(pal);
  if (scene.fog) {
    scene.fog.color.copy(pal.fog);
    scene.fog.density =
      pal.phase === 'day' ? 0.012 : pal.phase === 'night' ? 0.032 : 0.02;
  }
  renderer.setClearColor(pal.fog.getHex(), 1);
  const bulbsOn = !!ui?.state?.type;
  renderer.toneMappingExposure = bulbsOn
    ? Math.max(pal.exposure, 1.05)
    : pal.exposure;
  rim.intensity = bulbsOn ? 0.15 : pal.phase === 'night' ? 1.0 : 0.2;
}

ui = new UI((state) => {
  const m = computeMetrics(state);
  lights.apply(state.type, state.count, m.lightFactor || 0);
  appliances.apply(state);
  syncDaylight();
  ui.renderSimStats(dayCycle, state.ratePerKwh);
}, dayCycle);

appliances.apply({
  acOn: false,
  fridgeOn: true,
  fanOn: false,
  fanPlacement: 'correct',
  fridgeFill: 'seventy',
  awayFromHeat: true,
});

syncDaylight();
ui.renderSimStats(dayCycle, ui.state.ratePerKwh);

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();
let raf = 0;
let lastUiSync = 0;
function tick() {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  appliances.update(dt);

  const watts = computeInstantWatts(ui.state);
  const wasPlaying = dayCycle.playing;
  dayCycle.tick(dt, watts);

  if (wasPlaying || dayCycle.playing) {
    syncDaylight();
    lastUiSync += dt;
    if (lastUiSync > 0.1) {
      lastUiSync = 0;
      ui.renderTimeControls(dayCycle);
      ui.renderSimStats(dayCycle, ui.state.ratePerKwh);
    }
  }

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
  window.__powerSave = { scene, camera, room, lights, appliances, ui, dayCycle };
}
