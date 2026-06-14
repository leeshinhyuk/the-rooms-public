'use strict';
// 모든 소리는 WebAudio로 합성 — 외부 오디오 파일 없음.
// 구역 앰비언스(험/기계 드론/오르골) + 추격 BGM + 괴물별 시그니처 사운드(방향 패닝)
BK.audio = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let started = false, muted = false;
  let dreadG = null, exitG = null, crisisG = null;
  let tension = 0;
  let curZone = -1;

  let humG = null, machG = null, boxG = null;

  const now = () => ctx.currentTime;

  function makeNoiseBuf() {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function init() {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    noiseBuf = makeNoiseBuf();

    // ===== 레이어 0: 형광등 험 =====
    humG = ctx.createGain(); humG.gain.value = 0;
    humG.connect(master);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 120;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 240; o2.detune.value = 5;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o1.connect(humG); o2.connect(g2); g2.connect(humG);
    o1.start(); o2.start();
    const hiss = ctx.createBufferSource(); hiss.buffer = noiseBuf; hiss.loop = true;
    const hbp = ctx.createBiquadFilter(); hbp.type = 'bandpass'; hbp.frequency.value = 9000; hbp.Q.value = 1.4;
    const hg = ctx.createGain(); hg.gain.value = 0.3;
    hiss.connect(hbp); hbp.connect(hg); hg.connect(humG);
    hiss.start();

    // ===== 레이어 1: 기계 드론 =====
    machG = ctx.createGain(); machG.gain.value = 0;
    const machFilter = ctx.createBiquadFilter(); machFilter.type = 'lowpass'; machFilter.frequency.value = 130;
    machFilter.connect(machG); machG.connect(master);
    const m1 = ctx.createOscillator(); m1.type = 'sawtooth'; m1.frequency.value = 52;
    const m2 = ctx.createOscillator(); m2.type = 'sawtooth'; m2.frequency.value = 52.7;
    const m3 = ctx.createOscillator(); m3.type = 'sine'; m3.frequency.value = 26;
    const m3g = ctx.createGain(); m3g.gain.value = 0.9;
    const mMix = ctx.createGain(); mMix.gain.value = 0.5;
    m1.connect(mMix); m2.connect(mMix); m3.connect(m3g); m3g.connect(mMix);
    mMix.connect(machFilter);
    m1.start(); m2.start(); m3.start();
    const mLfo = ctx.createOscillator(); mLfo.type = 'sine'; mLfo.frequency.value = 0.11;
    const mLfoG = ctx.createGain(); mLfoG.gain.value = 0.18;
    mLfo.connect(mLfoG); mLfoG.connect(mMix.gain);
    mLfo.start();

    // ===== 레이어 2: 오르골 버스 =====
    boxG = ctx.createGain(); boxG.gain.value = 0;
    const boxHp = ctx.createBiquadFilter();
    boxHp.type = 'highpass'; boxHp.frequency.value = 300;
    boxHp.connect(boxG); boxG.connect(master);
    mb.bus = boxHp;

    // ===== 공포 드론 (괴물 근접) =====
    const d1 = ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 36;
    const d2 = ctx.createOscillator(); d2.type = 'sawtooth'; d2.frequency.value = 54.5;
    const d2g = ctx.createGain(); d2g.gain.value = 0.22;
    dreadG = ctx.createGain(); dreadG.gain.value = 0;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 150;
    d1.connect(dreadG); d2.connect(d2g); d2g.connect(dreadG);
    dreadG.connect(dlp); dlp.connect(master);
    d1.start(); d2.start();

    // ===== 포털 정적 =====
    const ex = ctx.createBufferSource(); ex.buffer = noiseBuf; ex.loop = true;
    const exf = ctx.createBiquadFilter(); exf.type = 'bandpass'; exf.frequency.value = 650; exf.Q.value = 0.6;
    exitG = ctx.createGain(); exitG.gain.value = 0;
    ex.connect(exf); exf.connect(exitG); exitG.connect(master);
    ex.start();

    // ===== 위기 레이어: 이명(고음) + 저음 럼블 =====
    crisisG = ctx.createGain(); crisisG.gain.value = 0;
    crisisG.connect(master);
    const tin = ctx.createOscillator(); tin.type = 'sine'; tin.frequency.value = 8200;
    const tinLfo = ctx.createOscillator(); tinLfo.type = 'sine'; tinLfo.frequency.value = 0.27;
    const tinLfoG = ctx.createGain(); tinLfoG.gain.value = 260;
    tinLfo.connect(tinLfoG); tinLfoG.connect(tin.frequency);
    const tinG = ctx.createGain(); tinG.gain.value = 0.012;
    tin.connect(tinG); tinG.connect(crisisG);
    tin.start(); tinLfo.start();
    const rum = ctx.createOscillator(); rum.type = 'sine'; rum.frequency.value = 40;
    const rum2 = ctx.createOscillator(); rum2.type = 'sine'; rum2.frequency.value = 47;
    const rumG = ctx.createGain(); rumG.gain.value = 0.55;
    rum.connect(rumG); rum2.connect(rumG); rumG.connect(crisisG);
    rum.start(); rum2.start();
  }

  function outNode(g, pan) {
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = BK.clamp(pan, -1, 1);
      g.connect(p); p.connect(master);
    } else g.connect(master);
  }

  function playNoise({ dur = 0.2, gain = 0.1, type = 'lowpass', freq = 1000, q = 1, when = 0, pan = 0 }) {
    if (!ctx || muted) return;
    const t = now() + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g);
    outNode(g, pan);
    src.start(t); src.stop(t + dur + 0.1);
  }

  function playTone({ freq = 440, endFreq = null, type = 'sine', dur = 0.3, gain = 0.1, when = 0, dest = null, detune = 0, pan = 0 }) {
    if (!ctx || muted) return;
    const t = now() + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (dest) g.connect(dest);
    else outNode(g, pan);
    o.start(t); o.stop(t + dur + 0.1);
  }

  // ===== 오르골 시퀀서 =====
  const MB_SCALE = { A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77 };
  const MB_MELODY = [
    'E5', 0, 'G5', 0, 'B5', 'A5', 'G5', 0,
    'E5', 0, 'D5', 'E5', 'C5', 0, 'A4', 0,
    'E5', 0, 'G5', 0, 'A5', 'B5', 'A5', 0,
    'G5', 'E5', 'D5', 0, 'A4', 0, 0, 0,
  ];
  const mb = { bus: null, next: 0, step: 0, base: 0.34, slowT: 0, on: false };

  function pluck(freq, t, gainMul) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * gainMul, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 3.01;
    const o2g = ctx.createGain(); o2g.gain.value = 0.22;
    o.connect(g); o2.connect(o2g); o2g.connect(g);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = (Math.random() - 0.5) * 0.7;
      g.connect(p); p.connect(mb.bus);
    } else g.connect(mb.bus);
    o.start(t); o.stop(t + 1.6);
    o2.start(t); o2.stop(t + 1.6);
  }

  function mbTick() {
    if (!ctx || !mb.on || muted) return;
    while (mb.next < now() + 0.3) {
      const name = MB_MELODY[mb.step % MB_MELODY.length];
      let stepDur = mb.base * (1 + 0.06 * Math.sin(mb.step * 0.37) + Math.random() * 0.05);
      if (mb.slowT > 0) {
        stepDur *= 1 + mb.slowT * 0.9;
        mb.slowT = Math.max(0, mb.slowT - 0.12);
      }
      if (name) {
        let freq = MB_SCALE[name] * 2;
        const cents = (Math.random() - 0.5) * 2 * (10 + tension * 70) - mb.slowT * 90;
        freq *= Math.pow(2, cents / 1200);
        if (Math.random() < 0.05 + tension * 0.2) {
          freq *= Math.pow(2, (Math.random() < 0.5 ? -1 : 1) / 12);
        }
        if (Math.random() > 0.06) pluck(freq, mb.next, 1 - tension * 0.25);
      }
      mb.next += stepDur;
      mb.step++;
    }
  }

  // ===== 추격 BGM: 가까울수록 빨라지는 킥 펄스 + 불협 스탭 =====
  const ch = { level: 0, prox: 0, next: 0, beat: 0 };
  function chaseTick() {
    if (!ctx || muted || ch.level <= 0.05) return;
    if (ch.next < now()) ch.next = now() + 0.02;
    const bps = (126 + ch.prox * 66) / 60; // 2.1 ~ 3.2 박/초
    while (ch.next < now() + 0.25) {
      const when = ch.next - now();
      const g = ch.level * (0.55 + 0.45 * ch.prox);
      // 쿵— 심장을 닮은 킥
      playTone({ freq: 64, endFreq: 30, dur: 0.16, gain: 0.3 * g, when });
      // 오프비트 금속성 틱
      if (ch.beat % 2 === 1) {
        playNoise({ dur: 0.04, gain: 0.045 * g, type: 'highpass', freq: 5200, when });
      }
      // 4박마다 불협화음 스탭
      if (ch.beat % 8 === 4) {
        for (const f of [233, 277, 311]) {
          playTone({
            type: 'sawtooth', freq: f * (1 + (Math.random() - 0.5) * 0.04),
            endFreq: f * 0.93, dur: 0.45, gain: 0.05 * g, when,
          });
        }
        playNoise({ dur: 0.3, gain: 0.05 * g, type: 'bandpass', freq: 1600, q: 4, when });
      }
      // 16박마다 상승 라이저
      if (ch.beat % 16 === 12) {
        playTone({ type: 'sawtooth', freq: 110, endFreq: 220, dur: 4 / bps * 0.9, gain: 0.035 * g, when });
      }
      ch.next += 1 / bps;
      ch.beat++;
    }
  }

  return {
    init,
    get started() { return started; },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },

    // 매 프레임 호출 — 시퀀서들
    tick() {
      if (curZone === 2) mbTick();
      chaseTick();
    },

    setTension(v) { tension = BK.clamp(v, 0, 1); },
    setChase(level, prox) {
      ch.level = BK.clamp(level, 0, 1);
      ch.prox = BK.clamp(prox, 0, 1);
    },

    zone(z) {
      if (!ctx || z === curZone) return;
      curZone = z;
      const t = now();
      humG.gain.setTargetAtTime(z === 0 ? 0.016 : 0.003, t, 1.2);
      machG.gain.setTargetAtTime(z === 1 ? 0.075 : 0, t, 1.5);
      boxG.gain.setTargetAtTime(z === 2 ? 0.55 : 0, t, 1.5);
      if (z === 2 && !mb.on) { mb.on = true; mb.next = now() + 0.5; }
      if (z !== 2) mb.on = false;
    },

    setDread(v) { if (ctx) dreadG.gain.setTargetAtTime(BK.clamp(v, 0, 1) * 0.2, now(), 0.25); },
    setExitStatic(v) { if (ctx) exitG.gain.setTargetAtTime(BK.clamp(v, 0, 1) * 0.11, now(), 0.2); },
    // 위기 레이어 (이명+럼블) — 정신력 위급/피날레/스토커 근접
    setCrisis(v) { if (ctx) crisisG.gain.setTargetAtTime(BK.clamp(v, 0, 1) * 0.85, now(), 0.4); },
    // 심전도 평탄음 (사망 직전)
    flatline() {
      playTone({ freq: 1000, dur: 1.4, gain: 0.06, type: 'sine' });
      playTone({ freq: 1000, dur: 1.4, gain: 0.04, type: 'sine', detune: 4 });
    },

    footstep(run) {
      playNoise({ dur: 0.07, gain: run ? 0.1 : 0.05, freq: 420 + Math.random() * 180, q: 0.8 });
    },
    pickup() {
      playNoise({ dur: 0.18, gain: 0.1, type: 'highpass', freq: 2400 });
      playTone({ freq: 880, dur: 0.1, gain: 0.025 });
    },
    pickupMetal() {
      playTone({ freq: 1240, dur: 0.25, gain: 0.05, type: 'triangle' });
      playTone({ freq: 1860, dur: 0.18, gain: 0.03, when: 0.03 });
      playNoise({ dur: 0.1, gain: 0.05, type: 'bandpass', freq: 2000, q: 5 });
    },
    drink() {
      playTone({ freq: 340, endFreq: 280, dur: 0.1, gain: 0.05 });
      playTone({ freq: 300, endFreq: 230, dur: 0.1, gain: 0.05, when: 0.12 });
      playTone({ freq: 260, endFreq: 190, dur: 0.12, gain: 0.05, when: 0.24 });
      playNoise({ dur: 0.35, gain: 0.03, freq: 900 });
    },
    buzz() {
      playNoise({ dur: 0.25, gain: 0.05, type: 'bandpass', freq: 3000, q: 6 });
      playTone({ freq: 100, type: 'sawtooth', dur: 0.2, gain: 0.035 });
    },
    thud() {
      playTone({ freq: 70, endFreq: 36, dur: 0.5, gain: 0.3 });
      playNoise({ dur: 0.3, gain: 0.12, freq: 130 });
    },
    sting() {
      for (const f of [311, 415, 466]) {
        playTone({ type: 'sawtooth', freq: f, endFreq: f * 0.55, dur: 1.4, gain: 0.045 });
      }
      playNoise({ dur: 0.8, gain: 0.06, type: 'highpass', freq: 1800 });
    },
    stingShort() {
      for (const f of [415, 466, 622]) {
        playTone({ type: 'sawtooth', freq: f, endFreq: f * 0.8, dur: 0.35, gain: 0.09 });
      }
      playNoise({ dur: 0.25, gain: 0.14, type: 'highpass', freq: 1200 });
    },
    heartbeat(strength) {
      const s = BK.clamp(strength, 0.15, 1);
      playTone({ freq: 58, endFreq: 38, dur: 0.13, gain: 0.24 * s });
      playTone({ freq: 52, endFreq: 36, dur: 0.11, gain: 0.16 * s, when: 0.16 });
    },
    whisper() {
      const n = 2 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++) {
        playNoise({
          dur: 0.3 + Math.random() * 0.6, gain: 0.022,
          type: 'bandpass', freq: 900 + Math.random() * 1700, q: 8,
          when: i * 0.25, pan: Math.random() * 2 - 1,
        });
      }
    },

    // ===== 괴물별 시그니처 (prox: 0~1 근접도, pan: -1~1 방향) =====
    // 눈 없는 것: 딸깍거리는 반향정위 + 쉰 숨
    crawlerClicks(prox, pan) {
      const n = 3 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) {
        playNoise({
          dur: 0.025, gain: 0.04 + 0.07 * prox,
          type: 'highpass', freq: 3600 + Math.random() * 800, q: 2,
          when: i * (0.05 + Math.random() * 0.05), pan,
        });
      }
      if (prox > 0.35) {
        playNoise({ dur: 0.45, gain: 0.05 * prox, type: 'bandpass', freq: 230, q: 3, when: 0.2, pan });
      }
    },
    // 광대: 내려가는 낄낄 웃음
    clownGiggle(prox, pan) {
      const base = 600 + Math.random() * 180;
      const n = 5 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        playTone({
          type: 'triangle',
          freq: base * (1 - i * 0.055) * (1 + (Math.random() - 0.5) * 0.06),
          dur: 0.08, gain: (0.03 + 0.06 * prox) * (1 - i * 0.07),
          when: i * 0.105 + Math.random() * 0.02, pan, detune: 12,
        });
      }
    },
    // 광대 돌진 예고: 음 나간 서커스 경적
    clownHorn() {
      playTone({ type: 'sawtooth', freq: 196, dur: 0.4, gain: 0.1 });
      playTone({ type: 'sawtooth', freq: 207, dur: 0.4, gain: 0.08 });
      playTone({ type: 'sawtooth', freq: 185, dur: 0.55, gain: 0.1, when: 0.45 });
      playTone({ type: 'sawtooth', freq: 196, dur: 0.55, gain: 0.08, when: 0.45 });
      playNoise({ dur: 0.3, gain: 0.06, type: 'bandpass', freq: 800, q: 3, when: 0.05 });
    },
    // 우는 아이: 흐느낌
    childSob(prox, pan) {
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n; i++) {
        playTone({
          type: 'sine', freq: 520 + Math.random() * 140, endFreq: 340,
          dur: 0.4, gain: 0.022 + 0.05 * prox,
          when: i * 0.5 + Math.random() * 0.08, pan, detune: Math.random() * 30,
        });
        playNoise({
          dur: 0.18, gain: 0.012 + 0.02 * prox,
          type: 'bandpass', freq: 1400, q: 3,
          when: i * 0.5 + 0.32, pan,
        });
      }
    },
    // 아이의 비명: 모두를 부른다
    childScream() {
      playTone({ type: 'sawtooth', freq: 1350, endFreq: 740, dur: 1.1, gain: 0.34 });
      playTone({ type: 'sawtooth', freq: 1705, endFreq: 920, dur: 0.9, gain: 0.22, when: 0.05 });
      playNoise({ dur: 1.0, gain: 0.26, type: 'highpass', freq: 1300 });
      playTone({ freq: 80, endFreq: 40, dur: 0.8, gain: 0.2, when: 0.1 });
    },
    // 꺼진 것: 어둠 속을 끄는 마른 돌·잿가루 소리 (움직일 때만)
    shadeWalk(prox, pan) {
      playNoise({ dur: 0.3 + Math.random() * 0.2, gain: 0.03 + 0.07 * prox, type: 'lowpass', freq: 320 + Math.random() * 120, q: 1, pan });
      playNoise({ dur: 0.16, gain: 0.02 + 0.04 * prox, type: 'bandpass', freq: 1500 + Math.random() * 400, q: 6, when: 0.1, pan });
      if (prox > 0.4) playTone({ type: 'sine', freq: 58, endFreq: 44, dur: 0.5, gain: 0.05 * prox, pan });
    },
    // 빛에 닿아 굳는 순간: 돌이 맞물리는 둔탁한 '척'
    shadeFreeze(pan) {
      playNoise({ dur: 0.08, gain: 0.09, type: 'bandpass', freq: 420, q: 5, pan });
      playTone({ type: 'triangle', freq: 150, endFreq: 90, dur: 0.12, gain: 0.06, pan });
    },

    // ===== 기계실 SFX =====
    clank() {
      const pan = Math.random() * 2 - 1;
      playNoise({ dur: 0.12, gain: 0.13, type: 'bandpass', freq: 350 + Math.random() * 500, q: 14, pan });
      playTone({ freq: 1180 + Math.random() * 300, dur: 0.4, gain: 0.04, type: 'triangle', when: 0.01 });
      playTone({ freq: 1850 + Math.random() * 400, dur: 0.25, gain: 0.025, when: 0.015 });
    },
    steamHiss() {
      playNoise({ dur: 1.4 + Math.random(), gain: 0.045, type: 'highpass', freq: 2600, pan: Math.random() * 2 - 1 });
    },
    pressThump() {
      playTone({ freq: 55, endFreq: 34, dur: 0.4, gain: 0.16 });
      playNoise({ dur: 0.2, gain: 0.06, freq: 110 });
    },
    // 이상한 기계 비명: 링 모듈레이션 + 무작위 주파수 점프
    screech() {
      if (!ctx || muted) return;
      const t = now();
      const dur = 0.7 + Math.random() * 0.8;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      let f = 180 + Math.random() * 500;
      o.frequency.setValueAtTime(f, t);
      for (let i = 1; i < 9; i++) {
        f *= 0.7 + Math.random() * 0.7;
        o.frequency.setValueAtTime(BK.clamp(f, 60, 2400), t + (dur * i) / 9);
      }
      const ring = ctx.createGain(); ring.gain.value = 0;
      const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = 37;
      const modG = ctx.createGain(); modG.gain.value = 0.5;
      mod.connect(modG); modG.connect(ring.gain);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.085, t + 0.08);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(ring); ring.connect(lp); lp.connect(env);
      outNode(env, Math.random() * 2 - 1);
      o.start(t); o.stop(t + dur + 0.1);
      mod.start(t); mod.stop(t + dur + 0.1);
    },

    // ===== 놀이방 SFX =====
    childHum() {
      if (!ctx || muted) return;
      const notes = [392, 440, 392, 330, 294];
      const pan = Math.random() * 2 - 1;
      notes.forEach((f, i) => {
        playTone({
          freq: f * (1 + (Math.random() - 0.5) * 0.03),
          dur: 0.35, gain: 0.018, when: i * 0.3 + Math.random() * 0.05,
          type: 'sine', detune: Math.sin(i) * 18, pan,
        });
      });
    },
    boxSlowdown() { mb.slowT = 1.6; },

    // ===== 시퀀스 사운드 =====
    riftTrap() {
      playNoise({ dur: 0.4, gain: 0.3, type: 'highpass', freq: 600 });
      for (let i = 0; i < 6; i++) {
        playNoise({ dur: 0.06, gain: 0.2, type: 'bandpass', freq: 300 + Math.random() * 3000, q: 8, when: i * 0.08 });
      }
      playTone({ type: 'sawtooth', freq: 600, endFreq: 60, dur: 1.8, gain: 0.3, when: 0.2 });
      playTone({ type: 'sawtooth', freq: 451, endFreq: 45, dur: 1.8, gain: 0.25, when: 0.25 });
      playTone({ freq: 90, endFreq: 22, dur: 2.6, gain: 0.3, when: 0.3 });
    },
    elevatorRide() {
      playNoise({ dur: 2.8, gain: 0.12, freq: 160 });
      playTone({ freq: 38, dur: 2.8, gain: 0.18 });
      playNoise({ dur: 0.15, gain: 0.1, type: 'bandpass', freq: 700, q: 6, when: 2.6 });
      playTone({ freq: 880, dur: 0.8, gain: 0.07, when: 3.0, type: 'triangle' });
      playTone({ freq: 1108, dur: 0.9, gain: 0.05, when: 3.1, type: 'triangle' });
    },
    scream() {
      if (!ctx || muted) return;
      const ws = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) curve[i] = Math.tanh((i / 128 - 1) * 4);
      ws.curve = curve;
      const wsg = ctx.createGain(); wsg.gain.value = 0.5;
      ws.connect(wsg); wsg.connect(master);
      playTone({ type: 'sawtooth', freq: 700, endFreq: 140, dur: 0.85, gain: 0.5, dest: ws });
      playTone({ type: 'sawtooth', freq: 525, endFreq: 95, dur: 0.85, gain: 0.45, dest: ws });
      playNoise({ dur: 0.7, gain: 0.3, type: 'highpass', freq: 700 });
    },
    // 목/뼈 꺾이는 소리 — 짧고 둔탁한 크랙 연타
    boneCrack() {
      const n = 3 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const w = i * (0.025 + Math.random() * 0.03);
        playNoise({ dur: 0.03, gain: 0.18, type: 'bandpass', freq: 1800 + Math.random() * 1500, q: 5, when: w });
        playTone({ freq: 160 - i * 20, endFreq: 60, dur: 0.06, gain: 0.14, type: 'square', when: w });
      }
      playTone({ freq: 90, endFreq: 38, dur: 0.25, gain: 0.2, when: 0.02 });
    },
    // 피 쏟는 젖은 소리
    gore() {
      playNoise({ dur: 0.5, gain: 0.16, type: 'lowpass', freq: 700 });
      playNoise({ dur: 0.7, gain: 0.1, type: 'bandpass', freq: 350, q: 1.2, when: 0.1 });
      for (let i = 0; i < 5; i++) {
        playNoise({ dur: 0.05, gain: 0.06, type: 'bandpass', freq: 500 + Math.random() * 900, q: 4, when: 0.1 + i * 0.08 });
      }
      playTone({ freq: 70, endFreq: 30, dur: 0.6, gain: 0.16 });
    },
    madness() {
      playTone({ freq: 220, endFreq: 28, dur: 3, gain: 0.28 });
      this.whisper();
      playNoise({ dur: 2.5, gain: 0.05, type: 'bandpass', freq: 1400, q: 4 });
    },

    // ===== 공용 앰비언스(원거리) — 모든 구역의 긴장 유지 =====
    // 멀리서 들리는 발소리 (여러 발자국)
    footstepFar(pan, near) {
      const n = 2 + ((Math.random() * 3) | 0);
      const g0 = near ? 0.05 : 0.022;
      for (let i = 0; i < n; i++) {
        playNoise({
          dur: 0.06, gain: g0 * (0.7 + Math.random() * 0.5),
          type: 'lowpass', freq: 300 + Math.random() * 160, q: 0.8,
          when: i * (0.32 + Math.random() * 0.12), pan,
        });
        playTone({ freq: 70 + Math.random() * 20, endFreq: 45, dur: 0.05, gain: g0 * 0.6, when: i * 0.36, pan });
      }
    },
    // 멀리서 쾅 (구조적 충격)
    distantBang(pan) {
      playTone({ freq: 58, endFreq: 30, dur: 0.6, gain: 0.07, pan });
      playNoise({ dur: 0.4, gain: 0.04, type: 'lowpass', freq: 200, pan });
    },
    // 물방울
    drip(pan) {
      const f = 900 + Math.random() * 500;
      playTone({ freq: f, endFreq: f * 0.5, type: 'sine', dur: 0.13, gain: 0.04, pan });
      playNoise({ dur: 0.05, gain: 0.015, type: 'bandpass', freq: f, q: 9, pan });
    },
    // 구조물 삐걱임
    creak(pan) {
      const f = 120 + Math.random() * 90;
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        playTone({
          type: 'sawtooth', freq: f * (1 + i * 0.04), dur: 0.09, gain: 0.018,
          when: i * 0.07, pan,
        });
      }
    },
    // 파이프 두드림 (금속 통)
    pipeKnock(pan) {
      const n = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        playTone({ freq: 320 + Math.random() * 200, dur: 0.18, gain: 0.045, type: 'triangle', when: i * 0.22, pan });
        playNoise({ dur: 0.04, gain: 0.03, type: 'bandpass', freq: 1400, q: 8, when: i * 0.22, pan });
      }
    },
    // 멀리서 문이 쾅
    doorFar(pan) {
      playNoise({ dur: 0.12, gain: 0.07, type: 'lowpass', freq: 260, pan });
      playTone({ freq: 90, endFreq: 44, dur: 0.3, gain: 0.06, pan });
    },
    // 등 뒤의 숨소리 (아주 가까이)
    breathClose(pan) {
      playNoise({ dur: 0.5, gain: 0.03, type: 'bandpass', freq: 600, q: 2, pan });
      playNoise({ dur: 0.4, gain: 0.022, type: 'bandpass', freq: 1100, q: 3, when: 0.55, pan });
    },
    // 낮게 끄는 소리 (무언가 끌려감)
    dragFar(pan) {
      playNoise({ dur: 0.9, gain: 0.03, type: 'bandpass', freq: 420, q: 1.5, pan });
    },
    // 발전기 가동 — 저주파 상승 → 안정된 험 + 전기 스파크
    generatorStart() {
      if (!ctx || muted) return;
      playTone({ freq: 30, endFreq: 60, type: 'sawtooth', dur: 1.6, gain: 0.16 });
      playTone({ freq: 45, endFreq: 90, type: 'sine', dur: 1.6, gain: 0.1 });
      for (let i = 0; i < 4; i++) {
        playNoise({ dur: 0.04, gain: 0.08, type: 'highpass', freq: 5000, when: 0.2 + i * 0.25 });
      }
      playTone({ freq: 120, dur: 0.6, gain: 0.05, type: 'sine', when: 1.4 });
      playNoise({ dur: 0.3, gain: 0.04, type: 'bandpass', freq: 2000, q: 3, when: 1.5 });
    },
    // 영혼 해방 정화음 — 불협 → 맑은 해소 화음
    purify() {
      if (!ctx || muted) return;
      const t = now();
      // 불협(살짝 어긋난 두 음) → 옥타브/5도로 해소
      playTone({ freq: 392, dur: 0.5, gain: 0.05, type: 'sine' });
      playTone({ freq: 416, dur: 0.5, gain: 0.04, type: 'sine' }); // 불협
      for (const [f, w] of [[523.25, 0.5], [659.25, 0.7], [783.99, 0.9], [1046.5, 1.1]]) {
        playTone({ freq: f, dur: 1.6, gain: 0.045, type: 'sine', when: w }); // 맑은 상승 아르페지오
      }
      playNoise({ dur: 1.2, gain: 0.015, type: 'highpass', freq: 6000, when: 0.5 }); // 반짝임
    },
    // 동생 목소리 환청 — 왜곡된 모음 글라이드("혀엉…")
    brotherCall(pan) {
      if (!ctx || muted) return;
      const t = now();
      // 포먼트 흉내: 기음 + 두 공명대
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(150, t);
      o.frequency.linearRampToValueAtTime(128, t + 0.5);
      o.frequency.linearRampToValueAtTime(138, t + 0.9);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 620; f1.Q.value = 6;
      const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 8;
      const g1 = ctx.createGain(); g1.gain.value = 0.5;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.06, t + 0.15);
      env.gain.setValueAtTime(0.06, t + 0.7);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      o.connect(f1); o.connect(f2); f1.connect(env); f2.connect(g1); g1.connect(env);
      outNode(env, pan);
      o.start(t); o.stop(t + 1.4);
      // 멀리서 울리는 잔향감
      playNoise({ dur: 0.8, gain: 0.012, type: 'bandpass', freq: 900, q: 3, when: 0.1, pan });
    },
    // ===== 환경 상호작용 =====
    doorMove(closed) {
      // 경첩 끼익 + (닫을 때) 쾅
      playTone({ type: 'sawtooth', freq: 240, endFreq: 150, dur: 0.3, gain: 0.04 });
      playNoise({ dur: 0.3, gain: 0.03, type: 'bandpass', freq: 700, q: 2 });
      if (closed) {
        playTone({ freq: 110, endFreq: 55, dur: 0.18, gain: 0.16, when: 0.28 });
        playNoise({ dur: 0.12, gain: 0.08, type: 'lowpass', freq: 300, when: 0.28 });
      }
    },
    doorBang() {
      playTone({ freq: 90, endFreq: 50, dur: 0.16, gain: 0.22 });
      playNoise({ dur: 0.1, gain: 0.12, type: 'lowpass', freq: 260 });
      playNoise({ dur: 0.06, gain: 0.06, type: 'bandpass', freq: 1400, q: 5 });
    },
    doorBreak() {
      playNoise({ dur: 0.5, gain: 0.2, type: 'lowpass', freq: 500 });
      for (let i = 0; i < 6; i++) {
        playNoise({ dur: 0.06, gain: 0.1, type: 'bandpass', freq: 800 + Math.random() * 1200, q: 6, when: Math.random() * 0.3 });
      }
      playTone({ freq: 70, endFreq: 32, dur: 0.5, gain: 0.2 });
    },
    furnitureDrag() {
      playNoise({ dur: 0.5, gain: 0.09, type: 'bandpass', freq: 280, q: 1.4 });
      playTone({ type: 'sawtooth', freq: 70, dur: 0.5, gain: 0.05 });
      playNoise({ dur: 0.12, gain: 0.06, type: 'bandpass', freq: 900, q: 3, when: 0.42 });
    },
    throwWhoosh(pan) {
      playNoise({ dur: 0.22, gain: 0.06, type: 'bandpass', freq: 1200, q: 1.2, pan });
    },
    rockLand(pan) {
      playNoise({ dur: 0.08, gain: 0.1, type: 'bandpass', freq: 600 + Math.random() * 300, q: 3, pan });
      playTone({ freq: 220, endFreq: 120, dur: 0.12, gain: 0.06, pan });
      // 작은 튕김
      playNoise({ dur: 0.05, gain: 0.05, type: 'bandpass', freq: 800, q: 4, when: 0.12, pan });
    },
    // 아몬드 워터 병 깨짐 — 유리 산산조각 + 물 튀김
    almondSplash(pan) {
      for (let i = 0; i < 7; i++) {
        playNoise({ dur: 0.04, gain: 0.06, type: 'highpass', freq: 4000 + Math.random() * 3000, when: Math.random() * 0.12, pan });
      }
      playNoise({ dur: 0.25, gain: 0.05, type: 'bandpass', freq: 1200, q: 1.5, pan });
      playTone({ freq: 520, endFreq: 320, dur: 0.18, gain: 0.04, type: 'sine', pan });
    },
    lockerMove() {
      playTone({ freq: 180, endFreq: 90, dur: 0.18, gain: 0.06, type: 'sawtooth' });
      playNoise({ dur: 0.25, gain: 0.05, type: 'bandpass', freq: 500, q: 2 });
    },
    // 숨었을 때 심장박동(빠른) — heartbeat 재활용 가능하지만 전용
    heartbeatFast() {
      playTone({ freq: 62, endFreq: 40, dur: 0.1, gain: 0.3 });
      playTone({ freq: 56, endFreq: 38, dur: 0.09, gain: 0.2, when: 0.13 });
    },
    win() {
      for (const [f, w] of [[220, 0], [277, 0.4], [330, 0.8], [440, 1.4]]) {
        playTone({ freq: f, dur: 2.2, gain: 0.04, when: w });
      }
    },
  };
})();
