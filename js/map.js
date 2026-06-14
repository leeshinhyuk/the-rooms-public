'use strict';
// 무한 백룸: 24x24 타일 청크를 시드 기반으로 절차 생성.
// 청크 경계의 게이트 위치는 양쪽 청크가 같은 해시로 합의 → 전체 연결 보장.
BK.CHUNK = 24;
BK.CHUNK_PX = BK.CHUNK * BK.TILE;

BK.makeWorld = function (seed, zoneIdx) {
  return {
    seed: seed >>> 0,
    zoneIdx,
    cfg: BK.ZONES[zoneIdx],
    chunks: new Map(),    // 'cx,cy' -> chunk
    items: [],            // 좌표 확정된 아이템 {id,kind,x,y,got,noteIdx}
    pending: [],          // 청크 미생성 아이템 {id,kind,cx,cy,noteIdx}
    portal: null,         // {kind,x,y}
    portalPending: null,  // {kind,cx,cy}
    blockers: new Set(),  // 동적 장애물 타일 'tx,ty' (닫힌 문, 밀린 가구)
    bakedCount: 0,
  };
};

// 동적 장애물 설정/해제
BK.setBlocker = function (world, tx, ty, on) {
  const key = tx + ',' + ty;
  if (on) world.blockers.add(key); else world.blockers.delete(key);
};

BK.getChunk = function (world, cx, cy) {
  const key = cx + ',' + cy;
  let ch = world.chunks.get(key);
  if (ch) return ch;
  ch = genChunk(world, cx, cy);
  world.chunks.set(key, ch);
  resolvePending(world, ch);
  return ch;
};

BK.solid = function (world, tx, ty) {
  if (world.blockers.has(tx + ',' + ty)) return true;
  const C = BK.CHUNK;
  const cx = Math.floor(tx / C), cy = Math.floor(ty / C);
  const ch = BK.getChunk(world, cx, cy);
  return ch.grid[(ty - cy * C) * C + (tx - cx * C)] === 1;
};
BK.solidPx = function (world, x, y) {
  return BK.solid(world, Math.floor(x / BK.TILE), Math.floor(y / BK.TILE));
};

BK.addPendingItem = function (world, item) {
  const ch = world.chunks.get(item.cx + ',' + item.cy);
  if (ch) resolveItem(world, ch, item);
  else world.pending.push(item);
};

BK.spawnPortal = function (world, kind, cx, cy) {
  const ch = world.chunks.get(cx + ',' + cy);
  if (ch) {
    const cell = pickCell(world, ch, 999);
    world.portal = { kind, x: cell.x, y: cell.y };
  } else {
    world.portalPending = { kind, cx, cy };
  }
};

BK.randomFloorNear = function (world, x, y, rMin, rMax, tries) {
  for (let i = 0; i < (tries || 50); i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (!BK.solidPx(world, px, py)) return { x: px, y: py };
  }
  return null;
};

// ---------- 내부: 아이템 좌표 확정 ----------
function pickCell(world, ch, salt) {
  const cells = ch.floorCells;
  const i = BK.hashCoords(world.seed, ch.cx * 31 + salt, ch.cy * 17 - salt, salt) % cells.length;
  const c = cells[i];
  return {
    x: (ch.cx * BK.CHUNK + c.x) * BK.TILE + BK.TILE / 2,
    y: (ch.cy * BK.CHUNK + c.y) * BK.TILE + BK.TILE / 2,
  };
}
function resolveItem(world, ch, item) {
  // 아이템마다 다른 솔트 — 같은 청크에 떨어져도 다른 칸에 놓인다
  let salt = 100 + (item.noteIdx || 0) * 13;
  for (let i = 0; i < item.id.length; i++) salt += item.id.charCodeAt(i) * (i + 7);
  const cell = pickCell(world, ch, salt);
  world.items.push({ ...item, x: cell.x, y: cell.y, got: false });
}
function resolvePending(world, ch) {
  for (let i = world.pending.length - 1; i >= 0; i--) {
    const it = world.pending[i];
    if (it.cx === ch.cx && it.cy === ch.cy) {
      resolveItem(world, ch, it);
      world.pending.splice(i, 1);
    }
  }
  if (world.portalPending && world.portalPending.cx === ch.cx && world.portalPending.cy === ch.cy) {
    const cell = pickCell(world, ch, 999);
    world.portal = { kind: world.portalPending.kind, x: cell.x, y: cell.y };
    world.portalPending = null;
  }
}

