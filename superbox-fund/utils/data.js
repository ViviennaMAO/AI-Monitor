/**
 * Contract JSON loader. Mirrors the 7 files defined in
 * 《AI 生态基金 · 数据接口与回测契约》§3:
 *   holdings · regime · exposure · bench · alerts · backtest · model_health
 *
 * Demo build: returns embedded mock data so the cockpit renders without backend.
 * Live build: flip USE_REMOTE = true and add the domain to the SuperBox console's
 *             `request` whitelist; each file fetched via wx.request (HTTPS only).
 *
 * Rendering code on each page is signature-stable — only this module changes when接入真实流水线.
 */

const USE_REMOTE = false;
const BASE = 'https://api.luffa-fund.example.com/pipeline/output';

// ---------------------------------------------------------------- embedded mock
const MOCK = {
  holdings: {
    as_of: '2026-06-11',
    fund: { nav: 1.184, excess_vs_bench: 0.061, drawdown: -0.042,
            max_drawdown: -0.197, beta: 1.32, cash: 0.12 },
    holdings: [
      { ticker:'NVDA',  name:'英伟达',     layer:'compute', weight:0.15, day_change:0.018,  health:82, capex_beta:'high',
        pillars:['CUDA 护城河','数据中心加速期','定价权强'],
        kpis:[{label:'数据中心营收 YoY',value:'+94%'},{label:'毛利率',value:'75%'}],
        tripwire:'数据中心营收增速连续两季放缓 / 大客户ASIC替代加速',
        monitor:{ metric:'数据中心营收 YoY', current:94, threshold:60, direction:'below', unit:'%' } },
      { ticker:'AVGO',  name:'博通',       layer:'compute', weight:0.09, day_change:0.009,  health:76, capex_beta:'high',
        pillars:['定制 AI ASIC + 高速网络','VMware 现金流对冲','AI 收入占比抬升'],
        kpis:[{label:'AI 收入 YoY',value:'+63%'},{label:'毛利率',value:'77%'}],
        tripwire:'超大厂定制 ASIC 订单指引下修',
        monitor:{ metric:'AI 收入 YoY', current:63, threshold:35, direction:'below', unit:'%' } },
      { ticker:'TSM',   name:'台积电',     layer:'compute', weight:0.08, day_change:0.006,  health:80, capex_beta:'high',
        pillars:['先进制程与 CoWoS 唯一可靠产能','全 AI 链上游卡位','产能与定价同步抬升'],
        kpis:[{label:'先进制程占比',value:'>60%'},{label:'CoWoS 稼动',value:'满载'}],
        tripwire:'先进制程稼动率下行或地缘风险升级',
        monitor:{ metric:'先进制程稼动率', current:96, threshold:80, direction:'below', unit:'%' } },
      { ticker:'AMD',   name:'超威',       layer:'compute', weight:0.07, day_change:-0.007, health:64, capex_beta:'high',
        pillars:['GPU 第二供应商红利','客户多元化','份额上升空间'],
        kpis:[{label:'数据中心 YoY',value:'+38%'},{label:'毛利率',value:'53%'}],
        tripwire:'MI 系列放量不及指引',
        monitor:{ metric:'MI 数据中心 YoY', current:38, threshold:40, direction:'below', unit:'%' } },
      { ticker:'MSFT',  name:'微软',       layer:'cloud',   weight:0.10, day_change:0.005,  health:78, capex_beta:'high',
        pillars:['Azure + OpenAI + Copilot 全链路','企业级分发最强','现金流厚'],
        kpis:[{label:'Azure YoY',value:'+31%'},{label:'AI 贡献 Azure',value:'+12pp'}],
        tripwire:'Azure 增速放缓且 Capex 回报存疑',
        monitor:{ metric:'Azure YoY', current:31, threshold:25, direction:'below', unit:'%' } },
      { ticker:'GOOGL', name:'谷歌',       layer:'cloud',   weight:0.08, day_change:0.003,  health:72, capex_beta:'high',
        pillars:['Gemini + 自有 TPU','云利润率改善','搜索现金牛'],
        kpis:[{label:'Cloud YoY',value:'+28%'},{label:'Cloud 利润率',value:'抬升'}],
        tripwire:'搜索货币化被 AI 答案侵蚀',
        monitor:{ metric:'搜索货币化稳健度', current:80, threshold:70, direction:'below', unit:'' } },
      { ticker:'META',  name:'Meta',       layer:'cloud',   weight:0.07, day_change:-0.004, health:70, capex_beta:'high',
        pillars:['Llama 开源生态绑定开发者','广告 AI 提 ROI','现金流支撑 Capex'],
        kpis:[{label:'广告收入 YoY',value:'+22%'},{label:'Capex 同比',value:'+大幅'}],
        tripwire:'Capex 失控而 AI 变现滞后',
        monitor:{ metric:'Capex / 经营现金流', current:62, threshold:65, direction:'above', unit:'%' } },
      { ticker:'PLTR',  name:'Palantir',   layer:'app',     weight:0.08, day_change:0.024,  health:68, capex_beta:'low',
        pillars:['AIP 把 AI 落地为生产力','美商业增速强','稀缺的应用层兑现'],
        kpis:[{label:'美商业 YoY',value:'+大幅'},{label:'净留存',value:'>120%'}],
        tripwire:'估值消化叠加净新增放缓',
        monitor:{ metric:'远期 PE 历史分位', current:88, threshold:90, direction:'above', unit:'' } },
      { ticker:'NOW',   name:'ServiceNow', layer:'app',     weight:0.06, day_change:0.004,  health:74, capex_beta:'low',
        pillars:['工作流 Agent 嵌入企业核心','cRPO 稳健','平台横向扩展'],
        kpis:[{label:'cRPO YoY',value:'+24%'},{label:'NRR',value:'98%'}],
        tripwire:'NRR 持续下行',
        monitor:{ metric:'净留存 NRR', current:98, threshold:92, direction:'below', unit:'%' } },
      { ticker:'VRT',   name:'Vertiv',     layer:'power',   weight:0.10, day_change:0.011,  health:77, capex_beta:'high',
        pillars:['数据中心电力散热刚需','订单 backlog 创新高','卡位关键瓶颈'],
        kpis:[{label:'backlog',value:'创新高'},{label:'营收 YoY',value:'+20%'}],
        tripwire:'数据中心建设节奏放缓',
        monitor:{ metric:'订单 backlog YoY', current:28, threshold:15, direction:'below', unit:'%' } }
    ]
  },

  regime: {
    as_of: '2026-06-11',
    verdict: { season:'summer', label:'盛夏 · 进攻为主', gauge:0.78, stance:'offense' },
    final_mult: 1.18,
    signals: [
      { key:'capex_guidance',   name:'超大厂 Capex 指引',  state:'up',            is_master:true, z:1.2 },
      { key:'liquidity',        name:'流动性 / 利率',       state:'neutral_loose', z:0.3 },
      { key:'inference_demand', name:'推理 / Token 需求',   state:'accelerating',  z:1.5 },
      { key:'supply_power',     name:'电力 / 供应链约束',   state:'tightening',    z:-0.8 }
    ],
    layers: {
      L1_macro_quadrant:   { quadrant:'overheating', mult:1.00 },
      L2_market_structure: { state:'trending',       adj:1.05 },
      L3_event_overlay:    { delta:-0.05,            events:['supply_constraint'] },
      L4_capex_cycle:      { state:'capex_expansion', mult:1.10 }
    }
  },

  exposure: {
    segments: { compute:0.39, cloud:0.25, app:0.14, power:0.10, cash:0.12 },
    segment_counts: { compute:4, cloud:3, app:2, power:1 },
    concentration: { top1:0.15, top3:0.35, top5:0.52 },
    avg_correlation: 0.81,
    capex_beta_high_count: 8,
    independent_bets_est: 3
  },

  bench: {
    candidates: [
      { ticker:'MU',   name:'美光',         layer:'compute', capex_beta:'mid',  readiness:78,
        thesis:'HBM 内存周期向上,与逻辑芯片不同节奏',
        catalyst:'HBM3E 放量 / 下季产能指引',
        promotion_trigger:'AMD MI 放量不及 → 同段以内存周期上行替代' },
      { ticker:'ARM',  name:'Arm',          layer:'compute', capex_beta:'low',  readiness:72,
        thesis:'IP 授权轻资产,版税随出货累积',
        catalyst:'AI 端侧授权 / 版税率提升',
        promotion_trigger:'降低算力段重资产暴露' },
      { ticker:'ORCL', name:'甲骨文',       layer:'cloud',   capex_beta:'high', readiness:74,
        thesis:'OCI AI 基建追赶,RPO 高增长',
        catalyst:'OCI RPO 增速',
        promotion_trigger:'云段出现弱者(如 META Capex 失控)替换' },
      { ticker:'CRM',  name:'Salesforce',   layer:'app',     capex_beta:'low',  readiness:70,
        thesis:'Agentforce 把 Agent 直接变现',
        catalyst:'Agentforce 付费渗透',
        promotion_trigger:'扩大应用段或改善分散' },
      { ticker:'CEG',  name:'Constellation',layer:'power',   capex_beta:'low',  readiness:80,
        thesis:'核电直供数据中心,与算力叙事低相关',
        catalyst:'数据中心供电协议 / 核电产能',
        promotion_trigger:'组合 Capex-β 过高 → 用电力侧降系统性相关' },
      { ticker:'ETN',  name:'伊顿',         layer:'power',   capex_beta:'mid',  readiness:75,
        thesis:'电气设备受益电力瓶颈',
        catalyst:'数据中心 / 电网订单',
        promotion_trigger:'增配供应链段、对冲电力瓶颈' }
    ]
  },

  alerts: {
    as_of: '2026-06-11',
    circuit_breakers: [
      { key:'drawdown',    name:'回撤熔断',     state:'normal', value:-0.042,
        ladder:{ reduce:-0.05, pause:-0.08, liquidate:-0.15 }, mult:1.0 },
      { key:'correlation', name:'相关性熔断',   state:'watch',  value:0.81,
        threshold:0.85, mult:1.0 },
      { key:'ic_monitor',  name:'信号有效性',   state:'pending',
        rolling_ic:null, note:'接入真实数据后启用' }
    ],
    stock_alerts: [
      { ticker:'AMD', state:'fire',  metric:'MI 数据中心 YoY', current:38, threshold:40,
        direction:'below', push_target:'MU' }
    ],
    portfolio_mult: 1.0
  },

  backtest: {
    as_of: '2026-06-11', frequency: 'weekly',
    account: { annualized:0.171, max_drawdown:-0.143, sharpe:1.42,
               win_rate:0.58, excess_vs_bench:0.061, n_rebalances:36 },
    contribution_bps: { NVDA:142, AVGO:71, TSM:48, AMD:-22, MSFT:63,
                         GOOGL:39, META:-18, PLTR:96, NOW:31, VRT:74 },
    validation: { method:'CPCV', n_paths:15, median_sharpe:0.9, p_value:0.21,
                  alpha_confirmed:false, oos_start:'2025-10-01',
                  note:'AI Capex 周期样本不足,CPCV 统计力弱,alpha 多数情形不可确认' }
  },

  model_health: {
    oos_ic: null,
    factor_ic: { capex_revision:null, earnings_revision:null, momentum:null, valuation:null },
    collinearity_warnings: [],
    alpha_confirmed: false,
    status: 'demo'
  }
};

// ---------------------------------------------------------------- public API
function fetchJson(name) {
  if (!USE_REMOTE) return Promise.resolve(MOCK[name]);
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}/${name}.json`,
      success: r => (r.statusCode >= 200 && r.statusCode < 300) ? resolve(r.data) : reject(r),
      fail: reject
    });
  });
}

export function loadAll() {
  const names = ['holdings','regime','exposure','bench','alerts','backtest','model_health'];
  return Promise.all(names.map(fetchJson)).then(rs => {
    const out = {}; names.forEach((n, i) => out[n] = rs[i]); return out;
  });
}

export { fetchJson };
