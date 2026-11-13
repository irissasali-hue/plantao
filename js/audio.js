'use strict';
// Música e efeitos sonoros. Arquivos de content/audio.js têm prioridade;
// sem arquivo, toca a música escrita em notas (AUDIO.songs) ou o efeito sintetizado.
// O navegador só libera áudio depois da primeira tecla: até lá, a música pedida fica guardada.
const SOUND_KEY = 'plantao_som_v1';
const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

function noteFreq(tok) {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(tok);
  if (!m) return null;
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// "C5 - E5 . | k h" → um slot por passo, com a nota e quantos passos ela dura
function parseTrack(str) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);
  const slots = new Array(toks.length).fill(null);
  let last = null;
  toks.forEach((tok, i) => {
    if (tok === '-') { if (last) last.len++; return; }
    if (tok === '.') { last = null; return; }
    last = { len: 1, freq: noteFreq(tok), hit: tok };
    slots[i] = last;
  });
  return slots;
}

class Sequencer {
  constructor(snd, song, loop) {
    this.ctx = snd.ctx;
    this.out = this.ctx.createGain();
    this.out.connect(snd.musicGain);
    this.step = 60 / song.bpm / (song.stepsPerBeat || 2);
    this.tracks = song.tracks.map(t => ({ ...t, slots: parseTrack(t.notes) }));
    this.len = Math.max(...this.tracks.map(t => t.slots.length));
    this.loop = loop && song.loop !== false;
    this.pos = 0;
    this.next = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 25);
  }

  tick() {
    while (this.next < this.ctx.currentTime + 0.12) {
      if (!this.loop && this.pos >= this.len) { clearInterval(this.timer); return; }
      for (const t of this.tracks) {
        if (!this.loop && this.pos >= t.slots.length) continue;
        const ev = t.slots[this.pos % t.slots.length];
        if (ev) this.voice(t, ev, this.next);
      }
      this.pos++;
      this.next += this.step;
    }
  }

  voice(t, ev, when) {
    const ctx = this.ctx, vol = t.vol == null ? 0.15 : t.vol, dur = ev.len * this.step;
    const g = ctx.createGain();
    g.connect(this.out);
    if (t.wave === 'noise') {
      if (ev.hit === 'k') {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(150, when);
        o.frequency.exponentialRampToValueAtTime(40, when + 0.12);
        g.gain.setValueAtTime(vol * 4, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
        o.connect(g);
        o.start(when);
        o.stop(when + 0.16);
        return;
      }
      const len = ev.hit === 's' ? 0.12 : 0.04;
      const src = ctx.createBufferSource();
      src.buffer = Sound.noise();
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = ev.hit === 's' ? 1500 : 6000;
      g.gain.setValueAtTime(vol * (ev.hit === 's' ? 2 : 1), when);
      g.gain.exponentialRampToValueAtTime(0.001, when + len);
      src.connect(f).connect(g);
      src.start(when);
      src.stop(when + len + 0.01);
      return;
    }
    if (!ev.freq) return;
    const o = ctx.createOscillator();
    o.type = t.wave || 'square';
    o.frequency.value = ev.freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.006);
    g.gain.setTargetAtTime(vol * 0.65, when + 0.02, 0.06);
    g.gain.setTargetAtTime(0, when + dur * 0.92, 0.015);
    o.connect(g);
    o.start(when);
    o.stop(when + dur + 0.1);
  }

  stop() {
    clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(0, now, 0.08);
    setTimeout(() => this.out.disconnect(), 600);
  }
}

