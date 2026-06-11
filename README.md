# AI 生态基金驾驶舱 · Luffa SuperBox

> 依托 **Luffa 香港**(SFC 持牌实体,1 / 4 / 9 号牌)运作的 AI 产业生态主题基金的驾驶舱、调仓引擎与备用池管理工具。
>
> **方法论**:自上而下,宏观气候门控的四段全产业链布局(算力 → 云 / 模型 → 应用 → 电力供应链)。
>
> **硬约束**:人在回路 · 演示数据明确标注 · 非投资建议。

---

## 仓库结构

```
.
├── README.md
├── index.html                            # ① 自包含 HTML 演示看板 (Vercel 默认入口)
├── superbox-fund/                        # ② Luffa SuperBox 原生小程序
│   ├── app.js / app.json / app.wxss      #    入口 + tabBar + 暗色主题
│   ├── project.config.json               #    Luffa Cloud-Devtools 工程
│   ├── sitemap.json
│   ├── pages/
│   │   ├── cockpit/                      #    驾驶舱(KPI · L1 · L2 · PM 钱包)
│   │   ├── positions/                    #    持仓 L3 + 预警中心 + 熔断
│   │   └── rotation/                     #    调仓 L3.5(三道闸 + 模拟器 + 签署)
│   ├── utils/
│   │   ├── luffa.js                      #    wx.invokeNativePlugin Promise 包装
│   │   ├── data.js                       #    7 个契约 JSON loader (mock ↔ remote)
│   │   └── portfolio.js                  #    三道闸验证 + 自动建议(可单测)
│   └── mock/                             #    7 份契约样例 JSON
└── 三份契约文档 (.docx)
    ├── AI生态基金_产品需求文档PRD.docx
    ├── AI生态基金_开发文档.docx
    └── AI生态基金_数据接口与回测契约.docx
```

---

## 双前端

### ① HTML 演示看板 — [index.html](index.html)

单文件、自包含、零外部依赖,直接浏览器打开。包含 7 大模块:

| 模块 | 层 | 职责 |
|---|---|---|
| 基金驾驶舱 | — | 净值 / 超额 / 回撤 / β / 现金 |
| 市场气候门控 | L1 | 4 信号 → 气候判读 → final_mult |
| 价值链曝露地图 | L2 | 段位权重 + 集中度 + 假分散预警 |
| 个股观测 | L3 | 10 卡片 + 论点三支柱 + 健康度 + 触发器 |
| 预警中心 / 熔断 | — | 组合熔断 + 个股预警 + 情景模拟 |
| 调仓引擎 + 备用池 | L3.5 | 三道闸 + 自动建议 + 模拟器 |
| 方法论回测 | L4 | 净值 + 归因 + CPCV 验证 |

顶部带 SFC 合规框、`model_health` 状态徽章(DEMO / LIVE 双态)、JSON 契约就绪标识。

### ② SuperBox 原生小程序 — [superbox-fund/](superbox-fund/)

WXML / WXSS / JS 原生工程,三 tabBar 页签:

| 页签 | 文件 | 对应文档模块 |
|---|---|---|
| 驾驶舱 | [pages/cockpit](superbox-fund/pages/cockpit/) | KPI · L1 气候门控 · L2 曝露 · PM Luffa 钱包连接 |
| 持仓 | [pages/positions](superbox-fund/pages/positions/) | L3 个股网格 / 详情 · 预警 · 熔断 · 推送调仓 |
| 调仓 | [pages/rotation](superbox-fund/pages/rotation/) | L3.5 三道闸 · 模拟器 · 备用池 · 签署调仓单 |

---

## 数据契约(7 个 JSON)

均按《数据接口与回测契约》§3 字段定义。在 demo 模式下使用 [superbox-fund/mock/*.json](superbox-fund/mock/):

| JSON | 驱动 |
|---|---|
| `holdings.json` | KPI 条 + 个股观测 |
| `regime.json` | 市场气候门控 |
| `exposure.json` | 价值链曝露地图 |
| `bench.json` | 备用池 |
| `alerts.json` | 预警中心 / 熔断 |
| `backtest.json` | 方法论回测 |
| `model_health.json` | 状态栏 / IC 监控 |

**接入真实流水线**:编辑 [superbox-fund/utils/data.js](superbox-fund/utils/data.js),把 `USE_REMOTE = false` 改成 `true`,并把后端域名加入 Luffa 控制台 `request` 合法域名白名单。前端渲染函数签名不变。

---

## Luffa 原生桥

[superbox-fund/utils/luffa.js](superbox-fund/utils/luffa.js) 把 `wx.invokeNativePlugin({ api_name: 'luffaWebRequest' })` 包成 Promise。本应用只用三个 method:

| methodName | 用途 |
|---|---|
| `language` | 启动时探测 Luffa UI 语言 |
| `connect` | 驾驶舱页 — 拿到 PM 的钱包地址与昵称 |
| `signMessageV2` | 调仓页 — 对调仓单哈希签名(**不发起链上交易**) |

**合规设计**:本应用永远不调用 `signAndSubmitTransaction`,签出来的是 PM 审批签名,链下保存。交易由交易台手工执行,符合 PRD"人在回路、不自动执行"。

---

## 三道闸验证

[superbox-fund/utils/portfolio.js](superbox-fund/utils/portfolio.js) 的 `evaluateRotation()`(无 `wx.*` 依赖,可单测):

| 闸 | 条件 |
|---|---|
| 闸 1 · 触发 | 换出标的健康度 < 70 |
| 闸 2 · 候选 | 换入候选就绪度 ≥ 70 |
| 闸 3 · 验证 | 单票 ≤ 18% **且** 前三大 ≤ 40% **且** Capex-β 高 标的数不抬高 |

三闸**全部通过**才允许签署调仓单(UI 强制禁用)。

---

## 部署 SuperBox 小程序

1. **拿 AppID**:登录 Luffa Cloud 控制台 → 创建小程序 → 把 AppID 替换到 [superbox-fund/project.config.json](superbox-fund/project.config.json) 的 `TCMPPappid`。
2. **域名白名单**:把后端 `pipeline/output/*.json` 的域名加进控制台 → request 合法域名(HTTPS only)。
3. **预览 / 上传**:Luffa Cloud-Devtools 打开 `superbox-fund/` → 预览(模拟器)→ 上传(版本号 + 变更日志)。
4. **提交审核**:控制台 → 版本管理 → 提交审核。隐私披露必须写明读取钱包地址。

更详细的步骤见 PRD 与开发文档,以及内置的 `luffa-superbox-deploy` skill。

---

## 合规声明

- 本基金由 **Luffa 香港**(SFC 1 / 4 / 9 号牌)运作,**LAIF-I** 仅向合格投资者(Professional Investor)开放。
- 本仓库所有数值、回测、归因均为**演示数据**,用于展示驾驶舱结构与交互。
- 真实使用须在 SuperBox 接入真实行情与基本面数据源后重算,并遵守 `alpha_confirmed == false 时禁止任何回测优化`的纪律(详见数据契约 §7)。
- 本工具不构成投资建议,作者非持牌投资顾问。

---

## License

Internal. Luffa Limited (HK).
