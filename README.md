# VibeCut — 说句话，片子就剪好了

[English](README_en.md) | 中文

> 代码都 vibecoding 了，剪片子凭什么不能 vibecut？

丢进去一个素材，说一句你想要什么，剩下的交给 AI。

```
>>> 把桌面上那个录屏剪成30秒抖音视频，用最炸的画面开头
```

---

## 原理

不是"选片段→填参数→点导出"那种死板流水线。  
更像雇了个编导——你说意图，它自己想怎么剪。

- **多模态理解**：Gemini / OpenAI 兼容模型直接看视频画面，识别场景、节奏、内容
- **语音转录**：本地 Whisper，词级时间戳 ~100ms，不上传任何音频
- **编导计划**：促销/二创类任务先生成 `CreativePlan`，拆 scene beat、分配全屏特效/组件特效、避开人脸/价格/CTA
- **归一化 Recipe**：不把时间点写死，换视频自动按素材时长重新换算
- **视觉 QA**：`create_visual_qa_report` 输出抽帧检查报告，外部 coding agent 可以接着审片

改主意随时说，它会重新出方案再确认，不会偷偷改东西。

---

## 为什么还要再造一个

市面上已有 NemoVideo、ChatCut 等产品，VibeCut 的差异点：

| | VibeCut | 云端产品 |
|---|---|---|
| 文件 | 本地读取，不上传 | 必须上传 |
| 模型 | 自选（Gemini/DeepSeek/Qwen/本地） | 厂商指定 |
| 隐私 | 数据不出本机 | 数据过云 |
| 上限 | 开源可改，风格模板随便定制 | 功能固定 |
| 外部 Agent | 开放工具网关，Codex/Claude Code/Cursor 可直接调用 | 封闭 |

---

## 预览

![主界面](docs/image6.png)
![时间线编辑](docs/image2.png)
![导出](docs/image4.png)

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.11+
- pnpm
- FFmpeg / ffprobe
- API Key（任选其一）：
  - [Google AI Studio](https://aistudio.google.com/) Gemini Key
  - OpenAI 兼容 Key（DeepSeek、Qwen、OpenRouter 等）

### 安装

```bash
# 前端依赖
pnpm install

# 后端 Python 依赖
cd apps/backend
pip install -e .

# 可选能力（Agent 聊天 / ASR / TTS / SVG / OTIO-FCPXML）
pip install -e ".[agent,asr,tts,svg,interchange]"
```

### 配置

复制 `apps/backend/.env.example` → `apps/backend/.env`：

```bash
# Gemini（默认）
MRDV2_GEMINI_API_KEY=your-key-here
MRDV2_GEMINI_MODEL=gemini-2.5-flash

# 或 OpenAI 兼容
MRDV2_LLM_PROVIDER=openai
MRDV2_OPENAI_API_KEY=sk-xxx
MRDV2_OPENAI_BASE_URL=https://api.deepseek.com/v1
MRDV2_OPENAI_MODEL=deepseek-chat
```

<details>
<summary>全部可选配置</summary>

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MRDV2_LLM_PROVIDER` | `gemini` | `gemini` 或 `openai` |
| `MRDV2_GEMINI_BASE_URL` | `""` | 代理/中转端点 |
| `MRDV2_GEMINI_MODEL` | `gemini-2.5-flash` | Gemini 模型 |
| `MRDV2_OPENAI_API_KEY` | `""` | OpenAI 兼容 Key |
| `MRDV2_OPENAI_MODEL` | `gpt-4o` | 模型名 |
| `MRDV2_OPENAI_BASE_URL` | `""` | 自定义端点 |
| `MRDV2_OPENAI_THINKING` | `off` | 思考模式：`off` / `dashscope` / `deepseek` |
| `MRDV2_WHISPER_MODEL_SIZE` | `medium` | tiny/small/base/medium/large |
| `MRDV2_WHISPER_DEVICE` | `auto` | auto/cuda/cpu |
| `MRDV2_EXPORT_GL` | `auto` | GPU 加速：auto/angle-egl/swangle/vulkan |

</details>

### 启动

```bash
# 一键启动
pnpm dev

# 或分开
pnpm dev:frontend   # http://localhost:5173
pnpm dev:backend    # http://localhost:8000
```

打开 `http://localhost:5173`，创建项目，开聊。

---

## 能力一览

### 理解

- **视频理解** — 多模态模型分析画面：场景、节奏、风格、文字
- **语音转录** — 本地 Whisper，词级时间戳，自动检测语言

### 编导

- **CreativePlan** — 促销/二创任务自动输出导演计划（hook → offer → urgency → CTA）
- **一键二创** — `draft_promo_remix` 从素材池自动选片、换算时长、生成组件+全屏页+QA
- **视觉 QA** — 抽帧检查安全区、文案长度、Hook 时机、语义组件覆盖

### 剪辑

- **智能剪辑** — 一句话自动切分/拼接/变速/排列
- **批量操作** — `edit_clips` 原子化事务，失败自动回滚
- **时间线分割** — `split_timeline` 按时间点精准切割
- **撤销/重做** — 最多 50 步

### 特效

- **全屏广告页** — offer_stage / pricing_stage / proof_stage 整页替换
- **语义组件** — promo_top_bar / price_badge / countdown_banner / cta_badge 等
- **React/Remotion 渲染** — 文本可编辑，位置/尺寸/动效可调

### 预览 & 导出

- **实时预览** — Remotion 浏览器渲染，改了即见
- **多格式导出** — MP4 / OTIO / FCPXML 7（接入 DaVinci Resolve / Final Cut Pro）

### 其他

- **Shell 访问** — 沙盒化 shell，Agent 自己跑 ffprobe / mediainfo
- **本地文件访问** — 直接读本地文件系统
- **外部 Agent 网关** — Codex / Claude Code / Cursor 通过 REST API 调用剪辑工具
- **方案确认** — Agent 先出方案让你过目，不会擅自动刀
- **进度可视化** — WebSocket 实时推送思考过程和工具调用状态

---

## 技术架构

```
用户输入 → ReAct Agent (Gemini/OpenAI) → Tool Calls → Timeline JSON → WebSocket → Remotion 预览 → 导出
```

---

## 路线图

- [x] 三栏 UI（素材 | 预览+时间线 | 聊天）
- [x] 多 LLM 支持
- [x] Remotion / OTIO / FCPXML 导出
- [x] 批量剪辑 + 时间线分割
- [x] Agent 进度可视化 + 撤销重做
- [x] 外部 Agent 工具网关
- [x] CreativePlan + draft_promo_remix
- [x] 促销语义组件 + 全屏 stage
- [x] 视觉 QA
- [ ] WebGPU + WGSL 调色
- [ ] 特效关键帧系统
- [ ] 剪辑风格个性化
- [ ] 智能配乐
- [ ] 关键帧动画
- [ ] 转场效果

---

## License

MIT
