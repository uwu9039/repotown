/**
 * Procedural 16-bit Pixel Art Sprite & Tile Atlas.
 * Generates crisp offscreen canvases at startup with zero external image dependencies.
 */

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function drawGrid(rows, palette, scale = 1) {
  const h = rows.length;
  const w = rows[0].length;
  const { c, ctx } = makeCanvas(w * scale, h * scale);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

export const TOWN_THEMES = {
  meadow: {
    key: "meadow",
    label: "翠绿牧歌镇",
    backdrop: "#182919",
    grassBases: ["#4f8f4b", "#498746", "#559650", "#4f8f4b"],
    grassTuft: "#3f7a3c",
    grassLight: "#68ab5f",
    flowerA: "#f7df79",
    flowerB: "#f28f79",
    clover: "#e8e3c5",
    pathBase: "#9b8c74",
    pathStones: ["#b8a88e", "#ab9b81", "#bfb096", "#a8987e"],
    pathHi: "#cfbfa5",
    pathLo: "#7a6d59",
    plazaBase: "#b5a68c",
    plazaTile: "#c8b99e",
    plazaLine: "#8c7d66",
    waterBase: "#35769c",
    waterMid: "#488fb8",
    waterHi: "#88cbe8",
    waterDeep: "#2b6282",
    minimapGrass: "#3f7a3c",
    minimapWater: "#35769c",
    minimapPath: "#b5a68c",
    particleDay: "rgba(255, 240, 210, 0.55)",
    pinePal: { "#": "#193822", L: "#478a44", M: "#2e6b37", D: "#214f2a", T: "#6e4629", t: "#4f311c", S: "rgba(18, 28, 16, 0.32)" },
    oakPal: { "#": "#1e3a1e", L: "#72b856", M: "#4c9141", D: "#2e632d", T: "#784c2b", t: "#52321b", S: "rgba(18, 28, 16, 0.32)" },
    altTreePal: { "#": "#421e14", L: "#f0a848", M: "#d66838", D: "#9c3924", T: "#6e4629", t: "#4f311c", S: "rgba(18, 28, 16, 0.32)" },
    bushPal: { "#": "#1e4226", L: "#5ca353", M: "#3c7d41", D: "#295c30", F: "#f2be54" },
  },
  sakura: {
    key: "sakura",
    label: "樱花温泉乡",
    backdrop: "#241d26",
    grassBases: ["#5a9c69", "#529161", "#61a671", "#5a9c69"],
    grassTuft: "#427d50",
    grassLight: "#76bd83",
    flowerA: "#ffb3cc",
    flowerB: "#ffe6f0",
    clover: "#ffd1e3",
    pathBase: "#baa79e",
    pathStones: ["#d4c3ba", "#c7b4ab", "#decbc2", "#bfa9a0"],
    pathHi: "#ebd9d0",
    pathLo: "#8a756c",
    plazaBase: "#cfbdb4",
    plazaTile: "#e0cfc6",
    plazaLine: "#9c877d",
    waterBase: "#36909e",
    waterMid: "#4eb0bf",
    waterHi: "#9ce8f2",
    waterDeep: "#28727d",
    minimapGrass: "#4a8a59",
    minimapWater: "#36909e",
    minimapPath: "#cfbdb4",
    particleDay: "rgba(255, 183, 209, 0.85)",
    pinePal: { "#": "#1a3b2c", L: "#4b8c6a", M: "#316e4f", D: "#215239", T: "#6e4629", t: "#4f311c", S: "rgba(18, 28, 16, 0.32)" },
    oakPal: { "#": "#59223a", L: "#ffd1e2", M: "#f598b8", D: "#c96288", T: "#633c29", t: "#47291b", S: "rgba(28, 16, 22, 0.3)" },
    altTreePal: { "#": "#632841", L: "#ffe8f0", M: "#f7b2ca", D: "#d97598", T: "#633c29", t: "#47291b", S: "rgba(28, 16, 22, 0.3)" },
    bushPal: { "#": "#234730", L: "#69b078", M: "#488a57", D: "#2f663c", F: "#ff9ec2" },
  },
  autumn: {
    key: "autumn",
    label: "金秋枫叶村",
    backdrop: "#291e14",
    grassBases: ["#7f8c3d", "#758237", "#899642", "#7f8c3d"],
    grassTuft: "#636e2c",
    grassLight: "#9ead4e",
    flowerA: "#f5a638",
    flowerB: "#d95b38",
    clover: "#f2d685",
    pathBase: "#a88565",
    pathStones: ["#c4a07e", "#b59170", "#cca987", "#ab8666"],
    pathHi: "#dbb795",
    pathLo: "#7d5e43",
    plazaBase: "#ba9977",
    plazaTile: "#cfb08e",
    plazaLine: "#8a6a4d",
    waterBase: "#2e6b78",
    waterMid: "#438999",
    waterHi: "#8fd2de",
    waterDeep: "#21515c",
    minimapGrass: "#6c7a33",
    minimapWater: "#2e6b78",
    minimapPath: "#ba9977",
    particleDay: "rgba(240, 168, 72, 0.82)",
    pinePal: { "#": "#21331c", L: "#557a3b", M: "#3b5c29", D: "#2a451c", T: "#6e4629", t: "#4f311c", S: "rgba(22, 18, 12, 0.32)" },
    oakPal: { "#": "#4d2b12", L: "#ffd059", M: "#e09428", D: "#a65e14", T: "#693f22", t: "#4a2a14", S: "rgba(26, 18, 12, 0.32)" },
    altTreePal: { "#": "#421511", L: "#f58549", M: "#cc4429", D: "#8c2314", T: "#693f22", t: "#4a2a14", S: "rgba(26, 18, 12, 0.32)" },
    bushPal: { "#": "#3d2f16", L: "#c4943b", M: "#996926", D: "#6e4716", F: "#eb5e3b" },
  },
  winter: {
    key: "winter",
    label: "凛冬雪原港",
    backdrop: "#141f2b",
    grassBases: ["#d7e6f2", "#cee0ee", "#e1edf7", "#d7e6f2"],
    grassTuft: "#b3cadb",
    grassLight: "#f2f8fc",
    flowerA: "#99d4f2",
    flowerB: "#ffffff",
    clover: "#c7dff0",
    pathBase: "#8090a1",
    pathStones: ["#9dadbd", "#8f9fb0", "#a9b8c7", "#8797a8"],
    pathHi: "#c2d0de",
    pathLo: "#5d6b7a",
    plazaBase: "#9aaab8",
    plazaTile: "#b0c0ce",
    plazaLine: "#6e7e8c",
    waterBase: "#245780",
    waterMid: "#3976a6",
    waterHi: "#a3dcff",
    waterDeep: "#193e5e",
    minimapGrass: "#b8cde0",
    minimapWater: "#245780",
    minimapPath: "#8090a1",
    particleDay: "rgba(255, 255, 255, 0.88)",
    pinePal: { "#": "#1b333d", L: "#dcecf5", M: "#3d6e7a", D: "#264d57", T: "#5c3f2e", t: "#402a1d", S: "rgba(18, 28, 42, 0.28)" },
    oakPal: { "#": "#23394a", L: "#eef6fc", M: "#8ab3cf", D: "#527d9c", T: "#5c3f2e", t: "#402a1d", S: "rgba(18, 28, 42, 0.28)" },
    altTreePal: { "#": "#283947", L: "#ffffff", M: "#aac8de", D: "#6b8fa8", T: "#5c3f2e", t: "#402a1d", S: "rgba(18, 28, 42, 0.28)" },
    bushPal: { "#": "#233d47", L: "#dcecf5", M: "#5e8f9c", D: "#38636e", F: "#ffffff" },
  },
};

function createTerrainTiles(theme = TOWN_THEMES.meadow) {
  // 4 ground variants (16x16)
  const grass = theme.grassBases.map((base, idx) => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = theme.grassTuft;
    const tufts = [
      [2, 3], [10, 5], [5, 11], [13, 13],
      [3, 13], [11, 2], [7, 7], [14, 9],
    ];
    for (let i = 0; i < tufts.length; i++) {
      if ((i + idx) % 2 === 0) {
        const [tx, ty] = tufts[i];
        ctx.fillRect(tx, ty, 1, 2);
        ctx.fillRect(tx + 2, ty + 1, 1, 1);
      }
    }
    ctx.fillStyle = theme.grassLight;
    ctx.fillRect((idx * 5 + 3) % 14, (idx * 3 + 2) % 13, 1, 1);
    ctx.fillRect((idx * 7 + 9) % 14, (idx * 5 + 8) % 13, 1, 1);
    if (idx === 2) {
      ctx.fillStyle = theme.flowerA;
      ctx.fillRect(4, 5, 2, 2);
      ctx.fillStyle = theme.flowerB;
      ctx.fillRect(11, 11, 2, 2);
    } else if (idx === 3) {
      ctx.fillStyle = theme.clover;
      ctx.fillRect(9, 4, 1, 1);
      ctx.fillRect(5, 12, 1, 1);
    }
    return c;
  });

  // Cobblestone path (16x16)
  const path = (() => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = theme.pathBase;
    ctx.fillRect(0, 0, 16, 16);
    const sCols = theme.pathStones;
    const stones = [
      [1, 1, 6, 4, sCols[0]], [8, 1, 7, 5, sCols[1]],
      [1, 6, 5, 4, sCols[1]], [7, 7, 8, 4, sCols[2]],
      [1, 11, 7, 4, sCols[2]], [9, 12, 6, 3, sCols[3]],
    ];
    for (const [x, y, w, h, col] of stones) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = theme.pathHi;
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = theme.pathLo;
      ctx.fillRect(x, y + h - 1, w, 1);
    }
    return c;
  })();

  // Plaza stone tile (16x16)
  const plaza = (() => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = theme.plazaBase;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = theme.plazaTile;
    ctx.fillRect(1, 1, 6, 6);
    ctx.fillRect(9, 1, 6, 6);
    ctx.fillRect(1, 9, 6, 6);
    ctx.fillRect(9, 9, 6, 6);
    ctx.fillStyle = theme.plazaLine;
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(7, 0, 1, 16);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
    return c;
  })();

  // Animated water (3 frames, 16x16)
  const water = [0, 1, 2].map((f) => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = theme.waterBase;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = theme.waterMid;
    ctx.fillRect((2 + f * 3) % 12, 3, 5, 1);
    ctx.fillRect((9 + f * 2) % 11, 10, 5, 1);
    ctx.fillStyle = theme.waterHi;
    ctx.fillRect((4 + f * 3) % 13, 3, 2, 1);
    ctx.fillRect((11 + f * 2) % 13, 10, 2, 1);
    ctx.fillStyle = theme.waterDeep;
    ctx.fillRect(0, 14, 16, 2);
    return c;
  });

  // Wooden bridge plank (16x16)
  const bridge = (() => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "#825534";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      ctx.fillStyle = "#a36e46";
      ctx.fillRect(0, y, 16, 3);
      ctx.fillStyle = "#5c3920";
      ctx.fillRect(0, y + 3, 16, 1);
    }
    // Rails
    ctx.fillStyle = "#5c3920";
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    return c;
  })();

  // Interior hardwood floor (16x16)
  const woodFloor = (() => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "#8f5e39";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? "#a47047" : "#996640";
      ctx.fillRect(0, y, 16, 3);
      ctx.fillStyle = "#6e4427";
      ctx.fillRect(0, y + 3, 16, 1);
      ctx.fillRect((y * 3 + 5) % 15, y, 1, 3);
    }
    return c;
  })();

  // Interior wall (16x16)
  const interiorWall = (() => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "#3a2820";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#523a2e";
    ctx.fillRect(0, 2, 16, 10);
    ctx.fillStyle = "#261913";
    ctx.fillRect(0, 12, 16, 4);
    ctx.fillStyle = "#6b4d3d";
    ctx.fillRect(1, 3, 14, 2);
    return c;
  })();

  // Decorative interior rug (16x16)
  const rug = (() => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "#9b3d2e";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#d99b38";
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = "#b34836";
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = "#f0d48f";
    ctx.fillRect(6, 6, 4, 4);
    return c;
  })();

  return { grass, path, plaza, water, bridge, woodFloor, interiorWall, rug };
}

