'use strict';
// Flashcards com revisão espaçada (caixas de Leitner).
// Os cards saem dos casos já vistos (veja caseCards) e dos "cards" escritos em content/cases.js.
// Errou no atendimento ou na revisão: o card volta para a caixa 0 e reaparece logo.
const CARD_DAYS = [0, 1, 2, 4, 8, 16]; // intervalo (dias) ao chegar em cada caixa; 5 = dominado
const DAY_MS = 864e5, RELEARN_MS = 10 * 60e3;
const REVIEW_SIZE = 5; // cards por encontro
const CARD_XP = 6, CARD_MONEY = 10;

// ---------- geração ----------
const cardCache = {};

function caseCards(c) {
  if (cardCache[c.id]) return cardCache[c.id];
  const dx = caseDx(c), cards = [];
  const tagged = t => x => [].concat(x.tag || []).includes(t);
  const label = o => o.q || o.name;

  // 1. Diagnóstico: apresentação + 2 pistas
  const clues = ['anamnese', 'fisico'].flatMap(k => c[k]).filter(o => o.clue).slice(0, 2).map(o => o.a);
  cards.push({
    id: `${c.id}:dx`, caseId: c.id,
    q: [...c.intro, ...clues].join(' ') + ' Qual o diagnóstico?',
    options: c.dx.map(d => ({ label: d.name, ok: !!d.ok, why: d.why })),
    explain: c.dx.find(d => d.ok).msg,
  });

  // 2. O que não pode faltar: as condutas obrigatórias × combinações com erro ou faltando uma
  const harmful = c.conduta.filter(o => (o.effect || 0) < 0 && !o.orderError);
  const ess = c.required.map(t => c.conduta.find(tagged(t))).filter(Boolean);
  if (ess.length) {
    const join = list => list.map(o => o.name).join(' + ');
    const opts = [{ label: join(ess), ok: true }];
    harmful.forEach((h, k) => {
      const swap = ess.slice();
      swap[k % ess.length] = h;
      opts.push({ label: join(swap), why: `${h.name}: ${h.msg}` });
    });
    if (ess.length > 1) opts.push({ label: `Só ${join(ess.slice(0, -1))}`, why: `Faltou: ${ess[ess.length - 1].name}.` });
    if (opts.length > 1) {
      cards.push({
        id: `${c.id}:ess`, caseId: c.id,
        q: `${dx}: quais condutas NÃO podem faltar?`,
        options: opts,
        explain: ess.map(o => o.msg).join(' '),
      });
    }
  }

  // 3. Conduta danosa: indicada ou não?
  c.conduta.forEach((o, i) => {
    if ((o.effect || 0) >= 0 || o.orderError) return;
    cards.push({
      id: `${c.id}:erro:${i}`, caseId: c.id,
      q: `${dx}. "${o.name}" está indicado?`,
      options: [{ label: 'Sim, é uma boa conduta', why: o.msg }, { label: 'Não, é um erro', ok: true }],
      explain: o.msg,
    });
  });

  // 4. Pré-requisito perigoso: o que fazer antes?
  c.conduta.forEach((o, i) => {
    const r = (o.requires || []).find(x => x.dmg > 0);
    if (!r) return;
    const info = ['anamnese', 'fisico', 'exames', 'conduta'].flatMap(k => c[k]).find(tagged(r.tag));
    if (!info) return;
    cards.push({
      id: `${c.id}:antes:${i}`, caseId: c.id,
      q: `${dx}: dá para fazer "${o.name}" direto, ou algo precisa vir antes?`,
      options: [{ label: `Antes: ${label(info)}`, ok: true }, { label: 'Pode fazer direto', why: r.msg }],
      explain: r.msg,
    });
  });

  // 5. Cards escritos à mão no caso
  (c.cards || []).forEach((k, i) => {
    cards.push({
      id: `${c.id}:extra:${i}`, caseId: c.id, q: k.q,
      options: [{ label: k.a, ok: true }, ...(k.wrong || []).map(w => ({ label: w }))],
      explain: k.why || '',
    });
  });

  // 6. Cards das variações (liberados quando a variação é atendida)
  for (const v of c.versions || []) {
    (v.cards || []).forEach((k, i) => {
      cards.push({
        id: `${c.id}:v-${v.id}:${i}`, caseId: c.id, version: v.id, q: k.q,
        options: [{ label: k.a, ok: true }, ...(k.wrong || []).map(w => ({ label: w }))],
        explain: k.why || '',
      });
    });
  }

  return (cardCache[c.id] = cards);
}

function cardById(id) {
  const c = CASES[id.split(':')[0]];
  return c ? caseCards(c).find(k => k.id === id) : null;
}

