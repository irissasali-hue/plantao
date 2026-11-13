'use strict';
// Estado do jogador em Game.save: equipe, mochila, dinheiro e selos.
const MEMBER_XP_PER_LEVEL = 100;

function memberLevel(m) {
  return 1 + Math.floor(m.xp / MEMBER_XP_PER_LEVEL);
}

// +1 uso a cada 2 níveis
function memberMaxUses(m) {
  return TEAM[m.id].uses + Math.floor((memberLevel(m) - 1) / 2);
}

function joinTeam(id) {
  if (Game.save.team.some(m => m.id === id)) return;
  Game.save.team.push({ id, xp: 0, uses: TEAM[id].uses });
}

function healTeam() {
  for (const m of Game.save.team) m.uses = memberMaxUses(m);
}

function teamGainXp(amount) {
  const msgs = [];
  for (const m of Game.save.team) {
    const before = memberLevel(m);
    m.xp += amount;
    if (memberLevel(m) > before) msgs.push(`${TEAM[m.id].name} subiu para o nível ${memberLevel(m)}!`);
  }
  return msgs;
}

function itemCount(id) {
  return Game.save.bag[id] || 0;
}

function addItem(id, n = 1) {
  const left = itemCount(id) + n;
  if (left > 0) Game.save.bag[id] = left;
  else delete Game.save.bag[id];
}
