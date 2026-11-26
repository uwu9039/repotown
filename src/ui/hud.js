import { getSpriteAtlas, TOWN_THEMES } from "../engine/spriteAtlas.js";
import { retroAudio } from "../engine/audio.js";
import { rollFortune } from "../engine/fortune.js";
import { parseMarkdownToWorld } from "../parsers/markdownParser.js";
import {
  fetchGitHubRepoWorld,
  lazyLoadItemContent,
  saveSessionToken,
  checkGitHubIssueClosed,
} from "../parsers/githubParser.js";
import { SAMPLE_MARKDOWN } from "../data/presets.js";
import { renderTownPostcard } from "./postcard.js";
import {
  getLang,
  setLang,
  t,
  localizeLabel,
  applyDomTranslations,
  THEME_LABELS,
  TOUR_STEPS_I18N,
  WINDMILL_QUOTES_I18N,
} from "../i18n/i18n.js";

const TOUR_DONE_KEY = "repotown_tour_done_v1";
const COINS_KEY = "repotown_coins_v1";

function getTourSteps() {
  return TOUR_STEPS_I18N[getLang()] || TOUR_STEPS_I18N.zh;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CODE_TOKEN_RE = /(\/\/.*$|^\s*#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|export|from|default|const|let|var|function|async|await|return|if|else|for|while|class|extends|new|try|catch|true|false|null|undefined|def|type|interface|struct|fn)\b|\b\d+(?:\.\d+)?\b)/gm;

function highlightCodeLine(rawLine) {
  let out = "";
  let lastIdx = 0;
  CODE_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = CODE_TOKEN_RE.exec(rawLine)) !== null) {
    if (m.index > lastIdx) {
      out += escapeHtml(rawLine.slice(lastIdx, m.index));
    }
    const tok = m[0];
    let cls = "tok-kw";
    if (tok.startsWith("//") || tok.trimStart().startsWith("#")) cls = "tok-com";
    else if (tok[0] === '"' || tok[0] === "'" || tok[0] === "`") cls = "tok-str";
    else if (tok[0] >= "0" && tok[0] <= "9") cls = "tok-num";
    out += `<span class="${cls}">${escapeHtml(tok)}</span>`;
    lastIdx = m.index + tok.length;
  }
  if (lastIdx < rawLine.length) {
    out += escapeHtml(rawLine.slice(lastIdx));
  }
  return out || "&nbsp;";
}

