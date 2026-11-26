import { parseMarkdownToWorld } from "../parsers/markdownParser.js";

const GUIDE_MARKDOWN = `# 独立开发与摸鱼生存指南

欢迎来到程序员摸鱼与独立开发幻想村！这里记录了如何用 1 天时间做出让人惊呼“卧槽好酷”的开源玩具。

## 创意炼金工坊
### 三秒钟法则
GitHub 新人在前 3 秒决定点不点 Star。不要写长篇架构论文，直接在首屏放 10 秒 GIF 和在线可玩链接！

\`\`\`js
// 永远先跑通一个让人想点 Star 的最小闭环
export function shipCoolToy(idea) {
  const demo = buildPlayableCanvas(idea);
  return { demo, starsPotential: "high" };
}
\`\`\`

## 摸鱼茶水间
### 工位摸鱼守则
把 IDE 拆成像素 RPG 风格后，老板路过会以为你在研究什么高深图形学引擎。
- [x] 学会用 HTML5 Canvas 画出带烟囱的小屋

## 审美炼丹炉
### 拒绝 AI 塑料感
别再用紫蓝渐变和千篇一律的卡片堆叠了，换成温暖复古羊皮纸、像素木框和手工绘制的精灵。

\`\`\`css
.rpg-dialog {
  background: #f5edd6;
  border: 3px solid #241a15;
  image-rendering: pixelated;
}
\`\`\`

## 待办悬赏栏
- [ ] 给镇长加上每天早上的咖啡吐槽台词
- [ ] 支持把任何网页转成复古像素游乐场
- [ ] 把吃灰的旧手机改造成桌面像素监视器
`;

