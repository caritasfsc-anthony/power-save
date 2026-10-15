/**
 * Energy / cost calculations for bulb + appliance comparisons.
 * Equal-brightness presets ≈ 800 lm household bulb.
 * Appliance watts are teaching estimates (約計), HK-ish.
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

/** Teaching defaults for home appliances (約計) */
export const APPLIANCE_WATTS = {
  ac: 900,
  fridge: 120,
};

/**
 * @param {object} opts
 * @param {BulbType | null} opts.type
 * @param {number} opts.count
 * @param {number} opts.hoursPerDay
 * @param {number} opts.ratePerKwh
 * @param {boolean} opts.equalBrightness
 * @param {boolean} [opts.acOn]
 * @param {boolean} [opts.fridgeOn]
 */
export function computeMetrics({
  type,
  count,
  hoursPerDay,
  ratePerKwh,
  equalBrightness,
  acOn = false,
  fridgeOn = false,
}) {
  let lightWatts = 0;
  let wattsEach = 0;
  let lightFactor = 0;
  let savePct = null;

  if (type && count > 0) {
    wattsEach = equalBrightness ? BULB_PRESETS[type].equalW : SAME_WATT;
    lightWatts = wattsEach * count;

    const incEach = BULB_PRESETS.incandescent.equalW;
    const incTotal = incEach * count;
    savePct = equalBrightness
      ? type === 'incandescent'
        ? 0
        : Math.round(((incTotal - lightWatts) / incTotal) * 100)
      : null;

    lightFactor = equalBrightness
      ? BULB_PRESETS[type].intensityScale
      : (wattsEach / BULB_PRESETS.led.equalW) *
        (BULB_PRESETS[type].lpw / BULB_PRESETS.led.lpw) *
        BULB_PRESETS[type].intensityScale;
  }

  const acWatts = acOn ? APPLIANCE_WATTS.ac : 0;
  const fridgeWatts = fridgeOn ? APPLIANCE_WATTS.fridge : 0;
  const applianceWatts = acWatts + fridgeWatts;

  const watts = lightWatts + applianceWatts;

  // Lighting & AC follow the hours slider; fridge is 24h when on
  const lightKwh = (lightWatts * hoursPerDay * 30) / 1000;
  const acKwh = (acWatts * hoursPerDay * 30) / 1000;
  const fridgeKwh = (fridgeWatts * 24 * 30) / 1000;
  const kwhMonth = lightKwh + acKwh + fridgeKwh;
  const costMonth = kwhMonth * ratePerKwh;

  return {
    watts,
    lightWatts,
    applianceWatts,
    acWatts,
    fridgeWatts,
    kwhMonth,
    costMonth,
    savePct,
    wattsEach,
    lightFactor,
  };
}

export function formatMoney(n) {
  return `$${n.toFixed(1)}`;
}

export function formatKwh(n) {
  return n < 10 ? n.toFixed(2) : n.toFixed(1);
}
