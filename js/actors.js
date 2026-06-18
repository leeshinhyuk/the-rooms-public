'use strict';

BK.Player = class {
  constructor(x, y) {
    this.x = x; this.y = y;       // 발 중심 좌표(px)
    this.dir = 0;                  // 0하 1좌 2우 3상
    this.frame = 0;
    this.animT = 0;
    this.moving = false;
    this.running = false;
    this.stamina = 100;
    this.stepT = 0;
    this.stun = 0;                 // 기절 시간(우는 아이 비명)
    this.hidden = false;           // 사물함에 숨음
  }

  update(dt, input, world) {
    if (this.stun > 0) {
      this.stun -= dt;
      this.moving = false;
      this.frame = 0;
      this.stamina = Math.min(100, this.stamina + 8 * dt);
      return;
    }
    if (this.hidden) {             // 숨는 중: 이동 불가, 스태미나 회복
      this.moving = false;
      this.running = false;
      this.frame = 0;
      this.stepT = 0;
      this.stamina = Math.min(100, this.stamina + 14 * dt);
      return;
    }
    let dx = input.x, dy = input.y;
    this.moving = (dx !== 0 || dy !== 0);
    const wantRun = input.run && this.stamina > 0.5 && this.moving;
    this.running = wantRun;

    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      const spd = wantRun ? 96 : 60;
      this.tryMove(dx * spd * dt, dy * spd * dt, world);
      this.animT += dt * (wantRun ? 10 : 6.5);
      this.frame = Math.floor(this.animT) % 4;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        BK.audio.footstep(wantRun);
        this.stepT = wantRun ? 0.21 : 0.31;
      }
    } else {
      this.frame = 0;
      this.animT = 0;
      this.stepT = 0;
    }

    if (wantRun) this.stamina = Math.max(0, this.stamina - 26 * dt);
    else this.stamina = Math.min(100, this.stamina + (this.moving ? 12 : 20) * dt);
  }

  // 히트박스: 발 기준 8x6 — 축 분리 충돌
  tryMove(dx, dy, world) {
    const solid = (px, py) => BK.solidPx(world, px, py);
    const nx = this.x + dx;
    if (!solid(nx - 4, this.y - 3) && !solid(nx + 4, this.y - 3) &&
        !solid(nx - 4, this.y + 3) && !solid(nx + 4, this.y + 3)) this.x = nx;
    const ny = this.y + dy;
    if (!solid(this.x - 4, ny - 3) && !solid(this.x + 4, ny - 3) &&
        !solid(this.x - 4, ny + 3) && !solid(this.x + 4, ny + 3)) this.y = ny;
  }

  draw(g, cam) {
    if (this.hidden) return; // 사물함 안 — 보이지 않음
    const sx = Math.round(this.x - cam.x), sy = Math.round(this.y - cam.y);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(sx, sy + 1, 5, 2.4, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(BK.assets.player[this.dir][this.frame], sx - 8, sy - 16);
  }
};

// 괴물 종별 기본 스펙
BK.MON_SPEC = {
  // 미소 짓는 것: 시각+청각 추적자, 정석적인 술래
  smiler: {
    spriteW: 20, spriteH: 28, dy: -26, hit: 9,
    roam: 26, inv: 46, hunt: 64,
    sight: 155, hearWalk: 85, hearRun: 230,
    blind: false, catchStun: false,
  },
  // 눈 없는 것(크롤러): 장님, 소리로만 사냥, 매우 빠름 → 멈춰야 산다
  crawler: {
    spriteW: 24, spriteH: 16, dy: -14, hit: 8,
    roam: 30, inv: 70, hunt: 96,
    sight: 0, hearWalk: 150, hearRun: 360,
    blind: true, catchStun: false,
  },
  // 광대: 발견 시 경직 후 폭주 돌진, 지치면 휴식
  clown: {
    spriteW: 18, spriteH: 28, dy: -26, hit: 9,
    roam: 30, inv: 50, hunt: 58,
    sight: 200, hearWalk: 70, hearRun: 200,
    blind: false, catchStun: false,
    chargeSpeed: 138, chargeWindup: 0.8, chargeDur: 1.5, chargeRest: 2.2,
  },
  // 우는 아이: 느림, 안 죽임 — 다가가면 비명(기절+소집), 울음이 미끼
  child: {
    spriteW: 12, spriteH: 16, dy: -14, hit: 11,
    roam: 18, inv: 22, hunt: 26,
    sight: 70, hearWalk: 0, hearRun: 60,
    blind: false, catchStun: true, screamRange: 30, screamCD: 8,
  },
  // 꺼진 것: 어둠/화면 밖에서만 전진, 빛이 닿으면 굳는다 → 빛에서 떼지 마라
  shade: {
    spriteW: 16, spriteH: 30, dy: -28, hit: 9,
    roam: 0, inv: 0, hunt: 56,
    sight: 9999, hearWalk: 9999, hearRun: 9999, // 항상 위치를 안다 (소리/시야 무관)
    blind: false, catchStun: false,
    darkMover: true, freezeLit: 0.22, // 이보다 밝게 비치면 굳음
  },
};