// ---------- 내부: 청크 생성 ----------
function genChunk(world, cx, cy) {
  const C = BK.CHUNK, T = BK.TILE;
  const seed = world.seed;
  const cfg = world.cfg;
  const rng = BK.mulberry32(BK.hashCoords(seed, cx, cy, 1));
  const grid = new Uint8Array(C * C).fill(1);
  const idx = (x, y) => y * C + x;
  const inB = (x, y) => x >= 1 && y >= 1 && x < C - 1 && y < C - 1;

  function carveRect(x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (inB(x, y)) grid[idx(x, y)] = 0;
  }

  // 1) 방 흩뿌리기 — 더 크고 많이 파서 열린 공간 위주
  const nRooms = 11 + ((rng() * 5) | 0);
  for (let i = 0; i < nRooms; i++) {
    const w = 6 + ((rng() * 9) | 0), h = 5 + ((rng() * 8) | 0);
    carveRect(1 + Math.floor(rng() * (C - w - 2)), 1 + Math.floor(rng() * (C - h - 2)), w, h);
  }
  // 2) 넓은 복도 (폭 3)
  for (let i = 0; i < 4; i++) {
    if (rng() < 0.5) carveRect(1 + Math.floor(rng() * 6), 2 + Math.floor(rng() * (C - 6)), 16 + ((rng() * 8) | 0), 3);
    else carveRect(2 + Math.floor(rng() * (C - 6)), 1 + Math.floor(rng() * 6), 3, 16 + ((rng() * 8) | 0));
  }
  // 3) 칸막이 벽 (구역별 밀도 — 대폭 축소)
  const nPart = Math.round(11 * cfg.wallDensity);
  for (let i = 0; i < nPart; i++) {
    const x = 2 + Math.floor(rng() * (C - 4));
    const y = 2 + Math.floor(rng() * (C - 4));
    if (grid[idx(x, y)] !== 0) continue;
    const horiz = rng() < 0.5;
    const len = 2 + ((rng() * 3) | 0);
    for (let j = 0; j < len; j++) {
      const px = horiz ? x + j : x, py = horiz ? y : y + j;
      if (inB(px, py)) grid[idx(px, py)] = 1;
    }
  }
  // 4) 기둥 (소수)
  for (let i = 0; i < 4; i++) {
    const x = 2 + Math.floor(rng() * (C - 5));
    const y = 2 + Math.floor(rng() * (C - 5));
    if (grid[idx(x, y)] !== 0) continue;
    const s = rng() < 0.3 ? 2 : 1;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      if (inB(x + dx, y + dy)) grid[idx(x + dx, y + dy)] = 1;
    }
  }

  // 5) 게이트: 이웃 청크와 합의된 위치에 폭 2 통로
  //    북쪽 경계 id = (cx, cy, 71) / 서쪽 경계 id = (cx, cy, 72)
  function gatePos(bx, by, salt) {
    return 2 + (BK.hashCoords(seed, bx, by, salt) % (C - 5));
  }
  function carveGate(x, y, dx, dy) {
    let cx2 = x, cy2 = y;
    for (let s = 0; s < 12; s++) {
      let opened = false;
      for (const [ox, oy] of dx !== 0 ? [[0, 0], [0, 1]] : [[0, 0], [1, 0]]) {
        const px = cx2 + ox, py = cy2 + oy;
        if (px >= 0 && py >= 0 && px < C && py < C) {
          if (grid[idx(px, py)] === 0) opened = true;
          grid[idx(px, py)] = 0;
        }
      }
      if (opened && s > 1) break;
      cx2 += dx; cy2 += dy;
    }
  }
  carveGate(gatePos(cx, cy, 71), 0, 0, 1);          // 북
  carveGate(gatePos(cx, cy + 1, 71), C - 1, 0, -1); // 남
  carveGate(0, gatePos(cx, cy, 72), 1, 0);          // 서
  carveGate(C - 1, gatePos(cx + 1, cy, 72), -1, 0); // 동

  // 6) 청크 내부 연결성: 모든 바닥 영역을 잇는다
  function regions() {
    const label = new Int32Array(C * C).fill(-1);
    const regs = [];
    for (let i = 0; i < C * C; i++) {
      if (grid[i] !== 0 || label[i] !== -1) continue;
      const cells = [];
      const q = [i];
      label[i] = regs.length;
      while (q.length) {
        const cur = q.pop();
        cells.push(cur);
        const lx = cur % C;
        const nbs = [];
        if (lx > 0) nbs.push(cur - 1);
        if (lx < C - 1) nbs.push(cur + 1);
        if (cur >= C) nbs.push(cur - C);
        if (cur < C * (C - 1)) nbs.push(cur + C);
        for (const n of nbs) {
          if (grid[n] === 0 && label[n] === -1) { label[n] = regs.length; q.push(n); }
        }
      }
      regs.push(cells);
    }
    return regs;
  }
  let regs = regions();
  let guard = 0;
  while (regs.length > 1 && guard++ < 60) {
    regs.sort((a, b) => b.length - a.length);
    const main = regs[0], other = regs[1];
    const a = other[(rng() * other.length) | 0];
    const b = main[(rng() * main.length) | 0];
    let ax = a % C, ay = (a / C) | 0;
    const bx = b % C, by = (b / C) | 0;
    while (ax !== bx) { ax += Math.sign(bx - ax); grid[idx(ax, ay)] = 0; }
    while (ay !== by) { ay += Math.sign(by - ay); grid[idx(ax, ay)] = 0; }
    regs = regions();
  }

  // 바닥 셀 목록 (청크 로컬 좌표)
  const floorCells = [];
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    if (grid[idx(x, y)] === 0) floorCells.push({ x, y });
  }

  // 7) 형광등: 전역 좌표 패턴이라 청크 경계 무관하게 연속적
  const lights = [];
  const lc = cfg.light;
  for (const c of floorCells) {
    const gx = cx * C + c.x, gy = cy * C + c.y;
    const mod = (n, m) => ((n % m) + m) % m;
    if (mod(gx, lc.ex) === 2 && mod(gy, lc.ey) === 2 &&
        BK.hash01(seed, gx, gy, 5) < lc.p) {
      lights.push({
        x: gx * T + T / 2, y: gy * T + T / 2,
        phase: BK.hash01(seed, gx, gy, 6) * 10,
        broken: BK.hash01(seed, gx, gy, 7) < lc.broken,
        strobe: BK.hash01(seed, gx, gy, 8) < lc.strobe,
        red: BK.hash01(seed, gx, gy, 9) < lc.red,
      });
    }
  }

  // 8) 데칼 (구역별 구성)
  const decals = [];
  function scatter(kind, count, variants) {
    for (let i = 0; i < count; i++) {
      const c = floorCells[(rng() * floorCells.length) | 0];
      decals.push({
        kind, v: (rng() * variants) | 0,
        x: (cx * C + c.x) * T + ((rng() * 6) | 0) - 3,
        y: (cy * C + c.y) * T + ((rng() * 6) | 0) - 3,
      });
    }
  }
  if (world.zoneIdx === 0) {
    scatter('stains', 14, 5); scatter('damps', 6, 4); scatter('papers', 8, 3);
  } else if (world.zoneIdx === 1) {
    scatter('oils', 12, 4); scatter('stains', 6, 5); scatter('papers', 3, 3);
  } else {
    scatter('crayons', 9, 4); scatter('stains', 7, 5); scatter('damps', 3, 4);
  }

  // 9) 소품 + 벽 낙서 + 아몬드 워터
  const props = [];
  const z = world.zoneIdx;
  function placeProp(extra) {
    const c = floorCells[(rng() * floorCells.length) | 0];
    return Object.assign({
      x: (cx * C + c.x) * T + 8 + ((rng() * 4) | 0) - 2,
      y: (cy * C + c.y) * T + 8 + ((rng() * 4) | 0) - 2,
    }, extra);
  }
  // 구조물(데코, 충돌 없음) — 구역별
  const STRUCT = [
    ['crate', 'chair', 'pipe'],          // L0
    ['drum', 'pipe', 'crate', 'console'],// L2
    ['kchair', 'kdesk', 'crate'],        // L3
  ][z];
  const nStruct = 1 + ((rng() * 3) | 0);
  for (let i = 0; i < nStruct; i++) {
    props.push(placeProp({ kind: STRUCT[(rng() * STRUCT.length) | 0] }));
  }
  // 시체 — 먼저 떨어진 자들. 조사하면 메모(괴물 정보/약점/출구 단서).
  // 일부(scare)는 다가가면 후드에서 얼굴이 솟아 놀래킨다. 너무 흔하지 않게.
  if (rng() < 0.17) {
    // 기계실(L1): 일부 시신은 사람이 괴물로 굳어가는 중간 형태 — 변이 메모를 남긴다
    const turning = z === 1 && rng() < 0.42;
    props.push(placeProp({
      kind: 'corpse', v: (rng() * 2) | 0, read: false,
      scare: !turning && rng() < 0.3, faceShown: false, twitchT: 0,
      turning,
    }));
  }
  // 마네킹 (L2 전용 — 안 볼 때 이동)
  if (z === 1 && rng() < 0.28) {
    const n = 1 + ((rng() * 2) | 0);
    for (let i = 0; i < n; i++) props.push(placeProp({ kind: 'mannequin', noticed: false }));
  }
  // 사물함 (숨는 곳) — 모든 구역에 가끔
  if (rng() < 0.3) {
    const n = 1 + ((rng() * 2) | 0);
    for (let i = 0; i < n; i++) props.push(placeProp({ kind: 'locker' }));
  }
  // 장난감 (L3)
  if (z === 2) {
    const toys = ['teddy', 'ball', 'blocks'];
    const n = 2 + ((rng() * 3) | 0);
    for (let i = 0; i < n; i++) props.push(placeProp({ kind: toys[(rng() * toys.length) | 0] }));
  }
  const writeP = z === 1 ? 0.24 : 0.16;
  if (rng() < writeP) {
    // 남쪽이 바닥인 벽(벽지 면)에 낙서
    for (let t = 0; t < 30; t++) {
      const x = 1 + ((rng() * (C - 2)) | 0), y = 1 + ((rng() * (C - 3)) | 0);
      if (grid[idx(x, y)] === 1 && grid[idx(x, y + 1)] === 0) {
        props.push({
          kind: 'writing', v: (rng() * 3) | 0,
          x: (cx * C + x) * T + 8, y: (cy * C + y) * T + 8,
          msg: null, read: false,
        });
        break;
      }
    }
  }
  const bottles = [];
  if (rng() < cfg.bottleP) {
    const c = floorCells[(rng() * floorCells.length) | 0];
    bottles.push({ x: (cx * C + c.x) * T + 8, y: (cy * C + c.y) * T + 8, got: false });
  }
  // 픽업: 던질 돌
  const pickups = [];
  const nRocks = 1 + ((rng() * 2) | 0);
  for (let i = 0; i < nRocks; i++) {
    const c = floorCells[(rng() * floorCells.length) | 0];
    pickups.push({ kind: 'rock', x: (cx * C + c.x) * T + 8, y: (cy * C + c.y) * T + 8, got: false });
  }

  // 문 — 좁은 통로 한 곳에 (닫힌 채 시작, 열고 닫을 수 있음)
  if (rng() < 0.55) {
    for (let t = 0; t < 50; t++) {
      const x = 2 + ((rng() * (C - 4)) | 0), y = 2 + ((rng() * (C - 4)) | 0);
      if (grid[idx(x, y)] !== 0) continue;
      const wallLR = grid[idx(x - 1, y)] === 1 && grid[idx(x + 1, y)] === 1;
      const wallUD = grid[idx(x, y - 1)] === 1 && grid[idx(x, y + 1)] === 1;
      const gx = cx * C + x, gy = cy * C + y;
      if (wallLR && grid[idx(x, y - 1)] === 0 && grid[idx(x, y + 1)] === 0) {
        props.push({ kind: 'door', tx: gx, ty: gy, horiz: true, closed: true, x: gx * T + 8, y: gy * T + 8, breakT: 0, bangT: 0 });
        world.blockers.add(gx + ',' + gy);
        break;
      }
      if (wallUD && grid[idx(x - 1, y)] === 0 && grid[idx(x + 1, y)] === 0) {
        props.push({ kind: 'door', tx: gx, ty: gy, horiz: false, closed: true, x: gx * T + 8, y: gy * T + 8, breakT: 0, bangT: 0 });
        world.blockers.add(gx + ',' + gy);
        break;
      }
    }
  }

  // 미는 가구 — 사방 트인 곳에 (통로 봉쇄용)
  if (rng() < 0.45) {
    for (let t = 0; t < 30; t++) {
      const x = 3 + ((rng() * (C - 6)) | 0), y = 3 + ((rng() * (C - 6)) | 0);
      if (grid[idx(x, y)] !== 0) continue;
      let open = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid[idx(x + dx, y + dy)] !== 0) { open = false; break; }
      if (!open) continue;
      const gx = cx * C + x, gy = cy * C + y;
      props.push({ kind: 'pushcrate', tx: gx, ty: gy, x: gx * T + 8, y: gy * T + 8 });
      world.blockers.add(gx + ',' + gy);
      break;
    }
  }

  return { cx, cy, grid, floorCells, lights, decals, props, bottles, pickups, canvas: null, used: 0 };
}

