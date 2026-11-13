'use strict';
/* =====================================================================
   MAPAS E HISTÓRIA — a jornada linear do Vale Sereno.
   Vila Aurora → Rota 1 → Cidade Ponte (Selo da Emergência) → Rota 2 →
   Porto Azul (Selo da Cardiologia) → Rota 3 → Serra Alta (Selo da Endocrinologia
   e a Banca do Hospital Central).
   Sintaxe completa no topo de content/world.js.
   ===================================================================== */

const PAL = {
  caio: { h: '#c03020', s: '#f0c49a', w: '#f8f8f8', b: '#303038', r: '#d04040', k: '#202838' },
  estudante: { h: '#4a3020', s: '#e8b88c', w: '#f8f8f8', b: '#50a050', r: '#50a050', k: '#3a4a6a' },
  estudante2: { h: '#202020', s: '#a87050', w: '#f8f8f8', b: '#d0a040', r: '#d0a040', k: '#4a3a5a', long: true },
  residente: { h: '#6a4a2a', s: '#f0c49a', w: '#f8f8f8', b: '#5070c0', r: '#d04040', k: '#30384a' },
  residente2: { h: '#e0c060', s: '#f2c8a0', w: '#f8f8f8', b: '#c05080', r: '#d04040', k: '#30384a', long: true },
  morador: { h: '#7a5a3a', s: '#e0b088', w: '#7aa050', b: '#5a8030', r: '#7aa050', k: '#4a3a2a' },
  moradora: { h: '#a0a0a8', s: '#e8c0a0', w: '#c06060', b: '#a04848', r: '#c06060', k: '#4a4a5a', long: true },
  guarda: { h: '#2a2a2a', s: '#c89070', w: '#3a4a8a', b: '#2a3a6a', r: '#e0c040', k: '#20283a' },
  capanga: { h: '#1a1a1a', s: '#d8a880', w: '#3a8a3a', b: '#2a6a2a', r: '#e0c040', k: '#1a2a1a' },
  vito: { h: '#e8e8e8', s: '#d8a070', w: '#2a6a2a', b: '#e0c040', r: '#e0c040', k: '#1a1a1a' },
  rosa: { h: '#2a1a1a', s: '#a87050', w: '#f8f8f8', b: '#c03838', r: '#c03838', k: '#303040', long: true },
  otavio: { h: '#808088', s: '#e8b890', w: '#f8f8f8', b: '#c060a0', r: '#c060a0', k: '#303040' },
  celeste: { h: '#e8d070', s: '#f2c8a0', w: '#f8f8f8', b: '#3090c8', r: '#3090c8', k: '#303040', long: true },
  examinador: { h: '#505058', s: '#e0b088', w: '#30344a', b: '#f8f8f8', r: '#c03838', k: '#20202a' },
  examinadora: { h: '#3a2a3a', s: '#b07a58', w: '#30344a', b: '#f8f8f8', r: '#c03838', k: '#20202a', long: true },
  enfermeira: { h: '#d07040', s: '#f0c49a', w: '#f8d0e0', b: '#f8f8f8', r: '#e05050', k: '#f8f8f8', long: true },
};

const TIPS = [
  'Dica: treinadores te veem de longe. Se cruzar o olhar, prepare-se para um caso!',
  'Dica: a EQUIPE e a MOCHILA ajudam no atendimento sem gastar turno.',
  'Dica: descanse nos Postos (telhado vermelho) para recuperar a equipe.',
  'Dica: se você perder um caso, volta ao último Posto e perde parte do dinheiro.',
  'Dica: o ATLAS mostra todos os casos que você já encontrou.',
  'Dica: saliências na grama só podem ser descidas. Use-as como atalho!',
];

// Paciente com "!": atendimento opcional com recompensa
function patientQuest(caseId, flag, intro, thanks, reward) {
  return [
    { if: flag, speaker: CASES[caseId].name, say: thanks },
    {
      say: intro,
      do: [{
        ask: 'Iniciar o atendimento?', yesLabel: 'Atender', noLabel: 'Agora não',
        yes: [{ battle: caseId, kind: 'patient', noBlackout: true, win: [{ set: flag }, ...reward] }],
      }],
    },
  ];
}

// Cena do rival na clínica: ele escolhe o membro que sobrou e desafia você
function rivalScene(pick) {
  const d = TEAM[pick];
  return [
    { set: 'caioArrives' },
    { say: [['Caio', 'Dr. Hélio! Cheguei! ...Ah, {name}. Você também por aqui.']] },
    { approach: 'caio' },
    { say: [['Caio', `Já escolheu, é? Então eu fico com ${d.name}. Muito melhor.`]] },
    { set: 'rival:' + pick },
    { say: [['', `${d.name} entrou para a equipe do Caio.`], ['Caio', 'Que tal um caso agora, para ver quem é o melhor residente?']] },
    {
      battle: 'sincope', trainer: 'caio', noBlackout: true,
      win: [{ say: [['Caio', 'Hmpf. Sorte de principiante!']] }],
      lose: [{ say: [['Caio', 'Ha! Estuda mais, {name}!']] }],
    },
    { say: [['Caio', 'Vou na frente. A gente se vê na estrada!']] },
    { goto: 'caio', x: 5, y: 8 },
    { set: 'caioLeft' },
    { face: 'helio', dir: 'player' },
    { say: [['Dr. Hélio', 'Esse Caio... Bom, {name}, isto é para você.']] },
    { give: 'manual', qty: 2 },
    { give: 'lanche', qty: 2 },
    {
      say: [
        ['Dr. Hélio', 'E este é o seu ATLAS CLÍNICO: ele registra cada caso que você encontrar. Abra pelo menu (C).'],
        ['Dr. Hélio', 'Siga para o norte até a Cidade Ponte. Lá fica o Centro de Emergência e o primeiro Selo.'],
        ['Dr. Hélio', 'Quando a equipe cansar, descanse num POSTO DE DESCANSO: telhado vermelho, porta de vidro.'],
      ],
    },
  ];
}

function starterBlocks(id, rivalPick, intro) {
  const d = TEAM[id];
  return [
    { if: 'champion', speaker: d.name, say: ['Especialista {name}! Agora que a Banca passou... posso entrar na sua equipe?'], do: [{ join: id }] },
    { if: 'starter', speaker: d.name, say: ['Boa sorte na jornada, {name}!'] },
    {
      speaker: d.name, say: intro,
      do: [{
        ask: `Convidar ${d.name} (${d.role}) para a sua equipe?`, yesLabel: 'Convidar', noLabel: 'Pensar',
        yes: [{ join: id }, { set: 'starter' }, ...rivalScene(rivalPick)],
      }],
    },
  ];
}

