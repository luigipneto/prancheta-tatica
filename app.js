'use strict';
/* =========================================================
   Prancheta Tática — app estático, dados salvos no navegador
   ========================================================= */

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const ICON = {
  plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  copy: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  down: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  up: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
};

/* ---------- posições ---------- */
const POS_ORDER = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA'];
const POS = {
  GOL: { nome: 'Goleiro', grupo: 'Goleiros' },
  LD: { nome: 'Lateral-direito', grupo: 'Laterais-direitos' },
  ZAG: { nome: 'Zagueiro', grupo: 'Zagueiros' },
  LE: { nome: 'Lateral-esquerdo', grupo: 'Laterais-esquerdos' },
  VOL: { nome: 'Volante', grupo: 'Volantes' },
  MEI: { nome: 'Meia', grupo: 'Meias' },
  PON: { nome: 'Ponta', grupo: 'Pontas' },
  ATA: { nome: 'Atacante', grupo: 'Atacantes' },
};
// Posições "parecidas": quem joga nelas aparece como 2ª opção no seletor
const SIMILAR = {
  GOL: [],
  LD: ['LE', 'ZAG', 'PON'],
  LE: ['LD', 'ZAG', 'PON'],
  ZAG: ['VOL', 'LD', 'LE'],
  VOL: ['MEI', 'ZAG'],
  MEI: ['VOL', 'PON', 'ATA'],
  PON: ['MEI', 'ATA', 'LD', 'LE'],
  ATA: ['PON', 'MEI'],
};
const POS_ALIASES = {
  goleiro: 'GOL', gol: 'GOL', gk: 'GOL', arqueiro: 'GOL', g: 'GOL',
  'lateral direito': 'LD', 'lateral-direito': 'LD', ld: 'LD', rb: 'LD', 'ala direito': 'LD',
  zagueiro: 'ZAG', zag: 'ZAG', cb: 'ZAG', defensor: 'ZAG', beque: 'ZAG',
  'lateral esquerdo': 'LE', 'lateral-esquerdo': 'LE', le: 'LE', lb: 'LE', 'ala esquerdo': 'LE',
  volante: 'VOL', vol: 'VOL', cdm: 'VOL', dm: 'VOL', primeiro: 'VOL',
  meia: 'MEI', mei: 'MEI', meio: 'MEI', 'meio-campo': 'MEI', 'meio campo': 'MEI', cm: 'MEI', cam: 'MEI', am: 'MEI', armador: 'MEI',
  ponta: 'PON', pon: 'PON', extremo: 'PON', winger: 'PON', pd: 'PON', pe: 'PON', lw: 'PON', rw: 'PON', 'ponta direita': 'PON', 'ponta esquerda': 'PON',
  atacante: 'ATA', centroavante: 'ATA', ata: 'ATA', ca: 'ATA', st: 'ATA', cf: 'ATA', 'centro-avante': 'ATA',
};
function parsePos(s) {
  const n = norm(s).replace(/_/g, ' ');
  if (!n) return null;
  return POS_ALIASES[n] || POS_ALIASES[n.replace(/s$/, '')] || POS_ALIASES[n.replace(/es$/, '')] || null;
}

/* ---------- formações (x: 0 esquerda → 100 direita; y: 0 ataque → 100 próprio gol) ---------- */
const BACK4 = [['LD', 84, 72], ['ZAG', 62, 78], ['ZAG', 38, 78], ['LE', 16, 72]];
const BACK3 = [['ZAG', 72, 76], ['ZAG', 50, 79], ['ZAG', 28, 76]];
const GK = [['GOL', 50, 92]];
const FORMATIONS = {
  '4-3-3': [...GK, ...BACK4, ['VOL', 50, 60], ['MEI', 68, 47], ['MEI', 32, 47], ['PON', 82, 24], ['ATA', 50, 17], ['PON', 18, 24]],
  '4-2-3-1': [...GK, ...BACK4, ['VOL', 62, 60], ['VOL', 38, 60], ['PON', 82, 36], ['MEI', 50, 39], ['PON', 18, 36], ['ATA', 50, 16]],
  '4-4-2': [...GK, ...BACK4, ['VOL', 62, 55], ['VOL', 38, 55], ['PON', 86, 44], ['PON', 14, 44], ['ATA', 61, 20], ['ATA', 39, 20]],
  '4-1-4-1': [...GK, ...BACK4, ['VOL', 50, 62], ['PON', 85, 42], ['MEI', 62, 46], ['MEI', 38, 46], ['PON', 15, 42], ['ATA', 50, 17]],
  '4-3-1-2': [...GK, ...BACK4, ['VOL', 50, 62], ['MEI', 70, 51], ['MEI', 30, 51], ['MEI', 50, 36], ['ATA', 61, 17], ['ATA', 39, 17]],
  '4-5-1': [...GK, ...BACK4, ['VOL', 50, 60], ['PON', 85, 44], ['MEI', 66, 48], ['MEI', 34, 48], ['PON', 15, 44], ['ATA', 50, 18]],
  '3-5-2': [...GK, ...BACK3, ['LD', 88, 50], ['VOL', 50, 60], ['MEI', 66, 46], ['MEI', 34, 46], ['LE', 12, 50], ['ATA', 61, 18], ['ATA', 39, 18]],
  '3-4-3': [...GK, ...BACK3, ['LD', 86, 52], ['VOL', 60, 56], ['VOL', 40, 56], ['LE', 14, 52], ['PON', 80, 24], ['ATA', 50, 17], ['PON', 20, 24]],
  '5-3-2': [...GK, ['LD', 88, 64], ['ZAG', 70, 77], ['ZAG', 50, 80], ['ZAG', 30, 77], ['LE', 12, 64], ['VOL', 50, 56], ['MEI', 70, 45], ['MEI', 30, 45], ['ATA', 61, 19], ['ATA', 39, 19]],
  '5-4-1': [...GK, ['LD', 88, 64], ['ZAG', 70, 77], ['ZAG', 50, 80], ['ZAG', 30, 77], ['LE', 12, 64], ['PON', 82, 45], ['VOL', 60, 52], ['VOL', 40, 52], ['PON', 18, 45], ['ATA', 50, 19]],
};

/* ---------- países (código ISO usado pela biblioteca de bandeiras) ---------- */
const COUNTRIES = {
  br: 'Brasil', ar: 'Argentina', uy: 'Uruguai', py: 'Paraguai', cl: 'Chile', co: 'Colômbia', pe: 'Peru', ec: 'Equador',
  ve: 'Venezuela', bo: 'Bolívia', mx: 'México', us: 'Estados Unidos', ca: 'Canadá', cr: 'Costa Rica', pa: 'Panamá',
  hn: 'Honduras', jm: 'Jamaica', ht: 'Haiti', pt: 'Portugal', es: 'Espanha', fr: 'França', de: 'Alemanha', it: 'Itália',
  'gb-eng': 'Inglaterra', 'gb-sct': 'Escócia', 'gb-wls': 'País de Gales', ie: 'Irlanda', nl: 'Holanda', be: 'Bélgica',
  ch: 'Suíça', at: 'Áustria', hr: 'Croácia', rs: 'Sérvia', pl: 'Polônia', cz: 'Tchéquia', dk: 'Dinamarca', se: 'Suécia',
  no: 'Noruega', ua: 'Ucrânia', ru: 'Rússia', tr: 'Turquia', gr: 'Grécia', ro: 'Romênia', ma: 'Marrocos', sn: 'Senegal',
  ng: 'Nigéria', gh: 'Gana', ci: 'Costa do Marfim', cm: 'Camarões', eg: 'Egito', dz: 'Argélia', tn: 'Tunísia', ao: 'Angola',
  mz: 'Moçambique', cv: 'Cabo Verde', cd: 'RD Congo', za: 'África do Sul', jp: 'Japão', kr: 'Coreia do Sul', cn: 'China',
  au: 'Austrália', sa: 'Arábia Saudita', qa: 'Catar', ir: 'Irã',
};
const COUNTRY_ALIASES = {
  brazil: 'br', 'paises baixos': 'nl', netherlands: 'nl', england: 'gb-eng', spain: 'es', germany: 'de', italy: 'it',
  france: 'fr', uruguay: 'uy', paraguay: 'py', colombia: 'co', ecuador: 'ec', 'estados unidos da america': 'us', eua: 'us', usa: 'us',
  'republica tcheca': 'cz', 'coreia': 'kr', scotland: 'gb-sct', wales: 'gb-wls', mexico: 'mx', 'reino unido': 'gb-eng',
};
function parseCountry(s) {
  const n = norm(s);
  if (!n) return '';
  if (COUNTRIES[n]) return n;
  for (const [code, name] of Object.entries(COUNTRIES)) if (norm(name) === n) return code;
  return COUNTRY_ALIASES[n] || '';
}
const countryName = c => COUNTRIES[c] || '';