// ---------- estado (Game.save.cards = { id: { box, due } }) ----------
function syncCards() {
  const s = Game.save, made = [];
  s.cards = s.cards || {};
  for (const cid of s.seen) {
    if (!CASES[cid]) continue;
    for (const k of caseCards(CASES[cid])) {
      if (k.version && !(s.seenVersions || []).includes(`${cid}~${k.version}`)) continue;
      if (!s.cards[k.id]) { s.cards[k.id] = { box: 0, due: 0 }; made.push(k.id); }
    }
  }
  return made;
}

// Depois de um atendimento: libera os cards do caso e volta para a caixa 0 os que você errou
function cardsAfterCase(missed) {
  const added = syncCards().length, cards = Game.save.cards;
  let reset = 0;
  for (const id of missed) {
    if (!cards[id]) continue;
    if (cards[id].box > 0) reset++;
    cards[id] = { box: 0, due: 0 };
  }
  return { added, reset };
}

function dueCards() {
  const s = Game.save, now = Date.now();
  if (!s || !s.cards) return [];
  return Object.keys(s.cards)
    .filter(id => s.cards[id].due <= now && cardById(id))
    .sort((a, b) => s.cards[a].due - s.cards[b].due || s.cards[a].box - s.cards[b].box);
}

function gradeCard(id, ok) {
  const s = Game.save, st = s.cards[id];
  if (ok) {
    st.box = Math.min(CARD_DAYS.length - 1, st.box + 1);
    st.due = Date.now() + CARD_DAYS[st.box] * DAY_MS;
  } else {
    st.box = 0;
    st.due = Date.now() + RELEARN_MS;
  }
  Game.persist();
}

function nextDueText() {
  const s = Game.save, ids = Object.keys(s.cards || {});
  if (!ids.length) return 'Atenda casos para liberar flashcards.';
  const next = Math.min(...ids.map(id => s.cards[id].due)) - Date.now();
  if (next <= 0) return 'Há cards para revisar agora.';
  const h = next / 36e5;
  return h < 1 ? `Próximo card em ${Math.ceil(next / 60e3)} min.` : h < 24 ? `Próximo card em ${Math.round(h)} h.` : `Próximo card em ${Math.round(h / 24)} dia(s).`;
}

// ---------- tela de revisão ----------
class Review {
  // opts: { title, money (por acerto), onClose }
  constructor(ids, opts = {}) {
    this.ids = ids;
    this.opts = opts;
    this.onClose = opts.onClose;
    this.i = 0;
    this.right = 0;
    this.answered = 0;
    this.load();
  }

  load() {
    this.card = cardById(this.ids[this.i]);
    this.options = shuffle(this.card.options);
    this.sel = 0;
    // Alternativas longas quebram linha (fonte 7)
    this.optLines = this.options.map(o => wrap(o.label, SHEET.w - 34, 7));
    const h = 12 + this.optLines.reduce((n, l) => n + l.length * 9 + 3, 0);
    this.optRect = { x: SHEET.x, y: 206 - h, w: SHEET.w, h };
    this.phase = 'q';
  }

  drawOptions() {
    const { x, y, w, h } = this.optRect;
    drawWindow(x, y, w, h);
    let yy = y + 7;
    this.optLines.forEach((lines, i) => {
      if (i === this.sel) drawCursor(x + 8, yy + 1);
      for (const l of lines) { text(l, x + 17, yy, { size: 7 }); yy += 9; }
      yy += 3;
    });
  }

  answer(opt) {
    const ok = !!opt.ok;
    gradeCard(this.card.id, ok);
    Sound.sfx(ok ? 'correct' : 'wrong');
    this.answered++;
    if (ok) this.right++;
    const right = this.options.find(o => o.ok);
    this.feedback = [
      { s: ok ? 'Correto!' : 'Não foi dessa vez.', bold: true, color: ok ? '#90f090' : '#ff9a9a' },
      ...(!ok ? [{ s: `Você marcou: ${opt.label}` }, ...(opt.why ? [{ s: opt.why, color: '#c8d0f0' }] : []), { s: `Resposta: ${right.label}`, color: '#ffe08a' }] : []),
      ...(this.card.explain ? [{ s: this.card.explain }] : []),
      { s: ok ? `Volta em ${CARD_DAYS[Game.save.cards[this.card.id].box]} dia(s).` : 'Volta daqui a pouco para você fixar.', color: '#97a3cf', size: 7 },
    ];
    this.phase = 'fb';
  }