BK.Monster = class {
  constructor(kind, x, y) {
    this.kind = kind;
    this.spec = BK.MON_SPEC[kind];
    this.x = x; this.y = y;
    this.state = 'roam';            // roam | investigate | search | hunt | windup | charge | rest | flee
    this.path = [];
    this.target = null;
    this.lastSeen = null;
    this.repathT = 0;
    this.losT = Math.random() * 0.12;
    this.lostT = 0;
    this.searchT = 0;
    this.huntT = 0;
    this.spotCD = 0;
    this.sinceSeen = 999;
    this.ambushCD = 16 + Math.random() * 10;
    this.frame = 0;
    this.animT = Math.random();
    this.seesPlayer = false;
    this.sndT = Math.random() * 2;     // 시그니처 사운드 타이머
    this.timer = 0;                    // 상태 전용 타이머(광대 돌진 등)
    this.screamCD = 0;
    this.weakT = 0;
    this.dirVec = { x: 1, y: 0 };
    this.frozen = false;            // 꺼진 것: 빛에 굳음
    this.petrifyT = 0;              // 꺼진 것: 강한 빛 노출 누적 (영구 석화까지)
    this.petrified = false;         // 꺼진 것: 영구 석화됨(서브 루트 — 위협 제거)
    this.crashes = 0;               // 광대: 벽 충돌 누적 (소진까지)
    this.shadeAggro = false;        // 꺼진 것: 근접 추격 여부(BGM/조명)
    this._litLevel = 0;             // 렌더가 채워주는 현재 광량
    this._onScreen = false;
  }

  tile() {
    const T = BK.TILE;
    return { x: Math.floor(this.x / T), y: Math.floor(this.y / T) };
  }

  // 추격 상태인가 (BGM/난이도 판정용)
  get aggressive() {
    if (this.kind === 'shade') return this.shadeAggro; // 굳어 있거나 멀면 추격 아님
    return this.state === 'hunt' || this.state === 'windup' || this.state === 'charge';
  }

  update(dt, world, player, game) {
    const spec = this.spec;
    this.animT += dt;
    if (this.animT > (this.state === 'charge' ? 0.09 : 0.18)) { this.animT = 0; this.frame ^= 1; }
    this.repathT -= dt;
    this.spotCD -= dt;
    this.ambushCD -= dt;
    this.sndT -= dt;
    this.screamCD -= dt;
    if (this.weakT > 0) this.weakT -= dt; // 아몬드 워터에 약화됨

    const dxp = player.x - this.x, dyp = player.y - this.y;
    const d = Math.hypot(dxp, dyp);
    const prox = BK.clamp(1 - d / 300, 0, 1);
    const pan = BK.clamp((this.x - player.x) / 240, -1, 1);

    // 거리 기반 시그니처 사운드 (방향 패닝)
    this.emitSound(d, prox, pan);

    // 너무 멀어지면 화면 밖 재배치 (무한 맵 압박 유지) — 단, 우는 아이는 제자리 미끼
    if (d > 720 && this.kind !== 'child') {
      const spot = BK.randomFloorNear(world, player.x, player.y, 320, 460);
      if (spot && !game.onScreen(spot.x, spot.y, 30)) {
        this.x = spot.x; this.y = spot.y;
        this.path = []; this.state = 'roam'; this.timer = 0;
      }
    }

    // 시야 갱신 (손전등 켜면 더 멀리서 들킨다 / 숨으면 안 보인다)
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.12;
      let sight = spec.sight;
      if (game.flashlight && game.flashlight.on) sight += 80;
      this.seesPlayer = !spec.blind && !player.hidden && d < sight &&
        BK.los(world, this.x, this.y - 8, player.x, player.y - 6);
    }
    this.sinceSeen = this.seesPlayer ? 0 : this.sinceSeen + dt;

    const T = BK.TILE;
    const me = this.tile();
    const pt = { x: Math.floor(player.x / T), y: Math.floor(player.y / T) };

    // 던진 물건 소리에 이끌림 (추격 중이 아닐 때)
    if (game.lure && this.state !== 'hunt' && this.kind !== 'child') {
      const ld = Math.hypot(game.lure.x - this.x, game.lure.y - this.y);
      if (ld < 340 && ld > 10) {
        this.state = 'investigate';
        this.target = { x: Math.floor(game.lure.x / T), y: Math.floor(game.lure.y / T) };
        if (game.lure.fresh) { this.path = []; this.repathT = 0; }
      }
    }

    // 종별 AI
    if (this.kind === 'clown') this.updateClown(dt, world, player, game, d, pt, me);
    else if (this.kind === 'child') this.updateChild(dt, world, player, game, d, pt, me);
    else if (this.kind === 'shade') this.updateShade(dt, world, player, game, d, pt, me);
    else this.updateChaser(dt, world, player, game, d, pt, me); // smiler, crawler

    // 접촉 (숨어 있으면 직접 잡히지 않음 — 발각은 game에서 별도 처리)
    // 꺼진 것은 굳어 있을 땐 잡지 못한다 (빛이 꺼지는 순간 잡힌다)
    if (d < spec.hit && game.state === 'play' && this.state !== 'rest' && this.state !== 'down' && !this.frozen && !player.hidden) {
      if (!spec.catchStun) game.catchPlayer(this); // 우는 아이는 비명만(updateChild)
    }
  }

  emitSound(d, prox, pan) {
    if (this.sndT > 0 || d > 420) return;
    const aggr = this.aggressive;
    if (this.kind === 'crawler') {
      this.sndT = aggr ? 0.4 + Math.random() * 0.3 : 1.0 + Math.random() * 1.2;
      BK.audio.crawlerClicks(prox, pan);
    } else if (this.kind === 'clown') {
      if (this.state !== 'rest') {
        this.sndT = aggr ? 0.7 + Math.random() * 0.4 : 2.2 + Math.random() * 2;
        BK.audio.clownGiggle(prox, pan);
      } else this.sndT = 1;
    } else if (this.kind === 'child') {
      this.sndT = 1.4 + Math.random() * 1.6;
      BK.audio.childSob(prox, pan);
    } else if (this.kind === 'shade') {
      if (this.frozen) { this.sndT = 0.6; return; } // 굳으면 소리 없음
      this.sndT = aggr ? 0.45 + Math.random() * 0.35 : 1.3 + Math.random() * 1.1;
      BK.audio.shadeWalk(prox, pan);
    } else {
      // smiler: 가까이서 추격 중일 때만 속삭임
      if (aggr && d < 220) { this.sndT = 1.2 + Math.random(); BK.audio.whisper(); }
      else this.sndT = 2;
    }
  }

  // ===== 추격형(미소 짓는 것 / 눈 없는 것) =====
  updateChaser(dt, world, player, game, d, pt, me) {
    const spec = this.spec, cfg = world.cfg;

    if (game.finale && this.state !== 'hunt') {
      this.state = 'hunt'; this.lostT = 0; this.huntT = 0;
    }

    // 매복 (구역 플래그)
    if (cfg.ambush && !game.finale && this.sinceSeen > 14 && this.ambushCD <= 0 &&
        player.moving && d > 260 && this.state !== 'hunt') {
      const dv = [[0, 1], [-1, 0], [1, 0], [0, -1]][player.dir];
      const ax = player.x + dv[0] * 170, ay = player.y + dv[1] * 170;
      const spot = BK.randomFloorNear(world, ax, ay, 0, 60, 25);
      if (spot && !game.onScreen(spot.x, spot.y, 20)) {
        this.x = spot.x; this.y = spot.y; this.path = [];
        this.state = 'search'; this.searchT = 5; this.ambushCD = 28;
        BK.audio.whisper();
      }
    }

    // 청각: 발소리 (크롤러는 청각이 주무기 → 멀리서도 들음)
    if (this.state !== 'hunt' && player.moving) {
      const hr = player.running ? spec.hearRun : spec.hearWalk;
      if (d < hr && BK.los(world, this.x, this.y - 8, player.x, player.y - 6, true)) {
        // 크롤러는 발견=추격(보지 않아도), 스마일러는 조사
        if (spec.blind) {
          this.state = 'hunt'; this.lostT = 0; this.huntT = 0;
          this.lastSeen = { x: pt.x, y: pt.y };
          if (this.spotCD <= 0) { game.onSpotted(this); this.spotCD = 6; }
        } else if (this.state !== 'investigate' || this.repathT <= 0) {
          this.state = 'investigate';
          this.target = { x: pt.x, y: pt.y }; this.path = []; this.repathT = 0.5;
        }
      }
    }
    // 크롤러: 플레이어가 멈춰 있으면 추격 풀림 (소리가 사라짐)
    if (spec.blind && this.state === 'hunt' && !player.moving && !game.finale) {
      this.lostT += dt;
      if (this.lostT > 1.6) { this.state = 'search'; this.searchT = 2.5; this.path = []; }
    }

    // 시각 발견
    if (!spec.blind && this.state !== 'hunt' && this.seesPlayer) {
      this.state = 'hunt'; this.lostT = 0; this.huntT = 0;
      this.lastSeen = { x: pt.x, y: pt.y };
      if (this.spotCD <= 0) { game.onSpotted(this); this.spotCD = 7; }
    }

    switch (this.state) {
      case 'roam': this.roam(dt, world, spec.roam); break;
      case 'investigate':
        if (!this.path.length && this.repathT <= 0 && this.target) {
          this.path = BK.findPath(world, me.x, me.y, this.target.x, this.target.y) || [];
          this.repathT = 0.5;
          if (!this.path.length) { this.state = 'search'; this.searchT = 2.0; }
        }
        this.follow(dt, spec.inv);
        if (this.target && me.x === this.target.x && me.y === this.target.y && !this.path.length) {
          this.state = 'search'; this.searchT = 2.2;
        }
        break;
      case 'search':
        this.searchT -= dt;
        if (this.searchT <= 0) { this.state = 'roam'; this.path = []; this.repathT = 0; }
        break;
      case 'hunt': {
        this.huntT += dt;
        if (this.seesPlayer || game.finale || (spec.blind && player.moving && d < spec.hearRun)) {
          this.lostT = 0; this.lastSeen = { x: pt.x, y: pt.y };
        } else this.lostT += dt;
        if (this.repathT <= 0) {
          const tgt = (this.seesPlayer || game.finale || spec.blind) ? pt : (this.lastSeen || pt);
          this.path = BK.findPath(world, me.x, me.y, tgt.x, tgt.y) || [];
          this.repathT = 0.32;
        }
        let spd = spec.hunt + Math.min(10, this.huntT * 1.2);
        if (game.finale) spd += 8;
        this.follow(dt, spd);
        if (!game.finale && !spec.blind && this.lostT > 3.5) {
          this.state = 'investigate'; this.target = this.lastSeen || pt;
          this.path = []; this.repathT = 0;
        }
        break;
      }
    }
  }

  // ===== 광대: 발견→경직→폭주 돌진→휴식 =====
  updateClown(dt, world, player, game, d, pt, me) {
    const spec = this.spec;
    const sees = this.seesPlayer || game.finale;

    if (sees && (this.state === 'roam' || this.state === 'investigate' || this.state === 'search')) {
      this.state = 'windup'; this.timer = spec.chargeWindup; this.path = [];
      this.dirVec = { x: (player.x - this.x), y: (player.y - this.y) };
      const m = Math.hypot(this.dirVec.x, this.dirVec.y) || 1;
      this.dirVec.x /= m; this.dirVec.y /= m;
      BK.audio.clownHorn();
      BK.audio.riser(spec.chargeWindup, 0.05); // 경직 동안 차오르는 긴장
      if (this.spotCD <= 0) { game.onSpotted(this); this.spotCD = 5; }
    }

    switch (this.state) {
      case 'roam': this.roam(dt, world, spec.roam); break;
      case 'investigate':
      case 'search':
        // 발소리 들으면 그쪽으로 어슬렁
        if (player.moving && d < (player.running ? spec.hearRun : spec.hearWalk)) {
          if (this.repathT <= 0) {
            this.path = BK.findPath(world, me.x, me.y, pt.x, pt.y) || [];
            this.repathT = 0.5;
          }
        }
        this.follow(dt, spec.inv);
        if (!this.path.length && this.repathT <= 0) { this.state = 'roam'; }
        break;
      case 'windup': {
        this.timer -= dt;
        // 조준 갱신
        const aim = { x: player.x - this.x, y: player.y - this.y };
        const m = Math.hypot(aim.x, aim.y) || 1;
        this.dirVec.x = BK.lerp(this.dirVec.x, aim.x / m, 0.06);
        this.dirVec.y = BK.lerp(this.dirVec.y, aim.y / m, 0.06);
        if (this.timer <= 0) {
          this.state = 'charge'; this.timer = spec.chargeDur;
          BK.audio.duck(0.1, 0.04, 0.5); // 폭주가 터지는 순간의 정적
          BK.fx.addShake(2.5);
        }
        break;
      }
      case 'charge': {
        this.timer -= dt;
        const step = spec.chargeSpeed * dt;
        if (!this.moveStraight(world, this.dirVec.x * step, this.dirVec.y * step)) {
          // 벽에 박으면 잠깐 멈췄다 휴식. 옆으로 피해 헛돌진을 유도하면 점점 지친다.
          BK.audio.thud(); BK.fx.addShake(2);
          this.crashes++;
          if (this.crashes >= 3) { this.state = 'down'; this.timer = 0; this.path = []; } // 서브 루트: 소진
          else { this.state = 'rest'; this.timer = spec.chargeRest; }
        }
        if (this.state === 'charge' && this.timer <= 0) { this.state = 'rest'; this.timer = spec.chargeRest; }
        break;
      }
      case 'down': break; // 소진 — 주저앉아 더는 일어나지 않는다
      case 'rest': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = sees ? 'windup' : 'roam';
          if (this.state === 'windup') { this.timer = spec.chargeWindup; BK.audio.clownHorn(); }
        }
        break;
      }
    }
  }

  // ===== 우는 아이: 느린 배회, 근접 시 비명(기절+소집) =====
  updateChild(dt, world, player, game, d, pt, me) {
    const spec = this.spec;
    // 비명 트리거
    if (d < spec.screamRange && this.screamCD <= 0 && game.state === 'play') {
      this.screamCD = spec.screamCD;
      this.state = 'hunt'; this.timer = 1.2;
      game.childScream(this);
      return;
    }
    // 플레이어가 보이면 천천히 따라옴(미끼처럼 어슬렁)
    if (this.seesPlayer || (player.moving && d < spec.hearRun)) {
      if (this.repathT <= 0) {
        this.path = BK.findPath(world, me.x, me.y, pt.x, pt.y) || [];
        this.repathT = 0.6;
      }
      this.follow(dt, spec.hunt);
    } else {
      this.roam(dt, world, spec.roam);
    }
  }

  // ===== 꺼진 것: 어둠/화면 밖에서만 전진. 빛에 닿으면 굳는다 =====
  updateShade(dt, world, player, game, d, pt, me) {
    const spec = this.spec;
    // 서브 루트: 영구 석화되면 영원히 멈춘 석상 (위협 제거)
    if (this.petrified) { this.frozen = true; this.shadeAggro = false; this.path = []; return; }
    this.state = 'hunt'; // 항상 집요하게 노린다 (시야/소리 무관)
    // 렌더가 채워준 광량으로 '굳음' 판정: 화면 안 + 충분히 밝으면 굳는다
    const wasFrozen = this.frozen;
    this.frozen = this._onScreen && this._litLevel > spec.freezeLit;
    if (this.frozen) {
      if (!wasFrozen) { // 막 굳는 순간 — 돌 맞물리는 소리
        const pan = BK.clamp((this.x - player.x) / 240, -1, 1);
        BK.audio.shadeFreeze(pan);
      }
      this.path = [];
      this.shadeAggro = false;
      // 강한 빛에 충분히 오래 노출되면 영구 석화 (서브 루트). 발전기를 켜면 훨씬 쉬워진다.
      if (this._litLevel > 0.5) {
        this.petrifyT += dt;
        if (this.petrifyT > 3.5) {
          this.petrified = true;
          BK.audio.shadeFreeze(BK.clamp((this.x - player.x) / 240, -1, 1));
          BK.fx.addShake(2);
        }
      }
      return;
    }
    this.petrifyT = Math.max(0, this.petrifyT - dt * 1.5); // 어둠으로 들어가면 굳기 풀림
    // 어둠/화면 밖 → 플레이어에게로 전진
    if (this.repathT <= 0) {
      this.path = BK.findPath(world, me.x, me.y, pt.x, pt.y) || [];
      this.repathT = 0.3;
    }
    let spd = spec.hunt;
    if (!this._onScreen) spd *= 1.4; // 화면 밖에선 더 빠르게 따라붙는다
    if (game.finale) spd += 16;
    this.follow(dt, spd);
    // 근접 + 어둠에서 움직일 때만 추격 연출/BGM
    this.shadeAggro = d < 210;
    // 어둠 속에서 가까이 다가오면 알린다 (처음이면 그 정체도)
    if (this.shadeAggro && this.spotCD <= 0) { game.onSpotted(this); this.spotCD = 9; }
  }

  roam(dt, world, spd) {
    if (!this.path.length && this.repathT <= 0) {
      const spot = BK.randomFloorNear(world, this.x, this.y, 80, 260);
      if (spot) {
        const me = this.tile();
        this.path = BK.findPath(world, me.x, me.y,
          Math.floor(spot.x / BK.TILE), Math.floor(spot.y / BK.TILE)) || [];
      }
      this.repathT = 0.6;
    }
    this.follow(dt, spd);
  }

  follow(dt, spd) {
    if (this.weakT > 0) spd *= 0.32; // 약화 — 둔해진다
    if (!this.path.length) return;
    const wp = this.path[0];
    const dx = wp.x - this.x, dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2.5) { this.path.shift(); return; }
    this.x += (dx / d) * spd * dt;
    this.y += (dy / d) * spd * dt;
  }

  // 직선 이동(광대 돌진) — 벽 만나면 false
  moveStraight(world, dx, dy) {
    const solid = (px, py) => BK.solidPx(world, px, py);
    let moved = false;
    const nx = this.x + dx;
    if (!solid(nx - 4, this.y - 3) && !solid(nx + 4, this.y - 3) &&
        !solid(nx - 4, this.y + 3) && !solid(nx + 4, this.y + 3)) { this.x = nx; moved = true; }
    const ny = this.y + dy;
    if (!solid(this.x - 4, ny - 3) && !solid(this.x + 4, ny - 3) &&
        !solid(this.x - 4, ny + 3) && !solid(this.x + 4, ny + 3)) { this.y = ny; moved = true; }
    return moved;
  }

  // 빛 안에서만 보인다 → main 렌더에서 광량 알파를 곱해 호출
  draw(g, cam, lightAlpha) {
    if (lightAlpha <= 0.02) return;
    const spec = this.spec;
    const aggr = this.aggressive;
    const charging = this.state === 'charge';
    const down = this.state === 'down'; // 광대: 소진해 주저앉음
    // 꺼진 것: 굳어 있으면 미동도 없는 석상, 어둠에서 움직이면 살짝 떤다
    let jit = charging ? 2.2 : (aggr ? 1.4 : 0.5);
    if (this.kind === 'shade') jit = this.frozen ? 0.15 : 1.2;
    if (down) jit = 0;
    const jx = (Math.random() - 0.5) * 2 * jit;
    const jy = (Math.random() - 0.5) * 2 * jit;
    const sx = Math.round(this.x - cam.x + jx), sy = Math.round(this.y - cam.y + jy);
    // 그림자
    g.globalAlpha = lightAlpha * 0.4;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(sx, sy + 1, spec.spriteW * 0.3, 2.6, 0, 0, Math.PI * 2);
    g.fill();
    // 본체 (꺼진 것: 굳음=석상 프레임0~1, 움직임=프레임2~3)
    let base = aggr ? 2 : 0;
    if (this.kind === 'shade') base = this.frozen ? 0 : 2;
    if (down) base = 0;
    const spr = BK.assets.mon[this.kind][base + this.frame];
    g.globalAlpha = lightAlpha * (down ? 0.7 : 0.96);
    g.drawImage(spr, sx - (spec.spriteW >> 1), sy + spec.dy + (down ? 11 : 0));
    g.globalAlpha = 1;
  }
};
