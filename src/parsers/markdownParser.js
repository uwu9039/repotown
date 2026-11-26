/**
 * Parses arbitrary Markdown (English or Chinese) into a unified WorldModel.
 * - `# Heading` -> Town Name
 * - `## Heading` -> Enterable Building
 * - `### Heading` / paragraphs / fenced code blocks -> Interior Bookshelves, NPCs & Chests
 * - `- [ ] Task` -> Outskirts Slimes
 * - `- [x] Done` -> Completed Trophy Notes inside buildings
 */

export function inferStyleFromName(name) {
  const lower = (name || "").toLowerCase();
  if (/(src|core|engine|kernel|lib|app|server|api|代码|核心|工坊|源码|架构)/.test(lower)) return "forge";
  if (/(doc|guide|read|book|wiki|note|tutorial|faq|文档|指南|教程|笔记|说明|简介)/.test(lower)) return "library";
  if (/(test|spec|eval|bench|qa|lint|测试|演武|校验|面试|练习)/.test(lower)) return "dojo";
  if (/(script|tool|cli|bin|build|ci|workflow|plugin|skill|工具|脚本|插件|自动化|摸鱼)/.test(lower)) return "workshop";
  if (/(config|pkg|package|env|asset|public|style|theme|配置|商店|资源|清单)/.test(lower)) return "shop";
  return "cottage";
}

function extractChecklistAndCode(lines) {
  const todos = [];
  const dones = [];
  const codeBlocks = [];
  const textLines = [];

  let inFence = false;
  let fenceLang = "";
  let fenceBuf = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("```")) {
      if (!inFence) {
        inFence = true;
        fenceLang = trimmed.slice(3).trim() || "text";
        fenceBuf = [];
      } else {
        codeBlocks.push({ lang: fenceLang, code: fenceBuf.join("\n") });
        inFence = false;
      }
      continue;
    }
    if (inFence) {
      fenceBuf.push(raw);
      continue;
    }

    const todoMatch = raw.match(/^\s*[-*+]\s+\[\s\]\s+(.+)$/);
    if (todoMatch) {
      todos.push(todoMatch[1].trim());
      continue;
    }
    const doneMatch = raw.match(/^\s*[-*+]\s+\[[xX]\]\s+(.+)$/);
    if (doneMatch) {
      dones.push(doneMatch[1].trim());
      continue;
    }
    textLines.push(raw);
  }

  if (inFence && fenceBuf.length > 0) {
    codeBlocks.push({ lang: fenceLang, code: fenceBuf.join("\n") });
  }

  return {
    todos,
    dones,
    codeBlocks,
    prose: textLines.join("\n").trim(),
  };
}