function nurse() {
  return {
    id: 'clara', name: 'Enf. Clara', x: 5, y: 2, pal: PAL.enfermeira, still: true,
    dialogue: [{
      speaker: 'Enf. Clara', say: ['Bem-vindo(a) ao Posto de Descanso! Vou cuidar da sua equipe.'],
      do: [
        { heal: true },
        { say: [['Enf. Clara', 'Prontinho! Equipe descansada. Se algo der errado, você volta para cá.']] },
        { if: 'cards:1', then: [{
          ask: 'Enf. Clara: Você tem {cards} flashcard(s) para revisar. Quer aproveitar o descanso?',
          yesLabel: 'Revisar', noLabel: 'Depois', yes: [{ opens: 'review' }],
        }] },
      ],
    }],
  };
}

// ======================= VILA AURORA =======================
MAPS.vila = {
  music: 'cidade',
  rows: [
    '###########==###########',
    '#,,.......==.......,,,.#',
    '#..rrrr...==...RRRRRR..#',
    '#..rrrr...==...RRRRRR..#',
    '#..hhoh...==...HHDHHH..#',
    '#.........==...........#',
    '#.====================.#',
    '#.=....,,.......,,...=.#',
    '#.=..rrrr....~~~~....=.#',
    '#.=..rrrr....~~~~....=.#',
    '#.=..hhoh....~~~~....=.#',
    '#.=..........~~~~....=.#',
    '#.=...,,,,...........=.#',
    '#.====================.#',
    '#......#........#......#',
    '#..,,..#..rrrr..#..,,..#',
    '#..,,.....rrrr.........#',
    '#.........hohh.........#',
    '#,,,.................,,#',
    '########################',
  ],
  warps: [
    { x: 11, y: 0, w: 2, to: 'rota1', tx: 9, ty: 28, dir: 'up' },
    { x: 17, y: 4, to: 'clinica', tx: 5, ty: 7, dir: 'up' },
  ],
  triggers: [{
    x: 11, y: 1, w: 2, if: '!starter',
    do: [
      { say: [['Dr. Hélio', 'Ei, {name}! Espere!'], ['Dr. Hélio', 'Sair por aí sem equipe é perigoso. Passe na minha clínica primeiro: telhado vermelho, à direita!']] },
      { pushBack: true },
    ],
  }],
  npcs: [
    { id: 'placa-vila', kind: 'sign', x: 14, y: 18, dialogue: [{ say: ['VILA AURORA', 'Onde todo plantão começa.'] }] },
    { id: 'casa-jogador', kind: 'object', x: 11, y: 17, dialogue: [{ say: ['Sua casa. Hoje não dá tempo de voltar: o plantão te espera!'] }] },
    {
      id: 'neusa', name: 'Dona Neusa', x: 4, y: 12, pal: PAL.moradora,
      dialogue: [
        { if: '!starter', speaker: 'Dona Neusa', say: ['Bom dia, {name}! O Dr. Hélio está te esperando na clínica.'] },
        { speaker: 'Dona Neusa', say: ['No mato alto da Rota 1 sempre tem alguém passando mal. Ainda bem que agora tem você!'] },
      ],
    },
    {
      id: 'joao', name: 'Seu João', x: 19, y: 11, pal: PAL.morador,
      dialogue: [{ speaker: 'Seu João', say: ['Fui atendido pelo Dr. Hélio quando infartei. Ele não perdeu um minuto!'], random: TIPS }],
    },
  ],
};

MAPS.clinica = {
  music: 'biblioteca',
  rows: [
    'wwwwwwwwwwww',
    'wBBwwwwwwBBw',
    'w__________w',
    'w__CCCC____w',
    'w__________w',
    'w__________w',
    'w_E______E_w',
    'w__________w',
    'wwwwwXwwwwww',
  ],
  warps: [{ x: 5, y: 8, to: '__back' }],
  onEnter: [{
    if: '!metHelio',
    do: [
      { say: [
        ['Dr. Hélio', 'Ah, {name}! Chegou bem na hora.'],
        ['Dr. Hélio', 'Ninguém cuida sozinho: estes três profissionais querem entrar para uma equipe.'],
        ['Dr. Hélio', 'Converse com eles e escolha quem vai começar a jornada com você!'],
      ] },
      { set: 'metHelio' },
    ],
  }],
  npcs: [
    {
      id: 'helio', name: 'Dr. Hélio', sprite: 'mentor', x: 4, y: 2, still: true,
      dialogue: [
        { if: 'champion', speaker: 'Dr. Hélio', say: ['Especialista {name}! Ver você crescer foi a maior alegria do meu plantão.'] },
        { if: '!starter', speaker: 'Dr. Hélio', say: ['Converse com a Bia, o Davi ou a Lia e escolha quem começa com você.'] },
        { speaker: 'Dr. Hélio', say: ['Rumo ao norte! Selos conquistados: {badges} de 3.'], random: TIPS },
      ],
    },
    {
      id: 'prof-bia', name: 'Enf. Bia', sprite: 'bia', pal: TEAM.bia.pal, x: 8, y: 3, still: true, showIf: ['!team:bia', '!rival:bia'],
      dialogue: starterBlocks('bia', 'davi', ['Oi! Sou a Bia, da enfermagem.', 'Monitorização é comigo: deixo o paciente estável enquanto você pensa.']),
    },
    {
      id: 'prof-davi', name: 'Farm. Davi', sprite: 'davi', pal: TEAM.davi.pal, x: 9, y: 3, still: true, showIf: ['!team:davi', '!rival:davi'],
      dialogue: starterBlocks('davi', 'lia', ['Davi, farmácia clínica.', 'Eu confiro cada prescrição. Comigo, conduta errada não passa!']),
    },
    {
      id: 'prof-lia', name: 'Fisio Lia', sprite: 'lia', pal: TEAM.lia.pal, x: 10, y: 3, still: true, showIf: ['!team:lia', '!rival:lia'],
      dialogue: starterBlocks('lia', 'bia', ['Lia, fisioterapia!', 'Posicionamento e suporte ventilatório: quando o paciente piora, eu seguro as pontas.']),
    },
    {
      id: 'caio', name: 'Caio', pal: PAL.caio, x: 5, y: 7, dir: 'up', still: true, showIf: ['caioArrives', '!caioLeft'],
      trainer: { name: 'Rival Caio', case: 'sincope', money: 150, range: 0, music: 'rival', lose: ['Caio: Tsc... foi sorte!'] },
    },
  ],
};

