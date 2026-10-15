import * as THREE from 'three';

/**
 * Simulated clock + monthly kWh accumulation + sky/window daylight colours.
 * Time of day in hours [0, 24). Speed = simulated hours per real second.
 */

export const MONTH_DAYS = 30;

/** @param {number} h hours 0–24 */
export function skyPalette(h) {
  // Night 0–5.5, sunrise 5.5–7.5, day 7.5–17.5, sunset 17.5–19.5, night
  const c = {
    sky: new THREE.Color(0x02040a),
    horizon: new THREE.Color(0x050810),
    ambient: 0.04,
    hemiSky: new THREE.Color(0x1a2030),
    hemiGround: new THREE.Color(0x08060a),
    hemiIntensity: 0.1,
    windowDir: 0.05,
    windowColor: new THREE.Color(0x334466),
    fog: new THREE.Color(0x030306),
    exposure: 0.95,
    phase: 'night',
  };

  const lerp = (a, b, t) => a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
  const mix = (a, b, t) => a + (b - a) * THREE.MathUtils.clamp(t, 0, 1);

  const nightSky = new THREE.Color(0x02040a);
  const nightHor = new THREE.Color(0x050810);
  const dawnSky = new THREE.Color(0xff6b35);
  const dawnHor = new THREE.Color(0xffb088);
  const daySky = new THREE.Color(0x6eb6ff);
  const dayHor = new THREE.Color(0xc8e4ff);
  const duskSky = new THREE.Color(0xff5533);
  const duskHor = new THREE.Color(0xff9966);

  if (h >= 5.5 && h < 7.5) {
    const t = (h - 5.5) / 2;
    c.phase = 'sunrise';
    c.sky = lerp(nightSky, dawnSky, Math.sin(t * Math.PI * 0.5));
    c.horizon = lerp(nightHor, dawnHor, t);
    if (t > 0.5) {
      const u = (t - 0.5) * 2;
      c.sky = lerp(dawnSky, daySky, u * 0.7);
      c.horizon = lerp(dawnHor, dayHor, u);
    }
    c.ambient = mix(0.05, 0.35, t);
    c.hemiIntensity = mix(0.12, 0.55, t);
    c.hemiSky = lerp(new THREE.Color(0x2a2030), new THREE.Color(0xffc8a0), t);
    c.windowDir = mix(0.15, 1.4, t);
    c.windowColor = lerp(new THREE.Color(0xff8844), new THREE.Color(0xffe8d0), t);
    c.fog = lerp(new THREE.Color(0x030306), new THREE.Color(0x1a1520), t * 0.6);
    c.exposure = mix(0.95, 1.1, t);
  } else if (h >= 7.5 && h < 17.5) {
    c.phase = 'day';
    const noon = 1 - Math.abs(h - 12.5) / 5;
    c.sky = daySky.clone();
    c.horizon = dayHor.clone();
    c.ambient = mix(0.32, 0.48, noon);
    c.hemiIntensity = mix(0.5, 0.75, noon);
    c.hemiSky = new THREE.Color(0xa8c8ff);
    c.hemiGround = new THREE.Color(0x3a3428);
    c.windowDir = mix(1.2, 2.2, noon);
    c.windowColor = new THREE.Color(0xfff8f0);
    c.fog = new THREE.Color(0x8aa8c8);
    c.exposure = mix(1.05, 1.2, noon);
  } else if (h >= 17.5 && h < 19.5) {
    const t = (h - 17.5) / 2;
    c.phase = 'sunset';
    c.sky = lerp(daySky, duskSky, t);
    c.horizon = lerp(dayHor, duskHor, t);
    if (t > 0.55) {
      const u = (t - 0.55) / 0.45;
      c.sky = lerp(duskSky, nightSky, u);
      c.horizon = lerp(duskHor, nightHor, u);
    }
    c.ambient = mix(0.35, 0.06, t);
    c.hemiIntensity = mix(0.55, 0.12, t);
    c.hemiSky = lerp(new THREE.Color(0xffaa77), new THREE.Color(0x1a2030), t);
    c.windowDir = mix(1.3, 0.12, t);
    c.windowColor = lerp(new THREE.Color(0xff7744), new THREE.Color(0x223355), t);
    c.fog = lerp(new THREE.Color(0x8aa8c8), new THREE.Color(0x030306), t);
    c.exposure = mix(1.1, 0.95, t);
  } else {
    c.phase = 'night';
    // slight moonlight
    c.sky = nightSky.clone();
    c.horizon = nightHor.clone();
    c.ambient = 0.045;
    c.hemiIntensity = 0.1;
    c.windowDir = 0.06;
    c.windowColor = new THREE.Color(0x1a2840);
    c.fog = new THREE.Color(0x030306);
    c.exposure = 0.92;
  }

  return c;
}

