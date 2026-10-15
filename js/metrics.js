/**
 * Energy / cost calculations for bulb + appliance comparisons.
 * Equal-brightness presets ≈ 800 lm household bulb.
 * Appliance watts are teaching estimates (約計), HK-ish.
 */

/** @typedef {'led' | 'cfl' | 'incandescent'} BulbType */
/** @typedef {'empty' | 'seventy' | 'stuffed'} FridgeFill */
/** @typedef {'correct' | 'wrong'} FanPlacement */

export const BULB_PRESETS = {
  led: {
    id: 'led',
    name: 'LED',
    equalW: 9,
    kelvin: 4500,
    tip: 'LED 慳電又耐用——同等亮度只需約 9W，比鎢絲慳約 85%。',
    color: 0xb8d4ff,
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

/** Base teaching defaults (約計) — actual draw computed in resolveApplianceWatts */
export const APPLIANCE_WATTS = {
  ac: 900,
  fridge: 120,
  fridgeStuffed: 160,
  fridgeGoodBonus: 110,
  fan: 45,
  /** AC effective draw when fan correctly helps circulation */
  acWithFanSave: 750,
};

export const FRIDGE_FILL_LABELS = {
  empty: '太空',
  seventy: '七分滿',
  stuffed: '塞爆',
};

/**
 * Resolve fridge average watts from fill + practices.
 * @param {object} opts
 * @param {boolean} opts.fridgeOn
 * @param {FridgeFill} opts.fridgeFill
 * @param {boolean} opts.coolBeforeStore
 * @param {boolean} opts.doorSealOk
 * @param {boolean} opts.awayFromHeat
 * @param {boolean} opts.lessDoorOpen
 */
export function resolveFridgeWatts({
  fridgeOn,
  fridgeFill = 'seventy',
  coolBeforeStore = true,
  doorSealOk = true,
  awayFromHeat = true,
  lessDoorOpen = true,
}) {
  if (!fridgeOn) {
    return { watts: 0, warning: null, goodCount: 0, allGood: false };
  }

  let watts = APPLIANCE_WATTS.fridge;
  let warning = null;

  if (fridgeFill === 'stuffed') {
    watts = APPLIANCE_WATTS.fridgeStuffed;
    warning = '塞爆會阻礙冷氣循環，雪櫃更食電！試吓改成七分滿。';
  } else if (fridgeFill === 'seventy') {
    watts = APPLIANCE_WATTS.fridge;
  } else {
    // empty — not ideal teaching target; mild uplift vs 七分滿
    watts = 130;
  }

  // Bad practices nudge average draw up
  if (!coolBeforeStore) watts += 8;
  if (!doorSealOk) watts += 12;
  if (!awayFromHeat) watts += 10;
  if (!lessDoorOpen) watts += 6;

  const practices = [
    fridgeFill === 'seventy',
    coolBeforeStore,
    doorSealOk,
    awayFromHeat,
    lessDoorOpen,
  ];
  const goodCount = practices.filter(Boolean).length;
  const allGood = goodCount === 5;

  // Small efficiency bonus when all habits are right + 七分滿
  if (allGood) {
    watts = APPLIANCE_WATTS.fridgeGoodBonus;
  }

  return { watts, warning, goodCount, allGood };
}

/**
 * Resolve AC + fan watts and teaching save message.
 * @param {object} opts
 * @param {boolean} opts.acOn
 * @param {boolean} opts.fanOn
 * @param {FanPlacement} opts.fanPlacement
 */
export function resolveAcFanWatts({
  acOn,
  fanOn = false,
  fanPlacement = 'correct',
}) {
  const fanWatts = fanOn ? APPLIANCE_WATTS.fan : 0;
  let acWatts = acOn ? APPLIANCE_WATTS.ac : 0;
  let acSavePct = null;
  let fanTip = null;

  if (acOn && fanOn && fanPlacement === 'correct') {
    acWatts = APPLIANCE_WATTS.acWithFanSave;
    acSavePct = Math.round(
      ((APPLIANCE_WATTS.ac - APPLIANCE_WATTS.acWithFanSave) / APPLIANCE_WATTS.ac) *
        100
    );
    fanTip = `循環扇係冷氣嘅神隊友！擺對位，冷氣約慳 ${acSavePct}%（約計）。`;
  } else if (fanOn && fanPlacement === 'wrong') {
    fanTip = '擺喺冷氣出風口下方，仰角吹向室內中央，先至更慳電。';
  } else if (fanOn && !acOn) {
    fanTip = '循環扇單獨開亦都有用；同冷氣一齊、擺對位，慳電效果最明顯。';
  } else if (acOn && !fanOn) {
    fanTip = '加部循環扇做神隊友，冷空氣循環更快，可試吓慳約 15–20%。';
  }

  return { acWatts, fanWatts, acSavePct, fanTip };
}

/**
 * @param {object} opts
 * @param {BulbType | null} opts.type
 * @param {number} opts.count
 * @param {number} opts.hoursPerDay
 * @param {number} opts.ratePerKwh
 * @param {boolean} opts.equalBrightness
 * @param {boolean} [opts.acOn]
 * @param {boolean} [opts.fridgeOn]
 * @param {boolean} [opts.fanOn]
 * @param {FanPlacement} [opts.fanPlacement]
 * @param {FridgeFill} [opts.fridgeFill]
 * @param {boolean} [opts.coolBeforeStore]
 * @param {boolean} [opts.doorSealOk]
 * @param {boolean} [opts.awayFromHeat]
 * @param {boolean} [opts.lessDoorOpen]
 */
export function computeMetrics({
  type,
  count,
  hoursPerDay,
  ratePerKwh,
  equalBrightness,
  acOn = false,
  fridgeOn = false,
  fanOn = false,
  fanPlacement = 'correct',
  fridgeFill = 'seventy',
  coolBeforeStore = true,
  doorSealOk = true,
  awayFromHeat = true,
  lessDoorOpen = true,
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

  const fridge = resolveFridgeWatts({
    fridgeOn,
    fridgeFill,
    coolBeforeStore,
    doorSealOk,
    awayFromHeat,
    lessDoorOpen,
  });

  const acFan = resolveAcFanWatts({ acOn, fanOn, fanPlacement });

  const acWatts = acFan.acWatts;
  const fanWatts = acFan.fanWatts;
  const fridgeWatts = fridge.watts;
  const applianceWatts = acWatts + fridgeWatts + fanWatts;
  const watts = lightWatts + applianceWatts;

  // Lighting, AC, fan follow hours slider; fridge is 24h when on
  const lightKwh = (lightWatts * hoursPerDay * 30) / 1000;
  const acKwh = (acWatts * hoursPerDay * 30) / 1000;
  const fanKwh = (fanWatts * hoursPerDay * 30) / 1000;
  const fridgeKwh = (fridgeWatts * 24 * 30) / 1000;
  const kwhMonth = lightKwh + acKwh + fanKwh + fridgeKwh;
  const costMonth = kwhMonth * ratePerKwh;

  return {
    watts,
    lightWatts,
    applianceWatts,
    acWatts,
    fanWatts,
    fridgeWatts,
    kwhMonth,
    costMonth,
    savePct,
    wattsEach,
    lightFactor,
    acSavePct: acFan.acSavePct,
    fanTip: acFan.fanTip,
    fridgeWarning: fridge.warning,
    fridgeGoodCount: fridge.goodCount,
    fridgeAllGood: fridge.allGood,
  };
}

export function formatMoney(n) {
  return `$${n.toFixed(1)}`;
}

export function formatKwh(n) {
  return n < 10 ? n.toFixed(2) : n.toFixed(1);
}
