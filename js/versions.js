'use strict';
// Variações de um mesmo caso (campo "versions" em content/cases.js).
// A 1ª vez que o jogador atende um caso é sempre a versão clássica; depois, sorteia sem repetir a última.
const VERSION_LISTS = ['anamnese', 'fisico', 'exames', 'dx', 'conduta'];
const VERSION_FIELDS = ['name', 'age', 'intro', 'encounter', 'stability', 'decay', 'par', 'vitals', 'required', 'events'];
const versionCache = {};

const itemKey = o => o.q || o.name;

// Monta o caso com a versão aplicada (sem alterar o original)
function caseVersion(c, vid) {
  const v = vid && (c.versions || []).find(x => x.id === vid);
  if (!v) return c;
  const ck = `${c.id}~${v.id}`;
  if (versionCache[ck]) return versionCache[ck];
  const out = { ...c, version: v.id, versionNote: v.note };
  for (const k of VERSION_LISTS) out[k] = c[k].slice();
  for (const key of v.remove || []) {
    let found = false;
    for (const k of VERSION_LISTS) {
      const n = out[k].length;
      out[k] = out[k].filter(o => itemKey(o) !== key);
      found = found || out[k].length < n;
    }
    if (!found) console.warn(`[versão ${ck}] remove: "${key}" não existe no caso`);
  }
  for (const [key, patch] of Object.entries(v.change || {})) {
    const k = VERSION_LISTS.find(l => out[l].some(o => itemKey(o) === key));
    if (!k) { console.warn(`[versão ${ck}] change: "${key}" não existe no caso`); continue; }
    out[k] = out[k].map(o => (itemKey(o) === key ? { ...o, ...patch } : o));
  }
  for (const [k, items] of Object.entries(v.add || {})) out[k] = [...out[k], ...items];
  for (const f of VERSION_FIELDS) if (f in v) out[f] = v[f];
  out.teaching = [...(v.note ? [`Nesta versão: ${v.note}`] : []), ...c.teaching, ...(v.teaching || [])];
  if (out.dx.filter(d => d.ok).length !== 1) console.warn(`[versão ${ck}] precisa ter exatamente 1 diagnóstico com ok: true`);
  return (versionCache[ck] = out);
}

// Escolhe a versão para este atendimento
function pickVersion(c) {
  const s = Game.save;
  if (!c.versions || !c.versions.length || !s.seen.includes(c.id)) return c;
  s.lastVersion = s.lastVersion || {};
  const ids = ['classica', ...c.versions.map(v => v.id)].filter(id => id !== (s.lastVersion[c.id] || 'classica'));
  const pick = ids[Math.floor(Math.random() * ids.length)];
  s.lastVersion[c.id] = pick;
  return pick === 'classica' ? c : caseVersion(c, pick);
}

// Registra a versão atendida (libera os cards dela)
function markVersionSeen(c) {
  if (!c.version) return;
  const s = Game.save, key = `${c.id}~${c.version}`;
  s.seenVersions = s.seenVersions || [];
  if (!s.seenVersions.includes(key)) s.seenVersions.push(key);
}
