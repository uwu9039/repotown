/**
 * Wishing Fountain Fortune Engine for RepoTown.
 * Generates playful developer/explorer fortunes tied to real buildings & slimes in the active town.
 */

import { FORTUNE_TIERS_EN, FORTUNE_ENTRIES_EN } from "../i18n/i18n.js";

const FORTUNE_TIERS = [
  { tier: "大吉", tierCode: "SSR", color: "emerald", minScore: 93, maxScore: 100, weight: 22 },
  { tier: "中吉", tierCode: "SR", color: "brass", minScore: 82, maxScore: 92, weight: 32 },
  { tier: "小吉", tierCode: "R", color: "brass", minScore: 73, maxScore: 81, weight: 24 },
  { tier: "吉", tierCode: "N+", color: "emerald", minScore: 68, maxScore: 75, weight: 14 },
  { tier: "末吉 · 防踩坑", tierCode: "WARN", color: "terracotta", minScore: 60, maxScore: 67, weight: 8 },
];

const FORTUNE_ENTRIES = [
  {
    headline: "今日码运亨通：删掉的那行旧代码，恰好是困扰三天的隐形 Bug 源头。",
    yi: "清理冗余分支、先写回归测试再重构",
    ji: "在周五下班前顺手升级主依赖大版本",
  },
  {
    headline: "灵光一闪之兆：喝一口冰美式，复杂系统的入口就在市政厅旁边。",
    yi: "逛逛陌生的开源仓库、随手记下灵感草稿",
    ji: "对着空白编辑器硬憋完美架构",
  },
  {
    headline: "绿灯全开签：CI 流水线一次飘绿，连 Lint 警告都为你让路。",
    yi: "把藏在宝箱里的好代码整理成文档",
    ji: "不看 diff 直接 `git push --force`",
  },
  {
    headline: "贵人相助签：会有热心 Contributor 顺手帮你修掉一个边界条件。",
    yi: "给喜欢的仓库点颗 Star、完善 README 示例",
    ji: "把 `TODO` 史莱姆越攒越多却不标注上下文",
  },
  {
    headline: "稳如磐石签：今日宜修身养性，把老项目拆成一眼看懂的小模块。",
    yi: "阅读源码核心主循环、补充类型定义",
    ji: "同时开 6 个 Agent 窗口互相改同一个文件",
  },
  {
    headline: "意外宝藏签：某个不起眼的配置文件里，藏着省下 80% 时间的开关。",
    yi: "翻翻杂货铺和脚本工具箱、做个小而美的 Demo",
    ji: "还没验证最小闭环就开始设计微服务",
  },
  {
    headline: "摸鱼护体签：屏幕切到像素小镇，看起来既像在工作又在放松。",
    yi: "按时起身活动肩颈、给自己的小作品拍张明信片",
    ji: "连续熬夜调试 CSS 居中到凌晨两点",
  },
  {
    headline: "像素之神眷顾：今天写的动画帧率稳如 60fps，连锯齿都显得格外复古。",
    yi: "打磨界面细节、把交互动效调到刚好不卡手",
    ji: "在生产环境直接改线上环境变量",
  },
  {
    headline: "防踩坑预警签：先别急着合并 PR，再去演武场跑一遍边界用例。",
    yi: "检查异步竞态、空值兜底与 Windows 路径引号",
    ji: "口头承诺“这个小改动绝对不会出问题”",
  },
  {
    headline: "破圈灵感签：把枯燥技术做成让人 3 秒看懂的视觉玩具，Star 自来。",
    yi: "录一段 10 秒干净 GIF 放在文档第一屏",
    ji: "把全部时间花在起一个高深莫测的抽象名字",
  },
  {
    headline: "文档显灵签：卡住你半小时的问题，答案就写在 README 第五行。",
    yi: "耐心读完报错堆栈、检查默认端口与权限",
    ji: "跳过报错信息直接把问题甩给玄学重启",
  },
  {
    headline: "轻装上阵签：删掉 300 行过度封装后，整个世界突然清爽了。",
    yi: "零依赖快速原型、用简单数据结构解决问题",
    ji: "为了 1% 的假设场景引入十层继承抽象",
  },
  {
    headline: "夜猫灵感签：黄昏与夜晚切换之时，最适合给界面调出一组耐看配色。",
    yi: "试试切换小镇昼夜光影、检查暗色对比度",
    ji: "在低对比度灰底上放更浅的灰色小字",
  },
  {
    headline: "寻宝直觉签：今天随便走进一栋建筑，都会翻到正好用得上的片段。",
    yi: "用小地图传送探索每一个角落",
    ji: "只看首页不点进子目录就下结论",
  },
];

function pickWeightedTier(tiers) {
  const total = tiers.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const t of tiers) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return tiers[0];
}

export function rollFortune(worldModel, tossCount = 1, lang = "zh") {
  const isEn = lang === "en";
  const tiers = isEn ? FORTUNE_TIERS_EN : FORTUNE_TIERS;
  const entries = isEn ? FORTUNE_ENTRIES_EN : FORTUNE_ENTRIES;
  const tierObj = pickWeightedTier(tiers);
  const entry = entries[Math.floor(Math.random() * entries.length)];
  const score =
    tierObj.minScore +
    Math.floor(Math.random() * (tierObj.maxScore - tierObj.minScore + 1));

  const buildings = worldModel?.buildings || [];
  const slimes = worldModel?.slimes || [];

  const luckyBuilding =
    buildings.length > 0
      ? buildings[Math.floor(Math.random() * buildings.length)]
      : null;

  const cautionSlime =
    slimes.length > 0
      ? slimes[Math.floor(Math.random() * slimes.length)]
      : null;

  return {
    tier: tierObj.tier,
    tierCode: tierObj.tierCode,
    color: tierObj.color,
    score,
    headline: entry.headline,
    yi: entry.yi,
    ji: entry.ji,
    luckyBuilding,
    cautionSlime,
    tossCount,
  };
}
