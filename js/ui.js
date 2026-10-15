import {
  BULB_PRESETS,
  computeMetrics,
  formatMoney,
  formatKwh,
} from './metrics.js';

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
    };

    this._bind();
    this._setupMascot();
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
        const tip = BULB_PRESETS[type]?.tip;
        if (tip) this.els.tip.textContent = tip;
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

    this.els.allOff.addEventListener('click', () => this.allOff());

    this.els.dockToggle.addEventListener('click', () => {
      const collapsed = this.els.dock.classList.toggle('collapsed');
      this.els.dockToggle.setAttribute(
        'aria-expanded',
        collapsed ? 'false' : 'true'
      );
    });
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

    // Set src after listeners so GitHub Pages base path is respected
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
    this.els.tip.textContent =
      '鎢絲燈九成電力變成熱；換 LED 可慳約 85% 電。';
    this._emit();
  }

  _emit() {
    this.renderMetrics();
    this.onChange({ ...this.state });
  }

  renderMetrics() {
    const m = computeMetrics(this.state);
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