const REACT_TOWN = {
  id: "preset-react-town",
  title: "facebook/react",
  subtitle: "JavaScript · 预设示例小镇",
  kind: "github",
  sourceUrl: "https://github.com/facebook/react",
  branch: "main",
  stats: {
    files: 1842,
    folders: 14,
    commits: 6,
    issues: 4,
    language: "JavaScript",
  },
  introText:
    "欢迎来到 React 城邦！这里是构建用户界面的经典王国。镇中心的广场通向各个核心包：Fiber 调度工坊、DOM 港口、Hooks 图书馆以及并发测试演武场。走近任意建筑门口按 [E] 即可推门进入！",
  buildings: [
    {
      id: "react-root",
      name: "市政厅 (根目录)",
      path: "",
      style: "shop",
      description: "仓库根目录配置、脚本入口与许可证。",
      items: [
        {
          id: "react-pkg",
          name: "package.json",
          fullPath: "package.json",
          type: "chest",
          language: "json",
          htmlUrl: "https://github.com/facebook/react/blob/main/package.json",
          loaded: true,
          content: `{
  "private": true,
  "name": "react-monorepo",
  "scripts": {
    "build": "node ./scripts/rollup/build.js",
    "test": "node ./scripts/jest/jest-cli.js",
    "lint": "node ./scripts/eslint/index.js"
  },
  "engines": { "node": ">=18.17.0" }
}`,
        },
        {
          id: "react-readme",
          name: "README.md",
          fullPath: "README.md",
          type: "file",
          language: "markdown",
          htmlUrl: "https://github.com/facebook/react/blob/main/README.md",
          loaded: true,
          content: "React is a JavaScript library for building user interfaces.\n\n- Declarative\n- Component-Based\n- Learn Once, Write Anywhere",
        },
      ],
    },
    {
      id: "react-reconciler",
      name: "react-reconciler (Fiber 工坊)",
      path: "packages/react-reconciler",
      style: "forge",
      description: "React 的心脏：Fiber 架构、任务调度与增量渲染引擎。",
      items: [
        {
          id: "fiber-loop",
          name: "ReactFiberWorkLoop.js",
          fullPath: "packages/react-reconciler/src/ReactFiberWorkLoop.js",
          type: "chest",
          language: "javascript",
          htmlUrl: "https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js",
          loaded: true,
          content: `// Fiber 工作循环：决定何时中断、何时提交渲染树
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}`,
        },
        {
          id: "fiber-hooks",
          name: "ReactFiberHooks.js",
          fullPath: "packages/react-reconciler/src/ReactFiberHooks.js",
          type: "file",
          language: "javascript",
          htmlUrl: "https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberHooks.js",
          loaded: true,
          content: `// Hooks 链表挂载与更新逻辑
export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}`,
        },
      ],
    },
    {
      id: "react-dom",
      name: "react-dom (港口码头)",
      path: "packages/react-dom",
      style: "cottage",
      description: "负责把虚拟 Fiber 树真正挂载并渲染到浏览器 DOM 上。",
      items: [
        {
          id: "dom-client",
          name: "client.js",
          fullPath: "packages/react-dom/client.js",
          type: "file",
          language: "javascript",
          htmlUrl: "https://github.com/facebook/react/blob/main/packages/react-dom/client.js",
          loaded: true,
          content: `import { createRoot, hydrateRoot } from './src/client/ReactDOMRoot';
export { createRoot, hydrateRoot };`,
        },
      ],
    },
    {
      id: "react-scheduler",
      name: "scheduler (时间沙漏)",
      path: "packages/scheduler",
      style: "workshop",
      description: "基于优先级的浏览器时间切片调度器。",
      items: [
        {
          id: "sched-core",
          name: "Scheduler.js",
          fullPath: "packages/scheduler/src/forks/Scheduler.js",
          type: "file",
          language: "javascript",
          htmlUrl: "https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js",
          loaded: true,
          content: `// 5ms 时间切片，保证主线程不会长时间阻塞用户输入
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  return timeElapsed >= frameInterval;
}`,
        },
      ],
    },
    {
      id: "react-compiler",
      name: "compiler (自动记忆塔)",
      path: "compiler",
      style: "library",
      description: "React Compiler 自动分析组件依赖，省去手写 useMemo。",
      items: [
        {
          id: "comp-entry",
          name: "BabelPluginReactCompiler.ts",
          fullPath: "compiler/packages/babel-plugin-react-compiler/src/index.ts",
          type: "chest",
          language: "typescript",
          htmlUrl: "https://github.com/facebook/react/tree/main/compiler",
          loaded: true,
          content: `// 自动将 React 组件编译为细粒度记忆化代码
export default function BabelPluginReactCompiler() {
  return { name: 'react-compiler', visitor: { ... } };
}`,
        },
      ],
    },
    {
      id: "react-scripts",
      name: "scripts (演武训练场)",
      path: "scripts",
      style: "dojo",
      description: "自动化测试、Rollup 打包与产物校验脚本。",
      items: [
        {
          id: "jest-cli",
          name: "jest-cli.js",
          fullPath: "scripts/jest/jest-cli.js",
          type: "file",
          language: "javascript",
          htmlUrl: "https://github.com/facebook/react/tree/main/scripts",
          loaded: true,
          content: `// 运行上千条并发渲染与边界回归测试\nconsole.log('Running React test suite...');`,
        },
      ],
    },
  ],
  villagers: [
    { id: "rv1", name: "sebmarkbage", message: "feat(fiber): optimize transition lane scheduling", date: "近期提交", sha: "a91f3c2", palette: 0 },
    { id: "rv2", name: "acdlite", message: "fix(hooks): preserve state across offscreen Suspense", date: "近期提交", sha: "4d0e8b1", palette: 1 },
    { id: "rv3", name: "gaearon", message: "docs: clarify effect cleanup mental model", date: "近期提交", sha: "9c2b11e", palette: 2 },
    { id: "rv4", name: "poteto", message: "compiler: infer memo dependencies in loops", date: "近期提交", sha: "e7710a4", palette: 3 },
  ],
  slimes: [
    { id: "rs1", title: "#31042 Suspense boundary flicker on slow stream", body: "流式 SSR 场景下快速切换路由时偶发闪烁。", url: "https://github.com/facebook/react/issues/31042", severity: "amber" },
    { id: "rs2", title: "#31109 React Compiler bailout warning clarity", body: "希望在遇到动态 eval 时输出更友好的跳过原因。", url: "https://github.com/facebook/react/issues/31109", severity: "green" },
    { id: "rs3", title: "#31205 DevTools profiler flamegraph zoom lag", body: "超大型组件树缩放火焰图帧率偏低。", url: "https://github.com/facebook/react/issues/31205", severity: "crimson" },
  ],
};

