'use strict';
// Atendimento em turnos. Cada ação gasta tempo; o paciente piora a cada turno
// até ser estabilizado. Vence quem acerta o diagnóstico e faz as condutas essenciais.
// A equipe (habilidades) e a mochila (itens) ajudam sem gastar turno.
const CATS = [
  { key: 'anamnese', label: 'ANAMNESE' },
  { key: 'fisico', label: 'EX. FÍSICO' },
  { key: 'exames', label: 'EXAMES' },
  { key: 'conduta', label: 'CONDUTA' },
  { key: 'dx', label: 'DIAGNÓSTICO' },
  { key: 'equipe', label: 'EQUIPE' },
  { key: 'mochila', label: 'MOCHILA' },
  { key: 'chart', label: 'PRONTUÁRIO' },
];
const MIN_CLUES = 2;

function vitalColor(k, v) {
  const R = '#ff8080', Y = '#ffd86a', N = '#f8f8f8';
  switch (k) {
    case 'pas': return v < 90 || v >= 180 ? R : v < 100 || v >= 160 ? Y : N;
    case 'fc': return v >= 120 || v < 50 ? R : v > 100 ? Y : N;
    case 'fr': return v >= 28 || v < 10 ? R : v > 20 ? Y : N;
    case 'spo2': return v < 90 ? R : v < 94 ? Y : N;
    case 'temp': return v >= 39 ? R : v >= 37.8 ? Y : N;
  }
  return N;
}

