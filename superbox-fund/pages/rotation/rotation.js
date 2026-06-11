import { loadAll } from '../../utils/data';
import { LAYER, SEG_NAME, capexTag, healthColor,
         evaluateRotation, autoSuggest } from '../../utils/portfolio';

Page({
  data: {
    ready: false, asOf: '', status: 'demo',

    holdings: [],
    bench: [],
    outOptions: [], inOptions: [],
    outIndex: 0, inIndex: 0,

    suggestions: [],
    simResult: null
  },

  onLoad() { this._render(); },
  onShow() {
    if (this.data.ready) this._render();
    // process intent pushed from the positions tab
    const intent = getApp().globalData.rotationIntent;
    if (intent && Date.now() - intent.ts < 5000) {
      delete getApp().globalData.rotationIntent;
      this._applyIntent(intent.out, intent.in);
    }
  },
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
    const holdings = c.holdings.holdings;
    const bench    = c.bench.candidates;

    const outOptions = holdings.map(h => ({
      ticker: h.ticker,
      display: `${h.ticker} · ${SEG_NAME[h.layer]} · 健康 ${h.health}`
    }));
    const inOptions = bench.map(b => {
      const t = capexTag(b.capex_beta);
      return {
        ticker: b.ticker,
        display: `${b.ticker} · ${SEG_NAME[b.layer]} · β${t[0]} · 就绪 ${b.readiness}`
      };
    });

    // keep prior selection if still valid; default to first AMD→MU pair
    const outIdx = Math.max(0, outOptions.findIndex(o => o.ticker === (this._lastOut || 'AMD')));
    const inIdx  = Math.max(0, inOptions.findIndex(o  => o.ticker === (this._lastIn  || 'MU' )));

    const benchEnriched = bench.map(b => {
      const layer = LAYER[b.layer];
      const t = capexTag(b.capex_beta);
      return {
        ticker: b.ticker, name: b.name,
        color: layer.color,
        cbTxt: t[0], cbColor: t[1], cbBg: t[1] + '22',
        readiness: b.readiness, rcolor: healthColor(b.readiness),
        thesis: b.thesis, catalyst: b.catalyst,
        promotion_trigger: b.promotion_trigger
      };
    });

    const suggestions = autoSuggest(holdings, bench);

    this.setData({
      ready: true,
      asOf: c.holdings.as_of,
      status: getApp().globalData.status,
      outOptions, inOptions,
      outIndex: outIdx, inIndex: inIdx,
      suggestions,
      bench: benchEnriched
    }, () => {
      this._runSim();
    });
  },

  _applyIntent(outTk, inTk) {
    const outIdx = this.data.outOptions.findIndex(o => o.ticker === outTk);
    const inIdx  = this.data.inOptions.findIndex(o  => o.ticker === inTk);
    if (outIdx < 0 || inIdx < 0) return;
    this._lastOut = outTk; this._lastIn = inTk;
    this.setData({ outIndex: outIdx, inIndex: inIdx }, () => this._runSim());
  },

  _runSim() {
    const out  = this.data.outOptions[this.data.outIndex].ticker;
    const into = this.data.inOptions [this.data.inIndex ].ticker;
    this._lastOut = out; this._lastIn = into;

    // re-pull the raw (un-enriched) candidate from globalData — evaluateRotation needs the
    // original schema (layer key, not color), so we can't reuse this.data.bench which is enriched
    const cAll = getApp().globalData.contracts;
    const benchRaw = cAll.bench.candidates.find(b => b.ticker === into);
    if (!benchRaw) return;

    const result = evaluateRotation(cAll.holdings.holdings, out, benchRaw);
    if (!result) return;

    const outH = cAll.holdings.holdings.find(h => h.ticker === out);
    const cells = [
      this._cell('算力',  result.before.seg.compute, result.after.seg.compute, true),
      this._cell('云',    result.before.seg.cloud,   result.after.seg.cloud,   true),
      this._cell('应用',  result.before.seg.app,     result.after.seg.app,     true),
      this._cell('供应链',result.before.seg.power,   result.after.seg.power,   true),
      this._cell('前三大',result.before.t3,           result.after.t3,           true),
      { label: 'Capex-β 数', before: result.before.hc, after: result.after.hc,
        unit:'', tone: result.after.hc < result.before.hc ? 'pos'
                     : result.after.hc > result.before.hc ? 'neg' : '' }
    ];

    this.setData({
      simResult: {
        cells,
        gates: {
          g1: result.gates.g1,
          g1Txt: result.gates.g1 ? `${out} 健康 ${outH.health} < 70 · 满足换出` : `${out} 健康 ${outH.health} · 无强制换出`,
          g2: result.gates.g2,
          g2Txt: `${into} 就绪 ${benchRaw.readiness}${result.gates.g2 ? ' · 达标' : ' · 偏低需观察'}`,
          g3: result.gates.g3,
          g3Txt: result.gates.g3 ? '单票 ≤ 18% · 前三大 ≤ 40% · β 不上升'
                                 : result.gates.g3Errors.join(' · ')
        },
        verdict: result.verdict,
        ok: result.ok
      }
    });
  },

  _cell(label, beforeFrac, afterFrac, isPct) {
    const b = Math.round(beforeFrac * (isPct ? 100 : 1));
    const a = Math.round(afterFrac  * (isPct ? 100 : 1));
    const tone = a > b ? 'pos' : a < b ? 'neg' : '';
    return { label, before: b, after: a, unit: isPct ? '%' : '', tone };
  },

  onSelOut(e) {
    this.setData({ outIndex: +e.detail.value }, () => this._runSim());
  },
  onSelIn(e) {
    this.setData({ inIndex: +e.detail.value }, () => this._runSim());
  },
  onLoadSuggestion(e) {
    this._applyIntent(e.currentTarget.dataset.out, e.currentTarget.dataset.in);
  },
  onRunSim() { this._runSim(); }
});
