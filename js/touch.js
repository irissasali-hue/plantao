'use strict';
// Controles de toque para celular/tablet: direcional, botões A/B, MENU, SOM e tela cheia.
// Só aparecem em telas de toque (ou depois do primeiro toque na tela).
const Touch = {
  enabled: false,

  init() {
    if (!document.body || !document.getElementById('pad')) return;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse) this.enable();
    window.addEventListener('touchstart', () => this.enable(), { once: true, passive: true });

    for (const el of document.querySelectorAll('#pad [data-key]')) this.bindButton(el);
    this.bindDpad(document.getElementById('dpad'));

    const fs = document.getElementById('btn-fullscreen');
    const root = document.documentElement;
    if (!root.requestFullscreen) fs.hidden = true;
    fs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen().catch(() => {});
    });

    // Sem menu de contexto nem seleção ao segurar o dedo
    document.addEventListener('contextmenu', e => { if (this.enabled) e.preventDefault(); });
  },

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    document.body.classList.add('touch');
  },

  buzz() {
    if (navigator.vibrate) navigator.vibrate(8);
  },

  bindButton(el) {
    const k = el.dataset.key;
    const up = () => {
      el.classList.remove('on');
      Input.release(k);
    };
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('on');
      Input.press(k);
      this.buzz();
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  },

  // O dedo pode deslizar entre as direções sem levantar
  bindDpad(pad) {
    let pointer = null, cur = null;
    const arms = d => pad.querySelector(`[data-dir="${d}"]`);
    const set = d => {
      if (d === cur) return;
      if (cur) { Input.release(cur); arms(cur).classList.remove('on'); }
      cur = d;
      if (d) { Input.press(d); arms(d).classList.add('on'); this.buzz(); }
    };
    const dirFrom = e => {
      const r = pad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return cur;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    };
    pad.addEventListener('pointerdown', e => {
      e.preventDefault();
      pad.setPointerCapture(e.pointerId);
      pointer = e.pointerId;
      set(dirFrom(e));
    });
    pad.addEventListener('pointermove', e => { if (e.pointerId === pointer) set(dirFrom(e)); });
    const end = e => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      set(null);
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  },

  // Campo de texto de verdade, para abrir o teclado do celular na tela de nome
  askName(onChange, onSubmit) {
    const box = document.getElementById('name-field');
    if (!this.enabled || !box) return false;
    const input = box.querySelector('input'), ok = box.querySelector('button');
    box.hidden = false;
    input.value = '';
    input.oninput = () => onChange(input.value);
    input.onkeydown = e => { if (e.key === 'Enter') onSubmit(); };
    ok.onclick = () => onSubmit();
    input.focus();
    return true;
  },

  hideName() {
    const box = document.getElementById('name-field');
    if (box) box.hidden = true;
  },
};
Touch.init();
