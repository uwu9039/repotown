/**
 * Bilingual i18n dictionary and state helper (Simplified Chinese / English) for RepoTown.
 */

const LANG_KEY = "repotown_lang_v1";

let currentLang = "zh";
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "en" || saved === "zh") currentLang = saved;
} catch {}

export function getLang() {
  return currentLang;
}

export function setLang(next) {
  currentLang = next === "en" ? "en" : "zh";
  try {
    localStorage.setItem(LANG_KEY, currentLang);
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.lang = currentLang === "en" ? "en" : "zh-CN";
  }
  return currentLang;
}

export const THEME_LABELS = {
  zh: {
    meadow: "翠绿牧歌镇",
    sakura: "樱花温泉乡",
    autumn: "金秋枫叶村",
    winter: "凛冬雪原港",
  },
  en: {
    meadow: "Meadow Vale",
    sakura: "Sakura Springs",
    autumn: "Autumn Maples",
    winter: "Winter Harbor",
  },
};

export const TOUR_STEPS_I18N = {
  zh: [
    {
      id: "move",
      completeEvent: "move",
      title: "1. 自由行走与 A* 寻路",
      desc: "按 WASD / 方向键，或直接点击草地体验自动绕障寻路。",
      assistLabel: "演示自动走到广场旁",
    },
    {
      id: "fountain",
      completeEvent: "fortune",
      title: "2. 许愿喷泉测今日码运",
      desc: "走到镇中心「许愿喷泉」按 E（或点击喷泉），投入 1 枚金币抽今日运势！",
      assistLabel: "带我去喷泉",
    },
    {
      id: "slime",
      completeEvent: "slime",
      title: "3. 讨伐史莱姆赚许愿金币",
      desc: "金币花光啦！找一只待办史莱姆按 E，点「⚔ 普通讨伐」即可赚回 +1 枚许愿金币。",
      assistLabel: "带我去打史莱姆",
    },
    {
      id: "minimap",
      completeEvent: "minimap_teleport",
      title: "4. 小地图瞬移（建筑 & 村民）",
      desc: "看右下角高亮的「小镇地图」：点击任意建筑或黄色村民点即可瞬移，点 + 放大后还可按住拖动！",
      assistLabel: "放大地图试试",
    },
    {
      id: "interior",
      completeEvent: "item",
      title: "5. 推门进屋翻阅藏书 / 宝箱",
      desc: "走到任意屋前按 E 进屋，再按 E 或点击书架/宝箱查看源码与结构摘要！",
      assistLabel: "带我去屋门口",
    },
  ],
  en: [
    {
      id: "move",
      completeEvent: "move",
      title: "1. Free Walk & A* Pathfinding",
      desc: "Use WASD / Arrow keys, or click any ground tile to auto-route around obstacles.",
      assistLabel: "Walk Demo",
    },
    {
      id: "fountain",
      completeEvent: "fortune",
      title: "2. Toss Coin at Wishing Fountain",
      desc: "Press E near (or click) the center Fountain to spend 1 coin and draw your dev fortune!",
      assistLabel: "Go to Fountain",
    },
    {
      id: "slime",
      completeEvent: "slime",
      title: "3. Raid Slimes for Wishing Coins",
      desc: "Need coins? Press E on an Outskirts Slime and click '⚔ Casual Raid' to earn +1 Wishing Coin!",
      assistLabel: "Hunt a Slime",
    },
    {
      id: "minimap",
      completeEvent: "minimap_teleport",
      title: "4. Minimap Teleport & Drag-Pan",
      desc: "Click any building, villager, or windmill dot on the highlighted Minimap to teleport! Zoom + to drag-pan.",
      assistLabel: "Zoom Minimap",
    },
    {
      id: "interior",
      completeEvent: "item",
      title: "5. Enter House & Unfurl Scroll",
      desc: "Press E at any doorway to enter, then press E on (or click) a glowing chest/bookshelf!",
      assistLabel: "Go to Doorstep",
    },
  ],
};

export const FORTUNE_TIERS_EN = [
  { tier: "Grand Fortune", tierCode: "SSR", color: "emerald", minScore: 93, maxScore: 100, weight: 22 },
  { tier: "Good Luck", tierCode: "SR", color: "brass", minScore: 82, maxScore: 92, weight: 32 },
  { tier: "Fair Wind", tierCode: "R", color: "brass", minScore: 73, maxScore: 81, weight: 24 },
  { tier: "Steady Day", tierCode: "N+", color: "emerald", minScore: 68, maxScore: 75, weight: 14 },
  { tier: "Heads Up", tierCode: "WARN", color: "terracotta", minScore: 60, maxScore: 67, weight: 8 },
];

