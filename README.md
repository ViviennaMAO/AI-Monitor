# AI 生态基金 · 沙盒驾驶舱

> 一个 **教学沙盒**:演示「自上而下气候门控 + 四段产业链 + 三道闸调仓」的方法论结构与交互。
>
> **非投资建议** · 不接受资金 · 不下单 · 不构成任何买卖推荐。所有数值为演示数据。

线上看板:https://ai-monitor-one.vercel.app

---

## 仓库结构

```
.
├── README.md
├── index.html                            # ① 自包含 HTML 沙盒看板(Vercel 默认入口)
├── superbox-fund/                        # ② 原生 mini-program(三 tabBar 页签)
│   ├── app.js / app.json / app.wxss      #    入口 + tabBar + 蓝色主题
│   ├── project.config.json
│   ├── sitemap.json
│   ├── pages/
│   │   ├── cockpit/                      #    驾驶舱(KPI · L1 · L2)
│   │   ├── positions/                    #    持仓 L3 + 预警 + 熔断
│   │   └── rotation/                     #    调仓 L3.5(三道闸 + 模拟器)
│   ├── utils/
│   │   ├── data.js                       #    7 个契约 JSON loader(mock ↔ remote)
│   │   └── portfolio.js                  #    三道闸验证 + 自动建议(可单测)
│   ├── images/tab/                       #    tabBar PNG 图标
│   └── mock/                             #    7 份契约样例 JSON
└── 三份契约文档 (.docx)
    ├── AI生态基金_产品需求文档PRD.docx
    ├── AI生态基金_开发文档.docx
    └── AI生态基金_数据接口与回测契约.docx
```

---

## 双前端

### ① HTML 沙盒看板 — [index.html](index.html)

单文件、自包含、零外部依赖,浏览器直接打开。覆盖 7 个模块:

| 模块 | 层 | 职责 |
|---|---|---|
| KPI 条 | — | 净值 / 超额 / 回撤 / β / 现金(均为示例) |
| 市场气候门控 | L1 | 4 信号 → 气候判读 → final_mult |
| 价值链曝露地图 | L2 | 段位权重 + 集中度 + "假分散"预警 |
| 个股观测 | L3 | 10 卡片 + 论点三支柱 + 健康度 + 触发器 |
| 预警中心 / 熔断 | — | 组合熔断 + 个股预警 + 情景模拟 |
| 调仓引擎 + 备用池 | L3.5 | 三道闸 + 自动建议 + 模拟器 |
| 方法论回测 | L4 | 净值 + 归因 + CPCV 验证 |

顶部有 EDU 沙盒标识 + `model_health` 状态徽章(DEMO / LIVE 双态)+ JSON 契约就绪标识。

### ② 原生 mini-program — [superbox-fund/](superbox-fund/)

三 tabBar 页签的原生工程:

| 页签 | 文件 | 模块 |
|---|---|---|
| 驾驶舱 | [pages/cockpit](superbox-fund/pages/cockpit/) | KPI · L1 气候门控 · L2 曝露 |
| 持仓 | [pages/positions](superbox-fund/pages/positions/) | L3 个股网格 / 详情 · 预警 · 熔断 |
| 调仓 | [pages/rotation](superbox-fund/pages/rotation/) | L3.5 三道闸 · 模拟器 · 备用池 |

---

## 数据契约(7 个 JSON)

按《数据接口与回测契约》§3 字段定义。Demo 模式下使用 [superbox-fund/mock/*.json](superbox-fund/mock/):

| JSON | 驱动 |
|---|---|
| `holdings.json` | KPI 条 + 个股观测 |
| `regime.json` | 市场气候门控 |
| `exposure.json` | 价值链曝露地图 |
| `bench.json` | 备用池 |
| `alerts.json` | 预警中心 / 熔断 |
| `backtest.json` | 方法论回测 |
| `model_health.json` | 状态栏 / IC 监控 |

**接入真实数据**:编辑 [superbox-fund/utils/data.js](superbox-fund/utils/data.js),把 `USE_REMOTE = false` 改成 `true`,并把后端域名加入小程序平台的 request 合法域名白名单。前端渲染函数签名不变。

---

## 三道闸验证

[superbox-fund/utils/portfolio.js](superbox-fund/utils/portfolio.js) 的 `evaluateRotation()`(无 `wx.*` 依赖,可单测):

| 闸 | 条件 |
|---|---|
| 闸 1 · 触发 | 换出标的健康度 < 70 |
| 闸 2 · 候选 | 换入候选就绪度 ≥ 70 |
| 闸 3 · 验证 | 单票 ≤ 18% **且** 前三大 ≤ 40% **且** Capex-β 高 标的数不抬高 |

三闸全过才显示绿色 verdict,否则提示未通过。**纯展示**,无下单。

---

## 用途与免责

- 本项目是 **教学沙盒** / 方法论演示。**不构成任何投资建议**,不接受资金,不下单,不向任何用户作出买卖推荐。
- 所有标的代码均为公开样例,仅用于说明价值链结构。
- 所有数值、回测、KPI、归因、健康度均为 **演示数据**。回测存在前视偏误与幸存者偏差风险。
- 真实部署须遵守 `alpha_confirmed == false 时禁止任何回测优化` 的纪律(详见数据契约 §7)。

---

## License

Educational use.
