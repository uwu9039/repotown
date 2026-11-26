import { getSpriteAtlas, TOWN_THEMES } from "./spriteAtlas.js";
import { retroAudio } from "./audio.js";
import { findPath } from "../world/pathfinder.js";
import { getLang, localizeLabel } from "../i18n/i18n.js";
import {
  TILE_SIZE,
  T_GRASS_0,
  T_GRASS_3,
  T_PATH,
  T_PLAZA,
  T_WATER,
  T_BRIDGE,
  T_WOOD,
  T_RUG,
  T_WALL,
  generateOverworld,
  generateInterior,
} from "../world/worldGenerator.js";

const SCALE = 3; // 16px tile -> 48px on screen

export class GameEngine {
  constructor({ canvas, minimapCanvas, curtainEl, onZoneChange, onInteract, onGuideChange, onVillagerTalked, onSitChange, onExplorationChange, onPlayerMove, onEnterBuilding }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext("2d");
    this.curtainEl = curtainEl;
    this.onZoneChange = onZoneChange;
    this.onInteract = onInteract;
    this.onGuideChange = onGuideChange;
    this.onVillagerTalked = onVillagerTalked;
    this.onSitChange = onSitChange;
    this.onExplorationChange = onExplorationChange;
    this.onPlayerMove = onPlayerMove;
    this.onEnterBuilding = onEnterBuilding;

    this.themeKey = "meadow";
    this.theme = TOWN_THEMES.meadow;
    this.atlas = getSpriteAtlas("meadow");
    this.worldModel = null;
    this.overworld = null;
    this.interior = null;
    this.activeMap = null;

    this.player = {
      x: 28,
      y: 21,
      dir: "down",
      walkCycle: 0,
      moving: false,
      savedOverworldPos: null,
      sitting: null,
    };

    this.camera = { x: 0, y: 0 };
    this.keys = new Set();
    this.touchDir = null;
    this.walkPath = [];
    this.pendingAction = null;
    this.pausedForDialog = false;
    this.transitioning = false;
    this.timeOfDay = "day"; // day | dusk | night
    this.elapsed = 0;
    this.lastTs = 0;
    this.smokeParticles = [];
    this.ambientParticles = [];
    this.fountainParticles = [];
    this.teleportEffects = [];
    this.interactParticles = [];
    this.floatingTexts = [];
    this.nearbyTarget = null;
    this.visitedBuildings = new Set();
    this.visitedItems = new Set();
    this.talkedVillagers = new Set();
    this.defeatedSlimes = new Set();
    this.guideManual = false;
    this.guideIndex = 0;
    this.edgeGuideRect = null;
    this.minimapZoom = 1;
    this.minimapView = { x: 0, y: 0, w: 56, h: 42 };
    this.minimapPan = { x: 0, y: 0 };
    this.minimapManualPan = false;
    this._moveAccum = 0;
    this.windmillBoost = 0;
    this.windmillPhase = 0;
    this.windmillClicks = 0;
    this.windGustParticles = [];

    this.bindInputs();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  setWorld(worldModel) {
    this.worldModel = worldModel;
    this.themeKey = TOWN_THEMES[worldModel.themeKey] ? worldModel.themeKey : "meadow";
    this.theme = TOWN_THEMES[this.themeKey];
    this.atlas = getSpriteAtlas(this.themeKey);
    this.overworld = generateOverworld(worldModel);
    this.interior = null;
    this.activeMap = this.overworld;
    this.player.x = this.overworld.spawn.x;
    this.player.y = this.overworld.spawn.y;
    this.player.dir = "down";
    this.player.savedOverworldPos = null;
    this.player.sitting = null;
    this.walkPath = [];
    this.pendingAction = null;
    this.fountainParticles = [];
    this.teleportEffects = [];
    this.interactParticles = [];
    this.floatingTexts = [];
    this.visitedBuildings.clear();
    this.visitedItems.clear();
    this.talkedVillagers.clear();
    this.defeatedSlimes.clear();
    this.guideManual = false;
    this.guideIndex = 0;
    this.edgeGuideRect = null;
    this.minimapManualPan = false;
    this.minimapPan = { x: 0, y: 0 };
    this._moveAccum = 0;
    this.windmillBoost = 0;
    this.windmillPhase = 0;
    this.windmillClicks = 0;
    this.windGustParticles = [];
    this.snapCamera();
    this.initAmbientParticles();
    this.syncMinimapResolution();
    this.onZoneChange?.(getLang() === "en" ? "Town Plaza" : "镇中心广场");
    this.onExplorationChange?.();
  }

  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    document.body.dataset.time = mode;
  }

  clearWalkPath() {
    this.walkPath = [];
    this.pendingAction = null;
  }

  startWalkPath(goalX, goalY, pendingAction = null) {
    if (!this.activeMap) return;
    const pts = findPath(this.activeMap, this.player.x, this.player.y, goalX, goalY);
    if (pts.length > 0) {
      this.walkPath = pts;
      this.pendingAction = pendingAction;
    } else {
      this.walkPath = [];
      this.pendingAction = null;
    }
  }

  setDialogOpen(isOpen) {
    this.pausedForDialog = isOpen;
    if (typeof document !== "undefined") {
      document.body.classList.toggle("is-dialog-open", isOpen);
    }
    if (isOpen) {
      this.keys.clear();
      this.touchDir = null;
      this.walkPath = [];
    } else {
      this.canvas?.focus({ preventScroll: true });
    }
  }

  returnToPlaza() {
    this.player.sitting = null;
    this.minimapManualPan = false;
    if (this.activeMap?.kind === "interior") {
      this.exitInterior(true);
      return;
    }
    if (!this.overworld) return;
    this.player.x = this.overworld.spawn.x;
    this.player.y = this.overworld.spawn.y;
    this.player.dir = "down";
    this.clearWalkPath();
    this.snapCamera();
    this.spawnTeleportEffect(this.player.x, this.player.y);
    retroAudio.teleport();
  }

  teleportToBuilding(building) {
    if (!building) return;
    this.player.sitting = null;
    this.minimapManualPan = false;
    const go = () => {
      this.interior = null;
      this.activeMap = this.overworld;
      this.player.x = building.doorX;
      this.player.y = building.stepY;
      this.player.dir = "up";
      this.clearWalkPath();
      this.snapCamera();
      this.spawnTeleportEffect(this.player.x, this.player.y);
      this.onZoneChange?.(getLang() === "en" ? `Door · ${building.name}` : `门前 · ${building.name}`);
    };
    if (this.activeMap?.kind === "interior") {
      this.withCurtain(go);
    } else {
      go();
      retroAudio.teleport();
    }
  }

  teleportToFountain() {
    if (!this.overworld) return;
    this.player.sitting = null;
    this.minimapManualPan = false;
    const f = this.overworld.fountain;
    const go = () => {
      this.interior = null;
      this.activeMap = this.overworld;
      this.player.x = f.x + 0.5;
      this.player.y = f.y + 2.1;
      this.player.dir = "up";
      this.clearWalkPath();
      this.snapCamera();
      this.spawnTeleportEffect(this.player.x, this.player.y);
      this.onZoneChange?.(getLang() === "en" ? "Wishing Fountain" : "许愿喷泉");
    };
    if (this.activeMap?.kind === "interior") {
      this.withCurtain(go);
    } else {
      go();
      retroAudio.teleport();
    }
  }

  teleportToSlime(slime) {
    if (!this.overworld || !slime) return;
    this.player.sitting = null;
    this.minimapManualPan = false;
    const spots = [
      [slime.x, slime.y + 1],
      [slime.x, slime.y - 1],
      [slime.x - 1, slime.y],
      [slime.x + 1, slime.y],
    ];
    let dest = [slime.x, slime.y + 1];
    for (const [sx, sy] of spots) {
      if (this.isWalkablePointInMap(this.overworld, sx, sy)) {
        dest = [sx, sy];
        break;
      }
    }
    const go = () => {
      this.interior = null;
      this.activeMap = this.overworld;
      this.player.x = dest[0];
      this.player.y = dest[1];
      this.player.dir = "down";
      this.clearWalkPath();
      this.snapCamera();
      this.spawnTeleportEffect(this.player.x, this.player.y);
      this.onZoneChange?.(getLang() === "en" ? `TODO · ${slime.title.slice(0, 12)}` : `郊外待办 · ${slime.title.slice(0, 12)}`);
    };
    if (this.activeMap?.kind === "interior") {
      this.withCurtain(go);
    } else {
      go();
      retroAudio.teleport();
    }
  }

  teleportToNpc(npc) {
    if (!this.overworld || !npc) return;
    this.player.sitting = null;
    this.minimapManualPan = false;
    const nx = Math.round(npc.x);
    const ny = Math.round(npc.y);
    const spots = [
      [nx, ny + 1, "up"],
      [nx - 1, ny, "right"],
      [nx + 1, ny, "left"],
      [nx, ny - 1, "down"],
    ];
    let dest = [nx, ny + 1, "up"];
    for (const spot of spots) {
      if (this.isWalkablePointInMap(this.overworld, spot[0], spot[1])) {
        dest = spot;
        break;
      }
    }
    const go = () => {
      this.interior = null;
      this.activeMap = this.overworld;
      this.player.x = dest[0];
      this.player.y = dest[1];
      this.player.dir = dest[2];
      this.clearWalkPath();
      this.snapCamera();
      this.spawnTeleportEffect(this.player.x, this.player.y);
      this.onZoneChange?.(getLang() === "en" ? `Near · ${npc.name}` : `身旁 · ${npc.name}`);
    };
    if (this.activeMap?.kind === "interior") {
      this.withCurtain(go);
    } else {
      go();
      retroAudio.teleport();
    }
  }

  teleportToWindmill() {
    const wm = this.overworld?.windmill;
    if (!this.overworld || !wm) return;
    this.player.sitting = null;
    this.minimapManualPan = false;
    const spots = [
      [wm.x + 0.5, wm.y + 2.2, "up"],
      [wm.x - 1, wm.y + 1, "right"],
      [wm.x + 2, wm.y + 1, "left"],
      [wm.x + 0.5, wm.y - 1.2, "down"],
    ];
    let dest = [wm.x + 0.5, wm.y + 2.2, "up"];
    for (const spot of spots) {
      if (this.isWalkablePointInMap(this.overworld, spot[0], spot[1])) {
        dest = spot;
        break;
      }
    }
    const go = () => {
      this.interior = null;
      this.activeMap = this.overworld;
      this.player.x = dest[0];
      this.player.y = dest[1];
      this.player.dir = dest[2];
      this.clearWalkPath();
      this.snapCamera();
      this.spawnTeleportEffect(this.player.x, this.player.y);
      this.onZoneChange?.(getLang() === "en" ? "Windmill Hill" : "东郊风车坡");
    };
    if (this.activeMap?.kind === "interior") {
      this.withCurtain(go);
    } else {
      go();
      retroAudio.teleport();
    }
  }

