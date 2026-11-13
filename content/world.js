'use strict';
/* =====================================================================
   MUNDO E HISTÓRIA — tiles, início do jogo e a sintaxe dos roteiros.
   Os mapas e personagens ficam em content/maps.js.

   MAPA
   MAPS.id = { music, rows, npcs, warps, triggers, onEnter, encounters }
     rows        o mapa em texto: cada caractere é um tile (veja TILES)
     warps       { x, y, w?, h?, to, tx, ty, dir }  pisar na área leva a (tx, ty) em "to"
                 (mantendo o deslocamento: largura 2 → 2 tiles de chegada).
                 to: '__back' volta para fora da porta por onde se entrou (use nos interiores).
     triggers    { x, y, w?, h?, if, do: [comandos] }  roda ao pisar na área, se "if" valer
     onEnter     [{ if, do: [comandos] }]  roda o primeiro que valer ao entrar no mapa
     encounters  { tile: '"', chance: 0.1, cases: [...] }  casos no mato alto

   NPC
     id, name, x, y, dir     posição em tiles (0 = canto superior esquerdo) e direção
     sprite / pal            arte (content/art.js) ou cores
     kind: 'sign' | 'object' placa / objeto invisível
     showIf                  condição para existir no mapa
     bubble, bubbleColor     condição para mostrar "!" sobre a cabeça
     still: true             não fica virando sozinho
     dialogue: [blocos]      o primeiro bloco cujo "if" valer é usado:
        { if, speaker, say, random, set, unset, do: [comandos], battle, opens }
     trainer: {              desafiante (como um treinador):
        name, case, money, range (linha de visão; 0 = só falando ou por gatilho),
        intro: [falas antes], lose: [falas dele quando você vence],
        after: [falas depois de vencido], win: [comandos após a vitória],
        hard: 1.1 (paciente piora mais rápido), music, noBlackout }
     Vencer um treinador liga a flag 'beat:<id>'.

   COMANDOS DE ROTEIRO (cada um é um objeto)
     { say: ['texto', ['Nome', 'fala'], ['', 'narração']], speaker, random: [...] }
     { set: 'flag' }  { unset: 'flag' }
     { if: cond, then: [...], else: [...] }
     { ask: 'Pergunta?', yesLabel, noLabel, yes: [...], no: [...] }
     { move: 'npcId' | 'player', path: 'up up left' }
     { goto: 'npcId', x, y }            caminha até o tile (desvia de obstáculos)
     { approach: 'npcId' }              caminha até ficar ao lado do jogador
     { face: 'npcId', dir: 'up' | 'player' }
     { exclaim: 'npcId' | 'player' }    balão "!"
     { wait: 30 }                       quadros (60 = 1 s)
     { battle: 'caso', trainer: 'npcId', kind, noBlackout, music, win: [...], lose: [...] }
     { challenge: 'npcId' }             desafio completo do treinador ("!", vem até você, fala, caso)
     { give: 'item', qty }  { money: 100 }  { badge: 'id' }  { join: 'membro' }
     { heal: true }                     recupera a equipe e marca o ponto de retorno
     { warp: { to, x, y, dir } }
     { music: 'chave' }  { sfx: 'chave' }
     { opens: 'library' | 'notes' | 'shop', category }
     { pushBack: true }                 empurra o jogador um passo para trás (bloqueios)
     { credits: true }

   CONDIÇÕES
     'flag' / '!flag' · 'solved:caso' · 'seen:caso' · 'level:3' · 'badge:id' · 'badges:3' · 'cards:1'
     'team:id' · 'beat:npcId' · 'solvedAll' · lista = todas precisam valer

   VARIÁVEIS nas falas
     {name} {level} {money} {badges} {solved} {total} {notes} {cards}
   ===================================================================== */

// Cada caractere do mapa vira um tile. "index" = posição do tile no assets/tiles.png
// (da esquerda p/ direita, de cima p/ baixo, blocos de 16x16).
// solid: bloqueia · say: texto ao interagir · opens: tela ao interagir
// ledge: saliência (só se desce, pulando) · counter: balcão (fala com quem está atrás)
const TILES = {
  '.': { name: 'grama', index: 0 },
  ',': { name: 'flores', index: 1 },
  '#': { name: 'árvore', index: 2, solid: true },
  '=': { name: 'caminho', index: 3 },
  '~': { name: 'água', index: 4, solid: true },
  'R': { name: 'telhado vermelho', index: 5, solid: true },
  'H': { name: 'parede branca', index: 6, solid: true },
  'D': { name: 'porta de vidro', index: 7 },
  'F': { name: 'cerca', index: 8, solid: true },
  'Q': { name: 'telhado azul', index: 9, solid: true },
  'L': { name: 'parede de tijolo', index: 10, solid: true },
  'd': { name: 'porta de madeira', index: 11 },
  'w': { name: 'parede interna', index: 12, solid: true },
  'B': { name: 'estante', index: 13, solid: true, opens: 'library' },
  '_': { name: 'piso de madeira', index: 14 },
  'T': { name: 'mesa de estudos', index: 15, solid: true, opens: 'notes' },
  'X': { name: 'tapete de saída', index: 16 },
  '"': { name: 'mato alto', index: 17 },
  'r': { name: 'telhado de casa', index: 18, solid: true },
  'h': { name: 'parede de casa', index: 19, solid: true },
  'o': { name: 'porta de casa', index: 20, solid: true, say: ['A porta está trancada.'] },
  'P': { name: 'ponte', index: 21 },
  'M': { name: 'rocha', index: 22, solid: true },
  'v': { name: 'saliência', index: 23, solid: true, ledge: true },
  'C': { name: 'balcão', index: 24, solid: true, counter: true },
  'E': { name: 'leito', index: 25, solid: true, say: ['Um leito limpinho, pronto para o próximo paciente.'] },
  'G': { name: 'telhado verde', index: 26, solid: true },
};

const START = { map: 'vila', x: 11, y: 18, dir: 'up' };

const STORY = {
  intro: [
    ['Dr. Hélio', 'Olá, {name}! Bem-vindo(a) ao Vale Sereno.'],
    ['Dr. Hélio', 'Aqui as pessoas adoecem como em qualquer lugar... e cabe a nós cuidar delas.'],
    ['Dr. Hélio', 'Para se tornar especialista, você vai atravessar o vale, conquistar os 3 SELOS dos Centros de Especialidade e enfrentar a BANCA do Hospital Central.'],
    ['Dr. Hélio', 'Mas ninguém cuida sozinho. Venha até a minha clínica escolher o primeiro membro da sua equipe!'],
    ['', 'A clínica do Dr. Hélio é o prédio de telhado vermelho, ao norte. (Interagir: Z ou A · Menu: C ou MENU)'],
  ],
};

const MAPS = {};

// Encontros de flashcards no mato alto (aparecem quando há 3+ cards para revisar).
// Cada item é a fala de abertura; depois o jogo pergunta se você quer revisar.
const QUIZ_ENCOUNTERS = [
  [['Estudante', 'Ei, residente! Tenho prova amanhã. Me ajuda a revisar uns casos?']],
  [['Plantonista', 'Saí agora do plantão e não consigo dormir... Bora testar o que você lembra?']],
  [['Interna Lia', 'O Dr. Hélio mandou eu te fazer umas perguntas. Ordens do preceptor!']],
  [['Seu Caetano', 'Doutor(a)! Meu neto vai fazer medicina. Me ensina como é que estuda?']],
];