// ======================= ROTA 1 =======================
MAPS.rota1 = {
  music: 'rota',
  encounters: { tile: '"', chance: 0.1, cases: ['sincope', 'hipo', 'asma'] },
  rows: [
    '#########==#########',
    '#""""....==....""""#',
    '#""""....==....""""#',
    '#""""....==....""""#',
    '#...#....==....#...#',
    '#vvvvvvv.==.vvvvvvv#',
    '#........==........#',
    '#."""""".==."""""".#',
    '#."""""".==."""""".#',
    '#."""""".==."""""".#',
    '#........==........#',
    '#..###...==...###..#',
    '#........==........#',
    '#,,,.....==.....,,,#',
    '#vvvvvvv.==.vvvvvvv#',
    '#........==........#',
    '#."""""""==........#',
    '#."""""""==...~~~..#',
    '#."""""""==...~~~..#',
    '#........==...~~~..#',
    '#.###....==........#',
    '#........==.""""...#',
    '#..,,....==.""""...#',
    '#..,,....==.""""...#',
    '#........==........#',
    '###......==......###',
    '#........==........#',
    '#..#.....==.....#..#',
    '#........==........#',
    '#########==#########',
  ],
  warps: [
    { x: 9, y: 29, w: 2, to: 'vila', tx: 11, ty: 1, dir: 'down' },
    { x: 9, y: 0, w: 2, to: 'ponte', tx: 13, ty: 20, dir: 'up' },
  ],
  npcs: [
    { id: 'placa-r1', kind: 'sign', x: 11, y: 27, dialogue: [{ say: ['ROTA 1', 'Ao norte: Cidade Ponte.', 'Cuidado: no mato alto sempre tem alguém passando mal!'] }] },
    {
      id: 'pedro', name: 'Estudante Pedro', x: 12, y: 9, dir: 'left', pal: PAL.estudante,
      trainer: {
        name: 'Estudante Pedro', case: 'asma', money: 120, range: 3,
        intro: ['Ei! Você é residente? Me ajuda com esse caso do estágio!'],
        lose: ['Pedro: Uau, que raciocínio!'], after: ['Vou estudar mais broncoespasmo...'],
      },
    },
    {
      id: 'lara', name: 'Interna Lara', x: 7, y: 21, dir: 'right', pal: PAL.estudante2,
      trainer: {
        name: 'Interna Lara', case: 'hipo', money: 150, range: 3,
        intro: ['Te achei! Tenho um caso da enfermaria que ninguém resolve.'],
        lose: ['Lara: Nossa, foi rápido!'], after: ['Sempre checar a glicemia, né? Aprendi.'],
      },
    },
    {
      id: 'ari', name: 'Seu Ari', x: 15, y: 24, pal: PAL.morador,
      dialogue: [{ speaker: 'Seu Ari', say: ['Leve sempre um Café na mochila: uma ação de graça faz diferença num paciente grave!'] }],
    },
  ],
};

// ======================= CIDADE PONTE =======================
MAPS.ponte = {
  music: 'cidade',
  rows: [
    '############################',
    '#,,.....#..........#.....,,#',
    '#..RRRRR...rrrr....GGGGGG..#',
    '#..RRRRR...rrrr....GGGGGG..#',
    '#..HHDHH...hhoh....LLdLLL..#',
    '#..........................#',
    '#.========================.#',
    '#.=...,,.....=.....,,....=.#',
    '#.=..........=...........=.#',
    '#.=..rrrr....=....~~~~...=.#',
    '#.=..hhoh....=====PPPP======',
    '#.=..........=====PPPP======',
    '#.=..........=....~~~~...=.#',
    '#.=..,,,.....=....~~~~...=.#',
    '#.=..,,,.....=....~~~~...=.#',
    '#.============....~~~~...=.#',
    '#....#.......==...~~~~...=.#',
    '#.rrrr.......==...~~~~...=.#',
    '#.rrrr.......==...~~~~.....#',
    '#.hohh.......==...~~~~.,,..#',
    '#,,..........==...~~~~..,,.#',
    '#############==#############',
  ],
  warps: [
    { x: 13, y: 21, w: 2, to: 'rota1', tx: 9, ty: 1, dir: 'down' },
    { x: 27, y: 10, h: 2, to: 'rota2', tx: 1, ty: 7, dir: 'right' },
    { x: 5, y: 4, to: 'posto', tx: 6, ty: 8, dir: 'up' },
    { x: 21, y: 4, to: 'gym_emerg', tx: 6, ty: 10, dir: 'up' },
  ],
  triggers: [{
    x: 26, y: 10, h: 2, if: '!badge:emergencia',
    do: [
      { face: 'guarda1', dir: 'player' },
      { say: [['Guarda', 'Alto lá! A Rota 2 está cheia de gente do tal Grupo Cura Milagrosa.'], ['Guarda', 'Só deixo passar quem tem o Selo da Emergência. O Centro fica ao norte da cidade.']] },
      { pushBack: true },
    ],
  }],
  npcs: [
    { id: 'placa-ponte', kind: 'sign', x: 11, y: 5, dialogue: [{ say: ['CIDADE PONTE', 'Posto de Descanso à esquerda · Centro de Emergência à direita.'] }] },
    {
      id: 'guarda1', name: 'Guarda', x: 25, y: 9, dir: 'down', pal: PAL.guarda, still: true,
      dialogue: [
        { if: 'badge:emergencia', speaker: 'Guarda', say: ['Selo da Emergência! Pode seguir para a Rota 2. Cuidado com os vendedores de cura milagrosa.'] },
        { speaker: 'Guarda', say: ['Sem o Selo da Emergência, não passa para a Rota 2.'] },
      ],
    },
    {
      id: 'nando', name: 'Téc. Nando', sprite: 'nando', pal: TEAM.nando.pal, x: 23, y: 5, showIf: ['badge:emergencia', '!team:nando'],
      bubble: '!team:nando', bubbleColor: '#3070e0',
      dialogue: [{
        speaker: 'Téc. Nando', say: ['Vi você vencer a Dra. Rosa! Sou técnico de radiologia.', 'Precisa de um exame na hora? Me leva na equipe!'],
        do: [{ join: 'nando' }],
      }],
    },
    {
      id: 'marina', name: 'Marina', sprite: 'anafilaxia', x: 9, y: 8, bubble: '!helped:marina',
      dialogue: patientQuest('anafilaxia', 'helped:marina',
        ['Marina coça os braços sem parar. Os lábios estão inchados.', ['Marina', 'Doutor(a)... minha garganta... tá fechando...']],
        ['Já comprei minha caneta de adrenalina! Nunca mais saio sem ela.'],
        [{ say: [['Marina', 'Obrigada! Por favor, aceite isso.']] }, { give: 'cafe', qty: 3 }]),
    },
    {
      id: 'pescador', name: 'Pescador', x: 16, y: 12, pal: PAL.morador,
      dialogue: [{ speaker: 'Pescador', say: ['A Dra. Rosa é durona, mas justa. Ela adora casos de trauma: pense no ABCDE!'] }],
    },
  ],
};

