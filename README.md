<div align="center">

# 🏘️ RepoTown

### Turn any GitHub Repository or Markdown file into a playable 2D Pixel RPG Town

**把任意 GitHub 仓库或 Markdown 文档，一键变成可走、可逛、可进屋、可打怪的 2D 像素 RPG 小镇**

<p>
  <img alt="Zero Build" src="https://img.shields.io/badge/Zero%20Build-Vanilla%20JS%20ES%20Modules-d99b38?style=flat-square" />
  <img alt="Renderer" src="https://img.shields.io/badge/Renderer-HTML5%20Canvas%20%2B%20WebAudio-4f8f54?style=flat-square" />
  <img alt="Bilingual" src="https://img.shields.io/badge/Language-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87%20%2F%20English-c85a3a?style=flat-square" />
  <img alt="AI Built" src="https://img.shields.io/badge/Crafted%20By-100%25%20AI%20(Gemini4Neon)-3a281d?style=flat-square" />
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-5b7890?style=flat-square" /></a>
</p>

<p>
  <a href="https://uwu9039.github.io/repotown/">
    <img alt="Play Live Demo" src="https://img.shields.io/badge/%F0%9F%8E%AE%20Play%20Live%20Demo-GitHub%20Pages-c85a3a?style=for-the-badge" />
  </a>
  <a href="https://uwu9039.github.io/repotown/?repo=uwu9039/repotown">
    <img alt="Walk Inside This Repo" src="https://img.shields.io/badge/%F0%9F%8F%98%EF%B8%8F%20Explore%20This%20Repo%20as%20a%20Town-d99b38?style=for-the-badge" />
  </a>
</p>

<img src="./docs/social-preview.png" alt="RepoTown Hero Banner" width="100%" />