export function parseMarkdownToWorld(markdown, options = {}) {
  const sourceText = (markdown || "").replace(/\r\n/g, "\n").trim();
  const fallbackTitle = options.title || "Markdown 冒险村";
  if (!sourceText) {
    return parseMarkdownToWorld(`# ${fallbackTitle}\n\n## 欢迎广场\n还没有内容，试着粘贴一些 Markdown 进来吧！`, options);
  }

  const lines = sourceText.split("\n");
  let townTitle = "";
  const sections = [];
  let current = null;
  let preamble = [];
  let inCode = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
    }
    if (!inCode) {
      const h1 = line.match(/^#\s+(.+)$/);
      if (h1 && !townTitle) {
        townTitle = h1[1].trim();
        continue;
      }
      const h2 = line.match(/^##\s+(.+)$/);
      if (h2) {
        if (current) sections.push(current);
        current = { title: h2[1].trim(), lines: [] };
        continue;
      }
    }
    if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) sections.push(current);

  // If no ## headings exist, split by ### or chunk paragraphs so any document builds a town
  if (sections.length === 0) {
    const h3Sections = [];
    let sub = null;
    const orphan = [];
    let codeFlag = false;
    for (const line of preamble) {
      if (line.trim().startsWith("```")) codeFlag = !codeFlag;
      const h3 = !codeFlag ? line.match(/^###\s+(.+)$/) : null;
      if (h3) {
        if (sub) h3Sections.push(sub);
        sub = { title: h3[1].trim(), lines: [] };
      } else if (sub) {
        sub.lines.push(line);
      } else {
        orphan.push(line);
      }
    }
    if (sub) h3Sections.push(sub);

    if (h3Sections.length > 0) {
      if (orphan.join("").trim()) {
        sections.push({ title: "序言大厅", lines: orphan });
      }
      sections.push(...h3Sections);
      preamble = [];
    } else {
      const paras = preamble.join("\n").split(/\n{2,}/).filter((p) => p.trim());
      const chunkSize = Math.max(2, Math.ceil(paras.length / 4));
      for (let i = 0; i < paras.length; i += chunkSize) {
        const slice = paras.slice(i, i + chunkSize).join("\n\n");
        const firstLine = slice.split("\n")[0].replace(/[#>*`-]/g, "").trim().slice(0, 18);
        sections.push({
          title: firstLine || `篇章 ${sections.length + 1}`,
          lines: slice.split("\n"),
        });
      }
      preamble = [];
    }
  }

  const finalTitle = townTitle || fallbackTitle;
  const preambleParsed = extractChecklistAndCode(preamble);
  const slimes = [];
  const buildings = [];

  for (const todo of preambleParsed.todos) {
    slimes.push({
      id: `slime-pre-${slimes.length}`,
      title: todo,
      body: "来自文档序言的待办任务（- [ ]），击败它或去把它完成吧！",
      severity: "amber",
    });
  }

  const maxBuildings = 14;
  sections.slice(0, maxBuildings).forEach((sec, idx) => {
    const parsed = extractChecklistAndCode(sec.lines);
    for (const todo of parsed.todos) {
      slimes.push({
        id: `slime-${idx}-${slimes.length}`,
        title: todo,
        body: `来自「${sec.title}」的未完成待办事项。`,
        severity: slimes.length % 3 === 0 ? "crimson" : slimes.length % 2 === 0 ? "amber" : "green",
      });
    }

    // Break section prose by ### subsections into interior items
    const items = [];
    const subParts = parsed.prose ? parsed.prose.split(/\n(?=###\s+)/) : [];
    for (const part of subParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^###\s+(.+?)\n([\s\S]*)$/);
      if (match) {
        items.push({
          id: `sec-${idx}-${items.length}`,
          name: match[1].trim(),
          type: "section",
          content: match[2].trim() || "（本小节暂无更多文字）",
          lines: match[2].split("\n").length,
        });
      } else {
        items.push({
          id: `sec-${idx}-${items.length}`,
          name: `${sec.title} · 卷轴`,
          type: "npc",
          content: trimmed,
          lines: trimmed.split("\n").length,
        });
      }
    }

    parsed.codeBlocks.forEach((cb, cIdx) => {
      items.push({
        id: `chest-${idx}-${cIdx}`,
        name: `代码宝箱 (${cb.lang})`,
        type: "chest",
        language: cb.lang,
        content: cb.code,
        lines: cb.code.split("\n").length,
      });
    });

    if (parsed.dones.length > 0) {
      items.push({
        id: `done-${idx}`,
        name: `已完成战利品 (${parsed.dones.length})`,
        type: "chest",
        content: parsed.dones.map((d) => `[已完成] ${d}`).join("\n"),
        lines: parsed.dones.length,
      });
    }

    if (items.length === 0) {
      items.push({
        id: `empty-${idx}`,
        name: `${sec.title} 笔记`,
        type: "section",
        content: "这间屋子目前很整洁，暂时没有额外段落或代码块。",
        lines: 1,
      });
    }

    buildings.push({
      id: `b-${idx}`,
      name: sec.title,
      path: sec.title,
      style: inferStyleFromName(sec.title),
      description: `Markdown 章节「${sec.title}」，内含 ${items.length} 个可交互物件。`,
      items: items.slice(0, 10),
    });
  });

  // Synthesize lively villagers from section summaries so the square feels alive
  const villagers = buildings.slice(0, 6).map((b, idx) => ({
    id: `v-md-${idx}`,
    name: `${b.name.slice(0, 8)} 守门人`,
    message: `欢迎来「${b.name}」屋里看看！里面藏着 ${b.items.length} 份记录。`,
    date: "Markdown NPC",
    palette: idx % 4,
  }));

  const totalItems = buildings.reduce((sum, b) => sum + b.items.length, 0);

  return {
    id: options.id || `md-${Date.now()}`,
    title: finalTitle,
    subtitle: "Markdown 文档小镇",
    kind: "markdown",
    sourceUrl: "",
    branch: "",
    stats: {
      files: totalItems,
      folders: buildings.length,
      commits: villagers.length,
      issues: slimes.length,
      language: "Markdown",
    },
    introText:
      preambleParsed.prose ||
      `欢迎来到「${finalTitle}」！整篇 Markdown 文档已经变成了一座可探索的小镇：每个二级标题是一栋屋子，代码块藏在宝箱里，未完成的待办则在郊外化作了史莱姆。`,
    buildings,
    villagers,
    slimes,
  };
}
