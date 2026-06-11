// AI Ecosystem Fund · educational cockpit (sandbox)
// One App() instance — caches the 7 contract JSONs in globalData so each
// page can render without re-fetching.

import { loadAll } from './utils/data';

App({
  globalData: {
    contracts: null,      // { holdings, regime, exposure, bench, alerts, backtest, model_health }
    status: 'demo',       // mirrors model_health.status — 'demo' | 'live'
    asOf: null
  },

  onLaunch() {
    // preload the 7 contract JSONs (mock in demo build; flip USE_REMOTE in utils/data.js)
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