// Posto de Descanso (o mesmo interior serve para todas as cidades)
MAPS.posto = {
  music: 'biblioteca',
  rows: [
    'wwwwwwwwwwwwww',
    'wEE___ww___BBw',
    'w____________w',
    'w___CCCC__CC_w',
    'w____________w',
    'w____________w',
    'w_T________T_w',
    'w____________w',
    'w____________w',
    'wwwwwwXwwwwwww',
  ],
  warps: [{ x: 6, y: 9, to: '__back' }],
  npcs: [
    nurse(),
    {
      id: 'atendente', name: 'Atendente', x: 10, y: 2, pal: PAL.residente, still: true,
      dialogue: [{ speaker: 'Atendente', say: ['Bem-vindo(a) à farmácia e cantina! Dê uma olhada.'], opens: 'shop' }],
    },
    {
      id: 'descanso', name: 'Residente cansado', x: 3, y: 7, pal: PAL.residente2,
      dialogue: [{ speaker: 'Residente', say: ['Plantão de 24 horas... preciso de um café.'], random: TIPS }],
    },
  ],
};

MAPS.gym_emerg = {
  music: 'ginasio',
  rows: [
    'wwwwwwwwwwwwww',
    'wBB___ww___BBw',
    'w____________w',
    'w_EE______EE_w',
    'w____________w',
    'wwwww____wwwww',
    'w____________w',
    'w_E________E_w',
    'w____________w',
    'w____________w',
    'w____________w',
    'wwwwwwXwwwwwww',
  ],
  warps: [{ x: 6, y: 11, to: '__back' }],
  npcs: [
    {
      id: 'recepcao-emerg', name: 'Recepção', x: 9, y: 9, pal: PAL.residente2,
      dialogue: [{ speaker: 'Recepção', say: ['Centro de Emergência! A chefe, Dra. Rosa, adora casos de trauma torácico.', 'Revise o ABCDE e o choque obstrutivo antes de enfrentá-la.'] }],
    },
    {
      id: 'teo', name: 'Residente Téo', x: 3, y: 6, dir: 'right', pal: PAL.residente,
      trainer: {
        name: 'Residente Téo', case: 'anafilaxia', money: 250, range: 4,
        intro: ['Para chegar na Dra. Rosa, passa por mim primeiro!'],
        lose: ['Téo: Adrenalina IM na coxa... você manja!'], after: ['A Dra. Rosa não perdoa demora.'],
      },
    },
    {
      id: 'rosa', name: 'Dra. Rosa', x: 6, y: 2, pal: PAL.rosa,
      trainer: {
        name: 'Dra. Rosa, chefe da Emergência', case: 'pneumo', money: 800, range: 0, hard: 1.1, music: 'rival',
        intro: ['Sou a Dra. Rosa, chefe do Centro de Emergência.', 'Aqui não tem tempo para hesitar. Mostre o seu ABCDE!'],
        lose: ['Rosa: Rápido e preciso. Você merece.'],
        win: [
          { say: [['Dra. Rosa', 'Este é o SELO DA EMERGÊNCIA. Com ele, o guarda da saída leste deixa você passar.']] },
          { badge: 'emergencia' },
          { say: [['Dra. Rosa', 'E leve uma Teleconsulta: até os melhores precisam de uma segunda opinião às vezes.']] },
          { give: 'teleconsulta' },
        ],
        after: ['No trauma, quem decide é o exame clínico. Não espere o raio-X!'],
      },
    },
  ],
};

// ======================= ROTA 2 =======================
MAPS.rota2 = {
  music: 'rota',
  encounters: { tile: '"', chance: 0.1, cases: ['asma', 'anafilaxia', 'hipo', 'sincope'] },
  rows: [
    '####################~~~~################',
    '#...................~~~~...............#',
    '#..""""""""..####...~~~~..""""""""..##.#',
    '#..""""""""..####...~~~~..""""""""..##.#',
    '#.."""""""".........~~~~............##.#',
    '#.,,,...............~~~~..vvvvvvvvvv...#',
    '#...................~~~~...............#',
    '====================PPPP================',
    '====================PPPP================',
    '#...................~~~~...............#',
    '#.........""""""""..~~~~..""""""""""...#',
    '#.........""""""""..~~~~..""""""""""...#',
    '#...###...""""",,"..~~~~..""""""""""...#',
    '#...###...""""""""..~~~~..""""""""""...#',
    '#...................~~~~...............#',
    '####################~~~~################',
  ],
  warps: [
    { x: 0, y: 7, h: 2, to: 'ponte', tx: 26, ty: 10, dir: 'left' },
    { x: 39, y: 7, h: 2, to: 'porto', tx: 1, ty: 10, dir: 'right' },
  ],
  triggers: [
    { x: 17, y: 7, w: 2, h: 2, if: '!beat:grunt1', do: [{ challenge: 'grunt1' }] },
    { x: 33, y: 7, h: 2, if: '!beat:caio2', do: [{ challenge: 'caio2' }] },
  ],
  npcs: [
    {
      id: 'grunt1', name: 'Capanga', x: 18, y: 6, dir: 'down', pal: PAL.capanga, showIf: '!grunt1Left',
      trainer: {
        name: 'Capanga da Cura Milagrosa', case: 'hipo', money: 300, range: 0, music: 'vilao',
        intro: [
          'Ei, você! Daqui ninguém passa!',
          'Nosso "Chá Milagroso para Diabetes" é sucesso de vendas... só que esse cliente aqui apagou.',
          'Duvido que você descubra o porquê!',
        ],
        lose: ['Capanga: O quê?! Tinha remédio escondido no chá?!'],
        win: [
          { say: [['Capanga', 'Isso não vai ficar assim! O Mestre Vito vai saber disso!']] },
          { goto: 'grunt1', x: 18, y: 1 },
          { set: 'grunt1Left' },
          { say: [['', 'Produtos "naturais" adulterados com remédios (como a glibenclamida) podem causar hipoglicemia grave. Denuncie à Vigilância Sanitária!']] },
        ],
      },
    },
    {
      id: 'sol', name: 'Enfermeira Sol', x: 8, y: 9, dir: 'up', pal: PAL.enfermeira,
      trainer: {
        name: 'Enfermeira Sol', case: 'sincope', money: 200, range: 2,
        intro: ['Na UBS também tem caso difícil! Olha só esse.'],
        lose: ['Sol: Boa! ECG em toda síncope, né?'], after: ['Na atenção primária a gente vê de tudo!'],
      },
    },
    {
      id: 'breno', name: 'Interno Breno', x: 30, y: 6, dir: 'down', pal: PAL.estudante,
      trainer: {
        name: 'Interno Breno', case: 'cad', money: 220, range: 2,
        intro: ['Plantão de clínica médica, bora! Esse paciente chegou vomitando...'],
        lose: ['Breno: Potássio antes da insulina... anotado!'], after: ['Volume, potássio, insulina. Volume, potássio, insulina...'],
      },
    },
    {
      id: 'caio2', name: 'Caio', x: 35, y: 6, dir: 'down', pal: PAL.caio, showIf: '!caio2Left',
      trainer: {
        name: 'Rival Caio', case: 'apendicite', money: 500, range: 0, music: 'rival',
        intro: ['{name}! Sabia que ia te encontrar.', 'Também peguei o Selo da Emergência. Vamos ver quem evoluiu mais!'],
        lose: ['Caio: ...Tá. Você é bom. Por enquanto.'],
        win: [
          { say: [['Caio', 'O Porto Azul fica logo ali. O Dr. Otávio, da Cardio, é osso duro.'], ['Caio', 'Não vá perder pra ele antes de perder pra mim!']] },
          { goto: 'caio2', x: 38, y: 6 },
          { set: 'caio2Left' },
        ],
      },
    },
    {
      id: 'rafael', name: 'Rafael', sprite: 'pneumo', x: 17, y: 14, bubble: '!helped:rafael',
      dialogue: patientQuest('pneumo', 'helped:rafael',
        ['Rafael está caído ao lado da moto, com a mão no peito.', ['Rafael', 'Não... consigo... respirar...']],
        ['Vou trocar a moto por uma bicicleta. Talvez.'],
        [{ say: [['Rafael', 'Você salvou minha vida. Fica com isso, por favor.']] }, { money: 300 }, { give: 'lanche' }]),
    },
  ],
};