export class DayCycle {
  constructor() {
    /** @type {number} hours 0–24 */
    this.timeOfDay = 7;
    this.dayOfMonth = 1;
    this.daysInMonth = MONTH_DAYS;
    this.playing = false;
    /** Simulated hours advanced per real second */
    this.speed = 1;
    this.todayKwh = 0;
    this.monthKwh = 0;
    /** @type {number[]} */
    this.dailyKwh = Array(MONTH_DAYS).fill(0);
  }

  get phase() {
    return skyPalette(this.timeOfDay).phase;
  }

  getPalette() {
    return skyPalette(this.timeOfDay);
  }

  /**
   * @param {number} dtReal seconds
   * @param {number} watts instantaneous total draw
   * @returns {{ rolledDay: boolean, rolledMonth: boolean }}
   */
  tick(dtReal, watts) {
    let rolledDay = false;
    let rolledMonth = false;
    if (!this.playing || dtReal <= 0) return { rolledDay, rolledMonth };

    const hoursDelta = dtReal * this.speed;
    // kWh = W * hours / 1000
    const dkWh = (Math.max(0, watts) * hoursDelta) / 1000;
    this.todayKwh += dkWh;
    this.monthKwh += dkWh;
    const idx = Math.max(0, Math.min(this.daysInMonth - 1, this.dayOfMonth - 1));
    this.dailyKwh[idx] += dkWh;

    let next = this.timeOfDay + hoursDelta;
    while (next >= 24) {
      next -= 24;
      rolledDay = true;
      this.dayOfMonth += 1;
      if (this.dayOfMonth > this.daysInMonth) {
        this.dayOfMonth = 1;
        rolledMonth = true;
        this.monthKwh = 0;
        this.dailyKwh = Array(this.daysInMonth).fill(0);
      }
      this.todayKwh = 0;
    }
    this.timeOfDay = next;
    return { rolledDay, rolledMonth };
  }

  setTime(h) {
    this.timeOfDay = ((h % 24) + 24) % 24;
  }

  advanceDay() {
    this.dayOfMonth += 1;
    if (this.dayOfMonth > this.daysInMonth) {
      this.dayOfMonth = 1;
      this.monthKwh = 0;
      this.dailyKwh = Array(this.daysInMonth).fill(0);
    }
    this.todayKwh = 0;
    this.timeOfDay = 6;
  }

  resetMonth() {
    this.dayOfMonth = 1;
    this.todayKwh = 0;
    this.monthKwh = 0;
    this.dailyKwh = Array(this.daysInMonth).fill(0);
    this.timeOfDay = 7;
  }

  formatClock() {
    const h = Math.floor(this.timeOfDay) % 24;
    const m = Math.floor((this.timeOfDay % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  phaseLabel() {
    const p = this.phase;
    if (p === 'sunrise') return '日出';
    if (p === 'day') return '日間';
    if (p === 'sunset') return '日落';
    return '夜晚';
  }
}
