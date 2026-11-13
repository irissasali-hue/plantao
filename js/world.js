'use strict';
// Overworld: movimento em grade, mapas ligados por portas, NPCs, treinadores com linha de visão,
// gatilhos de história e encontros no mato alto. O conteúdo vem de content/world.js e content/maps.js.
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const WARP_FRAMES = 28;

const mapCache = {};
function mapImage(id) {
  if (!mapCache[id]) mapCache[id] = bakeMap(MAPS[id].rows);
  return mapCache[id];
}

function heldDir() {
  for (const d of ['up', 'down', 'left', 'right']) if (Input.held(d)) return d;
  return null;
}

// ---------- roteiro: condições, variáveis e flags ----------
function check(cond) {
  if (!cond) return true;
  if (Array.isArray(cond)) return cond.every(check);
  const neg = cond.startsWith('!'), c = neg ? cond.slice(1) : cond, s = Game.save;
  const arg = c.slice(c.indexOf(':') + 1);
  let v;
  if (c.startsWith('solved:')) v = s.solved.includes(arg);
  else if (c.startsWith('seen:')) v = s.seen.includes(arg);
  else if (c.startsWith('level:')) v = Game.level() >= Number(arg);
  else if (c.startsWith('badge:')) v = s.badges.includes(arg);
  else if (c.startsWith('badges:')) v = s.badges.length >= Number(arg);
  else if (c.startsWith('team:')) v = s.team.some(m => m.id === arg);
  else if (c.startsWith('cards:')) v = dueCards().length >= Number(arg);
  else if (c === 'solvedAll') v = Object.keys(CASES).every(id => s.solved.includes(id));
  else v = !!s.flags[c];
  return neg ? !v : v;
}

