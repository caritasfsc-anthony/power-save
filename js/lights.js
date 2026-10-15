import * as THREE from 'three';
import { BULB_PRESETS } from './metrics.js';

/**
 * Ceiling fixture lights + optional desk lamp.
 * PointLight (fill) + SpotLight (pool) for readable shadows.
 */

export class RoomLights {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Object3D} ceilingAnchor
   * @param {THREE.Object3D} deskAnchor
   * @param {THREE.Mesh} bulbMesh
   */
  constructor(scene, ceilingAnchor, deskAnchor, bulbMesh) {
    this.scene = scene;
    this.ceilingAnchor = ceilingAnchor;
    this.deskAnchor = deskAnchor;
    this.bulbMesh = bulbMesh;

    this.mainPoint = new THREE.PointLight(0xffffff, 0, 18, 1.6);
    this.mainPoint.castShadow = true;
    this.mainPoint.shadow.mapSize.set(1024, 1024);
    this.mainPoint.shadow.bias = -0.0008;
    this.mainPoint.shadow.normalBias = 0.02;
    this.mainPoint.visible = false;
    ceilingAnchor.add(this.mainPoint);
    this.mainPoint.position.set(0, -0.15, 0);

    this.mainSpot = new THREE.SpotLight(0xffffff, 0, 20, Math.PI / 3.2, 0.45, 1.4);
    this.mainSpot.castShadow = true;
    this.mainSpot.shadow.mapSize.set(1024, 1024);
    this.mainSpot.shadow.bias = -0.0005;
    this.mainSpot.visible = false;
    ceilingAnchor.add(this.mainSpot);
    this.mainSpot.position.set(0, -0.2, 0);
    this.mainSpot.target.position.set(0, -4, 0);
    ceilingAnchor.add(this.mainSpot.target);

    this.deskPoint = new THREE.PointLight(0xffffff, 0, 6, 2);
    this.deskPoint.castShadow = false;
    this.deskPoint.visible = false;
    deskAnchor.add(this.deskPoint);
    this.deskPoint.position.set(0, 0.35, 0);

    this.fill = new THREE.AmbientLight(0x1a1c28, 0.08);
    scene.add(this.fill);

    this.hemi = new THREE.HemisphereLight(0x2a3040, 0x08060a, 0.12);
    scene.add(this.hemi);

    this._type = null;
    this._count = 1;
  }

  get isOn() {
    return this._type != null;
  }

  /**
   * @param {import('./metrics.js').BulbType | null} type
   * @param {number} count 1–8
   * @param {number} lightFactor relative brightness from computeMetrics
   */
  apply(type, count, lightFactor) {
    this._type = type;
    this._count = count;

    if (!type) {
      this._setOff();
      return;
    }

    const preset = BULB_PRESETS[type];
    const color = new THREE.Color(preset.color);
    const factor = Math.max(0.05, lightFactor || 1);
    const countBoost = 0.55 + count * 0.28;
    const pointI = 26 * factor * countBoost;
    const spotI = 16 * factor * countBoost;
    const deskI = count >= 2 ? 4.2 * factor : 0;

    this.mainPoint.color.copy(color);
    this.mainSpot.color.copy(color);
    this.deskPoint.color.copy(color);

    this.mainPoint.intensity = pointI;
    this.mainSpot.intensity = spotI;
    this.deskPoint.intensity = deskI;

    this.mainPoint.visible = true;
    this.mainSpot.visible = true;
    this.deskPoint.visible = deskI > 0;

    this.fill.intensity = 0.04 + Math.min(0.12, count * 0.015);
    this.hemi.intensity = 0.08 + Math.min(0.18, count * 0.02);

    if (this.bulbMesh?.material) {
      const mat = this.bulbMesh.material;
      mat.emissive.copy(color);
      mat.emissiveIntensity =
        type === 'incandescent' ? 2.4 + count * 0.12 : 1.5 + count * 0.1;
      mat.color.copy(color);
      this.bulbMesh.visible = true;
    }
  }

  _setOff() {
    this.mainPoint.intensity = 0;
    this.mainSpot.intensity = 0;
    this.deskPoint.intensity = 0;
    this.mainPoint.visible = false;
    this.mainSpot.visible = false;
    this.deskPoint.visible = false;
    this.fill.intensity = 0.06;
    this.hemi.intensity = 0.1;

    if (this.bulbMesh?.material) {
      this.bulbMesh.material.emissive.setHex(0x000000);
      this.bulbMesh.material.emissiveIntensity = 0;
      this.bulbMesh.material.color.setHex(0x222228);
      this.bulbMesh.visible = true;
    }
  }

  dispose() {
    this.mainPoint.shadow?.map?.dispose?.();
    this.mainSpot.shadow?.map?.dispose?.();
    this.ceilingAnchor.remove(this.mainPoint, this.mainSpot, this.mainSpot.target);
    this.deskAnchor.remove(this.deskPoint);
    this.scene.remove(this.fill, this.hemi);
  }
}