  finish() {
    const s = Game.save, xp = this.right * CARD_XP, money = this.right * (this.opts.money || 0);
    const before = Game.level();
    s.xp += xp;
    s.money += money;
    Game.persist();
    this.summary = [
      `Acertos: ${this.right} de ${this.answered}`,
      `+${xp} XP${money ? ` · +R$ ${money}` : ''}`,
      ...(Game.level() > before ? [`Você subiu para o nível ${Game.level()}!`] : []),
      `Cards para revisar agora: ${dueCards().length}`,
      nextDueText(),
    ];
    if (Game.level() > before) Sound.sfx('levelup');
    this.phase = 'end';
  }

  update() {
    if (this.phase === 'q') {
      const n = this.options.length;
      if (Input.take('up')) { this.sel = (this.sel - 1 + n) % n; Sound.sfx('cursor'); }
      if (Input.take('down')) { this.sel = (this.sel + 1) % n; Sound.sfx('cursor'); }
      if (Input.take('back')) { Sound.sfx('back'); return this.i ? this.finish() : UI.pop(); }
      if (Input.take('ok')) this.answer(this.options[this.sel]);
    } else if (Input.take('ok') || Input.take('back')) {
      if (this.phase === 'end') return UI.pop();
      if (++this.i < this.ids.length) this.load();
      else this.finish();
    }
  }

  // Quebra o texto na área; se não couber, diminui a fonte
  block(lines, x, y, w, h) {
    for (const size of [8, 7, 6]) {
      const lh = size + 3, out = [];
      for (const l of lines) for (const t of wrap(l.s, w, l.size || size)) out.push({ ...l, s: t, size: l.size || size, lh });
      if (out.length * lh <= h || size === 6) {
        let yy = y;
        for (const l of out) { text(l.s, x, yy, { size: l.size, bold: l.bold, color: l.color }); yy += l.lh + (l.bold ? 2 : 0); }
        return;
      }
    }
  }

  draw() {
    const title = this.opts.title || 'REVISÃO';
    if (this.phase === 'end') {
      drawSheetFrame(`${title} · FIM`, 'Z: fechar');
      drawWindow(SHEET.x, SHEET.y, SHEET.w, SHEET.h);
      this.block(this.summary.map((s, i) => ({ s, bold: i === 0 })), SHEET.x + 12, SHEET.y + 10, SHEET.w - 24, SHEET.h - 20);
      return;
    }
    const caseName = CASES[this.card.caseId].name;
    drawSheetFrame(`${title} ${this.i + 1}/${this.ids.length} · ${caseName}`, this.phase === 'q' ? 'Z: responder · X: parar' : 'Z: continuar');
    if (this.phase === 'q') {
      const h = this.optRect.y - SHEET.y;
      drawWindow(SHEET.x, SHEET.y, SHEET.w, h);
      this.block([{ s: this.card.q }], SHEET.x + 12, SHEET.y + 8, SHEET.w - 24, h - 14);
      this.drawOptions();
    } else {
      drawWindow(SHEET.x, SHEET.y, SHEET.w, SHEET.h);
      this.block(this.feedback, SHEET.x + 12, SHEET.y + 8, SHEET.w - 24, SHEET.h - 14);
    }
  }
}

function startReview(n, opts) {
  const ids = dueCards().slice(0, n);
  if (ids.length) UI.push(new Review(ids, opts));
}

// Menu de pausa → FLASHCARDS
function openCards() {
  syncCards();
  const s = Game.save;
  const progress = () => {
    const ids = Object.keys(s.cards), byBox = CARD_DAYS.map((_, b) => ids.filter(id => s.cards[id].box === b).length);
    UI.push(new Reader('Flashcards', [
      { p: `${ids.length} cards liberados. ${nextDueText()}` },
      { list: [
        `Novos ou para reaprender: ${byBox[0]}`,
        `Aprendendo (caixas 1–2): ${byBox[1] + byBox[2]}`,
        `Fixando (caixas 3–4): ${byBox[3] + byBox[4]}`,
        `Dominados (caixa 5): ${byBox[5]}`,
      ] },
      { tip: 'Cada acerto leva o card para a próxima caixa e aumenta o intervalo (1, 2, 4, 8, 16 dias). Errou: ele volta para o início. Os erros dos atendimentos viram cards na hora.' },
    ]));
  };
  let screen;
  const build = () => {
    const due = dueCards().length;
    return [
      { label: due ? `Revisar agora (${due})` : 'Nada para revisar agora', dim: !due,
        act: () => startReview(10, { title: 'REVISÃO', onClose: () => screen.setItems(build()) }) },
      { label: 'Progresso', act: progress },
    ];
  };
  screen = new MenuScreen('FLASHCARDS', build(), it => it.act(), { hint: 'Z: escolher · X: voltar' });
  UI.push(screen);
}
