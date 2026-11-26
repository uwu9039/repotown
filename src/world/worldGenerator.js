/**
 * Deterministic 2D tilemap generator for both the overworld town and building interiors.
 * Guarantees unobstructed spawn, clear cobblestone avenues to every doorway, and reachable interactables.
 */

export const TILE_SIZE = 16;

// Tile codes
export const T_GRASS_0 = 0;
export const T_GRASS_1 = 1;
export const T_GRASS_2 = 2;
export const T_GRASS_3 = 3;
export const T_PATH = 4;
export const T_PLAZA = 5;
export const T_WATER = 6;
export const T_BRIDGE = 7;
export const T_WOOD = 8;
export const T_RUG = 9;
export const T_WALL = 10;

function seededHash(x, y, seed = 42) {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// 17 guaranteed non-overlapping 3x3 building plots on a 56x42 map
// Center plaza occupies x:23..33, y:16..24 (center 28,20)
const BUILDING_SLOTS = [
  { bx: 24, by: 9 },
  { bx: 17, by: 9 },
  { bx: 31, by: 9 },
  { bx: 10, by: 9 },
  { bx: 38, by: 9 },
  { bx: 15, by: 15 },
  { bx: 37, by: 15 },
  { bx: 8, by: 15 },
  { bx: 44, by: 15 },
  { bx: 15, by: 22 },
  { bx: 37, by: 22 },
  { bx: 8, by: 22 },
  { bx: 44, by: 22 },
  { bx: 22, by: 29 },
  { bx: 30, by: 29 },
  { bx: 14, by: 29 },
  { bx: 38, by: 29 },
];

export function generateOverworld(worldModel) {
  const width = 56;
  const height = 42;
  const tiles = new Uint8Array(width * height);
  const solid = new Uint8Array(width * height); // 1 = blocked

  const idx = (x, y) => y * width + x;
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;

  // 1. Base grass texture
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = seededHash(x, y, 17);
      tiles[idx(x, y)] = r < 0.62 ? T_GRASS_0 : r < 0.82 ? T_GRASS_1 : r < 0.92 ? T_GRASS_2 : T_GRASS_3;
    }
  }

  // 2. Scenic river on the far east (x = 50..51) with wooden bridge at y = 19..21
  for (let y = 3; y < height - 3; y++) {
    for (const rx of [50, 51]) {
      if (y >= 19 && y <= 21) {
        tiles[idx(rx, y)] = T_BRIDGE;
      } else {
        tiles[idx(rx, y)] = T_WATER;
        solid[idx(rx, y)] = 1;
      }
    }
  }

  // 3. Central Town Plaza (x: 23..33, y: 16..24)
  const cx = 28;
  const cy = 20;
  for (let y = 16; y <= 24; y++) {
    for (let x = 23; x <= 33; x++) {
      tiles[idx(x, y)] = T_PLAZA;
    }
  }

  // Ring avenue around plaza so all roads connect smoothly
  const carvePath = (x1, y1, x2, y2) => {
    const stepX = x1 <= x2 ? 1 : -1;
    for (let x = x1; x !== x2 + stepX; x += stepX) {
      if (inBounds(x, y1) && tiles[idx(x, y1)] < T_PATH) tiles[idx(x, y1)] = T_PATH;
    }
    const stepY = y1 <= y2 ? 1 : -1;
    for (let y = y1; y !== y2 + stepY; y += stepY) {
      if (inBounds(x2, y) && tiles[idx(x2, y)] < T_PATH) tiles[idx(x2, y)] = T_PATH;
    }
  };

  // Main cardinal roads
  carvePath(8, cy, 53, cy);
  carvePath(cx, 12, cx, 33);

  // 4. Fountain (2x2 at 27, 17), Noticeboard (24, 19), Mayor NPC (31, 19)
  const fountain = { x: 27, y: 17, w: 2, h: 2 };
  solid[idx(27, 17)] = 1;
  solid[idx(28, 17)] = 1;
  solid[idx(27, 18)] = 1;
  solid[idx(28, 18)] = 1;

  const props = [];
  const groundDecos = []; // Non-blocking flower beds, crop patches, lilypads
  const interactables = [];

  // Western Tranquil Pond (x: 4..7, y: 26..28)
  for (let py = 26; py <= 28; py++) {
    for (let px = 4; px <= 7; px++) {
      tiles[idx(px, py)] = T_WATER;
      solid[idx(px, py)] = 1;
    }
  }
  groundDecos.push({ type: "lilypad", x: 5, y: 27 });
  groundDecos.push({ type: "lilypad", x: 6, y: 26 });
  solid[idx(8, 27)] = 1;
  props.push({ type: "bench", x: 8, y: 27, sittable: true });

  // Southern Woodland Campfire & Stump Seats (x: 19, y: 35)
  solid[idx(19, 35)] = 1;
  props.push({ type: "campfire", x: 19, y: 35 });
  for (const [sx, sy] of [[18, 35], [20, 35], [19, 36]]) {
    solid[idx(sx, sy)] = 1;
    props.push({ type: "stump", x: sx, y: sy, sittable: true });
  }

  // Eastern Scenic Windmill & Fenced Crops (across wooden bridge)
  const windmill = { x: 52, y: 16 };
  for (let wy = 16; wy <= 17; wy++) {
    for (let wx = 52; wx <= 53; wx++) {
      solid[idx(wx, wy)] = 1;
    }
  }
  for (const [cxp, cyp] of [[52, 22], [53, 22], [52, 23], [53, 23]]) {
    groundDecos.push({ type: "cropPatch", x: cxp, y: cyp });
  }
  for (const [fxp, fyp] of [[49, 18], [49, 22], [52, 18], [53, 18]]) {
    groundDecos.push({ type: "flowerBed", x: fxp, y: fyp });
  }

  // Northern Orchard & Garden Beds
  for (const [nx, ny] of [[20, 5], [21, 5], [22, 5], [34, 5], [35, 5], [36, 5]]) {
    groundDecos.push({ type: "cropPatch", x: nx, y: ny });
  }
  for (const [fx, fy] of [[20, 4], [21, 4], [22, 4], [34, 4], [35, 4], [36, 4]]) {
    solid[idx(fx, fy)] = 1;
    props.push({ type: "fenceH", x: fx, y: fy });
  }
  for (const [bx, by] of [[25, 16], [31, 16]]) {
    solid[idx(bx, by)] = 1;
    props.push({ type: "bench", x: bx, y: by, sittable: true });
  }

  // Noticeboard (README)
  solid[idx(24, 19)] = 1;
  props.push({ type: "sign", x: 24, y: 19 });
  interactables.push({
    id: "readme-board",
    kind: "sign",
    x: 24,
    y: 19,
    title: `${worldModel.title} · 镇中心公告牌`,
    subtitle: worldModel.subtitle,
    role: "README",
    body: worldModel.introText,
    url: worldModel.sourceUrl || "",
  });

  // Mayor NPC
  const renderedBuildingCount = Math.min((worldModel.buildings || []).length, BUILDING_SLOTS.length);
  const mayor = {
    id: "mayor",
    kind: "mayor",
    name: "镇长 (向导)",
    x: 31,
    y: 19,
    dir: "down",
    title: `${worldModel.title} · 镇长`,
    subtitle: `${renderedBuildingCount} 栋建筑 · ${worldModel.stats.files} 份文档/文件`,
    role: "向导",
    body: `${worldModel.introText}\n\n【探索指南】\n1. 沿石板路走到任意屋子门口，按 [E] 或走入木门即可进屋翻阅代码与文章。\n2. 镇上溜达的村民代表近期提交记录；郊外蹦跳的史莱姆则是待解决的 Issue / 待办！`,
    url: worldModel.sourceUrl || "",
  };

  // Streetlamps around plaza
  for (const [lx, ly] of [
    [23, 16],
    [33, 16],
    [23, 24],
    [33, 24],
  ]) {
    solid[idx(lx, ly)] = 1;
    props.push({ type: "lamp", x: lx, y: ly });
  }

  // 5. Place Buildings & Carve Paths to Doorsteps
  const buildings = [];
  const sourceBuildings = (worldModel.buildings || []).slice(0, BUILDING_SLOTS.length);

  sourceBuildings.forEach((b, i) => {
    const slot = BUILDING_SLOTS[i];
    const doorX = slot.bx + 1;
    const doorY = slot.by + 2;
    const stepY = slot.by + 3;

    // Mark 3x3 building tiles solid, except leave door center triggerable
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        solid[idx(slot.bx + dx, slot.by + dy)] = 1;
      }
    }

    // Carve doorstep and connect cleanly to plaza
    tiles[idx(doorX, stepY)] = T_PATH;
    solid[idx(doorX, stepY)] = 0;
    carvePath(doorX, stepY, cx, stepY <= 15 ? 16 : stepY >= 25 ? 24 : cy);

    // Optional decorative lamp beside door
    if (i % 2 === 0 && !solid[idx(slot.bx - 1, stepY)]) {
      solid[idx(slot.bx - 1, stepY)] = 1;
      props.push({ type: "lamp", x: slot.bx - 1, y: stepY });
    }

    buildings.push({
      ...b,
      bx: slot.bx,
      by: slot.by,
      doorX,
      doorY,
      stepY,
    });
  });

  // 6. Perimeter Forest Border (mixed pine, oak, and autumn trees)
  const trees = [];
  const pickTreeVariant = (x, y) => {
    const r = seededHash(x, y, 777);
    if (r > 0.72) return "autumn";
    if (r > 0.42) return "oak";
    return "pine";
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Keep Eastern Windmill clearing open
      if (x >= 52 && x <= 53 && y >= 15 && y <= 24) continue;
      const isBorder = x <= 2 || x >= width - 3 || y <= 2 || y >= height - 3;
      if (isBorder && tiles[idx(x, y)] < T_PATH && !solid[idx(x, y)]) {
        if (seededHash(x, y, 99) > 0.12) {
          solid[idx(x, y)] = 1;
          trees.push({ x, y, variant: pickTreeVariant(x, y) });
        }
      }
    }
  }

  // 7. Decorative Outer Meadow Props (trees, bushes, rocks, stumps, flower beds)
  const spawnX = 28;
  const spawnY = 21;
  const slimeReserve = new Set(["6,6", "46,6", "6,35", "46,35", "14,5", "40,5", "14,36", "40,36"]);
  for (let y = 4; y < height - 4; y++) {
    for (let x = 4; x < width - 7; x++) {
      if (solid[idx(x, y)] || tiles[idx(x, y)] >= T_PATH) continue;
      if (Math.abs(x - spawnX) <= 2 && Math.abs(y - spawnY) <= 2) continue;
      if (slimeReserve.has(`${x},${y}`)) continue;
      const h = seededHash(x, y, 303);
      if (h > 0.972) {
        solid[idx(x, y)] = 1;
        trees.push({ x, y, variant: pickTreeVariant(x, y) });
      } else if (h > 0.952) {
        solid[idx(x, y)] = 1;
        props.push({ type: "bush", x, y });
      } else if (h > 0.938) {
        solid[idx(x, y)] = 1;
        props.push({ type: "rock", x, y });
      } else if (h > 0.928) {
        solid[idx(x, y)] = 1;
        props.push({ type: "stump", x, y, sittable: true });
      } else if (h > 0.905) {
        groundDecos.push({ type: "flowerBed", x, y });
      }
    }
  }

  // 8. Spawn Villagers along clear plaza / path tiles (calm patrol state)
  const villagerAnchors = [
    [25, 22], [31, 22], [22, 20], [34, 20], [28, 14], [19, 20], [37, 20],
  ];
  const villagers = (worldModel.villagers || []).slice(0, 7).map((v, i) => {
    const [vx, vy] = villagerAnchors[i % villagerAnchors.length];
    return {
      ...v,
      x: vx,
      y: vy,
      homeX: vx,
      homeY: vy,
      dir: "down",
      state: "idle",
      stateTimer: 1.5 + i * 0.6,
      targetX: vx,
      targetY: vy,
      walkCycle: 0,
      bubbleTimer: 2 + i * 1.4,
    };
  });

  // 9. Spawn Slimes on walkable grass meadows
  const slimeSlots = [
    [6, 6], [46, 6], [6, 35], [46, 35], [14, 5], [40, 5], [14, 36], [40, 36],
  ];
  const slimes = (worldModel.slimes || []).slice(0, 8).map((s, i) => {
    let [sx, sy] = slimeSlots[i % slimeSlots.length];
    // Find nearest non-solid grass tile if occupied
    if (solid[idx(sx, sy)]) {
      outer: for (let r = 1; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = sx + dx;
            const ny = sy + dy;
            if (inBounds(nx, ny) && !solid[idx(nx, ny)] && tiles[idx(nx, ny)] < T_PATH) {
              sx = nx;
              sy = ny;
              break outer;
            }
          }
        }
      }
    }
    return {
      ...s,
      x: sx,
      y: sy,
      homeX: sx,
      homeY: sy,
      phase: i * 0.8,
    };
  });

  return {
    kind: "overworld",
    width,
    height,
    tiles,
    solid,
    spawn: { x: spawnX, y: spawnY },
    fountain,
    windmill,
    trees,
    props,
    groundDecos,
    buildings,
    interactables,
    mayor,
    villagers,
    slimes,
  };
}

