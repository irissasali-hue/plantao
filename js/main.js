'use strict';
const SAVE_KEY = 'plantao_save_v2';
const XP_PER_LEVEL = 150;

const Game = {
  state: 'boot',
  t: 0,
  save: null,

  defaults() {
    return {
      name: 'Residente', xp: 0, money: NEW_GAME.money, bag: { ...NEW_GAME.bag }, team: [], badges: [],
      solved: [], seen: [], notes: [], cards: {}, seenVersions: [], lastVersion: {}, flags: {}, playFrames: 0, back: null,
      respawn: { ...START }, ...START,
    };
  },

  loadSave() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      return s ? { ...this.defaults(), ...JSON.parse(s) } : null;
    } catch (e) {
      return null;
    }
  },

  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { /* sem storage: segue sem salvar */ }
  },

  level() {
    return 1 + Math.floor(this.save.xp / XP_PER_LEVEL);
  },

  newGame() {
    UI.push(new NameEntry(name => {
      this.save = { ...this.defaults(), name };
      this.persist();
      World.init(this.save);
      this.state = 'world';
      World.fadeIn = 24;
      Script.run([{ say: STORY.intro }]);
    }));
  },

  continueGame() {
    syncCards(); // saves antigos: libera os cards dos casos já vistos
    World.init(this.save);
    this.state = 'world';
    World.fadeIn = 24;
  },

  // ctx vem do roteiro (treinador, dinheiro, música...); onEnd(win) retoma o roteiro
  startBattle(c, ctx, onEnd) {
    c = pickVersion(c); // variação do caso (só depois da 1ª vez)
    this.pending = { c, ctx, onEnd };
    Sound.music(ctx.music || c.music || 'batalha');
    this.state = 'trans';
    this.transT = 0;
  },

  endBattle(win) {
    const { c, ctx, onEnd } = this.pending, s = this.save;
    if (!s.seen.includes(c.id)) s.seen.push(c.id);
    if (win && !s.solved.includes(c.id)) s.solved.push(c.id);
    if (win && ctx.trainerId) s.flags['beat:' + ctx.trainerId] = true;
    this.state = 'world';
    World.fadeIn = 24;
    Sound.music(World.map.music);
    if (!win && !ctx.noBlackout) return this.blackout();
    this.persist();
    if (onEnd) onEnd(win);
  },

  // Perdeu um caso: volta ao último Posto de Descanso, com a equipe recuperada
  blackout() {
    const s = this.save, r = s.respawn, lost = Math.floor(s.money / 4);
    Script.abort();
    s.money -= lost;
    if (r.back) s.back = { ...r.back };
    healTeam();
    World.loadMap(r.map, r.x, r.y, r.dir);
    Script.run([{ say: [
      'Você ficou exausto(a) e foi levado(a) para descansar...',
      ...(lost ? [`Na correria, você perdeu R$ ${lost}.`] : []),
      'Sua equipe está recuperada. Revise o caso nas anotações e tente de novo!',
    ] }]);
  },

  updateTrans() {
    if (++this.transT >= 66) {
      Battle.start(this.pending.c, this.pending.ctx);
      this.state = 'battle';
    }
  },

  // Flashes + faixas fechando, estilo encontro de RPG de 16 bits
  drawTrans() {
    const t = this.transT;
    if (t < 36) {
      if (Math.floor(t / 6) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(0, 0, W, H);
      }
      return;
    }
    const p = Math.min(1, (t - 36) / 28);
    ctx.fillStyle = '#000';
    for (let i = 0; i < H / 16; i++) {
      const w = Math.ceil(W * p);
      ctx.fillRect(i % 2 ? W - w : 0, i * 16, w, 16);
    }
  },
};

const Title = {
  init() {
    Game.save = Game.loadSave();
    const items = [];
    if (Game.save) items.push({ label: 'CONTINUAR', act: () => Game.continueGame() });
    items.push({ label: 'NOVO JOGO', act: () => Game.newGame() });
    this.menu = new ListMenu(items, { x: 82, y: 120, w: 92, h: 14 + items.length * LINE_H }, items.length);
    Game.state = 'title';
    Sound.music('titulo');
  },

  update() {
    const r = this.menu.update();
    if (r && !r.back) this.menu.items[r.pick].act();
  },

  draw() {
    const img = mapImage(START.map);
    const span = img.width - W;
    const x = Math.round(span / 2 + Math.sin(Game.t / 400) * span / 2);
    ctx.drawImage(img, -x, -40);
    ctx.fillStyle = 'rgba(10,14,34,0.62)';
    ctx.fillRect(0, 0, W, H);

    const cx = 52, cy = 34;
    ctx.fillStyle = '#181820';
    ctx.fillRect(cx - 1, cy - 1, 30, 30);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(cx, cy, 28, 28);
    ctx.fillStyle = '#e03030';
    ctx.fillRect(cx + 10, cy + 4, 8, 20);
    ctx.fillRect(cx + 4, cy + 10, 20, 8);

    text('PLANTÃO', 88, 34, { size: 28, bold: true, shadow: '#b02828' });
    text('um RPG de medicina em 16 bits', W / 2, 78, { align: 'center', color: '#ffe08a' });

    this.menu.draw();
    const hint = Touch.enabled ? 'Direcional: andar · A: confirmar · B: voltar' : 'Setas: andar · Z: confirmar · X: voltar · C: menu · M: som';
    text(hint, W / 2, 196, { size: 7, align: 'center', color: '#c8d0f0' });
    text('Jogo educativo — conteúdo simplificado, não substitui as diretrizes.', W / 2, 207, { size: 6, align: 'center', color: '#9098c0' });
  },
};

function update() {
  Game.t++;
  if (Game.save && Game.state !== 'title') Game.save.playFrames = (Game.save.playFrames || 0) + 1;
  if (Input.take('mute')) Sound.toggleMute();
  if (UI.active) return UI.update();
  switch (Game.state) {
    case 'title': Title.update(); break;
    case 'world': World.update(); break;
    case 'trans': Game.updateTrans(); break;
    case 'battle': Battle.update(); break;
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  switch (Game.state) {
    case 'title': Title.draw(); break;
    case 'world': World.draw(); break;
    case 'trans': World.draw(); Game.drawTrans(); break;
    case 'battle': Battle.draw(); break;
  }
  UI.draw();
}

// Passo fixo de 60 Hz, independente da taxa do monitor
const STEP = 1000 / 60;
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= STEP) {
    update();
    Input.endFrame();
    acc -= STEP;
  }
  draw();
  requestAnimationFrame(loop);
}

(async function boot() {
  const fonts = Promise.all([
    document.fonts.load(`8px ${FONT}`),
    document.fonts.load(`bold 8px ${FONT}`),
  ]).catch(() => {});
  await Promise.race([fonts, new Promise(r => setTimeout(r, 2500))]);
  await Assets.load();
  PLAYER_SPR = getChar('player');
  Title.init();
  requestAnimationFrame(loop);
})();
