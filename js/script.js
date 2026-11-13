'use strict';
// Roteirizador de cenas: executa listas de comandos (veja o topo de content/world.js).
// Comandos assíncronos (falas, movimento, batalha, menus) param a fila até terminarem.
const Script = {
  active: false,
  queue: [],
  wait: null,
  onDone: null,

  run(cmds, onDone) {
    if (this.active) { this.queue.unshift(...cmds); return; }
    Object.assign(this, { active: true, queue: cmds.slice(), wait: null, onDone: onDone || null });
    this.next();
  },

  abort() {
    Object.assign(this, { active: false, queue: [], wait: null, onDone: null });
  },

  next() {
    while (this.active && !this.wait) {
      const c = this.queue.shift();
      if (!c) {
        this.active = false;
        Game.persist();
        const cb = this.onDone;
        this.onDone = null;
        if (cb) cb();
        return;
      }
      this.exec(c);
    }
  },

  resume(more) {
    if (more && more.length) this.queue.unshift(...more);
    this.wait = null;
    this.next();
  },

  update() {
    const w = this.wait;
    if (!w) return;
    switch (w.type) {
      case 'msg': World.msg.update(); break;
      case 'timer': if (--w.t <= 0) this.resume(); break;
      case 'warp': if (!World.warp) this.resume(); break;
      case 'ui': if (!UI.active) this.resume(); break;
      case 'move':
        if (w.ent.moving) break;
        if (w.path.length) startMove(w.ent, w.path.shift());
        else { if (w.then) w.then(); this.resume(); }
        break;
    }
  },

  entity(id) {
    return id === 'player' ? World.p : World.npcById(id);
  },

  move(ent, path, then) {
    if (!ent || !path) return;
    this.wait = { type: 'move', ent, path: path.slice(), then };
  },

  say(lines, speaker) {
    this.wait = { type: 'msg' };
    World.msg.open(lines, () => this.resume(), speaker ? fill(speaker) : null);
  },

  exec(c) {
    const s = Game.save, p = World.p;
    if ('then' in c || 'else' in c) {
      this.queue.unshift(...((check(c.if) ? c.then : c.else) || []));
    } else if (c.say || c.random) {
      const lines = (c.say || []).map(l => (Array.isArray(l) ? [fill(l[0]), fill(l[1])] : fill(l)));
      if (c.random && c.random.length) lines.push(fill(c.random[Math.floor(Math.random() * c.random.length)]));
      if (lines.length) this.say(lines, c.speaker);
    } else if (c.set) {
      setFlags(c.set, true);
    } else if (c.unset) {
      setFlags(c.unset, false);
    } else if (c.ask) {
      this.wait = { type: 'ask' };
      const pick = branch => { UI.pop(); this.resume(branch); };
      UI.push(new PopupMenu(
        [{ label: c.yesLabel || 'Sim', yes: true }, { label: c.noLabel || 'Não' }],
        { x: 160, y: 112, w: 92, h: 42 },
        it => pick(it.yes ? c.yes : c.no),
        { prompt: fill(c.ask), onBack: () => pick(c.no) },
      ));
    } else if (c.move) {
      this.move(this.entity(c.move), c.path.trim().split(/\s+/));
    } else if (c.goto) {
      const ent = this.entity(c.goto);
      if (ent) this.move(ent, World.findPath(ent, (x, y) => x === c.x && y === c.y));
    } else if (c.approach) {
      const ent = this.entity(c.approach);
      if (!ent) return;
      const near = (x, y) => Math.abs(x - p.x) + Math.abs(y - p.y) === 1;
      this.move(ent, World.findPath(ent, near) || [], () => {
        ent.dir = dirToward(ent, p);
        p.dir = dirToward(p, ent);
      });
    } else if (c.face) {
      const ent = this.entity(c.face);
      if (ent) ent.dir = c.toward ? dirToward(ent, this.entity(c.toward)) : c.dir === 'player' ? dirToward(ent, p) : c.dir;
    } else if (c.exclaim) {
      World.bubbles[c.exclaim] = 40;
      Sound.sfx('alert');
      this.wait = { type: 'timer', t: 40 };
    } else if (c.wait) {
      this.wait = { type: 'timer', t: c.wait };
    } else if (c.battle) {
      this.battle(c);
    } else if (c.give) {
      const qty = c.qty || 1;
      addItem(c.give, qty);
      Sound.sfx('save');
      this.say([`Você recebeu ${qty > 1 ? qty + 'x ' : ''}${ITEMS[c.give].name}!`]);
    } else if (c.money) {
      s.money += c.money;
      Sound.sfx('save');
      this.say([`Você recebeu R$ ${c.money}.`]);
    } else if (c.badge) {
      if (!s.badges.includes(c.badge)) s.badges.push(c.badge);
      Sound.sfx('levelup');
      this.say([`Você conquistou o ${BADGES[c.badge].name}!`]);
    } else if (c.join) {
      joinTeam(c.join);
      Sound.sfx('levelup');
      this.say([`${TEAM[c.join].name} (${TEAM[c.join].role}) entrou para a sua equipe!`]);
    } else if (c.heal) {
      healTeam();
      s.respawn = { map: World.mapId, x: p.x, y: p.y, dir: p.dir, back: s.back ? { ...s.back } : null };
      Sound.sfx('heal');
      this.wait = { type: 'timer', t: 50 };
    } else if (c.warp) {
      World.startWarp(c.warp.to, c.warp.x, c.warp.y, c.warp.dir || 'down', true);
      this.wait = { type: 'warp' };
    } else if ('music' in c) {
      Sound.music(c.music);
    } else if (c.sfx) {
      Sound.sfx(c.sfx);
    } else if (c.opens) {
      openScreen(c.opens, c.category);
      this.wait = { type: 'ui' };
    } else if (c.pushBack) {
      this.move(p, [OPP[p.dir]]);
    } else if (c.challenge) {
      const n = World.npcById(c.challenge);
      if (n) this.queue.unshift(...challengeCmds(n, true));
    } else if (c.credits) {
      UI.push(new Credits());
      this.wait = { type: 'ui' };
    }
  },

  battle(c) {
    const npc = c.trainer ? World.npcById(c.trainer) : null;
    const t = npc && npc.trainer;
    const ctx = {
      kind: t ? 'trainer' : c.kind || 'patient',
      trainerId: npc ? npc.id : null,
      trainerName: t ? fill(t.name || npc.name) : null,
      money: t ? t.money || 0 : c.money || 0,
      lose: t ? t.lose : null,
      noBlackout: !!(c.noBlackout || (t && t.noBlackout)),
      decayMul: (t && t.hard) || 1,
      xp: t && t.xp,
      music: c.music || (t && t.music),
    };
    this.wait = { type: 'battle' };
    Game.startBattle(CASES[c.battle], ctx, win => {
      this.resume(win ? [...(c.win || []), ...((t && t.win) || [])] : c.lose || []);
    });
  },
};

// Desafio de treinador: "!", caminha até o jogador, fala e começa o caso
function challengeCmds(npc, spotted) {
  const t = npc.trainer;
  return [
    ...(spotted ? [{ exclaim: npc.id }, { approach: npc.id }] : [{ face: npc.id, dir: 'player' }]),
    ...(t.intro ? [{ say: t.intro, speaker: npc.name }] : []),
    { battle: t.case, trainer: npc.id },
  ];
}

// Bloco de diálogo (formato simples dos NPCs) → lista de comandos
function blockCmds(b) {
  const cmds = [];
  if (b.say || b.random) cmds.push({ say: b.say || [], random: b.random, speaker: b.speaker });
  if (b.set) cmds.push({ set: b.set });
  if (b.unset) cmds.push({ unset: b.unset });
  if (b.do) cmds.push(...b.do);
  if (b.battle) {
    cmds.push({
      ask: 'Iniciar o atendimento?', yesLabel: 'Atender', noLabel: 'Agora não',
      yes: [{ battle: b.battle, kind: 'patient', noBlackout: true }],
    });
  }
  if (b.opens) cmds.push({ opens: b.opens, category: b.category });
  return cmds;
}