const FOOT = { D: 'Destro', E: 'Canhoto', A: 'Ambidestro' };
function parseFoot(s) {
  const n = norm(s);
  if (!n) return '';
  if (/^(d|destro|direito|right|r)$/.test(n)) return 'D';
  if (/^(e|canhoto|esquerdo|left|l)$/.test(n)) return 'E';
  if (/^(a|ambidestro|ambos|both)$/.test(n)) return 'A';
  return '';
}
function ageOf(birth) {
  if (!birth) return null;
  const s = String(birth).trim();
  let y, m = 0, d = 1;
  let mt;
  if ((mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) [y, m, d] = [+mt[1], +mt[2] - 1, +mt[3]];
  else if ((mt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) [y, m, d] = [+mt[3], +mt[2] - 1, +mt[1]];
  else if ((mt = s.match(/^(\d{4})$/))) y = +mt[1];
  else return null;
  const now = new Date();
  let a = now.getFullYear() - y;
  if (mt[0].length > 4 && (now.getMonth() < m || (now.getMonth() === m && now.getDate() < d))) a--;
  return a > 0 && a < 60 ? a : null;
}

/* ---------- estado ---------- */
const KEY = 'prancheta.v1';
const TEAM_LABELS = ['Titular', 'Reserva', '3º time'];
const TEAM_SHORT = ['titular', 'reserva', '3º time'];
const DEFAULT_SETTINGS = { display: 'photo', shirt: '#1e4fd8', shirtNum: '#ffffff', gkShirt: '#f2c14e', showNames: true, title: 'Cruzeiro' };
const SEED = [
  ['Gerson', 'VOL'], ['Lucas Romero', 'VOL'], ['Matheus Henrique', 'VOL'], ['Lucas Silva', 'VOL'], ['Zé Lucas', 'VOL'],
  ['Fabrizio Peralta', 'VOL'], ['Matheus Pereira', 'MEI'], ['Bruno Rodrigues', 'MEI'], ['Murilo', 'ZAG'],
];

/* ---------- fases: padrão / atacando / defendendo (mesmos jogadores, posições diferentes) ---------- */
const PHASES = [['p', 'Padrão'], ['a', 'Atacando'], ['d', 'Defendendo']];
const phaseLabel = ph => (PHASES.find(x => x[0] === ph) || PHASES[0])[1];
// Posição sugerida para atacando/defendendo, calculada a partir do padrão até o usuário arrastar
function derivedPos(s, ph) {
  const { x, y } = s;
  if (ph === 'p') return { x, y };
  if (s.code === 'GOL') return { x, y: ph === 'a' ? 86 : y };
  if (ph === 'a') {
    let ny = y * 0.8 - 4, nx = x;
    if (s.code === 'LD' || s.code === 'LE') { ny -= 12; nx = 50 + (x - 50) * 1.08; }
    return { x: +clamp(nx, 5, 95).toFixed(2), y: +clamp(ny, 8, 95).toFixed(2) };
  }
  // bloco compacto: atacantes ~40, zagueiros ~80
  return { x: +(50 + (x - 50) * 0.85).toFixed(2), y: +clamp(40 + (y - 17) * (40 / 61), 8, 84).toFixed(2) };
}
function posOf(s, ph = S.phase) {
  if (ph === 'a' && s.atk) return s.atk;
  if (ph === 'd' && s.def) return s.def;
  return derivedPos(s, ph);
}
function setPos(s, ph, x, y) {
  if (ph === 'a') s.atk = { x, y };
  else if (ph === 'd') s.def = { x, y };
  else { s.x = x; s.y = y; }
}

function slotsFor(f) { return FORMATIONS[f].map(([code, x, y]) => ({ code, x, y, playerId: null })); }
function newTeam(f = '4-3-3') { return { formation: f, slots: slotsFor(f) }; }
function newLineup(name) { return { id: uid(), name, teams: [newTeam(), newTeam(), newTeam()] }; }
function newPlayer(o = {}) {
  // external = possível contratação (não é do elenco)
  return { id: uid(), name: '', pos: 'VOL', sec: [], club: '', country: '', number: '', foot: '', birth: '', photo: null, external: false, ...o };
}
function defaultState() {
  const l = newLineup('Minha escalação');
  return {
    version: 1, players: SEED.map(([name, pos]) => newPlayer({ name, pos })), clubs: {},
    lineups: [l], currentLineupId: l.id, teamIdx: 0, phase: 'p', view: 'lineup', settings: { ...DEFAULT_SETTINGS },
  };
}
function sanitize(s) {
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.lineups) || !s.lineups.length) throw new Error('formato inválido');
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  s.clubs = s.clubs || {};
  s.players = s.players.map(p => newPlayer({ ...p, sec: Array.isArray(p.sec) ? p.sec : [] }));
  if (!s.lineups.find(l => l.id === s.currentLineupId)) s.currentLineupId = s.lineups[0].id;
  s.teamIdx = clamp(+s.teamIdx || 0, 0, 2);
  s.phase = ['p', 'a', 'd'].includes(s.phase) ? s.phase : 'p';
  s.view = s.view === 'squad' ? 'squad' : 'lineup';
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch (e) { console.warn(e); }
  return defaultState();
}
let S = load();
// Primeira visita (nada salvo neste navegador): usa o elenco publicado junto com o site, se existir
function loadPublished() {
  let fresh = true;
  try { fresh = !localStorage.getItem(KEY); } catch (e) { /* sem acesso ao armazenamento */ }
  if (!fresh || location.protocol === 'file:') return;
  fetch('dados.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(obj => { if (!obj) return; S = sanitize(obj.state || obj); save(); render(); })
    .catch(() => {});
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Não consegui salvar no navegador (espaço cheio?). Faça um backup.'); }
}

const curLineup = () => S.lineups.find(l => l.id === S.currentLineupId) || S.lineups[0];
const curTeam = () => curLineup().teams[S.teamIdx];
const playerById = id => (id ? S.players.find(p => p.id === id) : null);

/* ---------- pedaços de HTML ---------- */
const SHIRT_PATH = 'M30 8 L42 4 Q50 13 58 4 L70 8 L94 24 L84 42 L74 36 L74 94 L26 94 L26 36 L16 42 L6 24 Z';
function shirtSVG(num, gk) {
  const st = S.settings;
  return `<svg viewBox="0 0 100 100"><path d="${SHIRT_PATH}" fill="${gk ? st.gkShirt : st.shirt}" stroke="rgba(0,0,0,.35)" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<text x="50" y="68" text-anchor="middle" font-size="30" font-weight="800" font-family="Segoe UI, sans-serif" fill="${st.shirtNum}">${esc(num)}</text></svg>`;
}
// forcePhoto: listas mostram foto sempre que existir; no campo, depende do modo "Foto/Camisa"
function avatarHTML(p, cls, forcePhoto) {
  const gk = p.pos === 'GOL';
  if (p.photo && (forcePhoto || S.settings.display === 'photo')) return `<span class="${cls} photo"><img src="${p.photo}" alt=""></span>`;
  return `<span class="${cls} shirt">${shirtSVG(p.number, gk)}</span>`;
}
const flagHTML = c => (c ? `<span class="meta-item"><span class="fi fi-${c}"></span>${esc(countryName(c))}</span>` : '');
function clubHTML(club) {
  if (!club) return '';
  const crest = S.clubs[club];
  return `<span class="meta-item">${crest ? `<img class="crest" src="${crest}" alt="">` : ''}${esc(club)}</span>`;
}
const posTag = code => (POS[code] ? `<span class="tag">${POS[code].grupo}</span>` : '');

const PITCH_SVG = `<svg class="lines" viewBox="0 0 72 100" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.6">
  <g vector-effect="non-scaling-stroke">
  <rect x="2" y="2" width="68" height="96" vector-effect="non-scaling-stroke"/>
  <line x1="2" y1="50" x2="70" y2="50" vector-effect="non-scaling-stroke"/>
  <circle cx="36" cy="50" r="9" vector-effect="non-scaling-stroke"/>
  <rect x="15.85" y="2" width="40.3" height="15.1" vector-effect="non-scaling-stroke"/>
  <rect x="26.85" y="2" width="18.3" height="5" vector-effect="non-scaling-stroke"/>
  <rect x="15.85" y="82.9" width="40.3" height="15.1" vector-effect="non-scaling-stroke"/>
  <rect x="26.85" y="93" width="18.3" height="5" vector-effect="non-scaling-stroke"/>
  <path d="M28.54 17.1 A9 9 0 0 0 43.46 17.1" vector-effect="non-scaling-stroke"/>
  <path d="M28.54 82.9 A9 9 0 0 1 43.46 82.9" vector-effect="non-scaling-stroke"/>
  </g>
  <circle cx="36" cy="50" r=".7" fill="rgba(255,255,255,.8)" stroke="none"/>
  <circle cx="36" cy="12.06" r=".6" fill="rgba(255,255,255,.8)" stroke="none"/>
  <circle cx="36" cy="87.94" r=".6" fill="rgba(255,255,255,.8)" stroke="none"/>
</svg>`;

/* ---------- render ---------- */
function render() {
  renderTopbar();
  if (S.view === 'squad') renderSquad(); else renderLineup();
}

function renderTopbar() {
  const l = curLineup();
  $('#topbar').innerHTML = `
    <div class="brand"><span class="brand-mark"></span><div><b>Prancheta Tática</b><small>${esc(S.settings.title || '')}</small></div></div>
    <div class="lineup-picker">
      <select id="lineup-select" aria-label="Escalação salva">${S.lineups.map(x => `<option value="${x.id}" ${x.id === l.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <button class="icon-btn" data-act="lineup-new" title="Nova escalação">${ICON.plus}</button>
      <button class="icon-btn" data-act="lineup-rename" title="Renomear escalação">${ICON.edit}</button>
      <button class="icon-btn" data-act="lineup-dup" title="Duplicar escalação">${ICON.copy}</button>
      <button class="icon-btn" data-act="lineup-del" title="Excluir escalação">${ICON.trash}</button>
    </div>
    <nav class="seg">
      <button data-view="lineup" class="${S.view !== 'squad' ? 'on' : ''}">Escalação</button>
      <button data-view="squad" class="${S.view === 'squad' ? 'on' : ''}">Elenco</button>
    </nav>
    <div class="top-actions">
      <button class="icon-btn" data-act="backup-export" title="Baixar backup (arquivo)">${ICON.down}</button>
      <button class="icon-btn" data-act="backup-import" title="Restaurar backup">${ICON.up}</button>
    </div>`;
}

function filledCount(ti) { return curLineup().teams[ti].slots.filter(s => s.playerId).length; }

function tokenHTML(s, i) {
  const p = playerById(s.playerId);
  const pos = posOf(s);
  const style = `left:${pos.x}%;top:${pos.y}%`;
  if (!p) return `<button class="token empty" data-idx="${i}" style="${style}" aria-label="Escolher ${POS[s.code].nome}"><span class="disc">+</span><span class="tname">${s.code}</span></button>`;
  return `<button class="token${p.external ? ' ext' : ''}" data-idx="${i}" style="${style}" aria-label="${esc(p.name)}, ${POS[s.code].nome}${p.external ? ', possível contratação' : ''}">${avatarHTML(p, 'disc')}` +
    `${S.settings.showNames ? `<span class="tname">${esc(p.name)}</span>` : ''}</button>`;
}

const hasExternal = t => t.slots.some(s => playerById(s.playerId)?.external);
function pitchInner() {
  const t = curTeam();
  return PITCH_SVG + t.slots.map(tokenHTML).join('') +
    (hasExternal(t) ? '<span class="ext-legend"><i></i>Possível contratação</span>' : '');
}
function renderLineup() {
  const t = curTeam(), st = S.settings;
  $('#app').innerHTML = `
  <section class="lineup-layout">
    <div class="pitch-col">
      <div class="team-tabs" role="tablist">${TEAM_LABELS.map((n, i) => `<button role="tab" data-team="${i}" class="${i === S.teamIdx ? 'on' : ''}" aria-selected="${i === S.teamIdx}"><span class="kbd">${i + 1}</span>${n}<em>${filledCount(i)}/11</em></button>`).join('')}</div>
      <div class="seg phase-tabs" role="tablist" aria-label="Fase">${PHASES.map(([k, n]) => `<button role="tab" data-phase="${k}" class="${S.phase === k ? 'on' : ''}" title="Atalho: tecla ${n[0]}">${n}</button>`).join('')}</div>
      <div class="pitch-wrap"><div class="pitch" id="pitch">${pitchInner()}</div></div>
    </div>
    <aside class="side">
      <div class="card">
        <span class="lbl">Formação</span>
        <div class="row">
          <select id="formation">${Object.keys(FORMATIONS).map(f => `<option ${f === t.formation ? 'selected' : ''}>${f}</option>`).join('')}</select>
          <button class="btn sm" data-act="reset-pos" title="Volta os jogadores para o desenho padrão da formação">Resetar posições</button>
        </div>
        <span class="lbl">Exibir no campo</span>
        <div class="seg"><button data-display="photo" class="${st.display === 'photo' ? 'on' : ''}">Foto</button><button data-display="shirt" class="${st.display === 'shirt' ? 'on' : ''}">Camisa</button></div>
        <div class="colors">
          <label>Camisa <input type="color" data-color="shirt" value="${st.shirt}"></label>
          <label>Número <input type="color" data-color="shirtNum" value="${st.shirtNum}"></label>
          <label>Goleiro <input type="color" data-color="gkShirt" value="${st.gkShirt}"></label>
        </div>
        <label class="chk"><input type="checkbox" id="show-names" ${st.showNames ? 'checked' : ''}> Mostrar nomes</label>
      </div>
      <div class="card">
        <div class="card-h"><b>${TEAM_LABELS[S.teamIdx]}</b><span>${t.formation}</span></div>
        <ol class="xi">${t.slots.map((s, i) => { const p = playerById(s.playerId); return `<li data-pick="${i}"><span class="code">${s.code}</span><span class="${p?.external ? 'ext-name' : ''}">${p ? esc(p.name) : '<i>vazio</i>'}</span></li>`; }).join('')}</ol>
        <button class="btn sm ghost danger" data-act="clear-team">Limpar ${TEAM_LABELS[S.teamIdx].toLowerCase()}</button>
      </div>
      <div class="card">
        <span class="lbl">Título da imagem</span>
        <input id="img-title" value="${esc(st.title)}" placeholder="Ex.: Cruzeiro 2027">
        <button class="btn gold block" data-act="export-png">${ICON.down} Exportar PNG</button>
      </div>
    </aside>
  </section>`;
}

/* ---------- arrastar no campo ---------- */
document.addEventListener('pointerdown', e => {
  const tok = e.target.closest('.pitch .token');
  if (!tok || e.button > 0) return;
  e.preventDefault();
  const pitch = $('#pitch');
  const rect = pitch.getBoundingClientRect();
  const idx = +tok.dataset.idx;
  const slot = curTeam().slots[idx];
  const sx = e.clientX, sy = e.clientY;
  let moved = false;
  tok.setPointerCapture(e.pointerId);
  const move = ev => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
    moved = true;
    const x = +clamp((ev.clientX - rect.left) / rect.width * 100, 4, 96).toFixed(2);
    const y = +clamp((ev.clientY - rect.top) / rect.height * 100, 4, 96).toFixed(2);
    setPos(slot, S.phase, x, y);
    tok.style.left = x + '%';
    tok.style.top = y + '%';
  };
  const end = ev => {
    tok.removeEventListener('pointermove', move);
    tok.removeEventListener('pointerup', end);
    tok.removeEventListener('pointercancel', end);
    if (moved) save();
    else if (ev.type === 'pointerup') openPicker(idx);
  };
  tok.addEventListener('pointermove', move);
  tok.addEventListener('pointerup', end);
  tok.addEventListener('pointercancel', end);
});
// teclado: Enter/Espaço no jogador abre o seletor
document.addEventListener('keydown', e => {
  const tok = e.target.closest && e.target.closest('.pitch .token');
  if (tok && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPicker(+tok.dataset.idx); }
});

function applyFormation(team, f) {
  const pool = team.slots.filter(s => s.playerId).map(s => ({ code: s.code, pid: s.playerId }));
  const slots = slotsFor(f);
  const take = (s, test) => { const i = pool.findIndex(test); if (i >= 0) { s.playerId = pool[i].pid; pool.splice(i, 1); } };
  slots.forEach(s => take(s, p => p.code === s.code));
  slots.forEach(s => { if (!s.playerId) take(s, p => SIMILAR[s.code].includes(p.code)); });
  slots.forEach(s => { if (!s.playerId && s.code !== 'GOL') take(s, p => p.code !== 'GOL'); });
  team.formation = f;
  team.slots = slots;
}

/* ---------- seletor de posição ---------- */
let picker = null; // { idx, selected, q, showAll }
function openPicker(idx) {
  const slot = curTeam().slots[idx];
  picker = { idx, selected: slot.playerId, q: '', showAll: false };
  pushModal(`<div class="modal" id="picker-modal">
    <div class="modal-h"><h2>${POS[slot.code].grupo}</h2><button class="icon-btn" data-act="modal-close" aria-label="Fechar">${ICON.x}</button></div>
    <div class="current-box"><span class="lbl">${TEAM_LABELS[S.teamIdx]}</span><div id="picker-current"></div></div>
    <input class="picker-search" id="picker-search" placeholder="Buscar no elenco…" autocomplete="off">
    <div class="picker-list" id="picker-list"></div>
    <div class="modal-f"><button class="btn" data-act="picker-empty">Deixar vazio</button><button class="btn gold" data-act="picker-done">Pronto</button></div>
  </div>`, () => { picker = null; });
  renderPickerList();
  setTimeout(() => $('#picker-search')?.focus({ preventScroll: true }), 30);
}
function usageOf(pid) {
  const out = [];
  curLineup().teams.forEach((t, ti) => t.slots.forEach((s, si) => { if (s.playerId === pid) out.push({ ti, si, code: s.code }); }));
  return out;
}
function pickerRow(p) {
  const code = curTeam().slots[picker.idx].code;
  const usage = usageOf(p.id).map(u => {
    const here = u.si === picker.idx && u.code === code;
    return `<span class="${u.ti === S.teamIdx ? 'cur' : ''}">${TEAM_SHORT[u.ti]} · ${here ? 'aqui' : u.code}</span>`;
  }).join('');
  const meta = [p.number ? `<span class="num">${esc(p.number)}</span>` : '', p.country ? `<span class="fi fi-${p.country}" title="${esc(countryName(p.country))}"></span>` : '',
    p.club ? clubHTML(p.club) : ''].join('');
  return `<button class="prow ${picker.selected === p.id ? 'sel' : ''}" data-choose="${p.id}">
    ${avatarHTML(p, 'av', true)}
    <span class="pinfo"><span class="pname">${esc(p.name)}</span><span class="pmeta">${p.external ? EXT_TAG : ''}${posTag(p.pos)}${meta}</span></span>
    <span class="usage">${usage}</span></button>`;
}
function renderPickerList() {
  if (!picker) return;
  const code = curTeam().slots[picker.idx].code;
  const cur = playerById(picker.selected);
  $('#picker-current').innerHTML = cur ? esc(cur.name) : '—';
  const q = norm(picker.q);
  const list = S.players.filter(p => !q || norm(`${p.name} ${p.club} ${countryName(p.country)} ${p.number}`).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const main = list.filter(p => p.pos === code);
  const similar = list.filter(p => p.pos !== code && ((p.sec || []).includes(code) || SIMILAR[code].includes(p.pos)));
  const others = list.filter(p => !main.includes(p) && !similar.includes(p));
  const showOthers = picker.showAll || q;
  let html = '';
  if (main.length) html += `<div class="picker-sec">${POS[code].grupo}</div>${main.map(pickerRow).join('')}`;
  if (similar.length) html += `<div class="picker-sec">Posições parecidas</div>${similar.map(pickerRow).join('')}`;
  if (others.length) {
    html += showOthers ? `<div class="picker-sec">Outros</div>${others.map(pickerRow).join('')}`
      : `<button class="btn sm ghost show-more" data-act="picker-all">Mostrar o resto do elenco (${others.length})</button>`;
  }
  if (!list.length) html = `<p class="muted" style="padding:12px 8px 4px">${S.players.length ? 'Ninguém do elenco com esse nome.' : 'O elenco está vazio. Cadastre jogadores na aba Elenco.'}</p>`;
  // nome digitado que não existe → oferecer como possível contratação
  const typed = picker.q.trim();
  if (typed && !S.players.some(p => norm(p.name) === q)) {
    html = `<button class="add-ext" data-act="picker-add-ext">${ICON.plus}<span>Adicionar <b>${esc(typed)}</b> como possível contratação<small>Entra só nesta posição, com destaque de outra cor. Fica na aba Elenco em "Possíveis contratações".</small></span></button>` + html;
  }
  $('#picker-list').innerHTML = html;
}
const EXT_TAG = '<span class="tag ext">Contratação</span>';
function addExternalFromPicker() {
  const name = picker.q.trim();
  if (!name) return;
  const p = newPlayer({ name, pos: curTeam().slots[picker.idx].code, external: true });
  S.players.push(p);
  assignPlayer(p.id);
  toast(`${name} entrou como possível contratação. Na aba Elenco você coloca foto e dados.`);
}
function assignPlayer(pid) {
  const team = curTeam();
  const slot = team.slots[picker.idx];
  if (pid) {
    const other = team.slots.findIndex((s, i) => s.playerId === pid && i !== picker.idx);
    if (other >= 0) team.slots[other].playerId = slot.playerId; // troca de lugar
  }
  slot.playerId = pid || null;
  save();
  closeModal();
  renderLineup();
}

/* ---------- elenco ---------- */
let squadQuery = '';
function clubsList() {
  return [...new Set(S.players.map(p => p.club).filter(Boolean).concat(Object.keys(S.clubs)))].sort((a, b) => a.localeCompare(b, 'pt'));
}
function playerCard(p) {
  const age = ageOf(p.birth);
  return `<button class="pcard${p.external ? ' ext' : ''}" data-edit="${p.id}">${avatarHTML(p, 'av', true)}
    <span class="pinfo">
      <span class="pname">${p.number ? `<span class="num">${esc(p.number)}</span>` : ''}${esc(p.name)}</span>
      <span class="pmeta">${p.external ? EXT_TAG : ''}${posTag(p.pos)}${(p.sec || []).map(c => `<span class="tag ghost">${c}</span>`).join('')}</span>
      <span class="pmeta2">${flagHTML(p.country)}${clubHTML(p.club)}${age ? `<span>${age} anos</span>` : ''}${p.foot ? `<span>${FOOT[p.foot]}</span>` : ''}</span>
    </span></button>`;
}
function renderSquad() {
  $('#app').innerHTML = `<section class="squad">
    <div class="squad-toolbar">
      <h2>Elenco <span class="muted" id="squad-count"></span></h2>
      <input id="squad-search" placeholder="Buscar nome, clube, país…" value="${esc(squadQuery)}">
      <button class="btn primary" data-act="player-new">${ICON.plus} Jogador</button>
      <button class="btn" data-act="import-sheet">${ICON.up} Importar CSV/Excel</button>
      <button class="btn ghost" data-act="template-csv">${ICON.down} Baixar modelo</button>
    </div>
    <div id="squad-list"></div>
    <div class="group">
      <h3>Escudos dos clubes de origem</h3>
      <p class="muted">Os clubes aparecem aqui conforme você preenche o "time de origem" dos jogadores. Envie o escudo uma vez e ele aparece ao lado do nome de todos os jogadores desse clube.</p>
      <div class="club-grid" id="club-grid"></div>
    </div>
  </section>`;
  renderSquadList();
  renderClubs();
}
function renderSquadList() {
  const q = norm(squadQuery);
  const list = S.players.filter(p => !q || norm(`${p.name} ${p.club} ${countryName(p.country)}`).includes(q));
  const byNum = (a, b) => (parseInt(a.number) || 999) - (parseInt(b.number) || 999) || a.name.localeCompare(b.name, 'pt');
  const squad = list.filter(p => !p.external);
  const ext = list.filter(p => p.external).sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || a.name.localeCompare(b.name, 'pt'));
  const groups = POS_ORDER.map(code => ({ code, items: squad.filter(p => p.pos === code).sort(byNum) })).filter(g => g.items.length);
  const nSquad = S.players.filter(p => !p.external).length;
  $('#squad-count').textContent = `${nSquad} jogador${nSquad === 1 ? '' : 'es'}`;
  $('#squad-list').innerHTML = (groups.map(g => `<div class="group"><h3>${POS[g.code].grupo}<span>${g.items.length}</span></h3><div class="pcards">${g.items.map(playerCard).join('')}</div></div>`).join('') ||
    `<div class="empty-state">${S.players.length ? 'Ninguém encontrado.' : 'Nenhum jogador ainda. Clique em <b>+ Jogador</b> ou importe uma planilha.'}</div>`) +
    (ext.length ? `<div class="group"><h3 class="ext-h">Possíveis contratações<span>${ext.length}</span></h3><div class="pcards">${ext.map(playerCard).join('')}</div></div>` : '');
}
function renderClubs() {
  const clubs = clubsList();
  $('#club-grid').innerHTML = clubs.map(c => `<div class="club-card">
    <span class="crest-box">${S.clubs[c] ? `<img src="${S.clubs[c]}" alt="">` : 'sem'}</span><b title="${esc(c)}">${esc(c)}</b>
    <button class="btn sm" data-crest="${esc(c)}">${S.clubs[c] ? 'Trocar' : 'Escudo'}</button>
    ${S.clubs[c] ? `<button class="icon-btn" data-crest-del="${esc(c)}" title="Remover escudo">${ICON.trash}</button>` : ''}
  </div>`).join('') || '<p class="muted">Nenhum clube cadastrado ainda.</p>';
}

/* ---------- formulário de jogador ---------- */
let draft = null;
function openPlayerModal(id) {
  const src = id ? playerById(id) : null;
  draft = src ? clone(src) : newPlayer({ country: 'br' });
  draft._isNew = !src;
  const posOpts = POS_ORDER.map(c => `<option value="${c}" ${draft.pos === c ? 'selected' : ''}>${POS[c].nome}</option>`).join('');
  pushModal(`<div class="modal wide">
    <div class="modal-h"><h2>${src ? 'Editar jogador' : 'Novo jogador'}</h2><button class="icon-btn" data-act="modal-close" aria-label="Fechar">${ICON.x}</button></div>
    <div class="modal-b">
      <div class="form-grid">
        <div class="full photo-row">
          <div class="photo-prev" id="photo-prev"></div>
          <div class="row" style="flex-wrap:wrap">
            <button class="btn sm" data-act="photo-pick">Enviar foto</button>
            <button class="btn sm ghost" data-act="photo-remove">Usar camisa</button>
          </div>
        </div>
        <label class="field full"><span class="lbl">Nome</span><input id="f-name" value="${esc(draft.name)}" placeholder="Como aparece no campo"></label>
        <label class="field"><span class="lbl">Posição principal</span><select id="f-pos">${posOpts}</select></label>
        <label class="field"><span class="lbl">Número</span><input id="f-number" value="${esc(draft.number)}" inputmode="numeric" maxlength="3"></label>
        <div class="field full"><span class="lbl">Também joga de</span><div class="chips" id="f-sec"></div></div>
        <label class="field"><span class="lbl">Time de origem</span><input id="f-club" list="dl-clubs" value="${esc(draft.club)}" placeholder="Ex.: Cruzeiro (base)"></label>
        <label class="field"><span class="lbl">País</span><input id="f-country" list="dl-countries" value="${esc(countryName(draft.country))}" placeholder="Ex.: Argentina"></label>
        <label class="chk full"><input type="checkbox" id="f-external" ${draft.external ? 'checked' : ''}> Possível contratação (ainda não é do elenco — aparece com destaque roxo)</label>
        <label class="field"><span class="lbl">Pé dominante</span><select id="f-foot"><option value="">—</option>${Object.entries(FOOT).map(([k, v]) => `<option value="${k}" ${draft.foot === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">Nascimento (ano ou data)</span><input id="f-birth" value="${esc(draft.birth)}" placeholder="2001 ou 15/03/2001"></label>
      </div>
      <datalist id="dl-clubs">${clubsList().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <datalist id="dl-countries">${Object.values(COUNTRIES).map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    </div>
    <div class="modal-f">
      ${src ? `<button class="btn danger" data-act="player-delete">${ICON.trash} Excluir</button>` : '<span></span>'}
      <button class="btn gold" data-act="player-save">Salvar</button>
    </div>
  </div>`, () => { draft = null; });
  renderDraftPhoto();
  renderSecChips();
  setTimeout(() => $('#f-name')?.focus(), 30);
}
function renderDraftPhoto() {
  const el = $('#photo-prev');
  if (!el || !draft) return;
  el.innerHTML = draft.photo ? `<img src="${draft.photo}" alt="">` : shirtSVG(draft.number || $('#f-number')?.value, draft.pos === 'GOL');
}
function renderSecChips() {
  const el = $('#f-sec');
  if (!el || !draft) return;
  el.innerHTML = POS_ORDER.map(c => `<button type="button" class="chip ${draft.sec.includes(c) ? 'on' : ''}" data-sec="${c}" ${c === draft.pos ? 'disabled' : ''} title="${POS[c].nome}">${c}</button>`).join('');
}
function savePlayer() {
  const name = $('#f-name').value.trim();
  if (!name) { toast('Coloque o nome do jogador.'); $('#f-name').focus(); return; }
  const countryTxt = $('#f-country').value.trim();
  const country = parseCountry(countryTxt);
  if (countryTxt && !country) toast(`País "${countryTxt}" não reconhecido — ficou sem bandeira.`);
  const p = {
    ...draft, name, pos: $('#f-pos').value, number: $('#f-number').value.trim(), club: $('#f-club').value.trim(),
    external: $('#f-external').checked,
    country, foot: $('#f-foot').value, birth: $('#f-birth').value.trim(),
  };
  p.sec = p.sec.filter(c => c !== p.pos);
  const isNew = p._isNew;
  delete p._isNew;
  if (isNew) S.players.push(p);
  else S.players[S.players.findIndex(x => x.id === p.id)] = p;
  save();
  closeModal();
  render();
  toast(isNew ? `${name} adicionado ao elenco.` : 'Jogador atualizado.');
}
function deletePlayer(id) {
  const p = playerById(id);
  if (!p || !confirm(`Excluir ${p.name} do elenco? Ele também sai de todas as escalações.`)) return;
  S.players = S.players.filter(x => x.id !== id);
  S.lineups.forEach(l => l.teams.forEach(t => t.slots.forEach(s => { if (s.playerId === id) s.playerId = null; })));
  save();
  closeModal();
  render();
}

/* ---------- imagens: recorte circular de foto e escudo ---------- */
function pickFile(accept, cb) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = accept;
  inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
  inp.click();
}
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function toDataURL(canvas) {
  const webp = canvas.toDataURL('image/webp', 0.88);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}
async function openCropper(file, onDone) {
  let img;
  try { img = await loadImg(URL.createObjectURL(file)); }
  catch { toast('Não consegui abrir essa imagem.'); return; }
  const V = 300, OUT = 220;
  const base = Math.max(V / img.width, V / img.height);
  let zoom = 1, cx = V / 2, cy = V / 2;
  pushModal(`<div class="modal">
    <div class="modal-h"><h2>Ajustar foto</h2><button class="icon-btn" data-act="modal-close" aria-label="Fechar">${ICON.x}</button></div>
    <div class="modal-b cropper">
      <canvas id="crop-canvas" width="${V}" height="${V}"></canvas>
      <input type="range" id="crop-zoom" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
      <p class="muted" style="margin:0">Arraste para posicionar · use o controle ou a roda do mouse para o zoom</p>
    </div>
    <div class="modal-f"><button class="btn" data-act="modal-close">Cancelar</button><button class="btn gold" id="crop-ok">Usar foto</button></div>
  </div>`);
  const cv = $('#crop-canvas'), ctx = cv.getContext('2d');
  const draw = (c, size, mask) => {
    const k = size / V, s = base * zoom * k;
    c.clearRect(0, 0, size, size);
    c.drawImage(img, cx * k - img.width * s / 2, cy * k - img.height * s / 2, img.width * s, img.height * s);
    if (mask) {
      c.save();
      c.fillStyle = 'rgba(5,8,14,.62)';
      c.beginPath(); c.rect(0, 0, size, size); c.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2, true); c.fill('evenodd');
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2;
      c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  };
  const redraw = () => draw(ctx, V, true);
  redraw();
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx, cy }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const k = V / cv.getBoundingClientRect().width;
    cx = drag.cx + (e.clientX - drag.x) * k; cy = drag.cy + (e.clientY - drag.y) * k; redraw();
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  const zr = $('#crop-zoom');
  zr.addEventListener('input', () => { zoom = +zr.value; redraw(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 4); zr.value = zoom; redraw(); }, { passive: false });
  $('#crop-ok').addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = out.height = OUT;
    const o = out.getContext('2d');
    o.save(); o.beginPath(); o.arc(OUT / 2, OUT / 2, OUT / 2 - 6 * OUT / V, 0, Math.PI * 2); o.clip();
    draw(o, OUT, false);
    o.restore();
    closeModal();
    onDone(toDataURL(out));
  });
}
async function crestFromFile(file) {
  const img = await loadImg(URL.createObjectURL(file));
  const N = 96, s = Math.min(N / img.width, N / img.height);
  const c = document.createElement('canvas');
  c.width = c.height = N;
  c.getContext('2d').drawImage(img, (N - img.width * s) / 2, (N - img.height * s) / 2, img.width * s, img.height * s);
  return toDataURL(c);
}

