import { inferStyleFromName } from "./markdownParser.js";

const SESSION_PREFIX = "repotown_cache_v1_";
const TOKEN_KEY = "repotown_gh_token";

export function getSavedToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function saveSessionToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token.trim());
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage restriction
  }
}

export function parseRepoInput(raw) {
  const cleaned = (raw || "").trim();
  if (!cleaned) return null;

  // Match https://github.com/owner/repo or github.com/owner/repo
  const urlMatch = cleaned.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/i, ""),
      branch: "",
    };
  }

  // Match owner/repo or owner/repo@branch
  const shortMatch = cleaned.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:@([A-Za-z0-9_.\/-]+))?$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/i, ""),
      branch: shortMatch[3] || "",
    };
  }

  return null;
}

async function ghFetch(url, token) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    const err = new Error("GitHub API 请求频率受限（未登录每小时限 60 次），可填入只读 Token 后重试。");
    err.code = "RATE_LIMIT";
    throw err;
  }
  if (res.status === 404) {
    const err = new Error("未找到该公开仓库（请确认仓库名正确且不是私有仓库）。");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`GitHub API 请求失败 (HTTP ${res.status})`);
    err.code = "HTTP_ERROR";
    throw err;
  }
  return res.json();
}

function formatLanguageTag(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  const map = {
    js: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    py: "python",
    rs: "rust",
    go: "go",
    md: "markdown",
    json: "json",
    css: "css",
    html: "html",
    yml: "yaml",
    yaml: "yaml",
    sh: "bash",
  };
  return map[ext] || ext || "text";
}

function summarizeFileStub(path, size) {
  const kb = size ? `${(size / 1024).toFixed(1)} KB` : "未知大小";
  return `文件：${path}\n大小：${kb}\n\n（正在从 GitHub 仓库拉取真实代码预览...）`;
}