const DEEPSEEK_CITADEL = {
  id: "preset-deepseek-citadel",
  title: "deepseek-ai/deepseek-harness",
  subtitle: "TypeScript · 2026 热门生态示例",
  kind: "github",
  sourceUrl: "https://github.com/deepseek-ai/deepseek-harness",
  branch: "main",
  stats: {
    files: 428,
    folders: 9,
    commits: 5,
    issues: 3,
    language: "TypeScript",
  },
  introText:
    "欢迎来到 DeepSeek Harness 机械城！这里的信条是“Everything is a Plugin”。城内坐落着插件工坊、多智能体公会、上下文记忆馆和模型调度塔。",
  buildings: [
    {
      id: "dsh-core",
      name: "packages/core (核心熔炉)",
      path: "packages/core",
      style: "forge",
      description: "Agent 运行时主循环、工具调用调度与流式事件总线。",
      items: [
        {
          id: "dsh-loop",
          name: "harnessRuntime.ts",
          fullPath: "packages/core/src/harnessRuntime.ts",
          type: "chest",
          language: "typescript",
          loaded: true,
          content: `export async function runAgentTurn(ctx: HarnessContext) {
  for await (const event of ctx.model.stream(ctx.messages, ctx.tools)) {
    await ctx.bus.emit(event);
  }
}`,
        },
      ],
    },
    {
      id: "dsh-plugins",
      name: "plugins (插件工坊)",
      path: "plugins",
      style: "workshop",
      description: "热插拔模型适配、记忆持久化和本地沙箱工具插件。",
      items: [
        {
          id: "dsh-manifest",
          name: "pluginLoader.ts",
          fullPath: "plugins/pluginLoader.ts",
          type: "file",
          language: "typescript",
          loaded: true,
          content: `// 一切皆插件：动态注册 Skill、MCP 与 Hook 生命周期\nexport function mountPlugin(manifest: PluginManifest) { ... }`,
        },
      ],
    },
    {
      id: "dsh-skills",
      name: "skills (技能图书馆)",
      path: "skills",
      style: "library",
      description: "可复用的工程化 SKILL.md 秘籍与安全规范。",
      items: [
        {
          id: "dsh-skillmd",
          name: "SKILL.md",
          fullPath: "skills/code-review/SKILL.md",
          type: "file",
          language: "markdown",
          loaded: true,
          content: "# Code Review Skill\n先检查边界条件、权限校验与异步并发竞态，再输出最小改动建议。",
        },
      ],
    },
    {
      id: "dsh-evals",
      name: "evals (演武场)",
      path: "evals",
      style: "dojo",
      description: "回归基准测试与多模型工具调用准确率评估。",
      items: [
        {
          id: "dsh-bench",
          name: "benchSuite.ts",
          fullPath: "evals/benchSuite.ts",
          type: "file",
          language: "typescript",
          loaded: true,
          content: `// 在隔离沙箱中验证 Agent 修改是否通过全部单元测试\nexport const passRate = await runBenchmarkTasks(tasks);`,
        },
      ],
    },
  ],
  villagers: [
    { id: "dv1", name: "harness-bot", message: "feat: support hot-reload for SKILL.md bundles", date: "近期提交", sha: "f81c201", palette: 0 },
    { id: "dv2", name: "quant-dev", message: "perf: stream tool output without buffering large logs", date: "近期提交", sha: "39b77a0", palette: 1 },
    { id: "dv3", name: "plugin-smith", message: "chore: add model router adapter for local weights", date: "近期提交", sha: "c42d991", palette: 2 },
  ],
  slimes: [
    { id: "ds1", title: "#142 Windows PowerShell quote escaping in hook runner", body: "Windows 下执行含双引号脚本参数时需自动转义。", url: "https://github.com/deepseek-ai/deepseek-harness/issues/142", severity: "amber" },
    { id: "ds2", title: "#158 Add visual token usage gauge in CLI status bar", body: "在底部状态栏实时显示当前上下文占用百分比。", url: "https://github.com/deepseek-ai/deepseek-harness/issues/158", severity: "green" },
  ],
};

export function getPresetWorlds() {
  return {
    "react-town": REACT_TOWN,
    "deepseek-citadel": DEEPSEEK_CITADEL,
    "guide-village": parseMarkdownToWorld(GUIDE_MARKDOWN, { id: "preset-guide-village" }),
  };
}

export const SAMPLE_MARKDOWN = GUIDE_MARKDOWN;
