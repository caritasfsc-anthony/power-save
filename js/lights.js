import * as THREE from 'three';
import { BULB_PRESETS } from './metrics.js';

/**
 * Ceiling fixture lights + desk lamp + window daylight from day-cycle.
 */

export class RoomLights {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Object3D} ceilingAnchor
   * @param {THREE.Object3D} deskAnchor
   * @param {THREE.Mesh} bulbMesh
   * @param {{ W: number, D: number, H: number }} roomSize
   * @param {THREE.Vector3 | null} windowPos
   */
  constructor(scene, ceilingAnchor, deskAnchor, bulbMesh, roomSize, windowPos) {
    this.scene = scene;
    this.ceilingAnchor = ceilingAnchor;
    this.deskAnchor = deskAnchor;
    this.bulbMesh = bulbMesh;
    this.roomSize = roomSize;

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

    // Daylight entering from the window wall (left / −X)
    const wx = windowPos?.x ?? -roomSize.W / 2 + 0.2;
    const wy = windowPos?.y ?? roomSize.H * 0.65;
    const wz = windowPos?.z ?? 0;

    this.windowDir = new THREE.DirectionalLight(0xfff0e0, 0);
    this.windowDir.position.set(wx - 2.5, wy + 0.5, wz);
    this.windowDir.target.position.set(0.5, 1.0, 0.2);
    this.windowDir.castShadow = true;
    this.windowDir.shadow.mapSize.set(1024, 1024);
    this.windowDir.shadow.bias = -0.0005;
    this.windowDir.shadow.camera.near = 0.5;
    this.windowDir.shadow.camera.far = 16;
    this.windowDir.shadow.camera.left = -5;
    this.windowDir.shadow.camera.right = 5;
    this.windowDir.shadow.camera.top = 4;
    this.windowDir.shadow.camera.bottom = -2;
    scene.add(this.windowDir);
    scene.add(this.windowDir.target);

    this.windowFill = new THREE.PointLight(0xc8dcff, 0, 12, 1.8);
    this.windowFill.position.set(wx + 0.4, wy - 0.2, wz);
    this.windowFill.castShadow = false;
    scene.add(this.windowFill);

    this._type = null;
    this._count = 1;
    this._bulbFactor = 0;
    this._dayPalette = null;
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
    this._bulbFactor = lightFactor || 0;

    if (!type) {
      this._setBulbsOff();
    } else {
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

      if (this.bulbMesh?.material) {
        const mat = this.bulbMesh.material;
        mat.emissive.copy(color);
        mat.emissiveIntensity =
          type === 'incandescent' ? 2.4 + count * 0.12 : 1.5 + count * 0.1;
        mat.color.copy(color);
        this.bulbMesh.visible = true;
      }
    }

    this._applyAmbientCombo();
  }

  /**
   * @param {ReturnType<import('./daycycle.js').skyPalette>} palette
   */
  applyDaylight(palette) {
    this._dayPalette = palette;
    const dirI = palette.windowDir || 0;
    this.windowDir.intensity = dirI;
    this.windowDir.color.copy(palette.windowColor || palette.sky);
    this.windowFill.intensity = dirI * 2.2;
    this.windowFill.color.copy(palette.windowColor || palette.sky);
    this.windowDir.visible = dirI > 0.02;
    this.windowFill.visible = dirI > 0.02;

    this.hemi.color.copy(palette.hemiSky);
    this.hemi.groundColor.copy(palette.hemiGround);

    this._applyAmbientCombo();
  }

  _applyAmbientCombo() {
    const day = this._dayPalette;
    const dayAmb = day?.ambient ?? 0.06;
    const dayHemi = day?.hemiIntensity ?? 0.1;
    const bulbsOn = !!this._type;
    const count = this._count || 1;

    if (bulbsOn) {
      this.fill.intensity = dayAmb * 0.55 + 0.04 + Math.min(0.12, count * 0.015);
      this.hemi.intensity = dayHemi * 0.45 + 0.08 + Math.min(0.18, count * 0.02);
    } else {
      // Daytime still lights the room through the window
      this.fill.intensity = Math.max(0.05, dayAmb);
      this.hemi.intensity = Math.max(0.08, dayHemi);
    }
  }

  _setBulbsOff() {
    this.mainPoint.intensity = 0;
    this.mainSpot.intensity = 0;
    this.deskPoint.intensity = 0;
    this.mainPoint.visible = false;
    this.mainSpot.visible = false;
    this.deskPoint.visible = false;

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
    this.windowDir.shadow?.map?.dispose?.();
    this.ceilingAnchor.remove(this.mainPoint, this.mainSpot, this.mainSpot.target);
    this.deskAnchor.remove(this.deskPoint);
    this.scene.remove(this.fill, this.hemi, this.windowDir, this.windowDir.target, this.windowFill);
  }
}
