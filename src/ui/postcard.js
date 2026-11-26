import { getSpriteAtlas, TOWN_THEMES } from "../engine/spriteAtlas.js";
import { T_GRASS_0, T_PATH, T_PLAZA, T_WATER, T_BRIDGE } from "../world/worldGenerator.js";
import { getLang, localizeLabel } from "../i18n/i18n.js";

/**
 * Renders an exportable 960x580 pixel-art souvenir postcard of the active town.
 */
export function renderTownPostcard(canvas, worldModel, overworld) {
  if (!canvas || !worldModel || !overworld) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // Outer timber frame & parchment card
  ctx.fillStyle = "#241a15";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#d99b38";
  ctx.fillRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = "#f5edd6";
  ctx.fillRect(16, 16, W - 32, H - 32);

  // Header strip
  ctx.fillStyle = "#241a15";
  ctx.font = 'bold 28px "Silkscreen", "Noto Sans SC", monospace';
  ctx.fillText(worldModel.title.slice(0, 32), 40, 62);

  ctx.fillStyle = "#5c493b";
  ctx.font = '500 15px "IBM Plex Mono", "Noto Sans SC", monospace';
  ctx.fillText(localizeLabel(worldModel.subtitle) || "RepoTown 2D Pixel RPG", 40, 90);

  // Right stamp
  ctx.strokeStyle = "#c85a3a";
  ctx.lineWidth = 3;
  ctx.strokeRect(W - 178, 34, 134, 62);
  ctx.fillStyle = "#c85a3a";
  ctx.font = 'bold 14px "Silkscreen", monospace';
  ctx.fillText("REPOTOWN", W - 162, 60);
  ctx.font = '12px "IBM Plex Mono", monospace';
  ctx.fillText("2026 EDITION", W - 162, 80);

  // Map viewport frame (left 600x390)
  const mapX = 40;
  const mapY = 116;
  const mapW = 588;
  const mapH = 392;
  ctx.fillStyle = "#18100c";
  ctx.fillRect(mapX - 4, mapY - 4, mapW + 8, mapH + 8);

  const themeKey = worldModel.themeKey || "meadow";
  const theme = TOWN_THEMES[themeKey] || TOWN_THEMES.meadow;
  const atlas = getSpriteAtlas(themeKey);
  const tilePxW = mapW / overworld.width;
  const tilePxH = mapH / overworld.height;

  for (let y = 0; y < overworld.height; y++) {
    for (let x = 0; x < overworld.width; x++) {
      const t = overworld.tiles[y * overworld.width + x];
      let color = theme.minimapGrass;
      if (t === T_GRASS_0) color = theme.minimapGrass;
      else if (t === T_PATH) color = theme.pathBase;
      else if (t === T_PLAZA) color = theme.plazaBase;
      else if (t === T_WATER) color = theme.minimapWater;
      else if (t === T_BRIDGE) color = "#825534";
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.floor(mapX + x * tilePxW),
        Math.floor(mapY + y * tilePxH),
        Math.ceil(tilePxW),
        Math.ceil(tilePxH)
      );
    }
  }

  for (const t of overworld.trees) {
    const treeSpr = t.variant === "oak"
      ? atlas.scenery.oakTree
      : t.variant === "autumn"
        ? atlas.scenery.autumnTree
        : atlas.scenery.tree;
    ctx.drawImage(
      treeSpr,
      Math.floor(mapX + t.x * tilePxW),
      Math.floor(mapY + (t.y - 0.2) * tilePxH),
      Math.ceil(tilePxW),
      Math.ceil(tilePxH * 1.25)
    );
  }

  for (const b of overworld.buildings) {
    const spr = atlas.buildings[b.style] || atlas.buildings.cottage;
    ctx.drawImage(
      spr,
      Math.floor(mapX + b.bx * tilePxW),
      Math.floor(mapY + b.by * tilePxH),
      Math.ceil(3 * tilePxW),
      Math.ceil(3 * tilePxH)
    );
  }

  for (const s of overworld.slimes) {
    const sf = (atlas.slimes[s.severity] || atlas.slimes.green)[0];
    ctx.drawImage(sf, Math.floor(mapX + s.x * tilePxW), Math.floor(mapY + s.y * tilePxH), Math.ceil(tilePxW), Math.ceil(tilePxH));
  }

  // Right stats & buildings directory panel
  const colX = 656;
  ctx.fillStyle = "#e6dab8";
  ctx.fillRect(colX, mapY, 264, mapH);
  ctx.strokeStyle = "#cbb98c";
  ctx.lineWidth = 2;
  ctx.strokeRect(colX, mapY, 264, mapH);

  const isEn = getLang() === "en";
  ctx.fillStyle = "#241a15";
  ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
  ctx.fillText(isEn ? "Town Overview" : "小镇统计概览", colX + 18, mapY + 32);

  const statsLines = isEn
    ? [
        `Buildings: ${worldModel.buildings.length}`,
        `Scrolls: ${worldModel.stats.files}`,
        `Villagers: ${worldModel.villagers.length}`,
        `Slimes: ${worldModel.slimes.length}`,
        `Language: ${worldModel.stats.language || "Mixed"}`,
      ]
    : [
        `建筑数量：${worldModel.buildings.length} 栋`,
        `藏书 / 文件：${worldModel.stats.files} 份`,
        `活跃村民：${worldModel.villagers.length} 位`,
        `郊外史莱姆：${worldModel.slimes.length} 只`,
        `主要语言：${worldModel.stats.language || "Mixed"}`,
      ];
  ctx.font = '500 13.5px "IBM Plex Mono", "Noto Sans SC", monospace';
  ctx.fillStyle = "#5c493b";
  statsLines.forEach((line, i) => {
    ctx.fillText(line, colX + 18, mapY + 64 + i * 26);
  });

  ctx.fillStyle = "#241a15";
  ctx.font = 'bold 15px "Noto Sans SC", sans-serif';
  ctx.fillText(isEn ? "Key Landmarks" : "主要街区地标", colX + 18, mapY + 218);

  ctx.font = '500 12.5px "IBM Plex Mono", "Noto Sans SC", monospace';
  ctx.fillStyle = "#3a2c23";
  worldModel.buildings.slice(0, 6).forEach((b, i) => {
    ctx.fillText(`• ${localizeLabel(b.name).slice(0, 22)}`, colX + 18, mapY + 246 + i * 22);
  });

  // Footer
  ctx.fillStyle = "#5c493b";
  ctx.font = '500 12px "IBM Plex Mono", sans-serif';
  ctx.fillText("Generated locally with RepoTown · Explore any GitHub repo or Markdown as a 2D RPG Town", 40, H - 32);
}
