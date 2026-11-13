'use strict';
// Resolução lógica estilo SNES (256x224), renderizada em 4x para o texto ficar nítido.
const W = 256, H = 224, SCALE = 4, TILE = 16, LINE_H = 11;

const canvas = document.getElementById('game');
canvas.width = W * SCALE;
canvas.height = H * SCALE;
const ctx = canvas.getContext('2d');
ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
ctx.imageSmoothingEnabled = false;

const FONT = '"Pixelify Sans", monospace';
const BOX = { x: 4, y: 158, w: 248, h: 62 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hash(x, y, n = 0) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(n, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- texto ----------
function setFont(size = 8, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
}

function textWidth(str, size = 8, bold = false) {
  setFont(size, bold);
  return ctx.measureText(str).width;
}

function text(str, x, y, o = {}) {
  setFont(o.size || 8, o.bold);
  ctx.textBaseline = 'top';
  ctx.textAlign = o.align || 'left';
  if (o.shadow !== false) {
    ctx.fillStyle = o.shadow || '#0a1030';
    ctx.fillText(str, x + 0.75, y + 0.75);
  }
  ctx.fillStyle = o.color || '#f8f8f8';
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

function wrap(str, maxW, size = 8) {
  setFont(size);
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (line && ctx.measureText(test).width > maxW) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

function fit(str, maxW, size = 8) {
  if (textWidth(str, size) <= maxW) return str;
  while (str.length > 1 && textWidth(str + '…', size) > maxW) str = str.slice(0, -1);
  return str + '…';
}

// ---------- janelas ----------
function drawWindow(x, y, w, h) {
  ctx.fillStyle = '#101828';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = '#101828';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  const g = ctx.createLinearGradient(0, y + 3, 0, y + h - 3);
  g.addColorStop(0, '#4464c4');
  g.addColorStop(1, '#1a2a7c');
  ctx.fillStyle = g;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
}

function drawCursor(x, y, c = '#f8f8f8') {
  ctx.fillStyle = c;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 1, 7 - 2 * i);
}

function drawArrowDown(x, y, c = '#f8f8f8') {
  ctx.fillStyle = c;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 7 - 2 * i, 1);
}

function drawArrowUp(x, y, c = '#f8f8f8') {
  ctx.fillStyle = c;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + 3 - i, 7 - 2 * i, 1);
}

function drawBar(x, y, w, h, pct) {
  ctx.fillStyle = '#101828';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#3a3a50';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.5 ? '#58d858' : pct > 0.25 ? '#f8c838' : '#f04848';
  ctx.fillRect(x, y, Math.round(w * clamp(pct, 0, 1)), h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, Math.round(w * clamp(pct, 0, 1)), 1);
}

// ---------- caixa de mensagem com efeito de digitação ----------
class MsgBox {
  constructor(rect) {
    this.rect = rect;
    this.active = false;
  }

  // Cada item é um texto ou [quem fala, texto]. "speaker" vale para os textos simples.
  open(texts, onDone, speaker = null) {
    const perPage = Math.floor((this.rect.h - 10) / LINE_H);
    this.pages = [];
    for (const t of [].concat(texts)) {
      const [who, str] = Array.isArray(t) ? t : [speaker, t];
      const lines = wrap(str, this.rect.w - 18);
      for (let i = 0; i < lines.length; i += perPage) this.pages.push({ who, lines: lines.slice(i, i + perPage) });
    }
    this.pi = 0;
    this.n = 0;
    this.blink = 0;
    this.onDone = onDone;
    this.active = this.pages.length > 0;
    if (!this.active && onDone) onDone();
  }

  pageLen() {
    return this.pages[this.pi].lines.reduce((a, l) => a + l.length, 0);
  }

  update() {
    if (!this.active) return;
    this.blink++;
    const len = this.pageLen();
    if (this.n < len) {
      const before = Math.floor(this.n / 3);
      this.n += 1.6;
      if (Math.floor(this.n / 3) > before) Sound.sfx('text');
      if (Input.take('ok') || Input.take('back')) this.n = len;
      return;
    }
    if (Input.take('ok') || Input.take('back')) {
      Sound.sfx('advance');
      this.pi++;
      this.n = 0;
      if (this.pi >= this.pages.length) {
        this.active = false;
        const cb = this.onDone;
        this.onDone = null;
        if (cb) cb();
      }
    }
  }

  draw() {
    if (!this.active) return;
    const { x, y, w, h } = this.rect;
    const page = this.pages[this.pi];
    if (page.who) {
      drawWindow(x + 4, y - 14, textWidth(page.who, 8, true) + 18, 17);
      text(page.who, x + 13, y - 9, { bold: true, color: '#ffe08a' });
    }
    drawWindow(x, y, w, h);
    let left = Math.floor(this.n);
    page.lines.forEach((line, i) => {
      if (left > 0) text(line.slice(0, left), x + 9, y + 7 + i * LINE_H);
      left -= line.length;
    });
    if (this.n >= this.pageLen() && (this.blink >> 4) % 2 === 0) drawArrowDown(x + w - 14, y + h - 11);
  }
}

// ---------- menu em lista com rolagem ----------
class ListMenu {
  constructor(items, rect, visible, start = 0) {
    this.items = items;
    this.rect = rect;
    this.visible = visible;
    this.i = clamp(start, 0, items.length - 1);
    this.top = 0;
    this.fix();
  }

  fix() {
    if (this.i < this.top) this.top = this.i;
    if (this.i >= this.top + this.visible) this.top = this.i - this.visible + 1;
  }

  update() {
    const n = this.items.length;
    if (Input.take('up')) { this.i = (this.i - 1 + n) % n; this.fix(); Sound.sfx('cursor'); }
    if (Input.take('down')) { this.i = (this.i + 1) % n; this.fix(); Sound.sfx('cursor'); }
    if (Input.take('ok')) { Sound.sfx('confirm'); return { pick: this.i }; }
    if (Input.take('back')) { Sound.sfx('back'); return { back: true }; }
    return null;
  }

  draw() {
    const { x, y, w, h } = this.rect;
    drawWindow(x, y, w, h);
    for (let k = 0; k < this.visible && this.top + k < this.items.length; k++) {
      const idx = this.top + k, it = this.items[idx], yy = y + 7 + k * LINE_H;
      if (idx === this.i) drawCursor(x + 8, yy + 1);
      text(fit(it.label, w - 34), x + 17, yy, { color: it.dim ? '#97a3cf' : '#f8f8f8' });
    }
    if (this.top > 0) drawArrowUp(x + w - 13, y + 6);
    if (this.top + this.visible < this.items.length) drawArrowDown(x + w - 13, y + h - 11);
  }
}
