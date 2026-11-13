'use strict';
/* =====================================================================
   SOM — músicas e efeitos sonoros.

   Para cada chave, o jogo procura nesta ordem:
     1. um arquivo em AUDIO.music / AUDIO.sfx  (.ogg, .mp3 ou .wav em assets/)
     2. uma música escrita em notas em AUDIO.songs
     3. o efeito sintetizado embutido (só para efeitos)
   Sem nenhum dos três, fica em silêncio.

   ONDE CADA MÚSICA TOCA
     titulo              tela de título e créditos
     music do mapa       cada mapa em content/maps.js tem "music: 'chave'"
                         (cidade, rota, biblioteca, ginasio)
     batalha             atendimentos (um caso pode ter "music: 'outra'")
     music do treinador  trainer.music nos NPCs (rival, vilao...)
     vitoria / derrota   vinhetas de fim de caso (tocam uma vez)

   EFEITOS (chaves de AUDIO.sfx)
     cursor confirm back text advance door alert hit heal decay alarm
     correct wrong levelup save jump

   MÚSICA EM NOTAS (AUDIO.songs)
     { bpm, stepsPerBeat (padrão 2 = colcheias), loop (padrão true), tracks: [...] }
     Cada track: { wave, vol, notes }
       wave   'square' (pulso, melodia clássica), 'triangle' (baixo macio),
              'sawtooth' (rasgado), 'sine' (puro) ou 'noise' (bateria)
       vol    volume da trilha (0 a 1; use valores baixos, ~0.1–0.25)
       notes  um passo por palavra:
                C5, F#4, Bb3   nota com oitava (C4 = dó central)
                -              segura a nota anterior por mais um passo
                .              pausa
                |              só separa compassos (ignorado)
              Na trilha 'noise':  k bumbo · s caixa · h chimbal
     Cada trilha repete no seu próprio tamanho: um baixo de 4 compassos
     pode tocar debaixo de uma melodia de 8.
   ===================================================================== */
