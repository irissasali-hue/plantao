'use strict';
// Pixel art gerada em código: personagens a partir de "templates" em texto e tiles pintados pixel a pixel.
// Qualquer PNG listado em content/art.js substitui a arte gerada.

// h cabelo · s pele · e olho · w roupa · b roupa (detalhe) · r acessório · k calça/sapato
const T_DOWN = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hssssssh....',
  '....sesssses....',
  '....ssssssss....',
  '.....ssssss.....',
  '....wwbbbbww....',
  '...wwwbrrbwww...',
  '...wwwbbbbwww...',
  '...wwwbbbbwww...',
  '...swwbbbbwws...',
  '....wwbbbbww....',
  '.....kk..kk.....',
  '.....kk..kk.....',
];
const T_UP = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....shhhhhhs....',
  '.....ssssss.....',
  '....wwwwwwww....',
  '...wwwwwwwwww...',
  '...wwwwwwwwww...',
  '...wwwwwwwwww...',
  '...swwwwwwwws...',
  '....wwwwwwww....',
  '.....kk..kk.....',
  '.....kk..kk.....',
];
const T_SIDE = [
  '................',
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hhhhhhhh....',
  '....hhhsssss....',
  '....hhssssse....',
  '....hsssssss....',
  '.....ssssss.....',
  '.....wwbbww.....',
  '....wwwbbwww....',
  '....wwwbbwww....',
  '....wwwwwwww....',
  '....wswbbww.....',
  '.....wwbbww.....',
  '......kkkk......',
  '......kk.kk.....',
];
// Linha 15 trocada para os quadros de caminhada
const WALK_ROWS = {
  down: ['.....kk.........', '.........kk.....'],
  up: ['.....kk.........', '.........kk.....'],
  side: ['.....kk...kk....', '......kk.kk.....'],
};

function longHair(rows, dir) {
  const g = rows.map(r => r.split(''));
  for (let y = 4; y <= 8; y++) {
    g[y][3] = 'h';
    if (dir === 'side') g[y][4] = 'h';
    else g[y][12] = 'h';
  }
  if (dir === 'up') for (const y of [6, 7]) g[y] = g[y].map(c => (c === 's' ? 'h' : c));
  return g.map(r => r.join(''));
}

function outline(c, color = '#181820') {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const d = g.getImageData(0, 0, w, h).data;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  g.fillStyle = color;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) g.fillRect(x, y, 1, 1);
}

function buildSprite(rows, pal) {
  const c = makeCanvas(16, 16), g = c.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    });
  });
  outline(c);
  return c;
}

const PAL_DEFAULT = { e: '#1a1a28' };

function buildChar(pal) {
  const p = { ...PAL_DEFAULT, ...pal };
  const out = {};
  for (const [dir, tpl] of [['down', T_DOWN], ['up', T_UP], ['side', T_SIDE]]) {
    const base = p.long ? longHair(tpl, dir) : tpl;
    out[dir] = [base, ...WALK_ROWS[dir].map(r => [...base.slice(0, 15), r])].map(rows => buildSprite(rows, p));
  }
  return out;
}

// No mapa (scale 1), ART.charScale aumenta o sprite apoiado pelos pés, centralizado no tile
function drawChar(spr, dir, frame, x, y, scale = 1) {
  const img = spr[dir === 'left' || dir === 'right' ? 'side' : dir][frame];
  let s = 16 * scale;
  if (frame > 0) y -= scale;
  if (scale === 1 && spr.size && spr.size !== 1) {
    const big = Math.round(16 * spr.size);
    x -= Math.round((big - s) / 2);
    y -= big - s;
    s = big;
  }
  if (dir === 'left') {
    ctx.save();
    ctx.translate(x + s, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, s, s);
    ctx.restore();
  } else ctx.drawImage(img, x, y, s, s);
}