const Battle = {
  // ctx: { kind: 'wild'|'trainer'|'patient', trainerName, money, lose, decayMul, xp }
  start(c, ctx = {}) {
    this.c = c;
    this.ctx = ctx;
    this.stab = c.stability;
    this.shownStab = c.stability;
    this.turn = 1;
    this.mistakes = 0;
    this.stabilize = 0;
    this.used = new Set();
    this.done = new Set();
    this.clues = new Set();
    this.log = [];
    this.dxDone = false;
    this.over = false;
    this.result = null;
    this.freeNext = 0;
    this.freeExam = 0;
    this.freeAnamnese = 0;
    this.guard = null;
    this.orderErrors = 0;
    this.tagTurn = {};
    this.fired = new Set();
    this.missed = new Set(); // ids de flashcards que o jogador errou neste atendimento
    this.totalClues = ['anamnese', 'fisico', 'exames'].reduce((n, k) => n + c[k].filter(o => o.clue).length, 0);
    this.dxOrder = shuffle(c.dx.map((_, i) => i));
    this.cursors = {};
    this.msg = new MsgBox(BOX);
    this.grid = 0;
    this.list = null;
    this.phase = 'intro';
    this.t = 0;
    this.shake = 0;
    this.flash = 0;
    this.fade = 0;
    this.particles = [];
    this.spr = getChar(c.id, c.pal);
    this.portrait = Assets.img['portrait:' + c.id] || null;
  },

  // ---------- sequenciador: mensagens, esperas e funções em fila ----------
  run(steps, done) {
    this.steps = steps.slice();
    this.stepsDone = done;
    this.next();
  },

  next() {
    const s = this.steps.shift();
    if (!s) {
      const d = this.stepsDone;
      this.stepsDone = null;
      if (d) d();
      return;
    }
    if (s.msg) {
      this.phase = 'msg';
      this.msg.open(s.msg, () => this.next());
    } else if (s.wait) {
      this.phase = 'wait';
      this.waitT = s.wait;
    } else if (s.reader) {
      this.phase = 'reader';
      UI.push(new Reader(s.reader.title, s.reader.blocks, { onClose: () => this.next() }));
    } else {
      const more = s.fn();
      if (more) this.steps.unshift(...more);
      this.next();
    }
  },

  toMenu() {
    if (!this.over) this.phase = 'menu';
  },

  toList() {
    if (!this.over) this.phase = 'list';
  },

  say(msgs, then = () => this.toMenu()) {
    this.run([{ msg: msgs }], then);
  },

  // ---------- ações ----------
  openCat(key) {
    const c = this.c;
    if (key === 'chart') {
      UI.push(new Reader(`Prontuário — ${c.name}, ${c.age} anos`, [
        { p: c.intro.join(' ') },
        this.log.length ? { list: this.log } : { p: 'Nada registrado ainda.' },
      ]));
      return;
    }
    if (key === 'dx') {
      if (this.dxDone) return this.say(['O diagnóstico já foi definido. Agora, a conduta!']);
      if (this.clues.size < MIN_CLUES) return this.say(['Ainda faltam dados para levantar hipóteses. Colha mais informações!']);
    }
    let items;
    if (key === 'dx') {
      items = this.dxOrder.map(i => ({ label: c.dx[i].name, id: 'dx' + i, ref: c.dx[i] }));
    } else if (key === 'equipe') {
      if (!Game.save.team.length) return this.say(['Você ainda não tem equipe.']);
      items = Game.save.team.map(m => ({ label: `${TEAM[m.id].name}: ${TEAM[m.id].abilityName} (${m.uses}/${memberMaxUses(m)})`, ref: m, dim: !m.uses }));
    } else if (key === 'mochila') {
      items = Object.keys(ITEMS).filter(id => ITEMS[id].battle && itemCount(id) > 0)
        .map(id => ({ label: `${ITEMS[id].name} x${itemCount(id)}`, ref: id }));
      if (!items.length) return this.say(['A mochila está vazia. Compre itens na farmácia dos Postos de Descanso.']);
    } else {
      items = c[key].map((o, i) => ({ label: (o.q || o.name) + ((this.current(o).cost || 1) > 1 ? ' (demora)' : ''), id: key + i, ref: o }));
    }
    for (const it of items) if (it.id) it.dim = this.used.has(it.id);
    this.listKey = key;
    this.list = new ListMenu(items, BOX, 5, this.cursors[key] || 0);
    this.phase = 'list';
  },

  act(it) {
    const key = this.listKey, o = it.ref, id = it.id;
    this.cursors[key] = this.list.i;
    if (key === 'dx') return this.diagnose(o, id);
    if (key === 'conduta') return this.treat(o, id);
    if (key === 'equipe') return this.useMember(o);
    if (key === 'mochila') return this.useItem(o);

    const cur = this.current(o);
    if (this.used.has(id) && !cur.repeatable) return this.say([cur.a], () => this.toList());
    this.used.add(id);
    this.addTags(cur.tag);
    if (cur.clue) this.clues.add(id);
    this.log.push(`${o.q}: ${cur.a}`);
    const effect = cur.effect || 0;
    if (effect < 0) this.countError(cur.orderError);
    const cost = this.turnCost(key, cur.cost || 1);
    const msgs = [{ anamnese: `Você pergunta: "${o.q}"`, fisico: `Exame físico — ${o.q}.`, exames: `Você solicita: ${o.q}.` }[key]];
    if (cost > 1) msgs.push('O resultado demora... o tempo passa.');
    if (cost === 0) msgs.push('(sem gastar tempo!)');
    if (!cur.img) return this.resolve([...msgs, cur.a], effect, cost);
    this.resolve(msgs, effect, cost, [{ reader: { title: o.q, blocks: [{ img: cur.img }, { p: cur.a }] } }]);
  },

  // ---------- ordem das ações ----------
  // Condição sobre o que já foi feito NESTE atendimento: 'tag', '!tag' ou lista (todas)
  has(cond) {
    if (!cond) return true;
    if (Array.isArray(cond)) return cond.every(c => this.has(c));
    return cond.startsWith('!') ? !this.done.has(cond.slice(1)) : this.done.has(cond);
  },

  // A primeira variante cuja condição valer substitui os campos da ação
  current(o) {
    const v = (o.variants || []).find(x => this.has(x.if));
    return v ? { ...o, ...v } : o;
  },

  addTags(tag) {
    for (const t of [].concat(tag || [])) {
      if (this.done.has(t)) continue;
      this.done.add(t);
      this.tagTurn[t] = this.turn;
    }
  },

  countError(order) {
    this.mistakes++;
    if (order) this.orderErrors++;
  },

  // Eventos do caso: { after: 'tag', turns, unless, effect, msg } ou { turn, unless, effect, msg }
  events() {
    const steps = [];
    for (const ev of this.c.events || []) {
      if (this.fired.has(ev) || (ev.unless && this.has(ev.unless))) continue;
      const due = ev.after
        ? this.tagTurn[ev.after] !== undefined && this.turn - this.tagTurn[ev.after] >= (ev.turns || 1)
        : this.turn >= ev.turn;
      if (!due) continue;
      this.fired.add(ev);
      if ((ev.effect || 0) < 0) this.countError(true);
      steps.push({ msg: [ev.msg] });
      if (ev.effect) steps.push({ fn: () => this.changeStab(ev.effect) }, { wait: 26 });
    }
    return steps;
  },

  // Ações grátis (habilidades e Café) consomem o próximo custo de turno
  turnCost(kind, base) {
    if (kind === 'anamnese' && this.freeAnamnese > 0) { this.freeAnamnese--; return 0; }
    if (kind === 'exames' && this.freeExam > 0) { this.freeExam--; return 0; }
    if (this.freeNext > 0) { this.freeNext--; return 0; }
    return base;
  },

  treat(base, id) {
    if (this.used.has(id)) return this.say(['Você já fez isso.'], () => this.toList());
    const o = this.current(base);
    const missing = (o.requires || []).find(r => !this.done.has(r.tag));
    const harmful = missing ? missing.dmg > 0 : (o.effect || 0) < 0;
    if (harmful) {
      const bi = CASES[this.c.id].conduta.findIndex(x => x.name === base.name);
      if (bi >= 0) this.missed.add(`${this.c.id}:${missing ? 'antes' : 'erro'}:${bi}`);
    }
    if (harmful && this.guard) {
      const who = this.guard;
      this.guard = null;
      if (!missing) this.used.add(id);
      return this.resolve([`Você ia fazer: ${o.name}.`, `${who}: "Espera! ${missing ? missing.msg : o.msg}"`], 0, 0);
    }
    if (missing) {
      if (missing.dmg) this.countError(true);
      return this.resolve([`Você tenta: ${o.name}.`, missing.msg], -(missing.dmg || 0), this.turnCost('conduta', 1));
    }
    // Fora de hora (orderError): causa o dano, mas não conta como feita e pode ser refeita depois
    const early = o.orderError && (o.effect || 0) < 0;
    if (!early) {
      this.used.add(id);
      this.addTags(o.tag);
      this.stabilize += o.stabilize || 0;
    }
    if ((o.effect || 0) < 0) this.countError(o.orderError);
    this.log.push(`Conduta: ${o.name}.`);
    this.resolve([`Conduta: ${o.name}.`, o.msg], o.effect || 0, this.turnCost('conduta', o.cost || 1));
  },

  diagnose(d, id) {
    if (this.used.has(id)) return this.say(['Você já descartou essa hipótese.'], () => this.toList());
    if (d.needs && !this.done.has(d.needs.tag)) return this.say([d.needs.msg], () => this.toList());
    this.used.add(id);
    if (d.ok) {
      this.dxDone = true;
      this.addTags('__dx');
      this.log.push(`Diagnóstico: ${d.name}.`);
      Sound.sfx('correct');
      const msgs = [`Hipótese: ${d.name}.`, 'Diagnóstico correto!', d.msg];
      if (!this.isWon()) msgs.push('Agora, a CONDUTA!');
      return this.resolve(msgs, 0, 0);
    }
    this.mistakes++;
    this.missed.add(`${this.c.id}:dx`);
    Sound.sfx('wrong');
    this.log.push(`Descartado: ${d.name}.`);
    this.resolve([`Hipótese: ${d.name}.`, 'Hmm... não se encaixa.', d.why], -6, 1);
  },

  useMember(m) {
    const def = TEAM[m.id];
    if (!m.uses) return this.say([`${def.name} está sem energia. Descanse num Posto de Descanso.`], () => this.toList());
    m.uses--;
    const msgs = [`${def.name} usa ${def.abilityName}!`, `"${def.line}"`];
    let delta = 0;
    switch (def.ability) {
      case 'monitor': delta = def.power; this.stabilize += 2; msgs.push('O paciente passa a piorar mais devagar.'); break;
      case 'suporte': delta = def.power; break;
      case 'checagem': this.guard = def.name; msgs.push('A próxima conduta errada será interceptada.'); break;
      case 'expresso': this.freeExam += def.power; msgs.push('O próximo exame não gasta turno.'); break;
      case 'acolhimento': this.freeAnamnese += def.power; msgs.push(`As próximas ${def.power} perguntas não gastam turno.`); break;
    }
    this.resolve(msgs, delta, 0);
  },

  useItem(id) {
    const c = this.c, name = ITEMS[id].name;
    const use = msgs => { addItem(id, -1); this.resolve([`Você usa: ${name}.`, ...msgs], 0, 0); };
    switch (id) {
      case 'cafe':
        this.freeNext++;
        return use(['Energia renovada! A próxima ação não gasta turno.']);
      case 'manual': {
        if (this.dxDone) return this.say(['O diagnóstico já está definido.'], () => this.toList());
        const i = this.dxOrder.find(k => !c.dx[k].ok && !this.used.has('dx' + k));
        if (i === undefined) return this.say(['Não há mais hipóteses erradas para descartar.'], () => this.toList());
        this.used.add('dx' + i);
        this.log.push(`Descartado (manual): ${c.dx[i].name}.`);
        return use([`O manual ajuda a descartar: ${c.dx[i].name}.`, c.dx[i].why]);
      }
      case 'lanche':
        for (const m of Game.save.team) m.uses = Math.min(memberMaxUses(m), m.uses + 1);
        return use(['A equipe recuperou 1 uso de habilidade.']);
      case 'teleconsulta':
        return use([`Preceptor: "${this.hint()}"`]);
    }
  },

  // Dica da teleconsulta: diagnóstico, depois a próxima conduta essencial (ou o que ela exige antes)
  hint() {
    const c = this.c;
    if (!this.dxDone) return `Pense em ${c.dx.find(d => d.ok).name}. Confirme com os dados.`;
    for (const tag of c.required) {
      if (this.done.has(tag)) continue;
      const tagged = t => x => [].concat(x.tag || []).includes(t);
      const o = this.current(c.conduta.find(tagged(tag)));
      const miss = (o.requires || []).find(r => !this.done.has(r.tag));
      if (!miss) return `Não esqueça: ${o.name}.`;
      const info = ['anamnese', 'fisico', 'exames'].flatMap(k => c[k]).find(tagged(miss.tag));
      const pre = c.conduta.find(tagged(miss.tag));
      return `Antes de "${o.name}", faça: ${(info && info.q) || (pre && pre.name) || 'o que falta'}.`;
    }
    return 'Você está no caminho certo.';
  },

  resolve(msgs, delta, turns, extra = []) {
    const steps = [{ msg: msgs }, ...extra];
    if (delta) steps.push({ fn: () => this.changeStab(delta) }, { wait: 30 });
    steps.push({ fn: () => this.outcome() || this.decay(turns) });
    this.run(steps, () => this.toMenu());
  },

  changeStab(d) {
    this.stab = clamp(this.stab + d, 0, 100);
    if (d < 0) {
      this.shake = 18;
      this.flash = 16;
      Sound.sfx('hit');
    } else {
      Sound.sfx('heal');
      for (let i = 0; i < 8; i++) {
        this.particles.push({ x: 180 + Math.random() * 40, y: 30 + Math.random() * 30, vy: -0.4 - Math.random() * 0.5, life: 50 });
      }
    }
  },

  decay(turns) {
    if (!turns) return null;
    this.turn += turns;
    const levelFactor = Math.max(0.7, 1 - 0.05 * (Game.level() - 1));
    const per = Math.max(0, this.c.decay * (this.ctx.decayMul || 1) - this.stabilize);
    const dmg = Math.round(per * levelFactor * turns);
    const steps = [];
    if (dmg > 0) {
      const old = this.stab, now = old - dmg, n = this.c.name;
      steps.push({ fn: () => { this.stab = clamp(now, 0, 100); this.shake = 8; Sound.sfx(old >= 25 && now < 25 ? 'alarm' : 'decay'); } }, { wait: 24 });
      if (turns > 1) steps.push({ msg: [`Enquanto isso, ${n} piorou!`] });
      else if (old >= 25 && now < 25) steps.push({ msg: [`${n} está em estado crítico! Aja rápido!`] });
      else if (old >= 50 && now < 50) steps.push({ msg: [`${n} está piorando...`] });
    }
    steps.push(...this.events());
    if (!steps.length) return null;
    steps.push({ fn: () => this.outcome() });
    return steps;
  },

  isWon() {
    return this.dxDone && this.c.required.every(t => this.done.has(t));
  },

  outcome() {
    if (this.stab <= 0) return this.endSteps(false);
    if (this.isWon()) return this.endSteps(true);
    return null;
  },

  endSteps(win) {
    const c = this.c, ctx = this.ctx;
    this.over = true;
    this.result = win ? 'win' : 'lose';
    const base = ctx.xp || (ctx.kind === 'wild' ? 60 : 100);
    const xp = win ? Math.max(20, base - this.mistakes * 15 - Math.max(0, this.turn - c.par) * 4) : 10;
    const intro = win
      ? [`${c.name} está estável!`, ...(ctx.lose || []).map(fill)]
      : [`${c.name} evoluiu com instabilidade grave...`, 'O preceptor assumiu o caso.'];
    return [
      { fn: () => Sound.music(win ? 'vitoria' : 'derrota', { loop: false }) },
      { msg: intro },
      {
        fn: () => {
          const before = Game.level();
          Game.save.xp += xp;
          const m = [`Você ganhou ${xp} XP.`];
          if (win && ctx.money) {
            Game.save.money += ctx.money;
            m.push(`Você recebeu R$ ${ctx.money} pelo atendimento.`);
          }
          if (win && this.mistakes) m.push(`Condutas ou hipóteses erradas: ${this.mistakes}. Turnos: ${this.turn}.`);
          if (this.orderErrors) m.push(`Erros de sequência (ordem das ações): ${this.orderErrors}. Veja a ordem ideal em "Ver caso completo".`);
          if (Game.level() > before) {
            Sound.sfx('levelup');
            m.push(`Você subiu para o nível ${Game.level()}! A experiência deixa sua conduta mais ágil.`);
          }
          if (win) m.push(...teamGainXp(Math.round(xp / 2)));
          if (!Game.save.seen.includes(c.id)) Game.save.seen.push(c.id);
          markVersionSeen(c);
          const fc = cardsAfterCase(this.missed);
          if (fc.added) m.push(`${fc.added} flashcard(s) novo(s) deste caso para revisar (menu → FLASHCARDS).`);
          if (fc.reset) m.push(`${fc.reset} flashcard(s) voltaram para o início por causa dos erros.`);
          return [{ msg: m }];
        },
      },
      { msg: ['RESUMO DO CASO', ...c.teaching] },
      { fn: () => this.endMenu() },
    ];
  },

  endMenu() {
    this.phase = 'end';
    this.noteSaved = false;
    const leave = () => { UI.pop(); this.phase = 'out'; this.fade = 0; };
    const saveItem = { label: 'Salvar nas anotações', act: () => save() };
    // Mesmo objeto usado pelo leitor: ao salvar, o rodapé dele muda na hora
    const studyOpts = { okLabel: 'salvar nas anotações', onOk: () => save() };
    const save = () => {
      if (this.noteSaved) return;
      this.noteSaved = true;
      Game.save.notes.push(makeNote(this.c, this));
      Game.persist();
      Sound.sfx('save');
      Object.assign(saveItem, { label: 'Salvo nas anotações', dim: true });
      Object.assign(studyOpts, { okLabel: null, onOk: null, status: 'Salvo nas anotações!' });
    };
    const items = [
      { label: 'Ver caso completo', act: () => openCaseStudy(this.c, studyOpts) },
      saveItem,
      { label: 'Continuar', act: leave },
    ];
    UI.push(new PopupMenu(items, { x: 120, y: 112, w: 132, h: 47 }, it => it.act(), {
      prompt: 'Caso encerrado. O que deseja fazer?',
      onBack: leave,
    }));
  },

  // ---------- loop ----------
  update() {
    this.t++;
    if (this.shake > 0) this.shake--;
    if (this.flash > 0) this.flash--;
    this.shownStab += (this.stab - this.shownStab) * 0.1;
    if (Math.abs(this.stab - this.shownStab) < 0.3) this.shownStab = this.stab;
    for (const p of this.particles) { p.y += p.vy; p.life--; }
    this.particles = this.particles.filter(p => p.life > 0);

    switch (this.phase) {
      case 'intro':
        if (this.t >= 45) {
          const who = this.ctx.trainerName ? [`${this.ctx.trainerName} apresenta um caso!`] : [];
          this.run([{ msg: [...who, ...this.c.intro] }], () => this.toMenu());
        }
        break;
      case 'msg':
        this.msg.update();
        break;
      case 'wait':
        if (--this.waitT <= 0) this.next();
        break;
      case 'menu': {
        const g = this.grid, n = CATS.length;
        if (Input.take('left') || Input.take('right')) this.grid = g ^ 1;
        if (Input.take('up')) this.grid = (g - 2 + n) % n;
        if (Input.take('down')) this.grid = (g + 2) % n;
        if (this.grid !== g) Sound.sfx('cursor');
        if (Input.take('ok')) { Sound.sfx('confirm'); this.openCat(CATS[this.grid].key); }
        break;
      }
      case 'list': {
        const r = this.list.update();
        if (r && r.back) this.phase = 'menu';
        else if (r) this.act(this.list.items[r.pick]);
        break;
      }
      case 'out':
        if (++this.fade >= 24) Game.endBattle(this.result === 'win');
        break;
    }
  },

  vitals() {
    const v = this.c.vitals, s = this.shownStab, s0 = this.c.stability, out = {};
    for (const k in v.start) {
      out[k] = s >= s0
        ? v.start[k] + (v.ok[k] - v.start[k]) * ((s - s0) / (100 - s0))
        : v.start[k] + (v.crit[k] - v.start[k]) * ((s0 - s) / s0);
    }
    return out;
  },

  draw() {
    const t = this.t;
    this.drawBackground();
    const intro = this.phase === 'intro' ? Math.min(1, t / 40) : 1;
    const ease = 1 - Math.pow(1 - intro, 3);

    let px = Math.round(168 - (1 - ease) * 220);
    if (this.shake) px += Math.round(Math.sin(this.shake * 1.7) * 3);
    if (!(this.flash && (this.flash >> 1) % 2)) {
      const img = this.portrait;
      // Retrato: centralizado no x da plataforma (200) e apoiado nela (y 78)
      if (img) ctx.drawImage(img, px + 32 - Math.round(img.width / 2), 78 - img.height);
      else drawChar(this.spr, 'down', 0, px, 10, 4);
    }
    const bob = this.phase === 'menu' && Math.sin(t / 10) < 0 ? 1 : 0;
    drawChar(PLAYER_SPR, 'up', 0, Math.round(34 + (1 - ease) * 220), 92 + bob, 4);

    for (const p of this.particles) {
      text('+', p.x, p.y, { size: 10, bold: true, color: `rgba(120,255,140,${Math.min(1, p.life / 20)})`, shadow: false });
    }

    if (intro >= 1) {
      this.drawPatientBox();
      this.drawDoctorBox();
    }
    this.drawBottom();

    if (this.result) {
      const win = this.result === 'win';
      drawWindow(48, 70, 160, 24);
      text(win ? 'CASO RESOLVIDO!' : 'O PRECEPTOR ASSUMIU', W / 2, 77, { bold: true, align: 'center', color: win ? '#ffe070' : '#ff9a9a' });
    }

    let dark = 0;
    if (this.phase === 'intro' && t < 12) dark = 1 - t / 12;
    if (this.phase === 'out') dark = this.fade / 24;
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  drawBackground() {
    if (Assets.img.battleBg) {
      ctx.drawImage(Assets.img.battleBg, 0, 0);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#f6f0dc');
    g.addColorStop(0.36, '#e6dcbc');
    g.addColorStop(0.37, '#cfe0c8');
    g.addColorStop(1, '#94b88c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let y = 86; y < 158; y += 7) ctx.fillRect(0, y, W, 1);
    for (const [cx, cy, rx, ry] of [[200, 76, 46, 11], [66, 152, 52, 12]]) {
      ctx.fillStyle = '#5f8458';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#86ac7e';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawPatientBox() {
    const c = this.c, v = this.vitals();
    drawWindow(6, 6, 130, 54);
    text(`${c.name}, ${c.age}a`, 12, 10, { bold: true });
    text('ESTAB', 12, 23, { size: 7, color: '#ffd86a' });
    drawBar(40, 25, 88, 4, this.shownStab / 100);

    const row = (y, items) => {
      let x = 12;
      for (const [label, val, k] of items) {
        text(label, x, y, { size: 7, color: '#b4c0f0' });
        x += textWidth(label, 7) + 2;
        text(val, x, y, { size: 7, color: vitalColor(k, v[k]) });
        x += textWidth(val, 7) + 6;
      }
    };
    row(34, [['PA', `${Math.round(v.pas)}/${Math.round(v.pad)}`, 'pas'], ['FC', `${Math.round(v.fc)}`, 'fc']]);
    row(44, [
      ['FR', `${Math.round(v.fr)}`, 'fr'],
      ['SpO2', `${Math.round(v.spo2)}%`, 'spo2'],
      ['T', v.temp.toFixed(1).replace('.', ','), 'temp'],
    ]);
  },

  drawDoctorBox() {
    const xp = Game.save.xp;
    drawWindow(134, 102, 118, 52);
    text(fit(Game.save.name.toUpperCase(), 80), 140, 107, { bold: true });
    text(`Nv ${Game.level()}`, 246, 107, { align: 'right', size: 7 });
    text('XP', 140, 120, { size: 7, color: '#ffd86a' });
    drawBar(154, 122, 90, 3, (xp % XP_PER_LEVEL) / XP_PER_LEVEL);
    text(`Pistas ${this.clues.size}/${this.totalClues}`, 140, 131, { size: 7 });
    text(`Turno ${this.turn}`, 246, 131, { size: 7, align: 'right' });
    const buffs = [this.guard && 'checagem', this.freeNext && 'café', this.freeExam && 'expresso', this.freeAnamnese && 'acolhimento'].filter(Boolean);
    const status = buffs.length ? buffs.join(' · ') : this.dxDone ? 'Diagnóstico: OK' : 'Diagnóstico: ?';
    text(fit(status, 104, 7), 140, 140, { size: 7, color: buffs.length ? '#ffd86a' : this.dxDone ? '#90f0a0' : '#b4c0f0' });
  },

  drawBottom() {
    if (this.phase === 'msg') return this.msg.draw();
    if (this.phase === 'list') return this.list.draw();
    if (this.phase !== 'menu') return drawWindow(BOX.x, BOX.y, BOX.w, BOX.h);

    drawWindow(4, 158, 98, 62);
    const hint = this.stab < 25 ? `${this.c.name} está crítico! O que fazer?` : 'O que fazer?';
    wrap(hint, 80).forEach((l, i) => text(l, 12, 166 + i * LINE_H, { color: this.stab < 25 ? '#ff9a9a' : '#f8f8f8' }));

    drawWindow(102, 158, 150, 62);
    CATS.forEach((cat, i) => {
      const x = 116 + (i % 2) * 70, y = 165 + Math.floor(i / 2) * 12;
      const dim = cat.key === 'dx' && (this.dxDone || this.clues.size < MIN_CLUES);
      if (i === this.grid) drawCursor(x - 8, y + 1);
      text(cat.label, x, y, { size: 7, color: dim ? '#97a3cf' : '#f8f8f8' });
    });
  },
};
