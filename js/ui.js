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
   * @param {import('./daycycle.js').DayCycle} [dayCycle]
   */
  constructor(onChange, dayCycle = null) {
    this.onChange = onChange;
    this.dayCycle = dayCycle;

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
      mToday: document.getElementById('m-today'),
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
      sTime: document.getElementById('s-time'),
      tClock: document.getElementById('t-clock'),
      tDay: document.getElementById('t-day'),
      tPhase: document.getElementById('t-phase'),
      btnPlay: document.getElementById('btn-play'),
      btnNextDay: document.getElementById('btn-next-day'),
      btnResetMonth: document.getElementById('btn-reset-month'),
      speedChips: [...document.querySelectorAll('.speed-chip')],
      monthFill: document.getElementById('t-month-fill'),
      monthLabel: document.getElementById('t-month-label'),
      spark: document.getElementById('spark-canvas'),
    };

    this._bind();
    this._bindTime();
    this._setupMascot();
    this._syncApplianceLabels();
    this._syncPracticePanels();
    this.renderMetrics();
    if (this.dayCycle) this.renderTimeControls(this.dayCycle);
  }

  _bindTime() {
    if (!this.dayCycle) return;
    const dc = this.dayCycle;

    this.els.sTime?.addEventListener('input', () => {
      const h = Number(this.els.sTime.value);
      dc.setTime(h);
      this.renderTimeControls(dc);
      this.onChange({ ...this.state });
    });

    this.els.btnPlay?.addEventListener('click', () => {
      dc.playing = !dc.playing;
      this.renderTimeControls(dc);
    });

    this.els.speedChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        dc.speed = Number(chip.dataset.speed) || 1;
        this.els.speedChips.forEach((c) =>
          c.classList.toggle('active', c === chip)
        );
      });
    });

    this.els.btnNextDay?.addEventListener('click', () => {
      dc.advanceDay();
      this.renderTimeControls(dc);
      this.renderSimStats(dc, this.state.ratePerKwh);
      this.onChange({ ...this.state });
    });

    this.els.btnResetMonth?.addEventListener('click', () => {
      dc.resetMonth();
      this.renderTimeControls(dc);
      this.renderSimStats(dc, this.state.ratePerKwh);
      this.onChange({ ...this.state });
    });
  }

  /**
   * @param {import('./daycycle.js').DayCycle} dc
   */
  renderTimeControls(dc) {
    if (this.els.tClock) this.els.tClock.textContent = dc.formatClock();
    if (this.els.tDay) this.els.tDay.textContent = `第 ${dc.dayOfMonth} 日`;
    if (this.els.tPhase) this.els.tPhase.textContent = dc.phaseLabel();
    if (this.els.sTime && document.activeElement !== this.els.sTime) {
      this.els.sTime.value = String(dc.timeOfDay);
    }
    if (this.els.sTime) {
      this.els.sTime.setAttribute('aria-valuetext', dc.formatClock());
    }
    if (this.els.btnPlay) {
      this.els.btnPlay.textContent = dc.playing ? '⏸' : '▶';
      this.els.btnPlay.setAttribute('aria-pressed', dc.playing ? 'true' : 'false');
      this.els.btnPlay.title = dc.playing ? '暫停' : '播放';
    }
    const pct = (dc.dayOfMonth / dc.daysInMonth) * 100;
    if (this.els.monthFill) this.els.monthFill.style.width = `${pct}%`;
    if (this.els.monthLabel) {
      this.els.monthLabel.textContent = `${dc.dayOfMonth}／${dc.daysInMonth}`;
    }
  }

  /**
   * @param {import('./daycycle.js').DayCycle} dc
   * @param {number} rate
   */
  renderSimStats(dc, rate) {
    if (this.els.mToday) {
      this.els.mToday.innerHTML = `${formatKwh(dc.todayKwh)} <small>kWh</small>`;
    }
    if (this.els.mKwh) {
      this.els.mKwh.innerHTML = `${formatKwh(dc.monthKwh)} <small>kWh</small>`;
    }
    if (this.els.mCost) {
      this.els.mCost.textContent = formatMoney(dc.monthKwh * rate);
    }
    this._drawSpark(dc.dailyKwh);
  }

  /**
   * @param {number[]} daily
   */
  _drawSpark(daily) {
    const canvas = this.els.spark;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(0.001, ...daily);
    const n = daily.length;
    const gap = 1;
    const barW = Math.max(1, (w - gap * (n - 1)) / n);
    daily.forEach((v, i) => {
      const bh = Math.max(v > 0 ? 2 : 0, (v / max) * (h - 2));
      const x = i * (barW + gap);
      ctx.fillStyle = v > 0 ? 'rgba(61, 214, 140, 0.85)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, h - bh, barW, bh || 1);
    });
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
      if (this.dayCycle) this.renderSimStats(this.dayCycle, this.state.ratePerKwh);
    });

    const applyRatePreset = (rate) => {
      this.state.ratePerKwh = rate;
      this.els.rate.value = String(rate);
      this.els.vRate.textContent = rate.toFixed(2);
      this._syncRateChips();
      this._emit();
      if (this.dayCycle) this.renderSimStats(this.dayCycle, this.state.ratePerKwh);
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
      '拖動時刻或按播放，睇窗口日出日落；開着嘅電器會累積本月度數。';
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

    // Keep projected estimate only in dock tip; HUD month fields driven by sim
    if (!this.dayCycle) {
      this.els.mKwh.innerHTML = `${formatKwh(m.kwhMonth)} <small>kWh</small>`;
      this.els.mCost.textContent = formatMoney(m.costMonth);
    }

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