function createScenerySprites(theme = TOWN_THEMES.meadow) {
  // Pine Tree (16x24)
  const tree = drawGrid([
    ".......##.......",
    "......#LL#......",
    ".....#LLLL#.....",
    "....#LLMMLL#....",
    ".....#MMMM#.....",
    "....#LLMMLL#....",
    "...#LLMMMMLL#...",
    "..#LMMMMMMMMD#..",
    "....#MMMMDD#....",
    "...#LMMMMMMD#...",
    "..#LMMMMMMMMD#..",
    ".#LMMMMMMMMMMD#.",
    ".#MMMMMMMMDDDD#.",
    "...#DDDDDDDD#...",
    "......#TT#......",
    "......#TT#......",
    "......#tt#......",
    ".....SSSSSS.....",
  ], theme.pinePal);

  // Flower Bush (16x16)
  const bush = drawGrid([
    "................",
    "....########....",
    "..##LLLLLLLL##..",
    ".#LLFFLLLLFFLL#.",
    ".#LMMMMLLMMMMD#.",
    ".#MMMMFMMFMMMM#.",
    ".#MMDDDDDDDDDD#.",
    "..##DDDDDDDD##..",
    "....########....",
    "................",
  ], theme.bushPal);

  // Noticeboard (16x16)
  const sign = drawGrid([
    "................",
    "..############..",
    ".#BBBBBBBBBBBB#.",
    ".#BPPPPPPPPPPB#.",
    ".#BPKKKKKKKKPB#.",
    ".#BPPPPPPPPPPB#.",
    ".#BPKKKKKKPPPB#.",
    ".#BPPPPPPPPPPB#.",
    "..############..",
    ".....#TT#TT#....",
    ".....#TT#TT#....",
    ".....#tt#tt#....",
    "................",
  ], {
    "#": "#2b1c12",
    "B": "#8c5b36",
    "P": "#eddcb2",
    "K": "#59422e",
    "T": "#6b4326",
    "t": "#4a2e1a",
  });

  // Animated Stone Fountain (32x32, 3 frames)
  const fountain = [0, 1, 2].map((f) => {
    const { c, ctx } = makeCanvas(32, 32);
    // Basin shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(3, 25, 26, 4);
    // Stone rim
    ctx.fillStyle = "#5c5952";
    ctx.fillRect(3, 12, 26, 14);
    ctx.fillStyle = "#918c82";
    ctx.fillRect(4, 11, 24, 12);
    ctx.fillStyle = "#b8b2a6";
    ctx.fillRect(5, 11, 22, 3);
    // Water pool
    ctx.fillStyle = "#3478a1";
    ctx.fillRect(6, 14, 20, 7);
    ctx.fillStyle = "#62b5db";
    ctx.fillRect(7 + f * 2, 15, 6, 1);
    ctx.fillRect(18 - f * 2, 18, 6, 1);
    // Center pillar
    ctx.fillStyle = "#8a857b";
    ctx.fillRect(13, 6, 6, 11);
    ctx.fillStyle = "#c2bcb0";
    ctx.fillRect(14, 6, 2, 10);
    // Splash jets
    ctx.fillStyle = "#9be2ff";
    const jetY = 2 + (f % 2);
    ctx.fillRect(15, jetY, 2, 4);
    ctx.fillRect(11 - f, 6 + f, 2, 2);
    ctx.fillRect(19 + f, 6 + f, 2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(15, jetY, 1, 2);
    return c;
  });

  // Streetlamp (16x24)
  const lamp = drawGrid([
    "......####......",
    ".....#GGGG#.....",
    ".....#GYYG#.....",
    ".....#GGGG#.....",
    "......####......",
    ".......##.......",
    ".......MM.......",
    ".......MM.......",
    ".......MM.......",
    ".......MM.......",
    ".......MM.......",
    ".......MM.......",
    "......#MM#......",
    ".....#MMMM#.....",
  ], {
    "#": "#1b1817",
    "M": "#3c3735",
    "G": "#f5cb6e",
    "Y": "#fff4b8",
  });

  // Chest (closed & open, 16x16)
  const chestClosed = drawGrid([
    "................",
    "................",
    "..############..",
    ".#WWWWWWWWWWWW#.",
    ".#WGGGGGGGGGGW#.",
    ".#WWWWWWWWWWWW#.",
    ".##############.",
    ".#DDDDDGGDDDDD#.",
    ".#DDDDDGGDDDDD#.",
    ".#DDDDDDDDDDDD#.",
    "..############..",
    "................",
  ], {
    "#": "#29180f",
    "W": "#a36332",
    "D": "#7a4722",
    "G": "#f0bd48",
  });

  const chestOpen = drawGrid([
    "..############..",
    ".#DDDDDDDDDDDD#.",
    ".#WGGGGGGGGGGW#.",
    "..############..",
    ".#YYYYYYYYYYYY#.",
    ".#YGYGYGYGYGYG#.",
    ".##############.",
    ".#DDDDDGGDDDDD#.",
    ".#DDDDDDDDDDDD#.",
    "..############..",
    "................",
  ], {
    "#": "#29180f",
    "W": "#a36332",
    "D": "#7a4722",
    "G": "#f0bd48",
    "Y": "#ffe780",
  });

  // Bookshelf (16x16)
  const bookshelf = drawGrid([
    ".##############.",
    ".#WWWWWWWWWWWW#.",
    ".#WRRBBGGYYRRW#.",
    ".#WRRBBGGYYRRW#.",
    ".#WWWWWWWWWWWW#.",
    ".#WGGPPBBRRGGW#.",
    ".#WGGPPBBRRGGW#.",
    ".#WWWWWWWWWWWW#.",
    ".#WRRYYGGPPBBW#.",
    ".#WRRYYGGPPBBW#.",
    ".##############.",
    ".#DDDDDDDDDDDD#.",
  ], {
    "#": "#29180f",
    "W": "#8c5933",
    "D": "#5e391f",
    "R": "#c95343",
    "B": "#4675a8",
    "G": "#4c945c",
    "Y": "#dfb14a",
    "P": "#b88ac4",
  });

  // Potted Plant (16x16)
  const plant = drawGrid([
    "................",
    "......#GG#......",
    "....#GGGGGG#....",
    "...#GGLGGLGG#...",
    "....#GGGGGG#....",
    ".....######.....",
    "....#PPPPPP#....",
    "....#PDDDDP#....",
    ".....#PPPP#.....",
    "......####......",
  ], {
    "#": "#1f301e",
    "G": "#3f8c46",
    "L": "#6ec26b",
    "P": "#ba6343",
    "D": "#8a442c",
  });

  // Doormat (16x16)
  const doormat = drawGrid([
    "................",
    "................",
    "..############..",
    ".#GGGGGGGGGGGG#.",
    ".#GRRRRRRRRRRG#.",
    ".#GRRRRRRRRRRG#.",
    ".#GGGGGGGGGGGG#.",
    "..############..",
  ], {
    "#": "#3b2316",
    "G": "#d99b38",
    "R": "#b34634",
  });

  // Oak Tree (16x18)
  const oakTree = drawGrid([
    "....########....",
    "..##LLLLLLLL##..",
    ".#LLLLMMMMLLLL#.",
    ".#LLMMMMMMMMMM#.",
    "#LLLMMMMMMLLMMM#",
    "#LMMMMMMMMMMMMD#",
    "#MMMMMMMMMMMMDD#",
    ".#MMMMMDDDDDDD#.",
    ".#MMDDDDDDDDDD#.",
    "..##DDDDDDDD##..",
    "....########....",
    "......#TT#......",
    "......#TT#......",
    "......#TT#......",
    "......#tt#......",
    ".....SSSSSS.....",
  ], theme.oakPal);

  // Alt / Blossom / Autumn Tree (16x16)
  const autumnTree = drawGrid([
    "....########....",
    "..##LLLLLLLL##..",
    ".#LLLLMMMMLLLL#.",
    ".#LLMMMMMMMMMM#.",
    "#LLLMMMMMMLLMMM#",
    "#LMMMMMMMMMMMMD#",
    "#MMMMMMMMMMMMDD#",
    ".#MMMMMDDDDDDD#.",
    ".#MMDDDDDDDDDD#.",
    "..##DDDDDDDD##..",
    "....########....",
    "......#TT#......",
    "......#TT#......",
    "......#TT#......",
    "......#tt#......",
    ".....SSSSSS.....",
  ], theme.altTreePal);

  // Horizontal Picket Fence (16x16)
  const fenceH = drawGrid([
    "................",
    "................",
    "..##...##...##..",
    ".#WW#.#WW#.#WW#.",
    ".#WW#.#WW#.#WW#.",
    ".##############.",
    ".#WWWWWWWWWWWW#.",
    ".##############.",
    ".#WW#.#WW#.#WW#.",
    ".#WW#.#WW#.#WW#.",
    ".#DD#.#DD#.#DD#.",
    ".##############.",
    "..SS...SS...SS..",
    "................",
    "................",
    "................",
  ], {
    "#": "#2b1b12",
    "W": "#b88454",
    "D": "#875a34",
    "S": "rgba(0,0,0,0.22)",
  });

  // Wooden Park Bench (16x16)
  const bench = drawGrid([
    "................",
    "................",
    "................",
    "..############..",
    ".#WWWWWWWWWWWW#.",
    ".#DDDDDDDDDDDD#.",
    ".#WWWWWWWWWWWW#.",
    ".##############.",
    ".#LLLLLLLLLLLL#.",
    ".#DDDDDDDDDDDD#.",
    ".##..........##.",
    ".#D#........#D#.",
    "..SS........SS..",
    "................",
    "................",
    "................",
  ], {
    "#": "#24160e",
    "W": "#a66c3e",
    "L": "#bd7f4d",
    "D": "#734625",
    "S": "rgba(0,0,0,0.24)",
  });

  // Wildflower Bed (16x16, walkable ground decoration)
  const flowerBed = drawGrid([
    "................",
    "..GG..R....GG...",
    ".GLLGRRR..GLLG..",
    "..GG..R.Y..GG...",
    "....B..YYY......",
    "...BBB..Y..P....",
    ".GG.B.GG..PPP...",
    "GLLG.GLLG..P.Y..",
    ".GG...GG..GGYYY.",
    "..R.......GLLGY.",
    ".RRR..B....GG...",
    "..R..BBB........",
    "......B.........",
    "................",
    "................",
    "................",
  ], {
    "G": "#36783b",
    "L": "#5eb55b",
    "R": "#e86858",
    "Y": "#fae06b",
    "B": "#75baf0",
    "P": "#e89be0",
  });

  // Crop Patch (16x16, walkable farmland rows)
  const cropPatch = drawGrid([
    "................",
    ".DDDDDDDDDDDDDD.",
    ".DGGGDGGGDGGGGD.",
    ".DYYGDYYGDYYGGD.",
    ".DDDDDDDDDDDDDD.",
    ".DDDDDDDDDDDDDD.",
    ".DGGGDGGGDGGGGD.",
    ".DGYGDGYGDGYGGD.",
    ".DDDDDDDDDDDDDD.",
    ".DDDDDDDDDDDDDD.",
    ".DGGGDGGGDGGGGD.",
    ".DYYGDYYGDYYGGD.",
    ".DDDDDDDDDDDDDD.",
    "................",
    "................",
    "................",
  ], {
    "D": "#5e3d24",
    "G": "#569c47",
    "Y": "#e3bd54",
  });

  // Mossy Rock (16x16)
  const rock = drawGrid([
    "................",
    "................",
    "................",
    ".....######.....",
    "...##LLLLLL##...",
    "..#LLMMMMGGGG#..",
    ".#LLMMMMMMGGGG#.",
    ".#MMMMMMMMDDDD#.",
    ".#MMMMDDDDDDDD#.",
    "..#DDDDDDDDDD#..",
    "...##########...",
    "....SSSSSSSS....",
    "................",
    "................",
    "................",
    "................",
  ], {
    "#": "#26282a",
    "L": "#a6acb0",
    "M": "#7b8287",
    "D": "#545a5e",
    "G": "#4f8f4b",
    "S": "rgba(0,0,0,0.25)",
  });

  // Cut Tree Stump (16x16)
  const stump = drawGrid([
    "................",
    "................",
    "................",
    "................",
    "....########....",
    "...#RRRRRRRR#...",
    "..#RRYYYYYYRR#..",
    "..#RRRRRRRRRR#..",
    "..#TTTTTTTTTT#..",
    "..#TTtTTTTtTT#..",
    "..#TTTTTTTTTT#..",
    "...#tTTTTTTt#...",
    "....########....",
    ".....SSSSSS.....",
    "................",
    "................",
  ], {
    "#": "#291910",
    "R": "#cf9c69",
    "Y": "#e8bf8e",
    "T": "#7d4f2d",
    "t": "#59351c",
    "S": "rgba(0,0,0,0.25)",
  });

  // Water Lilypad (16x16)
  const lilypad = drawGrid([
    "................",
    "................",
    "....#####.......",
    "..##LLLLL##.....",
    ".#LLLGGGLLL#....",
    ".#LLGGGG..L#....",
    ".#LLGGGPP..#....",
    "..#GGPPPP#......",
    "...######.......",
    "................",
    "..........####..",
    ".........#LLLL#.",
    ".........#LGG.#.",
    "..........####..",
    "................",
    "................",
  ], {
    "#": "#1e4f28",
    "L": "#5db35b",
    "G": "#3b8740",
    "P": "#f59ec4",
  });

  // Animated Stone Campfire (3 frames, 16x16)
  const campfire = [0, 1, 2].map((f) => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(2, 12, 12, 3);
    // Logs
    ctx.fillStyle = "#5c381f";
    ctx.fillRect(3, 10, 10, 3);
    ctx.fillStyle = "#7a4c2b";
    ctx.fillRect(4, 11, 8, 2);
    // Stone ring
    ctx.fillStyle = "#6e7378";
    ctx.fillRect(2, 12, 3, 2);
    ctx.fillRect(11, 12, 3, 2);
    ctx.fillRect(6, 13, 4, 2);
    // Flame
    const sway = f === 1 ? -1 : f === 2 ? 1 : 0;
    ctx.fillStyle = "#e05a2b";
    ctx.fillRect(5, 6, 6, 5);
    ctx.fillRect(6 + sway, 4, 4, 3);
    ctx.fillStyle = "#f5a638";
    ctx.fillRect(6, 7, 4, 4);
    ctx.fillRect(7 + sway, 5, 2, 3);
    ctx.fillStyle = "#fff199";
    ctx.fillRect(7, 8, 2, 3);
    // Rising spark
    ctx.fillStyle = "#ffd966";
    ctx.fillRect(7 - sway, 2 - (f % 2), 1, 1);
    return c;
  });

  // Animated Windmill (3 frames, 32x40)
  const windmill = [0, 1, 2].map((f) => {
    const { c, ctx } = makeCanvas(32, 40);
    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(6, 36, 20, 4);
    // Tower body
    ctx.fillStyle = "#2b1c14";
    ctx.fillRect(8, 12, 16, 25);
    ctx.fillStyle = "#ebdcb9";
    ctx.fillRect(9, 13, 14, 23);
    ctx.fillStyle = "#877a6c";
    ctx.fillRect(9, 32, 14, 4);
    // Conical roof
    ctx.fillStyle = "#b84b36";
    ctx.fillRect(8, 8, 16, 6);
    ctx.fillRect(10, 5, 12, 4);
    ctx.fillRect(13, 3, 6, 3);
    // Door
    ctx.fillStyle = "#5c341c";
    ctx.fillRect(13, 29, 6, 7);
    ctx.fillStyle = "#d99b38";
    ctx.fillRect(17, 32, 1, 1);
    // Rotating Sails around hub (16, 15)
    const angle = f * (Math.PI / 6);
    ctx.save();
    ctx.translate(16, 15);
    ctx.rotate(angle);
    for (let arm = 0; arm < 4; arm++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#4a2e1a";
      ctx.fillRect(-1, 0, 2, 13);
      ctx.fillStyle = "#f5edd6";
      ctx.fillRect(1, 3, 4, 9);
      ctx.fillStyle = "#cbb98c";
      ctx.fillRect(1, 6, 4, 1);
      ctx.fillRect(1, 9, 4, 1);
    }
    ctx.fillStyle = "#241a15";
    ctx.fillRect(-2, -2, 4, 4);
    ctx.fillStyle = "#d99b38";
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    return c;
  });

  // Interior Glowing Window (16x16)
  const windowWall = drawGrid([
    "................",
    "..############..",
    ".#BBBBBBBBBBBB#.",
    ".#BLLLLL#LLLLB#.",
    ".#BLYYYL#LYYYB#.",
    ".#BLLLLL#LLLLB#.",
    ".#B#####B####B#.",
    ".#BLLLLL#LLLLB#.",
    ".#BLWWWL#LWWWB#.",
    ".#BLLLLL#LLLLB#.",
    ".#BBBBBBBBBBBB#.",
    "..############..",
    "...SSSSSSSSSS...",
    "................",
    "................",
    "................",
  ], {
    "#": "#2b1b12",
    "B": "#754829",
    "L": "#c7ecff",
    "Y": "#fff4b8",
    "W": "#9ad5f5",
    "S": "rgba(0,0,0,0.22)",
  });

  // Animated Interior Brick Fireplace (3 frames, 16x16)
  const fireplace = [0, 1, 2].map((f) => {
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "#2b1b12";
    ctx.fillRect(1, 0, 14, 16);
    ctx.fillStyle = "#7a5343";
    ctx.fillRect(2, 1, 12, 14);
    ctx.fillStyle = "#9e6b56";
    ctx.fillRect(3, 2, 4, 3);
    ctx.fillRect(9, 2, 4, 3);
    // Hearth opening
    ctx.fillStyle = "#1a110e";
    ctx.fillRect(4, 7, 8, 8);
    // Logs & flame
    ctx.fillStyle = "#5c341c";
    ctx.fillRect(5, 13, 6, 2);
    const sway = f === 1 ? -1 : f === 2 ? 1 : 0;
    ctx.fillStyle = "#e05a2b";
    ctx.fillRect(5, 9, 6, 4);
    ctx.fillRect(6 + sway, 8, 4, 2);
    ctx.fillStyle = "#ffd966";
    ctx.fillRect(6, 10, 4, 3);
    ctx.fillStyle = "#fff8cc";
    ctx.fillRect(7, 11, 2, 2);
    // Mantlepiece
    ctx.fillStyle = "#52321e";
    ctx.fillRect(1, 5, 14, 2);
    return c;
  });

  // Guild Wall Banner (16x16)
  const wallBanner = drawGrid([
    "................",
    ".##############.",
    ".#GGGGGGGGGGGG#.",
    "..#RRRRRRRRRR#..",
    "..#RRGGGGGGGR#..",
    "..#RRGYYYYGGR#..",
    "..#RRGGGGGGGR#..",
    "..#RRRRRRRRRR#..",
    "..#RRRRRRRRRR#..",
    "...#RRRRRRRR#...",
    "....#RRRRRR#....",
    ".....#RRRR#.....",
    "......#RR#......",
    ".......##.......",
    "................",
    "................",
  ], {
    "#": "#261710",
    "G": "#d99b38",
    "Y": "#ffe885",
    "R": "#9e3329",
  });

  // Study Table Desk with Scroll & Ink (16x16)
  const tableDesk = drawGrid([
    "................",
    ".##############.",
    ".#WWWWWWWWWWWW#.",
    ".#WPPPPPPWWBBW#.",
    ".#WPkkkPPWWKKW#.",
    ".#WPPPPPPWWWWW#.",
    ".##############.",
    ".#DDDDDDDDDDDD#.",
    ".#DD#DDDDDD#DD#.",
    ".#DD#......#DD#.",
    ".#dd#......#dd#.",
    ".####......####.",
    "..SS........SS..",
    "................",
    "................",
    "................",
  ], {
    "#": "#29180f",
    "W": "#b37948",
    "D": "#7d4c27",
    "d": "#593418",
    "P": "#f5edd6",
    "k": "#6e5540",
    "B": "#3c6e9c",
    "K": "#d99b38",
    "S": "rgba(0,0,0,0.24)",
  });

  // Sittable Indoor Wooden Chair (16x16)
  const indoorChair = drawGrid([
    "................",
    "....########....",
    "....#WWWWWW#....",
    "....#WDDDDW#....",
    "....#WWWWWW#....",
    "....########....",
    "...#WWWWWWWW#...",
    "...#WCCCCCCW#...",
    "...##########...",
    "...#DD#..#DD#...",
    "...#dd#..#dd#...",
    "...###....###...",
    "....SS....SS....",
    "................",
    "................",
    "................",
  ], {
    "#": "#29180f",
    "W": "#b07443",
    "D": "#7d4c27",
    "d": "#573218",
    "C": "#c85a3a",
    "S": "rgba(0,0,0,0.24)",
  });

  // Forge Anvil (16x16)
  const anvil = drawGrid([
    "................",
    "................",
    "................",
    "..############..",
    ".#LLLLLLLLLLLL#.",
    "#LLMMMMMMMMMM##.",
    ".###MMMMMMM##...",
    "....#DDDDD#.....",
    "....#DDDDD#.....",
    "...#DDDDDDD#....",
    "..###########...",
    "...SSSSSSSSS....",
    "................",
    "................",
    "................",
    "................",
  ], {
    "#": "#181a1c",
    "L": "#9aa3ab",
    "M": "#676f78",
    "D": "#454b52",
    "S": "rgba(0,0,0,0.26)",
  });

  // Dojo Weapon / Training Rack (16x16)
  const weaponRack = drawGrid([
    "................",
    ".##..........##.",
    ".#W##########W#.",
    ".#W#LL#BB#LL#W#.",
    ".#W#MM#GG#MM#W#.",
    ".#W#MM#GG#MM#W#.",
    ".#W#TT#TT#TT#W#.",
    ".#W##########W#.",
    ".#W#DDDDDDDD#W#.",
    ".#D#........#D#.",
    ".###........###.",
    "..SS........SS..",
    "................",
    "................",
    "................",
    "................",
  ], {
    "#": "#24160e",
    "W": "#9c6438",
    "D": "#6b4122",
    "L": "#c7d1d9",
    "M": "#869199",
    "B": "#75b3e8",
    "G": "#d99b38",
    "T": "#7a4c28",
    "S": "rgba(0,0,0,0.24)",
  });

  // Wooden Supply Crate (16x16)
  const crate = drawGrid([
    "................",
    "..############..",
    ".#WWWWWWWWWWWW#.",
    ".#WDDDDDDDDDDW#.",
    ".#WDWWDDDDWWDW#.",
    ".#WDWWWWWWWWDW#.",
    ".#WDDDDWWDDDDW#.",
    ".#WDWDDDDDDWDW#.",
    ".#WDDDDDDDDDDW#.",
    ".#WWWWWWWWWWWW#.",
    "..############..",
    "...SSSSSSSSSS...",
    "................",
    "................",
    "................",
    "................",
  ], {
    "#": "#29180f",
    "W": "#bd834e",
    "D": "#8a562d",
    "S": "rgba(0,0,0,0.24)",
  });

  // Cozy Stitched Bed (16x16)
  const bed = drawGrid([
    "................",
    "..############..",
    ".#WWWWWWWWWWWW#.",
    ".#WPPPPPPPPPPW#.",
    ".#WPPPPPPPPPPW#.",
    ".#WBBBBBBBBBBW#.",
    ".#WRRRRRRRRRRW#.",
    ".#WRRRRRRRRRRW#.",
    ".#WRRRRRRRRRRW#.",
    ".#WDDDDDDDDDDW#.",
    ".#D##########D#.",
    "..SS........SS..",
    "................",
    "................",
    "................",
    "................",
  ], {
    "#": "#29180f",
    "W": "#8c5730",
    "D": "#5e361b",
    "P": "#f5edd6",
    "B": "#e8c872",
    "R": "#b84b36",
    "S": "rgba(0,0,0,0.24)",
  });

  // Brass Scholar Globe (16x16)
  const globe = drawGrid([
    "................",
    ".....######.....",
    "...##BBBBBB##...",
    "..#BBGGGGGBBB#..",
    "..#BGGGGGGGBB#..",
    "..#BBBGGGGBBB#..",
    "...##BBBBBB##...",
    "....#CCCCCC#....",
    "......#CC#......",
    ".....#DDDD#.....",
    "....########....",
    ".....SSSSSS.....",
    "................",
    "................",
    "................",
    "................",
  ], {
    "#": "#1d2633",
    "B": "#4689b8",
    "G": "#66b865",
    "C": "#d99b38",
    "D": "#7d4f28",
    "S": "rgba(0,0,0,0.24)",
  });

  return {
    tree,
    oakTree,
    autumnTree,
    bush,
    sign,
    fountain,
    lamp,
    chestClosed,
    chestOpen,
    bookshelf,
    plant,
    doormat,
    fenceH,
    bench,
    flowerBed,
    cropPatch,
    rock,
    stump,
    lilypad,
    campfire,
    windmill,
    windowWall,
    fireplace,
    wallBanner,
    tableDesk,
    indoorChair,
    anvil,
    weaponRack,
    crate,
    bed,
    globe,
  };
}

