'use strict';
// Telas sobrepostas: leitor de documentos, menus, biblioteca e anotações.
// Enquanto houver algo em UI.stack, só a tela do topo recebe input e o jogo por trás fica pausado.
const UI = {
  stack: [],
  push(s) { this.stack.push(s); return s; },
  pop() {
    const s = this.stack.pop();
    if (s && s.onClose) s.onClose();
  },
  get active() { return this.stack.length > 0; },
  update() { this.stack[this.stack.length - 1].update(); },
  draw() { this.stack.forEach(s => s.draw()); },
};

const SHEET = { x: 4, y: 24, w: 248, h: 182 };

function drawSheetFrame(title, hint) {
  ctx.fillStyle = 'rgba(6,8,20,0.6)';
  ctx.fillRect(0, 0, W, H);
  drawWindow(4, 4, 248, 20);
  text(fit(title, 226), 12, 9, { bold: true });
  drawWindow(4, 206, 248, 16);
  text(hint, W / 2, 210, { size: 7, align: 'center', color: '#c8d0f0' });
}

// ---------- leitor de documentos (blocos: h, p, list, tip, img) ----------
class Reader {
  constructor(title, blocks, opts = {}) {
    this.title = title;
    this.opts = opts;
    this.onClose = opts.onClose;
    this.scroll = 0;
    this.layout(blocks);
  }

  layout(blocks) {
    const ops = [], Wd = SHEET.w - 24;
    let y = 0;
    for (const b of blocks) {
      if (b.h) {
        if (y) y += 5;
        for (const l of wrap(b.h, Wd - 8)) { ops.push({ t: 'text', s: l, x: 0, y, bold: true, color: '#ffe08a' }); y += 12; }
        y += 2;
      }
      if (b.p) {
        for (const l of wrap(b.p, Wd)) { ops.push({ t: 'text', s: l, x: 0, y }); y += LINE_H; }
        y += 5;
      }
      if (b.list) {
        for (const item of b.list) {
          ops.push({ t: 'bullet', x: 2, y });
          for (const l of wrap(item, Wd - 10)) { ops.push({ t: 'text', s: l, x: 10, y }); y += LINE_H; }
          y += 2;
        }
        y += 4;
      }
      if (b.tip) {
        const lines = wrap(b.tip, Wd - 16), h = lines.length * LINE_H + 8;
        ops.push({ t: 'box', x: 0, y, w: Wd, h });
        lines.forEach((l, i) => ops.push({ t: 'text', s: l, x: 8, y: y + 5 + i * LINE_H, color: '#fff2b0' }));
        y += h + 7;
      }
      if (b.img) {
        const im = Assets.file(b.img);
        const w = Math.round(b.w ? Math.min(b.w, Wd) : Math.min(Wd, im ? im.width : Wd));
        const h = im ? Math.round(w * im.height / im.width) : 56;
        ops.push({ t: 'img', im, src: b.img, x: Math.round((Wd - w) / 2), y, w, h });
        y += h + 4;
        if (b.caption) {
          for (const l of wrap(b.caption, Wd, 7)) { ops.push({ t: 'text', s: l, x: Wd / 2, y, size: 7, color: '#c0c8f0', align: 'center' }); y += 9; }
        }
        y += 6;
      }
    }
    this.ops = ops;
    this.height = y;
  }

  maxScroll() {
    return Math.max(0, this.height - (SHEET.h - 14));
  }

  update() {
    const max = this.maxScroll(), page = SHEET.h - 30;
    if (Input.held('up')) this.scroll -= 3;
    if (Input.held('down')) this.scroll += 3;
    if (Input.take('left')) this.scroll -= page;
    if (Input.take('right')) this.scroll += page;
    this.scroll = clamp(this.scroll, 0, max);
    if (Input.take('back')) { Sound.sfx('back'); return UI.pop(); }
    if (Input.take('ok')) {
      if (this.opts.okLabel && this.opts.onOk) this.opts.onOk(this);
      else if (this.scroll >= max) UI.pop();
      else this.scroll = Math.min(max, this.scroll + page);
    }
  }