export const FORTUNE_ENTRIES_EN = [
  {
    headline: "Clear Skies Ahead: That old line you deleted turns out to be the sneaky 3-day bug.",
    yi: "Prune dead branches and add a quick regression test",
    ji: "Major-bumping core dependencies 5 minutes before signing off",
  },
  {
    headline: "Spark of Insight: Grab an iced coffee — the cleanest entrypoint is right by Town Hall.",
    yi: "Stroll through an unfamiliar open-source repo for fresh ideas",
    ji: "Staring at an empty file trying to design perfection upfront",
  },
  {
    headline: "All-Green Pipeline: CI passes first try and even strict lint rules step aside.",
    yi: "Turn clever snippets hidden in chests into crisp docs",
    ji: "Running `git push --force` without checking `git diff`",
  },
  {
    headline: "Kind Contributor Sign: Someone opens a tidy PR fixing an edge case you hadn't noticed.",
    yi: "Star a cool indie repo and polish your README examples",
    ji: "Letting `TODO` slimes pile up without clear context",
  },
  {
    headline: "Solid Foundation: Splitting monoliths into bite-sized modules brings instant clarity.",
    yi: "Trace the core game loop and tighten edge guards",
    ji: "Having six terminal panes edit the exact same file at once",
  },
  {
    headline: "Hidden Gem: One tiny config toggle unlocks an 80% workflow speedup.",
    yi: "Explore utility scripts and ship a playful minimum loop",
    ji: "Over-engineering microservices before testing a single page",
  },
  {
    headline: "Pixel Sanctuary: Looks like intense code archaeology — feels like a cozy RPG.",
    yi: "Stretch your shoulders and export a town souvenir postcard",
    ji: "Debugging CSS centering at 2:30 AM without sleep",
  },
  {
    headline: "Craftsman's Favor: Crisp 60fps animations where every pixel sits right where it belongs.",
    yi: "Polish micro-interactions and subtle keyboard focus rings",
    ji: "Editing production env variables straight from memory",
  },
  {
    headline: "Watch Your Step: Double-check Windows paths and race conditions before merging.",
    yi: "Verify boundary cases inside the Script Training Ground",
    ji: "Saying 'this tiny tweak can't possibly break anything'",
  },
  {
    headline: "Star-Magnet Inspiration: Visual toys people understand in 3 seconds win hearts fastest.",
    yi: "Put clean live screenshots and a 1-command demo above the fold",
    ji: "Spending two hours inventing an unpronounceable project name",
  },
  {
    headline: "Docs Revelation: The fix you hunted for half an hour is literally on line 5 of README.",
    yi: "Read the stack trace calmly and check active ports first",
    ji: "Blaming cosmic rays instead of checking browser cache",
  },
  {
    headline: "Travel Light: Deleting 300 lines of over-abstraction makes the whole town breathe.",
    yi: "Use vanilla primitives and zero-dependency ES modules",
    ji: "Adding ten factory layers for a 1% hypothetical feature",
  },
  {
    headline: "Night-Owl Glow: Switching dusk & night lighting reveals contrast bugs fast.",
    yi: "Test light/dark contrast and keyboard Esc/Tab flows",
    ji: "Putting faint grey labels on slightly darker grey cards",
  },
  {
    headline: "Explorer's Instinct: Every doorway hides a pattern worth borrowing tomorrow.",
    yi: "Use minimap drag & NPC teleport to meet every committer",
    ji: "Judging a repository without peeking past the top folder",
  },
];

export const WINDMILL_QUOTES_I18N = {
  zh: [
    "风车转满三圈！风铃带来小镇秘闻：「{town}」的 {buildings} 栋建筑与 {files} 份藏书，正随着这阵像素微风轻轻呼吸。",
    "守风者笔记：『写出干净的代码就像校准风车叶片——角度对了，风就会自己帮你推动，不必硬扛。』",
    "风车轴心掉出一张古老字条：『按下 Tab 就能把指引切换到最近的隐藏未读建筑；把鼠标挪到小地图村民点上点一下也能直接传送哦！』",
    "一阵带着草木清香的顺风吹过！听说在夜色模式（顶部太阳按钮切换）下看喷泉和路灯，更有像素 RPG 的氛围感。",
  ],
  en: [
    "Three full spins! The wind chimes whisper: {buildings} buildings and {files} scrolls across '{town}' are humming in the breeze.",
    "Windkeeper's Note: 'Clean code is like angling windmill sails — get the alignment right, and the wind carries the work for you.'",
    "A crumpled note drops from the axle: 'Press Tab to cycle your compass target, or click any NPC dot on the Minimap to teleport beside them!'",
    "A crisp meadow breeze rolls through! Try toggling Dusk/Night mode on the top bar to watch the plaza lanterns glow around the Fountain.",
  ],
};