export function generateInterior(building) {
  const width = 16;
  const height = 11;
  const tiles = new Uint8Array(width * height);
  const solid = new Uint8Array(width * height);
  const idx = (x, y) => y * width + x;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isWall = y <= 1 || y === height - 1 || x === 0 || x === width - 1;
      if (isWall) {
        tiles[idx(x, y)] = T_WALL;
        solid[idx(x, y)] = 1;
      } else if (x >= 5 && x <= 10 && y >= 4 && y <= 7) {
        tiles[idx(x, y)] = T_RUG;
      } else {
        tiles[idx(x, y)] = T_WOOD;
      }
    }
  }

  // Exit doormat at bottom center (7..8, 9) and open exit door wall (7..8, 10)
  solid[idx(7, height - 1)] = 0;
  solid[idx(8, height - 1)] = 0;
  tiles[idx(7, height - 1)] = T_WOOD;
  tiles[idx(8, height - 1)] = T_WOOD;

  const props = [
    { type: "doormat", x: 7, y: 9 },
    { type: "doormat", x: 8, y: 9 },
    { type: "plant", x: 1, y: 2 },
    { type: "plant", x: 14, y: 2 },
  ];
  solid[idx(1, 2)] = 1;
  solid[idx(14, 2)] = 1;

  // Top-wall architectural decorations (windows, fireplace / guild banners)
  const style = building.style || "cottage";
  const wallDecos = [
    { type: "windowWall", x: 4, y: 1 },
    { type: "windowWall", x: 10, y: 1 },
    { type: "windowWall", x: 13, y: 1 },
  ];
  if (style === "forge" || style === "cottage" || style === "shop") {
    wallDecos.push({ type: "fireplace", x: 8, y: 1 });
    wallDecos.push({ type: "wallBanner", x: 2, y: 1 });
  } else {
    wallDecos.push({ type: "wallBanner", x: 6, y: 1 });
    wallDecos.push({ type: "wallBanner", x: 8, y: 1 });
  }

  // Style-specific interior furniture (strictly avoiding items, spawn (7,8), exit (7..8,9), keeper (2,4))
  const themedFurniture = {
    forge: [
      { type: "anvil", x: 1, y: 6 },
      { type: "crate", x: 14, y: 8 },
      { type: "tableDesk", x: 14, y: 5 },
      { type: "indoorChair", x: 13, y: 5, sittable: true },
      { type: "plant", x: 1, y: 9 },
    ],
    library: [
      { type: "globe", x: 1, y: 6 },
      { type: "tableDesk", x: 6, y: 5 },
      { type: "indoorChair", x: 6, y: 6, sittable: true },
      { type: "tableDesk", x: 9, y: 5 },
      { type: "indoorChair", x: 9, y: 6, sittable: true },
      { type: "plant", x: 14, y: 8 },
    ],
    dojo: [
      { type: "weaponRack", x: 1, y: 6 },
      { type: "weaponRack", x: 14, y: 6 },
      { type: "indoorChair", x: 1, y: 8, sittable: true },
      { type: "tableDesk", x: 14, y: 8 },
    ],
    workshop: [
      { type: "globe", x: 1, y: 6 },
      { type: "crate", x: 14, y: 8 },
      { type: "tableDesk", x: 6, y: 5 },
      { type: "indoorChair", x: 6, y: 6, sittable: true },
      { type: "indoorChair", x: 9, y: 6, sittable: true },
    ],
    shop: [
      { type: "crate", x: 1, y: 6 },
      { type: "crate", x: 1, y: 7 },
      { type: "tableDesk", x: 9, y: 5 },
      { type: "indoorChair", x: 9, y: 6, sittable: true },
      { type: "globe", x: 14, y: 8 },
    ],
    cottage: [
      { type: "bed", x: 1, y: 6 },
      { type: "tableDesk", x: 9, y: 5 },
      { type: "indoorChair", x: 9, y: 6, sittable: true },
      { type: "plant", x: 14, y: 8 },
    ],
  };

  for (const furn of themedFurniture[style] || themedFurniture.cottage) {
    solid[idx(furn.x, furn.y)] = 1;
    props.push(furn);
  }

  // Place interior bookshelves / chests cleanly along reachable aisles
  const slots = [
    [3, 2], [5, 2], [7, 2], [9, 2], [11, 2],
    [3, 5], [12, 5], [3, 7], [12, 7], [13, 3],
  ];

  const items = (building.items || []).slice(0, slots.length).map((item, i) => {
    const [ix, iy] = slots[i];
    solid[idx(ix, iy)] = 1;
    const propType = item.type === "chest" ? "chestClosed" : "bookshelf";
    return {
      ...item,
      x: ix,
      y: iy,
      propType,
      opened: false,
    };
  });

  // Indoor keeper NPC at (2, 4)
  const keeper = {
    id: `keeper-${building.id}`,
    kind: "villager",
    palette: 1,
    name: `${building.name} · 管理员`,
    x: 2,
    y: 4,
    dir: "down",
    title: `${building.name}`,
    subtitle: building.path || "Markdown 房间",
    role: "管理员",
    body: `${building.description}\n\n走到书架或宝箱旁按 [E] 或直接点击它们，即可查看对应文件或章节内容；也可以坐上房间里的木椅歇歇脚。走到下方红色门垫可回到小镇。`,
  };
  solid[idx(2, 4)] = 1;

  return {
    kind: "interior",
    building,
    width,
    height,
    tiles,
    solid,
    spawn: { x: 7, y: 8 },
    exitTiles: [
      { x: 7, y: 9 },
      { x: 8, y: 9 },
      { x: 7, y: 10 },
      { x: 8, y: 10 },
    ],
    wallDecos,
    props,
    items,
    keeper,
  };
}