const AUDIO = {
  music: {
    // cidade: 'assets/music/cidade.ogg',
  },
  sfx: {
    // confirm: 'assets/sfx/confirm.wav',
  },
  volume: { music: 0.6, sfx: 0.7 },

  songs: {
    titulo: {
      bpm: 96,
      tracks: [
        { wave: 'square', vol: 0.11, notes: 'E5 - G5 - C6 - B5 A5 | G5 - - - E5 - C5 - | F5 - A5 - C6 - B5 A5 | G5 - - - - - . . | E5 - G5 - C6 - D6 C6 | B5 - G5 - A5 - B5 - | C6 - G5 - E5 - D5 - | C5 - - - - - . .' },
        { wave: 'triangle', vol: 0.22, notes: 'C3 - G3 - C3 - G3 - | A2 - E3 - A2 - E3 - | F2 - C3 - F2 - C3 - | G2 - D3 - G2 - D3 - | C3 - G3 - C3 - G3 - | E2 - B2 - E2 - B2 - | F2 - C3 - G2 - D3 - | C3 - G3 - C3 - - -' },
      ],
    },
    cidade: {
      bpm: 120,
      tracks: [
        { wave: 'square', vol: 0.1, notes: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . G5 F5 . | E5 . G5 C6 . B5 A5 G5 | F5 E5 D5 - - - . . | C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . C6 B5 . | C6 . G5 E5 . D5 E5 F5 | E5 - C5 - - - . .' },
        { wave: 'triangle', vol: 0.22, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | C3 . G2 . E3 . G2 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . G2 . | F2 . C3 . F2 . A2 . | C3 . G2 . G2 . B2 . | C3 . G2 . C3 . . .' },
        { wave: 'noise', vol: 0.05, notes: 'k . h . s . h h' },
      ],
    },
    biblioteca: {
      bpm: 76,
      tracks: [
        { wave: 'triangle', vol: 0.2, notes: 'A4 - C5 - E5 - - - | D5 - C5 - B4 - - - | C5 - E5 - A5 - G5 - | E5 - - - - - . . | F5 - E5 - D5 - C5 - | B4 - C5 - D5 - - - | C5 - B4 - A4 - G#4 - | A4 - - - - - . .' },
        { wave: 'sine', vol: 0.18, notes: 'A2 - - - E3 - - - | G2 - - - D3 - - - | A2 - - - E3 - - - | A2 - - - E3 - - - | D3 - - - A2 - - - | G2 - - - B2 - - - | A2 - - - E2 - - - | A2 - - - - - - -' },
      ],
    },
    batalha: {
      bpm: 150,
      tracks: [
        { wave: 'square', vol: 0.09, notes: 'A4 - C5 - E5 - D5 C5 | F5 - - - E5 - D5 - | C5 - E5 - A5 - G5 E5 | G#5 - - - B5 - - - | A5 - G5 - F5 - E5 - | F5 - E5 - D5 - C5 - | D5 - C5 - B4 - C5 - | E5 - - - - - . .' },
        { wave: 'triangle', vol: 0.25, notes: 'A2 A2 A3 A2 A2 A3 A2 G2 | F2 F2 F3 F2 F2 F3 F2 G2 | A2 A2 A3 A2 A2 A3 A2 G2 | E2 E2 E3 E2 E2 E3 G#2 B2' },
        { wave: 'noise', vol: 0.06, notes: 'k . h k s . h h' },
      ],
    },
    rota: {
      bpm: 132,
      tracks: [
        { wave: 'square', vol: 0.1, notes: 'D5 - F#5 - A5 - F#5 - | G5 - B5 - A5 - - - | F#5 - A5 - D6 - C#6 B5 | A5 - - - - - . . | B5 - A5 - G5 - F#5 - | E5 - F#5 - G5 - A5 - | F#5 - E5 - D5 - E5 - | D5 - - - - - . .' },
        { wave: 'triangle', vol: 0.22, notes: 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | D3 . A2 . D3 . F#2 . | A2 . E3 . A2 . C#3 . | G2 . D3 . G2 . D3 . | E2 . B2 . A2 . E3 . | D3 . A2 . A2 . C#3 . | D3 . A2 . D3 . . .' },
        { wave: 'noise', vol: 0.05, notes: 'k . h . s . h . | k k h . s . h h' },
      ],
    },
    ginasio: {
      bpm: 120,
      tracks: [
        { wave: 'square', vol: 0.09, notes: 'C5 - C5 . D#5 - G5 . | F5 - D#5 - D5 - G4 - | C5 - C5 . D#5 - G5 . | G#5 - G5 - F5 - D5 - | D#5 - D5 - C5 - D5 - | D#5 - F5 - G5 - - - | G#5 - G5 - F5 - D#5 - | D5 - B4 - C5 - - -' },
        { wave: 'triangle', vol: 0.24, notes: 'C3 . G2 . C3 . G2 . | G#2 . D#3 . G2 . D3 . | C3 . G2 . C3 . G2 . | F2 . C3 . G2 . D3 .' },
        { wave: 'noise', vol: 0.05, notes: 'k . h . s . h . | k . h k s . h h' },
      ],
    },
    rival: {
      bpm: 156,
      tracks: [
        { wave: 'square', vol: 0.09, notes: 'G5 - D5 G5 - B5 A5 G5 | F#5 - D5 - A5 - - - | E5 - C5 E5 - G5 F#5 E5 | D5 - - - D6 - - -' },
        { wave: 'triangle', vol: 0.25, notes: 'G2 G3 G2 G3 G2 G3 G2 G3 | D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 | D2 D3 D2 D3 D2 D3 F#2 D2' },
        { wave: 'noise', vol: 0.06, notes: 'k h s h k h s s' },
      ],
    },
    vilao: {
      bpm: 140,
      tracks: [
        { wave: 'square', vol: 0.09, notes: 'E5 . E5 . G5 - F#5 . | E5 . D5 . E5 - - - | E5 . E5 . A5 - G5 . | F#5 . D#5 . E5 - - -' },
        { wave: 'sawtooth', vol: 0.06, notes: 'E2 E2 E3 E2 E2 E2 E3 E2 | C2 C2 C3 C2 D2 D2 D3 D2 | E2 E2 E3 E2 E2 E2 E3 E2 | B1 B1 B2 B1 B1 B1 D#2 B1' },
        { wave: 'noise', vol: 0.06, notes: 'k . s . k k s .' },
      ],
    },
    vitoria: {
      bpm: 140, loop: false,
      tracks: [
        { wave: 'square', vol: 0.12, notes: 'C5 E5 G5 C6 - - G5 - | A5 - B5 - C6 - - - - - - -' },
        { wave: 'triangle', vol: 0.22, notes: 'C3 - - - - - - - | F2 - G2 - C3 - - - - - - -' },
      ],
    },
    derrota: {
      bpm: 70, loop: false,
      tracks: [
        { wave: 'triangle', vol: 0.2, notes: 'E5 - D5 - C5 - B4 - | A4 - - - - - - -' },
        { wave: 'sine', vol: 0.18, notes: 'A2 - - - E2 - - - | A2 - - - - - - -' },
      ],
    },
  },
};
