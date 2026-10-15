import * as THREE from 'three';

/**
 * Window-type AC + fridge power states and subtle visual feedback.
 * Teaching defaults (HK-ish averages, labeled 約計).
 */
export const APPLIANCE_PRESETS = {
  ac: {
    id: 'ac',
    name: '窗口式冷氣',
    watts: 900,
    /** Uses lighting hours slider when on */
    hoursMode: 'slider',
    tip: '冷氣開緊：調高一兩度、配合風扇，通常更慳電。',
  },
  fridge: {
    id: 'fridge',
    name: '雪櫃',
    watts: 120,
    /** Always-on average draw when powered */
    hoursMode: '24',
    tip: '雪櫃約計平均約 120W（全日運行）；少開櫃門、唔塞太滿更慳電。',
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

    this._acLed = room.acLedMat || null;
    this._fridgeLed = room.fridgeLedMat || null;
    this._acCool = room.acCoolMat || null;
    this._acBody = room.acBodyMat || null;
  }

  /**
   * @param {{ acOn: boolean, fridgeOn: boolean }} state
   */
  apply({ acOn, fridgeOn }) {
    this.acOn = !!acOn;
    this.fridgeOn = !!fridgeOn;

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
        this._fridgeLed.emissive.setHex(0x66ff99);
        this._fridgeLed.emissiveIntensity = 1.6;
        this._fridgeLed.color.setHex(0xaaffcc);
      } else {
        this._fridgeLed.emissive.setHex(0x000000);
        this._fridgeLed.emissiveIntensity = 0;
        this._fridgeLed.color.setHex(0x1a1c20);
      }
    }
  }
}