/* ---------- importação CSV / Excel ---------- */
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const d = first.split(';').length >= first.split(',').length ? ';' : ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
const HEADER_MAP = {
  name: ['nome', 'name', 'jogador', 'atleta'],
  pos: ['posicao', 'pos', 'position', 'posicao principal'],
  sec: ['secundarias', 'posicoes secundarias', 'outras posicoes', 'tambem joga de', 'secondary', 'secundaria'],
  club: ['clube', 'time', 'time de origem', 'clube de origem', 'origem', 'club'],
  country: ['pais', 'nacionalidade', 'country', 'selecao'],
  number: ['numero', 'camisa', 'n', 'no', 'number', 'num'],
  foot: ['pe', 'pe dominante', 'foot', 'perna'],
  birth: ['nascimento', 'ano', 'data de nascimento', 'ano de nascimento', 'birth', 'nasc'],
};
function importRows(rows) {
  if (rows.length < 2) { toast('A planilha precisa de um cabeçalho e pelo menos um jogador.'); return; }
  const head = rows[0].map(h => norm(h).replace(/[º°.]/g, '').trim());
  const col = {};
  for (const [k, names] of Object.entries(HEADER_MAP)) { const i = head.findIndex(h => names.includes(h)); if (i >= 0) col[k] = i; }
  if (col.name == null) { toast('Não achei a coluna "nome" na planilha.'); return; }
  let added = 0, updated = 0, badPos = 0;
  const badCountries = new Set();
  const pad = n => String(n).padStart(2, '0');
  for (const r of rows.slice(1)) {
    const get = k => {
      if (col[k] == null) return '';
      let v = r[col[k]];
      if (v instanceof Date && !isNaN(v)) { // data vinda do Excel → dd/mm/aaaa
        const d = new Date(v.getTime() + 12 * 3600e3);
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
      return String(v ?? '').trim();
    };
    const name = get('name');
    if (!name) continue;
    const pos = parsePos(get('pos'));
    if (get('pos') && !pos) badPos++;
    if (get('country') && !parseCountry(get('country'))) badCountries.add(get('country'));
    const data = {
      name, pos: pos || 'MEI',
      sec: get('sec').split(/[\/|,;+]/).map(parsePos).filter(Boolean),
      club: get('club'), country: parseCountry(get('country')), number: get('number').replace(/\D/g, ''),
      foot: parseFoot(get('foot')), birth: get('birth'),
    };
    const ex = S.players.find(p => norm(p.name) === norm(name));
    if (ex) {
      for (const k of Object.keys(data)) if (col[k] != null && (data[k] !== '' && !(Array.isArray(data[k]) && !data[k].length))) ex[k] = data[k];
      updated++;
    } else { S.players.push(newPlayer(data)); added++; }
  }
  save();
  render();
  toast(`Importação: ${added} novo(s), ${updated} atualizado(s)${badPos ? `, ${badPos} posição(ões) não reconhecida(s) → Meia` : ''}.`);
  if (badCountries.size) setTimeout(() => alert(`Importei tudo, mas estes países não foram reconhecidos (ficaram sem bandeira):\n\n${[...badCountries].join('\n')}\n\nCorrija o nome na planilha e importe de novo, ou edite o jogador no app.`), 50);
}
function importSheet(file) {
  const isExcel = /\.(xlsx|xls|ods)$/i.test(file.name);
  const reader = new FileReader();
  reader.onerror = () => toast('Não consegui ler o arquivo.');
  if (isExcel) {
    if (!window.XLSX) { toast('Leitor de Excel não carregou (sem internet?). Salve a planilha como CSV.'); return; }
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
      importRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }));
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = () => importRows(parseCSV(reader.result));
    reader.readAsText(file, 'utf-8');
  }
}
const TEMPLATE_CSV = 'nome;posicao;secundarias;clube;pais;numero;pe;nascimento\n' +
  'Fulano da Silva;Volante;Meia/Zagueiro;Cruzeiro (base);Brasil;5;Destro;2003\n' +
  'Ciclano Pérez;Ponta;Atacante;River Plate;Argentina;11;Canhoto;15/04/2000\n';