  draw() {
    let hint = 'Setas: rolar · X: voltar';
    if (this.opts.okLabel) hint += ` · Z: ${this.opts.okLabel}`;
    if (this.opts.status) hint = `${this.opts.status} · ${hint}`;
    drawSheetFrame(this.title, hint);
    drawWindow(SHEET.x, SHEET.y, SHEET.w, SHEET.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(SHEET.x + 3, SHEET.y + 3, SHEET.w - 6, SHEET.h - 6);
    ctx.clip();
    const ox = SHEET.x + 12, oy = SHEET.y + 7 - Math.round(this.scroll);
    for (const o of this.ops) {
      const y = oy + o.y;
      if (y > SHEET.y + SHEET.h || y + (o.h || 12) < SHEET.y) continue;
      switch (o.t) {
        case 'text':
          text(o.s, ox + o.x, y, { size: o.size, bold: o.bold, color: o.color, align: o.align });
          break;
        case 'bullet':
          ctx.fillStyle = '#ffe08a';
          ctx.fillRect(ox + o.x, y + 3, 3, 3);
          break;
        case 'box':
          ctx.fillStyle = 'rgba(255,224,120,0.14)';
          ctx.fillRect(ox + o.x, y, o.w, o.h);
          ctx.fillStyle = '#ffe08a';
          ctx.fillRect(ox + o.x, y, 2, o.h);
          break;
        case 'img':
          if (o.im) {
            ctx.fillStyle = '#101828';
            ctx.fillRect(ox + o.x - 1, y - 1, o.w + 2, o.h + 2);
            // Foto/ECG reduzido fica suave; pixel art ampliada fica nítida
            ctx.imageSmoothingEnabled = o.im.width > o.w;
            ctx.drawImage(o.im, ox + o.x, y, o.w, o.h);
            ctx.imageSmoothingEnabled = false;
          } else {
            ctx.strokeStyle = '#97a3cf';
            ctx.setLineDash([3, 2]);
            ctx.lineWidth = 0.75;
            ctx.strokeRect(ox + o.x + 0.5, y + 0.5, o.w - 1, o.h - 1);
            ctx.setLineDash([]);
            text('[imagem]', ox + o.x + o.w / 2, y + o.h / 2 - 10, { align: 'center', color: '#97a3cf' });
            text(fit(o.src, o.w - 10, 7), ox + o.x + o.w / 2, y + o.h / 2 + 2, { size: 7, align: 'center', color: '#97a3cf' });
          }
          break;
      }
    }
    ctx.restore();

    const max = this.maxScroll();
    if (max > 0) {
      const trackY = SHEET.y + 5, trackH = SHEET.h - 10;
      const thumbH = Math.max(10, trackH * (SHEET.h / (this.height + 14)));
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(SHEET.x + SHEET.w - 7, trackY, 2, trackH);
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(SHEET.x + SHEET.w - 7, trackY + (trackH - thumbH) * (this.scroll / max), 2, thumbH);
    }
  }
}

// ---------- menu em tela cheia ----------
class MenuScreen {
  constructor(title, items, onPick, opts = {}) {
    this.title = title;
    this.onPick = onPick;
    this.opts = opts;
    this.setItems(items);
  }

  setItems(items) {
    const start = this.menu ? this.menu.i : 0;
    this.empty = !items.length;
    const list = this.empty ? [{ label: this.opts.empty || 'Nada por aqui.', dim: true }] : items;
    this.menu = new ListMenu(list, SHEET, 15, Math.min(start, list.length - 1));
  }

  update() {
    const r = this.menu.update();
    if (!r) return;
    if (r.back) return UI.pop();
    if (!this.empty) this.onPick(this.menu.items[r.pick], this);
  }