// ---------- arte externa (content/art.js) ----------
const Assets = {
  img: {},
  load() {
    const jobs = [];
    const add = (key, src) => {
      if (!src) return;
      jobs.push(new Promise(done => {
        const im = new Image();
        im.onload = () => { this.img[key] = im; done(); };
        im.onerror = () => { console.warn('Arte não encontrada:', src); done(); };
        im.src = src;
      }));
    };
    add('tiles', ART.tiles);
    add('battleBg', ART.battleBg);
    for (const k in ART.chars) add('char:' + k, ART.chars[k]);
    for (const k in ART.portraits) add('portrait:' + k, ART.portraits[k]);
    for (const src of contentImages()) add('file:' + src, src);
    return Promise.all(jobs);
  },
  // Imagens citadas nos textos (biblioteca, estudos e exames dos casos)
  file(src) {
    return this.img['file:' + src] || null;
  },
};

function contentImages() {
  const out = new Set();
  const scan = blocks => (blocks || []).forEach(b => b.img && out.add(b.img));
  LIBRARY.forEach(t => scan(t.blocks));
  for (const c of Object.values(CASES)) {
    scan(c.study);
    for (const k of ['anamnese', 'fisico', 'exames']) scan(c[k]);
  }
  return out;
}

// A folha é sempre 3x3 quadros; o tamanho do quadro vem da imagem (48x48 → 16, 96x96 → 32, 192x192 → 64).
// Quadros maiores ocupam o mesmo espaço no jogo, com mais detalhe (a tela é renderizada em 4x).
function sliceSheet(img) {
  const out = {}, fw = Math.floor(img.width / 3), fh = Math.floor(img.height / 3);
  if (img.width % 3 || img.height % 3 || fw !== fh) console.warn(`Folha de personagem ${img.width}x${img.height}: use 3x3 quadros quadrados (ex.: 48x48, 96x96, 192x192).`);
  ['down', 'up', 'side'].forEach((dir, row) => {
    out[dir] = [0, 1, 2].map(col => {
      const c = makeCanvas(fw, fh);
      c.getContext('2d').drawImage(img, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
      return c;
    });
  });
  return out;
}

// Personagem pela chave da arte; sem PNG, gera a partir da paleta.
const charCache = {};
function getChar(key, pal) {
  if (!charCache[key]) {
    const img = Assets.img['char:' + key];
    charCache[key] = img ? sliceSheet(img) : buildChar(pal || FALLBACK_PALS[key] || (CASES[key] && CASES[key].pal) || FALLBACK_PALS.player);
    charCache[key].size = (img && ART.charScale && ART.charScale[key]) || 1;
  }
  return charCache[key];
}

let PLAYER_SPR = null;

// ---------- objetos pequenos ----------
function drawBubble(x, y, mark = '#e03030') {
  ctx.fillStyle = '#181820';
  ctx.fillRect(x, y, 9, 11);
  ctx.fillRect(x + 3, y + 11, 3, 1);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(x + 1, y + 1, 7, 9);
  ctx.fillStyle = mark;
  ctx.fillRect(x + 4, y + 2, 2, 5);
  ctx.fillRect(x + 4, y + 8, 2, 1);
}

function drawSign(x, y) {
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x + 7, y + 9, 2, 7);
  ctx.fillStyle = '#181820';
  ctx.fillRect(x + 1, y + 1, 14, 10);
  ctx.fillStyle = '#c8945a';
  ctx.fillRect(x + 2, y + 2, 12, 8);
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(x + 4, y + 4, 8, 1);
  ctx.fillRect(x + 4, y + 7, 6, 1);
}

// ---------- tiles ----------
function rect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r + r) g.fillRect(cx + dx, cy + dy, 1, 1);
}

function paintGrass(g, ox, oy, tx, ty) {
  rect(g, ox, oy, 16, 16, '#6cbc4c');
  for (let i = 0; i < 5; i++) {
    const x = ox + 1 + Math.floor(hash(tx, ty, i) * 13), y = oy + 1 + Math.floor(hash(tx, ty, i + 9) * 13);
    rect(g, x, y, 1, 2, '#4e9a3a');
    rect(g, x + 1, y, 1, 1, '#94d86c');
  }
}