// ======================= PORTO AZUL =======================
MAPS.porto = {
  music: 'cidade',
  rows: [
    '##############==##############',
    '#.............==.............#',
    '#.............==.............#',
    '#..RRRRRQQQQQ.==...GGGGGG....#',
    '#..RRRRRQQQQQ.==...GGGGGG....#',
    '#..HHDHHLLdLL.==...LLdLLL....#',
    '#....=....=...==.....=.......#',
    '#....=....=...==.....=..,,,..#',
    '#....=....=...==.....=.......#',
    '#....=....=...==.....=.......#',
    '============================.#',
    '============================.#',
    '#.............=..............#',
    '#..rrrr..rrrr.=.....rrrr.....#',
    '#..rrrr..rrrr.=.....rrrr.....#',
    '#..hhoh..hhoh.=.....hhoh.,,,.#',
    '#.,,..........=..............#',
    '#............PPP.............#',
    '#~~~~~~~~~~~~PPP~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~PPP~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~PPP~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~PPP~~~~~~~~~~~~~#',
    '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
    '##############################',
  ],
  warps: [
    { x: 0, y: 10, h: 2, to: 'rota2', tx: 38, ty: 7, dir: 'left' },
    { x: 14, y: 0, w: 2, to: 'rota3', tx: 9, ty: 32, dir: 'up' },
    { x: 5, y: 5, to: 'posto', tx: 6, ty: 8, dir: 'up' },
    { x: 10, y: 5, to: 'biblioteca', tx: 6, ty: 8, dir: 'up' },
    { x: 21, y: 5, to: 'gym_cardio', tx: 6, ty: 10, dir: 'up' },
  ],
  triggers: [{
    x: 14, y: 1, w: 2, if: '!badge:cardio',
    do: [
      { face: 'guarda2', dir: 'player' },
      { say: [['Guarda', 'A Rota 3 sobe a serra e está tomada pelo Grupo Cura Milagrosa.'], ['Guarda', 'Só libero com o Selo da Cardiologia.']] },
      { pushBack: true },
    ],
  }],
  npcs: [
    { id: 'placa-porto', kind: 'sign', x: 16, y: 12, dialogue: [{ say: ['PORTO AZUL', 'Posto · Biblioteca · Centro de Cardiologia'] }] },
    {
      id: 'guarda2', name: 'Guarda', x: 13, y: 1, dir: 'down', pal: PAL.guarda, still: true,
      dialogue: [
        { if: 'badge:cardio', speaker: 'Guarda', say: ['Pode subir. Boa sorte na serra!'] },
        { speaker: 'Guarda', say: ['Sem o Selo da Cardiologia, a Rota 3 continua fechada.'] },
      ],
    },
    {
      id: 'ana', name: 'Psic. Ana', sprite: 'ana', pal: TEAM.ana.pal, x: 17, y: 7, showIf: '!team:ana',
      bubble: '!team:ana', bubbleColor: '#3070e0',
      dialogue: [{
        speaker: 'Psic. Ana',
        say: ['Oi! Sou psicóloga do hospital do porto.', 'Os pacientes chegam assustados com as promessas do Grupo Cura Milagrosa. Posso ajudar a acolhê-los?'],
        do: [{ ask: 'Convidar a Psic. Ana para a sua equipe?', yesLabel: 'Convidar', noLabel: 'Agora não', yes: [{ join: 'ana' }] }],
      }],
    },
    {
      id: 'joaquim', name: 'Seu Joaquim', sprite: 'iam', x: 12, y: 16, bubble: '!helped:joaquim',
      dialogue: patientQuest('iam', 'helped:joaquim',
        ['Seu Joaquim está apoiado no cais, pálido e suando frio.', ['Seu Joaquim', 'Doutor(a)... tá doendo muito aqui no peito...']],
        ['Fiz o cateterismo a tempo! E parei de fumar. Prometo!'],
        [{ say: [['Seu Joaquim', 'Obrigado, doutor(a). Leve isso, por favor.']] }, { money: 400 }, { give: 'manual' }]),
    },
    {
      id: 'marujo', name: 'Marujo', x: 20, y: 16, pal: PAL.morador,
      dialogue: [{ speaker: 'Marujo', say: ['Dizem que o Dr. Otávio lê ECG de olhos fechados. E que ele odeia quem esquece o V4R!'] }],
    },
  ],
};