  draw() {
    drawSheetFrame(this.title, this.opts.hint || 'Z: abrir · X: voltar');
    this.menu.draw();
  }
}

// ---------- menu pequeno (com pergunta opcional na caixa de texto) ----------
class PopupMenu {
  constructor(items, rect, onPick, opts = {}) {
    this.menu = new ListMenu(items, rect, items.length);
    this.onPick = onPick;
    this.opts = opts;
  }

  update() {
    if (Input.take('menu') && this.opts.menuCloses) return UI.pop();
    const r = this.menu.update();
    if (!r) return;
    if (r.back) return this.opts.onBack ? this.opts.onBack() : UI.pop();
    this.onPick(this.menu.items[r.pick], this);
  }

  draw() {
    if (this.opts.prompt) {
      drawWindow(BOX.x, BOX.y, BOX.w, BOX.h);
      wrap(this.opts.prompt, BOX.w - 18).forEach((l, i) => text(l, BOX.x + 9, BOX.y + 7 + i * LINE_H));
    }
    this.menu.draw();
  }
}

function confirmBox(prompt, yesLabel, onYes) {
  UI.push(new PopupMenu([{ label: yesLabel, yes: true }, { label: 'Cancelar' }], { x: 160, y: 112, w: 92, h: 42 }, it => {
    UI.pop();
    if (it.yes) onYes();
  }, { prompt }));
}

// ---------- casos como documento ----------
function caseDx(c) {
  return c.dx.find(d => d.ok).name;
}

function caseStudyBlocks(c) {
  const note = c.versionNote ? [{ tip: `Nesta versão: ${c.versionNote}` }] : [];
  return [...note, ...(c.study || [{ list: c.teaching }])];
}

function openCaseStudy(c, opts) {
  UI.push(new Reader(`${c.name} — ${caseDx(c)}`, caseStudyBlocks(c), opts));
}

// ---------- biblioteca ----------
const CASES_SHELF = 'Casos atendidos';

function openLibrary(category) {
  if (category) return openShelf(category);
  const cats = [...new Set(LIBRARY.map(t => t.category))];
  const items = cats.map(cat => {
    const topics = LIBRARY.filter(t => t.category === cat);
    return { label: `${cat}  (${topics.filter(t => check(t.if)).length}/${topics.length})`, cat };
  });
  items.push({ label: `${CASES_SHELF}  (${Game.save.seen.length})`, cat: CASES_SHELF });
  UI.push(new MenuScreen('BIBLIOTECA', items, it => openShelf(it.cat)));
}

function openShelf(cat) {
  if (cat === CASES_SHELF) {
    const items = Game.save.seen.filter(id => CASES[id]).map(id => ({ label: `${CASES[id].name} — ${caseDx(CASES[id])}`, id }));
    UI.push(new MenuScreen(CASES_SHELF.toUpperCase(), items, it => openCaseStudy(CASES[it.id]), {
      empty: 'Nenhum caso atendido ainda.',
    }));
    return;
  }
  const items = LIBRARY.filter(t => t.category === cat).map(t => {
    const open = check(t.if);
    return { label: open ? t.title : '???', dim: !open, topic: t, open };
  });
  UI.push(new MenuScreen(cat.toUpperCase(), items, it => {
    if (it.open) UI.push(new Reader(it.topic.title, it.topic.blocks));
    else UI.push(new Reader('???', [{ p: it.topic.lockedHint || 'Este tópico ainda está bloqueado.' }]));
  }));
}

// ---------- anotações ----------
function makeNote(c, b) {
  return {
    id: Date.now(), caseId: c.id, version: c.version || null, date: new Date().toLocaleDateString('pt-BR'),
    result: b.result, turns: b.turn, mistakes: b.mistakes, log: b.log.slice(),
  };
}

function noteLabel(n) {
  const c = caseVersion(CASES[n.caseId], n.version);
  return `${n.date} · ${c.name} — ${caseDx(c)}`;
}

function noteBlocks(n) {
  const c = caseVersion(CASES[n.caseId], n.version);
  return [
    { p: `${c.name}, ${c.age} anos · atendido em ${n.date}` },
    { tip: n.result === 'win' ? `Caso resolvido em ${n.turns} turnos, com ${n.mistakes} erro(s).` : `O preceptor assumiu o caso no turno ${n.turns}.` },
    { h: 'Meu atendimento' },
    n.log.length ? { list: n.log } : { p: 'Nada registrado.' },
    { h: 'Estudo do caso' },
    ...caseStudyBlocks(c),
  ];
}

function openNotes() {
  const build = () => Game.save.notes.filter(n => CASES[n.caseId]).slice().reverse().map(n => ({ label: noteLabel(n), note: n }));
  const screen = new MenuScreen('ANOTAÇÕES', build(), it => {
    UI.push(new Reader(noteLabel(it.note), noteBlocks(it.note), {
      okLabel: 'apagar',
      onOk: () => confirmBox('Apagar esta anotação?', 'Apagar', () => {
        Game.save.notes = Game.save.notes.filter(n => n.id !== it.note.id);
        Game.persist();
        UI.pop();
        screen.setItems(build());
      }),
    }));
  }, { empty: 'Nenhuma anotação ainda. Salve um caso ao final do atendimento.' });
  UI.push(screen);
}

function openScreen(kind, category) {
  if (kind === 'library') openLibrary(category);
  else if (kind === 'notes') openNotes();
  else if (kind === 'shop') openShop();
  else if (kind === 'review') startReview(10, { title: 'REVISÃO' });
  else if (kind === 'quiz') startReview(REVIEW_SIZE, { title: 'DESAFIO', money: CARD_MONEY });
}

function openPauseMenu() {
  const items = [
    { label: 'EQUIPE', act: openTeam },
    { label: 'MOCHILA', act: openBag },
    { label: 'ATLAS', act: openAtlas },
    { label: 'ANOTAÇÕES', act: openNotes },
    { label: `FLASHCARDS${dueCards().length ? ` (${dueCards().length})` : ''}`, act: openCards },
    { label: 'CARTÃO', act: openCard },
    { label: 'SOM', act: openSoundMenu },
    { label: 'CONTROLES', act: openControls },
    { label: 'FECHAR', act: () => UI.pop() },
  ];
  UI.push(new PopupMenu(items, { x: 132, y: 6, w: 120, h: 14 + items.length * LINE_H }, it => it.act(), { menuCloses: true }));
}

// ---------- equipe ----------
function openTeam() {
  const items = Game.save.team.map(m => {
    const d = TEAM[m.id];
    return { label: `${d.name}  Nv ${memberLevel(m)}  usos ${m.uses}/${memberMaxUses(m)}`, m };
  });
  UI.push(new MenuScreen('EQUIPE', items, it => {
    const d = TEAM[it.m.id], m = it.m;
    UI.push(new Reader(d.name, [
      { p: `${d.role} · Nível ${memberLevel(m)} · XP ${m.xp % MEMBER_XP_PER_LEVEL}/${MEMBER_XP_PER_LEVEL}` },
      { h: d.abilityName },
      { p: d.desc },
      { tip: `Usos: ${m.uses}/${memberMaxUses(m)}. Recupere nos Postos de Descanso ou com um Lanche. A cada 2 níveis, +1 uso.` },
      { p: `"${d.line}"` },
    ]));
  }, { empty: 'Você ainda não tem equipe. Visite a clínica do Dr. Hélio!' }));
}

// ---------- mochila ----------
function bagItems() {
  return Object.keys(ITEMS).filter(id => itemCount(id) > 0).map(id => ({ label: `${ITEMS[id].name}  x${itemCount(id)}`, id }));
}

function openBag() {
  const screen = new MenuScreen(`MOCHILA · R$ ${Game.save.money}`, bagItems(), it => {
    const def = ITEMS[it.id];
    const opts = def.world ? {
      okLabel: 'usar',
      onOk: () => {
        addItem(it.id, -1);
        for (const m of Game.save.team) m.uses = Math.min(memberMaxUses(m), m.uses + 1);
        Sound.sfx('heal');
        UI.pop();
        screen.setItems(bagItems());
      },
    } : {};
    UI.push(new Reader(def.name, [{ p: def.desc }, { p: def.battle ? 'Pode ser usado durante o atendimento (MOCHILA).' : '' }], opts));
  }, { empty: 'A mochila está vazia.' });
  UI.push(screen);
}

// ---------- farmácia / cantina ----------
function openShop() {
  const build = () => SHOP.map(id => ({ label: `${ITEMS[id].name} — R$ ${ITEMS[id].price}  (tem ${itemCount(id)})`, id }));
  const screen = new MenuScreen('', build(), it => {
    const def = ITEMS[it.id];
    if (Game.save.money < def.price) {
      Sound.sfx('wrong');
      return UI.push(new Reader('Sem dinheiro', [{ p: `Você precisa de R$ ${def.price}, e tem R$ ${Game.save.money}. Vença casos para ganhar mais!` }]));
    }
    confirmBox(`Comprar ${def.name} por R$ ${def.price}? ${def.desc}`, 'Comprar', () => {
      Game.save.money -= def.price;
      addItem(it.id, 1);
      Game.persist();
      Sound.sfx('save');
      screen.setItems(build());
      screen.title = `FARMÁCIA · R$ ${Game.save.money}`;
    });
  });
  screen.title = `FARMÁCIA · R$ ${Game.save.money}`;
  UI.push(screen);
}

// ---------- atlas clínico ----------
function openAtlas() {
  const ids = Object.keys(CASES), s = Game.save;
  const items = ids.map((id, i) => {
    const n = String(i + 1).padStart(2, '0'), c = CASES[id];
    if (!s.seen.includes(id)) return { label: `${n}  ???`, dim: true };
    return { label: `${n}  ${caseDx(c)}${s.solved.includes(id) ? '' : '  (visto)'}`, id };
  });
  const seen = s.seen.length, solved = s.solved.length;
  UI.push(new MenuScreen(`ATLAS CLÍNICO · vistos ${seen} · resolvidos ${solved}/${ids.length}`, items, it => {
    if (it.id) openCaseStudy(CASES[it.id]);
  }));
}

// ---------- cartão do residente ----------
function openCard() {
  const s = Game.save, mins = Math.floor((s.playFrames || 0) / 3600);
  UI.push(new Reader('Cartão do Residente', [
    { h: s.name },
    { list: [
      `Nível ${Game.level()} · XP ${s.xp}`,
      `Dinheiro: R$ ${s.money}`,
      `Casos: ${s.seen.length} vistos, ${s.solved.length} resolvidos (de ${Object.keys(CASES).length})`,
      `Anotações: ${s.notes.length}`,
      `Tempo de jogo: ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`,
    ] },
    { h: 'Selos' },
    { list: Object.keys(BADGES).map(id => `${BADGES[id].name}: ${s.badges.includes(id) ? 'conquistado' : '—'}`) },
    { h: 'Equipe' },
    s.team.length ? { list: s.team.map(m => `${TEAM[m.id].name} (${TEAM[m.id].role}) · Nv ${memberLevel(m)}`) } : { p: 'Ninguém ainda.' },
  ]));
}

// ---------- nome do jogador ----------
class NameEntry {
  constructor(onDone) {
    this.name = '';
    this.onDone = onDone;
    this.t = 0;
    Input.textHandler = k => this.key(k);
    // No celular, um campo de texto de verdade abre o teclado
    this.touch = Touch.askName(v => { this.name = v.slice(0, 12); }, () => this.key('Enter'));
  }

