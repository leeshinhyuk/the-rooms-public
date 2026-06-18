'use strict';
// 전역 네임스페이스
const BK = window.BK = {
  TILE: 16,      // 타일 한 변(px, 저해상도 기준)
  VIEW_W: 320,   // 내부 렌더 버퍼 폭
  VIEW_H: 208,   // 내부 렌더 버퍼 높이
  SCALE: 3,      // 업스케일 배율
};

// 시드 기반 PRNG (mulberry32)
BK.mulberry32 = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// 결정적 2D 해시 노이즈 (0~1)
BK.hash2 = function (x, y, s) {
  const n = Math.sin(x * 127.1 + y * 311.7 + (s || 0) * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

// 좌표 결정적 해시 (음수 좌표 허용) — 무한 맵 청크 시드
BK.hashCoords = function (seed, a, b, salt) {
  let h = (seed ^ 0x9E3779B9) >>> 0;
  h = Math.imul(h ^ (a | 0), 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h ^ (b | 0), 3266489917) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h ^ (((salt | 0) + 0x165667B1) | 0), 2654435761) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
};
BK.hash01 = (seed, a, b, salt) => BK.hashCoords(seed, a, b, salt) / 4294967296;

BK.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
BK.lerp = (a, b, t) => a + (b - a) * t;
BK.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

BK.makeCanvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
};