const BUILDING_PALETTES = {
  forge: { roof: "#b84b36", roofDark: "#873121", wall: "#d4c3a3", trim: "#593b28", badge: "#f08543" },
  library: { roof: "#36688d", roofDark: "#244763", wall: "#e8dcc1", trim: "#593d2b", badge: "#7fc8f8" },
  dojo: { roof: "#3e7d53", roofDark: "#285738", wall: "#dfd3b6", trim: "#523726", badge: "#85e09e" },
  workshop: { roof: "#9c6d2c", roofDark: "#704c1c", wall: "#e6d8bc", trim: "#4f3424", badge: "#f5c756" },
  shop: { roof: "#8c4a6b", roofDark: "#633049", wall: "#ede1ca", trim: "#523528", badge: "#f29ec8" },
  cottage: { roof: "#a85c3a", roofDark: "#7a3f24", wall: "#ebdcb9", trim: "#5c3d28", badge: "#f0c878" },
};

function createBuildingSprite(styleKey) {
  const pal = BUILDING_PALETTES[styleKey] || BUILDING_PALETTES.cottage;
  // 48x48 (3x3 tiles of 16x16)
  const { c, ctx } = makeCanvas(48, 48);

  // Ground shadow
  ctx.fillStyle = "rgba(18, 12, 8, 0.28)";
  ctx.fillRect(2, 43, 44, 5);

  // Chimney
  ctx.fillStyle = "#5c4a42";
  ctx.fillRect(35, 3, 6, 12);
  ctx.fillStyle = "#8a756b";
  ctx.fillRect(36, 3, 3, 10);
  ctx.fillStyle = "#332823";
  ctx.fillRect(34, 2, 8, 2);

  // Pitched Roof (pixel stepped)
  for (let row = 0; row < 16; row++) {
    const inset = Math.max(0, 12 - row);
    const x = 1 + Math.floor(inset * 0.65);
    const w = 46 - Math.floor(inset * 1.3);
    ctx.fillStyle = row % 4 === 3 ? pal.roofDark : pal.roof;
    ctx.fillRect(x, 6 + row, w, 1);
  }
  // Roof outline & eaves
  ctx.fillStyle = "#241712";
  ctx.fillRect(1, 21, 46, 2);
  ctx.fillStyle = pal.roofDark;
  ctx.fillRect(1, 20, 46, 1);

  // Walls
  ctx.fillStyle = pal.wall;
  ctx.fillRect(4, 23, 40, 22);
  // Timber beams
  ctx.fillStyle = pal.trim;
  ctx.fillRect(4, 23, 3, 22);
  ctx.fillRect(41, 23, 3, 22);
  ctx.fillRect(4, 23, 40, 2);
  ctx.fillRect(4, 43, 40, 2);

  // Stone foundation
  ctx.fillStyle = "#7a7267";
  ctx.fillRect(4, 41, 40, 4);
  ctx.fillStyle = "#968e82";
  ctx.fillRect(6, 41, 10, 2);
  ctx.fillRect(32, 41, 10, 2);

  // Center Door (aligned cleanly to tile column 1 -> x: 18..30, y: 31..45)
  ctx.fillStyle = "#3b2316";
  ctx.fillRect(18, 30, 12, 15);
  ctx.fillStyle = "#7d4c2c";
  ctx.fillRect(19, 31, 10, 14);
  ctx.fillStyle = "#5c341c";
  ctx.fillRect(23, 31, 2, 14);
  ctx.fillStyle = "#f2c45a";
  ctx.fillRect(26, 38, 2, 2);

  // Left & Right Lit Windows
  for (const wx of [8, 33]) {
    ctx.fillStyle = "#3b2316";
    ctx.fillRect(wx, 28, 7, 8);
    ctx.fillStyle = "#ffe382";
    ctx.fillRect(wx + 1, 29, 5, 6);
    ctx.fillStyle = "#5c341c";
    ctx.fillRect(wx + 3, 29, 1, 6);
    ctx.fillRect(wx + 1, 32, 5, 1);
  }

  // Guild Sign Badge above door
  ctx.fillStyle = "#2b1b12";
  ctx.fillRect(20, 23, 8, 6);
  ctx.fillStyle = pal.badge;
  ctx.fillRect(21, 24, 6, 4);

  return c;
}

