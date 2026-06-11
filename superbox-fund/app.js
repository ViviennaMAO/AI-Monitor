// Luffa AI Ecosystem Fund · SuperBox cockpit
// One App() instance — keeps wallet identity + cached contract JSON in globalData
// so each page can render without re-fetching.

import { luffa } from './utils/luffa';
import { loadAll } from './utils/data';

App({
  globalData: {
    wallet: null,         // { address, nickname, cid, ... } after Luffa connect
    language: 'zh-Hans',
    contracts: null,      // { holdings, regime, exposure, bench, alerts, backtest, model_health }
    status: 'demo',       // mirrors model_health.status — 'demo' | 'live'
    asOf: null
  },

  onLaunch() {
    // 1) language probe — used to localize disclosure copy later
    luffa('language').then(r => {
      if (r && r.result) this.globalData.language = r.result;
    }).catch(() => {});

    // 2) preload the 7 contract JSONs (mock in demo build; replace base URL when接入真实流水线)
    loadAll().then(c => {
      this.globalData.contracts = c;
      this.globalData.status    = (c.model_health && c.model_health.status) || 'demo';
      this.globalData.asOf      = c.holdings && c.holdings.as_of;
    }).catch(err => {
      console.error('[App.onLaunch] loadAll failed', err);
    });
  },

  onShow() {},

  onError(err) {
    console.error('[App.onError]', err);
  }
});