/* ---------- arquivos: download, backup ---------- */
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prancheta';
function exportBackup() {
  const data = JSON.stringify({ app: 'prancheta-tatica', version: 1, exportedAt: new Date().toISOString(), state: S });
  download(new Blob([data], { type: 'application/json' }), `prancheta-backup-${new Date().toISOString().slice(0, 10)}.json`);
  toast('Backup baixado. Guarde esse arquivo em lugar seguro.');
}
function importBackup(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      const st = sanitize(obj.state || obj);
      if (!confirm(`Restaurar este backup? Ele tem ${st.players.length} jogadores e ${st.lineups.length} escalação(ões) e SUBSTITUI tudo o que está aqui agora.`)) return;
      S = st;
      save();
      closeAllModals();
      render();
      toast('Backup restaurado.');
    } catch (e) { toast('Arquivo de backup inválido.'); }
  };
  r.readAsText(file);
}

/* ---------- exportar PNG ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawPitch(ctx, X, Y, W, H) {
  ctx.save();
  roundRect(ctx, X, Y, W, H, 22); ctx.clip();
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#2a7238' : '#2f7d3f'; ctx.fillRect(X, Y + i * H / 10, W, H / 10 + 1); }
  const px = v => X + v / 72 * W, py = v => Y + v / 100 * H, k = W / 72;
  ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 3;
  const rect = (x, y, w, h) => ctx.strokeRect(px(x), py(y), w * k, h / 100 * H);
  rect(2, 2, 68, 96); rect(15.85, 2, 40.3, 15.1); rect(26.85, 2, 18.3, 5); rect(15.85, 82.9, 40.3, 15.1); rect(26.85, 93, 18.3, 5);
  ctx.beginPath(); ctx.moveTo(px(2), py(50)); ctx.lineTo(px(70), py(50)); ctx.stroke();
  ctx.beginPath(); ctx.arc(px(36), py(50), 9 * k, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(px(36), py(12.06), 9 * k, 0.594, Math.PI - 0.594); ctx.stroke();
  ctx.beginPath(); ctx.arc(px(36), py(87.94), 9 * k, Math.PI + 0.594, 2 * Math.PI - 0.594); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (const y of [50, 12.06, 87.94]) { ctx.beginPath(); ctx.arc(px(36), py(y), 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
const FONT = '"Segoe UI", Inter, system-ui, sans-serif';
const EXT_COLOR = '#c026d3'; // mesma cor de --ext no CSS
function fitText(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}
function drawToken(ctx, x, y, slot, p, img) {
  const r = 44, st = S.settings;
  ctx.save();
  if (!p) {
    ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.beginPath(); ctx.arc(x, y, r * .8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
  } else if (img) {
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = p.external ? EXT_COLOR : '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r + (p.external ? 6 : 4), 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#0e1626'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    const s = Math.max(2 * r / img.width, 2 * r / img.height);
    ctx.drawImage(img, x - img.width * s / 2, y - img.height * s / 2, img.width * s, img.height * s);
    ctx.restore();
  } else {
    const size = r * 2.5;
    ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 100, size / 100);
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
    ctx.fillStyle = p.pos === 'GOL' ? st.gkShirt : st.shirt;
    const path = new Path2D(SHIRT_PATH);
    ctx.fill(path);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(path);
    ctx.fillStyle = st.shirtNum; ctx.font = `800 30px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(p.number || '', 50, 68);
  }
  ctx.restore();
  if (p && p.external && !img) { // anel de destaque na camisa
    ctx.save(); ctx.strokeStyle = EXT_COLOR; ctx.lineWidth = 5; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (p ? st.showNames : true) {
    const label = p ? p.name : slot.code;
    ctx.save();
    ctx.font = `700 23px ${FONT}`;
    const t = fitText(ctx, label, 190), w = ctx.measureText(t).width + 22, ly = y + r + 12;
    ctx.fillStyle = p ? (p.external ? EXT_COLOR : 'rgba(5,10,20,.8)') : 'rgba(0,0,0,.35)';
    roundRect(ctx, x - w / 2, ly, w, 34, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, ly + 18);
    ctx.restore();
  }
}
async function exportPNG() {
  const W = 1080, H = 1350, t = curTeam(), l = curLineup(), st = S.settings;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1220'); g.addColorStop(1, '#121b30');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = st.shirt; ctx.fillRect(60, 52, 10, 74);
  ctx.fillStyle = '#fff'; ctx.font = `800 54px ${FONT}`; ctx.fillText(fitText(ctx, st.title || l.name, 900), 88, 100);
  ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.font = `600 27px ${FONT}`;
  ctx.fillText(fitText(ctx, `${TEAM_LABELS[S.teamIdx]} · ${S.phase === 'p' ? '' : phaseLabel(S.phase) + ' · '}${t.formation} · ${l.name}`, 900), 90, 140);
  const PH = 1130, PW = PH * 0.72, PX = (W - PW) / 2, PY = 178;
  drawPitch(ctx, PX, PY, PW, PH);
  const imgs = await Promise.all(t.slots.map(s => {
    const p = playerById(s.playerId);
    return p && p.photo && st.display === 'photo' ? loadImg(p.photo).catch(() => null) : null;
  }));
  t.slots.forEach((s, i) => { const q = posOf(s); drawToken(ctx, PX + q.x / 100 * PW, PY + q.y / 100 * PH, s, playerById(s.playerId), imgs[i]); });
  if (hasExternal(t)) { // legenda
    ctx.fillStyle = EXT_COLOR; ctx.beginPath(); ctx.arc(W - 60 - 8, 132, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `600 24px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText('Possível contratação', W - 60 - 26, 140); ctx.textAlign = 'left';
  }
  c.toBlob(b => { download(b, `${slug(l.name)}-${slug(TEAM_LABELS[S.teamIdx])}.png`); toast('Imagem exportada.'); }, 'image/png');
}

/* ---------- modais ---------- */
const modalStack = [];
function pushModal(html, onClose) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = html;
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
  $('#modal-root').appendChild(ov);
  modalStack.push({ el: ov, onClose });
}
function closeModal() {
  const m = modalStack.pop();
  if (!m) return;
  m.el.remove();
  m.onClose && m.onClose();
}
function closeAllModals() { while (modalStack.length) closeModal(); }

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const el = sel => t.closest(sel);
  let x;
  if ((x = el('[data-view]'))) { S.view = x.dataset.view; save(); render(); return; }
  if ((x = el('[data-team]'))) { S.teamIdx = +x.dataset.team; save(); renderLineup(); return; }
  if ((x = el('[data-phase]'))) { setPhase(x.dataset.phase); return; }
  if ((x = el('[data-display]'))) { S.settings.display = x.dataset.display; save(); renderLineup(); return; }
  if ((x = el('[data-pick]'))) { openPicker(+x.dataset.pick); return; }
  if ((x = el('[data-choose]'))) {
    picker.selected = x.dataset.choose; renderPickerList(); return;
  }
  if ((x = el('[data-edit]'))) { openPlayerModal(x.dataset.edit); return; }
  if ((x = el('[data-sec]'))) {
    const c = x.dataset.sec;
    draft.sec = draft.sec.includes(c) ? draft.sec.filter(s => s !== c) : [...draft.sec, c];
    renderSecChips(); return;
  }
  if ((x = el('[data-crest]'))) {
    const club = x.dataset.crest;
    pickFile('image/*', async f => {
      try { S.clubs[club] = await crestFromFile(f); save(); renderClubs(); renderSquadList(); }
      catch { toast('Não consegui abrir essa imagem.'); }
    });
    return;
  }
  if ((x = el('[data-crest-del]'))) { delete S.clubs[x.dataset.crestDel]; save(); renderClubs(); renderSquadList(); return; }

  const act = el('[data-act]')?.dataset.act;
  if (!act) return;
  const l = curLineup();
  switch (act) {
    case 'modal-close': closeModal(); break;
    case 'lineup-new': {
      const name = prompt('Nome da nova escalação:', 'vs ');
      if (!name || !name.trim()) return;
      const nl = newLineup(name.trim());
      S.lineups.push(nl); S.currentLineupId = nl.id; S.teamIdx = 0; save(); render(); break;
    }
    case 'lineup-rename': {
      const name = prompt('Novo nome:', l.name);
      if (!name || !name.trim()) return;
      l.name = name.trim(); save(); render(); break;
    }
    case 'lineup-dup': {
      const nl = clone(l); nl.id = uid(); nl.name = `${l.name} (cópia)`;
      S.lineups.push(nl); S.currentLineupId = nl.id; save(); render(); toast('Escalação duplicada.'); break;
    }
    case 'lineup-del': {
      if (S.lineups.length === 1) { toast('Precisa existir pelo menos uma escalação.'); return; }
      if (!confirm(`Excluir a escalação "${l.name}" (com os 3 times)?`)) return;
      S.lineups = S.lineups.filter(x => x.id !== l.id); S.currentLineupId = S.lineups[0].id; save(); render(); break;
    }
    case 'backup-export': exportBackup(); break;
    case 'backup-import': pickFile('.json,application/json', importBackup); break;
    case 'reset-pos': {
      const team = curTeam(), base = slotsFor(team.formation);
      team.slots.forEach((s, i) => {
        if (S.phase === 'a') delete s.atk;
        else if (S.phase === 'd') delete s.def;
        else { s.x = base[i].x; s.y = base[i].y; }
      });
      save(); setPhase(S.phase); toast(`Posições de "${phaseLabel(S.phase)}" voltaram ao padrão da formação.`); break;
    }
    case 'clear-team':
      if (!confirm(`Tirar todos os jogadores do ${TEAM_LABELS[S.teamIdx].toLowerCase()}?`)) return;
      curTeam().slots.forEach(s => { s.playerId = null; }); save(); renderLineup(); break;
    case 'export-png': exportPNG(); break;
    case 'picker-empty': assignPlayer(null); break;
    case 'picker-done': assignPlayer(picker.selected); break;
    case 'picker-all': picker.showAll = true; renderPickerList(); break;
    case 'picker-add-ext': addExternalFromPicker(); break;
    case 'player-new': openPlayerModal(null); break;
    case 'player-save': savePlayer(); break;
    case 'player-delete': deletePlayer(draft.id); break;
    case 'photo-pick': pickFile('image/*', f => openCropper(f, url => { if (draft) { draft.photo = url; renderDraftPhoto(); } })); break;
    case 'photo-remove': draft.photo = null; renderDraftPhoto(); break;
    case 'import-sheet': pickFile('.csv,.xlsx,.xls,.ods,text/csv', importSheet); break;
    case 'template-csv': download(new Blob(['﻿' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }), 'modelo-elenco.csv'); break;
  }
});