function renderInlineMarkdown(text) {
  const parts = String(text || "").split(/(`[^`]+`)/g);
  return parts
    .map((p) => (p.startsWith("`") && p.endsWith("`") && p.length >= 2
      ? `<code>${escapeHtml(p.slice(1, -1))}</code>`
      : escapeHtml(p)))
    .join("");
}

function renderScrollProse(rawText) {
  const lines = String(rawText || "").split("\n");
  const chunks = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      chunks.push("</ul>");
      listOpen = false;
    }
  };
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      closeList();
      continue;
    }
    const hMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (hMatch) {
      closeList();
      chunks.push(`<h4 class="scroll-h">${renderInlineMarkdown(hMatch[1])}</h4>`);
      continue;
    }
    const liMatch = trimmed.match(/^[-*]\s+(?:\[[ xX]\]\s*)?(.+)$/);
    if (liMatch) {
      if (!listOpen) {
        chunks.push('<ul class="scroll-list">');
        listOpen = true;
      }
      chunks.push(`<li>${renderInlineMarkdown(liMatch[1])}</li>`);
      continue;
    }
    closeList();
    chunks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }
  closeList();
  return `<div class="scroll-prose">${chunks.join("") || "<p>（空文档）</p>"}</div>`;
}

function summarizeItem(item) {
  const text = item?.content || "";
  const lines = text.split("\n");
  const symbols = [];
  const headings = [];
  const imports = [];

  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^#{1,4}\s+(.+)$/);
    if (h) headings.push(h[1]);
    const imp = line.match(/^import\s+.+?from\s+['"](.+?)['"]/);
    if (imp) imports.push(imp[1]);
    const fn = line.match(/^(?:export\s+)?(?:async\s+)?(?:function|class|const|let|def|fn|struct|interface|type)\s+([A-Za-z0-9_$]+)/);
    if (fn) symbols.push(fn[1]);
  }

  return {
    lineCount: lines.length,
    charCount: text.length,
    headings: headings.slice(0, 6),
    symbols: [...new Set(symbols)].slice(0, 8),
    imports: [...new Set(imports)].slice(0, 6),
  };
}

export class HudController {
  constructor({ engine, presets }) {
    this.engine = engine;
    this.presets = presets;
    this.currentWorld = null;
    this.pendingRetryInput = "";
    this.toastTimer = null;
    this.toastHideTimer = null;
    this.bookmarks = new Map();
    this.dialogExpanded = false;
    this.readerFontDelta = 0;
    this.lastThemeKey = null;
    this.pendingBattle = null;
    this.rewardedSlimes = new Set();
    this.windmillRewardedTowns = new Set();
    this.tourState = { active: false, step: 0, graduated: false };
    let initialCoins = 1;
    try {
      const saved = localStorage.getItem(COINS_KEY);
      if (saved !== null) {
        const parsed = Number.parseInt(saved, 10);
        if (!Number.isNaN(parsed)) initialCoins = Math.max(0, parsed);
      }
    } catch {}
    this.coins = initialCoins;

    this.el = {
      townName: document.getElementById("hud-town-name"),
      zoneName: document.getElementById("hud-zone-name"),
      themeBadge: document.getElementById("hud-theme-badge"),
      battleCurtain: document.getElementById("battle-curtain"),
      repoForm: document.getElementById("repo-form"),
      repoInput: document.getElementById("repo-input"),
      btnGenerate: document.getElementById("btn-generate"),
      btnHome: document.getElementById("btn-home"),
      btnMarkdown: document.getElementById("btn-markdown"),
      btnTime: document.getElementById("btn-time"),
      btnSfx: document.getElementById("btn-sfx"),
      iconSfxOn: document.getElementById("icon-sfx-on"),
      iconSfxOff: document.getElementById("icon-sfx-off"),
      btnLang: document.getElementById("btn-lang"),
      langBtnLabel: document.getElementById("lang-btn-label"),
      langModal: document.getElementById("lang-modal"),
      btnPickZh: document.getElementById("btn-pick-zh"),
      btnPickEn: document.getElementById("btn-pick-en"),
      btnCodex: document.getElementById("btn-codex"),
      codexCount: document.getElementById("codex-count"),
      btnHelp: document.getElementById("btn-help"),
      btnShare: document.getElementById("btn-share"),
      statusToast: document.getElementById("status-toast"),
      statBuildings: document.getElementById("stat-buildings"),
      statFiles: document.getElementById("stat-files"),
      statVillagers: document.getElementById("stat-villagers"),
      statSlimes: document.getElementById("stat-slimes"),
      statCoins: document.getElementById("stat-coins"),
      minimapPanel: document.getElementById("minimap-panel"),
      minimapSub: document.getElementById("minimap-sub"),
      btnMinimapToggle: document.getElementById("btn-minimap-toggle"),
      btnMinimapSize: document.getElementById("btn-minimap-size"),
      btnMapZoomOut: document.getElementById("btn-map-zoom-out"),
      btnMapZoomReset: document.getElementById("btn-map-zoom-reset"),
      btnMapZoomIn: document.getElementById("btn-map-zoom-in"),
      minimap: document.getElementById("minimap-canvas"),
      dialogBox: document.getElementById("dialog-box"),
      readerBackdrop: document.getElementById("reader-backdrop"),
      dialogPortrait: document.getElementById("dialog-portrait"),
      dialogRole: document.getElementById("dialog-role-tag"),
      dialogSpeaker: document.getElementById("dialog-speaker"),
      dialogMeta: document.getElementById("dialog-meta"),
      dialogExtLink: document.getElementById("dialog-ext-link"),
      dialogClose: document.getElementById("dialog-close"),
      dialogBody: document.getElementById("dialog-body"),
      mdModal: document.getElementById("markdown-modal"),
      mdClose: document.getElementById("md-modal-close"),
      mdFileInput: document.getElementById("md-file-input"),
      mdLoadSample: document.getElementById("md-load-sample"),
      mdTextarea: document.getElementById("md-textarea"),
      mdSubmit: document.getElementById("md-submit"),
      tokenModal: document.getElementById("token-modal"),
      tokenClose: document.getElementById("token-modal-close"),
      tokenInput: document.getElementById("github-token-input"),
      tokenSaveRetry: document.getElementById("token-save-retry"),
      shareModal: document.getElementById("share-modal"),
      shareClose: document.getElementById("share-modal-close"),
      postcardCanvas: document.getElementById("postcard-canvas"),
      shareUrlInput: document.getElementById("share-url-input"),
      shareBadgeInput: document.getElementById("share-badge-input"),
      btnCopyUrl: document.getElementById("btn-copy-url"),
      btnCopyBadge: document.getElementById("btn-copy-badge"),
      btnDownloadPostcard: document.getElementById("btn-download-postcard"),
      tourCard: document.getElementById("tour-card"),
      tourStepBadge: document.getElementById("tour-step-badge"),
      tourProgressFill: document.getElementById("tour-progress-fill"),
      tourTitle: document.getElementById("tour-title"),
      tourDesc: document.getElementById("tour-desc"),
      tourAssist: document.getElementById("tour-assist"),
      tourSkip: document.getElementById("tour-skip"),
      tourClose: document.getElementById("tour-close"),
      codexModal: document.getElementById("codex-modal"),
      codexClose: document.getElementById("codex-close"),
      codexBody: document.getElementById("codex-body"),
      dropOverlay: document.getElementById("drop-overlay"),
    };

    this.minimapSizeCls = "size-md";
    this.bindEvents();
    this.updateCoinStat();
  }

  openLangChooser() {
    this.applyLanguage(getLang(), false);
    if (!this.el.langModal) {
      this.maybeShowOnboarding();
      return;
    }
    const prev = getLang();
    this.el.btnPickZh?.classList.toggle("is-last-picked", prev === "zh");
    this.el.btnPickEn?.classList.toggle("is-last-picked", prev === "en");
    this.el.langModal.hidden = false;
    this.engine.setDialogOpen(true);
  }

  applyLanguage(lang, showNotice = false) {
    const activeLang = setLang(lang);
    const isEn = activeLang === "en";
    applyDomTranslations();
    if (this.el.langBtnLabel) {
      this.el.langBtnLabel.textContent = isEn ? "中文" : "EN";
    }
    if (this.el.townName && this.engine.worldModel?.title) {
      this.el.townName.textContent = localizeLabel(this.engine.worldModel.title);
    }
    if (this.el.themeBadge && this.engine.themeKey) {
      this.el.themeBadge.textContent =
        THEME_LABELS[activeLang]?.[this.engine.themeKey] ||
        TOWN_THEMES[this.engine.themeKey]?.label ||
        "";
    }
    if (this.el.zoneName) {
      if (this.engine.activeMap?.kind === "interior") {
        const bName = localizeLabel(this.engine.interior?.building?.name || "");
        this.el.zoneName.textContent = isEn ? `Indoor · ${bName}` : `室内 · ${bName}`;
      } else {
        this.el.zoneName.textContent = t("town.plaza");
      }
    }
    if (this.el.minimapSub) {
      this.el.minimapSub.textContent = this.engine.minimapZoom > 1 ? t("map.dragClick") : t("map.click");
    }
    if (this.el.btnMinimapSize) {
      const nextMap = { "size-md": "size.lg", "size-lg": "size.sm", "size-sm": "size.md" };
      this.el.btnMinimapSize.textContent = t(nextMap[this.minimapSizeCls || "size-md"]);
    }
    if (!this.el.dialogBox.hidden) {
      this.closeDialog();
    }
    if (this.tourState.active) {
      this.renderTourStep();
    }
    if (showNotice) {
      this.showToast(isEn ? "Switched to English mode" : "已切换为简体中文模式");
    }
  }

  updateCoinStat() {
    if (this.el.statCoins) {
      this.el.statCoins.textContent = String(this.coins);
    }
  }

  addCoins(delta) {
    this.coins = Math.max(0, this.coins + delta);
    try {
      localStorage.setItem(COINS_KEY, String(this.coins));
    } catch {}
    this.updateCoinStat();
  }

  bindEvents() {
    // Home button
    this.el.btnHome.addEventListener("click", () => {
      this.closeDialog();
      this.engine.returnToPlaza();
      this.showToast(getLang() === "en" ? "Teleported to Town Plaza" : "已传送回镇中心广场");
    });

    // Preset chips
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.preset;
        const world = this.presets[key];
        if (!world) return;
        this.markActivePreset(key);
        this.engine.withWorldTransition(() => {
          this.loadWorld(world);
          this.showToast(getLang() === "en" ? `Entered "${world.title}"` : `已切换至「${world.title}」`);
        });
      });
    });

    // GitHub repo submit
    this.el.repoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = this.el.repoInput.value.trim();
      if (!val) {
        this.showToast(
          getLang() === "en" ? "Enter a GitHub repo, e.g. facebook/react" : "请输入 GitHub 仓库地址，例如 facebook/react",
          true
        );
        return;
      }
      await this.loadGitHubRepo(val);
    });

    // Day / Dusk / Night cycle
    const modes = ["day", "dusk", "night"];
    const modeNamesZh = { day: "白昼", dusk: "黄昏", night: "夜晚" };
    const modeNamesEn = { day: "Daylight", dusk: "Sunset", night: "Starry Night" };
    this.el.btnTime.addEventListener("click", () => {
      const idx = (modes.indexOf(this.engine.timeOfDay) + 1) % modes.length;
      const next = modes[idx];
      this.engine.setTimeOfDay(next);
      this.showToast(
        getLang() === "en" ? `Lighting: ${modeNamesEn[next]}` : `光影已切换为：${modeNamesZh[next]}`
      );
    });

    // SFX toggle
    this.el.btnSfx.addEventListener("click", () => {
      const next = !retroAudio.enabled;
      retroAudio.setEnabled(next);
      this.el.btnSfx.setAttribute("aria-pressed", String(next));
      this.el.iconSfxOn.toggleAttribute("hidden", !next);
      this.el.iconSfxOff.toggleAttribute("hidden", next);
      if (next) retroAudio.blip();
      this.showToast(
        getLang() === "en"
          ? (next ? "8-bit SFX enabled" : "8-bit SFX muted")
          : (next ? "8-bit 音效已开启" : "8-bit 音效已静音")
      );
    });

    // Startup language chooser & topbar live language toggle
    const chooseLang = (lang) => {
      if (this.el.langModal) this.el.langModal.hidden = true;
      this.engine.setDialogOpen(false);
      this.applyLanguage(lang, false);
      this.maybeShowOnboarding();
    };
    this.el.btnPickZh?.addEventListener("click", () => chooseLang("zh"));
    this.el.btnPickEn?.addEventListener("click", () => chooseLang("en"));
    this.el.btnLang?.addEventListener("click", () => {
      const next = getLang() === "en" ? "zh" : "en";
      this.applyLanguage(next, true);
    });

    // Minimap zoom, panel size, hover, drag-pan, collapse & click -> teleport (buildings/fountain/slimes/NPCs)
    const zoomSteps = [1, 1.6, 2.4];
    const applyZoom = (val) => {
      const z = this.engine.setMinimapZoom(val);
      if (this.el.btnMapZoomReset) this.el.btnMapZoomReset.textContent = `${z}×`;
      this.el.minimap?.classList.toggle("is-zoomed", z > 1);
      if (this.el.minimapSub) {
        this.el.minimapSub.textContent = z > 1 ? t("map.dragClick") : t("map.click");
      }
    };
    this.el.btnMapZoomOut?.addEventListener("click", () => {
      const idx = zoomSteps.findIndex((s) => s >= this.engine.minimapZoom);
      applyZoom(zoomSteps[Math.max(0, (idx === -1 ? 0 : idx) - 1)]);
    });
    this.el.btnMapZoomIn?.addEventListener("click", () => {
      const idx = zoomSteps.findIndex((s) => s >= this.engine.minimapZoom);
      applyZoom(zoomSteps[Math.min(zoomSteps.length - 1, (idx === -1 ? 0 : idx) + 1)]);
    });
    this.el.btnMapZoomReset?.addEventListener("click", () => applyZoom(1));

    this.el.minimap.addEventListener("wheel", (e) => {
      e.preventDefault();
      applyZoom(this.engine.minimapZoom + (e.deltaY < 0 ? 0.3 : -0.3));
    }, { passive: false });

    const sizeOrder = ["size-md", "size-lg", "size-sm"];
    const sizeBtnKeys = { "size-md": "size.lg", "size-lg": "size.sm", "size-sm": "size.md" };
    const sizeNamesZh = { "size-md": "标准", "size-lg": "放大", "size-sm": "紧凑" };
    const sizeNamesEn = { "size-md": "Medium", "size-lg": "Large", "size-sm": "Compact" };
    let sizeIdx = 0;
    this.el.btnMinimapSize?.addEventListener("click", () => {
      this.el.minimapPanel.classList.remove(sizeOrder[sizeIdx]);
      sizeIdx = (sizeIdx + 1) % sizeOrder.length;
      const cls = sizeOrder[sizeIdx];
      this.minimapSizeCls = cls;
      this.el.minimapPanel.classList.add(cls);
      this.el.btnMinimapSize.textContent = t(sizeBtnKeys[cls]);
      setTimeout(() => this.engine.syncMinimapResolution(), 180);
      this.showToast(
        getLang() === "en" ? `Minimap size: ${sizeNamesEn[cls]}` : `小地图窗口：${sizeNamesZh[cls]}`
      );
    });

    this.el.btnMinimapToggle?.addEventListener("click", () => {
      const collapsed = this.el.minimapPanel.classList.toggle("is-collapsed");
      this.el.btnMinimapToggle.textContent = collapsed ? "▸" : "▾";
      this.el.btnMinimapToggle.setAttribute("aria-expanded", String(!collapsed));
    });

    let mapDrag = null;
    const setMinimapSubText = (text) => {
      if (this.el.minimapSub && this.el.minimapSub.textContent !== text) {
        this.el.minimapSub.textContent = text;
      }
    };
    this.el.minimap.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !this.engine.overworld) return;
      const rect = this.el.minimap.getBoundingClientRect();
      mapDrag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        dragged: false,
        rect,
      };
      try {
        this.el.minimap.setPointerCapture(e.pointerId);
      } catch {}
    });

    this.el.minimap.addEventListener("pointermove", (e) => {
      if (this.engine.activeMap?.kind === "interior") {
        setMinimapSubText(t("map.indoor"));
        return;
      }
      if (mapDrag && this.engine.minimapZoom > 1) {
        const totalMove = Math.hypot(e.clientX - mapDrag.startX, e.clientY - mapDrag.startY);
        if (totalMove > 5) {
          mapDrag.dragged = true;
          this.el.minimap.classList.add("is-dragging");
          const dxPx = e.clientX - mapDrag.lastX;
          const dyPx = e.clientY - mapDrag.lastY;
          const v = this.engine.minimapView || { w: this.engine.overworld.width, h: this.engine.overworld.height };
          const dtx = -(dxPx / Math.max(1, mapDrag.rect.width)) * v.w;
          const dty = -(dyPx / Math.max(1, mapDrag.rect.height)) * v.h;
          this.engine.panMinimapByTiles(dtx, dty);
          mapDrag.lastX = e.clientX;
          mapDrag.lastY = e.clientY;
          setMinimapSubText(t("map.dragging"));
          return;
        }
      }
      const rect = this.el.minimap.getBoundingClientRect();
      const target = this.engine.getMinimapTargetAt(
        (e.clientX - rect.left) / rect.width,
        (e.clientY - rect.top) / rect.height
      );
      if (target) {
        setMinimapSubText(localizeLabel(target.name));
      }
    });

    this.el.minimap.addEventListener("pointerleave", () => {
      if (!mapDrag?.dragged) {
        setMinimapSubText(this.engine.minimapZoom > 1 ? t("map.dragClick") : t("map.click"));
      }
    });

    const endMapPointer = (e) => {
      if (!mapDrag) return;
      const wasDragged = mapDrag.dragged;
      const rect = this.el.minimap.getBoundingClientRect();
      try {
        this.el.minimap.releasePointerCapture(mapDrag.pointerId);
      } catch {}
      this.el.minimap.classList.remove("is-dragging");
      mapDrag = null;
      if (wasDragged || e.type !== "pointerup" || !this.engine.overworld) return;

      const target = this.engine.getMinimapTargetAt(
        (e.clientX - rect.left) / rect.width,
        (e.clientY - rect.top) / rect.height
      );
      if (!target) return;
      this.closeDialog();
      const isEn = getLang() === "en";
      if (target.kind === "fountain") {
        this.engine.teleportToFountain();
        this.showToast(isEn ? "Warped to Wishing Fountain! Press E for fortunes" : "已传送至「许愿喷泉」，按 E 测今日运势");
      } else if (target.kind === "windmill") {
        this.engine.teleportToWindmill();
        this.showToast(isEn ? "Warped to Eastern Windmill! Press E to push blades" : "已传送至「东郊风车」，按 E 推推叶片试试！");
      } else if (target.kind === "npc" && target.npc) {
        this.engine.teleportToNpc(target.npc);
        this.showToast(isEn ? `Warped beside "${target.npc.name}"` : `已传送至「${target.npc.name}」身旁`);
      } else if (target.kind === "slime" && target.slime) {
        this.engine.teleportToSlime(target.slime);
        this.showToast(isEn ? `Warped near TODO "${target.slime.title.slice(0, 14)}"` : `已传送至待办「${target.slime.title.slice(0, 14)}」附近`);
      } else if (target.building) {
        this.engine.teleportToBuilding(target.building);
        this.showToast(isEn ? `Warped to "${localizeLabel(target.building.name)}"` : `快速传送至「${target.building.name}」门口`);
      }
      this.notifyTourEvent("minimap_teleport");
    };
    this.el.minimap.addEventListener("pointerup", endMapPointer);
    this.el.minimap.addEventListener("pointercancel", endMapPointer);

    // Track leaving & returning to the tab for battle completion flows
    const markLeftTab = () => {
      if (this.pendingBattle) {
        this.pendingBattle.leftTab = true;
      }
    };
    const onReturnCheck = () => {
      if (!this.pendingBattle?.slime) return;
      if (this.pendingBattle.mode === "normal") {
        if (this.pendingBattle.leftTab || Date.now() - this.pendingBattle.openedAt > 400) {
          this.completeNormalBattle(this.pendingBattle.slime);
        }
        return;
      }
      if (this.pendingBattle.mode === "dev" && this.pendingBattle.slime.url) {
        this.verifyPendingBattleIssue(true);
      }
    };
    window.addEventListener("blur", markLeftTab);
    window.addEventListener("focus", onReturnCheck);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") markLeftTab();
      else if (document.visibilityState === "visible") onReturnCheck();
    });

    // Hands-on Guided Tour & Codex modals
    this.el.btnHelp?.addEventListener("click", () => this.startGuidedTour(true));
    this.el.tourClose?.addEventListener("click", () => this.finishGuidedTour(true));
    this.el.tourSkip?.addEventListener("click", () => {
      if (this.tourState.step >= getTourSteps().length) {
        this.finishGuidedTour(true);
      } else {
        this.advanceGuidedTour();
      }
    });
    this.el.tourAssist?.addEventListener("click", () => this.runTourAssist());
    window.addEventListener("resize", () => this.positionTourCard());

    this.el.btnCodex?.addEventListener("click", () => this.openCodex());
    this.el.codexClose?.addEventListener("click", () => this.closeModal(this.el.codexModal));

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this.el.codexModal && !this.el.codexModal.hidden) this.closeModal(this.el.codexModal);
      else if (this.el.mdModal && !this.el.mdModal.hidden) this.closeModal(this.el.mdModal);
      else if (this.el.shareModal && !this.el.shareModal.hidden) this.closeModal(this.el.shareModal);
      else if (this.el.tokenModal && !this.el.tokenModal.hidden) this.closeModal(this.el.tokenModal);
    });

    // Dialogue close & expanded reader backdrop collapse
    this.el.dialogClose.addEventListener("click", () => this.closeDialog());
    this.el.readerBackdrop?.addEventListener("click", () => {
      if (!this.dialogExpanded) return;
      const expandBtn = document.getElementById("btn-act-expand");
      if (expandBtn) {
        expandBtn.click();
      } else {
        this.dialogExpanded = false;
        this.el.dialogBox.classList.remove("is-expanded");
        this.el.readerBackdrop.hidden = true;
      }
    });

    // Markdown modal
    this.el.btnMarkdown.addEventListener("click", () => {
      this.closeDialog();
      this.el.mdModal.hidden = false;
      this.engine.setDialogOpen(true);
      this.el.mdTextarea.focus();
    });
    this.el.mdClose.addEventListener("click", () => this.closeModal(this.el.mdModal));
    this.el.mdLoadSample.addEventListener("click", () => {
      this.el.mdTextarea.value = SAMPLE_MARKDOWN;
    });
    this.el.mdFileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      this.el.mdTextarea.value = text;
    });
    this.el.mdSubmit.addEventListener("click", () => {
      const md = this.el.mdTextarea.value.trim();
      if (!md) {
        this.showToast("请先输入或上传 Markdown 内容", true);
        return;
      }
      const world = parseMarkdownToWorld(md);
      this.closeModal(this.el.mdModal);
      this.markActivePreset(null);
      this.loadWorld(world);
      this.showToast(`已生成 Markdown 小镇「${world.title}」`);
    });

    // Token modal
    this.el.tokenClose.addEventListener("click", () => this.closeModal(this.el.tokenModal));
    this.el.tokenSaveRetry.addEventListener("click", async () => {
      const token = this.el.tokenInput.value.trim();
      saveSessionToken(token);
      this.closeModal(this.el.tokenModal);
      if (this.pendingRetryInput) {
        await this.loadGitHubRepo(this.pendingRetryInput);
      }
    });

    // Share & Postcard modal
    this.el.btnShare.addEventListener("click", () => this.openShareModal());
    this.el.shareClose.addEventListener("click", () => this.closeModal(this.el.shareModal));
    this.el.btnCopyUrl.addEventListener("click", () => this.copyInput(this.el.shareUrlInput, "已复制小镇直达链接"));
    this.el.btnCopyBadge.addEventListener("click", () => this.copyInput(this.el.shareBadgeInput, "已复制 README 徽章 Markdown"));
    this.el.btnDownloadPostcard.addEventListener("click", () => {
      const url = this.el.postcardCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(this.currentWorld?.title || "repotown").replace(/[^a-zA-Z0-9_-]+/g, "-")}-postcard.png`;
      a.click();
      this.showToast("明信片 PNG 已开始下载");
    });

    // Global drag & drop .md files
    let dragCounter = 0;
    window.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragCounter++;
      this.el.dropOverlay.hidden = false;
    });
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("dragleave", () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) this.el.dropOverlay.hidden = true;
    });
    window.addEventListener("drop", async (e) => {
      e.preventDefault();
      dragCounter = 0;
      this.el.dropOverlay.hidden = true;
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const text = await file.text();
      const world = parseMarkdownToWorld(text, { title: file.name.replace(/\.(md|markdown|txt)$/i, "") });
      this.markActivePreset(null);
      this.loadWorld(world);
      this.showToast(`已从「${file.name}」生成小镇`);
    });

    // Touch controls
    document.querySelectorAll("[data-dir]").forEach((btn) => {
      const dir = btn.dataset.dir;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.engine.setTouchDirection(dir);
      });
      const stop = () => this.engine.setTouchDirection(null);
      btn.addEventListener("pointerup", stop);
      btn.addEventListener("pointerleave", stop);
      btn.addEventListener("pointercancel", stop);
    });
    document.getElementById("btn-touch-act")?.addEventListener("click", () => {
      if (this.el.dialogBox.hidden) this.engine.tryInteract();
      else this.closeDialog();
    });
  }

  markActivePreset(activeKey) {
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.preset === activeKey);
    });
  }

  loadWorld(worldModel) {
    const themeKeys = Object.keys(TOWN_THEMES);
    const pool = themeKeys.filter((k) => k !== this.lastThemeKey);
    const pickedTheme = pool[Math.floor(Math.random() * pool.length)] || "meadow";
    this.lastThemeKey = pickedTheme;

    const themedWorld = { ...worldModel, themeKey: pickedTheme };
    this.currentWorld = themedWorld;
    this.pendingBattle = null;
    this.bookmarks.clear();
    this.closeDialog();
    this.engine.setWorld(themedWorld);
    this.el.townName.textContent = themedWorld.title;
    if (this.el.themeBadge) {
      this.el.themeBadge.textContent =
        THEME_LABELS[getLang()]?.[pickedTheme] || TOWN_THEMES[pickedTheme]?.label || "";
      this.el.themeBadge.classList.remove("is-theme-pop");
      void this.el.themeBadge.offsetWidth;
      this.el.themeBadge.classList.add("is-theme-pop");
    }
    this.el.minimap?.classList.toggle("is-zoomed", this.engine.minimapZoom > 1);
    this.el.statBuildings.textContent = String(themedWorld.buildings.length);
    this.el.statFiles.textContent = String(themedWorld.stats.files);
    this.updateVillagerStat(0, themedWorld.villagers.length);
    this.updateSlimeStat(0, themedWorld.slimes.length);
    this.refreshCodexBadge();

    if (themedWorld.kind === "github" && themedWorld.title.includes("/")) {
      this.el.repoInput.value = themedWorld.title;
    }
  }

  maybeShowOnboarding() {
    try {
      if (localStorage.getItem(TOUR_DONE_KEY) === "1") return;
    } catch {
      return;
    }
    this.startGuidedTour(false);
  }

  positionTourCard() {
    if (!this.el.tourCard || this.el.tourCard.hidden) return;
    this.el.tourCard.classList.toggle("is-interior-dock", this.engine.activeMap?.kind === "interior");
    const topbar = document.querySelector(".hud-topbar");
    if (topbar) {
      this.el.tourCard.style.top = `${Math.max(68, Math.ceil(topbar.getBoundingClientRect().bottom) + 10)}px`;
    }
  }

  startGuidedTour(manualRestart = false) {
    this.closeDialog();
    this.tourState = {
      active: true,
      step: 0,
      graduated: false,
    };
    if (this.el.tourCard) this.el.tourCard.hidden = false;
    this.positionTourCard();
    requestAnimationFrame(() => this.positionTourCard());
    this.renderTourStep();
    this.engine.canvas?.focus({ preventScroll: true });
    if (manualRestart) {
      this.showToast(
        getLang() === "en"
          ? "Interactive RPG Tour restarted — follow each step live!"
          : "已开启互动新手向导，跟着卡片一步步操作即可！"
      );
    }
  }

  renderTourStep() {
    if (!this.el.tourCard || !this.tourState.active) return;
    this.positionTourCard();
    const isEn = getLang() === "en";
    const steps = getTourSteps();
    const stepIdx = this.tourState.step;
    this.el.minimapPanel?.classList.toggle("is-tour-highlight", stepIdx === 3);

    if (stepIdx >= steps.length) {
      if (!this.tourState.graduated) {
        this.tourState.graduated = true;
        this.addCoins(1);
        retroAudio.victory();
      }
      this.el.tourStepBadge.textContent = isEn ? "Tour Complete ✓" : "向导通关 ✓";
      this.el.tourProgressFill.style.width = "100%";
      this.el.tourTitle.textContent = isEn ? "🎉 RPG Tour Complete!" : "🎉 新手冒险毕业！";
      this.el.tourDesc.textContent = isEn
        ? "You mastered RepoTown! Bonus +1 Wishing Coin awarded. Paste any GitHub repo or drop a .md file anytime."
        : "你已掌握 RepoTown 全部核心玩法！额外赠送 +1 枚毕业许愿金币，顶部随时可输入任意 GitHub 仓库或拖入 .md 生成随机风貌小镇。";
      this.el.tourAssist.hidden = true;
      this.el.tourSkip.textContent = isEn ? "Explore Freely" : "开始自由探索";
      this.el.tourSkip.className = "btn btn-sm btn-primary";
      return;
    }

    const cfg = steps[stepIdx];
    if (cfg.id === "fountain" && this.coins <= 0) {
      this.addCoins(1);
      this.showToast(isEn ? "Tour Gift: +1 starter Wishing Coin!" : "新手礼包：已为你发放 1 枚试用许愿金币！");
    }

    this.el.tourStepBadge.textContent = isEn ? `Guide ${stepIdx + 1}/${steps.length}` : `新手向导 ${stepIdx + 1}/${steps.length}`;
    this.el.tourProgressFill.style.width = `${Math.round(((stepIdx + 1) / steps.length) * 100)}%`;
    this.el.tourTitle.textContent = cfg.title;

    if (cfg.id === "interior" && this.engine.activeMap?.kind === "interior") {
      this.el.tourDesc.textContent = isEn
        ? "You are indoors! Approach a glowing chest or bookshelf and press E / click to graduate!"
        : "已进屋！走近发光书架或宝箱按 E / 点击翻阅即可毕业！";
    } else {
      this.el.tourDesc.textContent = cfg.desc;
    }

    this.el.tourAssist.textContent = cfg.assistLabel;
    this.el.tourAssist.hidden = false;
    this.el.tourSkip.textContent = isEn ? "Skip Step" : "跳过此步";
    this.el.tourSkip.className = "btn btn-sm btn-secondary";
  }

  runTourAssist() {
    if (!this.tourState.active) return;
    const isEn = getLang() === "en";
    const stepCfg = getTourSteps()[this.tourState.step];
    if (!stepCfg) return;

    if (stepCfg.id === "move") {
      const sp = this.engine.overworld?.spawn || { x: 28, y: 21 };
      if (this.engine.activeMap?.kind === "interior") {
        this.engine.startWalkPath(this.engine.player.x + 2, this.engine.player.y - 2, null);
      } else {
        this.engine.startWalkPath(sp.x + 2.5, sp.y + 1, null);
      }
      this.showToast(isEn ? "Walking via A* pathfinding..." : "角色正在沿 A* 路径自动行走...");
    } else if (stepCfg.id === "fountain") {
      this.closeDialog();
      this.engine.teleportToFountain();
      this.showToast(isEn ? "Warped to Wishing Fountain! Press E to roll." : "已传送至「许愿喷泉」，现在按 E 或点击喷泉即可测运势！");
    } else if (stepCfg.id === "slime") {
      this.closeDialog();
      const slimes = this.engine.overworld?.slimes || [];
      let targetSlime = slimes.find((s) => !this.engine.defeatedSlimes.has(s.id));
      if (!targetSlime && slimes.length > 0) {
        targetSlime = slimes[0];
        this.engine.defeatedSlimes.delete(targetSlime.id);
        this.engine.onExplorationChange?.();
      }
      if (targetSlime) {
        this.engine.teleportToSlime(targetSlime);
        this.showToast(isEn ? "Beside a Slime! Press E and pick '⚔ Casual Raid'." : "已传送到史莱姆旁，按 E 点「⚔ 普通讨伐」赚金币！");
      } else {
        this.showToast(isEn ? "No active Slimes here — try switching town presets!" : "当前小镇没有待办史莱姆，可点顶部其他预设小镇试试！");
      }
    } else if (stepCfg.id === "minimap") {
      const z = this.engine.setMinimapZoom(1.6);
      if (this.el.btnMapZoomReset) this.el.btnMapZoomReset.textContent = `${z}×`;
      this.el.minimap?.classList.add("is-zoomed");
      if (this.el.minimapSub) this.el.minimapSub.textContent = t("map.dragClick");
      this.showToast(isEn ? "Zoomed 1.6×! Drag to pan or click a building/NPC dot." : "已放大至 1.6×！按住小地图可拖动，点击建筑或村民可瞬移");
    } else if (stepCfg.id === "interior") {
      this.closeDialog();
      if (this.engine.activeMap?.kind === "interior") {
        const items = this.engine.interior?.items || [];
        const targetItem = items.find((it) => !this.engine.visitedItems.has(it.id)) || items[0];
        if (targetItem) {
          this.engine.startWalkPath(targetItem.x, targetItem.y + 1, {
            kind: "item",
            data: targetItem,
            tx: targetItem.x,
            ty: targetItem.y,
            walkX: targetItem.x,
            walkY: targetItem.y + 1,
          });
          this.showToast(isEn ? `Heading to "${targetItem.name}"...` : `正前往「${targetItem.name}」旁...`);
        }
      } else {
        const buildings = this.engine.overworld?.buildings || [];
        const b = buildings.find((x) => !this.engine.visitedBuildings.has(x.id)) || buildings[0];
        if (b) {
          this.engine.teleportToBuilding(b);
          this.showToast(isEn ? `Warped to "${localizeLabel(b.name)}"! Press E to enter.` : `已传送至「${b.name}」门口，按 E 推门进屋！`);
        }
      }
    }
    this.engine.canvas?.focus({ preventScroll: true });
  }

  advanceGuidedTour() {
    if (!this.tourState.active) return;
    const steps = getTourSteps();
    if (this.el.tourCard) {
      this.el.tourCard.classList.add("is-step-done");
      setTimeout(() => this.el.tourCard?.classList.remove("is-step-done"), 420);
    }
    retroAudio.blip();
    this.tourState.step = Math.min(steps.length, this.tourState.step + 1);
    this.renderTourStep();
  }

  notifyTourEvent(eventName) {
    if (!this.tourState.active) return;
    const stepCfg = getTourSteps()[this.tourState.step];
    if (!stepCfg) return;
    if (stepCfg.id === "interior" && eventName === "enter_building") {
      if (this.el.tourDesc) {
        this.el.tourDesc.textContent = getLang() === "en"
          ? "You are indoors! Approach a glowing chest or bookshelf and press E / click to graduate!"
          : "已进屋！走近发光书架或宝箱按 E / 点击翻阅即可毕业！";
      }
      this.positionTourCard();
      return;
    }
    if (stepCfg.completeEvent === eventName) {
      this.advanceGuidedTour();
    }
  }

  finishGuidedTour(persistDone = true) {
    this.tourState.active = false;
    this.el.minimapPanel?.classList.remove("is-tour-highlight");
    if (this.el.tourCard) this.el.tourCard.hidden = true;
    if (persistDone) {
      try {
        localStorage.setItem(TOUR_DONE_KEY, "1");
      } catch {}
    }
    this.engine.canvas?.focus({ preventScroll: true });
  }

  refreshCodexBadge() {
    if (!this.el.codexCount) return;
    const total =
      this.bookmarks.size +
      this.engine.visitedBuildings.size +
      this.engine.talkedVillagers.size +
      this.engine.defeatedSlimes.size;
    this.el.codexCount.textContent = String(total);
  }

  openCodex() {
    this.closeDialog();
    const isEn = getLang() === "en";
    const bTotal = this.engine.overworld?.buildings?.length || 0;
    const vTotal = this.engine.overworld?.villagers?.length || 0;
    const sTotal = this.engine.overworld?.slimes?.length || 0;
    const bDone = this.engine.visitedBuildings.size;
    const vDone = this.engine.talkedVillagers.size;
    const sDone = this.engine.defeatedSlimes.size;

    const pct = (done, total) => (total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0);

    const bookmarkList = [...this.bookmarks.values()];
    const bookmarksHtml = bookmarkList.length > 0
      ? bookmarkList.map((entry) => `
          <div class="codex-bookmark-item">
            <div class="codex-bookmark-meta">
              <div class="codex-bookmark-name">${escapeHtml(entry.item.name)}</div>
              <div class="codex-bookmark-path">${escapeHtml(entry.buildingName)} · ${escapeHtml(entry.item.fullPath || (isEn ? "Doc Section" : "文档章节"))}</div>
            </div>
            <button class="btn btn-sm btn-accent" type="button" data-codex-jump="${escapeHtml(entry.buildingId)}">${isEn ? "Warp to Building" : "前往所在建筑"}</button>
          </div>
        `).join("")
      : `<p class="modal-sub">${isEn ? "No bookmarked scrolls or chests yet. Inspect a file indoors and click 'Add to Codex'!" : "还没有收藏任何藏书或宝箱。走进屋子查看文件时点击「收入图鉴」即可收藏！"}</p>`;

    this.el.codexBody.innerHTML = `
      <div class="codex-stats-grid">
        <div class="codex-stat-card">
          <div class="codex-stat-label">${isEn ? "Buildings Explored" : "建筑探索"}</div>
          <div class="codex-stat-val">${bDone} / ${bTotal}</div>
          <div class="codex-progress-track"><div class="codex-progress-fill" style="width:${pct(bDone, bTotal)}%"></div></div>
        </div>
        <div class="codex-stat-card">
          <div class="codex-stat-label">${isEn ? "Villagers Met" : "村民结识"}</div>
          <div class="codex-stat-val">${vDone} / ${vTotal}</div>
          <div class="codex-progress-track"><div class="codex-progress-fill" style="width:${pct(vDone, vTotal)}%"></div></div>
        </div>
        <div class="codex-stat-card">
          <div class="codex-stat-label">${isEn ? "Slimes Raided" : "待办史莱姆讨伐"}</div>
          <div class="codex-stat-val">${sDone} / ${sTotal}</div>
          <div class="codex-progress-track"><div class="codex-progress-fill" style="width:${pct(sDone, sTotal)}%"></div></div>
        </div>
      </div>
      <h3 class="codex-section-title">${isEn ? `Bookmarked Scrolls & Chests (${bookmarkList.length})` : `已收藏的藏书与宝箱 (${bookmarkList.length})`}</h3>
      <div class="codex-bookmark-list">${bookmarksHtml}</div>
    `;

    this.el.codexBody.querySelectorAll("[data-codex-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bId = btn.dataset.codexJump;
        const b = this.engine.overworld?.buildings?.find((x) => x.id === bId);
        this.closeModal(this.el.codexModal);
        if (b) {
          this.engine.teleportToBuilding(b);
          this.showToast(isEn ? `Warped to "${localizeLabel(b.name)}"` : `已传送至「${b.name}」门口`);
        }
      });
    });

    this.el.codexModal.hidden = false;
    this.engine.setDialogOpen(true);
  }

  updateVillagerStat(talked, total) {
    if (this.el.statVillagers) {
      this.el.statVillagers.textContent = `${talked}/${total}`;
    }
  }

  updateSlimeStat(defeated, total) {
    if (this.el.statSlimes) {
      this.el.statSlimes.textContent = `${defeated}/${total}`;
    }
  }

  async loadGitHubRepo(input) {
    this.el.btnGenerate.disabled = true;
    this.el.btnGenerate.textContent = "构建中...";
    this.showToast(`正在抓取 ${input} 仓库结构...`);
    try {
      const world = await fetchGitHubRepoWorld(input);
      this.markActivePreset(null);
      this.loadWorld(world);
      const url = new URL(window.location.href);
      url.searchParams.set("repo", world.title);
      window.history.replaceState({}, "", url.toString());
      this.showToast(`「${world.title}」小镇已竣工，快按 WASD 逛一逛！`);
    } catch (err) {
      if (err.code === "RATE_LIMIT") {
        this.pendingRetryInput = input;
        this.el.tokenModal.hidden = false;
        this.engine.setDialogOpen(true);
      } else {
        this.showToast(err.message || "生成失败，请检查仓库名称", true);
      }
    } finally {
      this.el.btnGenerate.disabled = false;
      this.el.btnGenerate.textContent = "生成小镇";
    }
  }

  async handleInteract(target) {
    if (!target) {
      this.closeDialog();
      return;
    }
    const atlas = getSpriteAtlas(this.engine.themeKey);
    let speaker = "";
    let meta = "";
    let role = "NPC";
    let extUrl = "";
    let portraitSprite = atlas.mayor.down[0];
    let bodyHtml = "";

    if (target.kind === "fountain") {
      this.openFortuneDialog(1);
      return;
    }
    if (target.kind === "windmill") {
      const clicks = target.clicks || 1;
      const isEn = getLang() === "en";
      if (clicks === 1) {
        this.showToast(isEn ? "Windmill spins faster! Maybe push the blades again..." : "东郊风车开始加速旋转！似乎再多推几次会触发什么...");
        return;
      }
      if (clicks === 2) {
        this.showToast(isEn ? "Stronger gale! Give the windmill sails one more push!" : "风势越来越大！再推一次风车叶片看看！");
        return;
      }
      this.openWindmillEasterEgg();
      return;
    }
    if (target.kind === "sign" || target.kind === "npc") {
      const d = target.data;
      const isEn = getLang() === "en";
      speaker = isEn && d.title === "镇长" ? "Mayor" : d.title;
      meta = d.subtitle || "";
      role = isEn ? (target.kind === "sign" ? "Sign" : "Guide") : (d.role || "向导");
      extUrl = d.url || "";
      portraitSprite = target.kind === "sign" ? atlas.scenery.sign : atlas.mayor.down[0];
      bodyHtml = `
        <p>${escapeHtml(d.body).replace(/\n/g, "<br/>")}</p>
        <div class="dialog-footer-actions">
          <button id="btn-act-copy" class="btn btn-sm btn-secondary" type="button">${isEn ? "Copy Intro" : "复制简介"}</button>
        </div>
      `;
      this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml });
      document.getElementById("btn-act-copy")?.addEventListener("click", () => this.copyText(d.body, isEn ? "Copied intro" : "已复制简介内容"));
      return;
    } else if (target.kind === "villager") {
      const v = target.data;
      const isEn = getLang() === "en";
      speaker = v.name;
      meta = `${v.date || "Commit"} ${v.sha ? `· #${v.sha}` : ""}`;
      role = "Commit";
      extUrl = v.url || "";
      portraitSprite = atlas.villagers[v.palette % atlas.villagers.length].down[0];
      bodyHtml = `
        <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "Recent Commit" : "最新提交动态"}</span></div>
        <p>${isEn ? `"${escapeHtml(v.message)}"` : `「${escapeHtml(v.message)}」`}</p>
        <div class="dialog-footer-actions">
          <button id="btn-act-praise" class="btn btn-sm btn-accent" type="button">${isEn ? "♥ Send Kudos" : "♥ 点赞致敬"}</button>
          <button id="btn-act-copy" class="btn btn-sm btn-secondary" type="button">${isEn ? "Copy Commit" : "复制提交信息"}</button>
        </div>
      `;
      this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml });
      document.getElementById("btn-act-praise")?.addEventListener("click", () => {
        this.engine.praiseVillager(v);
        this.showToast(isEn ? `Sent kudos to "${v.name}"!` : `已向「${v.name}」送出点赞致敬！`);
      });
      document.getElementById("btn-act-copy")?.addEventListener("click", () => this.copyText(`${v.name}: ${v.message}`, isEn ? "Copied commit message" : "已复制提交信息"));
      return;
    } else if (target.kind === "slime") {
      const s = target.data;
      const isEn = getLang() === "en";
      const isDefeated = this.engine.defeatedSlimes.has(s.id);
      speaker = s.title;
      meta = s.url ? (isEn ? "GitHub Issue TODO" : "GitHub Issue 待办") : (isEn ? "Local Markdown TODO" : "Markdown 本地待办");
      role = isDefeated ? (isEn ? "Raided" : "已讨伐") : "Issue";
      extUrl = s.url || "";
      portraitSprite = (atlas.slimes[s.severity] || atlas.slimes.green)[0];
      if (isDefeated) {
        bodyHtml = `
          <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "Status: Raided ✓" : "状态：已讨伐 ✓"}</span></div>
          <p>${escapeHtml(s.body).replace(/\n/g, "<br/>")}</p>
          <div class="dialog-footer-actions">
            <button id="btn-act-reset-slime" class="btn btn-sm btn-secondary" type="button">${isEn ? "↺ Respawn TODO" : "↺ 重新激活待办"}</button>
            <button id="btn-act-copy" class="btn btn-sm btn-secondary" type="button">${isEn ? "Copy TODO" : "复制待办内容"}</button>
          </div>
        `;
        this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml });
        document.getElementById("btn-act-reset-slime")?.addEventListener("click", () => {
          this.engine.defeatSlime(s);
          this.refreshCodexBadge();
          this.closeDialog();
          this.showToast(isEn ? "Respawned Slime TODO" : "已重新激活该待办史莱姆");
        });
        document.getElementById("btn-act-copy")?.addEventListener("click", () => this.copyText(`${s.title}\n${s.body}`, isEn ? "Copied TODO details" : "已复制待办内容"));
        return;
      }

      const rewardKey = `${this.currentWorld?.id || this.currentWorld?.title}:${s.id}`;
      const rewardTag = this.rewardedSlimes.has(rewardKey)
        ? (isEn ? "Coin Claimed" : "金币已领取")
        : (isEn ? "Reward: +1 Coin" : "奖励：许愿金币 +1");

      if (s.url) {
        bodyHtml = `
          <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "Status: Open" : "状态：待完成"}</span><span class="rpg-tag">${rewardTag}</span><span class="rpg-tag">${isEn ? "Casual: Visit & Return / Dev: Close Issue" : "普通讨伐：看过返回即可 / 开发者讨伐：需关闭 Issue"}</span></div>
          <p>${escapeHtml(s.body).replace(/\n/g, "<br/>")}</p>
          <div class="dialog-footer-actions">
            <button id="btn-act-battle-normal" class="btn btn-sm btn-primary" type="button" title="${isEn ? "Open and return to claim victory" : "跳转查看后返回即讨伐成功"}">${isEn ? "⚔ Casual Raid" : "⚔ 普通讨伐"}</button>
            <button id="btn-act-battle-dev" class="btn btn-sm btn-accent" type="button" title="${isEn ? "Requires closing the GitHub Issue" : "需实际关闭 GitHub Issue 后才算讨伐成功"}">${isEn ? "Dev Raid" : "开发者讨伐"}</button>
            <button id="btn-act-copy" class="btn btn-sm btn-secondary" type="button">${isEn ? "Copy TODO" : "复制待办内容"}</button>
          </div>
        `;
        this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml });
        document.getElementById("btn-act-battle-normal")?.addEventListener("click", () => {
          this.playBattleTransition(() => {
            this.pendingBattle = { slime: s, mode: "normal", leftTab: false, openedAt: Date.now() };
            const pop = window.open(s.url, "_blank", "noopener,noreferrer");
            if (pop) this.pendingBattle.leftTab = true;
            this.renderNormalBattleWaiting(s);
          });
        });
        document.getElementById("btn-act-battle-dev")?.addEventListener("click", () => {
          this.playBattleTransition(() => {
            this.pendingBattle = { slime: s, mode: "dev", leftTab: false, openedAt: Date.now() };
            window.open(s.url, "_blank", "noopener,noreferrer");
            this.renderSlimeBattleWaiting(
              s,
              isEn
                ? "Dev Raid active: Close this Issue on GitHub, then return here or click Verify below."
                : "已进入开发者讨伐模式：请在 GitHub 关闭该 Issue，返回本页或点击下方按钮验算状态。",
              false
            );
          });
        });
        document.getElementById("btn-act-copy")?.addEventListener("click", () => this.copyText(`${s.title}\n${s.body}`, isEn ? "Copied TODO details" : "已复制待办内容"));
        return;
      }

      // Local Markdown task slime (no GitHub URL)
      bodyHtml = `
        <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "Status: Open" : "状态：待完成"}</span><span class="rpg-tag">${rewardTag}</span><span class="rpg-tag">${isEn ? "Casual / Dev Raid" : "普通讨伐 / 开发者讨伐"}</span></div>
        <p>${escapeHtml(s.body).replace(/\n/g, "<br/>")}</p>
        <div class="dialog-footer-actions">
          <button id="btn-act-battle-normal" class="btn btn-sm btn-primary" type="button">${isEn ? "⚔ Casual Raid" : "⚔ 普通讨伐"}</button>
          <button id="btn-act-battle-dev" class="btn btn-sm btn-accent" type="button">${isEn ? "Dev Raid" : "开发者讨伐"}</button>
          <button id="btn-act-copy" class="btn btn-sm btn-secondary" type="button">${isEn ? "Copy TODO" : "复制待办内容"}</button>
        </div>
      `;
      this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml });
      document.getElementById("btn-act-battle-normal")?.addEventListener("click", () => {
        this.playBattleTransition(() => {
          this.completeNormalBattle(s);
        });
      });
      document.getElementById("btn-act-battle-dev")?.addEventListener("click", () => {
        this.playBattleTransition(() => {
          this.renderMarkdownBattleConfirm(s);
        });
      });
      document.getElementById("btn-act-copy")?.addEventListener("click", () => this.copyText(`${s.title}\n${s.body}`, isEn ? "Copied TODO details" : "已复制待办内容"));
      return;
    } else if (target.kind === "item") {
      const item = target.data;
      const isEn = getLang() === "en";
      speaker = item.name;
      meta = item.fullPath || (isEn ? "Doc Section" : "文档章节");
      role = item.type === "chest" ? (isEn ? "Chest" : "宝箱") : (isEn ? "Scroll" : "藏书");
      extUrl = item.htmlUrl || "";
      portraitSprite = item.type === "chest" ? atlas.scenery.chestOpen : atlas.scenery.bookshelf;

      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item });
      this.notifyTourEvent("item");
      if (!item.loaded && item.rawUrl) {
        const loadedContent = await lazyLoadItemContent(item);
        if (!this.el.dialogBox.hidden && this.el.dialogSpeaker.textContent === item.name) {
          item.content = loadedContent;
          this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item });
        }
      }
      return;
    }

    this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml });
  }

  playBattleTransition(onMidpoint) {
    retroAudio.battleStart();
    const curtain = this.el.battleCurtain;
    if (!curtain) {
      onMidpoint?.();
      return;
    }
    curtain.hidden = false;
    curtain.classList.remove("is-active");
    void curtain.offsetWidth;
    curtain.classList.add("is-active");
    setTimeout(() => {
      onMidpoint?.();
      setTimeout(() => {
        curtain.classList.remove("is-active");
        setTimeout(() => {
          curtain.hidden = true;
        }, 340);
      }, 240);
    }, 440);
  }

  finishSlimeVictory(s, label) {
    if (!s) return;
    const isEn = getLang() === "en";
    const resolvedLabel = label || (isEn ? "Victory" : "讨伐成功");
    this.pendingBattle = null;
    const rewardKey = `${this.currentWorld?.id || this.currentWorld?.title}:${s.id}`;
    const shouldAward = !this.rewardedSlimes.has(rewardKey);
    if (shouldAward) {
      this.rewardedSlimes.add(rewardKey);
      this.addCoins(1);
    }
    if (!this.engine.defeatedSlimes.has(s.id)) {
      this.engine.defeatSlime(s, shouldAward);
    }
    this.refreshCodexBadge();
    this.closeDialog();
    if (shouldAward) {
      this.showToast(
        isEn
          ? `${resolvedLabel}! "${s.title.slice(0, 16)}" +1 Wishing Coin (Total: ${this.coins})`
          : `${resolvedLabel}！「${s.title.slice(0, 16)}」获得 1 枚许愿金币（当前 ${this.coins} 枚）`
      );
    } else {
      this.showToast(
        isEn
          ? `${resolvedLabel}! "${s.title.slice(0, 16)}" (Coin already claimed)`
          : `${resolvedLabel}！「${s.title.slice(0, 16)}」（该待办金币已领取）`
      );
    }
    this.notifyTourEvent("slime");
  }

  completeNormalBattle(s) {
    this.finishSlimeVictory(s, getLang() === "en" ? "Casual Raid Won" : "普通讨伐成功");
  }

  renderNormalBattleWaiting(s) {
    const atlas = getSpriteAtlas(this.engine.themeKey);
    const isEn = getLang() === "en";
    const bodyHtml = `
      <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "⚔ Casual Raid" : "⚔ 普通讨伐"}</span><span class="rpg-tag">${isEn ? "Visit & Return to Claim" : "看过并返回即算完成"}</span></div>
      <p>${isEn ? "Opened the GitHub Issue tab — switch back here to claim victory automatically! If blocked by popup blocker, click below:" : "已前往 GitHub 查看该待办，切回本页即可自动完成讨伐！若浏览器拦截了弹窗，请点击下方按钮打开。"}</p>
      <div class="dialog-footer-actions">
        <a id="btn-normal-open" class="btn btn-sm btn-accent" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${isEn ? "Open GitHub Issue" : "打开 GitHub 页面"}</a>
        <button id="btn-normal-claim" class="btn btn-sm btn-primary" type="button">${isEn ? "I Checked It — Claim Victory" : "我已看过，立即凯旋"}</button>
      </div>
    `;
    this.openDialogUI({
      speaker: s.title,
      meta: isEn ? "Casual Raid · Explorer Check-in" : "普通讨伐 · 探索打卡",
      role: isEn ? "Casual" : "普通讨伐",
      extUrl: s.url,
      portraitSprite: (atlas.slimes[s.severity] || atlas.slimes.green)[0],
      bodyHtml,
    });
    document.getElementById("btn-normal-open")?.addEventListener("click", () => {
      if (this.pendingBattle) this.pendingBattle.leftTab = true;
    });
    document.getElementById("btn-normal-claim")?.addEventListener("click", () => {
      this.completeNormalBattle(s);
    });
  }

  renderSlimeBattleWaiting(s, stateNote, isChecking = false) {
    const atlas = getSpriteAtlas(this.engine.themeKey);
    const isEn = getLang() === "en";
    const bodyHtml = `
      <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "⚔ Dev Raid Active" : "⚔ 讨伐进行中"}</span><span class="rpg-tag">${isEn ? "Awaiting GitHub Close" : "等待 GitHub 结案"}</span></div>
      <p>${escapeHtml(stateNote)}</p>
      <div class="dialog-footer-actions">
        <a class="btn btn-sm btn-accent" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${isEn ? "Open GitHub Issue" : "打开 GitHub 待办页"}</a>
        <button id="btn-act-verify-issue" class="btn btn-sm btn-primary" type="button" ${isChecking ? "disabled" : ""}>${isChecking ? (isEn ? "Checking API..." : "正在检测状态...") : (isEn ? "↻ Verify Issue Closed" : "↻ 我已完成，验算战果")}</button>
      </div>
    `;
    this.openDialogUI({
      speaker: s.title,
      meta: isEn ? "GitHub Issue Verification" : "GitHub Issue 状态检验",
      role: isEn ? "Dev Raid" : "讨伐战",
      extUrl: s.url,
      portraitSprite: (atlas.slimes[s.severity] || atlas.slimes.green)[0],
      bodyHtml,
    });
    document.getElementById("btn-act-verify-issue")?.addEventListener("click", () => {
      this.verifyPendingBattleIssue(false);
    });
  }

  renderMarkdownBattleConfirm(s) {
    const atlas = getSpriteAtlas(this.engine.themeKey);
    const isEn = getLang() === "en";
    const bodyHtml = `
      <div class="dialog-badge-row"><span class="rpg-tag">${isEn ? "⚔ Local Markdown Dev Raid" : "⚔ 本地待办讨伐"}</span></div>
      <p>${escapeHtml(s.body).replace(/\n/g, "<br/>")}</p>
      <label class="battle-confirm-check" style="display:flex;align-items:center;gap:8px;margin:10px 0 6px;font-weight:700;cursor:pointer;">
        <input id="chk-md-done" type="checkbox" style="width:16px;height:16px;accent-color:#2d6a4f;" />
        <span>${isEn ? "I actually completed this TODO item" : "我已实际完成上述待办事项"}</span>
      </label>
      <div class="dialog-footer-actions">
        <button id="btn-md-confirm" class="btn btn-sm btn-primary" type="button" disabled>${isEn ? "⚔ Confirm & Raid" : "⚔ 确认完成并讨伐"}</button>
        <button id="btn-md-cancel" class="btn btn-sm btn-secondary" type="button">${isEn ? "Hold Off" : "暂缓退回"}</button>
      </div>
    `;
    this.openDialogUI({
      speaker: s.title,
      meta: isEn ? "Markdown TODO Completion Check" : "Markdown 待办完成确认",
      role: isEn ? "Dev Raid" : "讨伐战",
      extUrl: "",
      portraitSprite: (atlas.slimes[s.severity] || atlas.slimes.green)[0],
      bodyHtml,
    });
    const chk = document.getElementById("chk-md-done");
    const confirmBtn = document.getElementById("btn-md-confirm");
    chk?.addEventListener("change", () => {
      if (confirmBtn) confirmBtn.disabled = !chk.checked;
    });
    confirmBtn?.addEventListener("click", () => {
      this.finishSlimeVictory(s, isEn ? "Dev Raid Won" : "开发者讨伐成功");
    });
    document.getElementById("btn-md-cancel")?.addEventListener("click", () => this.closeDialog());
  }

  async verifyPendingBattleIssue(isAutoReturn = false) {
    const battle = this.pendingBattle;
    if (!battle?.slime?.url || battle.mode !== "dev" || battle.checking) return;
    battle.checking = true;
    const isEn = getLang() === "en";
    const s = battle.slime;
    this.renderSlimeBattleWaiting(s, isEn ? "Querying GitHub REST API for Issue status..." : "正在连接 GitHub API 检测该 Issue 是否已关闭...", true);
    const res = await checkGitHubIssueClosed(s.url);
    battle.checking = false;

    if (res.closed) {
      this.finishSlimeVictory(s, isEn ? "Dev Raid Won" : "开发者讨伐成功");
      return;
    }

    let note = isEn
      ? "GitHub Issue is still Open. Please close the Issue on GitHub first before claiming Dev Raid victory."
      : "检测到该 GitHub Issue 仍处于 Open 状态，须先在 GitHub 上完成并 Close issue，才算讨伐成功。";
    if (res.rateLimited) {
      note = isEn
        ? "GitHub API rate limit reached. Open the page manually or set a Token to re-check."
        : "GitHub API 触发匿名限流，请先点击下方打开确认或填写 Token 后再试。";
    } else if (!res.ok) {
      note = isEn
        ? `Verification failed (${res.error || "Network error"}). Click Verify to retry.`
        : `状态检测未成功 (${res.error || "网络异常"})，确认关闭 Issue 后请点「验算战果」重试。`;
    }
    this.renderSlimeBattleWaiting(s, note, false);
    if (!isAutoReturn) {
      this.showToast(
        res.ok
          ? (isEn ? "Issue is still Open — Dev Raid incomplete" : "Issue 尚未关闭，还不能算作讨伐成功")
          : (isEn ? "Check failed — please retry" : "检测失败，请重试"),
        true
      );
    }
  }

  openFortuneDialog(tossCount = 1) {
    const atlas = getSpriteAtlas(this.engine.themeKey);
    const lang = getLang();
    const isEn = lang === "en";
    const nextSlime = (this.engine.overworld?.slimes || []).find((s) => !this.engine.defeatedSlimes.has(s.id));

    if (this.coins <= 0) {
      retroAudio.blip();
      const huntBtn = nextSlime
        ? `<button id="btn-fortune-hunt-slime" class="btn btn-sm btn-primary" type="button">${isEn ? "⚔ Warp to Hunt Slime (+1 Coin)" : "⚔ 传送去讨伐史莱姆赚金币"}</button>`
        : `<span class="rpg-tag">${isEn ? "All Slimes raided here — switch towns to earn more!" : "当前小镇史莱姆已全部讨伐，可切换其他小镇继续讨伐赚金币"}</span>`;
      const bodyHtml = `
        <div class="fortune-card">
          <div class="fortune-top">
            <span class="fortune-tier is-terracotta">${isEn ? "Not Enough Wishing Coins" : "许愿金币不足"}</span>
            <span class="fortune-score">${isEn ? "Owned: 0 Coins" : "当前持有：0 枚许愿金币"}</span>
          </div>
          <p class="fortune-headline">${isEn
            ? "Each fortune toss costs <strong>1 Wishing Coin</strong>. Defeat any Outskirts Slime to earn <strong>+1 Coin</strong>!"
            : "向许愿喷泉投币测今日码运需要消耗 <strong>1 枚许愿金币</strong>。每讨伐 1 只郊外待办史莱姆即可稳定获得 <strong>1 枚金币</strong>！"}</p>
          <div class="fortune-actions">
            ${huntBtn}
          </div>
        </div>
      `;
      this.openDialogUI({
        speaker: isEn ? "Wishing Fountain" : "镇中心许愿喷泉",
        meta: `${this.currentWorld?.title || "RepoTown"} · ${isEn ? "No Coins" : "金币不足"}`,
        role: isEn ? "Fountain" : "许愿池",
        extUrl: "",
        portraitSprite: atlas.scenery.fountain[0],
        bodyHtml,
      });
      if (nextSlime) {
        document.getElementById("btn-fortune-hunt-slime")?.addEventListener("click", () => {
          this.closeDialog();
          this.engine.teleportToSlime(nextSlime);
          this.showToast(
            isEn
              ? `Warped near "${nextSlime.title.slice(0, 14)}" — raid for +1 Coin!`
              : `已传送至「${nextSlime.title.slice(0, 14)}」附近，讨伐可获 1 枚金币！`
          );
        });
      }
      return;
    }

    this.addCoins(-1);
    retroAudio.fortune();
    this.engine.spawnFountainBurst();
    const f = rollFortune(this.currentWorld, tossCount, lang);

    const luckyHtml = f.luckyBuilding
      ? `<button id="btn-fortune-lucky" class="btn btn-sm btn-primary" type="button">${isEn ? "Lucky House: " : "前往幸运建筑："}${escapeHtml(localizeLabel(f.luckyBuilding.name))}</button>`
      : "";

    const slimeNote = f.cautionSlime
      ? `<div class="fortune-extra">${isEn ? "Watch out for Slime: " : "今日留意史莱姆："}<code>${escapeHtml(f.cautionSlime.title)}</code></div>`
      : "";

    const rerollHtml = this.coins > 0
      ? `<button id="btn-fortune-reroll" class="btn btn-sm btn-accent" type="button">${isEn ? `Toss Again (${this.coins} left)` : `再投一枚金币 (剩 ${this.coins} 枚)`}</button>`
      : nextSlime
        ? `<button id="btn-fortune-hunt-slime" class="btn btn-sm btn-accent" type="button">${isEn ? "Out of Coins · Raid Slime (+1)" : "金币已用完 · 去讨伐史莱姆 (+1)"}</button>`
        : `<button class="btn btn-sm btn-secondary" type="button" disabled>${isEn ? "Out of Coins (Switch Town)" : "金币已用完（切小镇可继续讨伐）"}</button>`;

    const bodyHtml = `
      <div class="fortune-card">
        <div class="fortune-top">
          <span class="fortune-tier is-${escapeHtml(f.color)}">${escapeHtml(f.tier)} <span class="fortune-tier-code">[${escapeHtml(f.tierCode)}]</span></span>
          <span class="fortune-score">${isEn ? `Dev Luck: ${f.score} / 100 · ${this.coins} Coins left` : `今日码运指数：${f.score} / 100 · 剩余 ${this.coins} 枚金币`}</span>
        </div>
        <p class="fortune-headline">${escapeHtml(f.headline)}</p>
        <div class="fortune-yiji">
          <div class="fortune-yiji-box"><span class="fortune-yiji-label is-yi">${isEn ? "Do" : "宜"}</span>${escapeHtml(f.yi)}</div>
          <div class="fortune-yiji-box"><span class="fortune-yiji-label is-ji">${isEn ? "Skip" : "忌"}</span>${escapeHtml(f.ji)}</div>
        </div>
        ${slimeNote}
        <div class="fortune-actions">
          ${rerollHtml}
          ${luckyHtml}
        </div>
      </div>
    `;

    this.openDialogUI({
      speaker: isEn ? "Wishing Fountain" : "镇中心许愿喷泉",
      meta: `${this.currentWorld?.title || "RepoTown"} · ${isEn ? "Dev Fortune" : "今日运势占卜"}`,
      role: isEn ? "Fountain" : "许愿池",
      extUrl: "",
      portraitSprite: atlas.scenery.fountain[0],
      bodyHtml,
    });

    document.getElementById("btn-fortune-reroll")?.addEventListener("click", () => {
      this.openFortuneDialog(tossCount + 1);
    });

    if (nextSlime) {
      document.getElementById("btn-fortune-hunt-slime")?.addEventListener("click", () => {
        this.closeDialog();
        this.engine.teleportToSlime(nextSlime);
        this.showToast(
          isEn
            ? `Warped near "${nextSlime.title.slice(0, 14)}" — raid for +1 Coin!`
            : `已传送至「${nextSlime.title.slice(0, 14)}」附近，讨伐可获 1 枚金币！`
        );
      });
    }
    this.notifyTourEvent("fortune");

    if (f.luckyBuilding) {
      document.getElementById("btn-fortune-lucky")?.addEventListener("click", () => {
        this.closeDialog();
        this.engine.teleportToBuilding(f.luckyBuilding);
        this.showToast(isEn ? `Warped to lucky house "${localizeLabel(f.luckyBuilding.name)}"` : `已传送至幸运建筑「${f.luckyBuilding.name}」`);
      });
    }
  }

  renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab = "raw" }) {
    const isEn = getLang() === "en";
    const isBookmarked = this.bookmarks.has(item.id);
    const sum = summarizeItem(item);

    const summaryHtml = `
      <div class="summary-box">
        <div class="dialog-badge-row">
          <span class="rpg-tag">${isEn ? `${sum.lineCount} lines` : `共 ${sum.lineCount} 行`}</span>
          <span class="rpg-tag">${isEn ? `${sum.charCount} chars` : `${sum.charCount} 字符`}</span>
          ${item.language ? `<span class="rpg-tag">${escapeHtml(item.language)}</span>` : ""}
        </div>
        ${sum.headings.length ? `<div><strong>${isEn ? "Headings:" : "章节标题："}</strong><ul class="summary-list">${sum.headings.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul></div>` : ""}
        ${sum.symbols.length ? `<div><strong>${isEn ? "Exports / Symbols:" : "导出/关键定义："}</strong><ul class="summary-list">${sum.symbols.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}
        ${sum.imports.length ? `<div><strong>${isEn ? "Imports:" : "依赖引用："}</strong><ul class="summary-list">${sum.imports.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul></div>` : ""}
        ${!sum.headings.length && !sum.symbols.length && !sum.imports.length ? `<div>${isEn ? "Short snippet — switch back to Source / Raw to read it all." : "片段较短，可直接切回「原文 / 源码」阅读完整内容。"}</div>` : ""}
      </div>
    `;

    this.el.dialogBox?.style.setProperty("--reader-font-size", `${15.5 + this.readerFontDelta}px`);
    this.el.dialogBox?.style.setProperty("--reader-code-size", `${13.5 + this.readerFontDelta}px`);

    const fontToolsHtml = this.dialogExpanded
      ? `<div class="reader-font-tools"><button id="btn-reader-smaller" class="btn btn-sm btn-secondary reader-font-btn" type="button" title="${isEn ? "Smaller Font" : "缩小阅读字号"}">A−</button><button id="btn-reader-larger" class="btn btn-sm btn-secondary reader-font-btn" type="button" title="${isEn ? "Larger Font" : "放大阅读字号"}">A+</button></div>`
      : "";

    const bodyHtml = `
      <div class="dialog-tabs-row">
        <div class="dialog-tabs" role="tablist">
          <button id="tab-item-raw" class="dialog-tab ${activeTab === "raw" ? "is-active" : ""}" type="button">${isEn ? "Source / Raw" : "原文 / 源码"}</button>
          <button id="tab-item-summary" class="dialog-tab ${activeTab === "summary" ? "is-active" : ""}" type="button">${isEn ? "Structure Summary" : "结构摘要"}</button>
        </div>
        ${fontToolsHtml}
      </div>
      <div class="dialog-body-content">${activeTab === "summary" ? summaryHtml : this.formatItemBody(item, this.dialogExpanded)}</div>
      <div class="dialog-footer-actions">
        <button id="btn-act-copy" class="btn btn-sm btn-secondary" type="button">${isEn ? "Copy" : "复制内容"}</button>
        <button id="btn-act-bookmark" class="btn btn-sm ${isBookmarked ? "btn-accent" : "btn-primary"}" type="button">${isBookmarked ? (isEn ? "★ In Codex" : "★ 已入图鉴") : (isEn ? "☆ Add to Codex" : "☆ 收入图鉴")}</button>
        <button id="btn-act-expand" class="btn btn-sm btn-secondary" type="button">${this.dialogExpanded ? (isEn ? "Collapse Scroll" : "收起羊皮卷") : (isEn ? "Unfurl Scroll" : "展开羊皮卷阅读")}</button>
      </div>
    `;

    this.openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml, keepExpanded: this.dialogExpanded });

    document.getElementById("tab-item-raw")?.addEventListener("click", () => {
      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab: "raw" });
    });
    document.getElementById("tab-item-summary")?.addEventListener("click", () => {
      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab: "summary" });
    });
    document.getElementById("btn-reader-smaller")?.addEventListener("click", () => {
      this.readerFontDelta = Math.max(-2, this.readerFontDelta - 1);
      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab });
    });
    document.getElementById("btn-reader-larger")?.addEventListener("click", () => {
      this.readerFontDelta = Math.min(4, this.readerFontDelta + 1);
      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab });
    });
    document.getElementById("btn-act-copy")?.addEventListener("click", () => {
      this.copyText(item.content || "", isEn ? `Copied "${item.name}"` : `已复制「${item.name}」内容`);
    });
    document.getElementById("btn-act-bookmark")?.addEventListener("click", () => {
      if (this.bookmarks.has(item.id)) {
        this.bookmarks.delete(item.id);
        this.showToast(isEn ? `Removed "${item.name}" from Codex` : `已从图鉴移除「${item.name}」`);
      } else {
        const b = this.engine.interior?.building;
        this.bookmarks.set(item.id, {
          item,
          buildingId: b?.id || "",
          buildingName: b?.name || (isEn ? "Town Scroll" : "小镇藏书"),
        });
        retroAudio.chest();
        this.engine.spawnInteractBurst(item.x, item.y, "#ffd966", isEn ? "★ Bookmarked" : "★ 已收入图鉴");
        this.showToast(isEn ? `Saved "${item.name}" to Codex` : `已将「${item.name}」收入冒险图鉴`);
      }
      this.refreshCodexBadge();
      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab });
    });
    document.getElementById("btn-act-expand")?.addEventListener("click", () => {
      retroAudio.scrollUnfurl();
      this.dialogExpanded = !this.dialogExpanded;
      this.el.dialogBox.classList.toggle("is-expanded", this.dialogExpanded);
      if (this.el.readerBackdrop) {
        if (this.dialogExpanded) {
          this.el.readerBackdrop.hidden = false;
          requestAnimationFrame(() => this.el.readerBackdrop?.classList.add("is-open"));
        } else {
          this.el.readerBackdrop.classList.remove("is-open");
          setTimeout(() => {
            if (!this.dialogExpanded && this.el.readerBackdrop) this.el.readerBackdrop.hidden = true;
          }, 210);
        }
      }
      this.renderItemInspector({ speaker, meta, role, extUrl, portraitSprite, item, activeTab });
    });
  }

  openWindmillEasterEgg(quoteIdx = -1) {
    const atlas = getSpriteAtlas(this.engine.themeKey);
    const lang = getLang();
    const isEn = lang === "en";
    const townKey = this.currentWorld?.id || this.currentWorld?.title || "repotown";
    const bCount = this.currentWorld?.buildings?.length || 0;
    const fCount = this.currentWorld?.stats?.files || 0;
    const firstUnlock = !this.windmillRewardedTowns.has(townKey);
    if (firstUnlock) {
      this.windmillRewardedTowns.add(townKey);
      this.addCoins(2);
      retroAudio.chest();
      this.showToast(
        isEn ? "Windmill Secret Unlocked! Bonus +2 Wishing Coins!" : "触发风车守望者彩蛋！额外获赠 +2 枚许愿金币！"
      );
    }

    const rawQuotes = WINDMILL_QUOTES_I18N[lang] || WINDMILL_QUOTES_I18N.zh;
    const quotes = rawQuotes.map((q) =>
      q
        .replace(/\{town\}/g, this.currentWorld?.title || "RepoTown")
        .replace(/\{buildings\}/g, String(bCount))
        .replace(/\{files\}/g, String(fCount))
    );
    const pickedIdx = quoteIdx >= 0 ? quoteIdx % quotes.length : Math.floor(Math.random() * quotes.length);

    const bodyHtml = `
      <div class="fortune-card">
        <div class="fortune-top">
          <span class="fortune-tier is-emerald">${isEn ? "Secret Egg · Windkeeper" : "隐藏彩蛋 · 东郊守风人"}</span>
          <span class="fortune-score">${firstUnlock ? (isEn ? "First Unlock: +2 Coins ✓" : "首次解锁奖励：+2 枚许愿金币 ✓") : (isEn ? `Gale Active · ${this.coins} Coins` : `风车狂风中 · 当前 ${this.coins} 枚金币`)}</span>
        </div>
        <p class="fortune-headline">${escapeHtml(quotes[pickedIdx])}</p>
        <div class="fortune-actions">
          <button id="btn-windmill-gust" class="btn btn-sm btn-accent" type="button">${isEn ? "🌪 Summon Another Gale" : "🌪 再来一阵狂风"}</button>
          <button id="btn-windmill-fountain" class="btn btn-sm btn-primary" type="button">${isEn ? "Go to Fountain" : "前往许愿喷泉"}</button>
        </div>
      </div>
    `;

    this.openDialogUI({
      speaker: isEn ? "Eastern Windmill · Windkeeper" : "东郊风车 · 守风精灵",
      meta: `${this.currentWorld?.title || "RepoTown"} · ${isEn ? "Secret Easter Egg" : "秘密彩蛋"}`,
      role: isEn ? "Secret" : "彩蛋",
      extUrl: "",
      portraitSprite: atlas.scenery.windmill[0],
      bodyHtml,
    });

    document.getElementById("btn-windmill-gust")?.addEventListener("click", () => {
      this.engine.boostWindmill(6.0);
      this.openWindmillEasterEgg((pickedIdx + 1) % quotes.length);
    });
    document.getElementById("btn-windmill-fountain")?.addEventListener("click", () => {
      this.closeDialog();
      this.engine.teleportToFountain();
      this.showToast(isEn ? "Warped to Fountain — spend your coins!" : "已传送至「许愿喷泉」，用金币试试今日运势吧！");
    });
  }

  formatItemBody(item, expanded = false) {
    const badge = item.language ? `<div class="dialog-badge-row"><span class="rpg-tag">${escapeHtml(item.language)}</span>${item.lines ? `<span class="rpg-tag">${item.lines} lines</span>` : ""}</div>` : "";
    const isProse = item.language === "markdown" || item.type === "section" || item.type === "npc";
    if (expanded) {
      if (isProse) {
        return `${badge}${renderScrollProse(item.content || "")}`;
      }
      const lines = String(item.content || "").split("\n");
      const rows = lines
        .map((line, i) => `<div class="code-line"><span class="code-ln">${i + 1}</span><span class="code-txt">${highlightCodeLine(line)}</span></div>`)
        .join("");
      return `${badge}<div class="code-reader" role="region" aria-label="代码内容">${rows}</div>`;
    }
    if (isProse) {
      return `${badge}<p>${escapeHtml(item.content).replace(/\n/g, "<br/>")}</p>`;
    }
    return `${badge}<pre><code>${escapeHtml(item.content)}</code></pre>`;
  }

  openDialogUI({ speaker, meta, role, extUrl, portraitSprite, bodyHtml, keepExpanded = false }) {
    if (!keepExpanded) {
      this.dialogExpanded = false;
      this.el.dialogBox.classList.remove("is-expanded");
      if (this.el.readerBackdrop) {
        this.el.readerBackdrop.classList.remove("is-open");
        this.el.readerBackdrop.hidden = true;
      }
    } else if (this.el.readerBackdrop) {
      this.el.readerBackdrop.hidden = !this.dialogExpanded;
      if (this.dialogExpanded) this.el.readerBackdrop.classList.add("is-open");
    }
    this.el.dialogSpeaker.textContent = speaker;
    this.el.dialogMeta.textContent = meta;
    this.el.dialogRole.textContent = role;
    this.el.dialogBody.innerHTML = bodyHtml;

    if (extUrl) {
      this.el.dialogExtLink.href = extUrl;
      this.el.dialogExtLink.hidden = false;
    } else {
      this.el.dialogExtLink.hidden = true;
    }

    const pctx = this.el.dialogPortrait.getContext("2d");
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, 64, 64);
    if (portraitSprite) {
      const aspect = portraitSprite.height / portraitSprite.width;
      const drawW = 52;
      const drawH = Math.round(drawW * aspect);
      pctx.drawImage(portraitSprite, 6, Math.max(4, Math.round((64 - drawH) / 2)), drawW, Math.min(56, drawH));
    }

    this.el.dialogBox.hidden = false;
    this.engine.setDialogOpen(true);
  }

  closeDialog() {
    this.pendingBattle = null;
    this.dialogExpanded = false;
    this.el.dialogBox.classList.remove("is-expanded");
    if (this.el.readerBackdrop) {
      this.el.readerBackdrop.classList.remove("is-open");
      this.el.readerBackdrop.hidden = true;
    }
    this.el.dialogBox.hidden = true;
    this.engine.setDialogOpen(false);
  }

  closeModal(modalEl) {
    modalEl.hidden = true;
    this.engine.setDialogOpen(false);
  }

  openShareModal() {
    this.closeDialog();
    renderTownPostcard(this.el.postcardCanvas, this.currentWorld, this.engine.overworld);
    const shareUrl = new URL(window.location.href);
    if (this.currentWorld?.kind === "github" && this.currentWorld.title.includes("/")) {
      shareUrl.searchParams.set("repo", this.currentWorld.title);
    }
    const urlStr = shareUrl.toString();
    this.el.shareUrlInput.value = urlStr;
    this.el.shareBadgeInput.value = `[![Explore in RepoTown](https://img.shields.io/badge/RepoTown-Explore_as_2D_RPG-d99b38?style=flat-square)](${urlStr})`;
    this.el.shareModal.hidden = false;
    this.engine.setDialogOpen(true);
  }

  async copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text || "");
      this.showToast(successMsg);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text || "";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      this.showToast(successMsg);
    }
  }

  async copyInput(inputEl, successMsg) {
    try {
      await navigator.clipboard.writeText(inputEl.value);
      this.showToast(successMsg);
    } catch {
      inputEl.select();
      document.execCommand("copy");
      this.showToast(successMsg);
    }
  }

  showToast(message, isError = false) {
    clearTimeout(this.toastTimer);
    clearTimeout(this.toastHideTimer);
    const topbar = document.querySelector(".hud-topbar");
    if (topbar) {
      this.el.statusToast.style.top = `${Math.ceil(topbar.getBoundingClientRect().bottom) + 8}px`;
    }
    this.el.statusToast.textContent = message;
    this.el.statusToast.classList.toggle("is-error", isError);
    this.el.statusToast.hidden = false;
    requestAnimationFrame(() => {
      this.el.statusToast.classList.add("is-visible");
    });
    this.toastTimer = setTimeout(() => {
      this.el.statusToast.classList.remove("is-visible");
      this.toastHideTimer = setTimeout(() => {
        this.el.statusToast.hidden = true;
      }, 190);
    }, 3600);
  }
}