export async function fetchGitHubRepoWorld(inputStr) {
  const parsed = parseRepoInput(inputStr);
  if (!parsed) {
    const err = new Error("请输入有效的 GitHub 仓库格式，例如 facebook/react 或完整仓库链接。");
    err.code = "INVALID_INPUT";
    throw err;
  }

  const { owner, repo } = parsed;
  const cacheKey = `${SESSION_PREFIX}${owner.toLowerCase()}/${repo.toLowerCase()}@${parsed.branch || "default"}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore storage errors
  }

  const token = getSavedToken();
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  // 1. Repository metadata
  const repoInfo = await ghFetch(baseUrl, token);
  const branch = parsed.branch || repoInfo.default_branch || "main";

  // 2. Tree, recent commits, open issues, and README in parallel
  const [treeData, commitsData, issuesData, readmeText] = await Promise.all([
    ghFetch(`${baseUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token),
    ghFetch(`${baseUrl}/commits?sha=${encodeURIComponent(branch)}&per_page=8`, token).catch(() => []),
    ghFetch(`${baseUrl}/issues?state=open&per_page=8`, token).catch(() => []),
    fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/README.md`)
      .then((r) => (r.ok ? r.text() : ""))
      .catch(() => ""),
  ]);

  const blobs = (treeData.tree || []).filter((item) => item.type === "blob");
  const groups = new Map();

  for (const item of blobs) {
    const parts = item.path.split("/");
    const folder = parts.length > 1 ? parts[0] : "__root__";
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(item);
  }

  // Prioritize folders with more files; keep Town Hall (__root__) first if present
  const sortedFolders = [...groups.entries()].sort((a, b) => {
    if (a[0] === "__root__") return -1;
    if (b[0] === "__root__") return 1;
    return b[1].length - a[1].length;
  });

  const maxBuildings = 15;
  const buildings = sortedFolders.slice(0, maxBuildings).map(([folder, files], idx) => {
    const isRoot = folder === "__root__";
    const displayName = isRoot ? "市政厅 (根目录)" : folder;
    const pickedFiles = [...files]
      .sort((a, b) => (a.path.length - b.path.length))
      .slice(0, 10);

    return {
      id: `gh-b-${idx}`,
      name: displayName,
      path: isRoot ? "" : folder,
      style: isRoot ? "shop" : inferStyleFromName(folder),
      description: isRoot
        ? `仓库根目录配置文件与入口文档（共 ${files.length} 个文件）。`
        : `目录「${folder}/」下共有 ${files.length} 个文件，已挑选代表文件上架到书架。`,
      items: pickedFiles.map((f, fIdx) => {
        const fileName = f.path.split("/").pop();
        const isInteresting = /(readme|index|main|app|package\.json|cargo\.toml|config)/i.test(fileName);
        return {
          id: `gh-f-${idx}-${fIdx}`,
          name: fileName,
          fullPath: f.path,
          type: isInteresting ? "chest" : "file",
          language: formatLanguageTag(f.path),
          size: f.size || 0,
          rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${f.path}`,
          htmlUrl: `https://github.com/${owner}/${repo}/blob/${encodeURIComponent(branch)}/${f.path}`,
          content: summarizeFileStub(f.path, f.size),
          loaded: false,
        };
      }),
    };
  });

  const villagers = (Array.isArray(commitsData) ? commitsData : []).slice(0, 7).map((c, idx) => {
    const author = c.commit?.author?.name || c.author?.login || "Contributor";
    const msg = (c.commit?.message || "Update code").split("\n")[0].slice(0, 90);
    const date = (c.commit?.author?.date || "").slice(0, 10);
    return {
      id: `gh-v-${idx}`,
      name: author,
      message: msg,
      date,
      sha: (c.sha || "").slice(0, 7),
      url: c.html_url || "",
      palette: idx % 4,
    };
  });

  const slimes = (Array.isArray(issuesData) ? issuesData : [])
    .filter((issue) => !issue.pull_request)
    .slice(0, 8)
    .map((issue, idx) => ({
      id: `gh-s-${issue.number || idx}`,
      title: `#${issue.number} ${issue.title}`,
      body: (issue.body || "暂无详细 Issue 描述，可前往 GitHub 查看完整讨论。").slice(0, 480),
      url: issue.html_url || "",
      severity: idx % 3 === 0 ? "crimson" : idx % 2 === 0 ? "amber" : "green",
    }));

  const introClean = readmeText
    ? readmeText.replace(/!\[.*?\]\(.*?\)/g, "").replace(/<[^>]+>/g, "").trim().slice(0, 900)
    : repoInfo.description || "该仓库暂无 README 简介。";

  const world = {
    id: `gh-${owner}-${repo}`,
    title: repoInfo.full_name || `${owner}/${repo}`,
    subtitle: `${repoInfo.language || "Code"} · ${(repoInfo.stargazers_count || 0).toLocaleString()} Stars`,
    kind: "github",
    sourceUrl: repoInfo.html_url || `https://github.com/${owner}/${repo}`,
    branch,
    stats: {
      files: blobs.length,
      folders: groups.size,
      commits: villagers.length,
      issues: slimes.length,
      language: repoInfo.language || "Mixed",
    },
    introText: `${repoInfo.description ? repoInfo.description + "\n\n" : ""}${introClean}`,
    buildings,
    villagers,
    slimes,
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(world));
  } catch {
    // ignore quota error
  }

  return world;
}

export async function lazyLoadItemContent(item) {
  if (!item || item.loaded || !item.rawUrl) return item?.content || "";
  try {
    const res = await fetch(item.rawUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split("\n");
    const clipped = lines.slice(0, 120).join("\n");
    item.content = lines.length > 120 ? `${clipped}\n\n... (已截断，共 ${lines.length} 行，点击右上角查看完整文件)` : clipped;
    item.lines = lines.length;
    item.loaded = true;
    return item.content;
  } catch {
    item.loaded = true;
    item.content = `暂无法在线拉取 ${item.fullPath}（可能是二进制文件或网络受限）。可点击右上角按钮在 GitHub 中查看。`;
    return item.content;
  }
}

export async function checkGitHubIssueClosed(issueUrl) {
  const m = (issueUrl || "").match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/issues\/(\d+)/i);
  if (!m) {
    return { ok: false, error: "当前待办没有指向具体的 GitHub Issue 编号链接，无法通过 API 校验。" };
  }
  const [, owner, repo, num] = m;
  const token = getSavedToken();
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}`, {
      headers,
      cache: "no-store",
    });
    if (res.status === 403 || res.status === 429) {
      return { ok: false, rateLimited: true, error: "GitHub API 额度受限，可在设置 Token 后重试检测。" };
    }
    if (!res.ok) {
      return { ok: false, error: `GitHub API 校验失败 (HTTP ${res.status})。` };
    }
    const data = await res.json();
    return {
      ok: true,
      closed: data.state === "closed",
      state: data.state,
      title: data.title || `#${num}`,
    };
  } catch (err) {
    return { ok: false, error: `网络请求失败：${err.message}` };
  }
}
