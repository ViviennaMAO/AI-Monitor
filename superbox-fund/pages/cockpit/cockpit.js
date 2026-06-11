import { loadAll } from '../../utils/data';

const SIG_COLOR = {
  up:'#4ADE80', neutral_loose:'#4ADE80', accelerating:'#4ADE80',
  tightening:'#E5A84B', down:'#F26D6D', neutral_tight:'#E5A84B'
};
const SIG_LABEL = {
  up:'上修 ↑', neutral_loose:'中性偏松', accelerating:'加速',
  tightening:'趋紧 ⚠', down:'下修 ↓', neutral_tight:'中性偏紧'
};
const SEASON_ICON = { summer:'☀️', autumn:'🍂', winter:'❄️', spring:'🌱' };

Page({
  data: {
    ready: false,
    asOf:  '',
    status:'demo',

    // KPI bar
    nav:'1.000', excessPct:'0.0', ddPct:'0.0', mddPct:'0.0',
    beta:'1.00', cashPct:'0', investedPct:'100',

    // regime
    regime: null,
    regimeIcon: '☀️',
    gaugePct: 50,
    upCount: 0,
    warnCount: 0,
    sigColor: SIG_COLOR,
    sigLabel: SIG_LABEL,

    // exposure
    exposure: null,
    segPct: { compute:0, cloud:0, app:0, power:0, cash:0 },
    top1Pct: 0,
    top3Pct: 0,

    // wallet — driven by globalData (silent soft-login in app.js onLaunch)
    wallet: null,
    walletReady: false
  },

  onLoad() {
    this._render();
    this._awaitWallet();
  },
  onShow() {
    // refresh KPI + wallet on tab switch — globalData may have changed
    if (this.data.ready) this._render();
    this.setData({
      wallet:      getApp().globalData.wallet,
      walletReady: getApp().globalData.walletReady
    });
  },

  /** If soft-login is still in flight at onLoad time, wait for it to settle and refresh the card. */
  _awaitWallet() {
    const p = getApp().globalData.walletPromise;
    if (!p) return;
    p.then(() => this.setData({
      wallet:      getApp().globalData.wallet,
      walletReady: getApp().globalData.walletReady
    }));
  },
  onPullDownRefresh() {
    loadAll().then(c => {
      getApp().globalData.contracts = c;
      getApp().globalData.status    = (c.model_health && c.model_health.status) || 'demo';
      this._render();
    }).catch(() => {}).then(() => wx.stopPullDownRefresh());
  },

  _render() {
    const app = getApp();
    let c = app.globalData.contracts;
    if (!c) {
      // first call before app.onLaunch completed — load directly
      loadAll().then(loaded => {
        app.globalData.contracts = loaded;
        app.globalData.status    = (loaded.model_health && loaded.model_health.status) || 'demo';
        this._apply(loaded);
      }).catch(err => console.error(err));
      return;
    }
    this._apply(c);
  },

  _apply(c) {
    const f = c.holdings.fund;
    const ex = c.exposure;
    const reg = c.regime;
    const upCount   = reg.signals.filter(s => /^(up|accelerating|neutral_loose)$/.test(s.state)).length;
    const warnCount = reg.signals.filter(s => /^(down|tightening|neutral_tight)$/.test(s.state)).length;
    const segPct = {
      compute: Math.round(ex.segments.compute * 100),
      cloud:   Math.round(ex.segments.cloud   * 100),
      app:     Math.round(ex.segments.app     * 100),
      power:   Math.round(ex.segments.power   * 100),
      cash:    Math.round(ex.segments.cash    * 100)
    };
    this.setData({
      ready: true,
      asOf: c.holdings.as_of,
      status: getApp().globalData.status,

      nav:         f.nav.toFixed(3),
      excessPct:   (f.excess_vs_bench * 100).toFixed(1),
      ddPct:       Math.abs(f.drawdown * 100).toFixed(1),
      mddPct:      Math.abs(f.max_drawdown * 100).toFixed(1),
      beta:        f.beta.toFixed(2),
      cashPct:     Math.round(f.cash * 100),
      investedPct: 100 - Math.round(f.cash * 100),

      regime: reg,
      regimeIcon: SEASON_ICON[reg.verdict.season] || '☀️',
      gaugePct: Math.round(reg.verdict.gauge * 100),
      upCount, warnCount,

      exposure: ex,
      segPct,
      top1Pct: Math.round(ex.concentration.top1 * 100),
      top3Pct: Math.round(ex.concentration.top3 * 100),

      wallet:      getApp().globalData.wallet,
      walletReady: getApp().globalData.walletReady
    });
  },

  onTapHealth() {
    const text = this.data.status === 'live'
      ? '模型已接入真实数据 · IC 与 alpha 状态有效'
      : '当前为演示数据 · 接入真实流水线后 status 转为 live';
    wx.showToast({ title: text, icon: 'none', duration: 2400 });
  }
});