const DICT = {
  zh: {
    "doc.title": "RepoTown — 把任何 GitHub 仓库与 Markdown 变成可逛的 2D 像素 RPG 小镇",
    "brand.homeTitle": "回到镇中心广场",
    "town.loading": "加载中...",
    "town.plaza": "镇中心广场",
    "repo.label": "GitHub 仓库地址",
    "repo.placeholder": "owner/repo 或粘贴 GitHub 链接...",
    "btn.generate": "生成小镇",
    "btn.building": "构建中...",
    "preset.react": "React 镇",
    "preset.deepseek": "DeepSeek 城",
    "preset.guide": "摸鱼指南.md",
    "btn.markdown": "粘贴 Markdown",
    "btn.markdownTitle": "粘贴或上传 Markdown 生成小镇",
    "btn.timeTitle": "切换昼夜光影 (白昼 / 黄昏 / 夜晚)",
    "btn.sfxTitle": "开关 8-bit 音效",
    "btn.codex": "图鉴",
    "btn.codexTitle": "冒险图鉴与收藏记录",
    "btn.help": "指南",
    "btn.helpTitle": "重开 5 步互动新手向导",
    "btn.share": "明信片",
    "btn.shareTitle": "生成明信片与分享链接",
    "btn.langTitle": "Switch Language / 切换中英文",
    "drop.title": "松开即可将 Markdown 文档化为小镇",
    "drop.sub": "支持 .md / .markdown / .txt，纯本地浏览器解析",
    "stat.buildings": "栋建筑",
    "stat.files": "份藏书",
    "stat.villagers": "位村民",
    "stat.slimes": "只史莱姆",
    "stat.coins": "枚金币",
    "stat.coinsTitle": "许愿金币：讨伐待办史莱姆 +1，可在许愿喷泉测运势",
    "controls.hint": "<kbd>WASD</kbd> / <kbd>方向键</kbd> 或 <strong>点击地面</strong> 移动 · <kbd>Shift</kbd> 疾跑 · <kbd>E</kbd>/<kbd>Space</kbd> 交互进屋 · <kbd>Tab</kbd> 切换指引 · <kbd>Esc</kbd> 退出",
    "touch.act": "交互",
    "map.title": "小镇地图",
    "map.click": "点击传送",
    "map.dragClick": "拖动平移 / 点击传送",
    "map.dragging": "拖动浏览中",
    "map.indoor": "室内布局",
    "legend.you": "你",
    "legend.building": "建筑",
    "legend.fountain": "喷泉",
    "legend.villager": "村民",
    "legend.slime": "待办",
    "dialog.extLink": "在 GitHub 查看",
    "dialog.close": "关闭 [Esc]",
    "btn.close": "关闭",
    "md.title": "Markdown 转 RPG 小镇",
    "md.sub": "一级标题为镇名，二级标题变房屋，代码块变宝箱，未完成待办 `- [ ]` 变郊外史莱姆。",
    "md.chooseFile": "选择本地 .md 文件",
    "md.loadSample": "填入示例游记.md",
    "md.submit": "立即生成小镇",
    "token.title": "GitHub API 额度受限",
    "token.sub": "未登录每小时限 60 次请求。填入只读 Personal Access Token（仅存当前浏览器会话）可立刻恢复读取。",
    "token.save": "保存并重试",
    "share.title": "小镇明信片与分享门户",
    "share.sub": "保存全景像素明信片，或把直达传送门徽章贴进你的 GitHub README。",
    "share.urlLabel": "小镇直达链接",
    "share.copyUrl": "复制链接",
    "share.badgeLabel": "README 徽章代码",
    "share.copyBadge": "复制 Markdown",
    "share.download": "下载高清明信片 (.png)",
    "codex.title": "冒险图鉴与探索进度",
    "codex.sub": "记录你在当前小镇探索过的建筑、交流过的村民、讨伐的待办与收藏代码。",
    "battle.caption": "ENCOUNTER · 讨伐出击",
    "size.lg": "大",
    "size.sm": "小",
    "size.md": "中",
  },
  en: {
    "doc.title": "RepoTown — Turn Any GitHub Repo or Markdown Into a Playable 2D Pixel RPG Town",
    "brand.homeTitle": "Teleport back to Town Plaza",
    "town.loading": "Loading...",
    "town.plaza": "Town Plaza",
    "repo.label": "GitHub Repository URL",
    "repo.placeholder": "owner/repo or paste GitHub URL...",
    "btn.generate": "Build",
    "btn.building": "Building...",
    "preset.react": "React",
    "preset.deepseek": "DeepSeek",
    "preset.guide": "Guide.md",
    "btn.markdown": "Paste MD",
    "btn.markdownTitle": "Paste or upload Markdown to generate a town",
    "btn.timeTitle": "Cycle Time of Day (Day / Dusk / Night)",
    "btn.sfxTitle": "Toggle 8-bit SFX",
    "btn.codex": "Codex",
    "btn.codexTitle": "Adventure Codex & Progress",
    "btn.help": "Guide",
    "btn.helpTitle": "Restart 5-step interactive walkthrough",
    "btn.share": "Postcard",
    "btn.shareTitle": "Export Pixel Postcard & Share Link",
    "btn.langTitle": "Switch Language / 切换中英文",
    "drop.title": "Drop Markdown to Grow a Pixel RPG Town",
    "drop.sub": "Supports .md / .markdown / .txt — parsed 100% locally in browser",
    "stat.buildings": "Buildings",
    "stat.files": "Scrolls",
    "stat.villagers": "Villagers",
    "stat.slimes": "Slimes",
    "stat.coins": "Coins",
    "stat.coinsTitle": "Wishing Coins: +1 per Slime defeated, spend 1 at the Fountain for fortunes",
    "controls.hint": "<kbd>WASD</kbd> / <kbd>Arrows</kbd> or <strong>Click Ground</strong> to Move · <kbd>Shift</kbd> Sprint · <kbd>E</kbd>/<kbd>Space</kbd> Interact · <kbd>Tab</kbd> Guide · <kbd>Esc</kbd> Back",
    "touch.act": "Act",
    "map.title": "Town Map",
    "map.click": "Click to Warp",
    "map.dragClick": "Drag Pan / Click Warp",
    "map.dragging": "Panning Map",
    "map.indoor": "Indoor View",
    "legend.you": "You",
    "legend.building": "House",
    "legend.fountain": "Pool",
    "legend.villager": "NPC",
    "legend.slime": "TODO",
    "dialog.extLink": "View on GitHub",
    "dialog.close": "Close [Esc]",
    "btn.close": "Close",
    "md.title": "Markdown to RPG Town",
    "md.sub": "# Title becomes Town, ## Headings become Houses, Code blocks become Chests, `- [ ]` Tasks become Slimes.",
    "md.chooseFile": "Choose Local .md File",
    "md.loadSample": "Load Sample.md",
    "md.submit": "Generate Town",
    "token.title": "GitHub API Rate Limited",
    "token.sub": "Anonymous quota is 60 req/hr. Paste a read-only Personal Access Token (stored in sessionStorage only) to continue.",
    "token.save": "Save & Retry",
    "share.title": "Town Postcard & Share Portal",
    "share.sub": "Download a pixel souvenir postcard or embed the explorer badge in your GitHub README.",
    "share.urlLabel": "Direct Town Link",
    "share.copyUrl": "Copy URL",
    "share.badgeLabel": "README Badge Markdown",
    "share.copyBadge": "Copy Markdown",
    "share.download": "Download Postcard (.png)",
    "codex.title": "Adventure Codex & Progress",
    "codex.sub": "Track explored buildings, befriended committers, raided slimes, and bookmarked scrolls.",
    "battle.caption": "ENCOUNTER · SLIME RAID",
    "size.lg": "L",
    "size.sm": "S",
    "size.md": "M",
  },
};