  key(k) {
    if (k === 'Enter') {
      if (!this.name.trim()) return;
      Input.textHandler = null;
      Touch.hideName();
      Sound.sfx('confirm');
      UI.pop();
      this.onDone(this.name.trim());
    } else if (k === 'Backspace') {
      this.name = this.name.slice(0, -1);
      Sound.sfx('back');
    } else if (k.length === 1 && this.name.length < 12 && /[\p{L}\p{N} .'-]/u.test(k)) {
      this.name += k;
      Sound.sfx('cursor');
    }
  }

  update() { this.t++; }

  draw() {
    ctx.fillStyle = '#0b0f24';
    ctx.fillRect(0, 0, W, H);
    drawWindow(28, 60, 200, 80);
    text('Qual é o seu nome, residente?', W / 2, 72, { align: 'center', bold: true });
    drawWindow(52, 92, 152, 22);
    const cursor = (this.t >> 4) % 2 ? '_' : ' ';
    text(this.name + cursor, 60, 98, { color: '#ffe08a' });
    text(this.touch ? 'Toque no campo acima, digite e toque em OK' : 'Digite e aperte Enter', W / 2, 122, { size: 7, align: 'center', color: '#c8d0f0' });
  }
}

// ---------- créditos ----------
class Credits {
  constructor() {
    const s = Game.save;
    this.lines = [
      ['PLANTÃO', 'h'], ['um RPG de medicina em 16 bits', 's'], ['', ''],
      [`Especialista ${s.name}`, 'h'],
      [`Nível ${Game.level()} · ${s.solved.length} casos resolvidos`, ''],
      [`Equipe: ${s.team.map(m => TEAM[m.id].name).join(', ')}`, ''], ['', ''],
      ['O vale está mais saudável graças a você.', ''],
      ['O Grupo Cura Milagrosa foi desfeito.', ''], ['', ''],
      ['Roteiro, casos, arte e música', 's'], ['você e quem mais quiser contribuir', ''], ['', ''],
      ['Conteúdo educativo e simplificado.', 's'], ['Estude sempre pelas diretrizes atuais!', ''], ['', ''],
      ['FIM', 'h'],
    ];
    this.y = H;
    Sound.music('titulo');
  }