function paintTile(g, rows, tx, ty) {
  const at = (x, y) => (rows[y] && rows[y][x]) || '#';
  const ch = at(tx, ty), ox = tx * TILE, oy = ty * TILE;
  const sheet = Assets.img.tiles;
  if (sheet) {
    const idx = TILES[ch] ? TILES[ch].index : 0, cols = Math.floor(sheet.width / TILE);
    g.drawImage(sheet, (idx % cols) * TILE, Math.floor(idx / cols) * TILE, TILE, TILE, ox, oy, TILE, TILE);
    return;
  }
  switch (ch) {
    case '=': {
      rect(g, ox, oy, 16, 16, '#dcc48c');
      for (let i = 0; i < 5; i++) {
        const x = ox + 1 + Math.floor(hash(tx, ty, i) * 14), y = oy + 1 + Math.floor(hash(tx, ty, i + 7) * 14);
        rect(g, x, y, 1, 1, i < 3 ? '#c4a870' : '#ecdcb0');
      }
      if (at(tx, ty - 1) !== '=') rect(g, ox, oy, 16, 1, '#b89c64');
      if (at(tx, ty + 1) !== '=') rect(g, ox, oy + 15, 16, 1, '#b89c64');
      if (at(tx - 1, ty) !== '=') rect(g, ox, oy, 1, 16, '#b89c64');
      if (at(tx + 1, ty) !== '=') rect(g, ox + 15, oy, 1, 16, '#b89c64');
      break;
    }
    case '~': {
      rect(g, ox, oy, 16, 16, '#3c7fd4');
      rect(g, ox + 2 + Math.floor(hash(tx, ty) * 8), oy + 3, 4, 1, '#5a98e0');
      const foam = '#b8e0f8';
      if (at(tx, ty - 1) !== '~') rect(g, ox, oy, 16, 2, foam);
      if (at(tx, ty + 1) !== '~') rect(g, ox, oy + 14, 16, 2, foam);
      if (at(tx - 1, ty) !== '~') rect(g, ox, oy, 2, 16, foam);
      if (at(tx + 1, ty) !== '~') rect(g, ox + 14, oy, 2, 16, foam);
      break;
    }
    case 'R':
    case 'Q':
    case 'G':
    case 'r': {
      const [base, line, seam, top, eave] = {
        R: ['#c8503e', '#9c3a2e', '#a8432f', '#e88070', '#6e2620'],
        Q: ['#4a5cb0', '#34428a', '#3c4c9c', '#7c8ce0', '#222a5c'],
        G: ['#3c9a5a', '#2a7444', '#308050', '#70c890', '#1a4a2a'],
        r: ['#b8703a', '#8a5028', '#9a5a2e', '#d8985a', '#5a3218'],
      }[ch];
      rect(g, ox, oy, 16, 16, base);
      for (let band = 0; band < 4; band++) {
        rect(g, ox, oy + band * 4 + 3, 16, 1, line);
        for (let sx = band % 2 ? 4 : 0; sx < 16; sx += 8) rect(g, ox + sx, oy + band * 4, 1, 3, seam);
      }
      if (at(tx, ty - 1) !== ch) rect(g, ox, oy, 16, 1, top);
      if (at(tx, ty + 1) !== ch) rect(g, ox, oy + 14, 16, 2, eave);
      break;
    }
    case 'L':
    case 'd': {
      rect(g, ox, oy, 16, 16, '#e6d6b4');
      rect(g, ox, oy + 13, 16, 3, '#b49e78');
      if (ch === 'L') {
        rect(g, ox + 4, oy + 2, 8, 10, '#6a5034');
        rect(g, ox + 5, oy + 4, 6, 7, '#f0d878');
        rect(g, ox + 5, oy + 3, 6, 1, '#f0d878');
        rect(g, ox + 7, oy + 3, 2, 8, '#6a5034');
      } else {
        rect(g, ox + 2, oy + 1, 12, 15, '#4a3020');
        rect(g, ox + 3, oy + 2, 10, 14, '#8a5a2c');
        rect(g, ox + 8, oy + 2, 1, 14, '#4a3020');
        rect(g, ox + 6, oy + 8, 1, 2, '#f0c040');
        rect(g, ox + 10, oy + 8, 1, 2, '#f0c040');
      }
      break;
    }
    case 'w': {
      rect(g, ox, oy, 16, 16, '#d8c8a4');
      rect(g, ox, oy, 16, 2, '#efe2c4');
      rect(g, ox, oy + 10, 16, 6, '#8a6440');
      rect(g, ox, oy + 10, 16, 1, '#a88058');
      if (tx % 2) rect(g, ox + 8, oy + 11, 1, 5, '#6a4a2c');
      break;
    }
    case 'h':
    case 'o': {
      rect(g, ox, oy, 16, 16, '#f0e2c0');
      rect(g, ox, oy + 13, 16, 3, '#c0a878');
      for (const x of [0, 15]) rect(g, ox + x, oy, 1, 16, '#c8b088');
      if (ch === 'h') {
        rect(g, ox + 4, oy + 3, 8, 7, '#7a5a3a');
        rect(g, ox + 5, oy + 4, 6, 5, '#88c0e8');
        rect(g, ox + 7, oy + 4, 1, 5, '#7a5a3a');
      } else {
        rect(g, ox + 4, oy + 3, 8, 13, '#6a4020');
        rect(g, ox + 5, oy + 4, 6, 12, '#9a6232');
        rect(g, ox + 9, oy + 10, 1, 1, '#f0c040');
      }
      break;
    }
    case 'P': {
      const vertical = at(tx - 1, ty) === '~' && at(tx + 1, ty) === '~';
      rect(g, ox, oy, 16, 16, '#3c7fd4');
      rect(g, ox, oy, 16, 16, '#a87440');
      for (let i = 0; i < 16; i += 4) {
        if (vertical) rect(g, ox, oy + i, 16, 1, '#7a4e2a');
        else rect(g, ox + i, oy, 1, 16, '#7a4e2a');
      }
      if (vertical) { rect(g, ox, oy, 1, 16, '#5a3418'); rect(g, ox + 15, oy, 1, 16, '#5a3418'); }
      else { rect(g, ox, oy, 16, 1, '#5a3418'); rect(g, ox, oy + 15, 16, 1, '#5a3418'); }
      break;
    }
    case 'M': {
      paintGrass(g, ox, oy, tx, ty);
      disc(g, ox + 8, oy + 9, 7, '#4a4a54');
      disc(g, ox + 8, oy + 8, 6, '#8a8a96');
      disc(g, ox + 6, oy + 6, 3, '#aaaab6');
      rect(g, ox + 9, oy + 10, 3, 1, '#6a6a76');
      break;
    }
    case 'v': {
      paintGrass(g, ox, oy, tx, ty);
      rect(g, ox, oy + 10, 16, 3, '#3e7a2e');
      rect(g, ox, oy + 13, 16, 2, '#2a5a20');
      rect(g, ox, oy + 9, 16, 1, '#8ad070');
      break;
    }
    case '"': {
      rect(g, ox, oy, 16, 16, '#5aa840');
      for (let i = 0; i < 4; i++) {
        const bx = ox + (i % 2) * 8, by = oy + Math.floor(i / 2) * 8;
        rect(g, bx + 1, by + 3, 1, 5, '#2e6e22');
        rect(g, bx + 3, by + 1, 1, 7, '#2e6e22');
        rect(g, bx + 5, by + 3, 1, 5, '#2e6e22');
        rect(g, bx + 2, by + 2, 1, 6, '#7cc85a');
        rect(g, bx + 4, by + 3, 1, 5, '#7cc85a');
        rect(g, bx + 6, by + 4, 1, 4, '#7cc85a');
      }
      break;
    }
    case '_':
    case 'X':
    case 'B':
    case 'T':
    case 'C':
    case 'E': {
      rect(g, ox, oy, 16, 16, '#c89a64');
      for (const y of [3, 7, 11, 15]) rect(g, ox, oy + y, 16, 1, '#a87a4a');
      rect(g, ox + ((ty * 5) % 16), oy, 1, 3, '#a87a4a');
      rect(g, ox + ((ty * 5 + 8) % 16), oy + 8, 1, 3, '#a87a4a');
      if (ch === 'X') {
        rect(g, ox + 1, oy + 2, 14, 12, '#7a2020');
        rect(g, ox + 2, oy + 3, 12, 10, '#b03838');
        rect(g, ox + 4, oy + 5, 8, 6, '#c85050');
      } else if (ch === 'B') {
        rect(g, ox, oy, 16, 16, '#5a3a20');
        rect(g, ox + 1, oy + 1, 14, 14, '#3a2414');
        for (const sy of [1, 6, 11]) {
          let x = ox + 1;
          for (let i = 0; x < ox + 15; i++) {
            const w = 1 + Math.floor(hash(tx, ty, sy * 10 + i) * 2);
            const cols = ['#b83c3c', '#3c6cb8', '#3c9a58', '#d8a838', '#8a4ab0', '#e8e0d0'];
            const h = 3 + Math.floor(hash(tx, ty, sy + i * 3) * 2);
            rect(g, x, oy + sy + (4 - h), Math.min(w, ox + 15 - x), h, cols[Math.floor(hash(tx, ty, sy * 7 + i) * cols.length)]);
            x += w + (hash(tx, ty, i + sy) < 0.15 ? 1 : 0);
          }
          rect(g, ox + 1, oy + sy + 4, 14, 1, '#5a3a20');
        }
      } else if (ch === 'C') {
        rect(g, ox, oy + 2, 16, 12, '#5a3a20');
        rect(g, ox, oy + 2, 16, 4, '#d8b070');
        rect(g, ox, oy + 6, 16, 1, '#a07848');
        rect(g, ox, oy + 7, 16, 7, '#8a5a2c');
      } else if (ch === 'E') {
        rect(g, ox + 1, oy + 1, 14, 15, '#606878');
        rect(g, ox + 2, oy + 2, 12, 13, '#f0f4f8');
        rect(g, ox + 3, oy + 3, 10, 3, '#ffffff');
        rect(g, ox + 2, oy + 8, 12, 7, '#7cb4e8');
        rect(g, ox + 2, oy + 8, 12, 1, '#5a94c8');
      } else if (ch === 'T') {
        rect(g, ox, oy + 3, 16, 9, '#5a3a20');
        rect(g, ox, oy + 3, 16, 7, '#8a5a2c');
        rect(g, ox, oy + 3, 16, 1, '#a87440');
        rect(g, ox + 2, oy + 12, 2, 4, '#5a3a20');
        rect(g, ox + 12, oy + 12, 2, 4, '#5a3a20');
        if (tx % 2) {
          rect(g, ox + 3, oy + 4, 6, 4, '#f4f0e0');
          rect(g, ox + 4, oy + 5, 4, 1, '#9098b0');
          rect(g, ox + 4, oy + 7, 3, 1, '#9098b0');
        } else {
          rect(g, ox + 7, oy + 4, 6, 4, '#3c6cb8');
          rect(g, ox + 7, oy + 4, 6, 1, '#6a98e0');
        }
      }
      break;
    }
    case 'H':
    case 'D': {
      rect(g, ox, oy, 16, 16, '#efeee6');
      rect(g, ox, oy + 13, 16, 3, '#bcb8aa');
      if (ch === 'H') {
        rect(g, ox + 3, oy + 2, 10, 8, '#7a8090');
        rect(g, ox + 4, oy + 3, 8, 6, '#7cb4e8');
        rect(g, ox + 5, oy + 4, 2, 1, '#d0ecfc');
      } else {
        rect(g, ox + 2, oy + 1, 12, 15, '#5a6070');
        rect(g, ox + 3, oy + 2, 10, 14, '#5c9ad8');
        rect(g, ox + 8, oy + 2, 1, 14, '#5a6070');
        rect(g, ox + 4, oy + 3, 2, 3, '#b8dcf8');
      }
      break;
    }
    default: {
      paintGrass(g, ox, oy, tx, ty);
      if (ch === ',') {
        const cols = ['#f05a5a', '#f8e050', '#ffffff', '#f088c8'];
        for (let i = 0; i < 4; i++) {
          const x = ox + 2 + Math.floor(hash(tx, ty, i + 20) * 11), y = oy + 2 + Math.floor(hash(tx, ty, i + 30) * 11);
          const c = cols[Math.floor(hash(tx, ty, i + 40) * cols.length)];
          rect(g, x - 1, y, 3, 1, c);
          rect(g, x, y - 1, 1, 3, c);
          rect(g, x, y, 1, 1, '#f8c020');
          rect(g, x, y + 2, 1, 2, '#3e8a30');
        }
      } else if (ch === '#') {
        rect(g, ox + 3, oy + 13, 10, 2, '#4a9a3a');
        rect(g, ox + 6, oy + 10, 4, 5, '#7a4e2c');
        disc(g, ox + 8, oy + 7, 7, '#1e5222');
        disc(g, ox + 8, oy + 7, 6, '#2f8034');
        disc(g, ox + 6, oy + 5, 3, '#4aa64a');
        rect(g, ox + 5, oy + 4, 1, 1, '#7cd070');
      } else if (ch === 'F') {
        rect(g, ox, oy + 6, 16, 2, '#a8743c');
        rect(g, ox, oy + 11, 16, 2, '#a8743c');
        rect(g, ox + 2, oy + 3, 3, 12, '#8a5a2c');
        rect(g, ox + 11, oy + 3, 3, 12, '#8a5a2c');
        rect(g, ox + 2, oy + 3, 3, 1, '#c89458');
        rect(g, ox + 11, oy + 3, 3, 1, '#c89458');
      }
    }
  }
}

