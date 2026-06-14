'use strict';
// 모든 그래픽은 로드 시 코드로 그려서(절차 생성 픽셀아트) 외부 이미지가 필요 없다.

// ---------- 구역(존) 정의: 비주얼 + 게임플레이 파라미터 ----------
BK.ZONES = [
  {
    name: 'LEVEL 0', sub: '끝없는 노란 방',
    dark: 0.945, drain: 0.32, bottleP: 0.5, wallDensity: 0.55, ambush: false,
    light: { ex: 6, ey: 5, p: 0.62, broken: 0.18, strobe: 0.08, red: 0, pool: 'warm' },
    monsters: ['smiler'],
    quest: { kind: 'note', count: 5, label: '기록', done: '균열을 찾아라' },
  },
  {
    name: 'LEVEL 2', sub: '기계실',
    dark: 0.955, drain: 0.46, bottleP: 0.42, wallDensity: 0.85, ambush: true,
    light: { ex: 7, ey: 5, p: 0.5, broken: 0.3, strobe: 0.1, red: 0.4, pool: 'cold' },
    monsters: ['smiler', 'crawler', 'shade'],
    quest: { kind: 'fuse', count: 3, label: '퓨즈', done: '화물 엘리베이터를 찾아라' },
  },
  {
    name: 'LEVEL ???', sub: '놀이방',
    dark: 0.96, drain: 0.58, bottleP: 0.34, wallDensity: 0.5, ambush: false,
    light: { ex: 7, ey: 6, p: 0.45, broken: 0.25, strobe: 0.05, red: 0.12, pool: 'pink' },
    monsters: ['clown', 'child', 'child'],
    quest: { kind: 'spirit', count: 3, label: '영혼 해방', done: '문을 찾아라 — 달려' },
  },
];