  boostWindmill(duration = 5.0) {
    const wm = this.overworld?.windmill;
    if (!wm) return;
    this.windmillBoost = Math.max(this.windmillBoost, duration);
    this.windmillClicks += 1;
    retroAudio.windmillWhoosh();
    const cx = (wm.x + 1) * TILE_SIZE;
    const cy = (wm.y + 0.5) * TILE_SIZE;
    for (let i = 0; i < 24; i++) {
      this.windGustParticles.push({
        x: cx - 30 + (Math.random() - 0.5) * 48,
        y: cy + (Math.random() - 0.5) * 56,
        vx: 70 + Math.random() * 65,
        vy: -10 - Math.random() * 18,
        len: 8 + Math.random() * 12,
        life: 0.75 + Math.random() * 0.65,
        color: i % 3 === 0 ? "#ffe066" : "#a8f0c6",
      });
    }
  }

  isWalkablePointInMap(mapObj, nx, ny) {
    if (!mapObj) return false;
    const tx = Math.floor(nx + 0.5);
    const ty = Math.floor(ny + 0.5);
    if (tx < 1 || ty < 1 || tx >= mapObj.width - 1 || ty >= mapObj.height - 1) return false;
    return mapObj.solid[ty * mapObj.width + tx] === 0;
  }