function createCharacterFrames(palette) {
  // 16x20 sprite for 4 directions x 3 walk frames (idle, stepA, stepB)
  const makeFrame = (dir, step) => {
    const legL = step === 1 ? -1 : 0;
    const legR = step === 2 ? -1 : 0;
    const bob = step === 0 ? 0 : 1;
    const { c, ctx } = makeCanvas(16, 20);
    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(4, 17, 8, 2);

    const dy = bob;
    // Hair / Hat top
    ctx.fillStyle = "#1c1310";
    ctx.fillRect(4, 1 + dy, 8, 5);
    ctx.fillStyle = palette.hair;
    ctx.fillRect(5, 2 + dy, 6, 4);
    if (palette.hat) {
      ctx.fillStyle = palette.hat;
      ctx.fillRect(3, 1 + dy, 10, 2);
      ctx.fillRect(5, 0 + dy, 6, 2);
    }

    // Face / Head
    ctx.fillStyle = "#f2c6a0";
    ctx.fillRect(5, 5 + dy, 6, 4);
    if (dir === "down") {
      ctx.fillStyle = "#1f1815";
      ctx.fillRect(6, 6 + dy, 1, 2);
      ctx.fillRect(9, 6 + dy, 1, 2);
    } else if (dir === "left") {
      ctx.fillStyle = "#1f1815";
      ctx.fillRect(6, 6 + dy, 1, 2);
    } else if (dir === "right") {
      ctx.fillStyle = "#1f1815";
      ctx.fillRect(9, 6 + dy, 1, 2);
    } else if (dir === "up") {
      ctx.fillStyle = palette.hair;
      ctx.fillRect(5, 5 + dy, 6, 4);
    }

    // Torso / Tunic
    ctx.fillStyle = "#1c1310";
    ctx.fillRect(4, 9 + dy, 8, 5);
    ctx.fillStyle = palette.shirt;
    ctx.fillRect(5, 9 + dy, 6, 4);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(5, 12 + dy, 6, 1);

    // Arms
    ctx.fillStyle = palette.shirt;
    ctx.fillRect(3, 9 + dy + (step === 1 ? 1 : 0), 1, 4);
    ctx.fillRect(12, 9 + dy + (step === 2 ? 1 : 0), 1, 4);

    // Legs
    ctx.fillStyle = "#362b2b";
    ctx.fillRect(5, 14 + legL, 2, 4);
    ctx.fillRect(9, 14 + legR, 2, 4);
    ctx.fillStyle = "#5c3d29";
    ctx.fillRect(5, 17 + legL, 2, 1);
    ctx.fillRect(9, 17 + legR, 2, 1);

    return c;
  };

  const out = {};
  for (const dir of ["down", "up", "left", "right"]) {
    out[dir] = [makeFrame(dir, 0), makeFrame(dir, 1), makeFrame(dir, 2)];
  }
  return out;
}

