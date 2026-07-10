'use strict';
(function () {
  const canvas = document.getElementById('screen');
  const dctx = canvas.getContext('2d');
  const buf = BK.makeCanvas(BK.VIEW_W, BK.VIEW_H);
  const bctx = buf.getContext('2d');
  // 점프스케어 얼굴 전용 고해상도 오프스크린 (블러로 레이어 경계를 녹이기 위함)
  const jumpBuf = document.createElement('canvas');
  jumpBuf.width = 440; jumpBuf.height = 480;
  const jbx = jumpBuf.getContext('2d');
  const overlay = document.getElementById('overlay');
  const S = BK.SCALE, VW = BK.VIEW_W, VH = BK.VIEW_H, T = BK.TILE;
  const touchMode = matchMedia('(pointer: coarse), (max-width: 760px)').matches || navigator.maxTouchPoints > 0;
  dctx.imageSmoothingEnabled = false;

  BK.buildAssets();
  BK.fx.init();

  // 캐릭터 외형 (헤어/의상) — 저장된 선택을 불러와 적용
  function loadLook() {
    try {
      const v = JSON.parse(localStorage.getItem('bk_look'));
      if (v && Number.isInteger(v.hair) && Number.isInteger(v.outfit)) {
        return { hair: BK.clamp(v.hair, 0, BK.PLAYER_HAIR.length - 1), outfit: BK.clamp(v.outfit, 0, BK.PLAYER_OUTFIT.length - 1) };
      }
    } catch (e) { /* noop */ }
    return { hair: 0, outfit: 0 };
  }
  function saveLook(look) { try { localStorage.setItem('bk_look', JSON.stringify(look)); } catch (e) { /* noop */ } }
  const playerLook = loadLook();
  BK.setPlayerLook(playerLook.hair, playerLook.outfit);

  // ---------------- 텍스트 (먼저 떨어진 자의 기록) ----------------
  // 기록 본문 = 종이에 적힌 쪽지. 읽고 나서 떠오르는 '현재의 생각'은 NOTE_AFTER로 분리해
  // 닫은 뒤 하단에 순차적으로 띄운다.
  // 동생 이름 — L0~L2엔 화자가 못 떠올린다(의심을 키운다). L3 캠코더에서야 또렷이 돌아온다.
  const BRO_NAME = '레오';
  const NOTE_TEXTS = [
    // LEVEL 0 (0~4) — 죄책감으로 들어옴 + 루프 단서의 시작
    '생일 노래가 끝나고 애들이 케이크로 몰려갔다. 나는 그 애 손을 잡고 있었다.\n휴대폰을 봤다. 몇 초였다. 고개를 드니 손이 비어 있었다.\n노란 매트 가운데가 꺼져 있었다. 소리도 없었다.\n경찰은 2주를 뒤졌다. 바닥 밑으로 사라졌다는 내 말은 조서에도 안 올라갔다.\n그래서 혼자 왔다. 문 닫은 놀이방, 같은 매트 위에. 일부러 섰다.',
    '떨어진 곳은 놀이방이 아니었다. 누런 벽지에 젖은 카펫, 형광등이 끝도 없다.\n벽 너머에서 그 애 목소리가 난다. 다가가면 멀어진다. 멈추면 또 부른다.\n벽에 긁어 쓴 글씨가 있다. 내 필체랑 너무 닮아서 한참 봤다.',
    '노란 병을 주웠다. 라벨에 아몬드 워터라고 적혀 있다. 마시면 머리가 좀 돌아온다.\n안 마시면 하루가 뭉개진다. 어제 쓴 글이 남의 글 같다.\n동생 얼굴도 흐려진다. 잊기 전에 적는다.\n앞니 빠진 웃음. 노란 우비. 케이크 크림 묻은 손.\n이름을 쓰려는데 안 나온다. 아는데. 분명 아는데 안 나온다.',
    '규칙을 적는다. 다음에 올 나한테 남긴다.\n주운 종이를 늘어놓고 알았다. 종이는 제각각인데 필체가 전부 하나다.\n내 글씨다. 전부.\n처음 온 게 아니었다. 올 때마다 처음인 줄 알았을 뿐이지.',
    '균열을 찾았다. 벽이 보랏빛으로 곪은 자리. 드디어 집에—\n(여기서부터는 글씨가 찢겨 있다)\n문이 아니다. 입이다.\n열었다고 생각했는데 삼켜졌다. 더 밑으로.',
    // LEVEL 2 (5~7) — 1차 반전(루프) 확정
    '기계실이다. 뭘 만드는지도 모를 기계가 밤낮없이 돈다.\n기계음 틈에 목소리가 낀다. 그 애 목소리로 내 이름을 부른다.\n하마터면 대답할 뻔했다. 대답하면 안 될 것 같았다. 이유는 모른다.',
    '눈 없는 게 네 발로 긴다. 딸깍 소리를 낸다. 소리 나는 쪽으로 온다.\n달리면 죽는다. 멈추면 산다. 숨까지 참아라. 그러면 지나간다.\n걔한테 당한 시신을 하나 봤다. 후드가 낯익어서 먼지를 닦았다.\n닦지 말 걸 그랬다.',
    '발전기가 죽어 있다. 퓨즈 세 개를 꽂아야 엘리베이터가 돈다.\n어둠 속에 서 있는 것들. 하나는 사원증을 걸었고 하나는 작업복 차림이다.\n원래는 사람이었을 거다. 야간조. 못 나간 사람들.',
    // LEVEL 3 (8~10) — 동생 실재 여부를 캠코더 직전까지 의심으로 남긴다
    '엘리베이터는 분명 위로 갔다. 문이 열리니 놀이방 냄새가 났다.\n벽마다 크레용 그림이다. 웃는 애들. 입이 얼굴보다 크게 그려져 있다.\n구석에 삐뚤삐뚤 적혀 있다. "선생님이 같이 놀자고 해요" "형은 언제 와요"',
    '애들 셋이 운다. 하나는 곰인형, 하나는 풍선, 하나는 태엽을 찾는다.\n찾아서 쥐여 주면 잠깐 얼굴이 또렷해졌다가, 빛으로 흩어진다.\n셋 중 하나가 노란 우비다.\n가까이 가면 목이 멘다. 이름이 나올 것 같은데 목에서 걸린다.',
    '노란 우비가 나를 본다.\n늦었다는 건 안다. 뭐에 늦었는지는 아직 못 쓰겠다.\n그 애 손에 태엽이 없다. 그건 내가 찾아 줘야 한다.\n돌려주면 기억이 날 거다. 사실은 그게 무섭다.\n다음의 나야. 이번엔 그 앞에서 도망치지 마라.',
  ];
  // 기록을 다 읽고 덮은 뒤, 하단에 순차적으로 떠오르는 '현재의 나'의 생각
  const NOTE_AFTER = [
    ['놓은 게 아니라 놓친 거다. …다를 게 있나.'],
    ['나는 여기 처음 왔다. 처음 맞다. 글씨 닮은 사람은 많다.'],
    ['목소리는 이렇게 생생한데 이름이 안 나온다.'],
    ['"다음에 올 나". 이걸 쓸 때 무슨 심정이었을까.', '몇 번째인지는 세지 말자. 알아서 좋을 게 없다.'],
    ['알면서도 매번 열었다는 거다. 이번의 나도 열 거고.', '기억은 지워지는데 찾아야 한다는 것만 남나 보다.'],
    ['방금 또 불렀다. 대답 안 했다. 잘한 건지 모르겠다.'],
    ['…내 얼굴이었다.', '전의 내가 여기서 죽었다. 그럼 지금 걷고 있는 나는 뭐지.'],
    ['사원증에 작업복. 퇴근을 못 했을 뿐이다, 저 사람들도.', '나는 여기 온 지 며칠째지. 세어 보니, 모르겠다.'],
    ['"형은 언제 와요". 한참 서서 읽고 또 읽었다.'],
    ['노란 우비까지 봤는데도 이름이 안 나온다. 미치겠다.'],
    ['도망치면 또 처음이다. 그건 이제 안다.', '이번엔 끝까지 간다. 뭐가 나오든.'],
  ];
  const FLAVOR = [
    [
      '형광등이 신경질적으로 윙윙거린다.',
      '카펫에서 곰팡내가 올라온다.',
      '벽지의 줄무늬가 잠깐 흔들린 것 같다.',
      '누군가 지켜보고 있는 기분이 든다.',
      '천장 너머에서 발소리가 들렸다. …천장 너머에서?',
      '여긴 아까 지나온 방이 아니었던가.',
    ],
    [
      '기계가 낮게 신음한다.',
      '어디선가 증기가 샌다.',
      '컨베이어 벨트는 아무것도 운반하지 않는다.',
      '기름 냄새 사이로 희미한 단내가 난다.',
      '파이프가 미지근하다. 사람 체온이다.',
      '기계 소리에 목소리가 섞여 있다. 대답하지 마라.',
      '딸깍… 딸깍… 어둠 속에서 무언가가 더듬는다.',
      '어둠 속에 잿빛 형체가 굳어 있다. …아까보다 가까운가?',
      '기름 냄새에 크레용 냄새가 섞였다. …설마.',
      '기계 소음에 아이 흥얼거림이 섞였다. …그쳤다.',
      '사물함마다 이름표. 닳아서 안 보이는데, 하나는 왠지 낯익다.',
    ],
    [
      '크레용 냄새가 난다.',
      '어디선가 아이가 흥얼거렸다. …그쳤다.',
      '장난감이 방금 저절로 굴러간 것 같다.',
      '벽 그림 구석마다 같은 글씨 — "형은 언제 와요?".',
      '오르골 소리가 벽 너머에서도 들린다.',
      '작은 영혼이 흐느낀다. 잃어버린 것을 찾아 달라고.',
      '노란 우비 자락이 복도 끝으로 사라졌다. …동생?',
    ],
  ];
  // 벽 낙서는 진행도에 따라 더 직접적으로 변한다. 초반부터 반전을 말하지 않도록 분리.
  const WRITING_MSGS_L0_BASE = ['뒤를 봐', '나가는 길은 위가 아니다', '아직도 그 애를 찾니', '손 놓지 마', '여긴 조용한 척한다'];
  const WRITING_MSGS_L0_MID = ['너는 처음이 아니야', '같은 길을 또 걷는다', '이 글씨, 낯익지 않아?'];
  const WRITING_MSGS_L0_LATE = ['이 글씨, 네 글씨야', '몇 번째니', '다음의 너에게'];
  // 기계실(L1) 전용 낙서 — 미쳐가며 긁은 단편. 단정하지 않고 흘린다.
  const WRITING_MSGS_L1 = ['그것도 한때', '불 꺼뜨리지 마', '먼저 온 자들', '세지 마', '이름 붙이지 마', '곧 너도', '데일은 불을 끈다', '레예스가 먼저였다', '우리도 누굴 찾으러 왔었다', '여긴 우리 직장이었다', '노라는 불을 켜 둔다', '야간조 전원'];
  const WRITING_MSGS_L3 = ['같이 놀자', '선생님이 부른다', '노란 애는 아직 기다려', '형은 언제 와요', '손잡고 들어가면 못 나가', '광대는 빈자리를 싫어해'];
  function writingPoolForZone() {
    if (game.zoneIdx === 0) {
      const pool = WRITING_MSGS_L0_BASE.slice();
      if (game.notesRead >= 3) pool.push(...WRITING_MSGS_L0_MID);
      if (game.notesRead >= 5) pool.push(...WRITING_MSGS_L0_LATE);
      return pool;
    }
    if (game.zoneIdx === 1) return WRITING_MSGS_L1;
    return WRITING_MSGS_L3;
  }
  // 놀이방(L3) 크레용 벽화 — 아이들이 그린 그림. 흩어진 패널을 모아 아이들의 최후를 읽는다.
  const MURAL_PANELS = [
    '크레용 그림 — 아이들이 광대와 손잡고 둥글게 돈다. 웃는 입이 얼굴보다 크다.',
    '크레용 그림 — 아이들이 줄지어 어떤 문으로 들어간다. 문 위엔 풍선. 맨 뒤 아이만 뒤를 돌아본다.',
    '크레용 그림 — 아까보다 아이가 줄었다. 빈자리마다 까만 크레용으로 동그라미만 덩그러니.',
    '크레용 그림 — 이제 한 명. 노란 우비 아이가 매트 끝에 혼자 서 있다. 옆에 삐뚤빼뚤 "형".',
    '크레용 그림 — 손잡은 큰 사람과 작은 노란 우비. 큰 사람 쪽만 까만 크레용으로 문질러 지워져 있다.\n구석에 작게 — "형이 손을 놨어."',
  ];
  // 정신력이 낮을 때 떠오르는 거짓 속삭임 (불신 유발)
  const FAKE_MSGS =['뒤를 봐.', '동생 같은 건 없어. 넌 미쳤어.', '그 목소리, 네가 지어낸 거야.', '넌 외동이었어. 동생 같은 건, 처음부터.', '그 애 이름을 대 봐. …못 대잖아.', '거의 다 왔어… 거짓말.', '이번엔 다를 거야. …라고 지난번에도 썼잖아.', '방금 그 소리, 네 발소리 아니야.', '여긴 아까 그 방이야.'];
  const BRO_MSGS = ['…동생 목소리. 진짜일까, 내 머릿속일까.', '"형… 여기야…" 쫓아가면 아무도 없다.', '"형, 왜 손을 놨어?" …나는 멈춰 선다.'];
  const PORTAL_KINDS = ['rift', 'elevator', 'door'];
  const MON_NAME = { smiler: '미소 짓는 것', crawler: '눈 없는 것', clown: '광대', child: '우는 아이', shade: '꺼진 것' };
  // 괴물별 정체/유래 — 각자 자기만의 이야기 (처음 마주칠 때 한 줄, 시신 메모로 상세)
  const MON_LORE = {
    smiler: { tag: '잡아먹진 않아. 표정을 가져갈 뿐.',
      story: '뭔지는 아무도 모른다. 잡아먹는 게 아니라 마지막 표정을 가져간다고 한다.\n저 하얀 미소는 제 것이 아니다. 가져간 얼굴들을 겹쳐 쓴 거다.\n저게 웃었다면 이미 너를 찾았다는 뜻이다.' },
    crawler: { tag: '소리를 내는 건 뭐든 못 견뎌 해.',
      story: '경비원 레예스라고 한다. 사원증을 아직 목에 걸고 있다.\n어둠 속을 하도 오래 기어 다녀서 눈이 말라붙었다. 대신 귀만 남았다.\n숨소리를 못 견딘다. 살아 있는 소리를.' },
    clown: { tag: '멈추지도, 방향을 틀지도 못해.',
      story: '파티 광대 피트. 12년 동안 맡은 애를 한 번도 잃은 적이 없었다고 한다.\n마지막 날 하나를 잃었다. 그 뒤로 같은 술래잡기를 멈추지 못한다.\n똑바로 달리는 것밖에 모른다. 도는 법도 서는 법도 잊었다.' },
    child: { tag: '혼자 남는 게 무서워 전부 부르는 거야.',
      story: '오지 않는 누군가를 부르면서 운다.\n비명에 악의는 없다. 혼자 남기 싫어서 아무나 붙잡고 부르는 거다.\n문제는 그 소리를 온 층이 듣는다는 거고.' },
    shade: { tag: '빛 속에선 굳어. 어둠이 그것의 다리야.',
      story: '정비공 데일일 거다. 미소 짓는 걸 피해서 너무 오래 어둠에 숨어 있었다.\n어둠이 몸에 뱄다. 이제 빛을 쬐면 그대로 굳는다.\n그래서 안 보이는 데서만 걷는다. 눈을 떼면 그만큼 와 있다.' },
  };
  const RELIC_NAME = { teddy: '낡은 곰인형', balloon: '바람 빠진 풍선', gear: '오르골 태엽', music: '낡은 오르골' };
  // 영혼이 해방되며 속삭이는 단서 (want 순서: teddy, balloon, gear=동생)
  const SPIRIT_LINES = {
    teddy: '"곰돌이다… 고마워 형아. 광대 아저씨가 놀자 그래서, 두고 갔었어." 품에 안고서야 눈을 감는다.',
    balloon: '"풍선 잡으러 갔다가… 문이 닫혔어. 못 나왔어." 아이가 처음으로 웃는다. "노란 우비 애도 있어. 맨날 형 기다려." 그러고는 빛으로 풀어진다.',
    gear: '노란 우비 아이가 고개를 든다. "형, 진짜 왔네." 손끝이 닿자, 목에 걸려 있던 것이 내려간다.',
    music: '숨어 있던 아이가 고개를 든다. "나는 안 울었어. 울어도 아무도 안 오니까." 오르골을 안고 빛으로 풀어진다.',
  };
  // 비밀 경로 — 동생 영혼을 돌처럼 부술 때, 금이 갈 때마다 내뱉는 애원 (충격 연출)
  const BRO_PLEAD = [
    '동생의 빛에 금이 간다. "형…? 아야… 왜 그래, 형."',
    '"형, 나야. 나 좀 봐. 왜 이래…" 빛이 더 흐려지고, 잿빛이 번진다.',
  ];
  // 금단의 속삭임 — 동생 곁에서 정신력이 낮을 때 떠오르는 거짓 자비 (비밀 엔딩 유도)
  const FORBIDDEN_MSGS = [
    '(못 보내겠으면… 차라리 끝내. 부숴서.)',
    '(돌이 되기 전에. 네 손으로.)',
    '(그게 더 자비로운 거야. 던져.)',
    '(어차피 매번 못 놓잖아. 이번엔 다르게 해.)',
  ];
  // 시체를 조사할 때의 도입 묘사 (루프 복선 포함)
  const CORPSE_INTRO = [
    '얼굴 없는 시신이 후드 안에 웅크려 있다.',
    '손에 빈 아몬드 워터 병을 쥔 채 굳었다.',
    '당신과 똑같은 옷을 입고 있다. …우연이겠지.',
    '목에 건 사원증 사진이 긁혀 있다. 그런데 낯이 익다.',
  ];
  const CORPSE_SCARE_INTRO = [
    '눈코입 없던 시신이 — 얼굴을 들었다!',
    '텅 빈 후드에서 비명 같은 얼굴이 솟구쳤다!',
  ];
  // 죽은 자가 남긴 메모: 다급히 갈겨 쓴 쪽지. 정보지만 '경고'처럼 읽히게.
  const CORPSE_MEMOS = [
    [ // L0
      { t: '빛 밖으론 나가지 마. 어둠 속에선 그게 안 보여. 안 보인다고 없는 게 아냐.' },
      { t: '뛰지 마. 발소리를 듣고 와. 천천히 걸어. 사물함, 거기 들어가 숨어.' },
      { t: '돌. 멀리 던져. 소리 나는 쪽으로 가더라. 그때 반대로.' },
      { t: '위로 나가는 길은 없어. 벽이 보랏빛으로 곪은 데, 거길 손으로 벌려.', exit: true },
    ],
    [ // L2(기계실)
      { t: '눈 없는 건 못 봐. 소리만 쫓아. 멈춰. 숨도 멈춰. 그럼 지나가.' },
      { t: '마네킹, 눈 떼지 마. 안 볼 때만 움직여. 똑바로 보면서 지나가.' },
      { t: '아몬드 워터. 발치에 깨뜨려 봐. 잠깐 둔해지더라.' },
      { t: '미소 짓는 게 여기도 있어. 모퉁이에서 기다린다. 돌지 마.' },
      { t: '잿빛 그거, 빛에 닿으면 굳어. 오래 비추면… 아주 굳어 버리더라. 영영.' },
      { t: '불을 켜. 발전기. 어두우면 그게 걸어 다녀.' },
      { t: '잿빛 그것 — 데일이야. 우리 정비반이었어. 빛을 떼지 마, 떼면 걸어와.' },
      { t: '소리로만 기는 놈, 그거 레예스야. 멈춰서 숨 죽이면 못 찾아. 뛰면 끝이고.' },
      { t: '마커스는 좁은 데로만 다녀 — 환기구, 파이프 사이. 넓은 데론 안 나와. 우리랑 같이 야간조였는데.' },
      { t: '퓨즈 못 모으겠으면 — 저 끝 천장 환풍구로 기어 나간 놈도 있다. 어둠을 한참 지나야 해.', hatch: true },
    ],
    [ // L3(놀이방)
      { t: '광대. 옆으로 한 발이면 돼. 똑바로만 달리고 방향을 못 틀어.' },
      { t: '우는 애한테 가지 마. 비명 한 번이면 전부 몰려와.' },
      { t: '울음은 미끼야. 소리를 등지고 와. 절대 쫓아가지 마.' },
      { t: '광대 이름이 피트래. 데려간 애들이 밤새 운다 — 곰인형 든 애, 풍선 든 애. 잃은 걸 손에 쥐여 줬더니 그제야 울음을 그치더라.' },
      { t: '여기 애들은 광대가 잃은 게 아냐 — 잃은 애를 찾겠다고 자꾸 다른 애를 데려온 거지. …나도 누굴 찾으러 왔던 것 같은데.' },
      { t: '나는 안 나가. 문이 열려도. 여기 그 애가 있으니까. 못 보내겠고, 못 떠나겠다. …너도 곧 알게 돼.' },
    ],
  ];
  function pickCorpseMemo(pr) {
    const pool = CORPSE_MEMOS[game.zoneIdx] || CORPSE_MEMOS[0];
    const i = Math.abs((Math.round(pr.x) * 7 + Math.round(pr.y) * 13)) % pool.length;
    return pool[i];
  }
  // 변해가는 시신의 1인칭 단편 — 설명하지 않고, 정황으로 흘린다(보여주기).
  // 무작위 순서로 읽어도 각자 한 조각씩 남는다.
  const CORPSE_TURN_MEMOS = [
    '데일이 사흘째 말이 없다. 손끝이 차고 단단해. 자꾸 불을 끄려 든다.',
    '거울에 내 얼굴이 안 비친다. 손등이 돌처럼 식어 간다. 불빛이 따갑다.',
    '복도 끝의 그것이 내 이름을 부른다. 옛날 사원증을 아직 목에 걸고 있더라.',
    '몇이나 여길 못 나갔을까. 세다가 그만뒀다. …다들 어디 갔나 했더니.',
    '이름은 적지 않겠다. 부르면, 그게 돌아본다.',
    '데일이 결국 어둠으로 걸어 들어갔다. 빛을 대면 굳어 버려서 — 그래서 다들 불을 끈다.',
    '레예스는 이제 소리만 좇아 긴다. 어제까진 나한테 커피 농담을 걸던 사람인데.',
    '먼저 온 우리가 먼저 변한다. 다음은 너고, 그다음은 너를 찾으러 온 누군가다.',
    '마커스가 환기구로 기어들어 갔다. 이젠 좁은 데로만 다닌다. 이름을 불러도 안 돌아본다.',
    '노라는 불 있는 데서만 잔다. 어두워지면 운다. 우리 중 제일 오래 버틴다.',
    '사물함 자물쇠를 내 손이 먼저 푼다. 번호를 안다. …나, 여기서 일했었나.',
  ];
  function pickTurnMemo(pr) {
    const i = Math.abs((Math.round(pr.x) * 5 + Math.round(pr.y) * 11)) % CORPSE_TURN_MEMOS.length;
    return CORPSE_TURN_MEMOS[i];
  }
  // 반쯤 사람인 채 애원하는 변이 시신 — 외면할지, 끝내 줄지(돌). 동생 테마의 '낯선 사람' 예행연습.
  const BEGGING_MEMOS = [
    '반쯤 굳은 손이 네 발목을 잡는다. "불… 좀. 아직 사람일 때, 한 번만."',
    '"끝내 줘. 다 굳기 전에. 부탁이야." 입만 아직 사람이다.',
    '"날 기억해 줄래? …이름이, 이름이 뭐였더라." 그러다 잿빛이 다시 번진다.',
  ];
  function pickBeggingMemo(pr) {
    const i = Math.abs((Math.round(pr.x) * 3 + Math.round(pr.y) * 17)) % BEGGING_MEMOS.length;
    return BEGGING_MEMOS[i];
  }

  // ---------------- 인트로 컷신 (왜 이곳에 왔는가) ----------------
  const INTRO_CARDS = [
    { type: 'news', tag: '시 사회면', date: '— 올해 실종 7건, 경찰 "단서 없음"',
      head: '도심 실종 잇따라… 올해만 7명',
      body: '올해 들어 일곱 번째다. 마지막 모습이 CCTV에 찍힌 뒤 어디에서도 발견되지 않았다. 경찰 관계자는 "동선이 끊기는 지점이 설명되지 않는다"고 말했다.<br>온라인 커뮤니티에서는 이런 실종을 <b>노클립(noclip)</b>이라 부른다. 벽 뒤편으로, 세상 바깥으로 떨어졌다는 뜻이다.' },
    { type: 'mono',
      text: '그날은 동생 생일이었다.<br>놀이방에서 풍선 냄새, 크레용 냄새가 났다.<br>당신은 그 애 손을 잡고 있었다. 휴대폰을 봤다. 몇 초.<br><span class="small">고개를 들었을 때, 손안이 비어 있었다.</span>' },
    { type: 'news', tag: '가족 제보 · 미공개', date: '— 여덟 번째 실종자',
      head: '"바닥이 꺼졌어요" — 지워진 목격담',
      body: '당신은 봤다. 노란 매트가 꺼지고 동생이 그 밑으로 가라앉는 것을. 조서에는 "보호자 진술, 신빙성 낮음"이라고 적혔다.<br>몇 달 뒤, 발신자 없는 음성 메시지가 왔다.<br>"…형, 여기 어두워. 누가 자꾸 같이 놀자 그래. <b>형, 왜 손을 놨어?</b>"' },
    { type: 'mono',
      text: '문 닫은 놀이방은 그대로였다.<br>당신은 그 애가 사라진 노란 매트 위에 선다.<br><span class="small">휴대폰은 차에 두고 왔다.</span>' },
  ];
  let introIdx = 0;
  // 한국어 받침 판별 조사: josa('광대','이','가')='광대가', josa('것','이','가')='것이'
  function josa(word, withJong, noJong) {
    const c = word.charCodeAt(word.length - 1);
    const hasJong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
    return word + (hasJong ? withJong : noJong);
  }

  // ---------------- 게임 상태 ----------------
  const game = BK.game = {
    state: 'title', // title | play | note | pause | cut | jumpscare | dead | win
    zoneIdx: 0,
    world: null, player: null, monsters: [],
    spawnPos: { x: 0, y: 0 },
    cam: { x: 0, y: 0 },
    time: 0, playT: 0,
    sanity: 100, drank: 0, notesRead: 0, loreRead: 0, loreSeen: new Set(), turnRealized: false,
    finale: false,
    msgs: [],
    flavorT: 14, eventT: 18, pressT: 4, manT: 5, pingT: 9, ambT: 3,
    heat: -0.6, safeStreak: 0,
    _nearD: 9999, _nearM: null,
    pingShow: 0, pingTarget: null, pingToldZone: -1,
    throwables: 2, projectile: null, lure: null,
    nearLocker: null, nearInteract: null, peekT: 0, hideHintShown: false,
    stalker: null, stalkerCD: 20, stillT: 0, stalkerBreathT: 0, wallFaceFx: null, fakeStepT: 0,
    carrying: null, spiritFx: null, fuseHeld: 0, powerOn: true,
    almond: 0, almondSplash: null,
    flickerT: 0, lightsOutT: 0, chaseFlick: 0,
    heartT: 0, faceCD: 20, faceFlashT: 0, breathT: 5, forbidT: 10,
    clingT: 0, clingStage: 0, // 엔딩 "같이 남다" — 동생 곁에서 항복하는 시간
    forbiddenSeen: false, combatHintShown: false,
    shadePetrifiedOnce: false, clownDownOnce: false,
    silenceT: 0, fxTimers: [], peripheralCD: 0,
    halluc: null, eyes: null, doppel: null,
    jumpT: 0, jumpMon: 'smiler', readingNote: -1,
    deathCause: '', deathMon: 'smiler',
    cutTimers: [], thoughtTimers: [],
    onSpotted, catchPlayer, childScream,
    onScreen(x, y, m) {
      m = m || 0;
      return x > this.cam.x - m && x < this.cam.x + VW + m &&
             y > this.cam.y - m && y < this.cam.y + VH + m;
    },
  };

  // ---------------- 입력 ----------------
  const keys = new Set();
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    const k = e.key.toLowerCase();
    if (!keys.has(k)) handleKey(k);
    keys.add(k);
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // 모바일 멀티터치: 이동/달리기는 누르는 동안 유지하고, 행동 버튼은 첫 터치에 한 번 실행한다.
  const touchPointers = new Map();
  function releaseTouch(pointerId) {
    const active = touchPointers.get(pointerId);
    if (!active) return;
    touchPointers.delete(pointerId);
    const sameButtonHeld = Array.from(touchPointers.values()).some((v) => v.button === active.button);
    const sameKeyHeld = Array.from(touchPointers.values()).some((v) => v.key === active.key);
    if (!sameButtonHeld) active.button.classList.remove('pressed');
    if (!sameKeyHeld) keys.delete(active.key);
  }
  function releaseAllTouches() {
    for (const pointerId of Array.from(touchPointers.keys())) releaseTouch(pointerId);
  }
  document.querySelectorAll('[data-touch-key]').forEach((button) => {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const key = button.dataset.touchKey;
      if (!key || touchPointers.has(e.pointerId)) return;
      touchPointers.set(e.pointerId, { key, button });
      button.classList.add('pressed');
      try { button.setPointerCapture(e.pointerId); } catch (err) { /* 일부 구형 모바일 브라우저 */ }
      if (!keys.has(key)) handleKey(key);
      keys.add(key);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, (e) => releaseTouch(e.pointerId));
    }
  });
  document.getElementById('mobile-controls').addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('blur', releaseAllTouches);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAllTouches(); });

  // 인트로: 화면 클릭으로도 넘기기
  overlay.addEventListener('click', (e) => {
    if (game.state === 'intro' && !e.target.closest('button')) advanceIntro();
  });

  function handleKey(k) {
    if (k === 'm' && BK.audio.started) {
      toast(BK.audio.toggleMute() ? '음소거' : '음소거 해제');
    }
    if (game.state === 'customize' && (k === 'enter' || k === ' ')) { confirmLook(); return; }
    if (game.state === 'intro' && (k === ' ' || k === 'enter')) { advanceIntro(); return; }
    if (game.state === 'intro' && k === 'escape') { introIdx = INTRO_CARDS.length; advanceIntro(); return; }
    if (game.state === 'note' && (k === 'e' || k === 'enter' || k === 'escape')) { closeNote(); return; }
    if (game.state === 'play') {
      if (k === 'q') { throwItem('rock'); return; }
      if (k === 'g') { throwItem('almond'); return; }
      if (k === 'h') { drinkAlmond(); return; }
      if (k === 'e') { interact(); return; }
    }
    if (k === 'escape') {
      if (game.state === 'play') { game.state = 'pause'; showPause(); }
      else if (game.state === 'pause') { game.state = 'play'; hideOverlay(); }
    }
    if (game.state === 'dead' && k === 'r') zoneRestart();
    if (game.state === 'win' && k === 'r') newGame();
  }

  function inputVec() {
    let x = 0, y = 0;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    return { x, y, run: keys.has('shift') };
  }

  // ---------------- 오버레이 ----------------
  function showOverlay(html) { overlay.innerHTML = html; overlay.classList.remove('hidden'); }
  function hideOverlay() { overlay.classList.add('hidden'); overlay.innerHTML = ''; }

  function showTitle() {
    let shattered = false;
    try { shattered = localStorage.getItem('bk_shatter') === '1'; } catch (e) { /* noop */ }
    // 비밀 엔딩을 한 번 본 사람에게만 보이는 흐릿한 한 줄 (이스터에그)
    const secretLine = shattered
      ? `<div class="t-keys" style="color:#7a2a22;animation:flicker 5s infinite">…손을 놓을 수 없거든, 부수는 법도 있다.</div>`
      : '';
    showOverlay(`
      <div class="box">
        <div class="t-pre">NOCLIP // SURVIVAL HORROR</div>
        <h1 class="t-main">the rooms</h1>
        <button id="btn-start">${shattered ? '다시, 그 안으로' : '동생을 찾으러 간다'}</button>
        <div class="t-keys">
          <span class="desktop-keys">이동 WASD/방향키 · 달리기 Shift · 상호작용/숨기 E<br>
          돌 던지기 Q · 아몬드 워터: 마시기 H / 던지기 G(괴물 약화)<br>
          문을 닫아 막고, 가구를 밀어 봉쇄하고, 돌로 주의를 돌려라 · 음소거 M · 일시정지 ESC</span>
          <span class="mobile-keys">왼쪽 방향 패드로 이동 · R을 함께 누르면 달리기 · E 행동/숨기<br>
          Q 돌 던지기 · H 아몬드 워터 마시기 · G 던져서 괴물 약화</span>
        </div>
        <div class="t-credit">Made with Claude Fable 5</div>
        ${secretLine}
      </div>`);
    document.getElementById('btn-start').addEventListener('click', () => { BK.audio.init(); showCustomize(); });
  }

  // ---------------- 캐릭터 커스터마이징 (헤어 / 의상) ----------------
  function showCustomize() {
    game.state = 'customize';
    const swatches = (items, kind, selIdx) => items.map((it, i) => {
      const col = kind === 'hair' ? (it.cap || it.hair) : it.hood;
      return `<button class="swatch${i === selIdx ? ' sel' : ''}" data-kind="${kind}" data-i="${i}" title="${it.name}" style="background:${col}"></button>`;
    }).join('');
    showOverlay(`
      <div class="box look-box">
        <div class="t-pre">당신은 누구였나</div>
        <h1 class="end-title" style="color:#d8cc8a;margin-bottom:10px">모습을 고른다</h1>
        <canvas id="look-prev" width="120" height="132"></canvas>
        <div class="look-name" id="look-name"></div>
        <div class="look-row"><span class="look-lab">헤어</span><span class="look-sw">${swatches(BK.PLAYER_HAIR, 'hair', playerLook.hair)}</span></div>
        <div class="look-row"><span class="look-lab">의상</span><span class="look-sw">${swatches(BK.PLAYER_OUTFIT, 'outfit', playerLook.outfit)}</span></div>
        <button id="btn-look-go">이 모습으로 떨어진다 [Enter]</button>
      </div>`);

    const prev = document.getElementById('look-prev');
    const px = prev.getContext('2d');
    px.imageSmoothingEnabled = false;
    let dir = 0, frame = 0, tick = 0;
    const dirCycle = [0, 2, 3, 1]; // 앞→옆→뒤→옆 천천히 회전
    function redrawPrev() {
      px.clearRect(0, 0, prev.width, prev.height);
      const spr = BK.assets.player[dir][frame % 4];
      const sc = 7;
      px.drawImage(spr, (prev.width - spr.width * sc) / 2, (prev.height - spr.height * sc) / 2, spr.width * sc, spr.height * sc);
    }
    function nameNow() {
      document.getElementById('look-name').textContent =
        `${BK.PLAYER_HAIR[playerLook.hair].name} · ${BK.PLAYER_OUTFIT[playerLook.outfit].name}`;
    }
    clearInterval(game._lookAnim);
    game._lookAnim = setInterval(() => {
      frame = (frame + 1) % 4;
      tick++;
      if (tick % 6 === 0) dir = dirCycle[(tick / 6 | 0) % dirCycle.length]; // 가끔 방향 전환
      redrawPrev();
    }, 200);
    nameNow(); redrawPrev();

    overlay.querySelectorAll('.swatch').forEach((b) => {
      b.addEventListener('click', () => {
        const kind = b.dataset.kind, i = +b.dataset.i;
        playerLook[kind] = i;
        BK.setPlayerLook(playerLook.hair, playerLook.outfit);
        overlay.querySelectorAll(`.swatch[data-kind="${kind}"]`).forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        nameNow(); redrawPrev();
        BK.audio.pickup();
      });
    });
    document.getElementById('btn-look-go').addEventListener('click', confirmLook);
  }
  function confirmLook() {
    if (game.state !== 'customize') return;
    clearInterval(game._lookAnim);
    saveLook(playerLook);
    showIntro();
  }

  // ---------------- 인트로 시퀀스 ----------------
  function showIntro() {
    game.state = 'intro';
    introIdx = 0;
    renderIntroCard();
  }
  function renderIntroCard() {
    const c = INTRO_CARDS[introIdx];
    const hint = `<div class="skip-hint" id="btn-skip">${touchMode ? '화면 터치 — 넘기기' : '클릭 / SPACE — 넘기기 (ESC 건너뛰기)'}</div>`;
    if (c.type === 'news') {
      showOverlay(`<div class="news">
        <div class="news-tag"><span>${c.tag}</span><span>NOCLIP</span></div>
        <div class="news-head">${c.head}</div>
        <div class="news-body">${c.body}</div>
        <div class="news-date">${c.date}</div>
      </div>${hint}`);
    } else {
      showOverlay(`<div class="cut-mono">${c.text}</div>${hint}`);
    }
  }
  function advanceIntro() {
    introIdx++;
    if (introIdx >= INTRO_CARDS.length) {
      BK.fx.flash('rgba(255,255,255,0.95)', 1.1);
      newGame();
    } else {
      renderIntroCard();
    }
  }

  function showNote(i) {
    game.state = 'note';
    game.readingNote = i;
    showOverlay(`
      <div class="note-box">
        <div class="note-head">누군가의 메모 — ${i + 1}</div>
        <div class="note-body">${NOTE_TEXTS[i]}</div>
        <button id="btn-note">기록을 덮는다 [E]</button>
      </div>`);
    document.getElementById('btn-note').addEventListener('click', closeNote);
  }

  function nextNoteIdxForZone() {
    const baseByZone = [0, 5, 8];
    const base = baseByZone[game.zoneIdx] || 0;
    let readInZone = 0;
    for (const item of game.world.items) {
      if (item.kind === 'note' && item.got) readInZone++;
    }
    return base + readInZone;
  }

  function closeNote() {
    if (game.state !== 'note') return;
    const idx = game.readingNote;
    const wasFirst = idx === 0;
    game.readingNote = -1;
    game.state = 'play';
    hideOverlay();
    game.loreRead++;
    // L0: 첫 기록을 읽으면 미소 짓는 것이 깨어난다
    if (game.zoneIdx === 0 && wasFirst) {
      for (const m of game.monsters) m.active = true;
      BK.audio.thud();
      BK.fx.addShake(2.5);
      toast('멀리서… 무언가가 카펫을 밟는 소리가 들렸다.');
    }
    // L0: 균열 기록(5번째)은 위치 + '깨우기' 단서를 준다 (벌리는 법은 다른 기록/메모에서)
    if (game.zoneIdx === 0 && idx === 4) {
      knowExitLocation('이 기록이 가리킨다 — 벽이 보랏빛으로 곪은 곳. 균열은 출구가 아니라 입이다.');
      learnExitMethod('wake', '기록 끝에 — "힘으로는 안 열렸다. 돌로 쳐서 깨웠더니 그제야 꿈틀하더라."');
    }
    // L0: 모든 기록을 다 모으면 위치도 여는 법도 확실해진다
    if (game.zoneIdx === 0 && questGotCount() >= game.world.cfg.quest.count) {
      knowExitFromAllRecords();
    }
    checkQuest();
    // 다 읽고 덮으면 '현재의 나'의 생각이 하단에 순차적으로 떠오른다
    queueThoughts(NOTE_AFTER[idx]);
  }

  // 하단 문구를 한 줄씩 순차적으로 띄운다 (기록을 덮은 뒤의 생각)
  function queueThoughts(lines) {
    for (const t of game.thoughtTimers) clearTimeout(t);
    game.thoughtTimers = [];
    if (!lines || !lines.length) return;
    lines.forEach((line, i) => {
      const tm = setTimeout(() => {
        if (game.state === 'play' || game.state === 'note') toast(line);
      }, 500 + i * 2800);
      game.thoughtTimers.push(tm);
    });
  }

  function showPause() {
    const controls = touchMode
      ? `왼쪽 방향 패드 이동 · <b style="color:#d8cc8a">R</b> 달리기 <span style="color:#6e6440">(소리 주의)</span><br>
          <b style="color:#d8cc8a">E</b> 행동/숨기 · <b style="color:#d8cc8a">Q</b> 돌 던지기<br>
          아몬드 워터 — <b style="color:#d8cc8a">H</b> 마시기 · <b style="color:#d8cc8a">G</b> 던지기 <span style="color:#6e6440">(둔화)</span><br>
          상단 <b style="color:#d8cc8a">M</b> 음소거 · <b style="color:#d8cc8a">II</b> 일시정지`
      : `이동 <b style="color:#d8cc8a">WASD</b> / 방향키 · 달리기 <b style="color:#d8cc8a">Shift</b> <span style="color:#6e6440">(소리 주의)</span><br>
          상호작용 · 숨기 · 문 · 가구 <b style="color:#d8cc8a">E</b><br>
          돌 던지기 <b style="color:#d8cc8a">Q</b> <span style="color:#6e6440">(소리로 유인)</span><br>
          아몬드 워터 — 마시기 <b style="color:#d8cc8a">H</b> · 던지기 <b style="color:#d8cc8a">G</b> <span style="color:#6e6440">(둔화)</span><br>
          음소거 <b style="color:#d8cc8a">M</b> · 일시정지 <b style="color:#d8cc8a">ESC</b>`;
    showOverlay(`
      <div class="box">
        <h1 class="end-title" style="color:#d8cc8a">일시정지</h1>
        <p class="end-story">${game.world.cfg.name} — ${game.world.cfg.sub}</p>
        <div class="end-stats" style="text-align:left;display:inline-block;margin-bottom:22px">
          ${controls}<br>
          <span style="color:#8a7f4e">어둠 속의 것들은 보이지 않는다 — 소리로 위치를 읽어라.</span>
        </div>
        <br>
        <button id="btn-resume">계속한다</button>
      </div>`);
    document.getElementById('btn-resume').addEventListener('click', () => { game.state = 'play'; hideOverlay(); });
  }

  function fmtTime(t) {
    const m = (t / 60) | 0, s = (t % 60) | 0;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function showDead(cause) {
    let title, story;
    if (cause === 'madness') {
      title = '정신 붕괴';
      story = '어느 순간부터 형광등 소리가 목소리로 들렸다.<br>지금은 그 소리가 편하다.';
    } else {
      const nm = MON_NAME[game.deathMon] || '그것';
      title = josa(nm, '이', '가') + ' 당신을 붙잡았다';
      const lines = {
        smiler: '마지막으로 본 것은 하얀 미소였다.',
        crawler: '뛰지 말았어야 했다. 딸깍 소리가 비명으로 바뀌었다.',
        clown: '피할 수 있었다. 광대는 방향을 못 바꾸니까. 한 발 늦었다.',
        child: '비명에 다리가 굳었다. 그리고 전부 이쪽으로 달려왔다.',
        shade: '불이 깜빡인 건 한순간이었다. 잿빛 손에게는 그거면 충분했다.',
      };
      story = lines[game.deathMon] || lines.smiler;
    }
    // 너를 잡은 것의 이야기 (각 괴물의 유래)
    const lore = (cause !== 'madness' && MON_LORE[game.deathMon]) ? MON_LORE[game.deathMon].story : null;
    showOverlay(`
      <div class="box">
        <h1 class="end-title red">${title}</h1>
        <p class="end-story">${story}</p>
        ${lore ? `<p class="end-story" style="font-size:12px;color:#6e6440;margin-top:10px;white-space:pre-line">${lore}</p>` : ''}
        <div class="end-stats">${game.world.cfg.name} · 버틴 시간 ${fmtTime(game.playT)} · 마신 아몬드 워터 ${game.drank}병</div>
        <div class="btn-row">
          <button id="btn-zone">이 층에서 깨어난다 [R]</button>
          <button id="btn-retry" class="ghost">처음부터</button>
        </div>
      </div>`);
    document.getElementById('btn-zone').addEventListener('click', zoneRestart);
    document.getElementById('btn-retry').addEventListener('click', newGame);
  }

  function showWin() {
    let best = null;
    try {
      best = Number(localStorage.getItem('bk_best')) || null;
      if (!best || game.playT < best) { best = game.playT; localStorage.setItem('bk_best', String(best)); }
    } catch (e) { /* localStorage 사용 불가 환경 */ }
    // 서브 루트 보너스: 숨은 네 번째 아이까지 보냈다면 작별 한 줄이 더해진다
    const fourth = (game.world && game.world.fourthFreed)
      ? '<br><br>울지 않아서 아무도 못 찾았던 아이도, 오르골을 안고 같이 떠났다.'
      : '';
    showOverlay(`
      <div class="box">
        <h1 class="end-title green">손을 놓다</h1>
        <p class="end-story">마지막으로 동생 손을 잡았다. 노란 우비가 천천히 빛으로 풀어졌다.<br>
        "형, 이제 안 무서워." 앞니 빠진 웃음이었다.<br>
        당신은 손에서 힘을 뺐다. 이번에는 놓치는 게 아니라, 놓는 거였다.<br><br>
        문을 지나니 새벽 공기가 차다. 폐점한 놀이방 유리문 밖이 밝아 온다.<br>
        동생은 없다. 오래전부터 없었다. 다만 이번에는 배웅을 했다.${fourth}</p>
        <div class="end-stats">세 영혼을 해방하고 귀환 · 탈출 시간 ${fmtTime(game.playT)}${best ? ` · 최고 기록 ${fmtTime(best)}` : ''}<br>
        남은 정신력 ${Math.round(game.sanity)}% · 마신 아몬드 워터 ${game.drank}병</div>
        <p class="end-story" style="font-size:12px;color:#6e6440;margin-top:14px">
        형광등이 깜빡이면 아직도 흠칫한다.<br>그래도 이제, 놀이방 쪽으로는 차를 돌리지 않는다.</p>
        <button id="btn-again">다시 떨어진다 [R]</button>
      </div>`);
    document.getElementById('btn-again').addEventListener('click', newGame);
  }

  // 비밀 엔딩 화면 — 동생을 부숴 끝낸 자
  function showShatterEnd() {
    game.state = 'win';
    game.finale = false;
    BK.audio.setDread(0); BK.audio.setExitStatic(0); BK.audio.setTension(0); BK.audio.setChase(0, 0); BK.audio.setCrisis(0);
    BK.audio.zone(-1); // 모든 앰비언스 정지 — 죽은 듯한 정적
    BK.audio.madness();
    BK.fx.flash('rgba(40,0,0,0.9)', 1.2);
    try { localStorage.setItem('bk_shatter', '1'); } catch (e) { /* noop */ }
    showOverlay(`
      <div class="box">
        <h1 class="end-title shatter">동생을 깨뜨리다</h1>
        <p class="end-story">마지막 금이 갈 때 그 애가 올려다봤다. 원망하는 눈이 아니었다.<br>
        "형, 괜찮아. 이제 안 와도 돼." 그리고 잿빛으로 부서졌다.<br><br>
        노란 우비 조각 하나를 주머니에 넣었다. 손은 떨리지 않았다.<br>
        붙잡을 게 없어진 사람을 여기 가둬 둘 수는 없다. 벽이 비켜선다.</p>
        <p class="end-story" style="color:#c84a3a">너는 걸어 나간다. 다시는 여기 떨어지지 않을 거다.<br>
        잃은 사람은 찾으러 돌아오지만, 끝낸 사람은 돌아올 이유가 없으니까.</p>
        <div class="end-stats">∎ 비밀 엔딩 · 손수 끝낸 시간 ${fmtTime(game.playT)} · 남은 정신력 ${Math.round(game.sanity)}%<br>
        루프 종료. 용서는 없음.</div>
        <p class="end-story" style="font-size:12px;color:#6e6440;margin-top:14px">
        집에 돌아온 첫 밤, 거울 속에서 네가 웃고 있었다. 앞니 빠진 웃음이었다.</p>
        <button id="btn-again">다시 떨어진다 [R]</button>
      </div>`);
    document.getElementById('btn-again').addEventListener('click', newGame);
  }

  // ===== 엔딩 "같이 남다" — 끝내 놓지 못하고 그 곁에 남아 '먼저 온 우리'가 된다 =====
  function stayEnding(bro) {
    game.state = 'cut';
    if (bro) bro.freed = true; // 더는 추격/상호작용 대상이 아님 (해방이 아니라, 그저 곁에)
    BK.audio.setChase(0, 0); BK.audio.setDread(0); BK.audio.setTension(0); BK.audio.setCrisis(0);
    BK.audio.duck(0.05, 1.2, 1.6); // 천천히 잦아드는 정적
    BK.fx.flash('rgba(20,28,40,0.7)', 1.0);
    BK.fx.addShake(2);
    toast('…일어설 수가 없다. 너는 그 애 곁에 주저앉는다.');
    for (const t of game.cutTimers) clearTimeout(t);
    game.cutTimers = [setTimeout(() => { if (game.state === 'cut') showStayEnd(); }, 2100)];
  }
  function showStayEnd() {
    game.state = 'win';
    game.finale = false;
    BK.audio.setDread(0); BK.audio.setExitStatic(0); BK.audio.setTension(0); BK.audio.setChase(0, 0); BK.audio.setCrisis(0);
    BK.audio.zone(-1); // 모든 앰비언스 정지 — 죽은 듯한 정적
    try { localStorage.setItem('bk_stay', '1'); } catch (e) { /* noop */ }
    showOverlay(`
      <div class="box">
        <h1 class="end-title" style="color:#9ab0c8;text-shadow:0 0 16px rgba(154,176,200,0.5)">같이 남다</h1>
        <p class="end-story">어디선가 문이 열렸다 닫히는 소리가 났다. 너는 안 갔다.<br>
        "형… 안 가?" ${BRO_NAME}가 물었다. 고개를 저었다. 그거면 됐다.<br><br>
        그 애의 빛이 천천히 잦아들고, 네 손끝부터 잿빛으로 식는다.<br>
        복도 끝에서 벽이 닫힌다. 이상하게 춥지가 않다.</p>
        <p class="end-story" style="color:#9ab0c8">언젠가 또 누가 여기로 떨어질 거다.<br>
        형광등 아래서 네 옷을 입은 잿빛 형체를 볼 거다. 그 옆에 작은 것 하나와, 나란히.</p>
        <div class="end-stats">∎ 엔딩 · 끝내 놓지 못한 시간 ${fmtTime(game.playT)}<br>
        루프 종료. 남는 쪽을 골랐다.</div>
        <button id="btn-again">다시 떨어진다 [R]</button>
      </div>`);
    document.getElementById('btn-again').addEventListener('click', newGame);
  }

  function zoneCardHTML(cfg) {
    return `<div class="box zone-card">
      <div class="t-pre">${cfg.name}</div>
      <h1 class="t-main" style="font-size:42px">${cfg.sub}</h1>
    </div>`;
  }

  // ---------------- 월드 구성 ----------------
  function buildZoneWorld(zoneIdx, seed) {
    const world = BK.makeWorld(seed, zoneIdx);
    const ch0 = BK.getChunk(world, 0, 0);
    let spawn = ch0.floorCells[0], bd = 1e9;
    for (const c of ch0.floorCells) {
      const d = Math.hypot(c.x - 12, c.y - 12);
      if (d < bd) { bd = d; spawn = c; }
    }
    game.spawnPos = { x: spawn.x * T + T / 2, y: spawn.y * T + T / 2 };
    // 스폰 칸 주변은 막히지 않게 (문/가구에 갇히는 사고 방지)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) BK.setBlocker(world, spawn.x + dx, spawn.y + dy, false);

    function placeRing(kind, rings, extras) {
      rings.forEach((r, i) => {
        const a = BK.hash01(world.seed, 91 + i, kind.length * 7, 13) * Math.PI * 2 + i * 2.39996;
        let cx = Math.round(Math.cos(a) * r), cy = Math.round(Math.sin(a) * r);
        if (cx === 0 && cy === 0) cx = 1;
        const item = { id: kind + i, kind, cx, cy };
        const ex = extras ? extras[i] : undefined;
        if (ex != null) { if (typeof ex === 'object') Object.assign(item, ex); else item.noteIdx = ex; }
        BK.addPendingItem(world, item);
      });
    }
    // 진행 빠르게: 가까운 링에 배치
    if (zoneIdx === 0) {
      placeRing('note', [1, 1, 2, 2, 3], [0, 1, 2, 3, 4]);
      // 균열(출구) — 처음부터 휴면 상태로 존재한다. 위치/여는 법은 지식을 얻어야 안다.
      const C = BK.CHUNK;
      const ea = BK.hash01(world.seed, 7, 3, 11) * Math.PI * 2;
      let ecx = Math.round(Math.cos(ea) * 2) || 2, ecy = Math.round(Math.sin(ea) * 2);
      if (ecx === 0 && ecy === 0) ecx = 2;
      const ech = BK.getChunk(world, ecx, ecy);
      const ecell = ech.floorCells[BK.hashCoords(world.seed, ecx, ecy, 77) % ech.floorCells.length];
      world.exit = {
        kind: 'exit', x: (ecx * C + ecell.x) * T + T / 2, y: (ecy * C + ecell.y) * T + T / 2,
        opened: false, awakeT: 0, // awakeT: 돌로 깨운 직후 '벌릴 수 있는' 창
      };
      world.exitLocKnown = false;   // 위치를 아는가
      // 여는 법 = 2단계 의식. 각 단계를 따로 알게 되고, 기록을 전부 모으면 확신한다.
      world.exitWakeKnown = false;  // 1) 돌로 쳐서 깨운다
      world.exitPryKnown = false;   // 2) 깨어난 직후 손으로 벌린다
      world.exitMethodSure = false; // 모든 기록으로 전 과정+타이밍을 확신했는가
      world.exitBit = false;        // 맨몸으로 손대다 물린 적이 있는가 (서브 루트)
    } else if (zoneIdx === 1) {
      placeRing('fuse', [1, 1, 2]);
      placeRing('note', [1, 2, 2], [5, 6, 7]);
      // 분전반 — 원점에서 한 청크 떨어진 곳 (퓨즈를 가져와 설치)
      const fcx = 1, fcy = 0, fch = BK.getChunk(world, fcx, fcy);
      const fcell = fch.floorCells[BK.hashCoords(world.seed, fcx, fcy, 80) % fch.floorCells.length];
      world.fusebox = { x: (fcx * BK.CHUNK + fcell.x) * T + T / 2, y: (fcy * BK.CHUNK + fcell.y) * T + T / 2, installed: 0 };
      // 서브 루트: 비상 해치 — 발전기 없이도 어둠을 가로질러 빠져나가는 위험한 길 (멀리·깊은 어둠)
      const ha = BK.hash01(world.seed, 13, 5, 23) * Math.PI * 2;
      let hcx = Math.round(Math.cos(ha) * 3) || 3, hcy = Math.round(Math.sin(ha) * 3);
      if (hcx === 0 && hcy === 0) hcx = 3;
      const hch = BK.getChunk(world, hcx, hcy);
      const hcell = hch.floorCells[BK.hashCoords(world.seed, hcx, hcy, 88) % hch.floorCells.length];
      world.hatch = { kind: 'hatch', x: (hcx * BK.CHUNK + hcell.x) * T + T / 2, y: (hcy * BK.CHUNK + hcell.y) * T + T / 2 };
      world.hatchKnown = false;
    } else {
      // L3: 기록 + 유물 3종 + 아이 영혼 3 (영혼 해방이 목표)
      placeRing('note', [1, 2, 2], [8, 9, 10]);
      placeRing('relic', [2, 3, 2], [{ relicType: 'teddy' }, { relicType: 'balloon' }, { relicType: 'gear' }]);
      const C = BK.CHUNK, wants = ['teddy', 'balloon', 'gear'], sAng = [0.5, 2.6, 4.5];
      world.spirits = [];
      [1, 2, 3].forEach((r, i) => {
        let cx = Math.round(Math.cos(sAng[i]) * r), cy = Math.round(Math.sin(sAng[i]) * r);
        if (cx === 0 && cy === 0) cx = 1;
        const ch = BK.getChunk(world, cx, cy);
        const cell = ch.floorCells[BK.hashCoords(world.seed, cx, cy, 50 + i) % ch.floorCells.length];
        world.spirits.push({
          x: (cx * C + cell.x) * T + T / 2, y: (cy * C + cell.y) * T + T / 2,
          want: wants[i], freed: false, isBrother: i === 2, bob: i * 2.1, cryT: 6 + i,
          cracks: 0, shattered: false, // 비밀 엔딩: 동생 영혼은 돌처럼 깨뜨릴 수 있다
        });
      });
      // 서브 루트: 숨은 네 번째 아이 — 울지 않고 멀리 숨은 영혼(선택). 메인 3과 무관하게 보너스.
      placeRing('relic', [4], [{ relicType: 'music' }]); // 멀리 떨어진 오르골
      {
        const a4 = BK.hash01(world.seed, 33, 7, 19) * Math.PI * 2 + 2.0;
        let scx = Math.round(Math.cos(a4) * 4) || 4, scy = Math.round(Math.sin(a4) * 4);
        const sch = BK.getChunk(world, scx, scy);
        const scell = sch.floorCells[BK.hashCoords(world.seed, scx, scy, 62) % sch.floorCells.length];
        world.spirits.push({
          x: (scx * C + scell.x) * T + T / 2, y: (scy * C + scell.y) * T + T / 2,
          want: 'music', freed: false, isBrother: false, hidden4: true, bob: 5.0, cryT: 9999,
          cracks: 0, shattered: false, // 안 운다(미끼 아님). 메인 카운트에서 제외된다.
        });
      }
    }
    return world;
  }

  function spawnMonsters(zoneIdx) {
    game.monsters = [];
    const kinds = BK.ZONES[zoneIdx].monsters;
    let ringMin = 360;
    for (const kind of kinds) {
      const es = BK.randomFloorNear(game.world, game.spawnPos.x, game.spawnPos.y, ringMin, ringMin + 220, 90)
        || { x: game.spawnPos.x + ringMin, y: game.spawnPos.y };
      const m = new BK.Monster(kind, es.x, es.y);
      m.active = zoneIdx > 0; // L0은 첫 기록을 읽을 때까지 잠잠
      game.monsters.push(m);
      ringMin += 120;
    }
  }

  function enterZone(zoneIdx) {
    game.zoneIdx = zoneIdx;
    game.world = buildZoneWorld(zoneIdx, ((Math.random() * 0xffffffff) >>> 0));
    game.player = new BK.Player(game.spawnPos.x, game.spawnPos.y);
    spawnMonsters(zoneIdx);
    game.cam.x = game.player.x - VW / 2;
    game.cam.y = game.player.y - VH / 2;
    game.finale = false;
    game.fuseHeld = 0;
    game.powerOn = (zoneIdx !== 1); // 기계실은 정전 상태로 시작 (발전기를 켜야 함)
    game.msgs = [];
    game.flavorT = 16; game.eventT = 18; game.pingT = 8; game.pingShow = 0;
    game.heat = -0.6; game.safeStreak = 0; // 공포 디렉터 — 구역 시작은 평온 골짜기에서
    game.shadePetrifiedOnce = false; game.clownDownOnce = false; // 서브 루트 알림 1회 플래그
    game.peripheralCD = 0; // 주변 '깜빡' 비주얼 공유 쿨다운
    game.breathT = 5; game.forbidT = 10; game.clingT = 0; game.clingStage = 0;
    game.flickerT = 0; game.lightsOutT = 0; game.chaseFlick = 0;
    game.halluc = null; game.eyes = null; game.doppel = null;
    game.projectile = null; game.lure = null;
    game.nearLocker = null; game.nearInteract = null; game.peekT = 0;
    game.stalker = null; game.stalkerCD = 20; game.stillT = 0; game.wallFaceFx = null;
    game.carrying = null; game.spiritFx = null; game.almondSplash = null;
    for (const t of game.thoughtTimers) clearTimeout(t);
    game.thoughtTimers = [];
    for (const t of game.fxTimers) clearTimeout(t);
    game.fxTimers = []; game.silenceT = 0;
    BK.audio.setDread(0); BK.audio.setExitStatic(0); BK.audio.setTension(0);
    BK.audio.setChase(0, 0); BK.audio.setCrisis(0);
    BK.audio.zone(zoneIdx);
  }

  function newGame() {
    for (const t of game.cutTimers) clearTimeout(t);
    game.cutTimers = [];
    game.playT = 0; game.sanity = 100; game.drank = 0; game.notesRead = 0; game.loreRead = 0;
    game.loreSeen = new Set();
    game.turnRealized = false; game.beggedSeen = false;
    game.forbiddenSeen = false; game.combatHintShown = false;
    game.pingToldZone = -1;
    game.throwables = 2; game.almond = 0;
    game.hideHintShown = false;
    enterZone(0);
    game.state = 'play';
    hideOverlay();
    BK.fx.flash('rgba(255,255,255,0.9)', 1);
    BK.fx.addShake(4);
    if (BK.audio.started) BK.audio.thud();
    toast('…노란 매트 아래로 떨어졌다. 그 애가 사라진 그 안쪽.');
    setTimeout(() => { if (game.state === 'play' && game.zoneIdx === 0) toast('어느 쪽을 봐도 똑같은 방이다. 먼저 지나간 사람 흔적부터 찾자.'); }, 3500);
  }

  // 같은 층에서 부활 — 수집한 것은 유지, 정신력 패널티
  function zoneRestart() {
    if (!game.world) { newGame(); return; }
    game.player = new BK.Player(game.spawnPos.x, game.spawnPos.y);
    spawnMonsters(game.zoneIdx);
    for (const m of game.monsters) m.active = true;
    game.cam.x = game.player.x - VW / 2;
    game.cam.y = game.player.y - VH / 2;
    game.sanity = 60;
    game.chaseFlick = 0; game.lightsOutT = 0;
    game.state = 'play';
    hideOverlay();
    BK.audio.setDread(0); BK.audio.setChase(0, 0);
    BK.audio.zone(game.zoneIdx);
    BK.fx.flash('rgba(255,255,255,0.8)', 0.9);
    toast('…눈을 뜨자, 여전히 여기다.');
    if (game.world.brotherRevealPending && !game.world.brotherRevealSeen) {
      scheduleBrotherReveal(350);
    }
  }

  // ---------------- 구역 전환 연출 ----------------
  function runCards(cards, done) {
    game.state = 'cut';
    let delay = 0;
    for (const c of cards) {
      game.cutTimers.push(setTimeout(() => showOverlay(c.html), delay));
      delay += c.ms;
    }
    game.cutTimers.push(setTimeout(() => { hideOverlay(); done(); }, delay));
  }

  function portalTouched(kind) {
    BK.audio.setExitStatic(0);
    BK.audio.setChase(0, 0);
    if (kind === 'rift') {
      game.faceFlashT = 0.18;
      game.jumpMon = 'smiler';
      BK.audio.duck(0.06, 0.05, 0.9);
      BK.audio.riftTrap();
      BK.fx.addShake(7);
      runCards([
        { html: `<div class="box"><h1 class="end-title red">그것은 출구가 아니었다</h1><p class="end-story">균열은 문이 아니라 입이었다.<br>바닥이 사라지고, 당신은 더 깊이 떨어진다.</p></div>`, ms: 3200 },
        { html: zoneCardHTML(BK.ZONES[1]), ms: 2400 },
      ], () => {
        enterZone(1);
        game.sanity = Math.max(15, game.sanity - 12);
        game.state = 'play';
        BK.fx.flash('rgba(180,40,30,0.5)', 0.8);
        toast('공기가 무겁다. 기름과 녹 냄새.');
        setTimeout(() => { if (game.state === 'play') toast('칠흑이다. 발전기가 죽었다. 불을 못 살리면 여기서 못 나간다.'); }, 3500);
        setTimeout(() => { if (game.state === 'play') toast('어둠 속에 잿빛 형체가 서 있다. 빛을 비추면 굳는다. 눈을 떼면 안 된다.'); }, 6500);
      });
    } else if (kind === 'elevator') {
      BK.audio.elevatorRide();
      runCards([
        { html: `<div class="box"><p class="end-story" style="font-size:17px">화물 엘리베이터가 덜컹이며 움직인다.<br>위로… 위로?</p></div>`, ms: 3400 },
        { html: zoneCardHTML(BK.ZONES[2]), ms: 2400 },
      ], () => {
        enterZone(2);
        game.state = 'play';
        BK.fx.flash('rgba(255,235,225,0.6)', 0.7);
        toast('…여긴 그 놀이방이다. 그런데 그 놀이방이 아니다.');
        setTimeout(() => { if (game.state === 'play') toast('벽 너머에서 애들이 흐느낀다. 뭘 찾아 달라는 것 같다.'); }, 3500);
      });
    } else if (kind === 'hatch') {
      // 서브 루트: 비상 해치 — 발전기 없이 어둠을 가로질러 기어 나가는 길. 험한 만큼 대가가 크다.
      BK.audio.elevatorRide();
      runCards([
        { html: `<div class="box"><p class="end-story" style="font-size:17px">좁은 환풍구를 기어간다. 출구라고 부를 만한 게 아니다.<br>철판 모서리에 손바닥이 베인다.</p></div>`, ms: 3400 },
        { html: zoneCardHTML(BK.ZONES[2]), ms: 2400 },
      ], () => {
        enterZone(2);
        game.sanity = Math.max(22, game.sanity - 14); // 험한 길의 대가(어둠 횡단 자체가 이미 큰 비용 — 도착이 즉사로 이어지지 않게 완화)
        game.state = 'play';
        BK.fx.flash('rgba(40,40,55,0.6)', 0.7);
        toast('기어 나와 보니 여기도 놀이방이다. 더 어둡고 조용할 뿐.');
      });
    } else if (kind === 'door') {
      winGame();
    }
  }

  // ---------------- 퀘스트 ----------------
  function questGotCount() {
    const k = game.world.cfg.quest.kind;
    if (k === 'spirit') {
      let n = 0;
      for (const s of (game.world.spirits || [])) if (s.freed && !s.shattered && !s.hidden4) n++;
      return n;
    }
    if (k === 'fuse') return game.world.fusebox ? game.world.fusebox.installed : 0;
    let n = 0;
    for (const it of game.world.items) if (it.kind === k && it.got) n++;
    return n;
  }

  // L0 출구(균열) 지식 — 위치/여는 법을 분리해서 안다.
  // 위치: 여러 경로(메모·괴물·균열 기록)로 알 수 있고, 모든 기록을 모으면 확실하다.
  function knowExitLocation(msg) {
    const w = game.world;
    if (game.zoneIdx !== 0 || !w.exit || w.exitLocKnown) return;
    w.exitLocKnown = true;
    BK.audio.buzz();
    BK.fx.flash('rgba(164,78,224,0.22)', 0.5);
    toast(msg || '저 끝에서 보랏빛이 지직거린다. 저거다.');
  }
  // 서브 루트(L2): 비상 해치의 존재/위치를 알게 된다
  function knowHatch(msg) {
    const w = game.world;
    if (game.zoneIdx !== 1 || !w.hatch || w.hatchKnown) return;
    w.hatchKnown = true;
    BK.audio.buzz();
    toast(msg || '메모 — "퓨즈고 뭐고, 천장 환풍구로 기어 나간 놈도 있다더라. 어둠을 한참 지나야 하지만."');
  }
  // 여는 법 단계를 하나씩 알게 된다 (서브 루트). 단계를 알아도 '확신'은 아니다.
  // part: 'wake'(돌로 깨운다) | 'pry'(깨어난 직후 벌린다)
  function learnExitMethod(part, msg) {
    const w = game.world;
    if (game.zoneIdx !== 0 || !w.exit) return;
    let gained = false;
    if (part === 'wake' && !w.exitWakeKnown) { w.exitWakeKnown = true; gained = true; }
    else if (part === 'pry' && !w.exitPryKnown) { w.exitPryKnown = true; gained = true; }
    if (gained && msg) toast(msg);
  }
  // 모든 기록을 다 읽으면 위치도, 여는 법 전 과정도 확실해진다 (메인 루트의 보상)
  function knowExitFromAllRecords() {
    const w = game.world;
    if (game.zoneIdx !== 0 || !w.exit) return;
    knowExitLocation('기록들이 한 점을 가리킨다 — 가장 깊은 어둠, 벽이 보랏빛으로 곪은 자리.');
    w.exitWakeKnown = true; w.exitPryKnown = true;
    if (!w.exitMethodSure) {
      w.exitMethodSure = true;
      toast('이제 알겠다. 돌로 쳐서 깨우고, 꿈틀할 때 손을 넣어 벌린다. 망설이면 다물린다.');
    }
  }
  // 깨어난 균열을 벌려 활성 포털로 (이후 닿으면 함정처럼 더 깊이 떨어진다)
  function openRift() {
    const w = game.world;
    if (!w.exit || w.exit.opened) return;
    w.exit.opened = true; w.exit.awakeT = 0;
    w.portal = { kind: 'rift', x: w.exit.x, y: w.exit.y };
    BK.audio.buzz(); BK.fx.addShake(3); BK.fx.flash('rgba(164,78,224,0.3)', 0.6);
    toast('상처가 입을 벌린다. 보랏빛이 새어 나온다.');
  }
  // 돌은 착지점뿐 아니라 비행 경로에서도 균열을 맞힐 수 있어야 한다.
  function tryWakeRiftAt(x, y) {
    const w = game.world;
    if (game.zoneIdx !== 0 || !w.exit || w.exit.opened || w.exit.awakeT > 0 ||
        Math.hypot(w.exit.x - x, w.exit.y - y) >= 22) return false;
    w.exit.awakeT = 5;
    BK.audio.buzz(); BK.fx.addShake(2); BK.fx.flash('rgba(164,78,224,0.28)', 0.5);
    if (w.exitPryKnown || w.exitMethodSure) toast('돌에 맞은 상처가 꿈틀, 벌어지려 한다. 지금이다 — 손을 넣어 벌려라(E)!');
    else if (w.exitWakeKnown) toast('상처가 반응한다. 꿈틀거린다. 지금 뭔가 해야 한다(E).');
    else { knowExitLocation('던진 돌이 벽의 상처에 맞자 — 지직, 꿈틀. 이게… 깨우는 건가.'); learnExitMethod('wake'); }
    return true;
  }
  // 깨우지 않고 맨몸으로 손대면 — 그것이 문다 (서브 루트: 그 대가로 '깨우기'를 깨닫는다)
  function biteRift() {
    const w = game.world;
    BK.audio.stingShort(); BK.fx.addShake(3); BK.fx.flash('rgba(160,30,40,0.32)', 0.5);
    game.sanity = Math.max(1, game.sanity - 8);
    w.exitBit = true;
    toast('상처에 손을 넣자마자 물렸다. 손등에 피가 맺힌다.');
    if (!w.exitWakeKnown) {
      learnExitMethod('wake');
      setTimeout(() => { if (game.state === 'play') toast('억지로는 안 열린다. 먼저 깨워야 하나. 뭔가로 쳐서.'); }, 1400);
    }
  }

  function checkQuest() {
    const w = game.world, cfg = w.cfg;
    if (game.zoneIdx === 0) return; // L0는 휴면 균열을 직접 찾아 벌린다 (자동 개방 없음)
    if (w.portal || w.portalPending) return;
    if (questGotCount() < cfg.quest.count) return;
    const P = BK.CHUNK_PX;
    const pcx = Math.floor(game.player.x / P), pcy = Math.floor(game.player.y / P);
    const a = Math.random() * Math.PI * 2;
    const cx = pcx + (Math.round(Math.cos(a) * 2) || 2); // 2청크 거리(진행 빠르게)
    const cy = pcy + Math.round(Math.sin(a) * 2);
    BK.spawnPortal(w, PORTAL_KINDS[game.zoneIdx], cx, cy);
    BK.audio.buzz();
    if (game.zoneIdx === 0) {
      toast('어딘가에서 현실의 균열이 열렸다. 지직거리는 소리를 따라가라.');
      BK.fx.flash('rgba(164,78,224,0.25)', 0.5);
    } else if (game.zoneIdx === 1) {
      toast('저 멀리 어딘가, 엘리베이터 표시등에 불이 들어왔다.');
      BK.fx.flash('rgba(200,220,255,0.2)', 0.4);
    } else {
      game.finale = true;
      for (const m of game.monsters) m.active = true;
      BK.audio.setTension(1);
      BK.audio.stingShort();
      BK.fx.flash('rgba(255,40,30,0.3)', 0.7);
      BK.fx.addShake(4);
      toast('마지막 아이가 빛으로 흩어진다. 어디선가 문이 열리는 소리.');
      setTimeout(() => { if (game.state === 'play') toast('등 뒤에서 광대의 웃음이 찢어진다. 돌아보지 마. 달려.'); }, 1800);
    }
  }

  // ---------------- 메시지/콜백 ----------------
  function toast(text) {
    game.msgs.push({ text, t: 5 });
    if (game.msgs.length > 3) game.msgs.shift();
  }

  // 정적을 무기로 — 큰 한 방(조명 소멸·점프스케어) 직전, 앰비언스/음악 베드를 완전히
  // 죽이고 '공백'을 둔 뒤 친다. 정적 뒤의 충격이 훨씬 세게 박힌다. 드물게만 써야 효과가 산다.
  function strikeAfterSilence(hold, fn) {
    const z0 = game.zoneIdx;
    game.silenceT = hold + 0.2;        // 이 동안 환경음 스케줄러·분위기 멘트를 멈춘다
    BK.audio.duck(0, hold, 0.35);      // 지속 베드(드론·음악·이명)도 0으로 — 진짜 침묵
    const tm = setTimeout(() => {
      if (game.state === 'play' && game.zoneIdx === z0) fn();
    }, hold * 1000);
    game.fxTimers.push(tm);
  }

  function onSpotted(mon) {
    const nm = mon ? MON_NAME[mon.kind] : '그것';
    if (mon && mon.kind === 'clown') {
      BK.audio.stingShort();
      toast(`${josa(nm, '이', '가')} 웃음을 멈췄다 — 옆으로 피해!`);
    } else if (mon && mon.kind === 'crawler') {
      BK.audio.sting();
      toast(`${josa(nm, '이', '가')} 네 소리를 들었다 — 멈춰서 숨을 죽여라!`);
    } else if (mon && mon.kind === 'shade') {
      BK.audio.sting();
      toast(`${josa(nm, '이', '가')} 어둠 속에서 다가온다 — 빛에서 눈을 떼지 마라!`);
    } else {
      BK.audio.sting();
      toast(`${josa(nm, '이', '가')} 당신을 보았다 — 도망쳐!`);
    }
    BK.fx.flash('rgba(255,30,20,0.22)', 0.6);
    BK.fx.addShake(3);
    // 처음 마주치는 괴물이면 그 정체를 한 줄 일러 준다 (각자의 이야기)
    if (mon && MON_LORE[mon.kind] && !game.loreSeen.has(mon.kind)) {
      game.loreSeen.add(mon.kind);
      setTimeout(() => { if (game.state === 'play') toast(`[${nm}] ${MON_LORE[mon.kind].tag}`); }, 1100);
    }
    // 처음으로 추격당하면 생존 동사를 한 번 일러 준다 (조작 재안내)
    if (!game.combatHintShown) {
      game.combatHintShown = true;
      const hint = touchMode
        ? '[조작] Q 돌로 유인 · E 행동으로 숨기 · R을 누른 채 이동해 달리기'
        : '[조작] Q 돌 던져 유인 · E 사물함에 숨기 · Shift 달리기';
      setTimeout(() => { if (game.state === 'play') toast(hint); }, 2300);
    }
    // L0: 그것이 나타난 끝에서 균열이 보인다 — 괴물이 출구 위치 + '깨우기' 힌트를 흘린다
    if (game.zoneIdx === 0) {
      knowExitLocation('그것이 나타난 저 끝 — 벽이 보랏빛으로 곪아 있다. 저게 나가는 길인가.');
      learnExitMethod('wake', '그것이 지나며 벽의 상처를 긁자 — 상처가 꿈틀했다. 충격에 반응하는 건가.');
    }
  }

  function catchPlayer(mon) {
    if (game.state !== 'play') return;
    game.state = 'jumpscare';
    game.jumpT = 0;
    game.jumpMon = mon ? mon.kind : 'smiler';
    game.deathMon = game.jumpMon;
    game.jumpCrackPlayed = false;
    game.jumpGorePlayed = false;
    // 점프스케어용 핏방울/균열 — 결정적으로 미리 생성
    const W = canvas.width, H = canvas.height;
    game.jumpBlood = [];
    for (let i = 0; i < 46; i++) {
      const edge = Math.random();
      let x, y;
      if (i < 16) { x = W / 2 + (Math.random() - 0.5) * 220; y = H / 2 + Math.random() * 60; } // 입에서
      else if (edge < 0.5) { x = Math.random() * W; y = Math.random() < 0.5 ? Math.random() * 80 : H - Math.random() * 80; }
      else { x = Math.random() < 0.5 ? Math.random() * 80 : W - Math.random() * 80; y = Math.random() * H; }
      game.jumpBlood.push({ x, y, r: 6 + Math.random() * 46, delay: Math.random() * 0.5, drip: Math.random() * 60 });
    }
    game.jumpCracks = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
      const segs = [];
      let x = W / 2, y = H / 2, ang = a;
      const n = 4 + ((Math.random() * 4) | 0);
      for (let s = 0; s < n; s++) {
        ang += (Math.random() - 0.5) * 0.8;
        const len = 40 + Math.random() * 90;
        x += Math.cos(ang) * len; y += Math.sin(ang) * len;
        segs.push({ x, y });
      }
      game.jumpCracks.push(segs);
    }
    BK.audio.duck(0.04, 0.02, 0.5); // 숨 멎는 정적 — 비명이 그 위로 터진다
    BK.audio.scream();
    BK.fx.addShake(10);
  }

  // ---------------- 상호작용: 던지기 / 숨기 / 문 / 가구 밀기 ----------------
  const DIRV = [[0, 1], [-1, 0], [1, 0], [0, -1]]; // 0하 1좌 2우 3상

  function throwItem(type) {
    const p = game.player;
    if (p.hidden) return;
    if (type === 'rock') {
      if (game.throwables <= 0) { toast('던질 돌이 없다.'); return; }
      game.throwables--;
    } else {
      if (game.almond <= 0) { toast('던질 아몬드 워터가 없다.'); return; }
      game.almond--;
    }
    const dv = DIRV[p.dir];
    game.projectile = { x: p.x, y: p.y - 6, vx: dv[0] * 230, vy: dv[1] * 230, life: 0.85, type };
    BK.audio.throwWhoosh(BK.clamp(dv[0], -1, 1) * 0.35);
  }

  // 아몬드 워터 마시기 — 정신력/스태미나 회복
  function drinkAlmond() {
    if (game.player.hidden) return;
    if (game.almond <= 0) { toast('아몬드 워터가 없다.'); return; }
    game.almond--; game.drank++;
    game.sanity = Math.min(100, game.sanity + 28);
    game.player.stamina = 100;
    BK.audio.drink();
    toast('아몬드 워터를 마셨다. 머리가 맑아진다.');
  }

  // E: 상황에 맞는 상호작용 (숨기 > 문 > 가구 밀기 우선순위는 nearInteract로 결정)
  function interact() {
    const p = game.player;
    if (p.hidden) { p.hidden = false; game.peekT = 0; BK.audio.lockerMove(); return; }
    const it = game.nearInteract;
    if (!it) return;
    if (it.kind === 'exit') { // L0 균열 — 깨우고(돌) → 벌린다(E)
      const w0 = game.world, ex = w0.exit;
      if (ex.awakeT > 0) { openRift(); return; } // 깨어난 찰나 → 벌리면 열린다
      if (w0.exitWakeKnown || w0.exitMethodSure) {
        // 깨우는 법은 안다 → 물지 않고 일러만 준다
        toast(w0.exitPryKnown || w0.exitMethodSure
          ? '상처가 닫혀 있다 — 돌(Q)을 던져 깨운 뒤, 꿈틀하는 찰나에 벌려라.'
          : '상처가 단단하다 — 먼저 돌(Q)을 던져 깨워야 할 것 같다.');
        return;
      }
      if (w0.exitLocKnown) { biteRift(); return; } // 위치는 알지만 방법 모름 → 맨몸 시도 → 물림
      // 위치조차 확신 못한 채 두드림 — 이스터에그(저편의 응답)
      w0.exitKnocks = (w0.exitKnocks || 0) + 1;
      if (w0.exitKnocks >= 10) {
        w0.exitKnocks = 6;
        BK.audio.duck(0.08, 0.25, 0.9); BK.audio.whisper(); BK.audio.brotherCall(0);
        BK.fx.addShake(2.5);
        toast('"…형, 그만 두드려. 여기, 너 말고도 많아." …내 목소리였다.');
        game.sanity = Math.max(1, game.sanity - 3);
      } else if (w0.exitKnocks === 5) {
        BK.audio.duck(0.1, 0.3, 0.8); BK.audio.thud(); BK.fx.addShake(3);
        toast('상처 너머에서 똑, 똑, 마주 두드리는 소리가 났다.');
        game.sanity = Math.max(1, game.sanity - 4);
      } else {
        toast('벽의 상처에서 찬 바람이 샌다. 여는 법을 모르겠다.');
      }
      return;
    }
    if (it.want !== undefined) { // 아이 영혼
      if (it.freed) return;
      if (!game.carrying) { toast('아이가 빈 손을 내민다. 잃어버린 걸 찾아 와야 할 것 같다.'); return; }
      if (game.carrying !== it.want) { toast('이건 이 아이가 찾던 게 아니다. 고개를 젓는다.'); return; }
      freeSpirit(it);
      return;
    }
    if (it.installed !== undefined) { // 분전반
      if (game.powerOn) { toast('이미 전원이 들어와 있다.'); return; }
      if (game.fuseHeld <= 0) { toast('빈 소켓뿐이다. 꽂을 퓨즈부터 찾아야 한다.'); return; }
      it.installed = Math.min(3, it.installed + game.fuseHeld);
      game.fuseHeld = 0;
      BK.audio.pickupMetal();
      if (it.installed >= 3) turnOnPower();
      else toast(`퓨즈를 꽂았다. (${it.installed}/3)`);
      return;
    }
    if (it.kind === 'locker') {
      p.x = it.x; p.y = it.y + 4;
      p.hidden = true; game.peekT = 0;
      BK.audio.lockerMove();
      if (!game.hideHintShown) {
        game.hideHintShown = true;
        toast('사물함에 숨었다. 그것이 지나갈 때까지 숨죽여라. [E] 나오기');
      }
    } else if (it.kind === 'door') {
      toggleDoor(it);
    } else if (it.kind === 'pushcrate') {
      pushFurniture(it);
    }
  }

  // 문 열고 닫기
  function toggleDoor(d) {
    d.closed = !d.closed;
    BK.setBlocker(game.world, d.tx, d.ty, d.closed);
    if (d.wide) BK.setBlocker(game.world, d.tx + (d.horiz ? 1 : 0), d.ty + (d.horiz ? 0 : 1), d.closed);
    BK.audio.doorMove(d.closed);
    if (d.closed) BK.fx.addShake(1.2);
  }

  // 무거운 가구 밀기 — 바라보는 방향으로 한 칸
  function pushFurniture(c) {
    const p = game.player;
    const dv = DIRV[p.dir];
    // 플레이어가 가구의 반대편에서 밀어야 함 (대략 방향 일치)
    const toC = { x: c.tx * T + T / 2 - p.x, y: c.ty * T + T / 2 - p.y };
    if (toC.x * dv[0] + toC.y * dv[1] <= 0) { toast('가구를 향해 밀어야 한다.'); return; }
    const ntx = c.tx + dv[0], nty = c.ty + dv[1];
    if (BK.solid(game.world, ntx, nty)) { toast('더 밀 수 없다.'); return; }
    BK.setBlocker(game.world, c.tx, c.ty, false);
    c.tx = ntx; c.ty = nty;
    c.x = ntx * T + T / 2; c.y = nty * T + T / 2;
    BK.setBlocker(game.world, c.tx, c.ty, true);
    BK.audio.furnitureDrag();
    BK.fx.addShake(0.8);
  }

  // 발전기 가동 — 정전 해제 + 엘리베이터 작동
  function turnOnPower() {
    game.powerOn = true;
    BK.audio.generatorStart();
    BK.fx.flash('rgba(230,242,255,0.6)', 0.9);
    BK.fx.addShake(3.5);
    toast('발전기가 깨어난다. 불이 일제히 들어온다.');
    // 빛이 한꺼번에 쏟아지자 어둠에 있던 '꺼진 것'이 그 자리에 영영 굳는다 (석화를 메인 클라이맥스로 승격)
    let caught = 0;
    for (const m of game.monsters) {
      if (m.kind === 'shade' && m.active && !m.petrified) {
        m.petrified = true; m.frozen = true; m.shadeAggro = false; m._subToasted = true; caught++;
      }
    }
    if (caught) {
      BK.audio.shadeFreeze(0);
      setTimeout(() => { if (game.state === 'play') toast('쏟아진 빛 속에서 잿빛 것이 그대로 굳었다. 영영. …데일이었나.'); }, 800);
    }
    // 죽어 있던 기계가 깨어나, 컨베이어가 무언가를 나르기 시작한다 (안도 끝의 새 불안)
    setTimeout(() => { if (game.state === 'play') toast('멈췄던 컨베이어가 덜컹 다시 돈다. 천에 싸인 뭔가를 싣고.'); }, 2400);
    checkQuest(); // 엘리베이터 포털 개방
  }

  // 아이 영혼 해방
  function scheduleBrotherReveal(delay) {
    const w = game.world;
    if (!w || !w.brotherRevealPending || w.brotherRevealSeen) return;
    const tm = setTimeout(() => {
      if (game.world === w && w.brotherRevealPending && !w.brotherRevealSeen && game.state === 'play') {
        showCamcorderReveal();
      }
    }, delay);
    game.fxTimers.push(tm);
  }

  function freeSpirit(s) {
    s.freed = true;
    game.carrying = null;
    game.sanity = Math.min(100, game.sanity + 22);
    game.spiritFx = { x: s.x, y: s.y, t: 1.6 };
    BK.audio.purify();
    BK.fx.flash('rgba(220,230,255,0.3)', 0.5);
    toast(SPIRIT_LINES[s.want]);
    if (s.hidden4) {
      // 숨은 네 번째 아이 — 메인과 무관한 보너스. 엔딩에 작별 한 줄이 더해진다.
      game.world.fourthFreed = true;
      game.sanity = Math.min(100, game.sanity + 8);
      setTimeout(() => { if (game.state === 'play') toast('울지 않아서 아무도 못 찾던 아이다. 네가 찾았다.'); }, 1500);
      return;
    }
    if (s.isBrother) {
      // 2차 반전 — 캠코더 증거
      game.world.brotherRevealPending = true;
      scheduleBrotherReveal(1400);
    } else {
      checkQuest();
    }
  }

  // 결정적 증거: 캠코더 — 동생을 잃은 그날의 영상 (2차 반전)
  function showCamcorderReveal() {
    if (game.state !== 'play') return;
    const w = game.world;
    if (w.brotherRevealSeen) { checkQuest(); return; }
    w.brotherRevealPending = false;
    w.brotherRevealSeen = true;
    BK.audio.sting();
    runCards([
      { html: `<div class="box"><div class="t-pre">발견 · 낡은 캠코더</div><p class="end-story" style="font-size:16px">화면이 지직거리다 켜진다.<br>놀이방. 풍선. 생일 모자. 현수막에는 <b style="color:#e8d49a">생일 축하해, ${BRO_NAME}</b>.<br>노란 우비 아이가 매트에서 손을 흔들고, 그 옆에 휴대폰을 보는 당신이 있다.<br><br>매트가 꺼진다. 아이가 가라앉는다. 당신은 한 박자 늦게 고개를 든다.<br><span style="color:#c84a3a">"형, 왜 손을 놨어?"</span></p></div>`, ms: 5600 },
      { html: `<div class="box"><p class="end-story" style="font-size:17px">${BRO_NAME}. 그 애 이름은 ${BRO_NAME}다.<br>이름이 돌아오니까 그날 냄새까지 같이 온다. 크레용, 케이크, 젖은 매트.<br>동생은 환영이 아니었다. 이곳이 만들어 낸 미끼도 아니었다.<br>진짜로 여기 떨어졌고, 당신이 내려왔을 때는 이미 늦어 있었다.<br><br>알면서도 계속 내려왔다. 구하러 온 게 아니라는 걸 인정하기 싫어서.<br>이번에는 <b>놓아주러</b> 간다.</p></div>`, ms: 5600 },
    ], () => {
      game.state = 'play';
      checkQuest(); // 동생이 마지막이었다면 문 개방
      if (!game.world.portal && !game.world.portalPending) {
        toast('아직 우는 아이가 남아 있다.');
      }
    });
  }

  // ===== 비밀 엔딩: 동생을 깨뜨리다 =====
  // 던진 돌이 동생 영혼에 맞을 때마다 금이 간다. 세 번이면 산산조각.
  // 매 타격: 모든 괴물 소집 + 정신력 폭락 + 동생의 애원 → 멈추기 어렵게(존나 어렵게).
  function summonMonsterTo(m, x, y) {
    if ((m.kind === 'clown' && m.state === 'down') || (m.kind === 'shade' && m.petrified)) return;
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    m.lostT = 0; m.huntT = 0;
    m.lastSeen = { x: tx, y: ty }; m.path = []; m.repathT = 0;
    if (m.kind === 'clown') {
      const dx = x - m.x, dy = y - m.y;
      const len = Math.hypot(dx, dy) || 1;
      m.dirVec = { x: dx / len, y: dy / len };
      m.state = 'windup'; m.timer = m.spec.chargeWindup;
      BK.audio.clownHorn();
      return;
    }
    m.state = 'hunt';
    if (m.kind === 'child') {
      const me = m.tile();
      m.path = BK.findPath(game.world, me.x, me.y, tx, ty) || [];
      m.repathT = 0.6;
    }
  }

  function hitBrother(s, pan) {
    if (s.shattered) return;
    s.cracks = (s.cracks || 0) + 1;
    BK.audio.stoneCrack(pan);
    BK.audio.duck(0.1, 0.07, 0.5);
    BK.fx.flash('rgba(180,40,30,0.42)', 0.6);
    BK.fx.addShake(4.5);
    game.spiritFx = { x: s.x, y: s.y, t: 0.6, shatter: true };
    game.sanity = Math.max(1, game.sanity - 16);
    // 비명처럼 — 모든 괴물이 이 자리로 몰려온다 (가만히 서서 던지면 위험)
    for (const m of game.monsters) {
      if (!m.active) continue;
      summonMonsterTo(m, s.x, s.y);
    }
    if (s.cracks >= 3) { shatterBrother(s); return; }
    toast(BRO_PLEAD[BK.clamp(s.cracks - 1, 0, BRO_PLEAD.length - 1)]);
    if (s.cracks === 1) {
      setTimeout(() => { if (game.state === 'play') toast('멈춰야 한다. 그런데 손이 안 멈춘다.'); }, 1500);
    }
  }

  // 세 번째 금 — 동생이 돌처럼 부서진다. 충격적 막간 후 다른 엔딩.
  function shatterBrother(s) {
    s.shattered = true; s.freed = true;
    game.carrying = null;
    game.state = 'cut'; // 산산조각 동안 잠깐 멈춤 (이 사이엔 잡히지 않는다)
    game.spiritFx = { x: s.x, y: s.y, t: 2.0, shatter: true };
    BK.audio.duck(0.04, 0.5, 1.3);
    BK.audio.spiritShatter();
    BK.audio.boneCrack();
    BK.fx.flash('rgba(220,40,30,0.55)', 0.95);
    BK.fx.addShake(9);
    BK.audio.setChase(0, 0); BK.audio.setDread(0); BK.audio.setTension(0);
    toast('잿빛 조각들이 카펫 위로 흩어진다. 노란 우비 한 조각만 남고.');
    setTimeout(() => { if (game.state === 'cut') showShatterEnd(); }, 1900);
  }

  // 우는 아이의 비명: 기절 + 정신력 폭락 + 모든 괴물 소집
  function childScream(mon) {
    if (game.state !== 'play') return;
    BK.audio.duck(0.05, 0.03, 0.7); // 비명 직전의 공백
    BK.audio.childScream();
    BK.fx.flash('rgba(255,240,235,0.55)', 0.9);
    BK.fx.addShake(6);
    game.player.stun = 1.6;
    game.sanity = Math.max(1, game.sanity - 26);
    game.lightsOutT = Math.max(game.lightsOutT, 1.5);
    toast('아이가 비명을 질렀다 — 몸이 굳는다! 모두가 이쪽으로 온다!');
    for (const m of game.monsters) {
      if (m === mon || !m.active) continue;
      summonMonsterTo(m, game.player.x, game.player.y);
    }
  }

  function die(cause) {
    game.state = 'dead';
    game.deathCause = cause;
    BK.audio.setDread(0); BK.audio.setExitStatic(0); BK.audio.setTension(0); BK.audio.setChase(0, 0); BK.audio.setCrisis(0);
    if (cause === 'madness') BK.audio.madness();
    else BK.audio.flatline();
    showDead(cause);
  }

  function winGame() {
    game.state = 'win';
    game.finale = false;
    BK.audio.setDread(0); BK.audio.setExitStatic(0); BK.audio.setTension(0); BK.audio.setChase(0, 0); BK.audio.setCrisis(0);
    BK.audio.win();
    BK.fx.flash('rgba(255,255,255,1)', 1.2);
    showWin();
  }

  // ---------------- 보조 ----------------
  function visibleChunks(margin) {
    const P = BK.CHUNK_PX;
    const x0 = Math.floor((game.cam.x - margin) / P);
    const x1 = Math.floor((game.cam.x + VW + margin) / P);
    const y0 = Math.floor((game.cam.y - margin) / P);
    const y1 = Math.floor((game.cam.y + VH + margin) / P);
    const out = [];
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++)
        out.push(BK.getChunk(game.world, cx, cy));
    return out;
  }
  function chunksAroundPlayer(r) {
    const P = BK.CHUNK_PX;
    const pcx = Math.floor(game.player.x / P), pcy = Math.floor(game.player.y / P);
    const out = [];
    for (let cy = pcy - r; cy <= pcy + r; cy++)
      for (let cx = pcx - r; cx <= pcx + r; cx++)
        out.push(BK.getChunk(game.world, cx, cy));
    return out;
  }

  // ---------------- 업데이트 ----------------
  function update(dt) {
    game.time += dt;
    BK.fx.flashA *= Math.exp(-3.4 * dt);
    if (game.flickerT > 0) game.flickerT -= dt;
    if (game.lightsOutT > 0) game.lightsOutT -= dt;
    if (game.faceFlashT > 0) game.faceFlashT -= dt;
    if (game.silenceT > 0) game.silenceT -= dt;
    if (game.peripheralCD > 0) game.peripheralCD -= dt;
    game.faceCD -= dt;
    for (const m of game.msgs) m.t -= dt;
    game.msgs = game.msgs.filter((m) => m.t > 0);
    if (BK.audio.started) BK.audio.tick();

    if (game.state === 'title' || game.state === 'customize') {
      if (game.world) {
        game.cam.x = Math.cos(game.time * 0.07) * 220 - VW / 2;
        game.cam.y = Math.sin(game.time * 0.05) * 220 - VH / 2;
      }
      return;
    }
    if (game.state === 'jumpscare') {
      game.jumpT += dt;
      // 단계별 사운드: 목 꺾임 → 피 쏟기
      if (!game.jumpCrackPlayed && game.jumpT > 0.22) { game.jumpCrackPlayed = true; BK.audio.boneCrack(); BK.fx.addShake(8); }
      if (!game.jumpGorePlayed && game.jumpT > 0.46) { game.jumpGorePlayed = true; BK.audio.gore(); }
      if (game.jumpT > 1.5) die('caught');
      return;
    }
    if (game.state !== 'play') return;

    game.playT += dt;
    const p = game.player, w = game.world;
    const cfg = w.cfg;

    // L0 균열의 '깨어난 창' — 돌로 깨운 뒤 벌릴 수 있는 짧은 시간
    if (w.exit && w.exit.awakeT > 0) {
      w.exit.awakeT -= dt;
      if (w.exit.awakeT <= 0 && w.exitLocKnown) toast('상처가 도로 다물렸다. 다시 깨워야 한다.');
    }

    p.update(dt, inputVec(), w);
    for (const m of game.monsters) if (m.active) m.update(dt, w, p, game);
    // 서브 루트 알림 — 발견 가능성을 위해 '진행 중' 피드백 + 완료 알림
    for (const m of game.monsters) {
      // 꺼진 것: 석화가 절반쯤 진행되면 한 번 일러 준다(계속 비추라고)
      if (m.kind === 'shade' && !m.petrified && !m._petrifyHint && m.petrifyT > 1.6) {
        m._petrifyHint = true;
        toast('꺼진 것이 빛 속에서 더 깊이 굳는다. 계속 비추면 영영 멈출 것 같다.');
      }
      // 광대: 벽에 박을 때마다(소진 전) 진행을 알려 준다
      if (m.kind === 'clown' && m.state !== 'down' && (m.crashes || 0) > (m._crashSeen || 0)) {
        m._crashSeen = m.crashes;
        if (m.crashes < 3) toast(m.crashes === 1
          ? '광대가 헛돌진해 벽에 박곤 휘청인다 — 옆으로 피해 또 박게 하면?'
          : '광대가 다시 벽을 들이받는다. 숨이 가빠 보인다 — 한 번 더.');
      }
      if (m._subToasted) continue;
      if (m.kind === 'shade' && m.petrified) {
        m._subToasted = true;
        toast(game.shadePetrifiedOnce ? '또 하나가 빛 속에서 영영 굳었다.'
          : '빛이 그것을 끝까지 굳혔다 — 이제 석상이다. 먼저 온 누군가가, 마침내 멈췄다.');
        game.shadePetrifiedOnce = true;
      } else if (m.kind === 'clown' && m.state === 'down') {
        m._subToasted = true;
        BK.audio.thud(); BK.fx.addShake(2);
        toast(game.clownDownOnce ? '광대가 또 주저앉는다. 더는 일어나지 않는다.'
          : '광대가 세 번째로 벽을 들이받곤 — 무릎을 꺾고 주저앉는다. 잃은 아이를 영영 못 찾은 채.');
        game.clownDownOnce = true;
      }
    }

    // 카메라 추적 (무한 맵 — 클램프 없음)
    const k = 1 - Math.exp(-8 * dt);
    game.cam.x = BK.lerp(game.cam.x, p.x - VW / 2, k);
    game.cam.y = BK.lerp(game.cam.y, p.y - VH / 2, k);

    // 가장 가까운 괴물 + 추격 상태 집계
    let nearD = 1e9, nearM = null, anyAggro = false, aggroD = 1e9;
    for (const m of game.monsters) {
      if (!m.active) continue;
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < nearD) { nearD = d; nearM = m; }
      if (m.aggressive) { anyAggro = true; aggroD = Math.min(aggroD, d); }
    }
    game._nearD = nearD; game._nearM = nearM;

    // ===== 던진 돌(발사체) → 착지 → 소리 미끼 =====
    if (game.projectile) {
      const pj = game.projectile;
      pj.life -= dt;
      const nx = pj.x + pj.vx * dt, ny = pj.y + pj.vy * dt;
      if (pj.life <= 0 || BK.solidPx(w, nx, ny)) {
        const pan = BK.clamp((pj.x - p.x) / 240, -1, 1);
        if (pj.type === 'almond') {
          // 깨진 아몬드 워터 — 주변 괴물 약화(둔화)
          BK.audio.almondSplash(pan);
          game.almondSplash = { x: pj.x, y: pj.y, t: 0.7 };
          let hit = 0;
          for (const m of game.monsters) {
            if (m.active && Math.hypot(m.x - pj.x, m.y - pj.y) < 72) { m.weakT = 3; hit++; }
          }
          if (hit) toast('아몬드 워터가 깨졌다. 그것이 움츠러든다.');
        } else {
          game.lure = { x: pj.x, y: pj.y, t: 4.5, fresh: true };
          BK.audio.rockLand(pan);
          tryWakeRiftAt(pj.x, pj.y);
          // L2: 던진 돌이 '애원하는 변이 시신'에 맞으면 — 끝내 준다(자비). 굳기 전에.
          if (game.zoneIdx === 1) {
            for (const ch of chunksAroundPlayer(1)) {
              for (const pr of ch.props) {
                if (pr.kind === 'corpse' && pr.begging && !pr.ended &&
                    Math.hypot(pr.x - pj.x, pr.y - pj.y) < 16) {
                  pr.ended = true; pr.begging = false; pr.turning = false; pr.faceShown = false;
                  BK.audio.stoneCrack(pan); BK.fx.addShake(2.5); BK.fx.flash('rgba(120,120,130,0.3)', 0.5);
                  game.sanity = Math.max(1, game.sanity - 3);
                  toast('돌이 굳어 가던 것을 끝낸다. "…고마, 워." 잿빛으로 조용히 부서진다.');
                  break;
                }
              }
            }
          }
        }
        game.projectile = null;
      } else {
        pj.x = nx; pj.y = ny;
        pj.vx *= (1 - 0.6 * dt); pj.vy *= (1 - 0.6 * dt);
        if (pj.type === 'rock') tryWakeRiftAt(pj.x, pj.y);
        // 비밀 경로: 던진 돌이 동생 영혼에 명중하면 금이 간다 (놀이방 전용)
        // 비밀 경로는 '금단의 속삭임'(거짓 자비)을 한 번 들은 뒤에만 무장된다.
        // → 괴물 유인용으로 던진 돌이 동생을 '실수로' 깨뜨리는 사고를 막는다.
        if (pj.type === 'rock' && game.zoneIdx === 2 && game.forbiddenSeen && w.spirits) {
          for (const s of w.spirits) {
            if (s.isBrother && !s.freed && !s.shattered && Math.hypot(s.x - pj.x, s.y - pj.y) < 14) {
              hitBrother(s, BK.clamp((pj.x - p.x) / 240, -1, 1));
              game.projectile = null;
              break;
            }
          }
        }
      }
    }
    if (game.lure) {
      game.lure.fresh = false;
      game.lure.t -= dt;
      if (game.lure.t <= 0) game.lure = null;
    }

    // ===== 상호작용 대상 감지 (사물함 / 문 / 미는 가구 / 아이 영혼) + 숨기 발각 =====
    game.nearInteract = null;
    if (!p.hidden) {
      let bestD = 28;
      for (const ch of chunksAroundPlayer(1)) {
        for (const pr of ch.props) {
          if (pr.kind !== 'locker' && pr.kind !== 'door' && pr.kind !== 'pushcrate') continue;
          const dd = Math.hypot(pr.x - p.x, pr.y - p.y);
          if (dd < bestD) { bestD = dd; game.nearInteract = pr; }
        }
      }
      if (w.spirits) for (const s of w.spirits) {
        if (s.freed) continue;
        const dd = Math.hypot(s.x - p.x, s.y - p.y);
        if (dd < bestD) { bestD = dd; game.nearInteract = s; }
      }
      if (w.fusebox && !game.powerOn) {
        const dd = Math.hypot(w.fusebox.x - p.x, w.fusebox.y - p.y);
        if (dd < bestD) { bestD = dd; game.nearInteract = w.fusebox; }
      }
      // L0 휴면 균열 — 가까이 가면 (알고 있으면) 벌릴 수 있다
      if (w.exit && !w.exit.opened) {
        const dd = Math.hypot(w.exit.x - p.x, w.exit.y - p.y);
        if (dd < bestD) { bestD = dd; game.nearInteract = w.exit; }
      }
    } else {
      // 숨는 중: 가까운 괴물이 들여다보면 심장이 뛰고, 코앞에서 오래 머물면 발각
      if (nearM && nearD < 32 && (nearM.aggressive || nearM.state === 'search' || nearM.state === 'investigate')) {
        game.peekT += dt;
        game.heartT -= dt;
        if (game.heartT <= 0) { BK.audio.heartbeatFast(); game.heartT = 0.5; }
        if (nearD < 16 && game.peekT > 1.4) {
          p.hidden = false;
          catchPlayer(nearM);
          return;
        }
      } else {
        game.peekT = Math.max(0, game.peekT - dt * 1.5);
      }
    }

    // ===== 괴물이 닫힌 문을 부순다 (추격 중) =====
    for (const ch of chunksAroundPlayer(2)) {
      for (const pr of ch.props) {
        if (pr.kind !== 'door' || !pr.closed) continue;
        let breaker = null;
        for (const m of game.monsters) {
          if (m.active && m.aggressive && Math.hypot(m.x - pr.x, m.y - pr.y) < 24) { breaker = m; break; }
        }
        if (breaker) {
          pr.breakT = (pr.breakT || 0) + dt;
          pr.bangT = (pr.bangT || 0) - dt;
          if (pr.bangT <= 0) { BK.audio.doorBang(); BK.fx.addShake(1.6); pr.bangT = 0.55; }
          if (pr.breakT > 2.4) {
            pr.closed = false;
            BK.setBlocker(w, pr.tx, pr.ty, false);
            if (pr.wide) BK.setBlocker(w, pr.tx + (pr.horiz ? 1 : 0), pr.ty + (pr.horiz ? 0 : 1), false);
            BK.audio.doorBreak();
            toast('문이 부서졌다!');
          }
        } else {
          pr.breakT = Math.max(0, (pr.breakT || 0) - dt * 0.5);
        }
      }
    }

    // ===== 등 뒤의 것 (The Stalker) =====
    if (!p.moving) game.stillT += dt; else game.stillT = 0;
    game.stalkerCD -= dt;
    // 가만히 있거나 정신력이 낮으면, 추격이 없을 때 등 뒤에서 나타난다
    if (!game.stalker && !p.hidden && !anyAggro && game.stalkerCD <= 0 &&
        (game.sanity < 65 || game.stillT > 5)) {
      const bv = DIRV[p.dir];
      const spot = BK.randomFloorNear(w, p.x - bv[0] * 130, p.y - bv[1] * 130, 0, 70, 30);
      if (spot && !game.onScreen(spot.x, spot.y, -10)) {
        game.stalker = { x: spot.x, y: spot.y, app: 0 };
        game.stalkerCD = 30 + Math.random() * 25;
      } else {
        game.stalkerCD = 4;
      }
    }
    if (game.stalker) {
      const s = game.stalker;
      const sdx = s.x - p.x, sdy = s.y - p.y, sd = Math.hypot(sdx, sdy) || 1;
      const dv = DIRV[p.dir];
      const facing = (sdx * dv[0] + sdy * dv[1]) / sd > 0.30; // 플레이어가 그쪽을 보는가
      if (facing) {
        // 응시당하면 얼어붙고 흐려져 사라진다
        s.app = Math.max(0, s.app - dt * 1.6);
        if (s.app <= 0 && sd > 36) game.stalker = null;
      } else {
        // 안 볼 때만 또렷해지고 다가온다
        s.app = Math.min(1, s.app + dt * 0.7);
        const spd = 16 + (70 - game.sanity) * 0.35;
        s.x -= (sdx / sd) * spd * dt;
        s.y -= (sdy / sd) * spd * dt;
        game.stalkerBreathT -= dt;
        if (game.stalkerBreathT <= 0) {
          BK.audio.breathClose(BK.clamp(sdx / 200, -1, 1));
          if (s.app > 0.6) BK.audio.heartbeatFast();
          game.stalkerBreathT = 1.1;
        }
      }
      if (s.app > 0.3) game.sanity = Math.max(0, game.sanity - 1.4 * dt * s.app);
      if (sd < 15 && s.app > 0.5) { game.stalker = null; catchPlayer({ kind: 'smiler' }); return; }
      if (sd > 420) game.stalker = null;
    }
    // 멈춰 있을 때 등 뒤에서 들리는 가짜 발소리
    if (!p.moving && game.stillT > 2.5) {
      game.fakeStepT -= dt;
      if (game.fakeStepT <= 0) {
        game.fakeStepT = 2.5 + Math.random() * 4;
        if (Math.random() < 0.5) { BK.audio.footstep(false); }
      }
    }
    // 벽의 얼굴 수명
    if (game.wallFaceFx) { game.wallFaceFx.t -= dt; if (game.wallFaceFx.t <= 0) game.wallFaceFx = null; }

    // 아이 영혼 — 부유 + 방치 시 흐느낌(광대를 부른다)
    if (w.spirits) for (const s of w.spirits) {
      if (s.freed || s.hidden4) continue; // 숨은 아이는 울지 않는다(미끼 아님)
      s.cryT -= dt;
      if (s.cryT <= 0) {
        s.cryT = 7 + Math.random() * 5;
        const sd = Math.hypot(s.x - p.x, s.y - p.y);
        if (sd < 380) BK.audio.childSob(BK.clamp(1 - sd / 380, 0, 1), BK.clamp((s.x - p.x) / 200, -1, 1));
        if (Math.random() < 0.3 && !game.lure) game.lure = { x: s.x, y: s.y, t: 3, fresh: true };
      }
    }
    if (game.spiritFx) { game.spiritFx.t -= dt; if (game.spiritFx.t <= 0) game.spiritFx = null; }
    if (game.almondSplash) { game.almondSplash.t -= dt; if (game.almondSplash.t <= 0) game.almondSplash = null; }

    // 이스터에그/비밀 엔딩 유도 — 동생 곁에서 정신력이 낮을 때 떠오르는 '거짓 자비'
    if (game.zoneIdx === 2 && w.spirits) {
      game.forbidT -= dt;
      if (game.forbidT <= 0) {
        game.forbidT = 9 + Math.random() * 7;
        const b = w.spirits.find((s) => s.isBrother && !s.freed && !s.shattered);
        if (b && game.sanity < 60 && game.throwables > 0 && b.cracks === 0 &&
            Math.hypot(b.x - p.x, b.y - p.y) < 80) {
          BK.audio.whisper();
          toast(FORBIDDEN_MSGS[(Math.random() * FORBIDDEN_MSGS.length) | 0]);
          game.sanity = Math.max(1, game.sanity - 2);
          game.forbiddenSeen = true; // 이 '거짓 자비'를 한 번 들은 뒤에야 돌이 동생에게 닿는다
        }
      }
      // 엔딩 "같이 남다" (매우 어려운 숨은 조건) — 이번 런에 아몬드 워터를 한 번도 안 마시고(명료를
      // 끝까지 거부) 정신력이 바닥인 채, 동생의 유물을 들고 그 곁에서 '보내지 않고 가만히' 머물면 —
      // 차마 못 놓고 그 곁에 주저앉아 '먼저 온 우리'가 된다. (놓아주는 건 행동, 남는 건 항복)
      const bro = w.spirits.find((s) => s.isBrother && !s.freed && !s.shattered);
      const stayElig = bro && game.drank === 0 && game.sanity < 30 && game.carrying === 'gear';
      if (stayElig && !p.moving && !p.hidden && Math.hypot(bro.x - p.x, bro.y - p.y) < 20) {
        game.clingT += dt;
        if (game.clingStage < 1 && game.clingT > 1.0) { game.clingStage = 1; BK.audio.whisper(); toast('(보내지 마. 그냥… 여기 같이 있어.)'); }
        if (game.clingStage < 2 && game.clingT > 3.0) { game.clingStage = 2; BK.audio.whisper(); BK.fx.addShake(1.5); toast('(다리에 힘이 빠진다. 더는 안 찾아도 돼. 여기, 그 애 옆에.)'); }
        if (game.clingT > 5.5) { stayEnding(bro); return; }
      } else if (game.clingT > 0) {
        game.clingT = Math.max(0, game.clingT - dt * 2.5); // 움직이거나 멀어지면 빠르게 식는다
        if (game.clingT === 0) game.clingStage = 0;
      }
    }

    // 추격/이벤트 조명 연출 강도
    const chaseTarget = (anyAggro ? BK.clamp(1 - aggroD / 320, 0.35, 1) : 0);
    const evTarget = (game.lightsOutT > 0 ? 1 : (game.flickerT > 0 ? 0.55 : 0));
    const flickGoal = Math.max(chaseTarget, evTarget, game.finale ? 0.6 : 0);
    game.chaseFlick = BK.lerp(game.chaseFlick, flickGoal, 1 - Math.exp(-6 * dt));

    // 추격 BGM
    BK.audio.setChase(anyAggro ? 1 : 0, anyAggro ? BK.clamp(1 - aggroD / 300, 0, 1) : 0);

    // 아이템 줍기
    for (const it of w.items) {
      if (it.got || Math.hypot(it.x - p.x, it.y - p.y) >= 10) continue;
      if (it.kind === 'note') {
        const noteIdx = nextNoteIdxForZone();
        it.got = true;
        game.notesRead++;
        game.sanity = Math.min(100, game.sanity + 5);
        BK.audio.pickup();
        showNote(noteIdx);
        return;
      }
      if (it.kind === 'relic') {
        if (game.carrying) { toast('이미 무언가를 들고 있다.'); continue; }
        it.got = true;
        game.carrying = it.relicType;
        BK.audio.pickup();
        toast(`${RELIC_NAME[it.relicType]}이다. …이걸 잃어버린 아이가 있을 거다.`);
        continue;
      }
      it.got = true;
      if (it.kind === 'fuse') {
        game.fuseHeld++;
        BK.audio.pickupMetal();
        toast(`퓨즈다. 분전반에 꽂으면 불이 들어올 거다. (보유 ${game.fuseHeld})`);
        continue;
      }
      BK.audio.pickupMetal();
      toast('무언가를 손에 넣었다.');
    }
    for (const ch of chunksAroundPlayer(1)) {
      for (const b of ch.bottles) {
        if (!b.got && Math.hypot(b.x - p.x, b.y - p.y) < 10) {
          b.got = true;
          game.almond++;
          BK.audio.pickup();
          toast(`아몬드 워터를 챙겼다. (보유 ${game.almond}) — 마시기 H · 던지기 G`);
        }
      }
      for (const pk of ch.pickups) {
        if (pk.got || pk.kind !== 'rock' || Math.hypot(pk.x - p.x, pk.y - p.y) >= 10) continue;
        pk.got = true;
        game.throwables++;
        BK.audio.pickup();
        toast(`던질 돌을 주웠다. (${game.throwables}개)`);
      }
    }

    // 포털 도달
    if (w.portal && Math.hypot(w.portal.x - p.x, w.portal.y - p.y) < 13) {
      portalTouched(w.portal.kind);
      return;
    }
    // 서브 루트(L2): 비상 해치 도달 — 발전기 없이도 빠져나간다
    if (w.hatch && Math.hypot(w.hatch.x - p.x, w.hatch.y - p.y) < 13) {
      portalTouched('hatch');
      return;
    }

    // 벽 낙서 / 마네킹 / 시체 반응
    for (const ch of chunksAroundPlayer(1)) {
      for (const pr of ch.props) {
        if (pr.twitchT > 0) pr.twitchT -= dt;
        const pd = Math.hypot(pr.x - p.x, pr.y - p.y);
        if (pr.kind === 'writing' && !pr.read && pd < 30) {
          pr.read = true;
          const wpool = writingPoolForZone();
          pr.msg = wpool[(Math.random() * wpool.length) | 0];
          toast(`벽에 긁힌 글씨: "${pr.msg}"`);
          BK.audio.whisper();
          game.sanity = Math.max(0, game.sanity - 2);
        }
        // 크레용 벽화 — 아이들이 그린 그림(놀이방). 가까이 가면 그 장면이 읽힌다.
        if (pr.kind === 'mural' && !pr.read && pd < 30) {
          pr.read = true;
          toast(MURAL_PANELS[BK.clamp(pr.panel, 0, MURAL_PANELS.length - 1)]);
          BK.audio.whisper();
          game.sanity = Math.max(0, game.sanity - (pr.leo ? 5 : 2));
          if (pr.leo) { BK.fx.addShake(2); BK.audio.brotherCall(0); }
        }
        if (pr.kind === 'mannequin' && !pr.noticed && pd < 80 && game.onScreen(pr.x, pr.y, 0)) {
          pr.noticed = true;
          toast('마네킹이다. …아까는 저기 없었는데.');
        }
        // 시체: 조사하면 메모(괴물 정보/약점/출구 단서). 일부(scare)는 움찔하며 눈코입이 솟는다.
        if (pr.kind === 'corpse' && !pr.read && pd < 22) {
          pr.read = true;
          if (pr.turning && pr.begging && !pr.ended) {
            // 반쯤 사람인 채 애원한다 — 외면(그냥 떠남)할지, 끝내 줄지(Q로 돌). 동생 테마의 예행연습.
            BK.audio.whisper(); BK.fx.addShake(1.5);
            game.sanity = Math.max(0, game.sanity - 4);
            toast(pickBeggingMemo(pr));
            game.loreRead++;
            if (!game.beggedSeen) {
              game.beggedSeen = true;
              setTimeout(() => { if (game.state === 'play') toast('돌로 끝내 줄 수는 있다. 아니면 그냥 두고 가거나.'); }, 1600);
            }
          } else if (pr.turning) {
            // 변해가는 시신 — 절반은 사람, 절반은 잿빛 돌. 설명 대신 정황만 보여 준다.
            BK.audio.whisper();
            game.sanity = Math.max(0, game.sanity - 3);
            toast('절반은 돌, 절반은 아직 사람이다. 살갗이 잿빛으로 식어 있다.');
            toast(`쥐고 있던 쪽지 — "${pickTurnMemo(pr)}"`);
            game.loreRead++;
            // 처음 한 번, 스스로 알아채는 조용한 순간 (단정 짓지 않고 여지를 남긴다)
            if (!game.turnRealized) {
              game.turnRealized = true;
              setTimeout(() => { if (game.state === 'play') toast('사원증, 작업복, 해진 신발. 전부 사람이 걸치던 것들이다.'); }, 1700);
            }
          } else if (pr.scare) {
            pr.faceShown = true; pr.twitchT = 0.5; // 제자리에서 움찔 + 눈코입이 솟는다
            BK.audio.stingShort(); BK.fx.addShake(2.2);
            game.sanity = Math.max(0, game.sanity - 4);
            toast(CORPSE_SCARE_INTRO[(Math.random() * CORPSE_SCARE_INTRO.length) | 0]);
            const memo = pickCorpseMemo(pr);
            toast(`죽은 이의 메모 — "${memo.t}"`);
            game.loreRead++;
            if (memo.exit) { knowExitLocation('메모가 가리킨다 — 벽이 보랏빛으로 곪은 곳. 거기가 출구다.'); learnExitMethod('pry', '메모 끝에 갈겨 쓴 한 줄 — "벌리려다 물렸다. 깨운 다음에, 꿈틀하는 그 찰나에 빠르게 벌려야 해."'); }
            if (memo.hatch) knowHatch();
          } else {
            BK.audio.whisper();
            game.sanity = Math.max(0, game.sanity - 2);
            toast(CORPSE_INTRO[(Math.random() * CORPSE_INTRO.length) | 0]);
            const memo = pickCorpseMemo(pr);
            toast(`죽은 이의 메모 — "${memo.t}"`);
            game.loreRead++;
            if (memo.exit) { knowExitLocation('메모가 가리킨다 — 벽이 보랏빛으로 곪은 곳. 거기가 출구다.'); learnExitMethod('pry', '메모 끝에 갈겨 쓴 한 줄 — "벌리려다 물렸다. 깨운 다음에, 꿈틀하는 그 찰나에 빠르게 벌려야 해."'); }
            if (memo.hatch) knowHatch();
          }
        }
      }
    }
    // 마네킹은 안 볼 때 움직인다
    game.manT -= dt;
    if (game.manT <= 0) {
      game.manT = 5 + Math.random() * 3;
      if (game.zoneIdx === 1) {
        for (const ch of chunksAroundPlayer(2)) {
          for (const pr of ch.props) {
            if (pr.kind !== 'mannequin' || game.onScreen(pr.x, pr.y, 30)) continue;
            if (Math.random() < 0.4) {
              const spot = BK.randomFloorNear(w, pr.x, pr.y, 16, 70, 20);
              if (spot && !game.onScreen(spot.x, spot.y, 30)) { pr.x = spot.x; pr.y = spot.y; pr.noticed = false; }
            }
          }
        }
      }
    }

    // 근접 오디오(드론/심장) + 긴장도
    let tension = 0;
    if (nearM) {
      tension = BK.clamp(1 - nearD / 260, 0, 1);
      if (anyAggro) tension = Math.min(1, tension + 0.35);
      BK.audio.setDread(BK.clamp(1 - nearD / 230, 0, 1) * (anyAggro ? 1 : 0.55));
      if (nearD < 280) {
        game.heartT -= dt;
        if (game.heartT <= 0) {
          BK.audio.heartbeat(1 - nearD / 320);
          game.heartT = BK.lerp(0.38, 1.25, BK.clamp(nearD / 280, 0, 1));
        }
      }
    } else BK.audio.setDread(0);
    if (game.finale) tension = 1;
    BK.audio.setTension(tension);

    // 위기 레이어(이명+럼블): 정신력 위급 / 피날레 / 등 뒤의 것 근접
    let crisis = BK.clamp((38 - game.sanity) / 38, 0, 1);
    if (game.finale) crisis = Math.max(crisis, 0.55);
    if (game.stalker) crisis = Math.max(crisis, game.stalker.app * 0.6);
    BK.audio.setCrisis(crisis);

    // 패닉 호흡 — 정신력이 낮거나(공황) 위협이 코앞일수록 들숨/날숨이 가빠진다
    let panic = BK.clamp((52 - game.sanity) / 52, 0, 1);
    if (nearM && nearD < 160) panic = Math.max(panic, BK.clamp(1 - nearD / 160, 0, 1) * (anyAggro ? 1 : 0.55));
    if (game.finale) panic = Math.max(panic, 0.7);
    if (panic > 0.12 && !game.player.hidden) {
      game.breathT -= dt;
      if (game.breathT <= 0) {
        BK.audio.panicBreath(panic);
        game.breathT = BK.lerp(3.4, 1.0, panic); // 무서울수록 잦게
      }
    } else if (game.breathT < 1.2) game.breathT = 1.2;

    if (w.portal) {
      const xd = Math.hypot(w.portal.x - p.x, w.portal.y - p.y);
      const v = BK.clamp(1 - xd / 560, 0, 1);
      BK.audio.setExitStatic(v * v);
    }

    // 정신력 (난이도↑)
    let drain = cfg.drain;
    if (nearM && game.onScreen(nearM.x, nearM.y, 20) && nearD < 130) {
      drain += 2.2 + (anyAggro ? 1.0 : 0);
    }
    if (game.lightsOutT > 0) drain += 0.7;
    if (game.finale) drain += 0.5;
    game.sanity = Math.max(0, game.sanity - drain * dt);
    if (game.sanity <= 0) { die('madness'); return; }

    // 분위기 멘트
    game.flavorT -= dt;
    if (game.flavorT <= 0) {
      game.flavorT = 22 + Math.random() * 20;
      if (game.silenceT <= 0) { // 정적 창에선 분위기 멘트도 띄우지 않는다
        const pool = FLAVOR[game.zoneIdx];
        toast(pool[(Math.random() * pool.length) | 0]);
      }
    }

    // 기계실 상시 박동
    if (game.zoneIdx === 1) {
      game.pressT -= dt;
      if (game.pressT <= 0) { game.pressT = 3.4 + Math.random() * 2.4; BK.audio.pressThump(); }
    }

    // 앰비언스 스케줄러 — 끊임없는 환경/원거리 사운드로 긴장 유지
    // 긴장이 높거나 정신력이 낮으면 더 촘촘히 깔려 압박을 키운다
    game.ambT -= dt;
    if (game.ambT <= 0) {
      const dense = Math.max(tension, BK.clamp((45 - game.sanity) / 45, 0, 1), game.finale ? 0.8 : 0);
      game.ambT = BK.lerp(2.2, 0.9, dense) + Math.random() * BK.lerp(3.0, 1.2, dense);
      if (game.silenceT <= 0) playAmbient(); // 정적 창에선 환경음을 깔지 않는다
    }

    // 감각 핑
    game.pingT -= dt;
    if (game.pingShow > 0) game.pingShow -= dt;
    if (game.pingT <= 0) {
      game.pingT = 9;
      const tgt = nearestObjective();
      if (tgt) {
        game.pingTarget = tgt;
        game.pingShow = 2.5;
        if (game.pingToldZone !== game.zoneIdx) { game.pingToldZone = game.zoneIdx; toast('무언가가 당신을 부른다…'); }
      }
    }

    // 환경 공포 이벤트 — 공포 디렉터: 평평한 타이머 대신 긴장(heat) 곡선.
    // 안전할수록 빨리 차오르고, 큰 한 방 직후엔 음수 골짜기로 떨어져 '강제 정적'을 만든다(대비).
    {
      const threat = anyAggro ? 1 : (nearM ? BK.clamp(1 - nearD / 240, 0, 1) : 0);
      let rise = BK.lerp(0.17, 0.045, threat);  // 안전하면 빨리, 위협이 코앞이면 느리게(괴물이 곧 긴장)
      rise *= BK.lerp(0.8, 1.5, BK.clamp((70 - game.sanity) / 70, 0, 1)); // 정신력 낮을수록 가속
      if (game.finale) rise *= 1.5;
      if (game.silenceT > 0) rise = 0;          // 정적 창 동안은 멈춤
      game.safeStreak = threat > 0.25 ? 0 : game.safeStreak + dt;
      game.heat += dt * rise;
      if (game.heat >= 1) {
        const intensity = BK.clamp(game.safeStreak / 20, 0, 1); // 오래 평온했으면 더 센 걸 꺼낸다
        game.heat = -(0.3 + Math.random() * 0.45);              // 골짜기 — 강제 정적/회복
        fireEvent(intensity);
      }
    }

    // 환각/눈/도플갱어 수명
    for (const key of ['halluc', 'eyes', 'doppel']) {
      if (game[key]) { game[key].t -= dt; if (game[key].t <= 0) game[key] = null; }
    }
    if (game.eyes && Math.hypot(game.eyes.x - p.x, game.eyes.y - p.y) < 50) game.eyes = null;

    BK.evictChunks(w, game.time);
  }

  function nearestObjective() {
    const w = game.world;
    if (w.portal) return { x: w.portal.x, y: w.portal.y };
    if (w.portalPending) {
      const P = BK.CHUNK_PX;
      return { x: w.portalPending.cx * P + P / 2, y: w.portalPending.cy * P + P / 2 };
    }
    // L0: 위치 + 여는 법의 한 단계라도 알면 균열로 안내. 둘 다 모르면
    // 아래 기록/시신 탐색으로 자연 안내해 단서를 모으게 한다(열 수 없는 균열로만 끌고 가지 않음).
    if (game.zoneIdx === 0 && w.exit && !w.exit.opened && w.exitLocKnown &&
        (w.exitWakeKnown || w.exitPryKnown || w.exitMethodSure || w.exit.awakeT > 0)) {
      return { x: w.exit.x, y: w.exit.y };
    }
    // 퓨즈를 들고 있으면 분전반으로 안내
    if (w.fusebox && !game.powerOn && game.fuseHeld > 0) return { x: w.fusebox.x, y: w.fusebox.y };
    // L3: 유물을 들고 있으면 맞는 영혼으로 안내
    if (game.carrying && w.spirits) {
      for (const s of w.spirits) if (!s.freed && s.want === game.carrying) return { x: s.x, y: s.y };
    }
    let best = null, bd = 1e18;
    const p = game.player;
    for (const it of w.items) {
      if (it.got) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d < bd) { bd = d; best = { x: it.x, y: it.y }; }
    }
    const P = BK.CHUNK_PX;
    for (const it of w.pending) {
      const x = it.cx * P + P / 2, y = it.cy * P + P / 2;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bd) { bd = d; best = { x, y }; }
    }
    return best;
  }

  function fireEvent(intensity) {
    const z = game.zoneIdx, s = game.sanity;
    const I = intensity == null ? 0.4 : intensity;
    const bigW = 0.4 + I * 1.3;   // 오래 평온했을수록(intensity↑) 큰 한 방 가중치↑
    const lowW = 1.3 - I * 0.55;  // 잦은 '노이즈' 자극은 평온이 길수록 가중치↓
    const anyActive = game.monsters.some((m) => m.active);
    const pool = [];
    const add = (w2, fn) => pool.push([w2, fn]);
    // 주변 '깜빡' 비주얼 4종(눈·환영·도플갱어·벽의 얼굴)은 공유 쿨다운으로 묶는다.
    // → 다양성(예측 불가)은 그대로 두고, 한 창에 몰려 터져 무뎌지는 것만 막는다.
    const periphReady = game.peripheralCD <= 0;
    const periphFired = () => { game.peripheralCD = 8 + Math.random() * 4; };
    add(3 * lowW, () => { game.flickerT = 2.4; BK.audio.buzz(); });
    add(2 * lowW, () => { BK.audio.thud(); BK.fx.addShake(1.6); });
    if (s < 80) add(2, () => BK.audio.whisper());
    if (anyActive) add(1.6 * bigW, () => strikeAfterSilence(1.6, () => {
      // 1.6초의 죽은 공백 뒤 — 어둠이 일제히 떨어진다
      game.lightsOutT = 2.8;
      BK.audio.buzz(); BK.audio.thud(); BK.fx.addShake(2);
      toast('조명이 일제히 꺼졌다.');
    }));
    if (s < 75 && periphReady) add(1.5, () => {
      const spot = BK.randomFloorNear(game.world, game.player.x, game.player.y, 85, 130, 25);
      if (spot) { game.eyes = { x: spot.x, y: spot.y, t: 1.8 }; BK.audio.whisper(); periphFired(); }
    });
    if (s < 50 && periphReady) add(1.5, () => {
      const spot = BK.randomFloorNear(game.world, game.player.x, game.player.y, 70, 105, 25);
      if (spot) { game.halluc = { x: spot.x, y: spot.y, t: 0.22 }; BK.audio.whisper(); periphFired(); }
    });
    if (s < 60 && game.faceCD <= 0) add(0.9 * bigW, () => {
      game.faceCD = 40 + Math.random() * 28; // 즉시 쿨다운 (정적 동안 재발 방지)
      strikeAfterSilence(1.3, () => {        // 1.3초 죽은 공백 → 얼굴이 번쩍 들이친다
        game.faceFlashT = 0.14;
        game.jumpMon = 'smiler';
        BK.audio.stingShort();
        BK.fx.addShake(3);
        game.sanity = Math.max(1, game.sanity - 4);
      });
    });
    if (s < 55 && periphReady) add(1, () => {
      const spot = BK.randomFloorNear(game.world, game.player.x, game.player.y, 75, 110, 25);
      if (spot) { game.doppel = { x: spot.x, y: spot.y, t: 0.5 }; periphFired(); }
    });
    // 동생 목소리 환청 (거짓 희망) — 정신력 낮을수록 자주
    if (s < 72) add(1.6, () => {
      BK.audio.brotherCall(Math.random() * 2 - 1);
      toast(BRO_MSGS[(Math.random() * BRO_MSGS.length) | 0]);
      game.sanity = Math.max(1, game.sanity - 3);
    });
    // 벽의 얼굴
    if (s < 55 && periphReady) add(1.3, () => {
      const spot = BK.randomFloorNear(game.world, game.player.x, game.player.y, 40, 95, 30);
      if (spot) { game.wallFaceFx = { x: spot.x, y: spot.y - 6, t: 1.6 }; BK.audio.whisper(); periphFired(); }
    });
    // 거짓 속삭임 (불신)
    if (s < 42) add(1.1, () => toast(FAKE_MSGS[(Math.random() * FAKE_MSGS.length) | 0]));
    if (z === 1) {
      add(3, () => BK.audio.clank());
      add(2.4, () => BK.audio.screech());
      add(1.5, () => BK.audio.steamHiss());
    }
    if (z === 2) {
      add(2.5, () => BK.audio.childHum());
      add(1.5, () => { BK.audio.boxSlowdown(); toast('오르골이… 느려진다.'); });
    }
    let total = 0;
    for (const [w2] of pool) total += w2;
    let r = Math.random() * total;
    for (const [w2, fn] of pool) { r -= w2; if (r <= 0) { fn(); return; } }
  }

  // 끊임없는 환경/원거리 사운드 — 모든 구역의 긴장 유지
  function playAmbient() {
    const z = game.zoneIdx;
    const A = BK.audio;
    const pan = Math.random() * 2 - 1;
    const pool = [];
    const add = (w2, fn) => pool.push([w2, fn]);
    // 공통 환경음
    add(2.5, () => A.drip(pan));
    add(2.0, () => A.creak(pan));
    add(1.5, () => A.distantBang(pan));
    add(1.2, () => A.doorFar(pan));
    if (z === 0) {                     // 노란 방: 더 이상 지직거리기만 하지 않는다
      add(2.5, () => A.footstepFar(pan));
      add(1.5, () => A.whisper());
      add(1.2, () => A.dragFar(pan));
    } else if (z === 1) {              // 기계실
      add(3.0, () => A.pipeKnock(pan));
      add(2.0, () => A.dragFar(pan));
      add(2.0, () => A.footstepFar(pan));
      add(1.5, () => A.steamHiss());
    } else {                           // 놀이방
      add(2.5, () => A.childHum());
      add(2.0, () => A.footstepFar(pan));
      add(1.2, () => A.creak(pan));
    }
    // 괴물이 가까우면 그 방향에서 발소리/숨소리 (위치는 사운드로만 알려준다)
    const nm = game._nearM, nd = game._nearD;
    if (nm) {
      const mp = BK.clamp((nm.x - game.player.x) / 240, -1, 1);
      if (nd < 230) add(5, () => A.footstepFar(mp, true));
      if (nd < 120) add(4, () => A.breathClose(mp * 0.5));
      if (nd < 300 && (nm.kind === 'crawler')) add(4, () => A.crawlerClicks(BK.clamp(1 - nd / 300, 0, 1), mp));
      if (nd < 320 && (nm.kind === 'clown')) add(3, () => A.clownGiggle(BK.clamp(1 - nd / 320, 0, 1), mp));
      if (nd < 280 && (nm.kind === 'child')) add(3, () => A.childSob(BK.clamp(1 - nd / 280, 0, 1), mp));
    }
    let total = 0;
    for (const [w2] of pool) total += w2;
    let r = Math.random() * total;
    for (const [w2, fn] of pool) { r -= w2; if (r <= 0) { fn(); return; } }
  }

  // 형광등 밝기 (플리커/고장/스트로브/정전/추격 반영)
  function lightBright(l) {
    if (game.lightsOutT > 0) return 0;
    const t = game.time;
    // 기계실 정전: 발전기 켜기 전엔 대부분 죽어 있다. 단, 퓨즈를 꽂을수록 '구역별'로 불이 돌아온다(부분 전력).
    if (game.zoneIdx === 1 && !game.powerOn) {
      const inst = game.world.fusebox ? game.world.fusebox.installed : 0;
      const tier = (BK.hash2(l.phase, 1.7, 3.3) * 3) | 0; // 등마다 0/1/2 구역
      if (inst > tier) { // 이 구역은 들어왔다 — 정상보다 약간 약하게, 살짝 불안정
        let pb = 0.5 + 0.2 * Math.sin(t * 1.3 + l.phase);
        pb *= 0.82 + 0.18 * BK.hash2((t * 20) | 0, l.phase, 1.1);
        return pb * 0.9;
      }
      return BK.hash2((t * 2.5) | 0, l.phase, 6.1) > 0.9 ? 0.18 : 0.02;
    }
    let b = 0.72 + 0.22 * Math.sin(t * 1.3 + l.phase);
    b *= 0.88 + 0.12 * BK.hash2((t * 24) | 0, l.phase, 1.1);
    if (l.broken) b *= BK.hash2((t * 7) | 0, l.phase, 3.3) > 0.6 ? 1 : 0.12;
    if (l.strobe) b *= ((t * 9 + l.phase) % 1) > 0.5 ? 1 : 0;
    if (BK.hash2((t * 2.3) | 0, l.phase, 7.7) > 0.93) b *= 0.25;
    if (BK.hash2((t * 9) | 0, l.phase, 5.5) > 0.985) b = 0;
    if (game.flickerT > 0) b *= BK.hash2((t * 17) | 0, l.phase, 9.1) > 0.45 ? 1 : 0.08;
    // 추격/이벤트: 주변 형광등 싹 꺼지고 가끔만 명멸
    if (game.chaseFlick > 0.15) {
      const cf = game.chaseFlick;
      const on = BK.hash2((t * 21) | 0, l.phase, 4.2) > (0.3 + cf * 0.65);
      b *= on ? (1 - cf * 0.3) : (1 - cf) * 0.1;
    }
    return b;
  }

  // 한 점의 광량 (형광등 + 플레이어 광원) — 괴물 가시성 판정
  function lightAt(mx, my, cam, visLights, pcut) {
    let lit = 0;
    for (const v of visLights) {
      if (v.b <= 0.03) continue;
      const r = (v.l.red ? 30 : 48) * v.b;
      const d = Math.hypot(mx - cam.x - v.sx, my - cam.y - v.sy);
      if (d < r) lit = Math.max(lit, v.b * (1 - d / r));
    }
    if (pcut) {
      const d = Math.hypot(mx - cam.x - pcut.x, my - cam.y - pcut.y);
      if (d < pcut.r) lit = Math.max(lit, pcut.lamp * (1 - d / pcut.r) * 0.92);
    }
    return BK.clamp(lit, 0, 1);
  }

  // ---------------- 렌더 ----------------
  function render() {
    const w = game.world;
    bctx.fillStyle = '#000';
    bctx.fillRect(0, 0, VW, VH);
    if (!w) return;

    const shake = BK.fx.shakeOffset(1 / 60);
    const cam = { x: Math.round(game.cam.x + shake.x), y: Math.round(game.cam.y + shake.y) };
    const A = BK.assets, cfg = w.cfg, P = BK.CHUNK_PX;

    // 1) 지형
    const chunks = visibleChunks(16);
    for (const ch of chunks) {
      if (!ch.canvas) ch.canvas = BK.bakeChunk(w, ch);
      ch.used = game.time;
      bctx.drawImage(ch.canvas, ch.cx * P - cam.x, ch.cy * P - cam.y);
    }

    // 2) 형광등
    const visLights = [];
    for (const ch of chunks) {
      for (const l of ch.lights) {
        const sx = l.x - cam.x, sy = l.y - cam.y;
        if (sx < -50 || sy < -50 || sx > VW + 50 || sy > VH + 50) continue;
        const b = lightBright(l);
        visLights.push({ l, sx, sy, b });
        if (b > 0.03) {
          bctx.globalAlpha = b;
          bctx.drawImage(l.red ? A.redLamp : A.lightTube, sx - 7, sy - 4);
          bctx.globalAlpha = b * 0.65;
          bctx.drawImage(l.red ? A.pools.red : A.pools[cfg.light.pool], sx - 36, sy - 36);
          bctx.globalAlpha = 1;
        }
      }
    }

    // 플레이어 광원(추격/이벤트 시 반경 요동 + 깜빡)
    const p = game.player;
    let pr = 46 + game.sanity * 0.16 + Math.sin(game.time * 2.7) * 2;
    let plamp = 1;
    if (game.chaseFlick > 0.12) {
      const cf = game.chaseFlick;
      pr *= 1 - cf * (0.32 + 0.22 * Math.sin(game.time * 11 + 1.3)); // 반경 오락가락
      const on = BK.hash2((game.time * 19) | 0, 3.1, 2.2) > (0.18 + cf * 0.5);
      plamp = on ? 1 : 0.18; // 깜빡깜빡
    }
    const pcut = { x: p.x - cam.x, y: p.y - cam.y - 4, r: pr, lamp: plamp };

    // 3) 소품(바닥에 깔리는 낮은 것) + 아이템
    const ITEM_SPR = { note: A.note, fuse: A.fuse, gear: A.gear };
    const RELIC_SPR = { teddy: A.teddy, balloon: A.balloon, gear: A.gear, music: A.gear };
    for (const ch of chunks) {
      for (const pr2 of ch.props) {
        const sx = pr2.x - cam.x, sy = pr2.y - cam.y;
        if (sx < -30 || sy < -30 || sx > VW + 30 || sy > VH + 30) continue;
        if (pr2.kind === 'teddy') bctx.drawImage(A.teddy, Math.round(sx - 5), Math.round(sy - 9));
        else if (pr2.kind === 'ball') bctx.drawImage(A.ball, Math.round(sx - 4), Math.round(sy - 7));
        else if (pr2.kind === 'blocks') bctx.drawImage(A.blocks, Math.round(sx - 5), Math.round(sy - 7));
        else if (pr2.kind === 'writing') bctx.drawImage(A.writings[pr2.v], Math.round(sx - 7), Math.round(sy - 12));
        else if (pr2.kind === 'mural') bctx.drawImage(A.murals[pr2.leo ? 3 : Math.min(pr2.panel, 2)], Math.round(sx - 12), Math.round(sy - 16));
        else if (pr2.kind === 'corpse') {
          // 움찔 — 짧게 제자리에서 떨린다
          const tj = pr2.twitchT > 0 ? (Math.random() - 0.5) * 3 : 0;
          const tk = pr2.twitchT > 0 ? (Math.random() - 0.5) * 2 : 0;
          const cspr = pr2.turning ? A.corpseTurn[pr2.v || 0]
            : (pr2.faceShown ? A.corpseFace[pr2.v || 0] : A.corpse[pr2.v || 0]);
          bctx.drawImage(cspr, Math.round(sx - 10 + tj), Math.round(sy - 11 + tk));
        }
        else if (pr2.kind === 'pipe') bctx.drawImage(A.pipe, Math.round(sx - 4), Math.round(sy - 18));
        else if (pr2.kind === 'door') {
          const spr = pr2.horiz ? (pr2.closed ? A.doorHC : A.doorHO) : (pr2.closed ? A.doorVC : A.doorVO);
          // 부서지는 중이면 흔들림
          const sh = pr2.closed && pr2.breakT > 0 ? (Math.random() - 0.5) * 2 * Math.min(3, pr2.breakT) : 0;
          bctx.drawImage(spr, Math.round(sx - 8 + sh), Math.round(sy - 8));
        }
      }
      for (const pk of ch.pickups) {
        if (pk.got || pk.kind !== 'rock') continue;
        const sx = pk.x - cam.x, sy = pk.y - cam.y;
        if (sx < -20 || sy < -20 || sx > VW + 20 || sy > VH + 20) continue;
        bctx.drawImage(A.rock, Math.round(sx - 4), Math.round(sy - 5));
      }
      for (const b of ch.bottles) {
        if (b.got) continue;
        const sx = b.x - cam.x, sy = b.y - cam.y;
        if (sx < -20 || sy < -20 || sx > VW + 20 || sy > VH + 20) continue;
        bctx.drawImage(A.bottle, Math.round(sx - 5), Math.round(sy - 12));
      }
    }
    for (const it of w.items) {
      if (it.got) continue;
      const sx = it.x - cam.x, sy = it.y - cam.y;
      if (sx < -20 || sy < -20 || sx > VW + 20 || sy > VH + 20) continue;
      bctx.globalAlpha = 0.85 + 0.15 * Math.sin(game.time * 4);
      const spr = it.kind === 'relic' ? (RELIC_SPR[it.relicType] || A.teddy) : (ITEM_SPR[it.kind] || A.note);
      bctx.drawImage(spr, Math.round(sx - spr.width / 2), Math.round(sy - spr.height / 2));
      bctx.globalAlpha = 1;
    }
    // 들고 있는 유물 (플레이어 머리 위)
    if (game.carrying && !game.player.hidden) {
      const cs = RELIC_SPR[game.carrying] || A.teddy;
      const psx = Math.round(game.player.x - cam.x), psy = Math.round(game.player.y - cam.y);
      bctx.drawImage(cs, psx - cs.width / 2, psy - 26 + Math.round(Math.sin(game.time * 3)));
    }
    // 분전반 (L2)
    if (w.fusebox) {
      const fb = w.fusebox, sx = fb.x - cam.x, sy = fb.y - cam.y;
      if (sx > -24 && sy > -24 && sx < VW + 24 && sy < VH + 24) {
        bctx.drawImage(A.fusebox[BK.clamp(fb.installed, 0, 3)], Math.round(sx - 8), Math.round(sy - 20));
      }
    }

    // 휴면 균열(L0 출구) — 아직 벌리지 않은 벽의 상처. 알면 더 또렷이 지직거린다.
    if (w.exit && !w.exit.opened) {
      const sx = w.exit.x - cam.x, sy = w.exit.y - cam.y;
      if (sx > -50 && sy > -50 && sx < VW + 50 && sy < VH + 50) {
        const awake = w.exit.awakeT > 0;
        const a = awake ? 0.75 + 0.25 * Math.sin(game.time * 16) // 깨어남 — 격하게 꿈틀
          : (w.exitLocKnown ? 0.5 + 0.3 * Math.sin(game.time * 4) : 0.16);
        const jx = awake ? (Math.random() - 0.5) * 3 : 0, jy = awake ? (Math.random() - 0.5) * 3 : 0;
        bctx.globalAlpha = a;
        bctx.drawImage(A.rift[((game.time * (awake ? 14 : (w.exitLocKnown ? 6 : 2))) | 0) % 4], Math.round(sx - 16 + jx), Math.round(sy - 16 + jy));
        bctx.globalAlpha = 1;
      }
    }

    // 포털
    if (w.portal) {
      const sx = w.portal.x - cam.x, sy = w.portal.y - cam.y;
      if (sx > -50 && sy > -50 && sx < VW + 50 && sy < VH + 50) {
        if (w.portal.kind === 'rift') bctx.drawImage(A.rift[((game.time * 8) | 0) % 4], Math.round(sx - 16), Math.round(sy - 16));
        else if (w.portal.kind === 'elevator') bctx.drawImage(A.elevator, Math.round(sx - 15), Math.round(sy - 30));
        else bctx.drawImage(A.door, Math.round(sx - 11), Math.round(sy - 28));
      }
    }
    // 서브 루트: 비상 해치 — 바닥의 어두운 금속 환풍구 (알면 희미한 빛)
    if (w.hatch) {
      const sx = Math.round(w.hatch.x - cam.x), sy = Math.round(w.hatch.y - cam.y);
      if (sx > -20 && sy > -20 && sx < VW + 20 && sy < VH + 20) {
        bctx.fillStyle = '#101216'; bctx.fillRect(sx - 9, sy - 7, 18, 14);
        bctx.strokeStyle = '#2b3037'; bctx.lineWidth = 1;
        bctx.strokeRect(sx - 9.5, sy - 7.5, 19, 15);
        for (let i = -5; i <= 5; i += 3) { bctx.beginPath(); bctx.moveTo(sx + i, sy - 6); bctx.lineTo(sx + i, sy + 6); bctx.stroke(); }
        if (w.hatchKnown) BK.fx.glow(bctx, sx, sy, 13, '120,180,210', 0.10 + 0.06 * Math.sin(game.time * 3));
      }
    }

    // 4) 액터 (y 정렬). 괴물은 빛 안에서만 보인다 → lightAt 알파
    const actors = [{ y: p.y, draw: () => p.draw(bctx, cam) }];
    for (const m of game.monsters) {
      if (!m.active) continue;
      const onScr = game.onScreen(m.x, m.y, 40);
      // la = 플레이어 광원 포함 광량 → 꺼진 것의 '굳음' 판정에 쓰임 (다음 프레임 AI가 읽는다)
      const la = onScr ? lightAt(m.x, m.y, cam, visLights, pcut) : 0;
      m._onScreen = onScr; m._litLevel = la;
      if (!onScr) continue;
      // 어둠에선 괴물이 보이지 않는다 — 형광등 빛 웅덩이 안에 들어와야만 드러난다(그 밖엔 소리로만 감지).
      // 단, 꺼진 것(shade)은 '빛에 굳고 눈을 떼면 다가오는' 정체상 플레이어 광원에도 드러난다.
      const visLa = m.kind === 'shade' ? la : lightAt(m.x, m.y, cam, visLights, null);
      if (visLa <= 0.02) continue;
      actors.push({ y: m.y, draw: () => m.draw(bctx, cam, visLa) });
    }
    // 키 큰 구조물/마네킹/괴인형 — y정렬에 포함
    const TALL = {
      mannequin: { spr: A.mannequin, ox: 7, oy: 25 },
      crate: { spr: A.crate, ox: 8, oy: 13 },
      chair: { spr: A.chair, ox: 7, oy: 16 },
      drum: { spr: A.drum, ox: 7, oy: 16 },
      console: { spr: A.console, ox: 9, oy: 14 },
      kchair: { spr: A.kchair, ox: 5, oy: 11 },
      kdesk: { spr: A.kdesk, ox: 9, oy: 10 },
      locker: { spr: A.locker, ox: 8, oy: 26 },
      pushcrate: { spr: A.heavycrate, ox: 8, oy: 14 },
    };
    for (const ch of chunks) {
      for (const pr2 of ch.props) {
        const t = TALL[pr2.kind];
        if (!t) continue;
        const sx = pr2.x - cam.x, sy = pr2.y - cam.y;
        if (sx < -30 || sy < -40 || sx > VW + 30 || sy > VH + 40) continue;
        const jx = 0, jy = 0;
        // 플레이어가 숨은 사물함은 열린 모습
        let spr = t.spr;
        if (pr2.kind === 'locker' && game.player.hidden &&
            Math.hypot(pr2.x - game.player.x, pr2.y + 4 - game.player.y) < 8) spr = A.lockerOpen;
        actors.push({
          y: pr2.y,
          draw: () => bctx.drawImage(spr, Math.round(sx - t.ox + jx), Math.round(sy - t.oy + jy)),
        });
      }
    }
    // 날아가는 발사체 (돌 / 아몬드 워터)
    if (game.projectile) {
      const pj = game.projectile;
      const spr = pj.type === 'almond' ? A.bottle : A.rock;
      actors.push({ y: pj.y + 9999, draw: () => bctx.drawImage(spr, Math.round(pj.x - cam.x - spr.width / 2), Math.round(pj.y - cam.y - spr.height / 2)) });
    }
    if (game.doppel) {
      const d = game.doppel;
      actors.push({
        y: d.y,
        draw: () => {
          bctx.globalAlpha = 0.85;
          bctx.drawImage(A.playerDark, Math.round(d.x - cam.x - 8), Math.round(d.y - cam.y - 16));
          bctx.globalAlpha = 1;
        },
      });
    }
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();

    if (game.halluc) {
      const sx = Math.round(game.halluc.x - cam.x), sy = Math.round(game.halluc.y - cam.y);
      bctx.globalAlpha = 0.5;
      bctx.drawImage(A.mon.smiler[0], sx - 10, sy - 26);
      bctx.globalAlpha = 1;
    }

    // 5) 어둠 + 빛 컷아웃
    const cuts = [];
    if (game.state !== 'title' && game.state !== 'customize') {
      // 숨는 중에는 시야가 사물함 틈으로 좁아진다
      cuts.push({ x: pcut.x, y: pcut.y, r: game.player.hidden ? 24 : pcut.r, a: plamp });
    }
    for (const v of visLights) {
      if (v.b <= 0.03) continue;
      if (v.l.red) cuts.push({ x: v.sx, y: v.sy, r: 30 * v.b, a: 0.55 * v.b });
      else cuts.push({ x: v.sx, y: v.sy, r: 48 * v.b, a: Math.min(1, 1.1 * v.b) });
    }
    if (w.portal) cuts.push({ x: w.portal.x - cam.x, y: w.portal.y - cam.y, r: 26 + Math.sin(game.time * 5) * 4, a: 0.9 });
    // 알고 있는 휴면 균열도 어둠 속에서 어렴풋이 빛난다
    if (w.exit && !w.exit.opened && w.exitLocKnown) cuts.push({ x: w.exit.x - cam.x, y: w.exit.y - cam.y, r: 20 + Math.sin(game.time * 4) * 3, a: 0.6 });
    if (w.hatch && w.hatchKnown) cuts.push({ x: w.hatch.x - cam.x, y: w.hatch.y - cam.y, r: 16 + Math.sin(game.time * 4) * 2, a: 0.5 });
    let darkA = (game.state === 'title' || game.state === 'customize') ? 0.965 : cfg.dark;
    if (game.zoneIdx === 1 && !game.powerOn) { // 정전 — 퓨즈를 꽂을수록 어둠이 옅어진다(부분 전력)
      const inst = w.fusebox ? w.fusebox.installed : 0;
      darkA = Math.min(0.985, darkA + 0.022 * (1 - inst / 3));
    }
    if (game.lightsOutT > 0) darkA = 0.984;
    if (game.player.hidden) darkA = Math.max(darkA, 0.965);
    if (game.flickerT > 0) darkA += (BK.hash2((game.time * 13) | 0, 1, 2) - 0.5) * 0.04;
    if (game.chaseFlick > 0.15) darkA += game.chaseFlick * 0.015;
    BK.fx.renderDarkness(bctx, cuts, darkA);

    // 6) 어둠 위 글로우 (괴물은 더 이상 어둠 위에 안 그림 — 빛 속에서만 보인다)
    // 아이 영혼 — 어둠 속에서도 은은히 빛난다
    if (w.spirits) for (const s of w.spirits) {
      if (s.freed) continue;
      const cracked = s.cracks > 0;
      const jy = cracked ? (Math.random() - 0.5) * s.cracks * 1.3 : 0; // 금이 갈수록 떨린다
      const sx = Math.round(s.x - cam.x), sy = Math.round(s.y - cam.y + Math.sin(game.time * 2 + s.bob) * 2 + jy);
      if (sx < -20 || sy < -24 || sx > VW + 20 || sy > VH + 24) continue;
      // 금이 갈수록 따뜻한 노랑 → 핏빛/잿빛으로 식어 간다
      let col = s.isBrother ? '230,210,120' : '180,212,236';
      if (cracked) col = ['230,210,120', '196,150,116', '156,120,118', '120,110,116'][BK.clamp(s.cracks, 0, 3)];
      BK.fx.glow(bctx, sx, sy - 4, 15, col, cracked ? 0.12 + 0.06 * Math.sin(game.time * 12) : 0.12);
      bctx.globalAlpha = (cracked ? 0.62 : 0.5) + 0.22 * Math.sin(game.time * (cracked ? 9 : 3) + s.bob);
      bctx.drawImage(s.isBrother ? A.spiritBro : A.spirit, sx - 7, sy - 12);
      bctx.globalAlpha = 1;
      if (cracked) { // 표면을 가르는 검은 금
        bctx.strokeStyle = `rgba(28,18,26,${0.5 + 0.16 * s.cracks})`;
        bctx.lineWidth = 1;
        for (let i = 0; i < s.cracks; i++) {
          const a = i * 2.2 + s.bob;
          bctx.beginPath();
          bctx.moveTo(sx, sy - 6);
          bctx.lineTo(sx + Math.cos(a) * 5, sy - 6 + Math.sin(a) * 6);
          bctx.lineTo(sx + Math.cos(a) * 7 + 2, sy - 2 + Math.sin(a) * 7);
          bctx.stroke();
        }
      }
    }
    // 해방 반짝임 (정화=흰빛 / 파괴=핏빛)
    if (game.spiritFx) {
      const f = game.spiritFx, a = BK.clamp(f.t / (f.shatter ? 1.0 : 1.6), 0, 1);
      const col = f.shatter ? '235,70,45' : '230,240,255';
      BK.fx.glow(bctx, f.x - cam.x, f.y - cam.y - 4, 34 * (1.5 - a), col, (f.shatter ? 0.6 : 0.45) * a);
    }
    // 아몬드 워터 물보라
    if (game.almondSplash) {
      const f = game.almondSplash, a = BK.clamp(f.t / 0.7, 0, 1);
      BK.fx.glow(bctx, f.x - cam.x, f.y - cam.y, 40 * (1.3 - a), '150,220,235', 0.4 * a);
    }
    // 분전반 표시등 — 정전 속에서도 보이는 빨간 점등
    if (w.fusebox && !game.powerOn) {
      const sx = w.fusebox.x - cam.x, sy = w.fusebox.y - cam.y;
      if (sx > -20 && sy > -20 && sx < VW + 20 && sy < VH + 20) {
        BK.fx.glow(bctx, sx, sy - 1, 11, '210,40,40', 0.12 + 0.07 * Math.sin(game.time * 4));
      }
    }
    // 등 뒤의 것 — 어둠 속에서도 흐릿한 실루엣 (app 가시성)
    if (game.stalker) {
      const s = game.stalker;
      const sx = Math.round(s.x - cam.x), sy = Math.round(s.y - cam.y);
      if (sx > -30 && sy > -50 && sx < VW + 30 && sy < VH + 30) {
        const jit = s.app > 0.5 ? (Math.random() - 0.5) * 2 : 0;
        bctx.globalAlpha = BK.clamp(s.app * 0.82, 0, 1);
        bctx.drawImage(A.stalker, Math.round(sx - 11 + jit), Math.round(sy - 44));
        bctx.globalAlpha = 1;
      }
    }
    // 벽의 얼굴 — 떠올랐다 사라짐
    if (game.wallFaceFx) {
      const f = game.wallFaceFx;
      const sx = Math.round(f.x - cam.x), sy = Math.round(f.y - cam.y);
      if (sx > -20 && sy > -20 && sx < VW + 20 && sy < VH + 20) {
        bctx.globalAlpha = BK.clamp(Math.min(1, f.t) * (0.55 + 0.45 * Math.sin(game.time * 7)), 0, 1);
        bctx.drawImage(A.wallFaceFx, sx - 8, sy - 10);
        bctx.globalAlpha = 1;
      }
    }
    if (game.eyes) {
      const sx = Math.round(game.eyes.x - cam.x), sy = Math.round(game.eyes.y - cam.y);
      if ((game.time * 3 % 1) > 0.12) {
        bctx.fillStyle = 'rgba(255,210,200,0.9)';
        bctx.fillRect(sx - 3, sy - 14, 2, 2);
        bctx.fillRect(sx + 2, sy - 14, 2, 2);
      }
    }
    for (const it of w.items) {
      if (it.got) continue;
      const sx = it.x - cam.x, sy = it.y - cam.y;
      if (sx < -10 || sy < -10 || sx > VW + 10 || sy > VH + 10) continue;
      const col = it.kind === 'note' ? '255,250,220' : (it.kind === 'fuse' ? '255,150,120' : '255,220,130');
      BK.fx.glow(bctx, sx, sy - 2, 9, col, 0.10 + 0.06 * Math.sin(game.time * 4));
    }
    for (const ch of chunks) {
      for (const b of ch.bottles) {
        if (b.got) continue;
        const sx = b.x - cam.x, sy = b.y - cam.y;
        if (sx < -10 || sy < -10 || sx > VW + 10 || sy > VH + 10) continue;
        BK.fx.glow(bctx, sx, sy - 5, 8, '160,220,240', 0.08 + 0.05 * Math.sin(game.time * 3 + 1));
      }
    }
    if (w.portal) {
      const sx = w.portal.x - cam.x, sy = w.portal.y - cam.y;
      if (sx > -60 && sy > -60 && sx < VW + 60 && sy < VH + 60) {
        const col = w.portal.kind === 'rift' ? '150,70,220' : (w.portal.kind === 'elevator' ? '180,210,255' : '240,250,255');
        BK.fx.glow(bctx, sx, sy - 8, 34, col, 0.22 + 0.1 * Math.sin(game.time * 5));
      }
    }

    // 7) 정신력/피날레 연출 + 비네트 + 그레인
    const mad = BK.clamp((45 - game.sanity) / 45, 0, 1);
    if (mad > 0) { bctx.fillStyle = `rgba(70,90,40,${mad * 0.13})`; bctx.fillRect(0, 0, VW, VH); }
    if (game.finale) { bctx.fillStyle = `rgba(130,15,10,${0.07 + 0.05 * Math.sin(game.time * 6)})`; bctx.fillRect(0, 0, VW, VH); }
    BK.fx.drawVignette(bctx, mad * 0.5 + (game.finale ? 0.3 : 0) + game.chaseFlick * 0.25);
    BK.fx.drawGrain(bctx, 0.35 + mad * 0.4);

    present(mad + (game.finale ? 0.4 : 0));
    drawHUD();

    if (game.faceFlashT > 0) drawFaceFlash();
    if (game.state === 'jumpscare') drawJumpscare();
  }

  // 저해상도 버퍼 → 화면 (정신력 낮으면 가로 밴드 왜곡)
  function present(mad) {
    dctx.fillStyle = '#000';
    dctx.fillRect(0, 0, canvas.width, canvas.height);
    const warp = mad * 3.2;
    if (warp > 0.25 && (game.state === 'play' || game.state === 'note')) {
      const band = 8;
      for (let y = 0; y < VH; y += band) {
        const off = Math.round(Math.sin(game.time * 2.1 + y * 0.06) * warp);
        dctx.drawImage(buf, 0, y, VW, band, off * S, y * S, VW * S, band * S);
      }
    } else {
      dctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
    }
    if (BK.fx.flashA > 0.01) {
      dctx.save();
      dctx.globalAlpha = BK.clamp(BK.fx.flashA, 0, 1);
      dctx.fillStyle = BK.fx.flashCol;
      dctx.fillRect(0, 0, canvas.width, canvas.height);
      dctx.restore();
    }
  }

  function bar(x, y, w, h, ratio, fill) {
    dctx.fillStyle = 'rgba(0,0,0,0.55)';
    dctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    dctx.strokeStyle = 'rgba(216,204,138,0.5)';
    dctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    dctx.fillStyle = fill;
    dctx.fillRect(x, y, Math.max(0, w * ratio), h);
  }

  function drawArrow(tx, ty, color, alpha) {
    const sx = (tx - game.cam.x) * S, sy = (ty - game.cam.y) * S;
    if (sx > 0 && sy > 0 && sx < canvas.width && sy < canvas.height) return;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const m = 34;
    const ax = BK.clamp(cx + Math.cos(ang) * 1000, m, canvas.width - m);
    const ay = BK.clamp(cy + Math.sin(ang) * 1000, m, canvas.height - m);
    dctx.save();
    dctx.translate(ax, ay);
    dctx.rotate(ang);
    dctx.globalAlpha = alpha;
    dctx.fillStyle = color;
    dctx.beginPath();
    dctx.moveTo(10, 0); dctx.lineTo(-7, -7); dctx.lineTo(-7, 7);
    dctx.closePath();
    dctx.fill();
    dctx.restore();
  }

  function drawHUD() {
    if (!['play', 'note', 'pause', 'jumpscare'].includes(game.state)) return;
    const cfg = game.world.cfg;
    dctx.font = "13px 'Galmuri11', monospace";
    dctx.textBaseline = 'top';

    dctx.fillStyle = '#d8cc8a';
    dctx.fillText('정신력', 18, 14);
    const sr = game.sanity / 100;
    bar(18, 30, 160, 10, sr, `hsl(${sr * 52}, 75%, 52%)`);
    bar(18, 46, 110, 6, game.player.stamina / 100, '#7da7b8');
    dctx.font = "12px 'Galmuri11', monospace";
    dctx.fillStyle = '#c9bd86';
    dctx.fillText(`돌 ×${game.throwables}`, 18, 58);
    dctx.fillStyle = '#9fd4e0';
    dctx.fillText(`아몬드 ×${game.almond}`, 86, 58);
    if (game.carrying) {
      dctx.fillStyle = '#e8d49a';
      dctx.fillText(`들고 있음: ${RELIC_NAME[game.carrying]}`, 18, 72);
    }
    if (game.fuseHeld > 0) {
      dctx.fillStyle = '#e8c84a';
      dctx.fillText(`퓨즈 ×${game.fuseHeld}`, 18, 72);
    }
    dctx.font = "13px 'Galmuri11', monospace";

    dctx.textAlign = 'right';
    dctx.fillStyle = '#8a7f4e';
    dctx.fillText(`${cfg.name} — ${cfg.sub}`, canvas.width - 18, 14);
    dctx.fillStyle = '#d8cc8a';
    if (game.zoneIdx === 0) {
      // L0: 수집이 아니라 '균열을 찾아 깨우고 벌리기'가 목표. 위치/여는 법을 따로, 단계로 안다.
      const w0 = game.world, ex0 = w0.exit;
      let obj;
      if (ex0 && ex0.opened) obj = '균열로 들어가라';
      else if (ex0 && ex0.awakeT > 0) obj = '지금! 상처를 벌려라(E) →';
      else if (w0.exitMethodSure) obj = '균열 → 돌로 깨우고, 벌려라';
      else if (w0.exitLocKnown && (w0.exitWakeKnown || w0.exitPryKnown)) obj = '균열을 찾았다 — 여는 법을 맞춰 봐라';
      else if (w0.exitLocKnown) obj = '균열을 찾았다 — 여는 법은?';
      else obj = '빠져나갈 단서를 찾아라';
      dctx.fillText(obj, canvas.width - 18, 32);
    } else {
      dctx.fillText(`${cfg.quest.label} ${questGotCount()} / ${cfg.quest.count}`, canvas.width - 18, 32);
    }
    dctx.fillStyle = '#8a7f4e';
    dctx.fillText(fmtTime(game.playT), canvas.width - 18, 50);
    if (game.zoneIdx !== 0 && (game.world.portal || game.world.portalPending)) {
      const col = game.finale ? '255,80,60' : '190,120,255';
      dctx.fillStyle = `rgba(${col},${0.7 + 0.3 * Math.sin(game.time * 5)})`;
      dctx.fillText(cfg.quest.done, canvas.width - 18, 68);
    }
    dctx.textAlign = 'left';

    dctx.textAlign = 'center';
    dctx.font = "14px 'Galmuri11', monospace";
    game.msgs.forEach((m, i) => {
      const a = BK.clamp(m.t / 1.2, 0, 1);
      dctx.fillStyle = `rgba(0,0,0,${0.5 * a})`;
      const tw = dctx.measureText(m.text).width;
      const y = canvas.height - 64 + i * 22;
      dctx.fillRect(canvas.width / 2 - tw / 2 - 10, y - 3, tw + 20, 20);
      dctx.fillStyle = `rgba(222,210,150,${a})`;
      dctx.fillText(m.text, canvas.width / 2, y);
    });
    dctx.textAlign = 'left';

    // 상호작용 프롬프트
    if (game.state === 'play') {
      let prompt = null;
      if (game.player.hidden) prompt = '[E] 사물함에서 나오기';
      else if (game.nearInteract) {
        const it = game.nearInteract;
        if (it.want !== undefined) {
          prompt = game.carrying === it.want ? '[E] 돌려주고 영혼을 보내기'
            : (game.carrying ? '[E] (이 아이가 찾는 게 아니다)' : '잃어버린 것을 찾아 와야 한다');
        } else if (it.installed !== undefined) {
          prompt = game.fuseHeld > 0 ? `[E] 퓨즈 ${game.fuseHeld}개 꽂기` : `분전반 (${it.installed}/3) — 퓨즈가 필요하다`;
        } else if (it.kind === 'exit') {
          {
            const ex2 = game.world.exit;
            if (ex2 && ex2.awakeT > 0) prompt = '[E] 벌어진 상처를 벌린다 — 지금!';
            else if (game.world.exitWakeKnown || game.world.exitMethodSure) prompt = '[E] 상처 — 먼저 돌(Q)로 깨워라';
            else if (game.world.exitLocKnown) prompt = '[E] 벽의 상처 — 손을 넣어 본다…?';
            else prompt = '[E] 벽의 상처 — 여는 법을 모른다';
          }
        } else if (it.kind === 'locker') prompt = '[E] 사물함에 숨기';
        else if (it.kind === 'door') prompt = it.closed ? '[E] 문 열기' : '[E] 문 닫기';
        else if (it.kind === 'pushcrate') prompt = '[E] 가구 밀기';
      }
      if (prompt) {
        dctx.textAlign = 'center';
        dctx.font = "14px 'Galmuri11', monospace";
        const tw = dctx.measureText(prompt).width;
        dctx.fillStyle = 'rgba(0,0,0,0.55)';
        dctx.fillRect(canvas.width / 2 - tw / 2 - 10, canvas.height - 112, tw + 20, 22);
        dctx.fillStyle = `rgba(255,233,138,${0.7 + 0.3 * Math.sin(game.time * 6)})`;
        dctx.fillText(prompt, canvas.width / 2, canvas.height - 109);
        dctx.textAlign = 'left';
      }
    }

    if (game.state === 'play') {
      const w = game.world;
      if (w.portal) {
        const col = w.portal.kind === 'door' ? '#e8f4ff' : '#c084f0';
        drawArrow(w.portal.x, w.portal.y, col, 0.55 + 0.35 * Math.sin(game.time * 6));
      } else if (w.portalPending) {
        const P = BK.CHUNK_PX;
        drawArrow(w.portalPending.cx * P + P / 2, w.portalPending.cy * P + P / 2, '#c084f0', 0.55 + 0.35 * Math.sin(game.time * 6));
      } else if (w.exit && !w.exit.opened && w.exitLocKnown &&
                 (w.exitWakeKnown || w.exitPryKnown || w.exitMethodSure || w.exit.awakeT > 0)) {
        drawArrow(w.exit.x, w.exit.y, w.exit.awakeT > 0 ? '#e070ff' : '#c084f0', 0.55 + 0.35 * Math.sin(game.time * 6));
      } else if (w.hatch && w.hatchKnown) {
        drawArrow(w.hatch.x, w.hatch.y, '#7fb4cc', 0.4 + 0.25 * Math.sin(game.time * 5)); // 비상 해치 (서브)
      } else if (game.pingShow > 0 && game.pingTarget) {
        drawArrow(game.pingTarget.x, game.pingTarget.y, '#d8cc8a', BK.clamp(game.pingShow, 0, 1) * 0.45);
      }
    }
  }

  function drawFaceFlash() {
    const W = canvas.width, H = canvas.height;
    const jx = (Math.random() - 0.5) * 30, jy = (Math.random() - 0.5) * 30;
    dctx.fillStyle = 'rgba(2,1,4,0.9)';
    dctx.fillRect(0, 0, W, H);
    // 핏빛 배광 번쩍
    const rg = dctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, H * 0.75);
    rg.addColorStop(0, 'rgba(120,10,8,0.5)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = rg; dctx.fillRect(0, 0, W, H);
    const spr = BK.assets.mon[game.jumpMon][2];
    const s = (H * 0.9) / spr.height;
    dctx.save();
    dctx.imageSmoothingEnabled = false;
    dctx.translate(W / 2 + jx - spr.width * s / 2, H / 2 + jy - spr.height * s / 2);
    dctx.scale(s, s);
    dctx.globalAlpha = 0.35;                        // 색수차 고스트
    dctx.drawImage(spr, -1.5, 0);
    dctx.drawImage(spr, 1.5, 0.7);
    dctx.globalAlpha = 1;
    dctx.drawImage(spr, 0, 0);
    dctx.restore();
    // 주사선
    dctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = ((Math.random() * 3) | 0); y < H; y += 4) dctx.fillRect(0, y, W, 1);
  }

  const easeOutBack = (x) => { const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  // 괴물별 점프스케어 색 테마 — 꺼진 것은 피 대신 차가운 빛과 돌가루를 쏟는다
  const JS_THEME = {
    smiler: { pulse: '150,14,9', flat: '100,0,0', blood: '#7a0608', bloodHi: '#a01010' },
    crawler: { pulse: '120,10,10', flat: '90,0,4', blood: '#5c0406', bloodHi: '#8a0d0e' },
    clown: { pulse: '150,14,9', flat: '100,0,0', blood: '#7a0608', bloodHi: '#a01010' },
    // 꺼진 것: 피 대신 균열에서 터져 나온 빛이 튄다
    shade: { pulse: '110,132,160', flat: '58,74,102', blood: '#cdd4bc', bloodHi: '#ffffff' },
  };

  // 동적 고어 점프스케어: 돌진 → 목 꺾임 → 입 찢어짐 → 피 쏟기
  function drawJumpscare() {
    const t = game.jumpT;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const g = dctx;
    const th = JS_THEME[game.jumpMon] || JS_THEME.smiler;

    // 격렬한 흔들림 (후반 증가)
    const shakeAmp = 7 + t * 26;
    const jx = (Math.random() - 0.5) * shakeAmp, jy = (Math.random() - 0.5) * shakeAmp;

    g.fillStyle = '#040106';
    g.fillRect(0, 0, W, H);
    // 맥동하는 배광
    const pulse = 0.35 + 0.3 * Math.abs(Math.sin(t * 34));
    const rg = g.createRadialGradient(cx + jx, cy + jy, 20, cx, cy, 560);
    rg.addColorStop(0, `rgba(${th.pulse},${pulse})`);
    rg.addColorStop(0.6, `rgba(${th.flat},0.3)`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);

    // 돌진(스케일 오버슈트)
    const rush = t < 0.18 ? t / 0.18 : 1;
    const scale = (0.32 + 0.92 * easeOutBack(rush)) * (H / 250);
    // 목 꺾임: 0.22s에 홱 기울고, 이후 꺾인 채 경련
    let tilt = 0;
    if (t > 0.22) {
      const ct = Math.min(1, (t - 0.22) / 0.1);
      tilt = easeOutBack(ct) * 0.55;
      if (ct >= 1) tilt = 0.55 + Math.sin(t * 36) * 0.05;
    }
    // 입/미소 벌어짐
    const gape = BK.clamp((t - 0.08) / 0.42, 0, 1);
    // 전진 럴치(살짝 앞뒤로 들썩)
    const lurch = Math.sin(t * 24) * 6 * t;

    // 1) 얼굴을 고해상도 오프스크린에 그린다 (회전 포함)
    const JW = jumpBuf.width, JH = jumpBuf.height;
    jbx.clearRect(0, 0, JW, JH);
    jbx.save();
    jbx.translate(JW / 2, JH / 2 + 20);
    jbx.rotate(tilt);
    jbx.imageSmoothingEnabled = true;
    drawGoreFace(jbx, game.jumpMon, gape, t);
    jbx.restore();

    // 2) 메인에 블러+색보정으로 합성 — 도형 레이어 경계가 살처럼 녹는다
    const dispScale = scale * 0.92;
    g.save();
    g.imageSmoothingEnabled = true;
    g.translate(cx + jx, cy + jy - H * 0.03 + lurch);
    g.scale(dispScale, dispScale);
    // 색수차: R/G/B 채널을 미세하게 어긋나게 세 번 합성
    const ca = 1.4 + t * 1.6;
    g.globalCompositeOperation = 'lighter';
    g.filter = `blur(${2 + t * 1.1}px) saturate(1.45) brightness(0.5)`;
    g.globalAlpha = 0.9;
    drawTinted(g, jumpBuf, '#ff2b2b', -ca, 0, JW, JH);   // 빨강
    drawTinted(g, jumpBuf, '#27ff44', 0, 0, JW, JH);     // 초록
    drawTinted(g, jumpBuf, '#2b6bff', ca, 0, JW, JH);    // 파랑
    g.filter = 'none';
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.restore();

    // 3) 입에서/가장자리에서 번지는 피
    if (t > 0.35 && game.jumpBlood) drawBlood((t - 0.35) / 0.7);
    // 화면 균열 (후반)
    if (t > 0.5 && game.jumpCracks) drawCracks(BK.clamp((t - 0.5) / 0.3, 0, 1));

    // 4) 후처리 — 필름 그레인
    g.save();
    g.globalAlpha = 0.10 + 0.06 * Math.random();
    g.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 1400; i++) {
      const v = (Math.random() * 255) | 0;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2, 2);
    }
    g.restore();
    // 글리치 밴드
    if (Math.random() < 0.6) {
      const by = (Math.random() * H) | 0, bh = 5 + ((Math.random() * 40) | 0);
      g.drawImage(canvas, 0, by, W, bh, (Math.random() - 0.5) * 60, by, W, bh);
    }
    // 5) 강한 비네트 (가장자리를 짙게 — 얼굴만 떠오르게)
    const vg = g.createRadialGradient(cx, cy, H * 0.18, cx, cy, H * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.75, 'rgba(8,0,2,0.55)');
    vg.addColorStop(1, 'rgba(0,0,0,0.95)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    // 색 맥동 (괴물 테마)
    g.fillStyle = `rgba(${th.flat},${0.08 + 0.1 * Math.abs(Math.sin(t * 46))})`;
    g.fillRect(0, 0, W, H);
  }

  // 단색 틴트 후 오프셋 합성 (색수차용) — 임시 캔버스 재사용
  const tintBuf = (() => { const c = document.createElement('canvas'); c.width = 440; c.height = 480; return c; })();
  const tintCtx = tintBuf.getContext('2d');
  function drawTinted(g, src, col, ox, oy, w, h) {
    tintCtx.clearRect(0, 0, w, h);
    tintCtx.globalCompositeOperation = 'source-over';
    tintCtx.drawImage(src, 0, 0);
    tintCtx.globalCompositeOperation = 'multiply';
    tintCtx.fillStyle = col;
    tintCtx.fillRect(0, 0, w, h);
    tintCtx.globalCompositeOperation = 'destination-in';
    tintCtx.drawImage(src, 0, 0);
    tintCtx.globalCompositeOperation = 'source-over';
    g.drawImage(tintBuf, -w / 2 + ox, -h / 2 + oy);
  }

  // ===== 고어 디테일 헬퍼 (로컬 좌표) =====
  const jit = (a) => (Math.random() - 0.5) * 2 * (a || 2);
  // 피부 질감: 입체 그라디언트 + 모공/반점 + 얼룩 음영
  function goreSkin(g, cx, cy, rx, ry, lit, mid, dark) {
    const rg = g.createRadialGradient(cx - rx * 0.3, cy - ry * 0.35, 4, cx, cy, Math.max(rx, ry) * 1.1);
    rg.addColorStop(0, lit); rg.addColorStop(0.55, mid); rg.addColorStop(1, dark);
    g.save();
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = rg; g.fillRect(cx - rx - 4, cy - ry - 4, rx * 2 + 8, ry * 2 + 8);
    // 모공/반점
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random();
      const px = cx + Math.cos(a) * rx * rr, py = cy + Math.sin(a) * ry * rr;
      const v = Math.random();
      g.fillStyle = v > 0.55 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)';
      g.fillRect(px, py, 1 + (Math.random() * 2 | 0), 1 + (Math.random() * 2 | 0));
    }
    // 얼룩진 음영 패치
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2, rr = 0.4 + Math.random() * 0.5;
      g.fillStyle = `rgba(${30 + Math.random() * 30 | 0},${10 + Math.random() * 14 | 0},${8 + Math.random() * 10 | 0},0.18)`;
      g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, 10 + Math.random() * 22, 7 + Math.random() * 16, Math.random() * 3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  // 충혈된 실핏줄
  function goreVeins(g, cx, cy, spread, col, n) {
    g.strokeStyle = col; g.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, len = spread * (0.5 + Math.random());
      let x = cx + Math.cos(a) * spread * 0.2, y = cy + Math.sin(a) * spread * 0.2;
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        const na = a + jit(0.6), nl = len / 4;
        x += Math.cos(na) * nl; y += Math.sin(na) * nl;
        g.lineTo(x, y); g.lineWidth *= 0.7;
      }
      g.stroke();
    }
  }
  // 침/점액 가닥
  function goreDrool(g, x, y, len, w) {
    g.strokeStyle = 'rgba(225,232,210,0.5)'; g.lineWidth = w || 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + jit(3), y + len * 0.5, x + jit(5), y + len);
    g.stroke();
    g.fillStyle = 'rgba(225,232,210,0.5)'; g.beginPath(); g.arc(x + jit(5), y + len, (w || 2.5) * 0.9, 0, Math.PI * 2); g.fill();
  }
  // 개별 치아 (잇몸 + 누런 음영 + 균열) — pal로 돌 이빨 등 변주
  function goreTeeth(g, x0, y0, x1, y1, count, h, down, pal) {
    const P = pal || { gum: '#6e2e2e', a: '#efe6c8', b: '#d8c89e', c: '#b09a6a', crack: 'rgba(90,60,30,0.5)' };
    const dir = down ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const tx = BK.lerp(x0, x1, i / (count - 1));
      const tw = ((x1 - x0) / count) * 0.82;
      const hh = h * (0.7 + Math.random() * 0.5);
      // 잇몸
      g.fillStyle = P.gum; g.fillRect(tx - tw / 2, y0, tw, 5 * dir);
      // 치아
      const tg = g.createLinearGradient(tx, y0, tx, y0 + hh * dir);
      tg.addColorStop(0, P.a); tg.addColorStop(0.7, P.b); tg.addColorStop(1, P.c);
      g.fillStyle = tg;
      g.beginPath();
      g.moveTo(tx - tw / 2, y0); g.lineTo(tx + tw / 2, y0);
      g.lineTo(tx + tw / 2 - 2, y0 + hh * dir); g.lineTo(tx - tw / 2 + 2, y0 + hh * dir);
      g.closePath(); g.fill();
      // 균열/음영
      g.strokeStyle = P.crack; g.lineWidth = 1;
      g.beginPath(); g.moveTo(tx, y0 + 2 * dir); g.lineTo(tx + jit(2), y0 + hh * dir * 0.8); g.stroke();
    }
  }
  const STONE_TEETH = { gum: '#3a3a44', a: '#e8ecdc', b: '#c2c4b4', c: '#8e9084', crack: 'rgba(60,64,58,0.5)' };
  // 벌어진 구멍 사이로 늘어나는 살/점액 가닥
  function goreStrands(g, x0, y0, x1, y1, n, col) {
    g.strokeStyle = col; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const sx = BK.lerp(x0, x1, n < 2 ? 0.5 : i / (n - 1)) + jit(5);
      const sy = y0 + jit(3);
      g.lineWidth = 1 + Math.random() * 1.6;
      g.beginPath(); g.moveTo(sx, sy);
      g.quadraticCurveTo(sx + jit(7), (sy + y1) / 2 + jit(6), sx + jit(9), y1 + jit(3));
      g.stroke();
    }
  }

  // 괴물별 고어 얼굴 (로컬 좌표, 중심 0,0 / 반경 ~130 기준)
  function drawGoreFace(ctx, kind, gape, t) {
    const g = ctx;
    if (kind === 'crawler') {
      // 눈 없는 것: 축축한 검은 살덩이 — 얼굴 전체가 세로로 찢어져 벌어진다. 눈자리엔 아문 흉터뿐
      goreSkin(g, 0, 0, 152, 176, '#2c2229', '#161018', '#080409');
      const wx = 16 + gape * 58;   // 찢어진 최대 반폭
      const seam = (y) => wx * Math.pow(Math.max(0.001, Math.cos((y / 330) * Math.PI)), 0.65);
      // 찢어지며 좌우로 당겨지는 근섬유 결
      g.strokeStyle = 'rgba(74,46,50,0.55)';
      for (let i = 0; i < 20; i++) {
        const yy = -140 + (i / 19) * 280;
        const s = seam(yy);
        for (const dir of [-1, 1]) {
          g.lineWidth = 1 + Math.random() * 1.6;
          g.beginPath(); g.moveTo(dir * (s + 4), yy);
          g.quadraticCurveTo(dir * (s + 60), yy + jit(10), dir * 148, yy * 1.05 + jit(14));
          g.stroke();
        }
      }
      // 젖은 광택
      g.fillStyle = 'rgba(150,160,175,0.09)';
      g.beginPath(); g.ellipse(-78, -70, 42, 62, -0.45, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(82, 30, 24, 40, 0.4, 0, Math.PI * 2); g.fill();
      // 아문 눈자리 — 움푹 꺼진 구덩이 + 꿰맨 자국
      for (const ex of [-76, 76]) {
        const sg = g.createRadialGradient(ex, -70, 2, ex, -70, 28);
        sg.addColorStop(0, 'rgba(0,0,0,0.78)'); sg.addColorStop(1, 'rgba(40,26,30,0)');
        g.fillStyle = sg; g.beginPath(); g.ellipse(ex, -70, 26, 17, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,120,110,0.5)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(ex - 20, -70); g.lineTo(ex + 20, -70); g.stroke();
        for (let s = -2; s <= 2; s++) {
          g.beginPath(); g.moveTo(ex + s * 9, -76); g.lineTo(ex + s * 9 + jit(2), -64); g.stroke();
        }
      }
      // 찢어진 구멍 — 지그재그 가장자리의 세로 아가리
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(0, -160);
      for (let yy = -150; yy <= 150; yy += 20) g.lineTo(seam(yy) + jit(4), yy);
      g.lineTo(0, 162);
      for (let yy = 150; yy >= -150; yy -= 20) g.lineTo(-seam(yy) - jit(4), yy);
      g.closePath();
      const tg = g.createRadialGradient(0, 10, 4, 0, 10, 185);
      tg.addColorStop(0, '#000'); tg.addColorStop(0.55, '#150104'); tg.addColorStop(1, '#3a070a');
      g.fillStyle = tg; g.fill();
      g.strokeStyle = '#6e2a2e'; g.lineWidth = 5; g.stroke();          // 생살 림
      g.strokeStyle = 'rgba(220,160,150,0.25)'; g.lineWidth = 2; g.stroke(); // 젖은 안쪽 림
      // 인후 깊숙한 옹이
      g.fillStyle = '#2a0407'; g.beginPath(); g.ellipse(0, 60, wx * 0.2, wx * 0.3, 0, 0, Math.PI * 2); g.fill();
      // 이빨 — 양쪽 가장자리에서 지퍼처럼 맞물린다 (가운데가 가장 크다)
      for (const dir of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const yy = -118 + i * 39 + (dir < 0 ? 0 : 19) + jit(4);
          const s = seam(yy);
          const len = (10 + gape * 30) * (1 - Math.abs(yy) / 230) + 6;
          const th = 8 + 7 * (1 - Math.abs(yy) / 210);
          const fg = g.createLinearGradient(dir * s, yy, dir * (s - len), yy);
          fg.addColorStop(0, '#ece2ca'); fg.addColorStop(1, '#8e7e5c');
          g.fillStyle = fg;
          g.beginPath();
          g.moveTo(dir * s, yy - th);
          g.lineTo(dir * s, yy + th);
          g.lineTo(dir * (s - len), yy + jit(3));
          g.closePath(); g.fill();
        }
      }
      // 가로로 늘어나는 힘줄/점액 가닥 + 침
      if (gape > 0.2) {
        g.strokeStyle = 'rgba(215,222,205,0.35)'; g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const yy = -90 + i * 45 + jit(8);
          const s = seam(yy);
          g.lineWidth = 1 + Math.random() * 1.8;
          g.beginPath(); g.moveTo(-s * 0.9, yy);
          g.quadraticCurveTo(jit(10), yy + 14 + jit(6), s * 0.9, yy + jit(6));
          g.stroke();
        }
        for (let i = 0; i < 4; i++) goreDrool(g, jit(wx * 0.6), 120 + Math.random() * 30, 30 + gape * 50 + Math.random() * 24, 2 + Math.random() * 2.5);
      }
    } else if (kind === 'clown') {
      // 광대: 들뜬 분칠이 갈라지고 — 꿰맨 X자 눈이 뜯어지며, 그려진 미소가 진짜로 찢어진다
      goreSkin(g, 0, -6, 136, 154, '#f2ede2', '#d3c8b4', '#94866e');
      // 분장 균열 — 들뜬 페인트 조각 (들린 모서리 하이라이트)
      for (let i = 0; i < 9; i++) {
        let x = jit(100), y = -140 + Math.random() * 200;
        g.strokeStyle = 'rgba(110,88,66,0.55)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 3; s++) { const nx = x + jit(26), ny = y + 10 + Math.random() * 22; g.lineTo(nx, ny); x = nx; y = ny; }
        g.stroke();
        g.strokeStyle = 'rgba(255,252,240,0.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x - 6, y - 4); g.lineTo(x + 4, y + 2); g.stroke();
      }
      // 관자놀이 핏줄
      goreVeins(g, 46, -84, 56, 'rgba(150,40,40,0.4)', 7);
      goreVeins(g, -46, -84, 56, 'rgba(150,40,40,0.4)', 7);
      // 헝클어진 초록 머리 — 두 톤 가닥
      for (let i = -6; i <= 6; i++) {
        const bx = i * 19;
        g.fillStyle = i % 2 ? '#31501f' : '#48702c';
        g.beginPath(); g.moveTo(bx - 9, -116); g.lineTo(bx + jit(10), -190 - Math.random() * 36); g.lineTo(bx + 10, -114); g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(24,40,14,0.6)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(jit(110), -120); g.lineTo(jit(120), -176 - Math.random() * 20); g.stroke(); }
      // 꿰맨 X자 눈 — 왼쪽 실밥이 뜯어지며 충혈된 진짜 눈이 내다본다
      for (const ex of [-58, 58]) {
        g.fillStyle = 'rgba(150,30,30,0.28)'; g.beginPath(); g.arc(ex, -34, 32, 0, Math.PI * 2); g.fill();
        goreVeins(g, ex, -34, 28, 'rgba(160,30,30,0.6)', 6);
        const tear = ex < 0 ? BK.clamp((gape - 0.35) / 0.4, 0, 1) : 0;
        if (tear > 0.1) {
          // 뜯어진 실밥 틈 — 아몬드꼴로 벌어지고, 그 안에서 진짜 눈이 형형하게 내다본다
          g.fillStyle = '#0c0406'; g.beginPath(); g.ellipse(ex, -34, 27, 9 + tear * 14, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(240,232,214,0.5)'; g.lineWidth = 2;   // 벌어진 살 가장자리
          g.beginPath(); g.ellipse(ex, -34, 27, 9 + tear * 14, 0, 0, Math.PI * 2); g.stroke();
          g.save(); g.shadowColor = '#fff'; g.shadowBlur = 14;
          const eb = g.createRadialGradient(ex - 4, -38, 2, ex, -34, 22);
          eb.addColorStop(0, '#ffffff'); eb.addColorStop(0.7, '#f0e6ce'); eb.addColorStop(1, '#c0b090');
          g.fillStyle = eb; g.beginPath(); g.ellipse(ex, -34, 21, 7 + tear * 12, 0, 0, Math.PI * 2); g.fill();
          g.restore();
          goreVeins(g, ex, -34, 14, 'rgba(190,30,30,0.75)', 4);
          g.fillStyle = '#140804'; g.beginPath(); g.arc(ex + 2, -33, 5.5 + tear * 2.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ex - 1, -36, 2.2, 0, Math.PI * 2); g.fill();
        }
        // X 실밥 (뜯긴 쪽은 끊어져 늘어진다)
        g.strokeStyle = '#150406'; g.lineWidth = 8; g.lineCap = 'round';
        if (tear > 0.5) {
          g.beginPath(); g.moveTo(ex - 24, -54); g.lineTo(ex - 6, -40); g.stroke();
          g.beginPath(); g.moveTo(ex + 10, -22 + tear * 14); g.lineTo(ex + 24, -14 + tear * 10); g.stroke();
        } else {
          g.beginPath(); g.moveTo(ex - 24, -54); g.lineTo(ex + 24, -14); g.stroke();
        }
        g.beginPath(); g.moveTo(ex + 24, -54); g.lineTo(ex - 24, -14); g.stroke();
        // 실땀
        g.lineWidth = 3;
        for (let s = -1; s <= 1; s++) {
          g.beginPath(); g.moveTo(ex + s * 12 - 5, -34 + s * 10 - 6); g.lineTo(ex + s * 12 + 5, -34 + s * 10 + 4); g.stroke();
        }
        // 피눈물
        g.strokeStyle = '#8a0d0e'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(ex, -14); g.lineTo(ex + jit(4), -14 + 58 + 92 * gape); g.stroke();
      }
      // 코 — 기름진 광택
      const ng = g.createRadialGradient(-6, 2, 2, 0, 8, 23);
      ng.addColorStop(0, '#ff604e'); ng.addColorStop(1, '#960e0e');
      g.fillStyle = ng; g.beginPath(); g.arc(0, 8, 21, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-8, 0, 6, 4, -0.5, 0, Math.PI * 2); g.fill();
      // 그려진 미소 밖으로 — 볼을 타고 올라가는 진짜 찢어진 상처
      const mw = 54 + gape * 60, mh = 26 + gape * 74;
      g.strokeStyle = '#7a0b0c'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-mw + 4, 70); g.quadraticCurveTo(-mw - 20 * gape, 62 - 20 * gape, -mw - 34 * gape, 44 - 26 * gape); g.stroke();
      g.beginPath(); g.moveTo(mw - 4, 70); g.quadraticCurveTo(mw + 20 * gape, 62 - 20 * gape, mw + 34 * gape, 44 - 26 * gape); g.stroke();
      // 입 구멍 + 혀 그림자
      const mg = g.createRadialGradient(0, 72, 4, 0, 72, mh);
      mg.addColorStop(0, '#000'); mg.addColorStop(0.7, '#1c0306'); mg.addColorStop(1, '#3c0a0c');
      g.fillStyle = mg; g.beginPath(); g.ellipse(0, 72, mw, mh, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(120,24,28,0.7)'; g.beginPath(); g.ellipse(0, 72 + mh * 0.5, mw * 0.5, mh * 0.32, 0, 0, Math.PI * 2); g.fill();
      goreTeeth(g, -mw + 8, 72 - mh + 5, mw - 8, 72 - mh + 5, 10, 20 + gape * 6, true);
      goreTeeth(g, -mw + 10, 72 + mh - 5, mw - 10, 72 + mh - 5, 9, 17 + gape * 5, false);
      // 입 안을 가로지르는 볼 살가닥 + 침
      if (gape > 0.3) {
        goreStrands(g, -mw * 0.6, 72 - mh * 0.5, mw * 0.6, 72 + mh * 0.5, 5, 'rgba(214,190,178,0.45)');
        goreDrool(g, -mw * 0.4, 72 + mh - 8, 34 + gape * 44);
        goreDrool(g, mw * 0.42, 72 + mh - 8, 28 + gape * 38);
      }
      // 목의 러프 칼라 — 화면 하단 프레임
      for (let i = -3; i <= 3; i++) {
        g.fillStyle = i % 2 ? '#b8ad94' : '#d8cfba';
        g.beginPath(); g.ellipse(i * 44, 206, 32, 24, 0, Math.PI, Math.PI * 2); g.fill();
      }
    } else if (kind === 'shade') {
      // 꺼진 것: 잿빛 석상 — 균열마다 차가운 빛이 차오르고, 얼굴이 부서지며 빛이 쏟아진다
      goreSkin(g, 0, 0, 150, 170, '#7b7a86', '#45444f', '#17161c');
      // 정으로 쪼은 자국
      g.strokeStyle = 'rgba(20,19,26,0.5)';
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 140;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 1.12;
        g.lineWidth = 1 + Math.random();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + jit(7), y + jit(5)); g.stroke();
      }
      g.save();
      g.beginPath(); g.ellipse(0, 0, 150, 170, 0, 0, Math.PI * 2); g.clip();
      // 균열 — 어두운 골 + 심지에서 새는 빛 + 실금
      for (let i = 0; i < 9; i++) {
        const a0 = (i / 9) * Math.PI * 2 + jit(0.3);
        let x = jit(26), y = jit(26);
        const pts = [[x, y]];
        for (let s = 0; s < 5; s++) { x += Math.cos(a0) * 34 + jit(13); y += Math.sin(a0) * 34 + jit(13); pts.push([x, y]); }
        g.strokeStyle = 'rgba(8,8,12,0.85)'; g.lineWidth = 4 + gape * 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) g.lineTo(p[0], p[1]);
        g.stroke();
        g.strokeStyle = `rgba(240,246,228,${0.25 + 0.6 * gape})`;
        g.lineWidth = 1.2 + gape * 2.4;
        g.shadowColor = '#eef4e2'; g.shadowBlur = 10 + gape * 26;
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) g.lineTo(p[0], p[1]);
        g.stroke();
        g.shadowBlur = 0;
        g.strokeStyle = 'rgba(16,15,20,0.5)'; g.lineWidth = 1;
        for (let s = 1; s < pts.length; s += 2) {
          g.beginPath(); g.moveTo(pts[s][0], pts[s][1]);
          g.lineTo(pts[s][0] + jit(22), pts[s][1] + jit(18)); g.stroke();
        }
      }
      // 떨어져 나가 떠오르는 돌 조각 (빛나는 단면)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + i;
        const fl = gape * (18 + (i % 4) * 14);
        const x = Math.cos(a) * (96 + (i % 3) * 22), y = Math.sin(a) * (110 + (i % 3) * 24) - fl;
        g.fillStyle = '#55545f';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7 + (i % 3) * 3, y + 3); g.lineTo(x + 3, y + 9); g.closePath(); g.fill();
        g.strokeStyle = `rgba(240,246,228,${0.3 + 0.4 * gape})`; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7 + (i % 3) * 3, y + 3); g.stroke();
      }
      g.restore();
      // 텅 빈 눈구멍 — 빛의 우물 + 부챗살 광선
      const sdrop = gape * 70;
      for (const ex of [-54, 54]) {
        g.fillStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.ellipse(ex, -36, 34, 46, 0, 0, Math.PI * 2); g.fill();
        g.save(); g.translate(ex, -36);
        for (let r2 = 0; r2 < 3; r2++) {
          const ra = -0.5 + r2 * 0.5 + Math.sin(t * 3 + r2) * 0.08;
          g.save(); g.rotate(ra);
          const lg = g.createLinearGradient(0, 0, 0, 120);
          lg.addColorStop(0, `rgba(238,244,226,${0.14 + gape * 0.2})`); lg.addColorStop(1, 'rgba(238,244,226,0)');
          g.fillStyle = lg;
          g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.lineTo(16, 120); g.lineTo(-16, 120); g.closePath(); g.fill();
          g.restore();
        }
        g.restore();
        g.save(); g.shadowColor = '#e8ecd8'; g.shadowBlur = 26 + gape * 30;
        const eg = g.createRadialGradient(ex, -36, 3, ex, -36, 30 + sdrop * 0.3);
        eg.addColorStop(0, '#ffffff');
        eg.addColorStop(0.45, `rgba(240,246,228,${0.75 + 0.25 * gape})`);
        eg.addColorStop(1, 'rgba(130,134,120,0)');
        g.fillStyle = eg; g.beginPath(); g.ellipse(ex, -36, 21, 30, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      // 입 — 세로로 부서져 벌어지는 틈 (깨진 단면의 지그재그)
      const smh = 32 + gape * 96, smw = 18 + gape * 32;
      g.fillStyle = '#060608';
      g.beginPath();
      g.moveTo(0, 62 - smh);
      for (let s = 1; s <= 6; s++) g.lineTo((s % 2 ? smw : smw * 0.7) + jit(3), 62 - smh + (smh * 2 * s) / 6);
      for (let s = 5; s >= 0; s--) g.lineTo(-(s % 2 ? smw : smw * 0.72) + jit(3), 62 - smh + (smh * 2 * s) / 6);
      g.closePath(); g.fill();
      // 안에서 쏟아지는 빛
      g.save(); g.shadowColor = '#fff'; g.shadowBlur = 12 + gape * 30;
      const smg = g.createRadialGradient(0, 62, 3, 0, 62, smh);
      smg.addColorStop(0, '#ffffff');
      smg.addColorStop(0.4, `rgba(246,250,236,${0.7 + 0.3 * gape})`);
      smg.addColorStop(0.75, 'rgba(160,162,150,0.2)');
      smg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = smg; g.beginPath(); g.ellipse(0, 62, smw * 0.66, smh * 0.85, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      // 부서진 돌 이빨
      goreTeeth(g, -smw, 62 - smh + 9, smw, 62 - smh + 9, 6, 13 + gape * 10, true, STONE_TEETH);
      goreTeeth(g, -smw, 62 + smh - 9, smw, 62 + smh - 9, 6, 13 + gape * 10, false, STONE_TEETH);
      // 떠오르는 빛 먼지
      for (let i = 0; i < 14; i++) {
        const px = Math.sin(i * 3.7) * 130, py = ((i * 53 + 400 - t * 60) % 380) - 190;
        g.fillStyle = `rgba(238,244,226,${0.12 + 0.3 * gape * BK.hash2(i, 0, 1)})`;
        g.fillRect(px, py, 2 + (i % 2), 2 + (i % 2));
      }
    } else {
      // 미소 짓는 것: 심연의 연기 — 수축하는 동공, 잇몸까지 드러나는 거대한 미소
      goreSkin(g, 0, 0, 150, 168, '#201a2c', '#0d0916', '#020107');
      // 살아 있는 연기 가장자리 (t로 흐른다)
      g.fillStyle = 'rgba(12,9,20,0.75)';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + t * 0.7;
        g.beginPath(); g.arc(Math.cos(a) * 148, Math.sin(a) * 164, 24 + ((i * 7) % 3) * 9 + Math.sin(t * 5 + i) * 5, 0, Math.PI * 2); g.fill();
      }
      // 연기 소용돌이 결
      g.strokeStyle = 'rgba(56,44,84,0.28)'; g.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        g.beginPath(); g.arc(jit(60), jit(70), 40 + i * 16, t * 0.4 + i, t * 0.4 + i + 1.8); g.stroke();
      }
      const drop = gape * 92;
      for (const ex of [-56, 56]) {
        // 안와 — 눌린 연기 주름
        g.fillStyle = 'rgba(0,0,0,0.65)'; g.beginPath(); g.ellipse(ex, -38, 40, 52, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(70,58,96,0.5)'; g.lineWidth = 2;
        for (let s = 0; s < 4; s++) { g.beginPath(); g.arc(ex, -38, 44 + s * 5, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        // 빛나는 흰 눈알
        g.save(); g.shadowColor = '#fff'; g.shadowBlur = 30;
        const eg = g.createRadialGradient(ex - 6, -46, 3, ex, -40, 36 + drop * 0.4);
        eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.65, '#f0ead0'); eg.addColorStop(1, '#bcb494');
        g.fillStyle = eg; g.beginPath(); g.ellipse(ex, -40, 30, 40 + drop * 0.4, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        // 핏발
        goreVeins(g, ex, -40, 28, 'rgba(180,30,30,0.6)', 7);
        // 홍채 + 동공 — 벌어질수록 동공이 수축한다 (초점이 너에게 맺힌다)
        g.fillStyle = '#3a1c0a'; g.beginPath(); g.arc(ex + jit(1.5), -30, 13, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#040106'; g.beginPath(); g.arc(ex, -30, 8 - gape * 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ex - 4, -34, 2.4, 0, Math.PI * 2); g.fill();
        // 흘러내리는 검은 진액
        g.fillStyle = 'rgba(6,4,10,0.85)';
        g.fillRect(ex - 5, -8, 10, drop);
        g.beginPath(); g.arc(ex, -8 + drop, 6, 0, Math.PI); g.fill();
      }
      // 거대한 미소 — 흰 띠가 벌어지며 잇몸과 이빨이 드러난다
      const open = 0.12 - gape * 0.06, end = 0.88 + gape * 0.08, rad = 92 + gape * 44;
      g.save(); g.shadowColor = '#fdf8e0'; g.shadowBlur = 18;
      g.strokeStyle = '#fdf8e0'; g.lineWidth = 26 - gape * 10; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 28, rad, Math.PI * open, Math.PI * end); g.stroke();
      g.restore();
      if (gape > 0.2) {
        const ig = g.createRadialGradient(0, 56, 4, 0, 56, rad * 0.85);
        ig.addColorStop(0, '#0e0102'); ig.addColorStop(1, '#3a0608');
        g.fillStyle = ig; g.beginPath(); g.ellipse(0, 58, rad * 0.84, 20 + gape * 58, 0, 0, Math.PI * 2); g.fill();
        // 잇몸 띠
        g.fillStyle = '#5e1c1e';
        g.beginPath(); g.ellipse(0, 58 - (16 + gape * 46), rad * 0.8, 10, 0, 0, Math.PI, true); g.fill();
        goreTeeth(g, -rad * 0.72, 42 - gape * 8, rad * 0.72, 42 - gape * 8, 12, 20 + gape * 16, true);
        goreTeeth(g, -rad * 0.6, 58 + (16 + gape * 48), rad * 0.6, 58 + (16 + gape * 48), 10, 14 + gape * 10, false);
        // 입꼬리에서 당겨지는 살가닥
        goreStrands(g, -rad * 0.7, 30, rad * 0.7, 58 + gape * 40, 4, 'rgba(190,170,150,0.35)');
        if (gape > 0.55) for (let i = 0; i < 4; i++) goreDrool(g, jit(rad * 0.55), 66 + gape * 30, 30 + Math.random() * 50);
      }
    }
  }

  function drawBlood(prog) {
    const g = dctx;
    const th = JS_THEME[game.jumpMon] || JS_THEME.smiler;
    if (game.jumpMon === 'shade') {
      // 꺼진 것: 피 대신 균열에서 터져 나온 빛 — 부드러운 광구가 위로 샌다
      for (const b of game.jumpBlood) {
        if (prog < b.delay) continue;
        const lp = BK.clamp((prog - b.delay) / 0.4, 0, 1);
        const r = b.r * 0.8 * lp;
        if (r < 1) continue;
        const lg = g.createRadialGradient(b.x, b.y, 0.5, b.x, b.y, r);
        lg.addColorStop(0, `rgba(250,252,240,${0.7 * lp})`);
        lg.addColorStop(0.5, `rgba(210,218,190,${0.28 * lp})`);
        lg.addColorStop(1, 'rgba(210,218,190,0)');
        g.fillStyle = lg;
        g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.fill();
        // 위로 새어 오르는 가는 빛줄기
        g.fillStyle = `rgba(240,244,226,${0.3 * lp})`;
        g.fillRect(b.x - 1, b.y - b.drip * lp, 2, b.drip * lp);
      }
      return;
    }
    g.fillStyle = th.blood;
    for (const b of game.jumpBlood) {
      if (prog < b.delay) continue;
      const lp = BK.clamp((prog - b.delay) / 0.4, 0, 1);
      const r = b.r * lp;
      g.globalAlpha = 0.82;
      g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.fill();
      // 흘러내림
      g.fillRect(b.x - r * 0.3, b.y, r * 0.6, b.drip * lp);
      // 밝은 하이라이트
      g.fillStyle = th.bloodHi;
      g.beginPath(); g.arc(b.x - r * 0.25, b.y - r * 0.25, r * 0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = th.blood;
    }
    g.globalAlpha = 1;
  }

  function drawCracks(prog) {
    const g = dctx;
    g.strokeStyle = `rgba(230,230,235,${0.5 * prog})`;
    g.lineWidth = 2;
    for (const segs of game.jumpCracks) {
      g.beginPath();
      g.moveTo(canvas.width / 2, canvas.height / 2);
      const n = Math.ceil(segs.length * prog);
      for (let i = 0; i < n; i++) g.lineTo(segs[i].x, segs[i].y);
      g.stroke();
    }
  }

  // ---------------- 루프 ----------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // 디버그 치트: BK.game._gotoZone(0~2)
  game._gotoZone = (i) => { enterZone(i); for (const m of game.monsters) m.active = true; game.state = 'play'; hideOverlay(); };

  // 타이틀 어트랙트용 월드
  game.world = buildZoneWorld(0, (Math.random() * 0xffffffff) >>> 0);
  game.player = new BK.Player(game.spawnPos.x, game.spawnPos.y);
  game.monsters = [];
  showTitle();
  requestAnimationFrame(frame);
})();