function bakeMap(rows) {
  const c = makeCanvas(rows[0].length * TILE, rows.length * TILE), g = c.getContext('2d');
  for (let ty = 0; ty < rows.length; ty++)
    for (let tx = 0; tx < rows[0].length; tx++) paintTile(g, rows, tx, ty);

  if (Assets.img.tiles) return c;

  // Cruz vermelha centralizada em cada telhado vermelho ('R') separado
  const seen = new Set();
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch !== 'R' || seen.has(x + ',' + y)) return;
    let minX = x, maxX = x, minY = y, maxY = y;
    const stack = [[x, y]];
    seen.add(x + ',' + y);
    while (stack.length) {
      const [cx, cy] = stack.pop();
      minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if ((rows[ny] || '')[nx] !== 'R' || seen.has(nx + ',' + ny)) continue;
        seen.add(nx + ',' + ny);
        stack.push([nx, ny]);
      }
    }
    const cx = ((minX + maxX + 1) / 2) * TILE, cy = ((minY + maxY + 1) / 2) * TILE;
    rect(g, cx - 8, cy - 8, 16, 15, '#6e2620');
    rect(g, cx - 7, cy - 7, 14, 13, '#f8f8f8');
    rect(g, cx - 2, cy - 5, 4, 9, '#e03030');
    rect(g, cx - 5, cy - 2, 10, 3, '#e03030');
  }));
  return c;
}
