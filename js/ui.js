import {
  BULB_PRESETS,
  APPLIANCE_WATTS,
  computeMetrics,
  formatMoney,
  formatKwh,
} from './metrics.js';
import { APPLIANCE_PRESETS } from './appliances.js';

/**
 * Overlay UI bindings. Calls onChange whenever state updates.
 */
export class UI {
  /**
   * @param {(state: object) => void} onChange
   */
  constructor(onChange) {
    this.onChange = onChange;

    this.state = {
      type: /** @type {null | string} */ (null),
      count: 1,
      hoursPerDay: 4,
      ratePerKwh: 1.41,
      equalBrightness: true,
      acOn: false,
      fridgeOn: true,
      fanOn: false,
      fanPlacement: /** @type {'correct' | 'wrong'} */ ('correct'),
      fridgeFill: /** @type {'empty' | 'seventy' | 'stuffed'} */ ('seventy'),
      coolBeforeStore: true,
      doorSealOk: true,
      awayFromHeat: true,
      lessDoorOpen: true,
    };

    this.els = {
      prompt: document.getElementById('prompt-overlay'),
      cards: [...document.querySelectorAll('.bulb-card')],
      equal: document.getElementById('equal-brightness'),
      equalHint: document.getElementById('equal-hint'),
      count: document.getElementById('s-count'),
      hours: document.getElementById('s-hours'),
      rate: document.getElementById('s-rate'),
      vCount: document.getElementById('v-count'),
      vHours: document.getElementById('v-hours'),
      vRate: document.getElementById('v-rate'),
      rateClp: document.getElementById('rate-clp'),
      rateHke: document.getElementById('rate-hke'),
      mWatts: document.getElementById('m-watts'),
      mKwh: document.getElementById('m-kwh'),
      mCost: document.getElementById('m-cost'),
      mSave: document.getElementById('m-save'),
      mSaveLabel: document.querySelector('.metric-save .metric-label'),
      tip: document.getElementById('edu-tip'),
      allOff: document.getElementById('btn-all-off'),
      dock: document.getElementById('dock'),
      dockToggle: document.getElementById('dock-toggle'),
      mascotImg: document.getElementById('mascot-img'),
      mascotBadge: document.getElementById('mascot-badge'),
      acToggle: document.getElementById('toggle-ac'),
      fridgeToggle: document.getElementById('toggle-fridge'),
      fanToggle: document.getElementById('toggle-fan'),
      acWattsLabel: document.getElementById('ac-watts-label'),
      fridgeWattsLabel: document.getElementById('fridge-watts-label'),
      fanWattsLabel: document.getElementById('fan-watts-label'),
      fridgePanel: document.getElementById('fridge-practice-panel'),
      fanPanel: document.getElementById('fan-practice-panel'),
      fridgeFill: document.getElementById('fridge-fill'),
      fridgeWarn: document.getElementById('fridge-warn'),
      fridgeStatus: document.getElementById('fridge-status'),
      fanPlacement: [...document.querySelectorAll('input[name="fan-placement"]')],
      fanSaveBadge: document.getElementById('fan-save-badge'),
      fanTipEl: document.getElementById('fan-tip'),
      practiceCool: document.getElementById('practice-cool'),
      practiceSeal: document.getElementById('practice-seal'),
      practiceHeat: document.getElementById('practice-heat'),
      practiceDoor: document.getElementById('practice-door'),
      notesToggle: document.getElementById('notes-toggle'),
      notesBody: document.getElementById('notes-body'),
    };

    this._bind();
    this._setupMascot();
    this._syncApplianceLabels();
    this._syncPracticePanels();
    this.renderMetrics();
  }