  update() {
    const end = -this.lines.length * 14 + H / 2;
    this.y = Math.max(end, this.y - 0.4);
    if (this.y <= end && Input.take('ok')) UI.pop();
  }

  draw() {
    ctx.fillStyle = '#0b0f24';
    ctx.fillRect(0, 0, W, H);
    this.lines.forEach(([str, kind], i) => {
      const y = this.y + i * 14;
      if (y < -14 || y > H) return;
      text(str, W / 2, y, { align: 'center', bold: kind === 'h', size: kind === 'h' ? 10 : 8, color: kind === 's' ? '#ffe08a' : '#f8f8f8' });
    });
  }
}

function openSoundMenu() {
  const items = ['music', 'sfx'].map(kind => ({ kind, label: Sound.label(kind) }));
  UI.push(new PopupMenu(items, { x: 132, y: 58, w: 120, h: 36 }, it => {
    Sound.cycle(it.kind);
    it.label = Sound.label(it.kind);
  }));
}

function openControls() {
  UI.push(new Reader('Controles', [
    { h: 'No celular' },
    { list: [
      'Direcional: andar e escolher (dá para deslizar o dedo entre as direções)',
      'A: confirmar / interagir · B: voltar',
      'MENU: equipe, mochila, atlas... · SOM: liga/desliga · ⛶: tela cheia',
    ] },
    { h: 'No teclado' },
    { list: [
      'Setas ou WASD: andar e escolher',
      'Z, Enter ou Espaço: confirmar / interagir',
      'X ou Esc: voltar',
      'C ou Tab: menu (equipe, mochila, atlas, anotações...)',
      'M: liga/desliga o som',
      'Nos textos: setas para rolar; esquerda/direita pulam uma página',
    ] },
  ]));
}