[✨ Why RepoTown](#-why-repotown--项目缘起) • [🖼️ Live Previews](#️-preview--实机预览) • [🗺️ World Mapping](#️-how-code-becomes-a-town--仓库如何长成一座小镇) • [🎮 Gameplay](#-features--核心玩法与特性) • [🚀 Quick Start](#-quick-start--零构建快速启动) • [❓ FAQ](#-faq--常见问题)

</div>

---

## ✨ Why RepoTown · 项目缘起

> **测试Gemini4Neon做的一个小项目，全部由ai完成，我只负责测试体验问题。意外的挺好玩。本项目为全ai项目，人类基本没参与。**
>
> *Built to test Gemini4Neon — designed, coded, drawn in pixel art, and wired end-to-end 100% by AI, with human involvement limited to playtesting UX feedback. Surprisingly fun to explore!*

No `node_modules`, no bundler, no frameworks, and no sprite packs downloaded from anywhere: every pixel tile, seasonal palette, character animation, 8-bit sound effect, A* pathfinder, particle effect, and parchment UI dialog runs purely on **native browser ES Modules + HTML5 Canvas + WebAudio**.

---

## 🖼️ Preview · 实机预览

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./docs/preview-en.png" alt="RepoTown English Mode Preview — Meadow Vale" width="100%" />
      <br />
      <sub><b>English Mode · Meadow Vale</b> — Plaza Wishing Fountain, Committer NPCs, Dual-Row Interactive Minimap</sub>
    </td>
    <td width="50%" align="center">
      <img src="./docs/preview-zh.png" alt="RepoTown Chinese Mode Preview — Sakura Springs" width="100%" />
      <br />
      <sub><b>简体中文模式 · 樱花温泉乡</b> — 推门进屋提示、放大可拖拽小地图、多季节随机生态风貌</sub>
    </td>
  </tr>
</table>

---

## 🗺️ How Code Becomes a Town · 仓库如何长成一座小镇

Paste any `owner/repo` (e.g. `facebook/react`, `vercel/next.js`) or drop a `.md` file onto the screen, and watch the structure come alive:

| Source Element · 源数据 | RPG World Entity · 小镇实体 | Interactive Behavior · 可交互玩法 |
| :--- | :--- | :--- |
| **Root & Top Folders** (`src/`, `packages/`, `scripts/`) | **Pixel Buildings** (Town Hall, Workshops, Harbor, Tower, Dojo) | Walk up & press `E` (or click) to enter interiors; roof colors & architecture adapt to folder role |
| **Source Files & Code Blocks** | **Bookshelves & Treasure Chests** | Inspect file metadata, preview live source syntax/code highlights, bookmark into your Codex, or jump to GitHub |
| **Git Contributors & Commits** | **Wandering Villagers (NPCs)** | Talk to recent committers to read commit messages/SHAs; click any yellow dot on the Minimap to teleport beside them |
| **Open Issues / Markdown `- [ ]`** | **Outskirts Slimes** | Raid overdue TODOs! Choose **Casual Raid** (`+1 Wishing Coin` right away) or **Dev Raid** (verifies issue closure on GitHub) |
| **Town Center Plaza** | **Wishing Fountain** | Toss `1 Wishing Coin` for a humorous Fortune Slip (`Grand Fortune [SSR]`, lucky house teleport, Dev Do/Skip advice) |
| **East Stream Bridge** | **Windmill Easter Egg** | Spin the sails for pixel petal/leaf bursts, chime harmonics, and hidden town trivia (incl. a 33% rare secret!) |
| **Plaza Benches & Indoor Chairs** | **Sittable Seats · 椅子可以坐** | Yes — **椅子可以坐**! Walk up to any plaza bench or indoor chair and press `E` / `Space` (or click) to sit down and rest |
| **README.md & Repo Meta** | **Town Mayor & Noticeboard** | Read repository overview and project README inside a collapsible parchment reader |

---

## 🎮 Features · 核心玩法与特性

- **🌸 4 Random Town Biomes · 4 种季节生态风貌**：每次生成或导入项目，小镇都会在 **翠绿牧歌镇 (Meadow Vale)**、**樱花温泉乡 (Sakura Springs)**、**金秋枫叶村 (Autumn Maples)**、**凛冬雪原港 (Winter Harbor)** 四套全手绘像素调色板与环境粒子中随机切换。
- **🪑 Sittable Chairs & Benches · 椅子可以坐**：不只是装饰！广场木长椅和每栋屋内的椅子都可以真正坐下休息（靠近按 `E` / `Space` 或直接点击），移动即可自然起身。
- **⚔️ Dual Slime Raid + Wishing Coin Economy · 双模式史莱姆讨伐 & 许愿金币循环**：讨伐郊外待办史莱姆可切换「⚔ 普通讨伐 / Casual Raid」（点入返回即胜利，立即掉落 `+1 许愿金币`）与「开发者讨伐 / Dev Raid」（真实校验 GitHub Issue 关闭状态），再去镇中心喷泉掷币抽今日代码运势。
- **🧭 Zoomable & Draggable Interactive Minimap · 可缩放可拖拽小地图 & 传送光环**：支持 `1× ~ 3×` 视野缩放、窗口大小切换（小/中/大/折叠）、放大后拖拽平移，点击任意建筑、风车、村民或史莱姆即可伴随传送光环瞬移到达。
- **🐾 Click-to-Move A* Pathfinding & Cozy Interiors · 自动寻路与室内空间**：支持 `WASD` / 方向键与点击地面 A* 自动绕障寻路；房屋内部配有墙画、盆栽、书架、宝箱、地毯与**可坐下休息的长椅/椅子**，以及书架旁守候的管理员 NPC。
- **🌗 Day / Dusk / Night & 8-bit WebAudio · 昼夜光影与纯合成音效**：一键切换白昼 / 黄昏暖橙 / 月夜路灯照明，搭配 WebAudio 实时合成的脚步声、开门声、喷泉水花、风车风铃与讨伐音效。
- **📜 Parchment Transitions & Souvenir Postcard · 羊皮卷动效与全景明信片**：内置可展开羊皮卷放大阅读、5 步互动新手引导（带自动代跑传送助手）、探索图鉴 (`Codex`)，以及一键生成并下载 `.png` 小镇明信片。
- **🌐 Native Bilingual Mode · 启动自选 + 实时中英文切换**：每次打开支持选择 **简体中文 / English**，顶部随时一键切换全界面语言。

---

## 🎯 Controls · 操作指南

| Key / Input · 按键或操作 | Action · 功能 |
| :--- | :--- |
| `W A S D` / `↑ ↓ ← →` / **Click Ground** | Walk around town or auto-pathfind with A* · 移动或点击地面自动寻路 |
| `Shift` | Sprint · 疾跑加速 |
| `E` / `Space` / **Click Object** | Enter house, talk to NPC, raid slime, toss coin, sit on chair, spin windmill · 交互 / 进屋 / 坐下 |
| `Tab` | Cycle edge compass guide target to next unread landmark · 切换边缘罗盘指引目标 |
| `Esc` | Exit building / close parchment reader or dialog · 退出室内或关闭对话 |
| **Minimap Click / Drag** | Click dot to teleport with aura; zoom in (`+`) & drag to pan · 小地图点击瞬移 / 放大拖动 |

---

## 🚀 Quick Start · 零构建快速启动

Because RepoTown uses zero-dependency ES Modules (`<script type="module">`), any static HTTP server can launch it in seconds:

### Option 1 — Python (built-in)
```bash
git clone https://github.com/uwu9039/repotown.git
cd repotown
python -m http.server 8765
```
Open **`http://127.0.0.1:8765`** in your browser.

### Option 2 — Node.js / VS Code
```bash
npx serve . -l 8765
```
Or open with the **Live Server** extension in VS Code / Cursor / Antigravity.

> [!TIP]
> **Optional GitHub Rate-Limit Helper:** Unauthenticated GitHub API requests allow 60 calls/hour. If you explore dozens of repositories rapidly, click the token prompt to store a read-only Personal Access Token in `sessionStorage` (cleared automatically when the tab closes). Preset towns and local Markdown drag-and-drop require **no network at all**.

---

## 🔗 Share Any Repo via Direct Portal URL · 直达传送门与 README 徽章

Load any public GitHub repository straight from URL query parameters:

```text
https://uwu9039.github.io/repotown/?repo=facebook/react
```

Embed a RepoTown portal badge right inside your own project's `README.md`:

```markdown
[![Visit in RepoTown](https://img.shields.io/badge/Explore%20as-2D%20Pixel%20RPG%20Town-d99b38?style=for-the-badge)](https://uwu9039.github.io/repotown/?repo=<owner>/<repo>)
```

---

## ☁️ Deploy to GitHub Pages in 1 Minute · 一分钟免费部署

1. Push this repository to GitHub (`main` branch).
2. Go to **Settings → Pages → Build and deployment**.
3. Select **Deploy from a branch** → Branch **`main`**, folder **`/ (root)`**, and click **Save**.
4. Your live RepoTown instance is ready with zero build steps!

---

## 📂 Project Structure · 目录结构

```text
repotown/
├── index.html                  # App shell, HUD, modals & language chooser
├── styles/
│   └── theme.css               # 16-bit parchment / wood / pixel-bevel theme
├── docs/
│   ├── social-preview.png      # 1280x640 GitHub Social Preview & Hero banner
│   ├── preview-en.png          # Live English town preview screenshot
│   └── preview-zh.png          # Live Chinese town preview screenshot
└── src/
    ├── main.js                 # Entry point, URL ?repo= boot & engine wiring
    ├── i18n/i18n.js            # Bilingual ZH/EN dictionary & runtime translator
    ├── data/presets.js         # Offline demo towns (React, DeepSeek, Guide.md)
    ├── engine/
    │   ├── gameEngine.js       # 2D Canvas renderer, camera, teleports & lighting
    │   ├── spriteAtlas.js      # Procedural pixel art sprites & 4 town biomes
    │   ├── fortune.js          # Wishing Fountain dev fortune generator
    │   └── audio.js            # WebAudio 8-bit synthesizer
    ├── world/
    │   ├── worldGenerator.js   # Overworld & interior town layout generator
    │   └── pathfinder.js       # A* grid pathfinding engine
    ├── parsers/
    │   ├── githubParser.js     # GitHub REST API parser with session cache
    │   └── markdownParser.js   # Local .md heading/code/todo parser
    └── ui/
        ├── hud.js              # HUD controller, Codex, Guided Tour & dialogs
        └── postcard.js         # Exportable PNG pixel souvenir generator
```

---

## ❓ FAQ · 常见问题

<details>
<summary><b>1. 遇到 GitHub API 60 次/小时限制怎么办？ / Hit the 60 req/hr unauthenticated GitHub limit?</b></summary>

点击界面提示填入只读 GitHub Personal Access Token（仅保存于浏览器 `sessionStorage`，关闭标签页自动销毁），额度立刻提升至 `5000 req/hr`。另外，内置示例小镇与本地拖拽 `.md` 文件 **完全离线解析，不消耗任何 API 额度**。

</details>

<details>
<summary><b>2. 小镇里有哪些容易错过的细节？ / Any hidden details worth trying?</b></summary>

- **🪑 椅子真的可以坐**：镇中心广场木长椅与所有屋内椅子靠近后按 `E` / `Space` 或直接点击都能坐下休息。
- **🌪 东郊风车 33% 神秘彩蛋**：走过东边小桥连推风车叶片 3 次可解锁彩蛋与 `+2` 许愿金币，点击「再来一阵狂风」每次均有 **33% 概率**刷出神秘彩蛋台词 `"676767"`。
- **🧭 小地图传送**：任意建筑、村民黄点、史莱姆、喷泉与风车都可在右下角小地图直接点击传送；点 `+` 放大后还能拖动平移。

</details>

<details>
<summary><b>3. 这真的是全 AI 生成的项目吗？ / Is this really 100% AI-built?</b></summary>

是的！从 HTML5 像素精灵与四套季节色板程序化绘制、A* 自动寻路、WebAudio 8-bit 合成音效，到中英文双语与 UI 交互全部由 AI（Gemini4Neon 测试）完成，人类作者只负责实际试玩与反馈体验问题。

</details>

---

## 📄 License · 开源协议

Released under the [MIT License](./LICENSE).

<div align="center">

Made entirely by AI · Tested for fun by a human explorer 🧭✨

</div>