const LABEL_EN_MAP = [
  ["市政厅 (根目录)", "Town Hall (Root)"],
  ["(Fiber 工坊)", "(Fiber Workshop)"],
  ["(港口码头)", "(DOM Harbor)"],
  ["(时间沙漏)", "(Hourglass)"],
  ["(自动记忆塔)", "(Memo Tower)"],
  ["(演武训练场)", "(Training Dojo)"],
  ["(核心熔炉)", "(Core Forge)"],
  ["(插件工坊)", "(Plugin Shop)"],
  ["(技能图书馆)", "(Skill Library)"],
  ["(演武场)", "(Eval Dojo)"],
  ["预设示例小镇", "Preset Demo Town"],
  ["2026 热门生态示例", "2026 Trending Demo"],
  ["Markdown 解析生成的像素小镇", "Markdown Pixel Town"],
];

export function localizeLabel(text, lang = currentLang) {
  if (!text || lang !== "en") return text || "";
  let out = String(text);
  for (const [zh, en] of LABEL_EN_MAP) {
    if (out.includes(zh)) out = out.replaceAll(zh, en);
  }
  return out;
}

export function t(key, vars = null) {
  const table = DICT[currentLang] || DICT.zh;
  let str = table[key] ?? DICT.zh[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

export function applyDomTranslations() {
  if (typeof document === "undefined") return;
  document.title = t("doc.title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}