  _bind() {
    this.els.cards.forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        this.state.type = type;
        this.els.cards.forEach((c) => {
          c.setAttribute('aria-checked', c === card ? 'true' : 'false');
        });
        this.els.prompt?.classList.add('hidden');
        this._updateTip();
        this._emit();
      });
    });

    this.els.equal.addEventListener('change', () => {
      this.state.equalBrightness = this.els.equal.checked;
      this.els.equalHint.textContent = this.state.equalBrightness
        ? 'LED ≈ 9W · 慳電燈 ≈ 14W · 鎢絲 ≈ 60W'
        : '關閉同等亮度：每盞都以 60W 比較——LED 會光好多';
      this._emit();
    });

    this.els.count.addEventListener('input', () => {
      this.state.count = Number(this.els.count.value);
      this.els.vCount.textContent = String(this.state.count);
      this._emit();
    });

    this.els.hours.addEventListener('input', () => {
      this.state.hoursPerDay = Number(this.els.hours.value);
      this.els.vHours.textContent = String(this.state.hoursPerDay);
      this._emit();
    });

    this.els.rate.addEventListener('input', () => {
      this.state.ratePerKwh = Number(this.els.rate.value);
      this.els.vRate.textContent = this.state.ratePerKwh.toFixed(2);
      this._syncRateChips();
      this._emit();
    });

    const applyRatePreset = (rate) => {
      this.state.ratePerKwh = rate;
      this.els.rate.value = String(rate);
      this.els.vRate.textContent = rate.toFixed(2);
      this._syncRateChips();
      this._emit();
    };

    this.els.rateClp?.addEventListener('click', () => applyRatePreset(1.41));
    this.els.rateHke?.addEventListener('click', () => applyRatePreset(1.63));
    this._syncRateChips();

    if (this.els.acToggle) {
      this.els.acToggle.checked = this.state.acOn;
      this.els.acToggle.addEventListener('change', () => {
        this.state.acOn = this.els.acToggle.checked;
        this._syncPracticePanels();
        this._updateTip();
        this._emit();
      });
    }

    if (this.els.fridgeToggle) {
      this.els.fridgeToggle.checked = this.state.fridgeOn;
      this.els.fridgeToggle.addEventListener('change', () => {
        this.state.fridgeOn = this.els.fridgeToggle.checked;
        this._syncPracticePanels();
        this._updateTip();
        this._emit();
      });
    }

    if (this.els.fanToggle) {
      this.els.fanToggle.checked = this.state.fanOn;
      this.els.fanToggle.addEventListener('change', () => {
        this.state.fanOn = this.els.fanToggle.checked;
        this._syncPracticePanels();
        this._updateTip();
        this._emit();
      });
    }

    if (this.els.fridgeFill) {
      this.els.fridgeFill.value = this.state.fridgeFill;
      this.els.fridgeFill.addEventListener('change', () => {
        this.state.fridgeFill = this.els.fridgeFill.value;
        this._updateTip();
        this._emit();
      });
    }

    const bindPractice = (el, key) => {
      if (!el) return;
      el.checked = this.state[key];
      el.addEventListener('change', () => {
        this.state[key] = el.checked;
        this._updateTip();
        this._emit();
      });
    };
    bindPractice(this.els.practiceCool, 'coolBeforeStore');
    bindPractice(this.els.practiceSeal, 'doorSealOk');
    bindPractice(this.els.practiceHeat, 'awayFromHeat');
    bindPractice(this.els.practiceDoor, 'lessDoorOpen');

    this.els.fanPlacement.forEach((input) => {
      input.checked = input.value === this.state.fanPlacement;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        this.state.fanPlacement = input.value === 'wrong' ? 'wrong' : 'correct';
        this._updateTip();
        this._emit();
      });
    });

    this.els.notesToggle?.addEventListener('click', () => {
      const open = this.els.notesBody?.classList.toggle('open');
      this.els.notesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    this.els.allOff.addEventListener('click', () => this.allOff());

    this.els.dockToggle.addEventListener('click', () => {
      const collapsed = this.els.dock.classList.toggle('collapsed');
      this.els.dockToggle.setAttribute(
        'aria-expanded',
        collapsed ? 'false' : 'true'
      );
    });
  }

  _syncPracticePanels() {
    if (this.els.fridgePanel) {
      this.els.fridgePanel.hidden = !this.state.fridgeOn;
    }
    if (this.els.fanPanel) {
      this.els.fanPanel.hidden = !(this.state.fanOn || this.state.acOn);
    }
  }

  _syncApplianceLabels() {
    this._refreshDynamicLabels(computeMetrics(this.state));
  }

  /**
   * @param {ReturnType<typeof computeMetrics>} m
   */
  _refreshDynamicLabels(m) {
    if (this.els.acWattsLabel) {
      if (m.acSavePct) {
        this.els.acWattsLabel.textContent = `約 ${m.acWatts} W（慳 ${m.acSavePct}%）`;
      } else {
        this.els.acWattsLabel.textContent = `約 ${APPLIANCE_WATTS.ac} W`;
      }
    }
    if (this.els.fridgeWattsLabel) {
      this.els.fridgeWattsLabel.textContent = this.state.fridgeOn
        ? `約計 ${m.fridgeWatts} W`
        : `約計 ${APPLIANCE_WATTS.fridge} W`;
    }
    if (this.els.fanWattsLabel) {
      this.els.fanWattsLabel.textContent = `約 ${APPLIANCE_WATTS.fan} W`;
    }

    if (this.els.fridgeWarn) {
      if (m.fridgeWarning) {
        this.els.fridgeWarn.hidden = false;
        this.els.fridgeWarn.textContent = m.fridgeWarning;
      } else {
        this.els.fridgeWarn.hidden = true;
      }
    }

    if (this.els.fridgeStatus) {
      if (m.fridgeAllGood) {
        this.els.fridgeStatus.textContent = '✓ 收納滿分！雪櫃約計更慳電';
        this.els.fridgeStatus.className = 'practice-status good';
      } else {
        this.els.fridgeStatus.textContent = `已做好 ${m.fridgeGoodCount}/5 項習慣`;
        this.els.fridgeStatus.className = 'practice-status';
      }
    }

    if (this.els.fanSaveBadge) {
      if (m.acSavePct) {
        this.els.fanSaveBadge.hidden = false;
        this.els.fanSaveBadge.textContent = `約慳 ${m.acSavePct}% 冷氣電`;
      } else {
        this.els.fanSaveBadge.hidden = true;
      }
    }

    if (this.els.fanTipEl) {
      this.els.fanTipEl.textContent =
        m.fanTip || '循環扇係冷氣嘅神隊友——擺對位先至更慳電。';
    }
  }

  _updateTip() {
    const m = computeMetrics(this.state);

    if (m.fridgeWarning) {
      this.els.tip.textContent = m.fridgeWarning;
      return;
    }
    if (m.acSavePct) {
      this.els.tip.textContent = m.fanTip;
      return;
    }
    if (this.state.fanOn && this.state.fanPlacement === 'wrong') {
      this.els.tip.textContent = m.fanTip;
      return;
    }
    if (this.state.acOn) {
      this.els.tip.textContent = m.fanTip || APPLIANCE_PRESETS.ac.tip;
      return;
    }
    if (this.state.type && BULB_PRESETS[this.state.type]) {
      this.els.tip.textContent = BULB_PRESETS[this.state.type].tip;
      return;
    }
    if (this.state.fridgeOn) {
      this.els.tip.textContent = APPLIANCE_PRESETS.fridge.tip;
      return;
    }
    if (this.state.fanOn) {
      this.els.tip.textContent = APPLIANCE_PRESETS.fan.tip;
      return;
    }
    this.els.tip.textContent =
      '鎢絲燈九成電力變成熱；換 LED 可慳約 85% 電。';
  }

  _setupMascot() {
    const img = this.els.mascotImg;
    const badge = this.els.mascotBadge;
    if (!img) return;

    const base = import.meta.env.BASE_URL || '/';
    const src = `${base}mascot.png`;

    const showBadge = () => {
      img.hidden = true;
      if (badge) {
        badge.hidden = false;
        badge.setAttribute('aria-hidden', 'false');
      }
      const brandImg = document.getElementById('brand-mascot');
      const brandFallback = document.querySelector('.brand-mark-fallback');
      if (brandImg) brandImg.hidden = true;
      if (brandFallback) brandFallback.hidden = false;
    };

    const showMascot = () => {
      img.hidden = false;
      if (badge) {
        badge.hidden = true;
        badge.setAttribute('aria-hidden', 'true');
      }
      const brandImg = document.getElementById('brand-mascot');
      const brandFallback = document.querySelector('.brand-mark-fallback');
      if (brandImg) {
        brandImg.src = src;
        brandImg.hidden = false;
      }
      if (brandFallback) brandFallback.hidden = true;
    };

    img.addEventListener('error', showBadge);
    img.addEventListener('load', showMascot);

    img.src = src;

    if (img.complete) {
      if (img.naturalWidth === 0) showBadge();
      else showMascot();
    }
  }

  _syncRateChips() {
    const r = Number(this.state.ratePerKwh.toFixed(2));
    this.els.rateClp?.classList.toggle('active', r === 1.41);
    this.els.rateHke?.classList.toggle('active', r === 1.63);
  }

  allOff() {
    this.state.type = null;
    this.els.cards.forEach((c) => c.setAttribute('aria-checked', 'false'));
    this.els.prompt?.classList.remove('hidden');
    this._updateTip();
    this._emit();
  }

  _emit() {
    this.renderMetrics();
    this.onChange({ ...this.state });
  }

  renderMetrics() {
    const m = computeMetrics(this.state);
    this._refreshDynamicLabels(m);

    this.els.mWatts.innerHTML = `${m.watts} <small>W</small>`;
    this.els.mKwh.innerHTML = `${formatKwh(m.kwhMonth)} <small>kWh</small>`;
    this.els.mCost.textContent = formatMoney(m.costMonth);

    if (this.els.mSaveLabel) {
      this.els.mSaveLabel.textContent = this.state.equalBrightness
        ? '相對鎢絲慳電'
        : '相對鎢絲光量';
    }

    if (!this.state.type) {
      this.els.mSave.textContent = '—';
    } else if (this.state.equalBrightness) {
      if (m.savePct === 0) this.els.mSave.textContent = '基準';
      else this.els.mSave.textContent = `↓ ${m.savePct}%`;
    } else {
      const lpw = BULB_PRESETS[this.state.type].lpw;
      this.els.mSave.textContent = lpw === 1 ? '基準' : `× ${lpw}`;
    }
  }

  getMetrics() {
    return computeMetrics(this.state);
  }
}
