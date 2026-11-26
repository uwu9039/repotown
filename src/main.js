import { GameEngine } from "./engine/gameEngine.js";
import { getPresetWorlds } from "./data/presets.js";
import { HudController } from "./ui/hud.js";
import { getLang } from "./i18n/i18n.js";

function bootstrap() {
  const presets = getPresetWorlds();
  let hud = null;

  const engine = new GameEngine({
    canvas: document.getElementById("game-canvas"),
    minimapCanvas: document.getElementById("minimap-canvas"),
    curtainEl: document.getElementById("transition-curtain"),
    onZoneChange: (zone) => {
      const zoneEl = document.getElementById("hud-zone-name");
      if (zoneEl) zoneEl.textContent = zone;
      hud?.positionTourCard();
    },
    onInteract: (target) => hud?.handleInteract(target),
    onGuideChange: (target) => {
      if (target) {
        const prefix = getLang() === "en" ? "Compass target: " : "已切换指引目标：";
        hud?.showToast(`${prefix}${target.name}`);
      }
    },
    onVillagerTalked: (talked, total) => {
      hud?.updateVillagerStat(talked, total);
    },
    onSitChange: (sitting) => {
      if (sitting) {
        hud?.showToast(getLang() === "en" ? "Resting on seat. Press WASD or E to stand." : "已坐下休息，按 WASD 或 E 即可起身");
      }
    },
    onExplorationChange: () => {
      hud?.refreshCodexBadge();
      hud?.updateSlimeStat(engine.defeatedSlimes.size, engine.overworld?.slimes?.length || 0);
    },
    onPlayerMove: () => hud?.notifyTourEvent("move"),
    onEnterBuilding: () => hud?.notifyTourEvent("enter_building"),
  });

  hud = new HudController({ engine, presets });

  // Load default town immediately so the stage is alive in <100ms
  hud.loadWorld(presets["react-town"]);
  engine.start();
  hud.openLangChooser();

  // If URL carries ?repo=owner/repo, automatically load that GitHub repository
  const params = new URLSearchParams(window.location.search);
  const queryRepo = params.get("repo");
  if (queryRepo) {
    hud.loadGitHubRepo(queryRepo);
  }
}

bootstrap();
