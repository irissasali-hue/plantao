'use strict';
// Teclado e controles de toque → ações do jogo.
// "ok" confirma, "back" cancela, "menu" abre o menu, "mute" liga/desliga o som.
const Input = (() => {
  const held = {}, pressed = {};
  const MAP = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    z: 'ok', Z: 'ok', Enter: 'ok', ' ': 'ok',
    x: 'back', X: 'back', Escape: 'back', Backspace: 'back',
    c: 'menu', C: 'menu', Tab: 'menu',
    m: 'mute', M: 'mute',
  };
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return; // campo de nome no celular
    Sound.unlock(); // navegadores só liberam áudio após uma interação
    // Digitando um nome: as teclas viram texto, não comandos
    if (Input.textHandler) {
      e.preventDefault();
      Input.textHandler(e.key);
      return;
    }
    const k = MAP[e.key];
    if (!k) return;
    e.preventDefault();
    Input.press(k);
  });
  window.addEventListener('keyup', e => {
    const k = MAP[e.key];
    if (k) held[k] = false;
  });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });

  return {
    textHandler: null,
    held: k => !!held[k],
    // Usados pelo teclado e pelos botões de toque (js/touch.js)
    press(k) {
      Sound.unlock();
      if (!held[k]) pressed[k] = true;
      held[k] = true;
    },
    release(k) { held[k] = false; },
    take(k) {
      if (!pressed[k]) return false;
      pressed[k] = false;
      return true;
    },
    endFrame() { for (const k in pressed) pressed[k] = false; },
  };
})();
