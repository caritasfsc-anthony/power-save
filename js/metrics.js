/**
 * Energy / cost calculations for bulb comparisons.
 * Equal-brightness presets ≈ 800 lm household bulb.
 */

/** @typedef {'led' | 'cfl' | 'incandescent'} BulbType */

export const BULB_PRESETS = {
  led: {
    id: 'led',
    name: 'LED',
    equalW: 9,
    kelvin: 4500,
    tip: 'LED 慳電又耐用——同等亮度只需約 9W，比鎢絲慳約 85%。',
    color: 0xb8d4ff,
    // relative light output per watt (incandescent = 1)
    lpw: 6.5,
    intensityScale: 1.15,
  },
  cfl: {
    id: 'cfl',
    name: '慳電燈',
    equalW: 14,
    kelvin: 4000,
    tip: '慳電燈比鎢絲慳電，但壽命同亮起速度都不及 LED。',
    color: 0xc5e8d0,
    lpw: 4.2,
    intensityScale: 1.0,
  },
  incandescent: {
    id: 'incandescent',
    name: '鎢絲燈',
    equalW: 60,
    kelvin: 2700,
    tip: '鎢絲燈九成電力變成熱，只有約一成變成光。',
    color: 0xffb060,
    lpw: 1,
    intensityScale: 0.95,
  },
};

/** When「同等亮度」off — same wattage each, LED looks much brighter */
export const SAME_WATT = 60;

/**
 * @param {object} opts
 * @param {BulbType | null} opts.type
 * @param {number} opts.count
 * @param {number} opts.hoursPerDay
 * @param {number} opts.ratePerKwh
 * @param {boolean} opts.equalBrightness
 */
export function computeMetrics({
  type,
  count,
  hoursPerDay,
  ratePerKwh,
  equalBrightness,
}) {
  if (!type || count <= 0) {
    return {
      watts: 0,
      kwhMonth: 0,
      costMonth: 0,
      savePct: null,
      wattsEach: 0,
      lightFactor: 0,
    };
  }

  const wattsEach = equalBrightness
    ? BULB_PRESETS[type].equalW
    : SAME_WATT;
  const watts = wattsEach * count;
  const kwhMonth = (watts * hoursPerDay * 30) / 1000;
  const costMonth = kwhMonth * ratePerKwh;

  const incEach = BULB_PRESETS.incandescent.equalW;
  const incTotal = incEach * count;
  const savePct = equalBrightness
    ? type === 'incandescent'
      ? 0
      : Math.round(((incTotal - watts) / incTotal) * 100)
    : null;

  // Visual brightness factor for Three.js (relative to equal-brightness LED)
  const lightFactor = equalBrightness
    ? BULB_PRESETS[type].intensityScale
    : (wattsEach / BULB_PRESETS.led.equalW) *
      (BULB_PRESETS[type].lpw / BULB_PRESETS.led.lpw) *
      BULB_PRESETS[type].intensityScale;

  return { watts, kwhMonth, costMonth, savePct, wattsEach, lightFactor };
}

export function formatMoney(n) {
  return `$${n.toFixed(1)}`;
}

export function formatKwh(n) {
  return n < 10 ? n.toFixed(2) : n.toFixed(1);
}
