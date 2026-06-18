'use strict';
// 조명(어둠 컷아웃), 비네트, 필름 그레인, 화면 흔들림/플래시
BK.fx = {
  shakeAmp: 0,
  flashA: 0,
  flashCol: '#fff',
  grains: [],
  grainIdx: 0,

  init() {
    const w = BK.VIEW_W, h = BK.VIEW_H;
    this.lightCanvas = BK.makeCanvas(w, h);
    this.lightCtx = this.lightCanvas.getContext('2d');

    // 비네트
    this.vignette = BK.makeCanvas(w, h);
    const vg = this.vignette.getContext('2d');
    const rad = vg.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.78);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, 'rgba(0,0,0,0.55)');
    vg.fillStyle = rad;
    vg.fillRect(0, 0, w, h);

    // 필름 그레인 3프레임
    for (let i = 0; i < 3; i++) {
      const c = BK.makeCanvas(w, h), g = c.getContext('2d');
      const id = g.createImageData(w, h);
      for (let p = 0; p < id.data.length; p += 4) {
        const v = (Math.random() * 255) | 0;
        id.data[p] = id.data[p + 1] = id.data[p + 2] = v;
        id.data[p + 3] = Math.random() < 0.45 ? 16 : 0;
      }
      g.putImageData(id, 0, 0);
      this.grains.push(c);
    }
  },

  addShake(a) { this.shakeAmp = Math.max(this.shakeAmp, a); },
  flash(col, a) { this.flashCol = col; this.flashA = Math.max(this.flashA, a); },

  shakeOffset(dt) {
    if (this.shakeAmp < 0.05) { this.shakeAmp = 0; return { x: 0, y: 0 }; }
    const o = {
      x: (Math.random() - 0.5) * 2 * this.shakeAmp,
      y: (Math.random() - 0.5) * 2 * this.shakeAmp,
    };
    this.shakeAmp *= Math.exp(-5 * dt);
    return o;
  },

  // cuts: [{x, y, r, a}] 화면 좌표의 빛 구멍
  renderDarkness(g, cuts, darkA) {
    const lc = this.lightCtx, w = BK.VIEW_W, h = BK.VIEW_H;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, w, h);
    lc.fillStyle = `rgba(3,3,7,${BK.clamp(darkA, 0, 1)})`;
    lc.fillRect(0, 0, w, h);
    lc.globalCompositeOperation = 'destination-out';
    for (const c of cuts) {
      if (c.r <= 1 || c.a <= 0.01) continue;
      if (c.x < -c.r || c.y < -c.r || c.x > w + c.r || c.y > h + c.r) continue;
      const rg = lc.createRadialGradient(c.x, c.y, 1, c.x, c.y, c.r);
      rg.addColorStop(0, `rgba(0,0,0,${BK.clamp(c.a, 0, 1)})`);
      rg.addColorStop(0.6, `rgba(0,0,0,${BK.clamp(c.a * 0.55, 0, 1)})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = rg;
      lc.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
    }
    g.drawImage(this.lightCanvas, 0, 0);
  },

  glow(g, x, y, r, rgb, a) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${rgb},${a})`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    g.save();
    g.globalCompositeOperation = 'screen';
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  },

  drawGrain(g, strength) {
    this.grainIdx = (this.grainIdx + 1) % 3;
    g.save();
    g.globalAlpha = BK.clamp(strength, 0, 1);
    g.globalCompositeOperation = 'overlay';
    g.drawImage(this.grains[this.grainIdx], 0, 0);
    g.restore();
  },

  drawVignette(g, extra) {
    g.drawImage(this.vignette, 0, 0);
    if (extra > 0) {
      g.save();
      g.globalAlpha = BK.clamp(extra, 0, 1);
      g.drawImage(this.vignette, 0, 0);
      g.restore();
    }
  },
};
