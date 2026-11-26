/**
 * 8-directional Grid A* Pathfinder with strict corner-cutting prevention
 * and nearest-walkable fallback when clicking a solid tile.
 */

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414],
];

function isCellFree(mapObj, tx, ty) {
  if (!mapObj) return false;
  if (tx < 0 || ty < 0 || tx >= mapObj.width || ty >= mapObj.height) return false;
  return mapObj.solid[ty * mapObj.width + tx] === 0;
}

function nearestWalkableCell(mapObj, gx, gy, refX, refY) {
  if (isCellFree(mapObj, gx, gy)) return [gx, gy];
  let best = null;
  let bestScore = Infinity;
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (!isCellFree(mapObj, nx, ny)) continue;
        const score = Math.hypot(nx - gx, ny - gy) * 10 + Math.hypot(nx - refX, ny - refY) * 0.1;
        if (score < bestScore) {
          bestScore = score;
          best = [nx, ny];
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export function findPath(mapObj, startX, startY, goalX, goalY, maxSteps = 2200) {
  if (!mapObj) return [];
  const sx = Math.max(0, Math.min(mapObj.width - 1, Math.round(startX)));
  const sy = Math.max(0, Math.min(mapObj.height - 1, Math.round(startY)));
  const rawGx = Math.max(0, Math.min(mapObj.width - 1, Math.round(goalX)));
  const rawGy = Math.max(0, Math.min(mapObj.height - 1, Math.round(goalY)));

  const startCell = nearestWalkableCell(mapObj, sx, sy, sx, sy);
  const goalCell = nearestWalkableCell(mapObj, rawGx, rawGy, sx, sy);
  if (!startCell || !goalCell) return [];

  const [s0x, s0y] = startCell;
  const [gx, gy] = goalCell;
  if (s0x === gx && s0y === gy) {
    return Math.hypot(gx - startX, gy - startY) > 0.16 ? [{ x: gx, y: gy }] : [];
  }

  const W = mapObj.width;
  const total = W * mapObj.height;
  const gScore = new Float32Array(total);
  gScore.fill(Infinity);
  const cameFrom = new Int32Array(total);
  cameFrom.fill(-1);
  const closed = new Uint8Array(total);

  const startIdx = s0y * W + s0x;
  const goalIdx = gy * W + gx;
  gScore[startIdx] = 0;

  // Binary min-heap open list [f, idx]
  const heap = [[Math.hypot(gx - s0x, gy - s0y), startIdx]];
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      const tmp = heap[p];
      heap[p] = heap[i];
      heap[i] = tmp;
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        const tmp = heap[i];
        heap[i] = heap[smallest];
        heap[smallest] = tmp;
        i = smallest;
      }
    }
    return top;
  };

  let steps = 0;
  let reached = false;

  while (heap.length > 0 && steps < maxSteps) {
    steps++;
    const [, cur] = pop();
    if (cur === goalIdx) {
      reached = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = cur % W;
    const cy = (cur - cx) / W;

    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isCellFree(mapObj, nx, ny)) continue;
      // Strict corner-cutting check for diagonals
      if (dx !== 0 && dy !== 0) {
        if (!isCellFree(mapObj, cx + dx, cy) || !isCellFree(mapObj, cx, cy + dy)) continue;
      }
      const nIdx = ny * W + nx;
      if (closed[nIdx]) continue;

      const tentativeG = gScore[cur] + cost;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = cur;
        gScore[nIdx] = tentativeG;
        const h = Math.hypot(gx - nx, gy - ny);
        push([tentativeG + h, nIdx]);
      }
    }
  }

  if (!reached) return [];

  const path = [];
  let cur = goalIdx;
  while (cur !== -1 && cur !== startIdx) {
    const x = cur % W;
    const y = (cur - x) / W;
    path.push({ x, y });
    cur = cameFrom[cur];
  }
  path.reverse();
  return path;
}