MAPS.biblioteca = {
  music: 'biblioteca',
  rows: [
    'wwwwwwwwwwwwww',
    'wBBBBBwwBBBBBw',
    'w____________w',
    'w____________w',
    'w_BBB____BBB_w',
    'w____________w',
    'w___TT__TT___w',
    'w____________w',
    'w____________w',
    'wwwwwwXwwwwwww',
  ],
  warps: [{ x: 6, y: 9, to: '__back' }],
  npcs: [
    {
      id: 'bibliotecaria', name: 'Dona Iracema', x: 11, y: 7,
      pal: { h: '#6a4a8a', s: '#d8a880', w: '#7a5a3a', b: '#5a3a2a', r: '#e0c050', k: '#3a2a2a', long: true },
      bubble: '!metLibrarian', bubbleColor: '#3070e0',
      dialogue: [
        {
          if: '!metLibrarian', set: 'metLibrarian', speaker: 'Dona Iracema', opens: 'library',
          say: [
            'Psiu! Bem-vindo(a) à biblioteca. Eu sou a Dona Iracema.',
            'Nas ESTANTES você encontra os tópicos de estudo. Alguns só ficam disponíveis depois que você atende certos pacientes.',
            'Na seção "Casos atendidos" ficam os estudos completos de cada paciente que você já viu.',
            'E nas MESAS você pode reler suas anotações com calma. Bons estudos!',
          ],
        },
        { speaker: 'Dona Iracema', opens: 'library', say: ['Procurando alguma coisa? Deixa eu te mostrar o acervo.'] },
      ],
    },
    {
      id: 'estante-cardio', kind: 'object', x: 2, y: 4,
      dialogue: [{ say: ['Uma estante cheia de livros de cardiologia.'], opens: 'library', category: 'Cardiologia' }],
    },
  ],
};

MAPS.gym_cardio = {
  music: 'ginasio',
  rows: [
    'wwwwwwwwwwwwww',
    'wBB___TT___BBw',
    'w____________w',
    'w__EE____EE__w',
    'w____________w',
    'www___ww___www',
    'w____________w',
    'w__T______T__w',
    'w____________w',
    'w____________w',
    'w____________w',
    'wwwwwwXwwwwwww',
  ],
  warps: [{ x: 6, y: 11, to: '__back' }],
  npcs: [
    {
      id: 'recepcao-cardio', name: 'Recepção', x: 9, y: 9, pal: PAL.residente2,
      dialogue: [{ speaker: 'Recepção', say: ['Centro de Cardiologia. O Dr. Otávio é especialista em infarto.', 'Dica: a dor torácica e o ECG estão na biblioteca, aqui do lado.'] }],
    },
    {
      id: 'mauro', name: 'Residente Mauro', x: 1, y: 6, dir: 'right', pal: PAL.residente,
      trainer: {
        name: 'Residente Mauro', case: 'eap', money: 300, range: 4,
        intro: ['Insuficiência cardíaca descompensada é comigo. E com você?'],
        lose: ['Mauro: VNI e nitrato, perfeito.'], after: ['Volume no EAP? Nunca!'],
      },
    },
    {
      id: 'igor', name: 'Residente Igor', x: 12, y: 6, dir: 'left', pal: PAL.estudante,
      trainer: {
        name: 'Residente Igor', case: 'tep', money: 300, range: 4,
        intro: ['Dispneia súbita... cardio ou pulmão? Vamos ver!'],
        lose: ['Igor: Wells alto, angioTC. Bem pensado.'], after: ['D-dímero serve para excluir, não para confirmar.'],
      },
    },
    {
      id: 'otavio', name: 'Dr. Otávio', x: 6, y: 2, pal: PAL.otavio,
      trainer: {
        name: 'Dr. Otávio, chefe da Cardiologia', case: 'iam', money: 1000, range: 0, hard: 1.1, music: 'rival',
        intro: ['Dr. Otávio, Cardiologia. Tempo é músculo.', 'Cada minuto sem reperfusão é miocárdio perdido. Prove que você sabe disso!'],
        lose: ['Otávio: Porta-balão impecável.'],
        win: [
          { say: [['Dr. Otávio', 'O SELO DA CARDIOLOGIA é seu. Com ele, o guarda do norte libera a Rota 3.']] },
          { badge: 'cardio' },
          { give: 'cafe', qty: 3 },
        ],
        after: ['V3R e V4R no infarto inferior. Nunca esqueça.'],
      },
    },
  ],
};

// ======================= ROTA 3 =======================
MAPS.rota3 = {
  music: 'rota',
  encounters: { tile: '"', chance: 0.1, cases: ['avc', 'tep', 'hipo', 'asma'] },
  rows: [
    '#########==#########',
    '#........==........#',
    '#MMM.....==........#',
    '#MMM"""".==....MMMM#',
    '#MMM"""".==....MMMM#',
    '#MMM"""".==....MMMM#',
    '#..."""".==........#',
    '#........==."""""".#',
    '#vvvvvvvv==."""""".#',
    '#........==."""""".#',
    '#MMMMM...==........#',
    '#MMMMM...==vv......#',
    '#........==..MMMMMM#',
    '#."""""".==..MMMMMM#',
    '#."""""".==........#',
    '#."""""".==........#',
    '#."""""".==........#',
    '#........==."""""..#',
    '#........==."""""..#',
    '#vvvvvvvv==vvvvvvvv#',
    '#MMM.....==."""""..#',
    '#MMM.....==........#',
    '#MMM.....==.....MMM#',
    '#MMM.....==.....MMM#',
    '#MM""""".==.....MMM#',
    '#..""""".==.....MMM#',
    '#..""""".==."""""".#',
    '#........==."""""".#',
    '#........==........#',
    '#...MMM..==...MMMM.#',
    '#...MMM..==...MMMM.#',
    '#........==........#',
    '#........==........#',
    '#########==#########',
  ],
  warps: [
    { x: 9, y: 33, w: 2, to: 'porto', tx: 14, ty: 1, dir: 'down' },
    { x: 9, y: 0, w: 2, to: 'serra', tx: 13, ty: 20, dir: 'up' },
  ],
  triggers: [{ x: 9, y: 15, w: 2, if: '!beat:dante', do: [{ challenge: 'dante' }] }],
  npcs: [
    { id: 'placa-r3', kind: 'sign', x: 11, y: 31, dialogue: [{ say: ['ROTA 3 — Subida da Serra', 'Ao norte: Serra Alta e o Hospital Central.'] }] },
    {
      id: 'dante', name: 'Dante', x: 11, y: 14, dir: 'left', pal: PAL.vito, showIf: '!danteLeft',
      trainer: {
        name: 'Dante, gerente da Cura Milagrosa', case: 'anafilaxia', money: 600, range: 0, music: 'vilao',
        intro: [
          'Então é você que anda atrapalhando nossos negócios.',
          'Nosso "Chá de Ervas Importado" é tiro e queda... a cliente só ficou um pouquinho inchada.',
          'Quero ver você resolver!',
        ],
        lose: ['Dante: Adrenalina na coxa... como você sabia?!'],
        win: [
          { say: [['Dante', 'O Mestre Vito está na Serra Alta. Ele vai acabar com você!']] },
          { goto: 'dante', x: 11, y: 1 },
          { set: 'danteLeft' },
        ],
      },
    },
    {
      id: 'nina', name: 'Dra. Nina', x: 7, y: 27, dir: 'right', pal: PAL.residente2,
      trainer: {
        name: 'Médica de Família Nina', case: 'tep', money: 350, range: 3,
        intro: ['Medicina de família também pega casos graves! Olha esse.'],
        lose: ['Nina: Excelente raciocínio clínico.'], after: ['Viagem longa + estrogênio + panturrilha inchada. Pense em TEP!'],
      },
    },
    {
      id: 'jorge', name: 'Alpinista Jorge', x: 14, y: 9, dir: 'left', pal: PAL.morador,
      trainer: {
        name: 'Alpinista Jorge', case: 'avc', money: 300, range: 4,
        intro: ['Ei, doutor(a)! Minha tia passou mal lá em cima. Ajuda?'],
        lose: ['Jorge: Ela já mexe a mão! Obrigado!'], after: ['Glicemia e TC antes da trombólise. Gravei isso.'],
      },
    },
  ],
};