// duplo clique num jogador da lista confirma direto
document.addEventListener('dblclick', e => {
  const x = e.target.closest('[data-choose]');
  if (x && picker) assignPlayer(x.dataset.choose);
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'lineup-select') { S.currentLineupId = t.value; S.teamIdx = 0; save(); render(); }
  else if (t.id === 'formation') { applyFormation(curTeam(), t.value); save(); renderLineup(); }
  else if (t.id === 'show-names') { S.settings.showNames = t.checked; save(); renderLineup(); }
  else if (t.id === 'f-pos' && draft) { draft.pos = t.value; draft.sec = draft.sec.filter(c => c !== t.value); renderSecChips(); renderDraftPhoto(); }
  else if (t.dataset.color) { save(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'picker-search' && picker) { picker.q = t.value; renderPickerList(); }
  else if (t.id === 'squad-search') { squadQuery = t.value; renderSquadList(); }
  else if (t.id === 'img-title') { S.settings.title = t.value; save(); const sm = $('.brand small'); if (sm) sm.textContent = t.value; }
  else if (t.id === 'f-number' && draft && !draft.photo) renderDraftPhoto();
  else if (t.dataset.color) {
    S.settings[t.dataset.color] = t.value;
    $('#pitch').innerHTML = pitchInner();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length) { closeModal(); return; }
  if (e.key === 'Enter' && picker && e.target.id === 'picker-search') {
    if ($('[data-act="picker-add-ext"]') && !$('#picker-list [data-choose]')) addExternalFromPicker();
    else assignPlayer(picker.selected);
    return;
  }
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  if (typing || modalStack.length || S.view === 'squad' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['1', '2', '3'].includes(e.key)) { S.teamIdx = +e.key - 1; save(); renderLineup(); }
  const ph = { p: 'p', a: 'a', d: 'd' }[e.key.toLowerCase()];
  if (ph) setPhase(ph);
});

// troca de fase com animação: os jogadores deslizam até as novas posições
function setPhase(ph) {
  S.phase = ph;
  save();
  const pitch = $('#pitch');
  if (!pitch) return;
  document.querySelectorAll('[data-phase]').forEach(b => b.classList.toggle('on', b.dataset.phase === ph));
  pitch.classList.add('anim');
  const slots = curTeam().slots;
  pitch.querySelectorAll('.token').forEach(tok => {
    const q = posOf(slots[+tok.dataset.idx]);
    tok.style.left = q.x + '%';
    tok.style.top = q.y + '%';
  });
  clearTimeout(setPhase.t);
  setPhase.t = setTimeout(() => pitch.classList.remove('anim'), 550);
}

loadPublished();
render();