BK.buildAssets = function () {
  const T = BK.TILE;
  const A = BK.assets = {};
  const mk = BK.makeCanvas;

  function noiseFill(g, w, h, base, shades, seed, darkP, lightP, darkC, lightC) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = BK.hash2(x, y, seed);
      if (v > 0.25) { g.fillStyle = shades[(v * shades.length) | 0]; g.fillRect(x, y, 1, 1); }
      if (v > 1 - darkP) { g.fillStyle = darkC; g.fillRect(x, y, 1, 1); }
      if (v < lightP) { g.fillStyle = lightC; g.fillRect(x, y, 1, 1); }
    }
  }

  // ============ 타일셋 0: 노란 방 ============
  function tilesYellow() {
    const carpet = [];
    for (let v = 0; v < 4; v++) {
      const c = mk(T, T);
      noiseFill(c.getContext('2d'), T, T, '#8a7a3d',
        ['#8e7d3e', '#857536', '#998746', '#7d6e33'], v * 13.7,
        0.035, 0.018, '#6f612c', '#a3914c');
      carpet.push(c);
    }
    const wallFace = mk(T, T); {
      const g = wallFace.getContext('2d');
      for (let x = 0; x < T; x++) {
        g.fillStyle = (x % 4) < 2 ? '#d8c468' : '#c6b056';
        g.fillRect(x, 0, 1, T);
      }
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const h = BK.hash2(x, y, 99.1);
        if (h > 0.94) { g.fillStyle = 'rgba(70,60,25,0.4)'; g.fillRect(x, y, 1, 1); }
        if (h < 0.03) { g.fillStyle = 'rgba(255,245,200,0.25)'; g.fillRect(x, y, 1, 1); }
      }
      for (let x = 0; x < T; x++) {
        if (BK.hash2(x, 0, 55.5) > 0.88) {
          g.fillStyle = 'rgba(85,70,30,0.3)';
          g.fillRect(x, 2 + ((BK.hash2(x, 1, 55.5) * 6) | 0), 1, 6);
        }
      }
      g.fillStyle = '#9b8c49'; g.fillRect(0, 0, T, 1);
      g.fillStyle = '#776a3e'; g.fillRect(0, T - 3, T, 1);
      g.fillStyle = '#5d5330'; g.fillRect(0, T - 2, T, 2);
      g.fillStyle = '#3f3920'; g.fillRect(0, T - 1, T, 1);
    }
    const wallTop = mk(T, T);
    noiseFill(wallTop.getContext('2d'), T, T, '#4a432a',
      ['#514a2e', '#464026'], 31.3, 0.12, 0.0, '#403a23', '#000');
    return { carpet, wallFace, wallTop };
  }

  // ============ 타일셋 1: 기계실 (콘크리트 + 금속 패널) ============
  function tilesMachine() {
    const carpet = [];
    for (let v = 0; v < 4; v++) {
      const c = mk(T, T), g = c.getContext('2d');
      noiseFill(g, T, T, '#4d4d45',
        ['#52524a', '#484840', '#57574e', '#43433c'], 200 + v * 7.7,
        0.03, 0.012, '#37372f', '#5f5f55');
      // 균열
      if (BK.hash2(v, 0, 8.8) > 0.4) {
        g.strokeStyle = 'rgba(25,25,20,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        let cx = BK.hash2(v, 1, 9) * T, cy = 0;
        g.moveTo(cx, cy);
        for (let i = 0; i < 4; i++) {
          cx += (BK.hash2(v, i + 2, 9) - 0.5) * 8; cy += 4;
          g.lineTo(cx, cy);
        }
        g.stroke();
      }
      carpet.push(c);
    }
    const wallFace = mk(T, T); {
      const g = wallFace.getContext('2d');
      for (let x = 0; x < T; x++) {
        g.fillStyle = (x % 5) < 1 ? '#454b50' : ((x % 5) < 3 ? '#5b6167' : '#525860');
        g.fillRect(x, 0, 1, T);
      }
      // 가로 이음매 + 리벳
      g.fillStyle = '#3a4045'; g.fillRect(0, 7, T, 1);
      for (let x = 2; x < T; x += 5) {
        g.fillStyle = '#343a3f'; g.fillRect(x, 3, 1, 1); g.fillRect(x, 11, 1, 1);
      }
      // 녹
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        if (BK.hash2(x, y, 77.7) > 0.92) {
          g.fillStyle = 'rgba(125,72,32,0.45)'; g.fillRect(x, y, 1, 1);
        }
      }
      g.fillStyle = '#6d757d'; g.fillRect(0, 0, T, 1);
      g.fillStyle = '#23272b'; g.fillRect(0, T - 2, T, 2);
    }
    const wallTop = mk(T, T);
    noiseFill(wallTop.getContext('2d'), T, T, '#2c3034',
      ['#30343a', '#282c30'], 41.1, 0.1, 0.0, '#222629', '#000');
    return { carpet, wallFace, wallTop };
  }

  // ============ 타일셋 2: 놀이방 (체크무늬 리놀륨 + 분홍 벽지) ============
  function tilesNursery() {
    const carpet = [];
    for (let v = 0; v < 4; v++) {
      const c = mk(T, T), g = c.getContext('2d');
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const check = ((x >> 3) + (y >> 3)) % 2 === 0;
        g.fillStyle = check ? '#b2a288' : '#9f8f76';
        g.fillRect(x, y, 1, 1);
        const h = BK.hash2(x, y, 300 + v * 5.5);
        if (h > 0.93) { g.fillStyle = 'rgba(70,60,45,0.35)'; g.fillRect(x, y, 1, 1); }
        if (h < 0.02) { g.fillStyle = 'rgba(255,250,235,0.3)'; g.fillRect(x, y, 1, 1); }
      }
      g.fillStyle = 'rgba(60,50,40,0.25)';
      g.fillRect(0, 7, T, 1); g.fillRect(7, 0, 1, T); // 타일 줄눈 느낌
      carpet.push(c);
    }
    const wallFace = mk(T, T); {
      const g = wallFace.getContext('2d');
      for (let x = 0; x < T; x++) {
        g.fillStyle = (x % 4) < 2 ? '#c5a0a8' : '#b48f98';
        g.fillRect(x, 0, 1, T);
      }
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const h = BK.hash2(x, y, 88.8);
        if (h > 0.93) { g.fillStyle = 'rgba(80,50,55,0.4)'; g.fillRect(x, y, 1, 1); }
      }
      g.fillStyle = '#d8b8be'; g.fillRect(0, 0, T, 1);
      g.fillStyle = '#8a666d'; g.fillRect(0, 9, T, 1); // 징두리 몰딩
      g.fillStyle = '#6d4d53'; g.fillRect(0, T - 2, T, 2);
    }
    const wallTop = mk(T, T);
    noiseFill(wallTop.getContext('2d'), T, T, '#463238',
      ['#4b373d', '#412e34'], 51.5, 0.1, 0.0, '#3a282d', '#000');
    return { carpet, wallFace, wallTop };
  }

  A.tiles = [tilesYellow(), tilesMachine(), tilesNursery()];

  // ---------- 바닥 음영(벽 인접 AO) ----------
  function shadowTile(dir) {
    const c = mk(T, T), g = c.getContext('2d');
    let grad;
    if (dir === 'n') grad = g.createLinearGradient(0, 0, 0, 7);
    else if (dir === 'w') grad = g.createLinearGradient(0, 0, 6, 0);
    else grad = g.createLinearGradient(T, 0, T - 6, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.34)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, T, T);
    return c;
  }
  A.shadowN = shadowTile('n');
  A.shadowW = shadowTile('w');
  A.shadowE = shadowTile('e');

  // ---------- 데칼 ----------
  function blobDecal(size, seed, colors, n, rad) {
    const c = mk(size, size), g = c.getContext('2d');
    const rng = BK.mulberry32(seed);
    const cx = size / 2 + (rng() - 0.5) * 4, cy = size / 2 + (rng() - 0.5) * 4;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, r = rng() * rad;
      g.fillStyle = colors[i < n / 3 ? 0 : 1];
      g.beginPath();
      g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1 + rng() * 2.4, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }
  A.decals = { stains: [], damps: [], papers: [], oils: [], crayons: [] };
  for (let v = 0; v < 5; v++) A.decals.stains.push(
    blobDecal(T, 400 + v, ['rgba(45,38,15,0.32)', 'rgba(45,38,15,0.22)'], 14, 4.5));
  for (let v = 0; v < 4; v++) A.decals.damps.push(
    blobDecal(T * 2, 900 + v, ['rgba(38,46,22,0.35)', 'rgba(50,58,26,0.2)'], 22, 9));
  for (let v = 0; v < 4; v++) A.decals.oils.push(
    blobDecal(T * 2, 1100 + v, ['rgba(12,12,16,0.5)', 'rgba(18,18,24,0.3)'], 20, 8));
  for (let v = 0; v < 3; v++) {
    const c = mk(10, 10), g = c.getContext('2d');
    const rng = BK.mulberry32(1300 + v);
    g.save(); g.translate(5, 5); g.rotate((rng() - 0.5) * 1.2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-2, -2, 5, 7);
    g.fillStyle = '#d6cfb4'; g.fillRect(-3, -3, 5, 7);
    g.fillStyle = '#97916f';
    g.fillRect(-2, -2, 3, 1); g.fillRect(-2, 0, 3, 1); g.fillRect(-2, 2, 2, 1);
    g.restore();
    A.decals.papers.push(c);
  }
  // 크레용 낙서 (바닥)
  const crayonCols = ['#c05a50', '#5a78c0', '#5aa058', '#c0a050'];
  for (let v = 0; v < 4; v++) {
    const c = mk(18, 18), g = c.getContext('2d');
    const rng = BK.mulberry32(1500 + v);
    g.strokeStyle = crayonCols[v]; g.globalAlpha = 0.55; g.lineWidth = 1.4;
    g.beginPath();
    let x = 3 + rng() * 4, y = 3 + rng() * 4;
    g.moveTo(x, y);
    for (let i = 0; i < 7; i++) {
      x += (rng() - 0.4) * 7; y += (rng() - 0.4) * 7;
      g.lineTo(BK.clamp(x, 1, 17), BK.clamp(y, 1, 17));
    }
    g.stroke();
    if (v === 0) { // 웃는 얼굴 낙서
      g.beginPath(); g.arc(9, 9, 5, 0, Math.PI * 2); g.stroke();
      g.fillStyle = crayonCols[0];
      g.fillRect(7, 7, 1, 2); g.fillRect(11, 7, 1, 2);
      g.beginPath(); g.arc(9, 9, 3.4, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }
    A.decals.crayons.push(c);
  }
  // 벽의 핏빛 낙서
  A.writings = [];
  for (let v = 0; v < 3; v++) {
    const c = mk(14, 10), g = c.getContext('2d');
    const rng = BK.mulberry32(1700 + v);
    g.strokeStyle = 'rgba(110,22,18,0.85)'; g.lineWidth = 1.2;
    for (let s = 0; s < 4; s++) {
      g.beginPath();
      const x0 = 1 + s * 3.4;
      g.moveTo(x0, 2 + rng() * 3);
      g.lineTo(x0 + 1.5, 7 + rng() * 2);
      if (rng() > 0.5) g.lineTo(x0 + 2.8, 2.5 + rng() * 3);
      g.stroke();
    }
    g.fillStyle = 'rgba(110,22,18,0.5)';
    g.fillRect(2 + ((rng() * 9) | 0), 8, 1, 2); // 흘러내린 핏자국
    A.writings.push(c);
  }

  // ---------- 형광등 ----------
  function pool(colCore, colMid) {
    const s = 72, c = mk(s, s), g = c.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    rg.addColorStop(0, colCore);
    rg.addColorStop(0.45, colMid);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    return c;
  }
  A.pools = {
    warm: pool('rgba(255,246,190,0.5)', 'rgba(255,240,170,0.2)'),
    cold: pool('rgba(215,235,255,0.42)', 'rgba(200,225,255,0.16)'),
    pink: pool('rgba(255,224,214,0.4)', 'rgba(255,210,200,0.15)'),
    red: pool('rgba(255,60,40,0.45)', 'rgba(200,30,20,0.18)'),
  };
  A.lightTube = (() => {
    const c = mk(14, 8), g = c.getContext('2d');
    g.fillStyle = 'rgba(120,110,60,0.5)'; g.fillRect(0, 1, 14, 6);
    g.fillStyle = '#fff9d8'; g.fillRect(1, 2, 12, 4);
    g.fillStyle = '#ffffff'; g.fillRect(2, 3, 10, 2);
    return c;
  })();
  A.redLamp = (() => {
    const c = mk(8, 8), g = c.getContext('2d');
    g.fillStyle = 'rgba(60,20,16,0.6)'; g.fillRect(1, 1, 6, 6);
    g.fillStyle = '#ff4030'; g.fillRect(2, 2, 4, 4);
    g.fillStyle = '#ffb0a0'; g.fillRect(3, 3, 2, 2);
    return c;
  })();

  // ---------- 아이템 ----------
  A.bottle = (() => {
    const c = mk(10, 14), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 12, 6, 2);
    g.fillStyle = '#2e3d44'; g.fillRect(2, 4, 6, 9);
    g.fillStyle = '#bfe0ea'; g.fillRect(3, 5, 4, 7);
    g.fillStyle = '#8fc0d2'; g.fillRect(3, 9, 4, 3);
    g.fillStyle = '#caa64e'; g.fillRect(3, 1, 4, 3);
    g.fillStyle = '#efe9d2'; g.fillRect(3, 7, 4, 2);
    g.fillStyle = '#7a6c42'; g.fillRect(4, 7, 2, 1);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(3, 5, 1, 3);
    return c;
  })();
  A.note = (() => {
    const c = mk(11, 12), g = c.getContext('2d');
    g.save(); g.translate(5.5, 6); g.rotate(-0.18);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-3, -4, 8, 10);
    g.fillStyle = '#ece4c6'; g.fillRect(-4, -5, 8, 10);
    g.fillStyle = '#8a8468';
    g.fillRect(-3, -3, 6, 1); g.fillRect(-3, -1, 6, 1);
    g.fillRect(-3, 1, 4, 1); g.fillRect(-3, 3, 5, 1);
    g.restore();
    return c;
  })();
  A.fuse = (() => {
    const c = mk(10, 13), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 11, 6, 2);
    g.fillStyle = '#b87333'; g.fillRect(2, 1, 6, 2);  // 구리 캡
    g.fillStyle = '#b87333'; g.fillRect(2, 9, 6, 2);
    g.fillStyle = '#8a2c24'; g.fillRect(2, 3, 6, 6);  // 몸통
    g.fillStyle = '#b8453a'; g.fillRect(3, 3, 1, 6);
    g.fillStyle = '#e8d8c0'; g.fillRect(4, 5, 2, 2);  // 라벨
    return c;
  })();
  A.gear = (() => {
    const c = mk(13, 13), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(6.5, 11, 5, 1.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9a227';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillRect(5.5 + Math.cos(a) * 4.6, 5.5 + Math.sin(a) * 4.6, 2, 2);
    }
    g.beginPath(); g.arc(6.5, 6.5, 4.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8c84a';
    g.beginPath(); g.arc(6.5, 6.5, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5a4a18';
    g.beginPath(); g.arc(6.5, 6.5, 1.4, 0, Math.PI * 2); g.fill();
    return c;
  })();

  // ---------- 포털 ----------
  // 균열 (글리치, 4프레임)
  A.rift = [];
  for (let f = 0; f < 4; f++) {
    const s = 32, c = mk(s, s), g = c.getContext('2d');
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = x - 16, dy = y - 16, d = Math.hypot(dx, dy);
      if (d > 15) continue;
      const h = BK.hash2(x, y, f * 7.77);
      if (d > 11 && h > 0.45) continue;
      let col = '#080512';
      if (h > 0.92) col = '#a44ee0';
      else if (h > 0.87) col = '#41c8d4';
      else if (h > 0.81) col = '#553a8a';
      else if (d < 5 && h > 0.55) col = '#04020c';
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    A.rift.push(c);
  }
  // 화물 엘리베이터
  A.elevator = (() => {
    const c = mk(30, 36), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(2, 33, 26, 3);
    g.fillStyle = '#2a2e33'; g.fillRect(0, 0, 30, 34);     // 프레임
    g.fillStyle = '#4a5057'; g.fillRect(2, 2, 26, 30);
    g.fillStyle = '#5a626a'; g.fillRect(3, 3, 11, 28);     // 왼문
    g.fillStyle = '#555d65'; g.fillRect(16, 3, 11, 28);    // 오른문
    g.fillStyle = '#23272b'; g.fillRect(14, 3, 2, 28);     // 틈
    g.fillStyle = '#1a1d20';
    g.fillRect(4, 8, 9, 1); g.fillRect(17, 8, 9, 1);       // 패널 라인
    g.fillRect(4, 24, 9, 1); g.fillRect(17, 24, 9, 1);
    g.fillStyle = '#c9a227'; g.fillRect(12, 0, 6, 2);      // 표시등
    g.fillStyle = 'rgba(255,220,120,0.7)'; g.fillRect(13, 0, 4, 1);
    return c;
  })();
  // 마지막 문 (빛이 새어나오는)
  A.door = (() => {
    const c = mk(22, 32), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(2, 29, 18, 3);
    g.fillStyle = '#241a14'; g.fillRect(0, 0, 22, 30);
    g.fillStyle = '#3c2c20'; g.fillRect(2, 2, 18, 27);
    g.fillStyle = '#33251b'; g.fillRect(4, 4, 6, 11); g.fillRect(12, 4, 6, 11);
    g.fillRect(4, 17, 6, 10); g.fillRect(12, 17, 6, 10);
    g.fillStyle = '#c9b380'; g.fillRect(16, 15, 2, 3); // 손잡이
    // 새어나오는 빛
    g.fillStyle = 'rgba(240,250,255,0.95)';
    g.fillRect(0, 29, 22, 1);
    g.fillRect(10, 0, 2, 30);
    g.fillStyle = 'rgba(240,250,255,0.4)';
    g.fillRect(9, 0, 4, 30); g.fillRect(0, 28, 22, 2);
    return c;
  })();

  // ---------- 소품 ----------
  A.mannequin = (() => {
    const c = mk(14, 27), g = c.getContext('2d');
    const B = '#cfc4b0', D = '#a89e8a';
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(7, 25.5, 5, 1.8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = D; g.fillRect(5, 22, 4, 3);          // 받침대 기둥
    g.fillStyle = '#6a6052'; g.fillRect(3, 24, 8, 2);  // 받침
    g.fillStyle = B;
    g.fillRect(5, 9, 4, 9);                            // 몸통
    g.fillRect(4, 10, 1, 6); g.fillRect(9, 10, 1, 6);  // 팔 (붙은)
    g.fillStyle = D; g.fillRect(5, 17, 4, 1);          // 허리 이음새
    g.fillStyle = B;
    g.fillRect(5, 2, 4, 6);                            // 머리 (이목구비 없음)
    g.fillRect(6, 1, 2, 1);
    g.fillStyle = D; g.fillRect(5, 7, 4, 1);           // 목 이음새
    return c;
  })();
  A.teddy = (() => {
    const c = mk(10, 10), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(2, 8, 6, 2);
    g.fillStyle = '#7a5a3a';
    g.fillRect(3, 4, 4, 5); g.fillRect(2, 5, 1, 2); g.fillRect(7, 5, 1, 2);
    g.fillRect(3, 1, 4, 3); g.fillRect(2, 0, 2, 2); g.fillRect(6, 0, 2, 2);
    g.fillStyle = '#1a1410'; g.fillRect(4, 2, 1, 1); g.fillRect(6, 2, 1, 1);
    g.fillStyle = '#5a4028'; g.fillRect(4, 6, 2, 2);
    return c;
  })();
  A.ball = (() => {
    const c = mk(8, 8), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(4, 7, 3, 1, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b04840';
    g.beginPath(); g.arc(4, 4, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8d0c0';
    g.fillRect(1.5, 3, 5, 2);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(3, 2, 1, 1);
    return c;
  })();
  A.blocks = (() => {
    const c = mk(10, 8), g = c.getContext('2d');
    g.fillStyle = '#5a78c0'; g.fillRect(1, 3, 4, 4);
    g.fillStyle = '#c0a050'; g.fillRect(5, 4, 4, 4);
    g.fillStyle = '#b04840'; g.fillRect(3, 0, 4, 4);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(1, 6, 8, 1);
    return c;
  })();

  // ---------- 구조물(데코) ----------
  A.crate = (() => {                 // 낡은 나무 상자
    const c = mk(16, 15), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 13, 12, 2);
    g.fillStyle = '#6e5734'; g.fillRect(2, 3, 12, 11);
    g.fillStyle = '#5a4628'; g.fillRect(2, 3, 12, 1); g.fillRect(2, 13, 12, 1);
    g.fillStyle = '#7d6440';
    for (let x = 3; x < 14; x += 3) g.fillRect(x, 4, 1, 9);
    g.fillStyle = '#4a3a22'; g.fillRect(2, 8, 12, 1);   // 띠
    g.fillStyle = 'rgba(255,240,200,0.1)'; g.fillRect(3, 4, 10, 1);
    return c;
  })();
  A.chair = (() => {                 // 쓰러질 듯한 사무용 의자
    const c = mk(14, 18), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(3, 16, 9, 2);
    g.fillStyle = '#2c2c30'; g.fillRect(4, 1, 6, 8);    // 등받이
    g.fillStyle = '#3a3a40'; g.fillRect(5, 2, 4, 6);
    g.fillStyle = '#26262a'; g.fillRect(3, 9, 8, 2);    // 좌석
    g.fillStyle = '#1c1c20'; g.fillRect(6, 11, 2, 4);   // 기둥
    g.fillStyle = '#15151a'; g.fillRect(4, 15, 6, 1);   // 다리
    return c;
  })();
  A.pipe = (() => {                  // 벽을 타는 파이프
    const c = mk(8, 20), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(5, 0, 2, 20);
    g.fillStyle = '#5a5e62'; g.fillRect(2, 0, 4, 20);
    g.fillStyle = '#74787c'; g.fillRect(2, 0, 1, 20);
    g.fillStyle = '#3e4246'; g.fillRect(1, 4, 6, 2); g.fillRect(1, 14, 6, 2); // 이음매
    g.fillStyle = 'rgba(125,72,32,0.4)'; g.fillRect(3, 8, 2, 4); // 녹
    return c;
  })();
  A.drum = (() => {                  // 드럼통
    const c = mk(14, 18), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 16, 10, 2);
    g.fillStyle = '#3a5a3a'; g.fillRect(2, 2, 10, 14);
    g.fillStyle = '#2c462c'; g.fillRect(2, 2, 10, 1); g.fillRect(2, 15, 10, 1);
    g.fillStyle = '#4a6e4a'; g.fillRect(2, 6, 10, 1); g.fillRect(2, 11, 10, 1);
    g.fillStyle = '#2c462c'; g.fillRect(3, 2, 8, 1);   // 뚜껑
    g.fillStyle = 'rgba(125,72,32,0.5)'; g.fillRect(3, 9, 3, 5); // 녹
    g.fillStyle = '#d8c84a'; g.fillRect(6, 8, 2, 3);   // 위험 표식
    return c;
  })();
  A.console = (() => {               // 죽은 제어반
    const c = mk(18, 16), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 14, 14, 2);
    g.fillStyle = '#33373c'; g.fillRect(1, 2, 16, 13);
    g.fillStyle = '#23272b'; g.fillRect(2, 3, 14, 7);  // 패널
    for (let i = 0; i < 4; i++) {                       // 죽은 표시등
      g.fillStyle = ['#5a2222', '#5a5022', '#22405a', '#333'][i];
      g.fillRect(3 + i * 3, 5, 2, 2);
    }
    g.fillStyle = '#444'; g.fillRect(3, 10, 12, 3);    // 스위치 줄
    for (let x = 4; x < 15; x += 3) { g.fillStyle = '#666'; g.fillRect(x, 11, 1, 1); }
    return c;
  })();
  A.kchair = (() => {                // 작은 어린이 의자
    const c = mk(10, 13), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(2, 11, 6, 2);
    g.fillStyle = '#a85a4a'; g.fillRect(3, 1, 4, 6);   // 등받이
    g.fillStyle = '#bf6a58'; g.fillRect(3, 1, 4, 1);
    g.fillStyle = '#945046'; g.fillRect(2, 7, 6, 2);   // 좌석
    g.fillStyle = '#7a4038'; g.fillRect(3, 9, 1, 3); g.fillRect(6, 9, 1, 3);
    return c;
  })();
  A.kdesk = (() => {                 // 작은 책상
    const c = mk(18, 12), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(2, 10, 14, 2);
    g.fillStyle = '#9a7a4a'; g.fillRect(1, 3, 16, 3);  // 상판
    g.fillStyle = '#b08c54'; g.fillRect(1, 3, 16, 1);
    g.fillStyle = '#7a5e38'; g.fillRect(2, 6, 2, 5); g.fillRect(14, 6, 2, 5); // 다리
    g.fillStyle = '#caa050'; g.fillRect(6, 1, 5, 2);   // 위에 종이
    return c;
  })();

  // ---------- 도구 아이템 ----------
  A.battery = (() => {
    const c = mk(10, 12), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, 10, 6, 2);
    g.fillStyle = '#3a3a3e'; g.fillRect(3, 0, 4, 1);   // 단자
    g.fillStyle = '#1f6f3a'; g.fillRect(2, 1, 6, 9);   // 몸통(녹색)
    g.fillStyle = '#2a8f4c'; g.fillRect(2, 1, 6, 1);
    g.fillStyle = '#d8c84a'; g.fillRect(2, 4, 6, 3);   // 라벨
    g.fillStyle = '#1a1a1c'; g.fillRect(3, 5, 4, 1);   // + 표시
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(2, 1, 1, 8);
    return c;
  })();
  A.rock = (() => {
    const c = mk(8, 7), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(1, 5, 6, 2);
    g.fillStyle = '#6a6660'; g.fillRect(1, 1, 6, 5);
    g.fillStyle = '#7a766f'; g.fillRect(1, 1, 5, 2);
    g.fillStyle = '#54514b'; g.fillRect(4, 3, 3, 3);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(2, 1, 2, 1);
    return c;
  })();

  // ---------- 사물함 (숨는 곳) ----------
  function paintLocker(open) {
    const c = mk(16, 28), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(2, 26, 12, 2);
    g.fillStyle = '#3c4650'; g.fillRect(1, 0, 14, 27);     // 외곽
    g.fillStyle = '#2c343c'; g.fillRect(1, 0, 14, 1);
    if (open) {
      g.fillStyle = '#0a0c0e'; g.fillRect(3, 2, 10, 23);   // 열린 내부(어둠)
      g.fillStyle = '#2c343c'; g.fillRect(11, 2, 4, 23);   // 열린 문(옆)
      g.fillStyle = '#454f59'; g.fillRect(11, 2, 1, 23);
    } else {
      g.fillStyle = '#48535d'; g.fillRect(2, 1, 12, 25);   // 닫힌 문
      g.fillStyle = '#3a444d'; g.fillRect(7, 1, 1, 25);    // 가운데 틈
      // 통풍구 슬릿
      g.fillStyle = '#23292f';
      for (let y = 4; y < 12; y += 2) { g.fillRect(3, y, 4, 1); g.fillRect(9, y, 4, 1); }
      g.fillStyle = '#23292f'; g.fillRect(6, 14, 1, 3); g.fillRect(9, 14, 1, 3); // 손잡이
    }
    // 녹
    for (let y = 0; y < 27; y++) for (let x = 1; x < 15; x++) {
      if (BK.hash2(x, y, 61.3) > 0.94) { g.fillStyle = 'rgba(125,72,32,0.4)'; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  A.locker = paintLocker(false);
  A.lockerOpen = paintLocker(true);

  // ---------- 문 (열고 닫기) ----------
  function paintDoor(horiz, open) {
    const c = mk(T, T), g = c.getContext('2d');
    if (horiz) {
      if (open) {
        g.fillStyle = '#3a2c20'; g.fillRect(0, 5, 3, 6); g.fillRect(13, 5, 3, 6); // 문틀
        g.fillStyle = '#241a12'; g.fillRect(1, 6, 1, 4); g.fillRect(14, 6, 1, 4);
      } else {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 12, 16, 2);
        g.fillStyle = '#5a4632'; g.fillRect(0, 4, 16, 9);
        g.fillStyle = '#6e5740'; g.fillRect(0, 4, 16, 1);
        g.fillStyle = '#4a3826'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 10, 16, 1);
        g.fillStyle = '#caa050'; g.fillRect(9, 7, 2, 2); // 손잡이
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 4, 1, 9); g.fillRect(15, 4, 1, 9);
      }
    } else {
      if (open) {
        g.fillStyle = '#3a2c20'; g.fillRect(5, 0, 6, 3); g.fillRect(5, 13, 6, 3);
        g.fillStyle = '#241a12'; g.fillRect(6, 1, 4, 1); g.fillRect(6, 14, 4, 1);
      } else {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(3, 14, 11, 2);
        g.fillStyle = '#5a4632'; g.fillRect(4, 0, 9, 15);
        g.fillStyle = '#6e5740'; g.fillRect(4, 0, 1, 15);
        g.fillStyle = '#4a3826'; g.fillRect(7, 0, 1, 15); g.fillRect(10, 0, 1, 15);
        g.fillStyle = '#caa050'; g.fillRect(6, 8, 2, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(4, 0, 9, 1); g.fillRect(4, 14, 9, 1);
      }
    }
    return c;
  }
  A.doorHC = paintDoor(true, false);
  A.doorHO = paintDoor(true, true);
  A.doorVC = paintDoor(false, false);
  A.doorVO = paintDoor(false, true);

  // ---------- 미는 가구 (무거운 금속 캐비닛) ----------
  A.heavycrate = (() => {
    const c = mk(16, 18), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(1, 16, 14, 2);
    g.fillStyle = '#54585e'; g.fillRect(1, 2, 14, 15);
    g.fillStyle = '#666a70'; g.fillRect(1, 2, 14, 1);
    g.fillStyle = '#42464c'; g.fillRect(1, 2, 1, 15);
    g.fillStyle = '#3e4248'; g.fillRect(1, 9, 14, 1);     // 서랍 구분선
    g.fillStyle = '#2e3236'; g.fillRect(6, 5, 4, 1); g.fillRect(6, 12, 4, 1); // 손잡이
    for (let y = 2; y < 17; y++) for (let x = 1; x < 15; x++) {
      if (BK.hash2(x, y, 71.7) > 0.95) { g.fillStyle = 'rgba(125,72,32,0.4)'; g.fillRect(x, y, 1, 1); }
    }
    return c;
  })();

  // ---------- 시체 (먼저 떨어진 자) — face=true면 후드에서 얼굴이 솟는다 ----------
  function paintCorpse(v, face) {
    const c = mk(20, 14), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath(); g.ellipse(10, 11, 9, 3, 0, 0, Math.PI * 2); g.fill();
    // 말라붙은 핏자국
    g.fillStyle = v ? 'rgba(80,18,16,0.5)' : 'rgba(60,40,18,0.45)';
    g.beginPath(); g.ellipse(9, 11, 8, 2.4, 0, 0, Math.PI * 2); g.fill();
    // 후드 입은 몸 (옆으로 누움)
    const HOOD = v ? '#3a4a40' : '#42525e', HOODD = v ? '#2c3a32' : '#33414b';
    g.fillStyle = HOOD; g.fillRect(5, 6, 11, 5);
    g.fillStyle = HOODD; g.fillRect(5, 9, 11, 2);
    g.fillStyle = HOOD; g.fillRect(14, 7, 4, 4);       // 머리(후드)
    if (!face) {
      g.fillStyle = '#1a1a1e'; g.fillRect(16, 8, 2, 2);  // 후드 그늘(눈코입 없음)
    } else {
      // 솟아오른 얼굴 — 창백한 살, 텅 빈 눈, 찢어진 비명
      g.fillStyle = '#cabca9'; g.fillRect(14, 6, 4, 5);
      g.fillStyle = '#10070a'; g.fillRect(15, 7, 1, 2); g.fillRect(17, 7, 1, 2); // 텅 빈 눈
      g.fillStyle = '#3a0a0c'; g.fillRect(15, 9, 3, 2);  // 벌어진 입
      g.fillStyle = '#e8dccb'; g.fillRect(15, 9, 3, 1);  // 윗니
      g.fillStyle = 'rgba(8,4,6,0.55)'; g.fillRect(15, 9, 1, 2); // 흘러내린 검은 자국
    }
    // 뻗은 팔/다리
    g.fillStyle = HOODD; g.fillRect(2, 8, 4, 2);
    g.fillStyle = '#b8966c'; g.fillRect(1, 8, 1, 2);   // 손
    g.fillStyle = '#262d36'; g.fillRect(6, 11, 6, 2);  // 바지
    return c;
  }
  A.corpse = [paintCorpse(0, false), paintCorpse(1, false)];
  A.corpseFace = [paintCorpse(0, true), paintCorpse(1, true)];

  // ---------- 변해가는 시신 — 사람이 잿빛 '꺼진 것'으로 굳어가는 중간 형태 ----------
  function paintCorpseTurning(v) {
    const c = mk(20, 14), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.beginPath(); g.ellipse(10, 11, 9, 3, 0, 0, Math.PI * 2); g.fill();
    // 후드 입은 몸 (사람 쪽 절반)
    const HOOD = v ? '#3a4a40' : '#42525e', HOODD = v ? '#2c3a32' : '#33414b';
    g.fillStyle = HOOD; g.fillRect(5, 6, 11, 5);
    g.fillStyle = HOODD; g.fillRect(5, 9, 11, 2);
    // 잿빛 돌이 몸을 잠식한다 (왼쪽부터 굳음)
    const ASH = '#565562', ASHL = '#8f8e9e', CRACK = '#1a1920';
    g.fillStyle = ASH; g.fillRect(5, 6, 5, 5);
    g.fillStyle = ASHL; g.fillRect(5, 6, 5, 1);
    g.fillStyle = CRACK; g.fillRect(7, 6, 1, 5); g.fillRect(5, 8, 4, 1); // 균열
    // 손도 굳어 돌이 됨
    g.fillStyle = ASH; g.fillRect(2, 8, 4, 2);
    g.fillStyle = '#b8966c'; g.fillRect(1, 8, 1, 2);  // 아직 사람인 손끝
    // 머리(후드) — 잿빛으로 굳으며 텅 빈 얼굴이 떠오른다
    g.fillStyle = ASH; g.fillRect(14, 7, 4, 4);
    g.fillStyle = ASHL; g.fillRect(14, 7, 4, 1);
    g.fillStyle = '#0a090c'; g.fillRect(15, 8, 1, 2); g.fillRect(17, 8, 1, 2); // 텅 빈 눈
    g.fillStyle = 'rgba(220,224,210,0.8)'; g.fillRect(15, 8, 1, 1); g.fillRect(17, 8, 1, 1); // 흐릿한 눈빛
    g.fillStyle = CRACK; g.fillRect(16, 7, 1, 4);     // 얼굴 균열
    // 바지(아직 사람)
    g.fillStyle = '#262d36'; g.fillRect(6, 11, 6, 2);
    return c;
  }
  A.corpseTurn = [paintCorpseTurning(0), paintCorpseTurning(1)];

  // ---------- 플레이어 (4방향 × 4프레임) ----------
  function paintPlayer(dir, frame) {
    const c = mk(16, 18), g = c.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const lp = [0, 1, 0, -1][frame];
    const PANTS = '#262d36', SHOE = '#14171c', HOOD = '#3c5a68',
      HOODD = '#2f4855', HOODL = '#4b7184', SKIN = '#d8a87c',
      HAIR = '#241f1a', EYE = '#15151c';
    if (dir === 0 || dir === 3) {
      R(5, 12 + lp, 2, 4, PANTS); R(5, 15 + lp, 2, 1, SHOE);
      R(9, 12 - lp, 2, 4, PANTS); R(9, 15 - lp, 2, 1, SHOE);
      R(4, 6 + bob, 8, 12 - (6 + bob) + 1, HOOD);
      R(11, 7 + bob, 1, 5, HOODD);
      R(4, 6 + bob, 8, 1, HOODL);
      R(3, 8 + bob + lp, 1, 4, HOOD); R(3, 11 + bob + lp, 1, 1, SKIN);
      R(12, 8 + bob - lp, 1, 4, HOOD); R(12, 11 + bob - lp, 1, 1, SKIN);
      if (dir === 0) {
        R(4, bob, 8, 4, HAIR); R(5, bob, 6, 1, HAIR);
        R(4, bob + 3, 8, 4, SKIN);
        R(4, bob + 3, 1, 1, HAIR); R(11, bob + 3, 1, 1, HAIR);
        R(6, bob + 4, 1, 1, EYE); R(9, bob + 4, 1, 1, EYE);
      } else {
        R(4, bob, 8, 7, HAIR); R(5, bob, 6, 1, HAIR);
        R(4, bob + 5, 8, 2, HOODD);
      }
    } else {
      R(6, 12 + lp, 2, 4, PANTS); R(6, 15 + lp, 2, 1, SHOE);
      R(8, 12 - lp, 2, 4, PANTS); R(8, 15 - lp, 2, 1, SHOE);
      R(5, 6 + bob, 6, 7 - bob, HOOD);
      R(10, 7 + bob, 1, 5, HOODD);
      R(5, 6 + bob, 6, 1, HOODL);
      R(7, 8 + bob - lp, 2, 4, HOODD);
      R(7, 11 + bob - lp, 2, 1, SKIN);
      R(4, bob, 8, 7, HAIR); R(5, bob, 6, 1, HAIR);
      R(9, bob + 3, 3, 4, SKIN);
      R(10, bob + 4, 1, 1, EYE);
    }
    return c;
  }
  function mirror(src) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }
  A.player = [[], [], [], []];
  for (let f = 0; f < 4; f++) {
    A.player[0].push(paintPlayer(0, f));
    A.player[3].push(paintPlayer(3, f));
    const right = paintPlayer(2, f);
    A.player[2].push(right);
    A.player[1].push(mirror(right));
  }
  // 도플갱어: 플레이어 실루엣 (검게)
  A.playerDark = (() => {
    const src = A.player[0][0];
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#101016';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  })();

  // ---------- 아이 영혼 (해방 대상) ----------
  function paintSpirit(brother) {
    const w = 14, h = 19, c = mk(w, h), g = c.getContext('2d');
    const base = brother ? '230,210,120' : '180,212,236'; // 동생=따뜻한 노란빛
    g.fillStyle = `rgba(${base},0.5)`;
    g.beginPath(); g.ellipse(7, 6, 4, 5, 0, 0, Math.PI * 2); g.fill();   // 머리
    g.fillRect(4, 9, 6, 6);                                             // 몸
    g.fillStyle = `rgba(${base},0.28)`;                                 // 흐려지는 유령 꼬리
    g.beginPath(); g.moveTo(4, 13); g.lineTo(3, 19); g.lineTo(11, 19); g.lineTo(10, 13); g.closePath(); g.fill();
    g.fillStyle = 'rgba(18,18,28,0.55)';                               // 빈 눈
    g.fillRect(5, 5, 1, 2); g.fillRect(8, 5, 1, 2);
    g.fillStyle = 'rgba(18,18,28,0.4)'; g.fillRect(6, 8, 2, 1);        // 슬픈 입
    if (brother) { g.fillStyle = `rgba(220,188,80,0.6)`; g.fillRect(3, 3, 8, 2); g.fillRect(3, 5, 1, 4); g.fillRect(10, 5, 1, 4); } // 노란 우비 후드
    return c;
  }
  A.spirit = paintSpirit(false);
  A.spiritBro = paintSpirit(true);

  // ---------- 유물(relic): 풍선 (곰인형=teddy, 태엽=gear 재활용) ----------
  A.balloon = (() => {
    const c = mk(11, 17), g = c.getContext('2d');
    g.strokeStyle = 'rgba(200,200,200,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(5, 9); g.lineTo(6, 16); g.stroke();        // 줄
    g.fillStyle = '#c84a4a';
    g.beginPath(); g.ellipse(5, 5, 4.2, 5, 0, 0, Math.PI * 2); g.fill(); // 풍선
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(3.5, 3.4, 1.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a83a3a'; g.fillRect(4, 9, 2, 1);                   // 매듭
    return c;
  })();

  // ---------- 분전반/발전기 (L2 퍼즐) ----------
  function paintFusebox(n) {
    const c = mk(16, 22), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(2, 20, 12, 2);
    g.fillStyle = '#33373c'; g.fillRect(1, 1, 14, 20);              // 캐비닛
    g.fillStyle = '#454b52'; g.fillRect(2, 2, 12, 18);             // 문 안쪽
    g.fillStyle = '#23272b'; g.fillRect(3, 3, 10, 16);
    // 퓨즈 슬롯 3개 (설치 수만큼 점등)
    for (let i = 0; i < 3; i++) {
      const sy = 4 + i * 5;
      g.fillStyle = '#15171b'; g.fillRect(4, sy, 8, 3);
      if (i < n) { g.fillStyle = '#caa44e'; g.fillRect(5, sy, 6, 2); g.fillStyle = '#ffe9a0'; g.fillRect(5, sy, 6, 1); }
      else { g.fillStyle = '#3a2020'; g.fillRect(5, sy, 6, 2); }
    }
    // 메인 표시등
    g.fillStyle = n >= 3 ? '#4ad06a' : '#c03030';
    g.fillRect(6, 19, 4, 1);
    g.fillStyle = '#5a626a'; g.fillRect(1, 1, 14, 1);
    return c;
  }
  A.fusebox = [paintFusebox(0), paintFusebox(1), paintFusebox(2), paintFusebox(3)];

  // ---------- 캠코더 (결정적 증거) ----------
  A.camcorder = (() => {
    const c = mk(16, 11), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(2, 9, 12, 2);
    g.fillStyle = '#1e2024'; g.fillRect(1, 2, 12, 7);                  // 본체
    g.fillStyle = '#2a2d32'; g.fillRect(1, 2, 12, 1);
    g.fillStyle = '#0a0a0c'; g.beginPath(); g.arc(4, 5, 2.4, 0, Math.PI * 2); g.fill(); // 렌즈
    g.fillStyle = '#3a6a8a'; g.beginPath(); g.arc(4, 5, 1.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#11131a'; g.fillRect(9, 3, 4, 3);                   // 뷰파인더
    g.fillStyle = '#c03030'; g.fillRect(11, 7, 1, 1);                  // REC 등
    g.fillStyle = '#15171b'; g.fillRect(13, 3, 2, 5);
    return c;
  })();

  // ---------- 등 뒤의 것 (The Stalker) — 길고 깡마른 그림자 ----------
  A.stalker = (() => {
    const w = 22, h = 46, c = mk(w, h), g = c.getContext('2d');
    // 배경(어둠)보다 살짝 밝은 짙은 실루엣 — 어둠 속에서도 형체가 인지된다
    g.fillStyle = '#26222e';
    g.fillRect(8, 32, 2, 14); g.fillRect(12, 32, 2, 14);     // 긴 다리
    g.fillRect(10, 44, 3, 2); g.fillRect(7, 44, 3, 2);        // 발
    g.fillRect(7, 15, 8, 18);                                 // 좁은 몸통
    g.fillRect(5, 16, 2, 17); g.fillRect(15, 16, 2, 17);      // 늘어진 긴 팔
    g.fillRect(4, 31, 2, 6); g.fillRect(16, 31, 2, 6);        // 긴 손가락
    g.fillRect(9, 8, 4, 9);                                   // 길쭉한 목
    g.save(); g.translate(11, 6); g.rotate(0.14);
    g.beginPath(); g.ellipse(0, 0, 4.2, 6, 0, 0, Math.PI * 2); g.fill(); g.restore(); // 기울어진 머리
    // 더 어두운 안쪽 음영
    g.fillStyle = '#16131c';
    g.fillRect(8, 17, 6, 14);
    // 연기 같은 가장자리 너덜거림
    g.fillStyle = '#26222e';
    for (let y = 14; y < 44; y++) {
      if (BK.hash2(3, y, 7.1) > 0.6) g.fillRect(5 - (BK.hash2(1, y, 2) * 2 | 0), y, 1, 1);
      if (BK.hash2(17, y, 9.3) > 0.6) g.fillRect(16 + (BK.hash2(9, y, 3) * 2 | 0), y, 1, 1);
    }
    // 창백하게 빛나는 두 눈
    g.fillStyle = 'rgba(235,232,220,0.95)';
    g.fillRect(9, 4, 1, 2); g.fillRect(12, 4, 1, 2);
    return c;
  })();

  // ---------- 벽의 얼굴 ----------
  A.wallFaceFx = (() => {
    const c = mk(16, 20), g = c.getContext('2d');
    const rg = g.createRadialGradient(8, 9, 1, 8, 10, 9);
    rg.addColorStop(0, 'rgba(210,205,188,0.75)');
    rg.addColorStop(1, 'rgba(210,205,188,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 16, 20);
    g.fillStyle = 'rgba(8,6,5,0.8)';
    g.beginPath(); g.ellipse(5.5, 8, 1.6, 2.6, 0, 0, Math.PI * 2); g.fill();   // 빈 눈
    g.beginPath(); g.ellipse(10.5, 8, 1.6, 2.6, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(8, 14, 2, 3.4, 0, 0, Math.PI * 2); g.fill();      // 벌린 입
    return c;
  })();

  // ---------- 괴물 4종 (빛 안에서만 보인다 — 얼굴까지 몸체에 베이크) ----------
  // 미소 짓는 것: 연기 같은 검은 기둥 + 하얀 미소
  function paintSmiler(hunt, frame) {
    const w = 20, h = 28, c = mk(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const halfW = 3 + t * 6;
      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x - w / 2);
        const hsh = BK.hash2(x, y, frame * 31.7 + (hunt ? 5 : 0));
        if (dx < halfW - hsh * 2.4) {
          g.fillStyle = `rgba(8,6,12,${0.7 + hsh * 0.3})`;
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    const ey = 8;
    g.fillStyle = 'rgba(253,248,224,0.3)';
    g.fillRect(5, ey - 1, 4, hunt ? 5 : 4);
    g.fillRect(11, ey - 1, 4, hunt ? 5 : 4);
    g.fillStyle = '#fdf8e0';
    g.fillRect(6, ey, 2, hunt ? 3 : 2);
    g.fillRect(12, ey, 2, hunt ? 3 : 2);
    g.strokeStyle = '#fdf8e0';
    g.lineWidth = hunt ? 2 : 1.3;
    g.beginPath();
    g.arc(10, ey + 5, hunt ? 5.5 : 4.5, Math.PI * 0.12, Math.PI * 0.88);
    g.stroke();
    return c;
  }
  // 눈 없는 것: 네 발로 기는 낮은 덩어리, 머리 자리에 세로로 갈라진 입
  function paintCrawler(hunt, frame) {
    const w = 24, h = 16, c = mk(w, h), g = c.getContext('2d');
    for (let y = 3; y < 14; y++) {
      for (let x = 1; x < 23; x++) {
        const dx = (x - 12) / 11, dy = (y - 8.5) / 5.5;
        const hsh = BK.hash2(x, y, frame * 17.3 + (hunt ? 3 : 0));
        if (dx * dx + dy * dy < 1 - hsh * 0.25) {
          g.fillStyle = `rgba(12,9,12,${0.75 + hsh * 0.25})`;
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    // 등뼈 융기
    g.fillStyle = '#6a6055';
    for (const sx of [5, 9, 13, 17]) g.fillRect(sx, 3 + ((frame + sx) % 2), 1, 1);
    // 꺾인 다리 (프레임마다 교차)
    g.strokeStyle = '#0c090c';
    g.lineWidth = 1.6;
    const lp = frame ? 1 : -1;
    for (const [bx, by, ex, eyy] of [
      [4, 11, 1 - lp, 15], [9, 12, 6 + lp, 16],
      [15, 12, 18 - lp, 16], [20, 11, 23 + lp, 15],
    ]) {
      g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, eyy); g.stroke();
    }
    // 세로로 갈라진 창백한 입 (눈은 없다)
    if (hunt) {
      g.fillStyle = '#d8d0c4';
      g.fillRect(18, 5, 3, 6);
      g.fillStyle = '#1a0608';
      g.fillRect(19, 6, 1, 4);
      g.fillStyle = '#d8d0c4';
      g.fillRect(19, 7, 1, 1); // 이빨
    } else {
      g.fillStyle = '#b8b0a4';
      g.fillRect(19, 6, 1, 4);
    }
    return c;
  }
  // 광대: 빛바랜 광대옷, 하얀 분칠 얼굴, X자 눈, 그려진 미소
  function paintClown(hunt, frame) {
    const w = 18, h = 28, c = mk(w, h), g = c.getContext('2d');
    const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    const bob = frame ? 1 : 0;
    // 다리/신발
    R(5, 22, 3, 4, '#3a2026'); R(10, 22, 3, 4, '#3a2026');
    R(2, 26, 6, 2, '#7a1f1f'); R(10, 26, 6, 2, '#7a1f1f'); // 뾰족 신발
    // 몸통 (얼룩진 광대옷 + 물방울)
    R(4, 10 + bob, 10, 12 - bob, '#4a2a30');
    for (let y = 11; y < 21; y++) for (let x = 5; x < 13; x++) {
      if (BK.hash2(x, y, 9.9) > 0.88) { g.fillStyle = '#a8923f'; g.fillRect(x, y, 1, 1); }
    }
    // 팔 (돌진 시 벌림)
    if (hunt) {
      R(1, 9 + bob, 3, 2, '#4a2a30'); R(14, 9 + bob, 3, 2, '#4a2a30');
      R(0, 8 + bob, 2, 2, '#e8e2da'); R(16, 8 + bob, 2, 2, '#e8e2da');
    } else {
      R(3, 12 + bob, 1, 6, '#4a2a30'); R(14, 12 + bob, 1, 6, '#4a2a30');
    }
    // 목 주름 장식
    for (let x = 4; x < 14; x++) R(x, 9 + bob + (x % 2), 1, 1, '#c8c0ae');
    // 머리 (분칠)
    R(4, 1 + bob, 10, 8, '#e8e2da');
    R(5, 0 + bob, 8, 2, '#e8e2da');
    // 헝클어진 초록 머리칼
    R(2, 2 + bob, 2, 4, '#4a6a3a'); R(14, 2 + bob, 2, 4, '#4a6a3a');
    R(3, 1 + bob, 1, 2, '#4a6a3a'); R(14, 1 + bob, 1, 2, '#4a6a3a');
    // X자 눈
    g.fillStyle = '#15080a';
    for (const ex of [6, 11]) {
      g.fillRect(ex - 1, 2 + bob, 1, 1); g.fillRect(ex + 1, 2 + bob, 1, 1);
      g.fillRect(ex, 3 + bob, 1, 1);
      g.fillRect(ex - 1, 4 + bob, 1, 1); g.fillRect(ex + 1, 4 + bob, 1, 1);
    }
    // 빨간 코 + 그려진 미소 (사냥 시 더 크게)
    R(8, 4 + bob, 2, 2, '#b03030');
    g.strokeStyle = '#b03030';
    g.lineWidth = hunt ? 1.8 : 1.2;
    g.beginPath();
    g.arc(9, 5.5 + bob, hunt ? 4.2 : 3.2, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    if (hunt) { // 찢어진 입꼬리
      g.beginPath(); g.moveTo(5, 7.5 + bob); g.lineTo(4, 6 + bob); g.stroke();
      g.beginPath(); g.moveTo(13, 7.5 + bob); g.lineTo(14, 6 + bob); g.stroke();
    }
    return c;
  }
  // 우는 아이: 작고 창백한, 텅 빈 눈
  function paintChild(scream, frame) {
    const w = 12, h = 16, c = mk(w, h), g = c.getContext('2d');
    const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    const sway = frame ? 1 : 0;
    // 다리 (맨발)
    R(4, 13, 1, 2, '#cfc9bd'); R(7, 13, 1, 2, '#cfc9bd');
    // 해진 원피스
    R(3, 7, 6, 6, '#5f584c');
    R(2, 11, 1, 2, '#5f584c'); R(9, 11, 1, 2, '#5f584c');
    // 팔
    R(2, 8, 1, 3, '#cfc9bd'); R(9, 8, 1, 3, '#cfc9bd');
    // 고개 숙인 머리
    R(3 + sway, 1, 6, 6, '#cfc9bd');
    R(2 + sway, 0, 8, 3, '#2a241e'); // 헝클어진 머리칼
    R(2 + sway, 3, 1, 3, '#2a241e'); R(9 + sway, 3, 1, 2, '#2a241e');
    // 텅 빈 눈
    if (scream) {
      R(4 + sway, 3, 2, 3, '#0c0a08'); R(7 + sway, 3, 2, 3, '#0c0a08');
      R(5 + sway, 6, 3, 3, '#0c0a08'); // 벌어진 입
    } else {
      R(4 + sway, 4, 2, 2, '#0c0a08'); R(7 + sway, 4, 2, 2, '#0c0a08');
      R(5 + sway, 7, 2, 1, '#3a3026');
      // 검은 눈물 줄기
      R(4 + sway, 6, 1, 2, 'rgba(12,10,8,0.7)');
      R(8 + sway, 6, 1, 1, 'rgba(12,10,8,0.7)');
    }
    return c;
  }
  // 꺼진 것: 빛이 닿으면 굳는 잿빛 사람. idle=굳은 석상(빛 속에서 보이는 형태), moving=한 발 내딛는 순간
  function paintShade(moving, frame) {
    const w = 16, h = 30, c = mk(w, h), g = c.getContext('2d');
    const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    // 차갑게 굳은 슬레이트빛 — 따뜻한 콘크리트 위에서 또렷이 떠 보이게
    const ASH = '#565562', ASHD = '#33323d', ASHL = '#8f8e9e', CRACK = '#1a1920';
    const stride = moving ? (frame ? 2 : -2) : 0;
    // 다리 (걸을 땐 한 발 앞으로 — 한 발 내딛는 순간)
    R(5 - stride, 22, 2, 8, ASH); R(9 + stride, 22, 2, 8, ASH);
    R(4 - stride, 29, 3, 1, ASHD); R(9 + stride, 29, 3, 1, ASHD); // 발
    // 몸통 — 마르고 약간 굽음
    R(4, 11, 8, 12, ASH);
    R(4, 11, 8, 1, ASHL);            // 어깨 하이라이트
    R(4, 16, 8, 1, ASHD);
    // 앞으로 뻗은 팔 (잡으려는 손)
    if (moving) {
      R(2, 12, 3, 2, ASH); R(11, 12, 3, 2, ASH);
      R(1, 13, 2, 2, ASHL); R(13, 13, 2, 2, ASHL); // 뻗은 손끝
    } else {
      R(3, 12, 1, 8, ASH); R(12, 12, 1, 8, ASH);    // 굳어 늘어뜨린 팔
      R(3, 19, 1, 2, ASHL); R(12, 19, 1, 2, ASHL);
    }
    // 머리 — 텅 빈 잿빛 얼굴
    R(5, 4, 6, 7, ASH);
    R(5, 4, 6, 1, ASHL);
    R(5, 9, 6, 1, ASHD);
    // 텅 빈 눈구멍 + 그 안에서 흐릿하게 빛나는 눈 (어둠 가장자리에서도 얼굴이 읽힌다)
    R(6, 6, 2, 2, '#0a090c'); R(9, 6, 2, 2, '#0a090c');
    R(6, 6, 1, 1, 'rgba(220,224,210,0.9)'); R(10, 6, 1, 1, 'rgba(220,224,210,0.9)');
    R(7, 9, 3, 1, '#0a090c'); // 살짝 벌린 입
    // 빛이 새긴 균열
    R(8, 4, 1, 7, CRACK); R(6, 13, 4, 1, CRACK); R(5, 18, 3, 1, CRACK);
    R(9, 20, 2, 3, CRACK);
    // 잿가루 너덜거림
    for (let y = 5; y < 28; y++) {
      if (BK.hash2(3, y, moving ? 4.4 : 1.1) > 0.7) g.fillStyle = ASHD, g.fillRect(3, y, 1, 1);
      if (BK.hash2(12, y, moving ? 5.5 : 2.2) > 0.7) g.fillStyle = ASHD, g.fillRect(12, y, 1, 1);
    }
    return c;
  }
  // [idle0, idle1, hunt0, hunt1]
  A.mon = {
    smiler: [paintSmiler(false, 0), paintSmiler(false, 1), paintSmiler(true, 0), paintSmiler(true, 1)],
    crawler: [paintCrawler(false, 0), paintCrawler(false, 1), paintCrawler(true, 0), paintCrawler(true, 1)],
    clown: [paintClown(false, 0), paintClown(false, 1), paintClown(true, 0), paintClown(true, 1)],
    child: [paintChild(false, 0), paintChild(false, 1), paintChild(true, 0), paintChild(true, 1)],
    // idle(0,1)=굳은 모습, hunt(2,3)=움직이는 순간
    shade: [paintShade(false, 0), paintShade(false, 1), paintShade(true, 0), paintShade(true, 1)],
  };
};