// Efeitos sintetizados: tone(freq inicial, freq final, duração, onda, volume, atraso)
const SFX = {
  cursor: s => s.tone(880, 880, 0.035, 'square', 0.06),
  confirm: s => { s.tone(660, 660, 0.05, 'square', 0.08); s.tone(990, 990, 0.07, 'square', 0.08, 0.05); },
  back: s => s.tone(520, 300, 0.08, 'square', 0.07),
  text: s => s.tone(1250, 1250, 0.012, 'square', 0.025),
  advance: s => s.tone(990, 990, 0.03, 'square', 0.05),
  door: s => { s.tone(320, 160, 0.14, 'triangle', 0.2); s.tone(220, 110, 0.14, 'triangle', 0.15, 0.12); },
  alert: s => { s.tone(1000, 1000, 0.06, 'square', 0.1); s.tone(1500, 1500, 0.12, 'square', 0.1, 0.07); },
  hit: s => { s.noiseBurst(0.18, 0.25); s.tone(220, 55, 0.25, 'sawtooth', 0.12); },
  heal: s => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, f, 0.08, 'triangle', 0.2, i * 0.06)),
  decay: s => s.tone(180, 120, 0.12, 'triangle', 0.15),
  alarm: s => [0, 0.22].forEach(d => s.tone(988, 988, 0.12, 'sine', 0.14, d)),
  correct: s => [784, 988, 1319].forEach((f, i) => s.tone(f, f, 0.1, 'square', 0.08, i * 0.08)),
  wrong: s => { s.tone(311, 311, 0.12, 'square', 0.09); s.tone(220, 220, 0.24, 'square', 0.09, 0.13); },
  levelup: s => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tone(f, f, 0.1, 'square', 0.08, i * 0.08)),
  jump: s => s.tone(300, 700, 0.12, 'square', 0.07),
  save: s => { s.tone(1047, 1047, 0.06, 'triangle', 0.18); s.tone(1568, 1568, 0.14, 'triangle', 0.18, 0.07); },
};

const Sound = {
  ctx: null,
  el: null,
  seq: null,
  key: null,
  loop: true,
  settings: { music: 1, sfx: 1 },

  loadSettings() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem(SOUND_KEY)) || {}); } catch (e) { /* padrão */ }
  },

  saveSettings() {
    try { localStorage.setItem(SOUND_KEY, JSON.stringify(this.settings)); } catch (e) { /* sem storage */ }
    this.applyVolume();
  },

  // Chamado na primeira tecla: cria o contexto e começa a música pendente
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolume();
      const k = this.key;
      this.key = null;
      if (k) this.music(k, { loop: this.loop });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  applyVolume() {
    const m = AUDIO.volume.music * this.settings.music, f = AUDIO.volume.sfx * this.settings.sfx;
    if (this.musicGain) this.musicGain.gain.value = m;
    if (this.sfxGain) this.sfxGain.gain.value = f;
    if (this.el) this.el.volume = m;
  },

  music(key, { loop = true } = {}) {
    if (key === this.key && loop && (this.el || this.seq)) return;
    this.stopMusic();
    this.key = key;
    this.loop = loop;
    if (!key || !this.ctx) return;
    const file = AUDIO.music[key];
    if (file) {
      this.el = new window.Audio(file);
      this.el.loop = loop;
      this.applyVolume();
      this.el.play().catch(() => console.warn('Música não encontrada:', file));
    } else if (AUDIO.songs[key]) {
      this.seq = new Sequencer(this, AUDIO.songs[key], loop);
    }
  },

  stopMusic() {
    if (this.el) { this.el.pause(); this.el = null; }
    if (this.seq) { this.seq.stop(); this.seq = null; }
  },

  sfx(name) {
    if (!this.ctx || !this.settings.sfx) return;
    const file = AUDIO.sfx[name];
    if (file) {
      const a = new window.Audio(file);
      a.volume = AUDIO.volume.sfx * this.settings.sfx;
      a.play().catch(() => {});
    } else if (SFX[name]) SFX[name](this);
  },

  tone(f0, f1, dur, wave, vol, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise() {
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  },

  noiseBurst(dur, vol) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.noise();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g).connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur);
  },

  toggleMute() {
    if (this.settings.music || this.settings.sfx) {
      this.settings.before = { music: this.settings.music, sfx: this.settings.sfx };
      Object.assign(this.settings, { music: 0, sfx: 0 });
    } else Object.assign(this.settings, this.settings.before || { music: 1, sfx: 1 });
    this.saveSettings();
  },

  // Rótulo de volume para os menus: 100% → 50% → 0% → 100%
  cycle(kind) {
    this.settings[kind] = this.settings[kind] >= 1 ? 0.5 : this.settings[kind] > 0 ? 0 : 1;
    this.saveSettings();
    if (kind === 'music' && this.key) this.applyVolume();
  },

  label(kind) {
    return `${kind === 'music' ? 'Música' : 'Efeitos'}: ${Math.round(this.settings[kind] * 100)}%`;
  },
};
Sound.loadSettings();
