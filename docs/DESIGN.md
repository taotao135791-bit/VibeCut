# VibeCut · Visual Direction (DESIGN.md)

> **Single source of truth for ALL visual decisions made by the VibeCut agent and any human contributor.**
> 优先级：**本文件 > prompt > 直觉**。任何 promo / ad / kinetic-type / motion 视频在动手前必须读这一份。
>
> 综合自：[Anthropic skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) · [nexu-io/html-video](https://github.com/nexu-io/html-video) (21 模板) · [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · [garrytan/gstack](https://github.com/garrytan/gstack)

---

## 0. 第一性原理（不可妥协）

> **Refuse generic AI aesthetics. Commit to a BOLD direction. Execute with precision.** — Anthropic frontend-design

平庸来自"什么都想要"。每一支视频在第一秒就必须能让观众回答："这是哪一种世界？"  
不要在中间地带——要么极简到只剩一个动作（Exaggerated Minimalism），要么密度爆炸到信息溢出（Editorial Brutalism）。**对中庸说不。**

### 反 AI-Slop 黑名单（出现一项即重做）

| ❌ 禁止 | ✅ 替代 |
|---|---|
| `Inter` / `Roboto` / `Arial` / `system-ui` 当主标 | Bebas Neue · Anton · Playfair Display · Libre Bodoni · Space Mono · Cormorant Garamond |
| `Space Grotesk`（已被烂大街） | Newsreader / Public Sans / Epilogue |
| 紫蓝渐变（"AI 紫"）+ 白底 | 黑底 + 单 sharp accent；或 OLED 纯黑 + 数据色绿 |
| 4 种以上 hero 配色，每色平均分布 | **1 dominant + 1 sharp accent**，accent 占比 ≤ 8% |
| 通片居中对齐 | 左对齐 baseline 锚定，破对称，刻意右溢出 |
| 标准 FullCard 全屏卡 + emoji 装饰 | 错位 lockup / Bento grid / pull quote / drop cap |
| 通片淡入淡出 | Staggered reveal（letter-by-letter / word-by-word / number ticker） |
| 单层主体 | RGB chromatic split 错位 + grain noise + scanline |
| 永久居中的字幕角标 | File mark + frame counter + ticker，三种位置共存 |

---

## 1. 如何合成一个方向（不是选，是生）

> 任何从固定清单里“选”一个方向的行为，本身就是 AI-slop。本节不提供选项，只提供**合成公式**。每一次 promo / ad / motion 项目都必须现场生成一个**不可复用、不可被下一个项目复粘**的独一无二方向。

### 公式 · INFLUENCE × COUNTER × VERB

```
     ≥3 个跨媒介、跨时代、跨学科的 non-obvious 影响源
  ×  1 个 counter-convention（本行业 / 本媒介里没人这么干）
  ×  1 个 verb metaphor（这支作品在做什么动作）
  =  一句话、一次性、不可复用的方向
```

### Step 1 · 采集 ≥3 个 non-obvious 影响源

最首出出现的参考不计。AI 模型广告里“Wired 赛博 / 紫蓝渐变 / Tron / The Matrix” 一律拒使。打开以下六个面向，每面向抽一到两个项目。下表永远 mutable：

| 面向 | 点火词（仅启发） |
|---|---|
| 电影 / 影像 | Tarkovsky / Wong Kar-wai / 80s VHS / NHK 误播 / Apple Keynote 2007 / La Jetée / 香港 90s 黑帮片 / Criterion 封面 |
| 出版 / 平面 | Emigre / Wired Issue 1 / Penguin 古典 / Bauhaus Dessau 书 / 《新青年》 / 1970s 民航发车表 |
| 艺术 · 运动 | 构成主义 / Memphis 1981 / Vorticism / 佐藤茧海报 / 包豪斯 / Op Art |
| 物理 / 材质 | 火车站翻牌字 / 金属压印 / 报纸油墨渗透 / 玻璃上冷凝 / 蜡封压印 / 打字机色带 |
| 街头 · 次文化 | 香港茶餐厅菜单 / Punk zine / 朝鲜官媒报头 / 70s 中全会会场布置 |
| 技术 · 伪装 | DOS BIOS / Bloomberg Terminal / IBM 8086 / 火车站机械式发车表 / Telex 电传机 |

### Step 2 · 选一个 counter-convention

三问自己：

1. 本行业 / 本题材默认长什么样？列出 3 个。
2. 哪一项反起来最狮胆？那就是本项目的 *counter*。
3. counter 与 Step 1 的影响源产生什么化学反应？

示例：AI 模型默认 = RGB 玻璃 / 未来感 / 紫蓝。**counter** = “用 1972 原子能机构技术报告书的鋼印黑白报头”。

### Step 3 · 用一个 verb metaphor 收拢

不要“名词 + 名词”（那只是标签）。用一个动词：

- *Stamping a model spec onto a press wire dispatch*
- *Tuning a long-wave radio that finally locks onto signal*
- *Pressing wax over a court transcript*
- *Pinning a leaflet to the leaving-train timetable*

一句话能说清，才能被身体领会。

### 输出格式（必填在脚本 frontmatter）

```yaml
direction_id: "<slug-unique-to-this-project>"     # 例：k26-press-dispatch
influences:                                       # ≥3
  - "1972 IAEA technical report typesetting"
  - "NHK 误播黑白道歉字幕 1989"
  - "Manhattan Project declassified memo"
counter_convention: "拒绝今天 AI 模型默认的 RGB 玻璃 + 紫蓝渐变"
verb_metaphor: "Stamping a model spec onto a press wire dispatch"
palette: { dom: "#0a0a0a", text: "#e8e6e1", accent: "#b81d13", data: "#f4d35e" }
type_pair: { display: "playfair-display", caps: "bebas-neue", mono: "jetbrains-mono", body: "newsreader" }
```

### 合成范例（展示“每次都不重样”是什么意思）

以下三个示例均为 *Kimi K2.6 30s ad* 这一同一题目生成 —— 你看到三种完全不同的世界，就明白为什么不能预存为清单：

- **k26-press-dispatch** = `IAEA 1972 报告` + `火车站发车表翻牌` + `Telex 电传` × 反 RGB 玻璃 × *Stamping spec onto press wire*
- **k26-cantonese-tea-receipt** = `香港茶餐厅菜单` + `Wong Kar-wai 抽帧` + `Hong Kong neon 霉玻璃` × 反企业发布会 × *Folding the model into a midnight 饭后 order*
- **k26-supreme-court-stamp** = `Constructivist 招贴` + `蜡封压印` + `Bloomberg Terminal` × 反 Apple Keynote × *Pressing wax onto a verdict*

三个用同一公式生成、不可互换、下一个项目都不能复粘。**这才是“持续创造”。**

### 反退退机制（防止隐形收敛到“7 选 1”）

任何 promo 提交前，agent 必须检查上一个项目的 `direction_id`。若本项目 `direction_id` 与其 influence 集合与上一个重复率 ≥ 50%，需发起一轮 *re-roll*：重新走 Step 1。2 次 re-roll 不能解决则告警人类。

---

## 2. 排版工程（Type Engineering）

### 模数化字号节奏（Modular Scale, ratio 1.5）

```
caption  18  ← file mark / frame counter / 注脚来源
body     22  ← italic 注脚（Merriweather / Public Sans）
eyebrow  28  ← 章节小标 caps（letter-spacing 0.6em）
strap    44  ← 副标题 caps（letter-spacing 0.4em）
display 120  ← 段落主标
hero    240  ← lockup（双层叠加）
mega    480  ← 巨型数字（单数字段）
mega+   720  ← 占帧主标（仅冷开场使用）
```

**规则**：每一帧最多出现 **3 个字号档位**。例如 `mega + eyebrow + caption`，不要四个或更多。  
**对齐**：默认 `text-align: left`，position_x 锚定 0.10 / 0.50 / 0.90 三档之一，避免 0.5 永居中。

### Letter-spacing 哲学

- **巨型字（≥ display）**：负字距 `-0.05em ~ -0.08em`，让字"咬合"  
- **caps 标签（eyebrow / strap）**：正字距 `0.4em ~ 1.0em`，制造"广播感"  
- **body / caption**：默认 `0`，italic 时 `0.02em` 微撑

---

## 3. 颜色契约（Color Contract）

> **Dominant + Sharp accent + 数据色（可选）≤ 3 种**

| 角色 | 占比目标 | 用途 |
|---|---|---|
| Dominant | ≥ 70% | 背景 + 主色块 |
| Text | 8–15% | 主标 / 副标 / 注脚 |
| Sharp accent | 3–8% | 章节小标 / 下划线 / file mark / 一处关键状语 |
| Data color | ≤ 4% | 仅出现在数字、ticker、计量单位 |

**禁止**：4 色及以上的彩虹堆叠；同一帧出现两种 accent。

---

## 4. 时间编排（Motion Choreography）

### 进场节奏（per-shot）

每一镜的进场遵循 **0.18 / 0.40 / 0.60 / 0.85** 四阶段：

```
0.00s  cut-in flash 0.15s（RGB split + 反白 1 帧）
0.18s  eyebrow / file mark 出场
0.40s  display 主标进场（staggered letter or word-by-word）
0.60s  big number ticker / accent underline
0.85s  body / footnote 进场，shot 进入稳态
```

### 章节切换

- **0.15s glitch flash**（白色 + RGB 偏移 ±0.6%）替代普通淡入淡出  
- 切换瞬间允许同帧出现新旧 file mark（`FILE 002 ▸ 003`）

### 速率曲线

- 巨型字进场：`cubic-bezier(0.22, 1, 0.36, 1)` 0.4s（"out-quint"，强烈减速）  
- ticker 数字滚动：递减步长（10 → 6 → 3 → 1 帧）模拟物理减速  
- 永远不要使用 `linear` 在前景元素上

---

## 5. 空间编排（Spatial Composition）

> **Asymmetry over symmetry. Grid-breaking over grid-fitting.**

- **三轴锚点**：每一帧的元素 position 必须落在 `0.10 / 0.50 / 0.90` 三档（横） × `0.07 / 0.18 / 0.50 / 0.82 / 0.94` 五档（纵）网格中，禁止任意小数。  
- **每一帧至少一处破对称**：file mark 在左上 + frame counter 在右上 + 主体故意偏一侧。  
- **Bento Grid 层级**：当一镜要展示 3+ 信息时，强制三栏 Bento（`x = 0.18 / 0.50 / 0.82`），不要堆在中央。  
- **角标位三件套**（必须有）：`FILE 0XX / NNN`（左上）+ `00:SS — CHAPTER NAME`（右上）+ ticker（顶部贯穿或底部贯穿）

---

## 6. 视觉密度层（Density Layers）

> 单层 = AI slop。视觉品味来自层叠组织。

每一段广告/promo 的 timeline **至少叠 3 层**：

1. **主层（main display）**：巨型字 / 巨型数字 / 主体 lockup  
2. **RGB split 层 ×2**：与主层同位偏 ±0.6%，颜色 `#FF003C` + `#00E5FF`，opacity 0.78–0.85  
3. **章节信息层**：file mark + frame counter + eyebrow  
4. **贯穿层（30s 全程）**：顶部 ticker + 底部 ticker + cinematic_bars（仅 cinematic 方向）  
5. **过渡层**：每段切换 flash（0.15s）+ 偶发 speed_lines / spotlight

---

## 7. Component Pack 选用矩阵

> 调用 pro-toolkit 时优先看这张表，避免乱用 FullCard。

| 场景 | 选 | 不要选 |
|---|---|---|
| 冷开场 / 标题 lockup | 多条 subtitle 轨道叠加 + RGB split | FullCard（太居中） |
| 章节切换 | `TransitionFlash` + glitch flash | 普通 fade |
| 大数字揭示 | subtitle 巨型字 + accent underline | InfoGrid |
| 三栏特性 | `InfoGrid` 或自定义 Bento | 三个 FullCard 接连 |
| 贯穿信息 | `TickerBar` (top + bottom) | 静态 watermark |
| 倒计时 | `CountdownBlock` | 数字 + 普通字幕 |
| 价格 / 优惠 | `PriceCard` | 自由排版 |
| CTA | `CtaPill` 或 `BottomStrip` | FullCard impact |
| 收尾 logo | 自由排版 + cursor `▌` 闪烁 | SplashReveal（通用） |

---

## 8. Pre-Render Checklist（agent 自查 / 人审）

提交一个 promo / ad timeline 前，逐项过：

```
[ ] 已在文件头声明 BOLD 方向（A–G 之一）
[ ] 主色 ≤ 3，accent 占比 ≤ 8%
[ ] 字体清单不含 Inter / Roboto / Arial / Space Grotesk
[ ] 至少 3 层视觉密度（main + chrome split + chapter info）
[ ] 每镜元素 position 落在 0.10/0.50/0.90 × 0.07/0.18/0.50/0.82/0.94 网格
[ ] 至少一处破对称（file mark / 角标 / 数字偏移）
[ ] 章节切换有 0.15s flash 而非淡出
[ ] 巨型字 letter-spacing 负值；caps 标签字距 ≥ 0.4em
[ ] 字号档位 per-shot ≤ 3 档
[ ] 顶部 / 底部 ticker 至少其一贯穿（≥ 80% 时长）
[ ] 进场使用 staggered（letter / word / number），不是整体 fade
[ ] 4.5:1 文本对比；data color 仅出现在数字
```

---

## 9. CLI 速查（让 agent 自助查表）

```bash
# 任何新选题 / 行业，先生成对照设计系统
python3 ~/.qoder/skills/ui-ux-pro-max/scripts/search.py "<topic>" --design-system -p "<name>" -f markdown

# 字体回退查询（替代 Inter/Roboto）
python3 ~/.qoder/skills/ui-ux-pro-max/scripts/search.py "editorial brutalist display" --domain typography

# 风格命中
python3 ~/.qoder/skills/ui-ux-pro-max/scripts/search.py "kinetic typography motion" --domain style
```

---

## 10. CEO / Designer / Eng 三视角 Review（gstack 模式）

发布前问自己：

- **CEO**：观众看完能复述出**一个**记忆点吗？（3 秒规则）  
- **Designer**：哪一个像素是这一帧的"signature"？如果说不出来，重做。  
- **Eng**：渲染时长、字体加载、字号超界（超过 720pt 已经压力）有问题吗？  

---

> 修改本文件等价于修改全局视觉契约 —— 修改前请在 PR 注明影响范围。
