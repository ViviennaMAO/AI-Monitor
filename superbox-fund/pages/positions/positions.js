import { loadAll } from '../../utils/data';
import { LAYER, healthColor, stockAlertState } from '../../utils/portfolio';

const CB_STATE_TXT = {
  normal: '正常', watch: '观察', reduce: '减仓',
  pause: '暂停', liquidate: '清仓', pending: '待接入',
  fire: '触发'
};
const CB_COLOR = {
  normal: '#4ADE80', pending: '#6B7480',
  watch: '#E5A84B', reduce: '#E5A84B',
  pause: '#F26D6D', liquidate: '#F26D6D', fire: '#F26D6D'
};

/** Pick a same-segment bench candidate to default "推送到调仓". */
const PUSH_TARGET_DEFAULT = {
  NVDA:'CEG', AVGO:'ORCL', TSM:'CEG', AMD:'MU',
  MSFT:'ORCL', GOOGL:'CRM', META:'ORCL',
  PLTR:'CRM', NOW:'CRM', VRT:'ETN'
};

Page({
  data: {
    ready: false, asOf: '', status: 'demo',
    filter: 'all', selected: 'NVDA',
    stocks: [], totalCount: 0, filteredCount: 0,
    selectedStock: null,
    cbs: [], stockAlerts: [], fireCount: 0, watchCount: 0,
    cbSummary: ''
  },

  onLoad() { this._render(); },
  onShow() { if (this.data.ready) this._render(); },
  onPullDownRefresh() {
    loadAll().then(c => {
      getApp().globalData.contracts = c;
      getApp().globalData.status    = (c.model_health && c.model_health.status) || 'demo';
      this._apply(c);
    }).catch(() => {}).then(() => wx.stopPullDownRefresh());
  },

  _render() {
    const app = getApp();
    let c = app.globalData.contracts;
    if (!c) {
      loadAll().then(loaded => {
        app.globalData.contracts = loaded;
        app.globalData.status    = (loaded.model_health && loaded.model_health.status) || 'demo';
        this._apply(loaded);
      });
      return;
    }
    this._apply(c);
  },

  _apply(c) {
    const all = c.holdings.holdings;
    const filter = this.data.filter;
    const list = filter === 'all' ? all : all.filter(h => h.layer === filter);

    // build alert state map (for grid coloring)
    const alertMap = {};
    all.forEach(h => { alertMap[h.ticker] = stockAlertState(h); });

    const stocks = list.map(h => {
      const layer = LAYER[h.layer];
      const up    = h.day_change >= 0;
      const cls   = alertMap[h.ticker] === 'fire' ? 'fire' : alertMap[h.ticker] === 'watch' ? 'watch' : '';
      const dot   = alertMap[h.ticker] === 'fire' ? '#F26D6D' : alertMap[h.ticker] === 'watch' ? '#E5A84B' : '';
      return {
        ticker: h.ticker, name: h.name, layer: h.layer,
        color: layer.color, wtPct: Math.round(h.weight * 100),
        up, chgTxt: (up ? '+' : '') + (h.day_change * 100).toFixed(1) + '%',
        health: h.health, hcolor: healthColor(h.health),
        alertCls: cls, alertDot: dot
      };
    });

    // ensure `selected` is in the filtered list
    let selectedTk = this.data.selected;
    if (!list.find(h => h.ticker === selectedTk)) selectedTk = list.length ? list[0].ticker : null;

    const sel = all.find(h => h.ticker === selectedTk) || null;
    const selectedStock = sel ? this._packDetail(sel) : null;

    // circuit breakers — adapt from alerts.json
    const cbs = c.alerts.circuit_breakers.map(cb => {
      let detail = '';
      if (cb.key === 'drawdown') {
        const dd = Math.abs(cb.value * 100).toFixed(1);
        detail = `当前 −${dd}% · 触发线 −5% / −8% / −15%`;
      } else if (cb.key === 'correlation') {
        detail = `平均相关 ${cb.value} · 减仓线 ${cb.threshold}`;
      } else {
        detail = cb.note || '';
      }
      // map raw state → display state per ladder
      let st = cb.state;
      if (cb.key === 'drawdown') {
        const v = Math.abs(cb.value);
        st = v < 0.05 ? 'normal' : v < 0.08 ? 'reduce' : v < 0.15 ? 'pause' : 'liquidate';
      }
      return {
        key: cb.key, name: cb.name,
        stateTxt: CB_STATE_TXT[st] || st,
        color:    CB_COLOR[st]    || '#6B7480',
        detail
      };
    });

    // stock alerts list (fire first, then watch)
    const fired = [], watched = [];
    all.forEach(h => {
      const st = stockAlertState(h);
      if (st === 'normal') return;
      const row = {
        ticker: h.ticker, metric: h.monitor.metric,
        current: h.monitor.current, threshold: h.monitor.threshold,
        unit: h.monitor.unit, tripwire: h.tripwire,
        cmp: h.monitor.direction === 'below' ? '跌破' : '升破',
        cls: st, sevTxt: st === 'fire' ? '触发' : '观察',
        pushTarget: PUSH_TARGET_DEFAULT[h.ticker] || 'CEG'
      };
      if (st === 'fire') fired.push(row); else watched.push(row);
    });

    // Compact summary of CB states for the hero card: e.g. "✓ ⚠ —"
    const cbGlyph = (st) => ({
      normal: '✓', pending: '—',
      watch: '⚠', reduce: '⚠',
      pause:  '⛔', liquidate: '⛔', fire: '⛔'
    })[st] || '·';
    const cbSummary = cbs.map(cb => cbGlyph(cb.stateTxt === '正常'   ? 'normal' :
                                            cb.stateTxt === '观察'   ? 'watch'  :
                                            cb.stateTxt === '减仓'   ? 'reduce' :
                                            cb.stateTxt === '暂停'   ? 'pause'  :
                                            cb.stateTxt === '清仓'   ? 'liquidate' :
                                            cb.stateTxt === '待接入' ? 'pending' : 'normal')).join(' ');

    this.setData({
      ready: true,
      asOf: c.holdings.as_of,
      status: getApp().globalData.status,
      stocks,
      totalCount: all.length,
      filteredCount: list.length,
      selected: selectedTk,
      selectedStock,
      cbs,
      stockAlerts: fired.concat(watched),
      fireCount: fired.length,
      watchCount: watched.length,
      cbSummary
    });
  },

  _packDetail(h) {
    const layer = LAYER[h.layer];
    return {
      ticker: h.ticker, name: h.name,
      color: layer.color, colorBg: layer.color + '22', layerName: layer.name,
      wtPct: Math.round(h.weight * 100),
      pillars: h.pillars,
      kpis: h.kpis,
      health: h.health, hcolor: healthColor(h.health),
      healthNote: h.health >= 78 ? '良好 — 基本面仍在验证论点'
                : h.health >= 66 ? '中性 — 需密切跟踪'
                                 : '偏弱 — 论点出现裂痕',
      tripwire: h.tripwire,
      monitor: h.monitor
    };
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.f }, () => this._render());
  },
  onSelect(e) {
    this.setData({ selected: e.currentTarget.dataset.tk }, () => this._render());
  },
  onPushToRotation(e) {
    const out = e.currentTarget.dataset.out;
    const into = e.currentTarget.dataset.in;
    // stash an intent for the rotation tab to pick up on its onShow
    getApp().globalData.rotationIntent = { out, in: into, ts: Date.now() };
    wx.switchTab({ url: '/pages/rotation/rotation' });
  }
});