// ======================= SERRA ALTA =======================
MAPS.serra = {
  music: 'cidade',
  rows: [
    '############################',
    '#MMM......RRRRRRRR......MMM#',
    '#MMM......RRRRRRRR......MMM#',
    '#MMM......RRRRRRRR......MMM#',
    '#.........HHHDHHHH.........#',
    '#............==............#',
    '#....,,,.....==.....,,,....#',
    '#............==............#',
    '#............==............#',
    '#.RRRRR......==....GGGGGG..#',
    '#.RRRRR......==....GGGGGG..#',
    '#.HHDHH......==....LLdLLL..#',
    '#...=........==......=.....#',
    '#...=........==......=.....#',
    '#..======================..#',
    '#..======================..#',
    '#............==............#',
    '#..rrrr......==.....rrrr...#',
    '#..rrrr......==.....rrrr...#',
    '#..hhoh..,,..==.,,..hhoh...#',
    '#............==............#',
    '#############==#############',
  ],
  warps: [
    { x: 13, y: 21, w: 2, to: 'rota3', tx: 9, ty: 1, dir: 'down' },
    { x: 13, y: 4, to: 'central', tx: 5, ty: 16, dir: 'up' },
    { x: 4, y: 11, to: 'posto', tx: 6, ty: 8, dir: 'up' },
    { x: 21, y: 11, to: 'gym_endo', tx: 6, ty: 10, dir: 'up' },
  ],
  triggers: [
    { x: 13, y: 7, w: 2, if: ['badges:3', '!beat:vito'], do: [{ challenge: 'vito' }] },
    {
      x: 13, y: 5, w: 2, if: '!badges:3',
      do: [
        { face: 'seguranca', dir: 'player' },
        { say: [['Segurança', 'Opa! Só residentes com os 3 SELOS podem prestar a Banca do Hospital Central.']] },
        { pushBack: true },
      ],
    },
  ],
  npcs: [
    { id: 'placa-serra', kind: 'sign', x: 16, y: 16, dialogue: [{ say: ['SERRA ALTA', 'Hospital Central · Centro de Endocrinologia'] }] },
    {
      id: 'seguranca', name: 'Segurança', x: 12, y: 5, dir: 'right', pal: PAL.guarda, still: true,
      dialogue: [
        { if: 'badges:3', speaker: 'Segurança', say: ['Com os 3 selos, a Banca te espera lá dentro. Boa sorte!'] },
        { speaker: 'Segurança', say: ['A Banca só recebe quem tem os 3 SELOS. O Centro de Endocrinologia fica à direita.'] },
      ],
    },
    {
      id: 'vito', name: 'Mestre Vito', x: 15, y: 7, dir: 'left', pal: PAL.vito, showIf: '!vitoLeft',
      trainer: {
        name: 'Mestre Vito, líder da Cura Milagrosa', case: 'organofosforado', money: 1200, range: 0, hard: 1.1, music: 'vilao',
        intro: [
          'Ora, ora. O residente que destruiu meus negócios.',
          'Meu "Adubo Natural Milagroso" faz a lavoura crescer que é uma beleza... e o agricultor só ficou um pouco enjoado.',
          'Vamos ver se a sua medicina de verdade é tão boa assim!',
        ],
        lose: ['Vito: Atropina até secar o pulmão... impossível!'],
        win: [
          { say: [['Mestre Vito', 'Grr... A Vigilância Sanitária está chegando! Retirada!']] },
          { goto: 'vito', x: 26, y: 7 },
          { set: 'vitoLeft' },
          { say: [['', 'O Grupo Cura Milagrosa foi desfeito, e os produtos falsos foram recolhidos.']] },
          { money: 500 },
        ],
      },
    },
    {
      id: 'lucas', name: 'Lucas', sprite: 'cad', x: 8, y: 13, bubble: '!helped:lucas',
      dialogue: patientQuest('cad', 'helped:lucas',
        ['Lucas está sentado no chão, respirando fundo e rápido.', ['Lucas', 'Tô com uma sede absurda... e vomitei duas vezes...']],
        ['Agora eu sei: tenho diabetes tipo 1. Já aprendi a contar carboidratos!'],
        [{ say: [['Lucas', 'Valeu demais! Toma, é pra você.']] }, { give: 'teleconsulta' }]),
    },
    {
      id: 'paulo', name: 'Paulo', sprite: 'apendicite', x: 19, y: 16, bubble: '!helped:paulo',
      dialogue: patientQuest('apendicite', 'helped:paulo',
        ['Paulo está curvado, segurando a barriga.', ['Paulo', 'Ai... dói até pra andar, doutor(a).']],
        ['Recuperação rapidinha com a videolaparoscopia! Só três furinhos.'],
        [{ say: [['Paulo', 'Obrigado! Leve isso para a sua equipe.']] }, { give: 'lanche', qty: 2 }]),
    },
  ],
};