  spawnTeleportEffect(tx, ty) {
    const cx = (tx + 0.5) * TILE_SIZE;
    const cy = (ty + 0.85) * TILE_SIZE;
    const sparks = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2,
      radius: 4 + Math.random() * 14,
      vy: -18 - Math.random() * 26,
      yOff: 0,
      color: i % 2 === 0 ? "#ffe066" : "#88e0ff",
    }));
    this.teleportEffects.push({ x: cx, y: cy, life: 0.85, maxLife: 0.85, sparks });
  }

  spawnInteractBurst(tx, ty, color = "#ffe066", text = "") {
    const cx = (tx + 0.5) * TILE_SIZE;
    const cy = (ty + 0.4) * TILE_SIZE;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 20 + Math.random() * 28;
      this.interactParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 14,
        life: 0.65 + Math.random() * 0.25,
        color: i % 3 === 0 ? "#fff5cc" : color,
      });
    }
    if (text) {
      this.floatingTexts.push({ x: cx, y: cy - 6, text, color, life: 1.15, maxLife: 1.15 });
    }
  }

  defeatSlime(slime, awardCoin = true) {
    if (!slime) return;
    const isEn = getLang() === "en";
    if (this.defeatedSlimes.has(slime.id)) {
      this.defeatedSlimes.delete(slime.id);
      this.spawnInteractBurst(slime.x, slime.y, "#6ee787", isEn ? "Respawned" : "已重新激活");
    } else {
      this.defeatedSlimes.add(slime.id);
      this.spawnInteractBurst(
        slime.x,
        slime.y,
        "#ffd966",
        awardCoin ? (isEn ? "⚔ Victory · Coin +1" : "⚔ 讨伐成功 · 金币 +1") : (isEn ? "⚔ Victory" : "⚔ 讨伐成功")
      );
      retroAudio.victory();
    }
    this.onExplorationChange?.();
  }

  praiseVillager(villager) {
    if (!villager) return;
    retroAudio.kudos();
    this.spawnInteractBurst(villager.x, villager.y - 0.3, "#ff7aa2", getLang() === "en" ? "♥ Kudos +1" : "♥ 点赞致敬 +1");
  }

  setMinimapZoom(nextZoom) {
    this.minimapZoom = Math.max(1, Math.min(2.4, Number(nextZoom.toFixed(1))));
    if (this.minimapZoom <= 1) {
      this.minimapManualPan = false;
      this.minimapPan = { x: 0, y: 0 };
    }
    return this.minimapZoom;
  }

  panMinimapByTiles(dtx, dty) {
    if (!this.overworld || this.activeMap?.kind !== "overworld") return;
    const zoom = this.minimapZoom || 1;
    if (zoom <= 1) return;
    const viewW = this.overworld.width / zoom;
    const viewH = this.overworld.height / zoom;
    if (!this.minimapManualPan) {
      this.minimapManualPan = true;
      this.minimapPan = {
        x: this.minimapView ? this.minimapView.x : 0,
        y: this.minimapView ? this.minimapView.y : 0,
      };
    }
    this.minimapPan.x = Math.max(0, Math.min(this.overworld.width - viewW, this.minimapPan.x + dtx));
    this.minimapPan.y = Math.max(0, Math.min(this.overworld.height - viewH, this.minimapPan.y + dty));
  }

  syncMinimapResolution() {
    if (!this.minimapCanvas) return;
    const rect = this.minimapCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, Math.round(rect.width * dpr));
    const h = Math.max(150, Math.round(rect.height * dpr));
    if (this.minimapCanvas.width !== w || this.minimapCanvas.height !== h) {
      this.minimapCanvas.width = w;
      this.minimapCanvas.height = h;
    }
  }

  spawnFountainBurst() {
    if (!this.overworld) return;
    const f = this.overworld.fountain;
    const cx = (f.x + 1) * TILE_SIZE;
    const cy = (f.y + 0.7) * TILE_SIZE;
    for (let i = 0; i < 18; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const speed = 28 + Math.random() * 44;
      this.fountainParticles.push({
        x: cx + (Math.random() - 0.5) * 6,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.75 + Math.random() * 0.45,
        maxLife: 1.2,
        isCoin: i % 2 === 0,
      });
    }
  }

  getOverworldGuideCandidates() {
    if (!this.overworld) return [];
    const list = [];
    const f = this.overworld.fountain;
    list.push({
      kind: "fountain",
      name: "许愿喷泉",
      x: f.x + 1,
      y: f.y + 0.5,
      walkX: f.x + 0.5,
      walkY: f.y + 2.1,
      data: f,
    });
    for (const b of this.overworld.buildings) {
      list.push({
        kind: "building",
        name: localizeLabel(b.name),
        x: b.doorX + 0.5,
        y: b.by + 1.2,
        walkX: b.doorX,
        walkY: b.stepY,
        data: b,
      });
    }
    for (const s of this.overworld.slimes) {
      list.push({
        kind: "slime",
        name: s.title.slice(0, 14),
        x: s.x + 0.5,
        y: s.y + 0.2,
        walkX: s.x,
        walkY: s.y + 1,
        data: s,
      });
    }
    return list;
  }

  getGuidedTarget() {
    if (!this.activeMap) return null;
    if (this.activeMap.kind === "interior") {
      const unvisited = this.activeMap.items.filter((it) => !this.visitedItems.has(it.id));
      const pool = unvisited.length > 0 ? unvisited : [];
      if (pool.length > 0) {
        let best = pool[0];
        let bestDist = Infinity;
        for (const it of pool) {
          const d = Math.hypot(this.player.x - it.x, this.player.y - it.y);
          if (d < bestDist) {
            bestDist = d;
            best = it;
          }
        }
        return { kind: "item", name: best.name, x: best.x + 0.5, y: best.y + 0.2, data: best };
      }
      return { kind: "exit", name: "离开房间", x: 8, y: 9.5 };
    }

    const candidates = this.getOverworldGuideCandidates();
    if (candidates.length === 0) return null;
    if (this.guideManual) {
      return candidates[this.guideIndex % candidates.length];
    }

    // Auto mode: guide to nearest unvisited building; if all visited, guide to Wishing Fountain
    const unvisitedBuildings = candidates.filter(
      (c) => c.kind === "building" && !this.visitedBuildings.has(c.data.id)
    );
    if (unvisitedBuildings.length > 0) {
      let best = unvisitedBuildings[0];
      let bestDist = Infinity;
      for (const c of unvisitedBuildings) {
        const d = Math.hypot(this.player.x - c.x, this.player.y - c.y);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      return best;
    }
    return candidates[0];
  }

  cycleGuideTarget() {
    const candidates = this.getOverworldGuideCandidates();
    if (candidates.length === 0) return null;
    if (!this.guideManual) {
      this.guideManual = true;
      this.guideIndex = 0;
    } else {
      this.guideIndex = (this.guideIndex + 1) % candidates.length;
    }
    const target = candidates[this.guideIndex];
    retroAudio.blip();
    this.onGuideChange?.(target);
    return target;
  }

  getMinimapTargetAt(normX, normY) {
    if (!this.overworld) return null;
    const isEn = getLang() === "en";
    const v = this.minimapView || { x: 0, y: 0, w: this.overworld.width, h: this.overworld.height };
    const tx = v.x + normX * v.w;
    const ty = v.y + normY * v.h;
    const f = this.overworld.fountain;
    if (Math.hypot(tx - (f.x + 1), ty - (f.y + 1)) <= 2.2) {
      return { kind: "fountain", name: isEn ? "Fountain (Fortune)" : "许愿喷泉 (测运势)" };
    }
    const wm = this.overworld.windmill;
    if (wm && Math.hypot(tx - (wm.x + 1), ty - (wm.y + 1)) <= 2.3) {
      return { kind: "windmill", name: isEn ? "Windmill (Secret)" : "东郊风车 (神秘彩蛋)" };
    }
    const m = this.overworld.mayor;
    if (m && Math.hypot(tx - (m.x + 0.5), ty - (m.y + 0.5)) <= 1.8) {
      return { kind: "npc", name: isEn ? "Mayor" : m.name, npc: m };
    }
    for (const vNpc of this.overworld.villagers) {
      if (Math.hypot(tx - (vNpc.x + 0.5), ty - (vNpc.y + 0.5)) <= 1.8) {
        return { kind: "npc", name: vNpc.name, npc: vNpc };
      }
    }
    for (const s of this.overworld.slimes) {
      if (Math.hypot(tx - (s.x + 0.5), ty - (s.y + 0.5)) <= 2.1) {
        return { kind: "slime", name: `${isEn ? "TODO: " : "待办："}${s.title.slice(0, 14)}`, slime: s };
      }
    }
    if (this.overworld.buildings.length === 0) return null;
    let nearest = this.overworld.buildings[0];
    let bestDist = Infinity;
    for (const b of this.overworld.buildings) {
      const d = Math.hypot(tx - (b.bx + 1.5), ty - (b.by + 1.5));
      if (d < bestDist) {
        bestDist = d;
        nearest = b;
      }
    }
    return { kind: "building", name: nearest.name, building: nearest };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.viewW = w;
    this.viewH = h;
    this.syncMinimapResolution();
    if (this.activeMap) this.snapCamera();
  }

  snapCamera() {
    if (!this.activeMap) return;
    const mapPxW = this.activeMap.width * TILE_SIZE * SCALE;
    const mapPxH = this.activeMap.height * TILE_SIZE * SCALE;
    const targetX = (this.player.x + 0.5) * TILE_SIZE * SCALE - this.viewW / 2;
    const targetY = (this.player.y + 0.5) * TILE_SIZE * SCALE - this.viewH / 2;
    this.camera.x = mapPxW <= this.viewW ? (mapPxW - this.viewW) / 2 : Math.max(0, Math.min(targetX, mapPxW - this.viewW));
    this.camera.y = mapPxH <= this.viewH ? (mapPxH - this.viewH) / 2 : Math.max(0, Math.min(targetY, mapPxH - this.viewH));
  }

  initAmbientParticles() {
    this.ambientParticles = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * 56 * TILE_SIZE,
      y: Math.random() * 42 * TILE_SIZE,
      vx: (Math.random() - 0.3) * 8,
      vy: 4 + Math.random() * 6,
      phase: i * 0.6,
    }));
  }

  bindInputs() {
    window.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "tab"].includes(k)) {
        if (!this.pausedForDialog) e.preventDefault();
      }

      if (k === "tab" && !e.repeat) {
        if (!this.pausedForDialog && this.activeMap?.kind === "overworld") {
          this.cycleGuideTarget();
        }
        return;
      }

      if (k === "escape") {
        if (this.pausedForDialog) {
          this.onInteract?.(null);
        } else if (this.player.sitting) {
          this.standUp();
        } else if (this.activeMap?.kind === "interior") {
          this.exitInterior();
        }
        return;
      }

      if ((k === "e" || k === " " || k === "enter") && !e.repeat) {
        if (this.pausedForDialog) {
          this.onInteract?.(null);
        } else if (this.player.sitting) {
          this.standUp();
        } else {
          this.tryInteract();
        }
        return;
      }

      if (!this.pausedForDialog) {
        if (this.player.sitting && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
          this.standUp();
        }
        this.keys.add(k);
        this.clearWalkPath();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Click ground, edge guide pill, or entity on canvas to pathfind & interact
    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.pausedForDialog || !this.activeMap) return;
      if (this.player.sitting) this.standUp();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.edgeGuideRect) {
        const g = this.edgeGuideRect;
        if (sx >= g.x && sx <= g.x + g.w && sy >= g.y && sy <= g.y + g.h) {
          if (g.target.kind === "building") {
            this.teleportToBuilding(g.target.data);
          } else if (g.target.kind === "fountain") {
            this.teleportToFountain();
          } else if (g.target.walkX !== undefined) {
            this.startWalkPath(g.target.walkX, g.target.walkY, null);
          }
          return;
        }
      }

      const px = sx + this.camera.x;
      const py = sy + this.camera.y;
      const tx = px / (TILE_SIZE * SCALE);
      const ty = py / (TILE_SIZE * SCALE);
      const tileX = Math.floor(tx);
      const tileY = Math.floor(ty);

      const clickedTarget = this.findTargetAtTile(tileX, tileY);
      if (clickedTarget) {
        if (Math.hypot(this.player.x - clickedTarget.tx, this.player.y - clickedTarget.ty) <= 1.85) {
          this.triggerTarget(clickedTarget);
        } else {
          this.startWalkPath(clickedTarget.walkX, clickedTarget.walkY, clickedTarget);
        }
      } else {
        const goalX = Math.max(1, Math.min(this.activeMap.width - 2, tx - 0.5));
        const goalY = Math.max(1, Math.min(this.activeMap.height - 2, ty - 0.5));
        this.startWalkPath(goalX, goalY, null);
      }
    });
  }

  setTouchDirection(dir) {
    this.touchDir = dir;
    if (dir) {
      this.clearWalkPath();
    }
  }

  findTargetAtTile(tx, ty) {
    if (!this.activeMap) return null;
    if (this.activeMap.kind === "overworld") {
      const f = this.activeMap.fountain;
      if (tx >= f.x && tx <= f.x + 1 && ty >= f.y && ty <= f.y + 1) {
        const spots = [
          [f.x + 0.5, f.y + 2.1],
          [f.x + 0.5, f.y - 1.0],
          [f.x - 1.0, f.y + 0.5],
          [f.x + 2.1, f.y + 0.5],
        ];
        let bestSpot = spots[0];
        let bestD = Infinity;
        for (const [sx, sy] of spots) {
          const d = Math.hypot(this.player.x - sx, this.player.y - sy);
          if (d < bestD) {
            bestD = d;
            bestSpot = [sx, sy];
          }
        }
        return { kind: "fountain", data: f, tx: f.x + 0.5, ty: f.y + 0.5, walkX: bestSpot[0], walkY: bestSpot[1], label: "向喷泉许愿测运势" };
      }
      const wm = this.activeMap.windmill;
      if (wm && tx >= wm.x && tx <= wm.x + 1 && ty >= wm.y - 1 && ty <= wm.y + 1) {
        return { kind: "windmill", data: wm, tx: wm.x + 0.5, ty: wm.y + 0.5, walkX: wm.x + 0.5, walkY: wm.y + 2.1, label: "推动东郊风车" };
      }
      for (const b of this.activeMap.buildings) {
        if (tx >= b.bx && tx <= b.bx + 2 && ty >= b.by && ty <= b.by + 2) {
          return { kind: "building", data: b, tx: b.doorX, ty: b.doorY, walkX: b.doorX, walkY: b.stepY, label: `进入 ${b.name}` };
        }
      }
      const m = this.activeMap.mayor;
      if (Math.hypot(tx - m.x, ty - m.y) < 1.2) {
        return { kind: "npc", data: m, tx: m.x, ty: m.y, walkX: m.x, walkY: m.y + 1, label: `与 ${m.name} 对话` };
      }
      for (const item of this.activeMap.interactables) {
        if (Math.hypot(tx - item.x, ty - item.y) < 1.1) {
          return { kind: "sign", data: item, tx: item.x, ty: item.y, walkX: item.x, walkY: item.y + 1, label: "查看镇中心公告牌" };
        }
      }
      for (const v of this.activeMap.villagers) {
        if (Math.hypot(tx - v.x, ty - v.y) < 1.1) {
          return { kind: "villager", data: v, tx: v.x, ty: v.y, walkX: v.x, walkY: v.y + 1, label: `与 ${v.name} 交谈` };
        }
      }
      for (const s of this.activeMap.slimes) {
        if (Math.hypot(tx - s.x, ty - s.y) < 1.1) {
          return { kind: "slime", data: s, tx: s.x, ty: s.y, walkX: s.x, walkY: s.y + 1, label: `查看待办史莱姆` };
        }
      }
      for (const p of this.activeMap.props) {
        if (p.sittable && Math.hypot(tx - p.x, ty - p.y) < 1.0) {
          const spot = this.findWalkableAdjacent(p.x, p.y);
          return { kind: "seat", data: p, tx: p.x, ty: p.y, walkX: spot[0], walkY: spot[1], label: "坐下休息" };
        }
      }
    } else {
      const k = this.activeMap.keeper;
      if (Math.hypot(tx - k.x, ty - k.y) < 1.1) {
        return { kind: "npc", data: k, tx: k.x, ty: k.y, walkX: k.x + 1, walkY: k.y, label: `询问 ${k.name}` };
      }
      for (const item of this.activeMap.items) {
        if (Math.hypot(tx - item.x, ty - item.y) < 1.1) {
          return { kind: "item", data: item, tx: item.x, ty: item.y, walkX: item.x, walkY: item.y + 1, label: `翻阅 ${item.name}` };
        }
      }
      for (const p of this.activeMap.props) {
        if (p.sittable && Math.hypot(tx - p.x, ty - p.y) < 1.0) {
          const spot = this.findWalkableAdjacent(p.x, p.y);
          return { kind: "seat", data: p, tx: p.x, ty: p.y, walkX: spot[0], walkY: spot[1], label: "坐下休息" };
        }
      }
      for (const ex of this.activeMap.exitTiles) {
        if (tx === ex.x && ty === ex.y) {
          return { kind: "exit", tx: ex.x, ty: ex.y, walkX: ex.x, walkY: ex.y, label: "离开房间" };
        }
      }
    }
    return null;
  }

  findWalkableAdjacent(x, y) {
    const candidates = [
      [x, y + 1],
      [x, y - 1],
      [x - 1, y],
      [x + 1, y],
    ];
    let best = candidates[0];
    let bestD = Infinity;
    for (const [cx, cy] of candidates) {
      if (this.isWalkablePointInMap(this.activeMap, cx, cy)) {
        const d = Math.hypot(this.player.x - cx, this.player.y - cy);
        if (d < bestD) {
          bestD = d;
          best = [cx, cy];
        }
      }
    }
    return best;
  }

  standUp() {
    if (!this.player.sitting) return;
    const { standX, standY, seatX, seatY } = this.player.sitting;
    if (this.isWalkableAt(standX, standY)) {
      this.player.x = standX;
      this.player.y = standY;
    } else {
      const [fx, fy] = this.findWalkableAdjacent(seatX, seatY);
      this.player.x = fx;
      this.player.y = fy;
    }
    this.player.sitting = null;
    this.onSitChange?.(false);
  }

  computeNearbyTarget() {
    if (!this.activeMap) return null;
    const px = this.player.x;
    const py = this.player.y;
    let best = null;
    let bestDist = Infinity;

    const consider = (cand, x, y, maxDist = 1.65) => {
      const d = Math.hypot(px - x, py - y);
      if (d <= maxDist && d < bestDist) {
        bestDist = d;
        best = { ...cand, x, y };
      }
    };

    const isEn = getLang() === "en";
    if (this.activeMap.kind === "overworld") {
      const f = this.activeMap.fountain;
      const cx = Math.max(f.x, Math.min(px + 0.5, f.x + 2));
      const cy = Math.max(f.y, Math.min(py + 0.5, f.y + 2));
      const edgeDist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      if (edgeDist <= 1.35 && edgeDist < bestDist) {
        bestDist = edgeDist;
        best = { kind: "fountain", data: f, label: isEn ? "[E] Toss Coin for Fortune" : "[E] 向喷泉许愿测运势", x: f.x + 0.5, y: f.y + 0.5 };
      }
      if (this.activeMap.windmill) {
        const wm = this.activeMap.windmill;
        const wx = Math.max(wm.x, Math.min(px + 0.5, wm.x + 2));
        const wy = Math.max(wm.y, Math.min(py + 0.5, wm.y + 2));
        const wDist = Math.hypot(px + 0.5 - wx, py + 0.5 - wy);
        if (wDist <= 1.45 && wDist < bestDist) {
          bestDist = wDist;
          best = { kind: "windmill", data: wm, label: isEn ? "[E] Push Windmill Sails" : "[E] 推动风车叶片", x: wm.x + 0.5, y: wm.y + 0.5 };
        }
      }
      for (const b of this.activeMap.buildings) {
        consider({ kind: "building", data: b, label: isEn ? `[E] Enter ${localizeLabel(b.name)}` : `[E] 进入 ${b.name}` }, b.doorX, b.stepY - 0.35);
      }
      const m = this.activeMap.mayor;
      consider({ kind: "npc", data: m, label: isEn ? "[E] Talk to Mayor" : `[E] 与 ${m.name} 对话` }, m.x, m.y);
      for (const item of this.activeMap.interactables) {
        consider({ kind: "sign", data: item, label: isEn ? "[E] Read Noticeboard (README)" : "[E] 阅读公告牌 (README)" }, item.x, item.y);
      }
      for (const v of this.activeMap.villagers) {
        consider({ kind: "villager", data: v, label: isEn ? `[E] Talk to ${v.name}` : `[E] 与 ${v.name} 对话` }, v.x, v.y);
      }
      for (const s of this.activeMap.slimes) {
        consider({ kind: "slime", data: s, label: isEn ? "[E] Inspect Slime" : "[E] 调查史莱姆" }, s.x, s.y);
      }
      for (const p of this.activeMap.props) {
        if (p.sittable) consider({ kind: "seat", data: p, label: isEn ? "[E] Sit & Rest" : "[E] 坐下休息" }, p.x, p.y, 1.48);
      }
    } else {
      const k = this.activeMap.keeper;
      consider({ kind: "npc", data: k, label: isEn ? "[E] Ask Keeper" : "[E] 询问管理员" }, k.x, k.y);
      for (const item of this.activeMap.items) {
        consider({ kind: "item", data: item, label: isEn ? `[E] Open ${item.name}` : `[E] 查看 ${item.name}` }, item.x, item.y);
      }
      for (const p of this.activeMap.props) {
        if (p.sittable) consider({ kind: "seat", data: p, label: isEn ? "[E] Sit & Rest" : "[E] 坐下休息" }, p.x, p.y, 1.48);
      }
      for (const ex of this.activeMap.exitTiles) {
        consider({ kind: "exit", label: isEn ? "[E] Exit to Town" : "[E] 返回小镇" }, ex.x, ex.y);
      }
    }
    return best;
  }

  tryInteract() {
    if (this.player.sitting) {
      this.standUp();
      return;
    }
    const target = this.nearbyTarget || this.computeNearbyTarget();
    if (target) this.triggerTarget(target);
  }

  triggerTarget(target) {
    if (!target) return;
    if (target.kind === "seat") {
      if (this.player.sitting) {
        this.standUp();
      } else {
        const p = target.data;
        this.player.sitting = {
          seatX: p.x,
          seatY: p.y,
          standX: this.player.x,
          standY: this.player.y,
          propType: p.type,
        };
        this.player.x = p.x;
        this.player.y = p.y - 0.14;
        this.player.dir = "down";
        this.player.moving = false;
        this.clearWalkPath();
        retroAudio.sit();
        this.spawnInteractBurst(p.x, p.y, "#f7d06b");
        this.onSitChange?.(true, p.type);
      }
      return;
    }
    if (target.kind === "building") {
      this.enterBuilding(target.data);
      return;
    }
    if (target.kind === "exit") {
      this.exitInterior();
      return;
    }
    if (target.kind === "fountain") {
      this.onInteract?.(target);
      return;
    }
    if (target.kind === "windmill") {
      this.boostWindmill(5.0);
      const wm = target.data || this.overworld?.windmill;
      const isEn = getLang() === "en";
      const msg = this.windmillClicks === 1
        ? (isEn ? "Windmill spinning faster!" : "东郊风车呼呼加速！")
        : this.windmillClicks === 2
          ? (isEn ? "One more push for a secret..." : "再推一把，风声里藏着秘密...")
          : this.windmillClicks === 3
            ? (isEn ? "✨ Windmill Easter Egg!" : "✨ 触发风车秘境彩蛋！")
            : (isEn ? "Full Gale Overdrive!" : "狂风加速中！");
      if (wm) this.spawnInteractBurst(wm.x + 0.5, wm.y, "#ffe066", msg);
      this.onInteract?.({ ...target, clicks: this.windmillClicks });
      return;
    }
    if (target.kind === "villager") {
      this.talkedVillagers.add(target.data.id);
      this.onVillagerTalked?.(this.talkedVillagers.size, this.overworld?.villagers?.length || 0);
      this.onExplorationChange?.();
      retroAudio.blip();
      this.onInteract?.(target);
      return;
    }
    if (target.kind === "item") {
      this.visitedItems.add(target.data.id);
      if (target.data.propType === "chestClosed") {
        target.data.opened = true;
        retroAudio.chest();
        this.spawnInteractBurst(target.data.x, target.data.y, "#ffd966", "+1 宝藏");
      } else {
        retroAudio.blip();
        this.spawnInteractBurst(target.data.x, target.data.y, "#f5edd6", "已翻阅");
      }
      this.onExplorationChange?.();
    } else if (target.kind === "slime") {
      retroAudio.slime();
      this.spawnInteractBurst(target.data.x, target.data.y, "#6ee787");
    } else {
      retroAudio.blip();
    }
    this.onInteract?.(target);
  }

  withCurtain(fn) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.curtainEl.classList.add("is-active");
    setTimeout(() => {
      fn();
      setTimeout(() => {
        this.curtainEl.classList.remove("is-active");
        this.transitioning = false;
      }, 90);
    }, 170);
  }

  withWorldTransition(fn) {
    if (this.transitioning) {
      fn();
      return;
    }
    this.transitioning = true;
    this.curtainEl.classList.add("is-active");
    setTimeout(() => {
      fn();
      setTimeout(() => {
        this.curtainEl.classList.remove("is-active");
        this.transitioning = false;
      }, 80);
    }, 140);
  }

  enterBuilding(building) {
    this.player.sitting = null;
    this.visitedBuildings.add(building.id);
    this.onExplorationChange?.();
    retroAudio.door();
    this.withCurtain(() => {
      this.player.savedOverworldPos = { x: building.doorX, y: building.stepY };
      this.interior = generateInterior(building);
      this.activeMap = this.interior;
      this.player.x = this.interior.spawn.x;
      this.player.y = this.interior.spawn.y;
      this.player.dir = "up";
      this.clearWalkPath();
      this.snapCamera();
      this.onZoneChange?.(`室内 · ${building.name}`);
      this.onEnterBuilding?.(building);
    });
  }

  exitInterior(toPlaza = false) {
    retroAudio.door();
    this.withCurtain(() => {
      const restore = this.player.savedOverworldPos || this.overworld.spawn;
      this.interior = null;
      this.activeMap = this.overworld;
      if (toPlaza) {
        this.player.x = this.overworld.spawn.x;
        this.player.y = this.overworld.spawn.y;
      } else {
        this.player.x = restore.x;
        this.player.y = restore.y;
      }
      this.player.dir = "down";
      this.clearWalkPath();
      this.snapCamera();
      this.onZoneChange?.("镇中心广场");
    });
  }

  isWalkableAt(nx, ny) {
    if (!this.activeMap) return false;
    const { width, height, solid } = this.activeMap;
    // Check player footprint box around feet (0.7 x 0.6 tiles)
    const pts = [
      [nx + 0.18, ny + 0.35],
      [nx + 0.82, ny + 0.35],
      [nx + 0.18, ny + 0.92],
      [nx + 0.82, ny + 0.92],
    ];
    for (const [px, py] of pts) {
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
      if (solid[ty * width + tx]) return false;
    }
    return true;
  }

  start() {
    const tick = (ts) => {
      const dt = Math.min(0.05, (ts - (this.lastTs || ts)) / 1000);
      this.lastTs = ts;
      this.update(dt);
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  update(dt) {
    if (!this.activeMap) return;
    this.elapsed += dt;

    // 1. Player movement
    if (!this.pausedForDialog && !this.transitioning) {
      let dx = 0;
      let dy = 0;
      if (this.keys.has("w") || this.keys.has("arrowup") || this.touchDir === "up") dy -= 1;
      if (this.keys.has("s") || this.keys.has("arrowdown") || this.touchDir === "down") dy += 1;
      if (this.keys.has("a") || this.keys.has("arrowleft") || this.touchDir === "left") dx -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright") || this.touchDir === "right") dx += 1;

      if (this.player.sitting && (dx !== 0 || dy !== 0)) {
        this.standUp();
      }

      let autoWalking = false;
      if (dx === 0 && dy === 0 && this.walkPath.length > 0) {
        while (this.walkPath.length > 0) {
          const wp = this.walkPath[0];
          const vx = wp.x - this.player.x;
          const vy = wp.y - this.player.y;
          const dist = Math.hypot(vx, vy);
          if (dist < 0.14) {
            this.walkPath.shift();
          } else {
            dx = vx / dist;
            dy = vy / dist;
            autoWalking = true;
            break;
          }
        }
        if (this.walkPath.length === 0 && !autoWalking) {
          const act = this.pendingAction;
          this.pendingAction = null;
          if (act) this.triggerTarget(act);
        }
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.player.dir = dx < 0 ? "left" : "right";
        } else {
          this.player.dir = dy < 0 ? "up" : "down";
        }

        const sprint = this.keys.has("shift") ? 1.55 : 1;
        const speed = 5.4 * sprint * dt;
        const nextX = this.player.x + dx * speed;
        const nextY = this.player.y + dy * speed;

        const prevX = this.player.x;
        const prevY = this.player.y;

        let moved = false;
        if (this.isWalkableAt(nextX, this.player.y)) {
          this.player.x = nextX;
          moved = true;
        }
        if (this.isWalkableAt(this.player.x, nextY)) {
          this.player.y = nextY;
          moved = true;
        }

        // Gentle corner-nudge when manual single-axis input catches on a tile edge
        if (!moved && !autoWalking) {
          if (Math.abs(dx) > 0.7 && Math.abs(dy) < 0.1) {
            for (const nudge of [-0.26, 0.26]) {
              if (this.isWalkableAt(nextX, this.player.y + nudge)) {
                this.player.y += nudge * Math.min(1, dt * 8);
                moved = true;
                break;
              }
            }
          } else if (Math.abs(dy) > 0.7 && Math.abs(dx) < 0.1) {
            for (const nudge of [-0.26, 0.26]) {
              if (this.isWalkableAt(this.player.x + nudge, nextY)) {
                this.player.x += nudge * Math.min(1, dt * 8);
                moved = true;
                break;
              }
            }
          }
        }

        if (!moved && autoWalking) {
          // Stop click-walk if blocked unexpectedly
          const act = this.pendingAction;
          this.clearWalkPath();
          if (act && Math.hypot(this.player.x - act.tx, this.player.y - act.ty) <= 1.85) {
            this.triggerTarget(act);
          }
        }

        this.player.moving = moved;
        if (moved) {
          this.player.walkCycle += dt * 10 * sprint;
          retroAudio.step();
          this._moveAccum += Math.hypot(this.player.x - prevX, this.player.y - prevY);
          if (this._moveAccum >= 1.2) {
            this._moveAccum = 0;
            this.onPlayerMove?.();
          }
        }
      } else {
        this.player.moving = false;
        this.player.walkCycle = 0;
      }

      // Auto-enter doorway when walking up into a building door, or stepping on interior exit mat
      if (this.activeMap.kind === "overworld") {
        for (const b of this.activeMap.buildings) {
          if (Math.abs(this.player.x - b.doorX) < 0.45 && Math.abs(this.player.y - b.stepY) < 0.25 && this.player.dir === "up" && (this.keys.has("w") || this.keys.has("arrowup") || this.touchDir === "up")) {
            this.enterBuilding(b);
            break;
          }
        }
      } else if (this.activeMap.kind === "interior") {
        if (this.player.y > 9.15 && Math.abs(this.player.x - 7.5) < 1.1 && this.player.dir === "down") {
          this.exitInterior();
        }
      }
    }

    // 2. Smooth Camera Lerp
    const mapPxW = this.activeMap.width * TILE_SIZE * SCALE;
    const mapPxH = this.activeMap.height * TILE_SIZE * SCALE;
    const idealX = (this.player.x + 0.5) * TILE_SIZE * SCALE - this.viewW / 2;
    const idealY = (this.player.y + 0.5) * TILE_SIZE * SCALE - this.viewH / 2;
    const clampedX = mapPxW <= this.viewW ? (mapPxW - this.viewW) / 2 : Math.max(0, Math.min(idealX, mapPxW - this.viewW));
    const clampedY = mapPxH <= this.viewH ? (mapPxH - this.viewH) / 2 : Math.max(0, Math.min(idealY, mapPxH - this.viewH));
    this.camera.x += (clampedX - this.camera.x) * Math.min(1, dt * 10);
    this.camera.y += (clampedY - this.camera.y) * Math.min(1, dt * 10);

    // 3. Overworld calm villagers, chimney smoke & ambient particles
    if (this.activeMap.kind === "overworld") {
      for (const v of this.activeMap.villagers) {
        v.bubbleTimer -= dt;
        if (v.bubbleTimer < -3.5) v.bubbleTimer = 5 + Math.random() * 6;

        const pdx = this.player.x - v.x;
        const pdy = this.player.y - v.y;
        if (Math.hypot(pdx, pdy) <= 2.4) {
          v.state = "idle";
          v.walkCycle = 0;
          if (Math.abs(pdx) > Math.abs(pdy)) v.dir = pdx >= 0 ? "right" : "left";
          else v.dir = pdy >= 0 ? "down" : "up";
          continue;
        }

        v.stateTimer -= dt;
        if (v.state === "idle") {
          v.walkCycle = 0;
          if (v.stateTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 0.4 + Math.random() * 0.45;
            v.targetX = v.homeX + Math.cos(angle) * dist;
            v.targetY = v.homeY + Math.sin(angle) * dist;
            v.state = "walk";
            v.stateTimer = 1.1 + Math.random() * 1.1;
          }
        } else {
          const dx = v.targetX - v.x;
          const dy = v.targetY - v.y;
          const d = Math.hypot(dx, dy);
          if (d < 0.08 || v.stateTimer <= 0) {
            v.state = "idle";
            v.stateTimer = 3.0 + Math.random() * 2.5;
            v.walkCycle = 0;
          } else {
            const step = Math.min(d, 1.1 * dt);
            const nx = v.x + (dx / d) * step;
            const ny = v.y + (dy / d) * step;
            if (this.isWalkableAt(nx, ny)) {
              v.x = nx;
              v.y = ny;
              v.walkCycle += dt * 5;
              if (Math.abs(dx) > Math.abs(dy)) v.dir = dx >= 0 ? "right" : "left";
              else v.dir = dy >= 0 ? "down" : "up";
            } else {
              v.state = "idle";
              v.stateTimer = 2.8 + Math.random() * 2.0;
              v.walkCycle = 0;
            }
          }
        }
      }

      if (Math.random() < dt * 5 && this.activeMap.buildings.length > 0) {
        const b = this.activeMap.buildings[Math.floor(Math.random() * this.activeMap.buildings.length)];
        this.smokeParticles.push({
          x: (b.bx + 2.35) * TILE_SIZE,
          y: (b.by + 0.1) * TILE_SIZE,
          vy: -11 - Math.random() * 6,
          vx: 3 + Math.random() * 4,
          life: 1.8,
          maxLife: 1.8,
        });
      }
      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const p = this.smokeParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.smokeParticles.splice(i, 1);
      }

      for (const p of this.ambientParticles) {
        p.x += (p.vx + Math.sin(this.elapsed + p.phase) * 4) * dt;
        p.y += p.vy * dt;
        if (p.y > this.activeMap.height * TILE_SIZE) p.y = 0;
        if (p.x > this.activeMap.width * TILE_SIZE) p.x = 0;
        if (p.x < 0) p.x = this.activeMap.width * TILE_SIZE;
      }

      for (let i = this.fountainParticles.length - 1; i >= 0; i--) {
        const fp = this.fountainParticles[i];
        fp.vy += 120 * dt;
        fp.x += fp.vx * dt;
        fp.y += fp.vy * dt;
        fp.life -= dt;
        if (fp.life <= 0) this.fountainParticles.splice(i, 1);
      }

      if (this.windmillBoost > 0) {
        this.windmillBoost = Math.max(0, this.windmillBoost - dt);
      }
      this.windmillPhase += dt * (4 + (this.windmillBoost > 0 ? 14 : 0));

      for (let i = this.windGustParticles.length - 1; i >= 0; i--) {
        const wp = this.windGustParticles[i];
        wp.x += wp.vx * dt;
        wp.y += wp.vy * dt;
        wp.life -= dt;
        if (wp.life <= 0) this.windGustParticles.splice(i, 1);
      }
    }

    // Update teleport aura effects, interaction bursts & floating texts (works indoors & outdoors)
    for (let i = this.teleportEffects.length - 1; i >= 0; i--) {
      const te = this.teleportEffects[i];
      te.life -= dt;
      for (const sp of te.sparks) sp.yOff += sp.vy * dt;
      if (te.life <= 0) this.teleportEffects.splice(i, 1);
    }
    for (let i = this.interactParticles.length - 1; i >= 0; i--) {
      const ip = this.interactParticles[i];
      ip.vy += 70 * dt;
      ip.x += ip.vx * dt;
      ip.y += ip.vy * dt;
      ip.life -= dt;
      if (ip.life <= 0) this.interactParticles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 18 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    this.nearbyTarget = this.player.sitting ? null : this.computeNearbyTarget();
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = this.activeMap?.kind === "interior" ? "#140e0b" : (this.theme?.backdrop || "#182919");
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    if (!this.activeMap) return;

    const camX = Math.round(this.camera.x);
    const camY = Math.round(this.camera.y);
    const tsPx = TILE_SIZE * SCALE;
    const animFrame = Math.floor(this.elapsed * 4) % 3;

    ctx.save();
    ctx.translate(-camX, -camY);

    // 1. Tile Layer
    const { width, height, tiles } = this.activeMap;
    const startCol = Math.max(0, Math.floor(camX / tsPx) - 1);
    const endCol = Math.min(width - 1, Math.ceil((camX + this.viewW) / tsPx) + 1);
    const startRow = Math.max(0, Math.floor(camY / tsPx) - 1);
    const endRow = Math.min(height - 1, Math.ceil((camY + this.viewH) / tsPx) + 1);

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const t = tiles[y * width + x];
        let img = this.atlas.tiles.grass[0];
        if (t >= T_GRASS_0 && t <= T_GRASS_3) img = this.atlas.tiles.grass[t];
        else if (t === T_PATH) img = this.atlas.tiles.path;
        else if (t === T_PLAZA) img = this.atlas.tiles.plaza;
        else if (t === T_WATER) img = this.atlas.tiles.water[animFrame];
        else if (t === T_BRIDGE) img = this.atlas.tiles.bridge;
        else if (t === T_WOOD) img = this.atlas.tiles.woodFloor;
        else if (t === T_RUG) img = this.atlas.tiles.rug;
        else if (t === T_WALL) img = this.atlas.tiles.interiorWall;
        ctx.drawImage(img, x * tsPx, y * tsPx, tsPx, tsPx);
      }
    }

    // 1b. A* Pathfinding Breadcrumbs & Destination Ring
    if (this.walkPath.length > 0) {
      ctx.save();
      for (let i = 0; i < this.walkPath.length; i++) {
        const wp = this.walkPath[i];
        const wx = Math.round((wp.x + 0.5) * tsPx);
        const wy = Math.round((wp.y + 0.65) * tsPx);
        const isLast = i === this.walkPath.length - 1;
        if (isLast) {
          const pulse = 1 + Math.sin(this.elapsed * 8) * 0.16;
          ctx.strokeStyle = "rgba(247, 208, 107, 0.92)";
          ctx.lineWidth = 2;
          ctx.strokeRect(Math.round(wx - 9 * pulse), Math.round(wy - 9 * pulse), Math.round(18 * pulse), Math.round(18 * pulse));
          ctx.fillStyle = "rgba(255, 243, 184, 0.9)";
          ctx.fillRect(wx - 3, wy - 3, 6, 6);
        } else {
          ctx.fillStyle = "rgba(36, 26, 21, 0.45)";
          ctx.fillRect(wx - 2, wy - 2, 6, 6);
          ctx.fillStyle = "rgba(247, 208, 107, 0.78)";
          ctx.fillRect(wx - 2, wy - 2, 4, 4);
        }
      }
      ctx.restore();
    }

    // 2. Y-sorted Render Queue (Props, Buildings, NPCs, Slimes, Player)
    const drawList = [];

    const playerStep = this.player.moving ? (Math.floor(this.player.walkCycle) % 2 === 0 ? 1 : 2) : 0;
    drawList.push({
      sortY: (this.player.y + (this.player.sitting ? 1.05 : 0.9)) * tsPx,
      draw: () => {
        const sprite = this.atlas.player[this.player.dir][this.player.sitting ? 0 : playerStep];
        if (this.player.sitting) {
          const seatBob = Math.sin(this.elapsed * 3) * 1.5;
          ctx.drawImage(sprite, 0, 0, 16, 17, Math.round(this.player.x * tsPx), Math.round((this.player.y - 0.16) * tsPx + seatBob), tsPx, Math.round(17 * SCALE));
        } else {
          ctx.drawImage(sprite, Math.round(this.player.x * tsPx), Math.round((this.player.y - 0.25) * tsPx), tsPx, Math.round(20 * SCALE));
        }
      },
    });

    if (this.activeMap.kind === "overworld") {
      // Ground decorations (flowers, crops, lilypads) under sprites
      for (const gd of this.activeMap.groundDecos || []) {
        const spr = this.atlas.scenery[gd.type];
        if (spr) ctx.drawImage(spr, gd.x * tsPx, gd.y * tsPx, tsPx, tsPx);
      }

      // Fountain + permanent nameplate
      const f = this.activeMap.fountain;
      const isEn = getLang() === "en";
      drawList.push({
        sortY: (f.y + 1.8) * tsPx,
        draw: () => {
          ctx.drawImage(this.atlas.scenery.fountain[animFrame], f.x * tsPx, f.y * tsPx, tsPx * 2, tsPx * 2);
          this.drawLabel(ctx, isEn ? "Fountain · Fortune" : "许愿喷泉 · 测运势", (f.x + 1) * tsPx, (f.y - 0.1) * tsPx, "#d8f5ff", "#1c384a");
        },
      });

      // Eastern Windmill
      if (this.activeMap.windmill) {
        const wm = this.activeMap.windmill;
        const wmFrame = Math.floor(this.windmillPhase) % 3;
        drawList.push({
          sortY: (wm.y + 1.9) * tsPx,
          draw: () => {
            ctx.drawImage(this.atlas.scenery.windmill[wmFrame], wm.x * tsPx, (wm.y - 0.5) * tsPx, tsPx * 2, Math.round(tsPx * 2.5));
            const dist = Math.hypot(this.player.x - wm.x, this.player.y - wm.y);
            if (this.windmillBoost > 0 || dist <= 6) {
              this.drawLabel(
                ctx,
                this.windmillBoost > 0 ? (isEn ? "⚡ Overdrive!" : "⚡ 风车加速中!") : (isEn ? "Windmill" : "东郊风车"),
                (wm.x + 1) * tsPx,
                (wm.y - 0.65) * tsPx,
                this.windmillBoost > 0 ? "#ffe28a" : "#f5edd6",
                "#241a15"
              );
            }
          },
        });
      }

      // Trees (pine, oak, autumn)
      for (const t of this.activeMap.trees) {
        drawList.push({
          sortY: (t.y + 0.95) * tsPx,
          draw: () => {
            const treeSpr = t.variant === "oak"
              ? this.atlas.scenery.oakTree
              : t.variant === "autumn"
                ? this.atlas.scenery.autumnTree
                : this.atlas.scenery.tree;
            ctx.drawImage(treeSpr, t.x * tsPx, (t.y - 0.25) * tsPx, tsPx, 20 * SCALE);
          },
        });
      }

      // Props
      for (const p of this.activeMap.props) {
        drawList.push({
          sortY: (p.y + 0.85) * tsPx,
          draw: () => {
            if (p.type === "lamp") {
              ctx.drawImage(this.atlas.scenery.lamp, p.x * tsPx, (p.y - 0.4) * tsPx, tsPx, 18 * SCALE);
            } else if (p.type === "campfire") {
              ctx.drawImage(this.atlas.scenery.campfire[animFrame], p.x * tsPx, p.y * tsPx, tsPx, tsPx);
            } else {
              ctx.drawImage(this.atlas.scenery[p.type], p.x * tsPx, p.y * tsPx, tsPx, tsPx);
            }
          },
        });
      }

      // Buildings + wooden nameplate
      for (const b of this.activeMap.buildings) {
        drawList.push({
          sortY: (b.by + 2.8) * tsPx,
          draw: () => {
            const spr = this.atlas.buildings[b.style] || this.atlas.buildings.cottage;
            ctx.drawImage(spr, b.bx * tsPx, b.by * tsPx, tsPx * 3, tsPx * 3);
            this.drawLabel(ctx, localizeLabel(b.name), (b.bx + 1.5) * tsPx, (b.by - 0.15) * tsPx, "#f5edd6", "#241a15");
          },
        });
      }

      // Mayor
      const m = this.activeMap.mayor;
      drawList.push({
        sortY: (m.y + 0.9) * tsPx,
        draw: () => {
          ctx.drawImage(this.atlas.mayor[m.dir][0], m.x * tsPx, (m.y - 0.25) * tsPx, tsPx, 20 * SCALE);
          this.drawLabel(ctx, getLang() === "en" ? "Mayor" : "镇长", (m.x + 0.5) * tsPx, (m.y - 0.45) * tsPx, "#ffe699", "#241a15");
        },
      });

      // Villagers + status badge (? or ✓) + floating commit bubble
      for (const v of this.activeMap.villagers) {
        drawList.push({
          sortY: (v.y + 0.9) * tsPx,
          draw: () => {
            const frameSet = this.atlas.villagers[v.palette % this.atlas.villagers.length];
            const vStep = v.state === "walk" ? (Math.floor(v.walkCycle) % 2) + 1 : 0;
            ctx.drawImage(frameSet[v.dir][vStep], Math.round(v.x * tsPx), Math.round((v.y - 0.25) * tsPx), tsPx, 20 * SCALE);
            this.drawLabel(ctx, v.name, (v.x + 0.5) * tsPx, (v.y - 0.42) * tsPx, "#e8f3ff", "#1f2a38");
            const talked = this.talkedVillagers.has(v.id);
            const badgeBob = talked ? 0 : Math.sin(this.elapsed * 4 + v.homeX) * 2;
            this.drawStatusBadge(ctx, talked, (v.x + 0.5) * tsPx, (v.y - 0.88) * tsPx + badgeBob);
            if (v.bubbleTimer < 0) {
              this.drawSpeechPill(ctx, v.message.slice(0, 26), (v.x + 0.5) * tsPx, (v.y - 1.35) * tsPx);
            }
          },
        });
      }

      // Slimes (high-contrast or peacefully defeated)
      for (const s of this.activeMap.slimes) {
        const defeated = this.defeatedSlimes.has(s.id);
        drawList.push({
          sortY: (s.y + 0.85) * tsPx,
          draw: () => {
            const bounce = defeated ? 0 : Math.abs(Math.sin(this.elapsed * 3.5 + s.phase)) * 6;
            const sf = this.atlas.slimes[s.severity] || this.atlas.slimes.green;
            ctx.save();
            if (defeated) ctx.globalAlpha = 0.45;
            ctx.drawImage(sf[defeated ? 1 : animFrame], s.x * tsPx, Math.round(s.y * tsPx - bounce), tsPx, tsPx);
            ctx.restore();
            const labelText = defeated ? `✓ ${s.title.slice(0, 14)}` : s.title.slice(0, 16);
            this.drawLabel(ctx, labelText, (s.x + 0.5) * tsPx, (s.y - 0.3) * tsPx - bounce, defeated ? "#9fdcb0" : "#bff5c7", "#193821");
          },
        });
      }
    } else {
      // Interior wall decorations (windows, animated fireplace, banners) + window sunbeams
      for (const wd of this.activeMap.wallDecos || []) {
        const spr = wd.type === "fireplace" ? this.atlas.scenery.fireplace[animFrame] : this.atlas.scenery[wd.type];
        if (spr) ctx.drawImage(spr, wd.x * tsPx, wd.y * tsPx, tsPx, tsPx);
        if (wd.type === "windowWall") {
          ctx.save();
          ctx.fillStyle = "rgba(255, 240, 185, 0.09)";
          ctx.beginPath();
          ctx.moveTo((wd.x + 0.15) * tsPx, (wd.y + 1) * tsPx);
          ctx.lineTo((wd.x + 0.85) * tsPx, (wd.y + 1) * tsPx);
          ctx.lineTo((wd.x + 1.25) * tsPx, (wd.y + 3.2) * tsPx);
          ctx.lineTo((wd.x - 0.15) * tsPx, (wd.y + 3.2) * tsPx);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (wd.type === "fireplace") {
          ctx.save();
          const gx = (wd.x + 0.5) * tsPx;
          const gy = (wd.y + 0.8) * tsPx;
          const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, tsPx * 2.2);
          grad.addColorStop(0, "rgba(255, 160, 70, 0.24)");
          grad.addColorStop(1, "rgba(255, 160, 70, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(gx - tsPx * 2.2, gy - tsPx * 2.2, tsPx * 4.4, tsPx * 4.4);
          ctx.restore();
        }
      }

      // Interior Props, Items, Keeper
      for (const p of this.activeMap.props) {
        const sy = p.type === "doormat" ? (p.y - 0.5) * tsPx : (p.y + 0.8) * tsPx;
        drawList.push({
          sortY: sy,
          draw: () => ctx.drawImage(this.atlas.scenery[p.type], p.x * tsPx, p.y * tsPx, tsPx, tsPx),
        });
      }

      for (const item of this.activeMap.items) {
        drawList.push({
          sortY: (item.y + 0.85) * tsPx,
          draw: () => {
            const img = item.propType === "chestClosed"
              ? (item.opened ? this.atlas.scenery.chestOpen : this.atlas.scenery.chestClosed)
              : this.atlas.scenery.bookshelf;
            ctx.drawImage(img, item.x * tsPx, item.y * tsPx, tsPx, tsPx);
            const shortName = item.name.length > 15 ? `${item.name.slice(0, 14)}…` : item.name;
            this.drawLabel(ctx, shortName, (item.x + 0.5) * tsPx, (item.y - 0.22) * tsPx, "#f5edd6", "#241a15");
          },
        });
      }

      const k = this.activeMap.keeper;
      drawList.push({
        sortY: (k.y + 0.9) * tsPx,
        draw: () => {
          const spr = this.atlas.villagers[1].down[0];
          ctx.drawImage(spr, k.x * tsPx, (k.y - 0.25) * tsPx, tsPx, 20 * SCALE);
          this.drawLabel(ctx, getLang() === "en" ? "Keeper" : "管理员", (k.x + 0.5) * tsPx, (k.y - 0.42) * tsPx, "#ffe699", "#241a15");
        },
      });
    }

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const entry of drawList) entry.draw();

    // 3. Chimney Smoke & Ambient Petals / Fireflies
    if (this.activeMap.kind === "overworld") {
      for (const p of this.smokeParticles) {
        const alpha = (p.life / p.maxLife) * 0.55;
        ctx.fillStyle = `rgba(240, 232, 218, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(p.x * SCALE), Math.round(p.y * SCALE), 6, 6);
      }

      for (const p of this.ambientParticles) {
        ctx.fillStyle = this.timeOfDay === "night"
          ? `rgba(255, 224, 120, ${(0.45 + 0.4 * Math.sin(this.elapsed * 3 + p.phase)).toFixed(2)})`
          : (this.theme?.particleDay || "rgba(255, 240, 210, 0.55)");
        ctx.fillRect(Math.round(p.x * SCALE), Math.round(p.y * SCALE), 3, 3);
      }

      for (const fp of this.fountainParticles) {
        ctx.fillStyle = fp.isCoin ? "#ffe066" : "#88e0ff";
        ctx.fillRect(Math.round(fp.x * SCALE), Math.round(fp.y * SCALE), fp.isCoin ? 5 : 4, fp.isCoin ? 5 : 4);
      }

      for (const wp of this.windGustParticles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(0.85, wp.life));
        ctx.fillStyle = wp.color;
        ctx.fillRect(Math.round(wp.x * SCALE), Math.round(wp.y * SCALE), Math.round(wp.len * SCALE * 0.5), 3);
        ctx.restore();
      }
    }

    // 3b. Teleport Magic Circle & Light Pillar VFX + Interaction Bursts + Floating Text
    for (const te of this.teleportEffects) {
      const progress = 1 - te.life / te.maxLife;
      const alpha = Math.max(0, te.life / te.maxLife);
      const px = Math.round(te.x * SCALE);
      const py = Math.round(te.y * SCALE);
      ctx.save();
      // Vertical soft light beam
      const beamGrad = ctx.createLinearGradient(px, py - 95, px, py + 8);
      beamGrad.addColorStop(0, "rgba(136, 224, 255, 0)");
      beamGrad.addColorStop(0.6, `rgba(136, 224, 255, ${(0.38 * alpha).toFixed(2)})`);
      beamGrad.addColorStop(1, `rgba(255, 224, 102, ${(0.55 * alpha).toFixed(2)})`);
      ctx.fillStyle = beamGrad;
      ctx.fillRect(px - 22, py - 95, 44, 100);
      // Concentric expanding oval rings at feet
      ctx.strokeStyle = `rgba(255, 224, 102, ${(0.9 * alpha).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(px, py, 12 + progress * 34, 6 + progress * 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(136, 224, 255, ${(0.85 * alpha).toFixed(2)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(px, py, 6 + progress * 22, 3 + progress * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Rising motes
      for (const sp of te.sparks) {
        const sx = px + Math.cos(sp.angle + progress * 3) * (sp.radius + progress * 10);
        const sy = py + sp.yOff * SCALE * 0.55;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sx), Math.round(sy), 4, 4);
      }
      ctx.restore();
    }

    for (const ip of this.interactParticles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ip.life / 0.9);
      ctx.fillStyle = ip.color;
      ctx.fillRect(Math.round(ip.x * SCALE), Math.round(ip.y * SCALE), 4, 4);
      ctx.restore();
    }

    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, ft.life / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '700 12px "Noto Sans SC", "IBM Plex Mono", sans-serif';
      ctx.textAlign = "center";
      ctx.fillStyle = "#241a15";
      ctx.fillText(ft.text, Math.round(ft.x * SCALE) + 1, Math.round(ft.y * SCALE) + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, Math.round(ft.x * SCALE), Math.round(ft.y * SCALE));
      ctx.restore();
    }

    if (this.player.sitting && !this.pausedForDialog) {
      this.drawLabel(
        ctx,
        "起身 [WASD / E]",
        (this.player.x + 0.5) * tsPx,
        (this.player.y - 0.55) * tsPx,
        "#241a15",
        "#e8cf74"
      );
    }

    // 4. In-world Bouncing Guide Arrow & Proximity Interaction Prompt
    const guidedTarget = !this.pausedForDialog ? this.getGuidedTarget() : null;
    if (guidedTarget) {
      const gBob = Math.sin(this.elapsed * 5) * 4;
      const gX = Math.round(guidedTarget.x * tsPx);
      const yOffset = guidedTarget.kind === "item" ? 0.72 : 0.55;
      const gY = Math.round((guidedTarget.y - yOffset) * tsPx + gBob);
      this.drawPixelDownArrow(ctx, gX, gY, "#f7d06b", "#241a15", 1);
    }

    if (this.nearbyTarget && !this.pausedForDialog) {
      const nBob = Math.sin(this.elapsed * 7) * 3;
      const nx = Math.round((this.nearbyTarget.x + 0.5) * tsPx);
      const nyOffset = this.nearbyTarget.kind === "item" ? 0.72 : this.nearbyTarget.kind === "fountain" ? 0.5 : 0.35;
      const ny = Math.round((this.nearbyTarget.y - nyOffset) * tsPx + nBob);
      this.drawPixelDownArrow(ctx, nx, ny, "#7ef29d", "#183622", this.nearbyTarget.kind === "fountain" ? 0.95 : 0.85);

      this.drawLabel(
        ctx,
        this.nearbyTarget.label,
        (this.player.x + 0.5) * tsPx,
        (this.player.y - 0.65) * tsPx,
        "#241a15",
        "#f7d06b"
      );
    }

    // 5. Dusk / Night Atmosphere Overlay
    if (this.activeMap.kind === "overworld" && this.timeOfDay !== "day") {
      ctx.save();
      ctx.fillStyle = this.timeOfDay === "dusk" ? "rgba(196, 98, 45, 0.22)" : "rgba(14, 22, 48, 0.52)";
      ctx.fillRect(camX, camY, this.viewW, this.viewH);

      if (this.timeOfDay === "night") {
        ctx.globalCompositeOperation = "lighter";
        for (const p of this.activeMap.props) {
          if (p.type !== "lamp" && p.type !== "campfire") continue;
          const gx = (p.x + 0.5) * tsPx;
          const gy = p.y * tsPx;
          const radius = p.type === "campfire" ? tsPx * 3.2 : tsPx * 2.5;
          const grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, radius);
          grad.addColorStop(0, p.type === "campfire" ? "rgba(255, 168, 72, 0.55)" : "rgba(255, 208, 102, 0.42)");
          grad.addColorStop(1, "rgba(255, 208, 102, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(gx - radius, gy - radius, radius * 2, radius * 2);
        }
      }
      ctx.restore();
    }

    ctx.restore();

    // 6. Off-screen Edge Compass Arrow in Screen Space
    this.renderEdgeGuideArrow(ctx, guidedTarget, camX, camY, tsPx);

    this.renderMinimap(guidedTarget);
  }

  drawPixelDownArrow(ctx, cx, tipY, fill, outline, scale = 1) {
    ctx.save();
    ctx.translate(cx, tipY);
    ctx.scale(scale, scale);
    ctx.fillStyle = outline;
    ctx.fillRect(-4, -18, 8, 9);
    ctx.fillRect(-9, -11, 18, 5);
    ctx.fillRect(-6, -6, 12, 3);
    ctx.fillRect(-3, -3, 6, 3);
    ctx.fillStyle = fill;
    ctx.fillRect(-2, -16, 4, 7);
    ctx.fillRect(-7, -10, 14, 3);
    ctx.fillRect(-4, -7, 8, 3);
    ctx.fillRect(-2, -4, 4, 3);
    ctx.restore();
  }

  renderEdgeGuideArrow(ctx, guidedTarget, camX, camY, tsPx) {
    this.edgeGuideRect = null;
    if (!guidedTarget || this.pausedForDialog) return;

    const targetScreenX = guidedTarget.x * tsPx - camX;
    const targetScreenY = guidedTarget.y * tsPx - camY;
    const headerEl = typeof document !== "undefined" ? document.querySelector(".hud-topbar") : null;
    const headerBottom = headerEl ? Math.ceil(headerEl.getBoundingClientRect().bottom) : 64;
    const padX = 52;
    const padTop = Math.max(78, headerBottom + 12);
    const padBottom = this.viewW <= 900 ? 156 : 138;

    const inView =
      targetScreenX >= padX &&
      targetScreenX <= this.viewW - padX &&
      targetScreenY >= padTop &&
      targetScreenY <= this.viewH - padBottom;
    if (inView) return;

    const cx = this.viewW / 2;
    const cy = (padTop + (this.viewH - padBottom)) / 2;
    const dx = targetScreenX - cx;
    const dy = targetScreenY - cy;
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.max(padX, Math.min(this.viewW - padX, targetScreenX));
    const clampedY = Math.max(padTop, Math.min(this.viewH - padBottom, targetScreenY));
    const distTiles = Math.round(Math.hypot(guidedTarget.x - this.player.x, guidedTarget.y - this.player.y));

    const localizedGuideName = localizeLabel(guidedTarget.name);
    const baseName = localizedGuideName.replace(/\s*[（(].*$/, "").trim() || localizedGuideName;
    const shortName = baseName.length > 12 ? `${baseName.slice(0, 11)}…` : baseName;
    const labelText = `${getLang() === "en" ? "Guide " : "指引 "}${shortName} · ${distTiles}m`;

    ctx.save();
    ctx.font = '600 11.5px "Noto Sans SC", system-ui, sans-serif';
    const pillW = Math.ceil(ctx.measureText(labelText).width) + 34;
    const pillH = 26;
    const placeLeft = clampedX > this.viewW - 220;
    const pillX = Math.round(
      Math.max(14, Math.min(this.viewW - pillW - 14, placeLeft ? clampedX - pillW - 18 : clampedX + 18))
    );
    const pillY = Math.round(Math.max(padTop, Math.min(this.viewH - padBottom - pillH, clampedY - pillH / 2)));

    // Draw pill badge
    ctx.fillStyle = "rgba(36, 26, 21, 0.94)";
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeStyle = "#d99b38";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pillX + 0.5, pillY + 0.5, pillW - 1, pillH - 1);

    ctx.fillStyle = "#f5edd6";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, pillX + 24, pillY + pillH / 2 + 0.5);

    // Draw directional pixel arrow inside pill left edge
    ctx.save();
    ctx.translate(pillX + 13, pillY + pillH / 2);
    ctx.rotate(angle);
    ctx.fillStyle = "#f7d06b";
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    this.edgeGuideRect = { x: pillX, y: pillY, w: pillW, h: pillH, target: guidedTarget };
  }

  drawLabel(ctx, text, cx, y, fg, bg) {
    ctx.save();
    ctx.font = '600 11px "Noto Sans SC", system-ui, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 12;
    const x = Math.round(cx - w / 2);
    const top = Math.round(y - 16);
    ctx.fillStyle = bg;
    ctx.fillRect(x, top, w, 17);
    ctx.strokeStyle = "#8c693a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, top + 0.5, w - 1, 16);
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, Math.round(cx), top + 9);
    ctx.restore();
  }

  drawStatusBadge(ctx, talked, cx, cy) {
    ctx.save();
    const x = Math.round(cx - 8);
    const y = Math.round(cy - 8);
    ctx.fillStyle = talked ? "#193d25" : "#4d3d1e";
    ctx.fillRect(x, y, 16, 16);
    ctx.strokeStyle = talked ? "#49b86b" : "#e8cf74";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
    ctx.fillStyle = talked ? "#63e689" : "#fff2a6";
    ctx.font = 'bold 12px "Silkscreen", "Noto Sans SC", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(talked ? "✓" : "?", Math.round(cx), y + 8.5);
    ctx.restore();
  }

  drawSpeechPill(ctx, text, cx, y) {
    ctx.save();
    ctx.font = '500 10.5px "IBM Plex Mono", "Noto Sans SC", monospace';
    const label = text.length >= 26 ? `${text}…` : text;
    const w = Math.ceil(ctx.measureText(label).width) + 12;
    const x = Math.round(cx - w / 2);
    const top = Math.round(y - 18);
    ctx.fillStyle = "#f5edd6";
    ctx.fillRect(x, top, w, 17);
    ctx.strokeStyle = "#241a15";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, top, w, 17);
    ctx.fillStyle = "#241a15";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, Math.round(cx), top + 9);
    ctx.restore();
  }

  renderMinimap(guidedTarget) {
    if (!this.activeMap || !this.minimapCtx) return;
    const mctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    if (this.activeMap.kind === "interior") {
      const room = this.activeMap;
      const sx = mw / room.width;
      const sy = mh / room.height;
      mctx.fillStyle = "#2b1c15";
      mctx.fillRect(0, 0, mw, mh);

      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) {
          const t = room.tiles[y * room.width + x];
          if (t === T_WALL) mctx.fillStyle = "#3d2a20";
          else if (t === T_RUG) mctx.fillStyle = "#a34031";
          else mctx.fillStyle = "#8f5e39";
          mctx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
        }
      }
      // Exit mat
      mctx.fillStyle = "#e06c53";
      mctx.fillRect(Math.floor(7 * sx), Math.floor(9 * sy), Math.ceil(2 * sx), Math.ceil(sy));
      // Items
      mctx.fillStyle = "#d99b38";
      for (const it of room.items) {
        mctx.fillRect(Math.floor(it.x * sx), Math.floor(it.y * sy), Math.ceil(sx), Math.ceil(sy));
      }
      // Keeper
      mctx.fillStyle = "#7fc8f8";
      mctx.fillRect(Math.floor(room.keeper.x * sx), Math.floor(room.keeper.y * sy), Math.ceil(sx), Math.ceil(sy));
      // Player
      mctx.fillStyle = "#ffea61";
      mctx.fillRect(Math.floor(this.player.x * sx) - 2, Math.floor(this.player.y * sy) - 2, 7, 7);
      return;
    }

    if (!this.overworld) return;
    const ow = this.overworld;
    const zoom = this.minimapZoom || 1;
    const viewW = ow.width / zoom;
    const viewH = ow.height / zoom;
    let viewX = 0;
    let viewY = 0;
    if (zoom > 1) {
      if (this.minimapManualPan) {
        viewX = Math.max(0, Math.min(ow.width - viewW, this.minimapPan.x));
        viewY = Math.max(0, Math.min(ow.height - viewH, this.minimapPan.y));
        this.minimapPan.x = viewX;
        this.minimapPan.y = viewY;
      } else {
        viewX = Math.max(0, Math.min(ow.width - viewW, this.player.x + 0.5 - viewW / 2));
        viewY = Math.max(0, Math.min(ow.height - viewH, this.player.y + 0.5 - viewH / 2));
        this.minimapPan = { x: viewX, y: viewY };
      }
    }
    this.minimapView = { x: viewX, y: viewY, w: viewW, h: viewH };

    const sx = mw / viewW;
    const sy = mh / viewH;
    const toMX = (wx) => (wx - viewX) * sx;
    const toMY = (wy) => (wy - viewY) * sy;

    const theme = this.theme || TOWN_THEMES.meadow;
    mctx.fillStyle = theme.minimapGrass;
    mctx.fillRect(0, 0, mw, mh);

    const x0 = Math.max(0, Math.floor(viewX));
    const x1 = Math.min(ow.width - 1, Math.ceil(viewX + viewW));
    const y0 = Math.max(0, Math.floor(viewY));
    const y1 = Math.min(ow.height - 1, Math.ceil(viewY + viewH));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = ow.tiles[y * ow.width + x];
        if (t === T_WATER) mctx.fillStyle = theme.minimapWater;
        else if (t === T_PATH) mctx.fillStyle = theme.minimapPath;
        else if (t === T_PLAZA) mctx.fillStyle = theme.plazaBase || theme.minimapPath;
        else if (t === T_BRIDGE) mctx.fillStyle = "#8f5e39";
        else continue;
        mctx.fillRect(Math.floor(toMX(x)), Math.floor(toMY(y)), Math.ceil(sx), Math.ceil(sy));
      }
    }

    // Windmill & Campfire subtle landmark dots
    if (ow.windmill) {
      mctx.fillStyle = "#c85a3a";
      mctx.fillRect(Math.floor(toMX(ow.windmill.x)), Math.floor(toMY(ow.windmill.y)), Math.ceil(2 * sx), Math.ceil(2 * sy));
    }
    for (const p of ow.props) {
      if (p.type === "campfire") {
        mctx.fillStyle = "#ff8c42";
        mctx.fillRect(Math.floor(toMX(p.x)) - 2, Math.floor(toMY(p.y)) - 2, 6, 6);
      }
    }

    // Fountain marker
    const f = ow.fountain;
    mctx.fillStyle = "#62b5db";
    mctx.fillRect(Math.floor(toMX(f.x)), Math.floor(toMY(f.y)), Math.ceil(2 * sx), Math.ceil(2 * sy));
    mctx.fillStyle = "#d4f3ff";
    mctx.fillRect(Math.floor(toMX(f.x + 0.5)), Math.floor(toMY(f.y + 0.5)), 4, 4);

    // Buildings
    for (const b of ow.buildings) {
      mctx.fillStyle = this.visitedBuildings.has(b.id) ? "#b88948" : "#d99b38";
      mctx.fillRect(Math.floor(toMX(b.bx)), Math.floor(toMY(b.by)), Math.ceil(3 * sx), Math.ceil(3 * sy));
    }

    // Mayor marker
    if (ow.mayor) {
      const mx = Math.round(toMX(ow.mayor.x + 0.5));
      const my = Math.round(toMY(ow.mayor.y + 0.5));
      mctx.fillStyle = "#241a15";
      mctx.fillRect(mx - 4, my - 4, 9, 9);
      mctx.fillStyle = "#ffd966";
      mctx.fillRect(mx - 3, my - 3, 7, 7);
    }

    // Villagers (green if talked, pale yellow if untalked)
    for (const v of ow.villagers) {
      const vx = Math.round(toMX(v.x));
      const vy = Math.round(toMY(v.y));
      mctx.fillStyle = "#241a15";
      mctx.fillRect(vx - 3, vy - 3, 7, 7);
      mctx.fillStyle = this.talkedVillagers.has(v.id) ? "#63e689" : "#fff2a6";
      mctx.fillRect(vx - 2, vy - 2, 5, 5);
    }

    // High-contrast Slimes (coral-red diamond with dark border, or muted green if defeated)
    for (const s of ow.slimes) {
      const mx = Math.round(toMX(s.x + 0.5));
      const my = Math.round(toMY(s.y + 0.5));
      const defeated = this.defeatedSlimes.has(s.id);
      mctx.save();
      mctx.translate(mx, my);
      mctx.rotate(Math.PI / 4);
      mctx.fillStyle = "#241a15";
      mctx.fillRect(-5, -5, 10, 10);
      mctx.fillStyle = defeated ? "#54a86e" : "#ff6b6b";
      mctx.fillRect(-4, -4, 8, 8);
      mctx.fillStyle = defeated ? "#c8f7d6" : "#fff3b0";
      mctx.fillRect(-1, -1, 3, 3);
      mctx.restore();
    }

    // Guided target pulsing ring
    if (guidedTarget && this.activeMap?.kind === "overworld") {
      const pulse = 1 + Math.sin(this.elapsed * 6) * 0.35;
      mctx.strokeStyle = "#fff199";
      mctx.lineWidth = 2.5;
      mctx.beginPath();
      mctx.arc(toMX(guidedTarget.x), toMY(guidedTarget.y), 10 * pulse, 0, Math.PI * 2);
      mctx.stroke();
    }

    // Camera viewport box
    const tsPx = TILE_SIZE * SCALE;
    const vx = toMX(this.camera.x / tsPx);
    const vy = toMY(this.camera.y / tsPx);
    const vw = (this.viewW / tsPx) * sx;
    const vh = (this.viewH / tsPx) * sy;
    mctx.strokeStyle = "rgba(245, 237, 214, 0.82)";
    mctx.lineWidth = 2;
    mctx.strokeRect(Math.round(vx) + 1, Math.round(vy) + 1, Math.round(vw), Math.round(vh));

    // Building, Fountain & Slime small text labels on HiDPI minimap
    const shortMinimapName = (raw) => {
      const stripped = (raw || "").replace(/\s*[（(].*$/, "").trim() || raw || "";
      const noPrefix = stripped.replace(/^(react-|deepseek-)/i, "");
      const candidate = noPrefix.length >= 3 ? noPrefix : stripped;
      const isAscii = /^[\x00-\x7F]+$/.test(candidate);
      const maxLen = isAscii ? 9 : 5;
      return candidate.length > maxLen ? `${candidate.slice(0, maxLen - 1)}…` : candidate;
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fontPx = Math.max(13, Math.round(9.5 * dpr));
    const tagH = Math.round(fontPx * 1.25);

    mctx.save();
    mctx.font = `700 ${fontPx}px "Noto Sans SC", "IBM Plex Mono", sans-serif`;
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    const placedBoxes = [];

    const drawMiniTag = (text, cx, cy, fg = "#f5edd6", bg = "rgba(24, 16, 12, 0.86)") => {
      if (cx < -20 || cx > mw + 20 || cy < -20 || cy > mh + 20) return;
      const w = Math.ceil(mctx.measureText(text).width) + 8;
      const h = tagH;
      const x = Math.round(Math.max(4, Math.min(mw - w - 4, cx - w / 2)));
      let y = Math.round(Math.max(4, Math.min(mh - h - 4, cy - h / 2)));
      for (const box of placedBoxes) {
        if (x < box.x + box.w + 2 && x + w + 2 > box.x && Math.abs(y - box.y) < h) {
          y = Math.min(mh - h - 4, box.y + h + 2);
        }
      }
      placedBoxes.push({ x, y, w, h });
      mctx.fillStyle = bg;
      mctx.fillRect(x, y, w, h);
      mctx.fillStyle = fg;
      mctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
    };

    for (const b of ow.buildings) {
      const label = shortMinimapName(localizeLabel(b.name));
      drawMiniTag(label, toMX(b.bx + 1.5), toMY(b.by) - Math.round(tagH * 0.6));
    }
    const isEnMini = getLang() === "en";
    drawMiniTag(isEnMini ? "Pool" : "喷泉", toMX(f.x + 1), toMY(f.y + 2) + Math.round(tagH * 0.65), "#a8ecff");

    if (zoom >= 1.5 || mw >= 520) {
      if (ow.windmill) {
        drawMiniTag(isEnMini ? "Mill" : "风车", toMX(ow.windmill.x + 1), toMY(ow.windmill.y) - Math.round(tagH * 0.65), "#ffcfb3");
      }
      for (const s of ow.slimes) {
        if (!this.defeatedSlimes.has(s.id)) {
          drawMiniTag(isEnMini ? "TODO" : "待办", toMX(s.x + 0.5), toMY(s.y) - Math.round(tagH * 0.65), "#ffb3b3");
        }
      }
    }
    mctx.restore();

    // Player pulse
    const px = Math.floor(toMX(this.player.x));
    const py = Math.floor(toMY(this.player.y));
    mctx.fillStyle = "#241a15";
    mctx.fillRect(px - 5, py - 5, 11, 11);
    mctx.fillStyle = "#ffea61";
    mctx.fillRect(px - 3, py - 3, 7, 7);
  }
}