// ---------- 지형 굽기 (청크 단위, LRU 캐시) ----------
BK.bakeChunk = function (world, ch) {
  const C = BK.CHUNK, T = BK.TILE;
  const A = BK.assets;
  const tiles = A.tiles[world.zoneIdx];
  const c = BK.makeCanvas(C * T, C * T), g = c.getContext('2d');
  const gSolid = (tx, ty) => BK.solid(world, tx, ty);

  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const gx = ch.cx * C + x, gy = ch.cy * C + y;
    if (ch.grid[y * C + x] === 0) {
      g.drawImage(tiles.carpet[(BK.hash01(world.seed, gx, gy, 11) * 4) | 0], x * T, y * T);
    } else if (!gSolid(gx, gy + 1)) {
      g.drawImage(tiles.wallFace, x * T, y * T);
      // 놀이방: 벽에 크레용 그림
      if (world.zoneIdx === 2 && BK.hash01(world.seed, gx, gy, 12) < 0.09) {
        g.globalAlpha = 0.8;
        g.drawImage(A.decals.crayons[(BK.hash01(world.seed, gx, gy, 13) * 4) | 0], x * T - 1, y * T + 1);
        g.globalAlpha = 1;
      }
    } else {
      g.drawImage(tiles.wallTop, x * T, y * T);
    }
  }
  for (const d of ch.decals) {
    g.drawImage(A.decals[d.kind][d.v], d.x - ch.cx * C * T, d.y - ch.cy * C * T);
  }
  // 벽 인접 AO 음영
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    if (ch.grid[y * C + x] !== 0) continue;
    const gx = ch.cx * C + x, gy = ch.cy * C + y;
    if (gSolid(gx, gy - 1)) g.drawImage(A.shadowN, x * T, y * T);
    if (gSolid(gx - 1, gy)) g.drawImage(A.shadowW, x * T, y * T);
    if (gSolid(gx + 1, gy)) g.drawImage(A.shadowE, x * T, y * T);
  }
  world.bakedCount++;
  return c;
};

