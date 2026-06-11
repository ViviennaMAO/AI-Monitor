/**
 * Pure helpers for cockpit pages — no wx.* calls here, so this module is unit-testable
 * outside SuperBox.
 *
 * The three-gate rotation logic mirrors simulate_rotation() in
 * 《数据接口与回测契约》§4 and the client-side runSim() in luffa_superbox_fund.html.
 */

export const LAYER = {
  compute: { name:'算力/芯片',   color:'#8B7FE8' },
  cloud:   { name:'云/模型',     color:'#2DD4BF' },
  app:     { name:'应用/Agent',  color:'#F08A6B' },
  power:   { name:'电力/供应链', color:'#E5A84B' }
};

export const SEG_NAME = { compute:'算力', cloud:'云', app:'应用', power:'供应链' };

/** Health-bar color: green ≥ 78, amber ≥ 66, red below. */
export function healthColor(h) {
  return h >= 78 ? '#4ADE80' : h >= 66 ? '#E5A84B' : '#F26D6D';
}

/** Capex-β display tag (used on holding cards + bench cards). */
export function capexTag(v) {
  return { high:['高','#F26D6D'], mid:['中','#E5A84B'], low:['低','#4ADE80'] }[v] || ['—','#6B7480'];
}

/** Per-stock alert state — derived from monitor.{current, threshold, direction}. */
export function stockAlertState(h, overrideCur) {
  const cur = (overrideCur !== undefined ? overrideCur : h.monitor.current);
  const { threshold, direction } = h.monitor;
  let breach, warn;
  if (direction === 'below') { breach = cur <  threshold;        warn = cur <  threshold * 1.05; }
  else                        { breach = cur >  threshold;        warn = cur >  threshold * 0.90; }
  return breach ? 'fire' : warn ? 'watch' : 'normal';
}

// ---- portfolio aggregates ----

export function segmentWeights(holdings) {
  const s = { compute:0, cloud:0, app:0, power:0 };
  holdings.forEach(h => { s[h.layer] += h.weight; });
  return s;
}

export function top3Concentration(holdings) {
  return holdings.map(h => h.weight).sort((a,b) => b-a).slice(0,3).reduce((a,b) => a+b, 0);
}

export function capexHighCount(list) {
  return list.filter(h => h.capex_beta === 'high').length;
}

/**
 * Three-gate rotation evaluator. Returns:
 *   { before, after, gates: { g1, g2, g3, g3Errors }, verdict, ok }
 *
 * Gate 1 · trigger     — outgoing health < 70 OR tripwire hit OR segment overweight
 * Gate 2 · candidate   — incoming readiness ≥ 70 (PRD says "就绪+段位")
 * Gate 3 · validation  — single ≤ 18% AND top3 ≤ 40% AND Capex-β high count not增
 */
export function evaluateRotation(holdings, outTicker, inCandidate) {
  const out  = holdings.find(h => h.ticker === outTicker);
  if (!out) return null;
  const candidate = {
    ticker:   inCandidate.ticker,
    name:     inCandidate.name,
    layer:    inCandidate.layer,
    weight:   out.weight,                // preserve sleeve size
    health:   inCandidate.readiness,     // map readiness → health for同构 rendering
    capex_beta: inCandidate.capex_beta
  };
  const after  = holdings.filter(h => h.ticker !== outTicker).concat([candidate]);

  const segB = segmentWeights(holdings),  segA = segmentWeights(after);
  const t3B  = top3Concentration(holdings), t3A  = top3Concentration(after);
  const hcB  = capexHighCount(holdings),    hcA  = capexHighCount(after);

  const g1 = out.health < 70;
  const g2 = inCandidate.readiness >= 70;

  const capOK  = out.weight <= 0.18;
  const concOK = t3A         <= 0.40;
  const betaOK = hcA         <= hcB;
  const g3 = capOK && concOK && betaOK;
  const g3Errors = [];
  if (!capOK)  g3Errors.push('单票 > 18%');
  if (!concOK) g3Errors.push('前三大 > 40%');
  if (!betaOK) g3Errors.push('Capex-β 标的数上升');

  let verdict;
  if (hcA < hcB) verdict = { tone:'pos',  txt:`✓ 降低系统性相关 — Capex-β 标的 ${hcB} → ${hcA}` };
  else if (out.capex_beta === 'high' && inCandidate.capex_beta === 'high')
                 verdict = { tone:'warn', txt:`○ 未改善相关性 — 高 β 换高 β,集中度 ${(t3A*100).toFixed(0)}%` };
  else           verdict = { tone:'muted',txt:`— 中性 — 段位与相关性变化有限,个股层面升级` };

  return {
    before: { seg:segB, t3:t3B, hc:hcB },
    after:  { seg:segA, t3:t3A, hc:hcA },
    gates:  { g1, g2, g3, g3Errors },
    verdict,
    ok: g1 && g2 && g3
  };
}

/** Auto-suggestions — same logic as renderSuggestions() in the HTML cockpit. */
export function autoSuggest(holdings, bench) {
  const amd  = holdings.find(h => h.ticker === 'AMD');
  const mu   = bench.find(b => b.ticker === 'MU');
  const ceg  = bench.find(b => b.ticker === 'CEG');
  const high = capexHighCount(holdings);
  const suggestions = [];
  if (amd && mu) suggestions.push({
    icon:'⚠', out:'AMD', in:'MU',
    text:`AMD 健康度 ${amd.health} 偏弱、MI 放量未达指引 → 同段升级为 MU(HBM 周期向上)`,
    why:'闸1 健康度触发 · 同属算力段,纯个股升级'
  });
  if (ceg) suggestions.push({
    icon:'◈', out:'AMD', in:'CEG',
    text:`组合 Capex-β ${high}/10 偏高、真实独立判断 ≈ 3 注 → 换出高 β 算力、换入 CEG 降系统性相关`,
    why:'闸3 改善分散 · 电力侧与算力叙事低相关'
  });
  return suggestions;
}
