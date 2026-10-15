import * as THREE from 'three';
import { APPLIANCE_WATTS } from './metrics.js';

/**
 * Window AC + fridge + circulation fan power states and visual feedback.
 * Teaching defaults (HK-ish averages, labeled 約計).
 */
export const APPLIANCE_PRESETS = {
  ac: {
    id: 'ac',
    name: '窗口式冷氣',
    watts: APPLIANCE_WATTS.ac,
    hoursMode: 'slider',
    tip: '冷氣開緊：調高一兩度、配合循環扇，通常更慳電。',
  },
  fridge: {
    id: 'fridge',
    name: '雪櫃',
    watts: APPLIANCE_WATTS.fridge,
    hoursMode: '24',
    tip: '雪櫃係全日最勤力嘅家電；七分滿、熱嘢放涼、少開關門更慳電。',
  },
  fan: {
    id: 'fan',
    name: '循環扇',
    watts: APPLIANCE_WATTS.fan,
    hoursMode: 'slider',
    tip: '循環扇係冷氣嘅神隊友——擺喺出風口下方、仰角吹向室內中央。',
  },
};

export class Appliances {
  /**
   * @param {import('./room.js').Room} room
   */
  constructor(room) {
    this.room = room;
    this.acOn = false;
    this.fridgeOn = true;
    this.fanOn = false;
    this.fanPlacement = /** @type {'correct' | 'wrong'} */ ('correct');
    this.fridgeFill = /** @type {'empty' | 'seventy' | 'stuffed'} */ ('seventy');
    this.awayFromHeat = true;

    this._acLed = room.acLedMat || null;
    this._fridgeLed = room.fridgeLedMat || null;
    this._acCool = room.acCoolMat || null;
    this._acBody = room.acBodyMat || null;
    this._fanLed = room.fanLedMat || null;
    this._bladeGroup = room.fanBladeGroup || null;
    this._airflowGroup = room.airflowGroup || null;
    this._stoveGroup = room.stoveGroup || null;
    this._spin = 0;
  }

  /**
   * @param {object} state
   */
  apply(state) {
    this.acOn = !!state.acOn;
    this.fridgeOn = !!state.fridgeOn;
    this.fanOn = !!state.fanOn;
    this.fanPlacement = state.fanPlacement === 'wrong' ? 'wrong' : 'correct';
    this.fridgeFill = state.fridgeFill || 'seventy';
    this.awayFromHeat = state.awayFromHeat !== false;

    if (this._acLed) {
      if (this.acOn) {
        this._acLed.emissive.setHex(0x44ffaa);
        this._acLed.emissiveIntensity = 1.8;
        this._acLed.color.setHex(0x88ffcc);
      } else {
        this._acLed.emissive.setHex(0x000000);
        this._acLed.emissiveIntensity = 0;
        this._acLed.color.setHex(0x1a1c20);
      }
    }

    if (this._acCool) {
      if (this.acOn) {
        this._acCool.emissive.setHex(0x224466);
        this._acCool.emissiveIntensity = 0.35;
        this._acCool.color.setHex(0x3a5a70);
      } else {
        this._acCool.emissive.setHex(0x000000);
        this._acCool.emissiveIntensity = 0;
        this._acCool.color.setHex(0x2a3038);
      }
    }

    if (this._acBody) {
      this._acBody.color.setHex(this.acOn ? 0xc8d0d8 : 0xb0b6be);
    }

    if (this._fridgeLed) {
      if (this.fridgeOn) {
        const stuffed = this.fridgeFill === 'stuffed';
        this._fridgeLed.emissive.setHex(stuffed ? 0xff8866 : 0x66ff99);
        this._fridgeLed.emissiveIntensity = stuffed ? 1.4 : 1.6;
        this._fridgeLed.color.setHex(stuffed ? 0xffccaa : 0xaaffcc);
      } else {
        this._fridgeLed.emissive.setHex(0x000000);
        this._fridgeLed.emissiveIntensity = 0;
        this._fridgeLed.color.setHex(0x1a1c20);
      }
    }

    if (this._fanLed) {
      if (this.fanOn) {
        this._fanLed.emissive.setHex(0x66aaff);
        this._fanLed.emissiveIntensity = 1.5;
        this._fanLed.color.setHex(0xaaccff);
      } else {
        this._fanLed.emissive.setHex(0x000000);
        this._fanLed.emissiveIntensity = 0;
        this._fanLed.color.setHex(0x1a1c20);
      }
    }

    if (typeof this.room.setFanPlacement === 'function') {
      this.room.setFanPlacement(this.fanPlacement);
    }

    if (typeof this.room.setStoveNearFridge === 'function') {
      this.room.setStoveNearFridge(!this.awayFromHeat);
    }

    if (typeof this.room.setFridgeFillVisual === 'function') {
      this.room.setFridgeFillVisual(this.fridgeOn ? this.fridgeFill : 'off');
    }

    this._updateAirflow();
  }

  _updateAirflow() {
    if (!this._airflowGroup) return;
    const show =
      this.acOn && this.fanOn && this.fanPlacement === 'correct';
    this._airflowGroup.visible = show;
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    if (this._bladeGroup && this.fanOn) {
      this._spin += dt * 14;
      this._bladeGroup.rotation.z = this._spin;
    }

    if (this._airflowGroup && this._airflowGroup.visible) {
      this._airflowGroup.children.forEach((child, i) => {
        const phase = this._spin * 0.35 + i * 0.7;
        child.material.opacity = 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(phase));
        child.position.y = child.userData.baseY + Math.sin(phase) * 0.04;
      });
    }
  }
}
