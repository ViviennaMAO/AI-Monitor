// Luffa AI Ecosystem Fund · SuperBox cockpit
// One App() instance — keeps wallet identity + cached contract JSON in globalData
// so each page can render without re-fetching.

import { luffa, sessionUuid } from './utils/luffa';
import { loadAll } from './utils/data';

App({
  globalData: {
    wallet: null,         // { address, nickname, cid, ... } — populated by silent connect
    walletReady: false,   // true once the soft-login resolved (success or fail)
    language: 'zh-Hans',
    contracts: null,      // { holdings, regime, exposure, bench, alerts, backtest, model_health }
    status: 'demo',       // mirrors model_health.status — 'demo' | 'live'
    asOf: null
  },

  onLaunch() {
    // 1) Silent soft-login — Luffa SuperBox auto-grants identity on app open;
    //    no UI button needed. Pages read globalData.wallet directly, or `await
    //    globalData.walletPromise` if they need to wait for soft-login to settle.
    this.globalData.walletPromise = luffa('connect', { uuid: sessionUuid(), network: 'mainnet' })
      .then(wallet => { this.globalData.wallet = wallet; return wallet; })
      .catch(()    => { /* IDE simulator or offline — pages render placeholder */ return null; })
      .then(w => { this.globalData.walletReady = true; return w; });

    // 2) language probe — used to localize disclosure copy later
    luffa('language').then(r => {
      if (r && r.result) this.globalData.language = r.result;
    }).catch(() => {});

    // 3) preload the 7 contract JSONs (mock in demo build; replace base URL when接入真实流水线)
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
