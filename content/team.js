'use strict';
/* =====================================================================
   EQUIPE, ITENS, LOJA E SELOS

   EQUIPE — profissionais que entram para o seu time ao longo da história
   (comando { join: 'id' } nos roteiros de content/world.js e content/maps.js).
     name, role       nome e profissão
     pal              cores do sprite (ou PNG em content/art.js → chars, pela mesma chave)
     ability          tipo de efeito na batalha (o motor conhece estes):
                        'monitor'     +estabilidade e o paciente piora mais devagar
                        'checagem'    intercepta a próxima conduta errada (sem dano, sem turno)
                        'suporte'     +estabilidade
                        'expresso'    o próximo exame não gasta turno
                        'acolhimento' as próximas perguntas de anamnese não gastam turno
     power            intensidade do efeito (estabilidade ganha / nº de ações grátis)
     abilityName, desc, line   nome, descrição e fala ao usar
     uses             usos por descanso (recuperados no Posto); +1 a cada 2 níveis

   ITENS — preço em R$; "battle: true" pode ser usado no atendimento,
   "world: true" pode ser usado fora dele (menu C → MOCHILA).
   ===================================================================== */
const TEAM = {
  bia: {
    name: 'Enf. Bia', role: 'Enfermagem', ability: 'monitor', power: 10, uses: 2,
    abilityName: 'Monitorização', desc: '+10 de estabilidade, e o paciente passa a piorar mais devagar.',
    line: 'Monitor, acesso venoso e sinais vitais a cada 5 minutos. Deixa comigo!',
    pal: { h: '#3a2418', s: '#c88e64', w: '#f8f8f8', b: '#58b8b0', r: '#58b8b0', k: '#f8f8f8', long: true },
  },
  davi: {
    name: 'Farm. Davi', role: 'Farmácia clínica', ability: 'checagem', power: 1, uses: 1,
    abilityName: 'Dupla checagem', desc: 'Na próxima conduta errada, Davi intercepta: sem dano e sem gastar turno.',
    line: 'Antes de administrar qualquer coisa, eu confiro dose, via e indicação.',
    pal: { h: '#1a1a20', s: '#e8b890', w: '#f8f8f8', b: '#e0a030', r: '#e0a030', k: '#384058' },
  },
  lia: {
    name: 'Fisio Lia', role: 'Fisioterapia', ability: 'suporte', power: 15, uses: 2,
    abilityName: 'Suporte ventilatório', desc: '+15 de estabilidade (posicionamento e suporte respiratório).',
    line: 'Vamos posicionar e ajustar o suporte ventilatório!',
    pal: { h: '#c05a28', s: '#f2c8a0', w: '#f8f8f8', b: '#7a58c8', r: '#7a58c8', k: '#7a58c8', long: true },
  },
  nando: {
    name: 'Téc. Nando', role: 'Radiologia', ability: 'expresso', power: 1, uses: 2,
    abilityName: 'Exame expresso', desc: 'O próximo exame não gasta turno.',
    line: 'Abre caminho que o exame sai agora!',
    pal: { h: '#2a1a10', s: '#8a5a3a', w: '#3a6ab0', b: '#2a4a88', r: '#3a6ab0', k: '#283040' },
  },
  ana: {
    name: 'Psic. Ana', role: 'Psicologia', ability: 'acolhimento', power: 2, uses: 2,
    abilityName: 'Acolhimento', desc: 'As próximas 2 perguntas de anamnese não gastam turno.',
    line: 'Fica tranquilo, a gente está aqui com você. Me conta o que aconteceu?',
    pal: { h: '#6a3a6a', s: '#f0c8a8', w: '#e8a0b8', b: '#c87898', r: '#e8a0b8', k: '#4a4a5a', long: true },
  },
};

const ITEMS = {
  cafe: { name: 'Café', price: 50, battle: true, desc: 'A próxima ação no atendimento não gasta turno.' },
  manual: { name: 'Manual de bolso', price: 120, battle: true, desc: 'Descarta uma hipótese errada da lista de diagnósticos.' },
  lanche: { name: 'Lanche', price: 80, battle: true, world: true, desc: 'Recupera 1 uso de habilidade de toda a equipe.' },
  teleconsulta: { name: 'Teleconsulta', price: 250, battle: true, desc: 'Um preceptor dá uma dica sobre o próximo passo.' },
};

// Itens à venda na farmácia/cantina dos Postos
const SHOP = ['cafe', 'manual', 'lanche', 'teleconsulta'];

const BADGES = {
  emergencia: { name: 'Selo da Emergência', color: '#e05050' },
  cardio: { name: 'Selo da Cardiologia', color: '#e070a0' },
  endo: { name: 'Selo da Endocrinologia', color: '#50b0e0' },
};

// Recursos com que o jogo começa
const NEW_GAME = { money: 300, bag: { cafe: 2 } };