function createSlimeFrames(colorSet) {
  return [0, 1, 2].map((f) => {
    const squash = f === 1 ? 1 : 0;
    const stretch = f === 2 ? -1 : 0;
    const { c, ctx } = makeCanvas(16, 16);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(3, 13, 10, 2);

    const top = 5 + squash + stretch;
    const h = 9 - squash - stretch;
    ctx.fillStyle = colorSet.outline;
    ctx.fillRect(3, top, 10, h);
    ctx.fillStyle = colorSet.main;
    ctx.fillRect(4, top + 1, 8, h - 2);
    ctx.fillStyle = colorSet.highlight;
    ctx.fillRect(5, top + 2, 2, 2);
    // Cute angry eyes
    ctx.fillStyle = "#1c1310";
    ctx.fillRect(5, top + 4, 2, 2);
    ctx.fillRect(9, top + 4, 2, 2);
    return c;
  });
}

const atlasCache = new Map();

export function getSpriteAtlas(themeKey = "meadow") {
  const safeKey = TOWN_THEMES[themeKey] ? themeKey : "meadow";
  if (atlasCache.has(safeKey)) return atlasCache.get(safeKey);

  const theme = TOWN_THEMES[safeKey];
  const tiles = createTerrainTiles(theme);
  const scenery = createScenerySprites(theme);
  const buildings = {};
  for (const key of Object.keys(BUILDING_PALETTES)) {
    buildings[key] = createBuildingSprite(key);
  }

  const player = createCharacterFrames({
    hair: "#3d2618",
    shirt: "#d95b43",
    accent: "#f2c14e",
    hat: "#c85a3a",
  });

  const mayor = createCharacterFrames({
    hair: "#d9d4c7",
    shirt: "#2d6a4f",
    accent: "#f0c859",
    hat: "#4a3328",
  });

  const villagerPalettes = [
    { hair: "#2b1d14", shirt: "#3c6e9c", accent: "#e8c468" },
    { hair: "#733b24", shirt: "#4c8c5c", accent: "#f2e2b3" },
    { hair: "#202836", shirt: "#9e546d", accent: "#f0c167" },
    { hair: "#b87a3d", shirt: "#68589c", accent: "#e8d59b" },
  ];
  const villagers = villagerPalettes.map((p) => createCharacterFrames(p));

  const slimes = {
    green: createSlimeFrames({ outline: "#194726", main: "#46b864", highlight: "#9ff2a7" }),
    amber: createSlimeFrames({ outline: "#543210", main: "#e0952b", highlight: "#ffe08a" }),
    crimson: createSlimeFrames({ outline: "#4d1414", main: "#d94848", highlight: "#ffa3a3" }),
  };

  const atlas = { tiles, scenery, buildings, player, mayor, villagers, slimes, theme };
  atlasCache.set(safeKey, atlas);
  return atlas;
}