function fill(str) {
  const s = Game.save;
  const vars = {
    name: s.name, level: Game.level(), money: s.money, badges: s.badges.length,
    solved: s.solved.length, total: Object.keys(CASES).length, notes: s.notes.length,
    cards: dueCards().length,
  };
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function setFlags(list, value) {
  for (const f of [].concat(list || [])) Game.save.flags[f] = value;
}

// Altura extra de sprites aumentados por ART.charScale
function headroom(spr) {
  return spr && spr.size ? Math.round(16 * spr.size) - 16 : 0;
}

function dirToward(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

// ---------- movimento em grade (jogador e NPCs) ----------
function makeMover(x, y, dir) {
  return { x, y, px: x * TILE, py: y * TILE, dir: dir || 'down', moving: false, prog: 0, dist: 1, jump: false, parity: 0 };
}

function startMove(e, dir, dist = 1) {
  Object.assign(e, { dir, moving: true, prog: 0, dist, jump: dist > 1 });
  e.parity ^= 1;
}

// Avança um quadro; devolve true quando o passo termina
function stepMove(e, speed = 2) {
  const [dx, dy] = DIRS[e.dir];
  e.prog += speed;
  if (e.prog < e.dist * TILE) {
    e.px = e.x * TILE + dx * e.prog;
    e.py = e.y * TILE + dy * e.prog;
    return false;
  }
  e.x += dx * e.dist;
  e.y += dy * e.dist;
  e.px = e.x * TILE;
  e.py = e.y * TILE;
  e.moving = false;
  e.jump = false;
  return true;
}

const World = {
  init(save) {
    this.msg = new MsgBox(BOX);
    this.fadeIn = 0;
    this.warp = null;
    this.bubbles = {};
    this.steps = 0;
    this.lastRandom = null;
    this.loadMap(MAPS[save.map] ? save.map : START.map, save.x, save.y, save.dir);
  },

  loadMap(id, x, y, dir) {
    this.mapId = id;
    this.map = MAPS[id];
    this.rows = this.map.rows;
    this.mw = this.rows[0].length;
    this.mh = this.rows.length;
    this.img = mapImage(id);
    this.p = Object.assign(makeMover(x, y, dir), { turnT: 0, walked: false });
    this.npcs = (this.map.npcs || []).map(n => Object.assign(makeMover(n.x, n.y, n.dir), n, {
      spr: n.kind === 'sign' || n.kind === 'object' ? null : getChar(n.sprite || n.id, n.pal),
      idleT: 60 + Math.floor(Math.random() * 120),
    }));
    Object.assign(Game.save, { map: id, x, y, dir: this.p.dir });
    Game.persist();
    Sound.music(this.map.music);
    const enter = (this.map.onEnter || []).find(e => check(e.if));
    if (enter) Script.run(enter.do);
  },

  tile(x, y) {
    return (this.rows[y] && this.rows[y][x]) || '#';
  },

  npcById(id) {
    return this.npcs.find(n => n.id === id);
  },

  visibleNpcs() {
    return this.npcs.filter(n => check(n.showIf));
  },

  npcAt(x, y) {
    return this.visibleNpcs().find(n => n.x === x && n.y === y);
  },

  // Ocupado para "self": fora do mapa, tile sólido, NPC visível ou o jogador
  solidAt(x, y, self) {
    if (x < 0 || y < 0 || x >= this.mw || y >= this.mh) return true;
    const t = TILES[this.tile(x, y)];
    if (t && t.solid) return true;
    if (self !== this.p && this.p.x === x && this.p.y === y) return true;
    return this.visibleNpcs().some(n => n !== self && n.x === x && n.y === y);
  },

  // Busca em largura até um tile que satisfaça goal(x, y); devolve a lista de direções
  findPath(ent, goal) {
    const key = (x, y) => y * this.mw + x;
    const prev = new Map([[key(ent.x, ent.y), null]]);
    const queue = [[ent.x, ent.y]];
    while (queue.length) {
      const [x, y] = queue.shift();
      if (goal(x, y)) {
        const path = [];
        for (let k = key(x, y); prev.get(k); k = prev.get(k).from) path.unshift(prev.get(k).dir);
        return path;
      }
      for (const d in DIRS) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1], k = key(nx, ny);
        if (prev.has(k) || this.solidAt(nx, ny, ent)) continue;
        prev.set(k, { from: key(x, y), dir: d });
        queue.push([nx, ny]);
      }
    }
    return null;
  },

  update() {
    if (this.fadeIn > 0) this.fadeIn--;
    for (const k in this.bubbles) if (--this.bubbles[k] <= 0) delete this.bubbles[k];
    if (this.warp) {
      const w = this.warp;
      if (++w.t === WARP_FRAMES / 2) this.loadMap(w.to, w.tx, w.ty, w.dir);
      if (w.t >= WARP_FRAMES) this.warp = null;
      return;
    }
    for (const n of this.npcs) if (n.moving) stepMove(n);

    if (Script.active) {
      if (this.p.moving) stepMove(this.p);
      Script.update();
      return;
    }
    for (const n of this.npcs) {
      if (!n.spr || n.trainer || n.still || n.moving) continue;
      if (--n.idleT <= 0) {
        n.dir = ['down', 'left', 'right', 'down'][Math.floor(Math.random() * 4)];
        n.idleT = 90 + Math.floor(Math.random() * 150);
      }
    }
    if (this.msg.active) { this.msg.update(); return; }

    const p = this.p;
    if (p.moving) {
      if (!stepMove(p)) return;
      p.walked = true;
      if (this.onStep()) return;
    }

    if (Input.take('menu')) { openPauseMenu(); return; }
    if (Input.take('ok')) { this.interact(); return; }

    const d = heldDir();
    if (!d) { p.walked = false; p.turnT = 0; return; }
    if (d !== p.dir) {
      p.dir = d;
      // Toque rápido só vira; segurar anda
      if (!p.walked) { p.turnT = 6; return; }
    }
    if (p.turnT > 0) { p.turnT--; return; }
    const [dx, dy] = DIRS[d], nx = p.x + dx, ny = p.y + dy;
    const t = TILES[this.tile(nx, ny)];
    if (d === 'down' && t && t.ledge && !this.solidAt(nx, ny + 1, p)) {
      startMove(p, 'down', 2);
      Sound.sfx('jump');
      return;
    }
    if (this.solidAt(nx, ny, p)) { p.walked = false; return; }
    startMove(p, d);
  },

  onStep() {
    const p = this.p;
    Object.assign(Game.save, { x: p.x, y: p.y, dir: p.dir });
    Game.persist();
    const inside = r => p.x >= r.x && p.x < r.x + (r.w || 1) && p.y >= r.y && p.y < r.y + (r.h || 1);

    const warp = (this.map.warps || []).find(inside);
    if (warp) { this.useWarp(warp); return true; }

    const trig = (this.map.triggers || []).find(t => inside(t) && check(t.if));
    if (trig) { Script.run(trig.do); return true; }

    const spotter = this.spotter();
    if (spotter) { Script.run(challengeCmds(spotter, true)); return true; }

    this.steps++;
    const enc = this.map.encounters;
    if (enc && this.tile(p.x, p.y) === (enc.tile || '"') && this.steps >= 4 && Math.random() < (enc.chance || 0.1)) {
      this.steps = 0;
      this.randomEncounter(enc);
      return true;
    }
    return false;
  },

  useWarp(w) {
    const p = this.p, src = this.tile(p.x, p.y), door = 'Dd'.includes(src);
    if (w.to === '__back') {
      const b = Game.save.back;
      return this.startWarp(b.map, b.x, b.y, b.dir, true);
    }
    // Ao entrar por uma porta, guarda onde voltar (o tile logo abaixo dela)
    if (door) Game.save.back = { map: this.mapId, x: p.x, y: p.y + 1, dir: 'down' };
    this.startWarp(w.to, w.tx + (p.x - w.x), w.ty + (p.y - w.y), w.dir || p.dir, door);
  },

  startWarp(to, tx, ty, dir, sound) {
    this.warp = { to, tx, ty, dir, t: 0 };
    if (sound) Sound.sfx('door');
  },

  // Treinador não vencido que tem o jogador na linha de visão
  spotter() {
    const p = this.p;
    for (const n of this.visibleNpcs()) {
      const t = n.trainer;
      if (!t || !t.range || Game.save.flags['beat:' + n.id]) continue;
      const [dx, dy] = DIRS[n.dir];
      for (let k = 1; k <= t.range; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (x === p.x && y === p.y) return n;
        if (this.solidAt(x, y, n)) break;
      }
    }
    return null;
  },

  randomEncounter(enc) {
    // Às vezes, no lugar de um paciente, alguém pede ajuda para revisar os seus flashcards
    if (dueCards().length >= 3 && Math.random() < 0.35) {
      this.bubbles.player = 40;
      Sound.sfx('alert');
      const who = QUIZ_ENCOUNTERS[Math.floor(Math.random() * QUIZ_ENCOUNTERS.length)];
      Script.run([
        { say: who },
        { ask: 'Topa uma rodada de perguntas rápidas?', yesLabel: 'Topo!', noLabel: 'Agora não',
          yes: [{ opens: 'quiz' }], no: [{ say: ['Fica para a próxima!'] }] },
      ]);
      return;
    }
    const pool = enc.cases.length > 1 ? enc.cases.filter(id => id !== this.lastRandom) : enc.cases;
    const c = CASES[pool[Math.floor(Math.random() * pool.length)]];
    this.lastRandom = c.id;
    this.bubbles.player = 40;
    Sound.sfx('alert');
    Script.run([
      { say: c.encounter || ['Alguém está passando mal no mato alto!'] },
      { battle: c.id, kind: 'wild' },
    ]);
  },

  interact() {
    const p = this.p;
    const [dx, dy] = DIRS[p.dir];
    const tx = p.x + dx, ty = p.y + dy;
    const t = TILES[this.tile(tx, ty)];
    // Balcão: fala com quem está do outro lado
    const n = this.npcAt(tx, ty) || (t && t.counter ? this.npcAt(tx + dx, ty + dy) : null);
    if (n) {
      if (n.spr && !n.trainer) n.dir = OPP[p.dir];
      this.talk(n);
      return;
    }
    if (t && (t.say || t.opens)) Script.run([...(t.say ? [{ say: t.say }] : []), ...(t.opens ? [{ opens: t.opens }] : [])]);
  },

  talk(n) {
    const t = n.trainer, beat = Game.save.flags['beat:' + n.id];
    if (t && !beat) return Script.run(challengeCmds(n, false));
    // Venceu mas o jogo fechou antes do roteiro de vitória entregar o selo: entrega de novo
    const missing = t && (t.win || []).some(c => c.badge && !Game.save.badges.includes(c.badge));
    if (missing) {
      if (n.spr) n.dir = OPP[this.p.dir];
      return Script.run(t.win);
    }
    const block = (n.dialogue || []).find(b => check(b.if));
    if (block) return Script.run(blockCmds(block, n));
    if (t && t.after) {
      if (n.spr) n.dir = OPP[this.p.dir];
      Script.run([{ say: t.after, speaker: n.name }]);
    }
  },

  camera() {
    const p = this.p;
    const axis = (pos, size, view) => (size <= view
      ? -Math.floor((view - size) / 2)
      : clamp(Math.round(pos + 8 - view / 2), 0, size - view));
    return { x: axis(p.px, this.mw * TILE, W), y: axis(p.py, this.mh * TILE, H) };
  },

  drawWater(cx, cy) {
    if (Assets.img.tiles) return;
    ctx.fillStyle = '#8cc4f4';
    const x0 = Math.floor(cx / TILE), y0 = Math.floor(cy / TILE);
    for (let ty = y0; ty <= y0 + 14; ty++) {
      for (let tx = x0; tx <= x0 + 16; tx++) {
        if (this.tile(tx, ty) !== '~') continue;
        const o = ((Game.t >> 3) + tx * 5 + ty * 3) % 12;
        ctx.fillRect(tx * TILE - cx + o + 1, ty * TILE - cy + 6, 3, 1);
        ctx.fillRect(tx * TILE - cx + ((o + 6) % 12) + 1, ty * TILE - cy + 11, 3, 1);
      }
    }
  },

  // Personagem com animação de passo e arco do pulo das saliências
  drawMover(e, spr, cx, cy) {
    const frame = e.moving && e.prog % 16 < 8 ? (e.parity ? 1 : 2) : 0;
    let lift = 0;
    if (e.jump) {
      lift = Math.round(Math.sin((e.prog / (e.dist * TILE)) * Math.PI) * 8);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(Math.round(e.px) - cx + 4, Math.round(e.py) - cy + 12, 8, 3);
    }
    drawChar(spr, e.dir, frame, Math.round(e.px) - cx, Math.round(e.py) - cy - 4 - lift);
  },

  draw() {
    const { x: cx, y: cy } = this.camera();
    const p = this.p;
    const npcs = this.visibleNpcs();
    ctx.drawImage(this.img, -cx, -cy);
    this.drawWater(cx, cy);

    const ents = npcs.filter(n => n.kind !== 'object').map(n => ({
      y: n.py,
      draw: () => (n.spr ? this.drawMover(n, n.spr, cx, cy) : drawSign(n.x * TILE - cx, n.y * TILE - cy)),
    }));
    ents.push({ y: p.py, draw: () => this.drawMover(p, PLAYER_SPR, cx, cy) });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());

    const bob = Math.sin(Game.t / 8) > 0 ? 0 : -1;
    for (const n of npcs) {
      const x = Math.round(n.px) - cx + 4, y = Math.round(n.py) - cy - 17 - headroom(n.spr);
      if (this.bubbles[n.id]) drawBubble(x, y);
      else if (n.bubble && check(n.bubble)) drawBubble(x, y + bob, n.bubbleColor);
    }
    if (this.bubbles.player) drawBubble(Math.round(p.px) - cx + 4, Math.round(p.py) - cy - 17 - headroom(PLAYER_SPR));

    this.drawHud();
    this.msg.draw();

    let dark = this.fadeIn / 24;
    if (this.warp) dark = 1 - Math.abs(this.warp.t - WARP_FRAMES / 2) / (WARP_FRAMES / 2);
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  drawHud() {
    const s = Game.save;
    drawWindow(4, 4, 104, 27);
    text(`Nv ${Game.level()}`, 10, 8, { size: 7, bold: true });
    drawBar(36, 10, 66, 3, (s.xp % XP_PER_LEVEL) / XP_PER_LEVEL);
    text(`R$ ${s.money}`, 10, 17, { size: 7 });
    Object.keys(BADGES).forEach((id, i) => {
      const x = 76 + i * 9, y = 18;
      ctx.fillStyle = '#101828';
      ctx.fillRect(x - 1, y - 1, 8, 8);
      ctx.fillStyle = s.badges.includes(id) ? BADGES[id].color : '#2a3468';
      ctx.fillRect(x, y, 6, 6);
    });
  },
};