MAPS.gym_endo = {
  music: 'ginasio',
  rows: [
    'wwwwwwwwwwwwww',
    'wBBB______BBBw',
    'w____________w',
    'w_T__TTTT__T_w',
    'w____________w',
    'wwww______wwww',
    'w____________w',
    'w_E__E__E__E_w',
    'w____________w',
    'w____________w',
    'w____________w',
    'wwwwwwXwwwwwww',
  ],
  warps: [{ x: 6, y: 11, to: '__back' }],
  npcs: [
    {
      id: 'recepcao-endo', name: 'Recepção', x: 9, y: 9, pal: PAL.residente2,
      dialogue: [{ speaker: 'Recepção', say: ['Centro de Endocrinologia. A Dra. Celeste é famosa pela cetoacidose.', 'Lembre a ordem: volume, potássio, insulina!'] }],
    },
    {
      id: 'katia', name: 'Residente Kátia', x: 10, y: 6, dir: 'left', pal: PAL.residente2,
      trainer: {
        name: 'Residente Kátia', case: 'hipo', money: 350, range: 5,
        intro: ['Antes da Dra. Celeste, um caso clássico de enfermaria!'],
        lose: ['Kátia: Glicose 50% na veia, perfeito.'], after: ['Sulfonilureia: observe por mais tempo!'],
      },
    },
    {
      id: 'celeste', name: 'Dra. Celeste', x: 6, y: 2, pal: PAL.celeste,
      trainer: {
        name: 'Dra. Celeste, chefe da Endocrinologia', case: 'cad', money: 1200, range: 0, hard: 1.15, music: 'rival',
        intro: ['Endocrinologia é paciência e precisão.', 'Volume, potássio, insulina. Nessa ordem. Mostre que você sabe!'],
        lose: ['Celeste: Impecável. A ordem importa.'],
        win: [
          { say: [['Dra. Celeste', 'O SELO DA ENDOCRINOLOGIA! Agora você tem os três.'], ['Dra. Celeste', 'O Hospital Central fica ao norte. Mas cuidado: o tal Mestre Vito anda rondando por lá.']] },
          { badge: 'endo' },
          { give: 'teleconsulta', qty: 2 },
        ],
        after: ['Bicarbonato só com pH < 6,9!'],
      },
    },
  ],
};

// ======================= HOSPITAL CENTRAL — A BANCA =======================
MAPS.central = {
  music: 'ginasio',
  rows: [
    'wwwwwwwwwwww',
    'wBB______BBw',
    'w__________w',
    'w__________w',
    'wwww____wwww',
    'w__________w',
    'w_E______E_w',
    'w__________w',
    'wwww____wwww',
    'w__________w',
    'w_T______T_w',
    'w__________w',
    'wwww____wwww',
    'w__________w',
    'w_E______E_w',
    'w__________w',
    'w__________w',
    'wwwwwXwwwwww',
  ],
  warps: [{ x: 5, y: 17, to: '__back' }],
  onEnter: [{
    if: '!bancaIntro',
    do: [{ say: [['', 'A BANCA DO HOSPITAL CENTRAL.'], ['', 'Três examinadores, um caso cada. E, no fim, o último desafio.']] }, { set: 'bancaIntro' }],
  }],
  triggers: [
    { x: 4, y: 13, w: 4, if: '!beat:yara', do: [{ challenge: 'yara' }] },
    { x: 4, y: 9, w: 4, if: '!beat:bento', do: [{ challenge: 'bento' }] },
    { x: 4, y: 5, w: 4, if: '!beat:ramos', do: [{ challenge: 'ramos' }] },
    { x: 1, y: 2, w: 10, if: ['beat:ramos', '!beat:caiofinal'], do: [{ challenge: 'caiofinal' }] },
  ],
  npcs: [
    {
      id: 'yara', name: 'Dra. Yara', x: 5, y: 11, dir: 'down', pal: PAL.examinadora,
      trainer: {
        name: 'Examinadora Dra. Yara', case: 'avc', money: 800, range: 0, hard: 1.15,
        intro: ['Bem-vindo(a) à Banca. Sou a primeira examinadora.', 'Neurologia: tempo é cérebro. Comece!'],
        lose: ['Yara: Aprovado(a) na primeira etapa.'], after: ['Siga em frente. Os próximos não serão mais fáceis.'],
      },
    },
    {
      id: 'bento', name: 'Dr. Bento', x: 6, y: 7, dir: 'down', pal: PAL.examinador,
      trainer: {
        name: 'Examinador Dr. Bento', case: 'tep', money: 900, range: 0, hard: 1.15,
        intro: ['Segunda etapa. Pneumologia.', 'Probabilidade pré-teste é tudo. Vamos ver o seu raciocínio.'],
        lose: ['Bento: Estratificação perfeita.'], after: ['Falta pouco.'],
      },
    },
    {
      id: 'ramos', name: 'Dr. Ramos', x: 5, y: 3, dir: 'down', pal: PAL.examinador,
      trainer: {
        name: 'Examinador Dr. Ramos', case: 'eap', money: 1000, range: 0, hard: 1.2,
        intro: ['Última etapa da Banca. Emergência cardiovascular.', 'Sem hesitar!'],
        lose: ['Ramos: Aprovado(a). Mas ainda falta alguém...'], after: ['O último desafio te espera.'],
      },
    },
    {
      id: 'caiofinal', name: 'Caio', x: 6, y: 1, dir: 'down', pal: PAL.caio,
      trainer: {
        name: 'Rival Caio', case: 'sepse', money: 2000, range: 0, hard: 1.2, music: 'rival', xp: 300,
        intro: ['Demorou, hein, {name}?', 'Passei pela Banca antes de você. O último desafio sou EU.', 'Sem segurar nada agora. Último caso!'],
        lose: ['Caio: ...Você venceu. De verdade.'],
        win: [
          { say: [['Caio', 'Você é o(a) melhor residente que eu conheço. Não conta pra ninguém que eu disse isso.']] },
          { wait: 20 },
          { set: 'helioCentral' },
          { say: [['Dr. Hélio', '{name}!']] },
          { approach: 'helio2' },
          { say: [
            ['Dr. Hélio', 'Eu vi tudo. Que orgulho!'],
            ['Dr. Hélio', 'A Banca aprova você: a partir de hoje, ESPECIALISTA {name}!'],
            ['Dr. Hélio', 'Mas lembre: a medicina muda todo dia. O estudo nunca termina.'],
          ] },
          { set: 'champion' },
          { credits: true },
          { say: [['', 'Obrigado por jogar! O vale continua aberto: casos no mato alto, livros na biblioteca... e talvez alguém na clínica do Dr. Hélio queira entrar na sua equipe.']] },
        ],
        after: ['Na próxima eu ganho. Sério.'],
      },
    },
    { id: 'helio2', name: 'Dr. Hélio', sprite: 'mentor', x: 5, y: 16, dir: 'up', showIf: 'helioCentral', still: true,
      dialogue: [{ speaker: 'Dr. Hélio', say: ['Especialista {name}! Vamos comemorar com um café na clínica.'] }] },
  ],
};