// 캔버스 캐시 정리 (그리드는 유지 — 아이템/소품 상태 보존)
BK.evictChunks = function (world, nowT) {
  if (world.bakedCount <= 30) return;
  let oldest = null;
  for (const ch of world.chunks.values()) {
    if (ch.canvas && (!oldest || ch.used < oldest.used)) oldest = ch;
  }
  if (oldest) { oldest.canvas = null; world.bakedCount--; }
};

// ---------- 경로 탐색: 두 점 주변 윈도우 BFS ----------
BK.findPath = function (world, sx, sy, tx, ty) {
  const R = 40;
  const mx = (sx + tx) >> 1, my = (sy + ty) >> 1;
  if (Math.abs(sx - mx) > R - 2 || Math.abs(sy - my) > R - 2 ||
      Math.abs(tx - mx) > R - 2 || Math.abs(ty - my) > R - 2) return null;
  const D = R * 2 + 1, N = D * D;
  const x0 = mx - R, y0 = my - R;
  const sol = new Int8Array(N).fill(-1);
  const isSolid = (lx, ly) => {
    if (lx < 0 || ly < 0 || lx >= D || ly >= D) return true;
    const i = ly * D + lx;
    if (sol[i] < 0) sol[i] = BK.solid(world, x0 + lx, y0 + ly) ? 1 : 0;
    return sol[i] === 1;
  };
  const sIdx = (sy - y0) * D + (sx - x0), tIdx = (ty - y0) * D + (tx - x0);
  if (isSolid(sx - x0, sy - y0) || isSolid(tx - x0, ty - y0)) return null;
  if (sIdx === tIdx) return [];
  const prev = new Int32Array(N).fill(-2);
  const q = new Int32Array(N);
  let qh = 0, qt = 0;
  prev[sIdx] = -1; q[qt++] = sIdx;
  let found = false;
  while (qh < qt && !found) {
    const cur = q[qh++];
    const lx = cur % D, ly = (cur / D) | 0;
    const nbs = [];
    if (lx > 0) nbs.push(cur - 1);
    if (lx < D - 1) nbs.push(cur + 1);
    if (ly > 0) nbs.push(cur - D);
    if (ly < D - 1) nbs.push(cur + D);
    for (const n of nbs) {
      if (prev[n] !== -2) continue;
      if (isSolid(n % D, (n / D) | 0)) { prev[n] = -3; continue; }
      prev[n] = cur;
      if (n === tIdx) { found = true; break; }
      q[qt++] = n;
    }
  }
  if (!found) return null;
  const T = BK.TILE;
  const path = [];
  let cur = tIdx;
  while (cur !== sIdx) {
    path.push({
      x: (x0 + (cur % D)) * T + T / 2,
      y: (y0 + ((cur / D) | 0)) * T + T / 2,
    });
    cur = prev[cur];
  }
  path.reverse();
  return path;
};

// 시선/청각 검사. hearing=true면 벽을 일정 칸까지 통과 허용(소리는 벽을 새어 나온다)
BK.los = function (world, x0, y0, x1, y1, hearing) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(d / 4));
  const wallBudget = hearing ? 3 : 0; // 청각: 얇은 벽 ~3샘플(약 1.5타일)까지 투과
  let blocked = 0;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (BK.solidPx(world, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) {
      if (++blocked > wallBudget) return false;
    }
  }
  return true;
};
