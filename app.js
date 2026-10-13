'use strict';
/* ===================== utilità ===================== */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const mLabel = ym => { const a = ym.split('-'); return MESI[+a[1] - 1] + ' ' + a[0]; };
const addM = (ym, k) => { const a = ym.split('-').map(Number), d = new Date(a[0], a[1] - 1 + k, 1); return d.getFullYear() + '-' + p2(d.getMonth() + 1); };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const dShort = s => { const a = (s || '').split('-'); return a.length < 3 ? '' : (+a[2]) + ' ' + MESI[+a[1] - 1].slice(0, 3); };
const dFull = s => { const a = (s || '').split('-'); return a.length < 3 ? '' : (+a[2]) + ' ' + MESI[+a[1] - 1] + ' ' + a[0]; };
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const int = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const money = n => eur.format(n || 0);
const signed = n => (n >= 0 ? '+' : '−') + eur.format(Math.abs(n || 0));
const parseNum = s => {
  s = String(s == null ? '' : s).trim().replace(/[^\d,.\-]/g, '');
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isFinite(n) ? n : NaN;
};
const dec = n => String(n).replace('.', ',');
const val = id => { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
const svg = p => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const I = {
  l: svg('<path d="M15 5l-7 7 7 7"/>'), r: svg('<path d="M9 5l7 7-7 7"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  set: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  ref: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>')
};
const C = { NV: '#191C6B', TL: '#2BBF9D', BL: '#5B72C2', PU: '#9A3AF2', OR: '#F2994A', PK: '#E8668B', GR: '#9CA0B8' };
const TIPO_COL = { 'Liquidità': C.TL, 'Investimenti': C.BL, 'Previdenza': C.PU, 'Immobiliare': C.OR, 'TFR': C.GR, 'Passività': C.PK };

/* ===================== stato e API ===================== */
const LS = { url: 'fin_url', key: 'fin_key', cache: 'fin_cache' };
const UNCAT = 'Da categorizzare', SINCE = '2026-09-01';
const CFG_KEYS = ['Budget mensile', 'Budget annuale', 'Quota mensile fondo annuale', 'Obiettivo risparmio mensile'];
const S = { data: null, tab: 'home', month: today().slice(0, 7), mp: 'month', mcat: '', mfrom: '', mto: '', last: 0 };
try { S.data = JSON.parse(localStorage.getItem(LS.cache) || 'null'); } catch (e) { S.data = null; }
const D = () => S.data;
const cfg = k => Number((D().config || {})[k]) || 0;
const spese = () => D().movimenti.filter(m => m.tipo !== 'Entrata');
const catBy = n => D().categorie.find(c => c.nome === n) || { nome: n, colore: C.GR, gruppo: '' };

async function api(action, payload) {
  const url = localStorage.getItem(LS.url), key = localStorage.getItem(LS.key);
  if (!url || !key) throw new Error('Inserisci URL e chiave nelle impostazioni');
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key: key, action: action }, payload || {})) });
  } catch (e) { throw new Error('Nessuna connessione'); }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Risposta non valida dallo script'); }
  if (!j.ok) throw new Error(j.error || 'Errore');
  return j;
}
let loading = false;
async function load(silent) {
  if (loading) return;
  loading = true;
  try {
    const j = await api('bootstrap');
    S.data = j; S.last = Date.now();
    try { localStorage.setItem(LS.cache, JSON.stringify(j)); } catch (e) { /* cache piena: ignora */ }
  } catch (e) { if (!silent) toast(e.message); }
  loading = false;
  render();
}
let tt;
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2800); }

/* ===================== blocchi UI ===================== */
const hd = (top, lb, big, sb, cls) => '<div class="hd"><div class="hd-top">' + top + '</div><div class="lb">' + lb + '</div><div class="big ' + (cls || '') + '">' + big + '</div><div class="sb">' + sb + '</div></div>';
const sheet = h => '<div class="sheet">' + h + '</div>';
const card = (h, x) => '<div class="card ' + (x || '') + '">' + h + '</div>';
const row = (col, name, amt, sub) => '<div class="row"><i class="dot" style="background:' + col + '"></i><span class="rt">' + name + (sub ? '<small>' + sub + '</small>' : '') + '</span><b>' + amt + '</b></div>';
const mrow = m => {
  const c = catBy(m.categoria);
  return '<button class="row" data-a="editMov" data-id="' + esc(m.id) + '"><i class="dot" style="background:' + c.colore + '"></i><span class="rt">' + esc(m.esercente || m.note || m.categoria) +
    '<small>' + esc(m.categoria) + ' · ' + dShort(m.data) + (m.esercente && m.note && m.note !== m.esercente ? ' · ' + esc(m.note) : '') + (m.stato === UNCAT ? ' · da categorizzare' : '') + '</small></span><b>' + money(m.importo) + '</b></button>';
};
const seg = (items, cur, act, attr) => '<div class="seg">' + items.map(i => '<button class="' + (i[0] === cur ? 'on' : '') + '" data-a="' + act + '" data-' + attr + '="' + esc(i[0]) + '">' + esc(i[1]) + '</button>').join('') + '</div>';
const sw = (id, on) => '<label class="sw" style="margin:0"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span></label>';
const noData = (t) => hd('<span class="sp"></span><div class="ttl">' + t + '</div><button class="ic" data-a="settings" aria-label="Impostazioni">' + I.set + '</button>', '', 'Finanze', '') +
  sheet('<p class="mut">Collega l’app al tuo Foglio: apri le impostazioni e inserisci l’URL dello script e la chiave.</p><button class="btn" data-a="settings">Apri impostazioni</button>');

/* ===================== HOME ===================== */
function renderHome() {
  const el = $('#scr-home');
  if (!D()) { el.innerHTML = noData('BUDGET'); return; }
  const ym = S.month, ms = spese().filter(m => m.data.slice(0, 7) === ym);
  const sum = g => ms.filter(m => m.gruppo === g).reduce((a, m) => a + m.importo, 0);
  const fi = sum('Fissa'), va = sum('Variabile'), bud = cfg('Budget mensile'), left = bud - fi - va;
  const pc = x => bud > 0 ? Math.min(x / bud * 100, 100) : 0;
  const yr = ym.slice(0, 4), ba = cfg('Budget annuale');
  const an = spese().filter(m => m.gruppo === 'Annuale' && m.data.slice(0, 4) === yr).reduce((a, m) => a + m.importo, 0);
  const grp = g => { const o = {}; ms.filter(m => m.gruppo === g).forEach(m => { o[m.categoria] = (o[m.categoria] || 0) + m.importo; }); return Object.keys(o).map(k => [k, o[k]]).sort((a, b) => b[1] - a[1]); };
  const catList = (arr, empty) => arr.length ? arr.map(t => row(catBy(t[0]).colore, esc(t[0]), money(t[1]))).join('') : '<p class="mut">' + empty + '</p>';
  const pct = bud > 0 ? Math.round((fi + va) / bud * 100) : 0, pctA = ba > 0 ? Math.round(an / ba * 100) : 0;
  const recent = D().movimenti.slice().sort((a, b) => (b.data + b.creato).localeCompare(a.data + a.creato)).slice(0, 6);
  const unc = D().movimenti.filter(m => m.stato === UNCAT).length;
  const topbar = '<button class="ic" data-a="settings" aria-label="Impostazioni">' + I.set + '</button><div class="mnav"><button class="ic s" data-a="prevM" aria-label="Mese precedente">' + I.l + '</button><span>' + mLabel(ym).toUpperCase() + '</span><button class="ic s" data-a="nextM" aria-label="Mese successivo">' + I.r + '</button></div><button class="ic" data-a="refresh" aria-label="Aggiorna">' + I.ref + '</button>';
  el.innerHTML = hd(topbar, 'Ancora disponibili', money(left), pct + '% del budget utilizzato · su ' + money(bud), left < 0 ? 'neg' : '') + sheet(
    card('<div class="bar"><i style="width:' + pc(fi) + '%;background:' + C.BL + '"></i><i style="width:' + pc(va) + '%;background:' + C.TL + '"></i></div>' +
      '<div class="leg"><span><span style="color:' + C.BL + '">●</span> Fisse ' + fmtN(fi) + '</span><span><span style="color:' + C.TL + '">●</span> Variabili ' + fmtN(va) + '</span><span>Budget ' + int.format(bud) + '</span></div>') +
    card('<div class="r2"><span>Spese annuali ' + yr + '</span><span>' + money(an) + ' / ' + money(ba) + '</span></div><div class="bar thin"><i style="width:' + (ba > 0 ? Math.min(an / ba * 100, 100) : 0) + '%;background:' + C.PU + '"></i></div><span class="mut">' + (ba - an >= 0 ? 'Restano ' + money(ba - an) : 'Oltre il budget di ' + money(an - ba)) + ' · utilizzato ' + pctA + '%</span>') +
    (unc ? '<button class="banner" data-a="listUncat">' + unc + (unc === 1 ? ' pagamento da categorizzare' : ' pagamenti da categorizzare') + ' ›</button>' : '') +
    '<div class="rowhead"><h3>Variabili per categoria</h3><b>' + money(va) + '</b></div>' + catList(grp('Variabile'), 'Nessuna spesa variabile in questo mese.') +
    '<div class="rowhead"><h3>Spese fisse</h3><b>' + money(fi) + '</b></div>' + catList(grp('Fissa'), 'Nessuna spesa fissa in questo mese.') +
    '<div class="rowhead"><h3>Ultimi movimenti</h3><button class="link" data-a="listAll">Vedi tutti</button></div>' +
    (recent.length ? recent.map(mrow).join('') : '<p class="mut">Ancora nessun movimento.</p>'));
}
const fmtN = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

/* ===================== PATRIMONIO ===================== */
function patData() {
  const snaps = D().snapshot, dates = Array.from(new Set(snaps.map(s => s.data))).sort();
  const conti = D().conti.filter(c => c.attivo || snaps.some(s => s.voce === c.nome));
  const v = (voce, d) => { let b = null; snaps.forEach(s => { if (s.voce === voce && s.data <= d && (!b || s.data > b.data)) b = s; }); return b ? b.valore : 0; };
  const tip = (d, types) => conti.filter(c => types.indexOf(c.tipo) > -1).reduce((a, c) => a + v(c.nome, d), 0);
  const net = d => conti.reduce((a, c) => a + (c.tipo === 'Passività' ? -1 : 1) * v(c.nome, d), 0);
  return { dates: dates, conti: conti, v: v, tip: tip, net: net };
}
function chart(dates, vals) {
  const n = vals.length; if (!n) return '<p class="mut">Nessuno snapshot registrato.</p>';
  const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  const X = i => n === 1 ? 159 : 24 + 270 * i / (n - 1), Y = x => mx === mn ? 46 : 64 - (x - mn) / (mx - mn) * 40;
  const pts = vals.map((x, i) => X(i) + ',' + Y(x)).join(' ');
  let s = '<svg viewBox="0 0 318 104" width="100%" role="img" aria-label="Andamento della liquidità negli snapshot">';
  if (n > 1) s += '<polyline points="' + pts + '" fill="none" stroke="' + C.PU + '" stroke-width="3" stroke-linejoin="round"/>';
  vals.forEach((x, i) => {
    s += '<circle cx="' + X(i) + '" cy="' + Y(x) + '" r="5" fill="' + C.PU + '"/><text x="' + X(i) + '" y="' + (Y(x) - 11) + '" text-anchor="middle" font-size="11" fill="#646987">' + int.format(x) + '</text>' +
      '<text x="' + X(i) + '" y="98" text-anchor="middle" font-size="11" fill="#646987">' + dShort(dates[i]) + '</text>';
  });
  return s + '</svg>';
}
function renderPat() {
  const el = $('#scr-pat');
  if (!D()) { el.innerHTML = noData('PATRIMONIO'); return; }
  const P = patData(), last = P.dates[P.dates.length - 1], prev = P.dates[P.dates.length - 2];
  const shown = P.dates.slice(-6);
  const sav = ['Liquidità', 'Investimenti', 'Previdenza'];
  let delta = '';
  if (prev) {
    const dl = P.tip(last, sav) - P.tip(prev, sav);
    delta = card('<div class="r2"><span>Variazione dal ' + dShort(prev) + '</span><span class="' + (dl >= 0 ? 'pos' : 'neg') + '">' + signed(dl) + '</span></div><small>Liquidità + investimenti + fondo pensione. Obiettivo mensile: ' + money(cfg('Obiettivo risparmio mensile')) + '</small>');
  }
  const liqRow = P.conti.some(c => c.tipo === 'Liquidità') ? row(TIPO_COL['Liquidità'], 'Liquidità', money(last ? P.tip(last, ['Liquidità']) : 0)) : '';
  const others = P.conti.filter(c => c.tipo !== 'Liquidità').map(c => row(TIPO_COL[c.tipo] || C.GR, esc(c.nome), (c.tipo === 'Passività' ? '−' : '') + money(last ? P.v(c.nome, last) : 0))).join('');
  el.innerHTML = hd('<span class="sp"></span><div class="ttl">PATRIMONIO</div><span class="sp"></span>', 'Patrimonio netto', money(last ? P.net(last) : 0), last ? 'Aggiornato al ' + dFull(last) : 'Nessuno snapshot') + sheet(
    card('<h3 style="margin-top:0">Liquidità negli snapshot</h3>' + chart(shown, shown.map(d => P.tip(d, ['Liquidità'])))) + delta +
    liqRow + others +
    '<button class="btn" data-a="snap">Registra snapshot</button><p class="mut" style="text-align:center">Registralo il 1° di ogni mese, con tutti i conti.</p>');
}
function openSnap() {
  const P = patData(), last = P.dates[P.dates.length - 1] || today();
  const fields = P.conti.map((c, i) => '<label for="sn' + i + '">' + esc(c.nome) + ' <span class="mut">· ' + esc(c.tipo) + '</span></label><input id="sn' + i + '" data-voce="' + esc(c.nome) + '" inputmode="decimal" value="' + dec(P.v(c.nome, last)) + '">').join('');
  openModal('<div class="mh"><span>Nuovo snapshot</span><button class="ic d" data-a="closeModal" aria-label="Chiudi">' + I.x + '</button></div><label for="sn-d">Data</label><input id="sn-d" type="date" value="' + today() + '">' + fields +
    '<p class="mut">Le passività (come il mutuo) vanno inserite con importo positivo.</p><button class="btn" data-a="saveSnap">Salva snapshot</button>', 'tall');
}
async function saveSnap(btn) {
  const valori = {};
  const inputs = document.querySelectorAll('#modal input[data-voce]');
  for (let i = 0; i < inputs.length; i++) {
    const n = parseNum(inputs[i].value);
    if (isNaN(n)) return toast('Valore non valido: ' + inputs[i].dataset.voce);
    valori[inputs[i].dataset.voce] = n;
  }
  btn.disabled = true; btn.textContent = 'Salvo…';
  try { await api('saveSnapshot', { data: val('sn-d') || today(), valori: valori }); closeModal(); toast('Snapshot salvato'); await load(true); }
  catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Salva snapshot'; }
}

/* ===================== RICORRENTI ===================== */
function renderRic() {
  const el = $('#scr-ric');
  if (!D()) { el.innerHTML = noData('RICORRENTI'); return; }
  const list = D().ricorrenti.filter(r => r.attiva), tot = list.reduce((a, r) => a + r.importo, 0);
  el.innerHTML = hd('<span class="sp"></span><div class="ttl">RICORRENTI</div><span class="sp"></span>', 'Totale ricorrenti al mese', money(tot), 'Generate in automatico') + sheet(
    (list.length ? list.map(r => '<button class="rec" data-a="editRic" data-id="' + esc(r.id) + '"><span>' + esc(r.nome) + '<small>Giorno ' + r.giorno + ' · ' + esc(catBy(r.categoria).gruppo || '') + '</small></span><b>' + money(r.importo) + '</b></button>').join('') : '<p class="mut">Nessuna ricorrente attiva.</p>') +
    '<button class="link" data-a="newRic">+ Aggiungi ricorrente</button>');
}
let RS = { scope: 'next' };
function openRic(id) {
  const r = id ? D().ricorrenti.find(x => x.id === id) : { nome: '', importo: '', categoria: '', giorno: 1 };
  if (!r) return;
  RS = { scope: 'next' };
  const cur = today().slice(0, 7);
  const opts = ['Fissa', 'Variabile', 'Annuale'].map(g => '<optgroup label="' + g + '">' + D().categorie.filter(c => c.gruppo === g && c.nome !== UNCAT && (c.attiva || c.nome === r.categoria)).map(c => '<option' + (c.nome === r.categoria ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</optgroup>').join('');
  openModal('<div class="mh"><span>' + (id ? 'Modifica ricorrente' : 'Nuova ricorrente') + '</span><button class="ic d" data-a="closeModal" aria-label="Chiudi">' + I.x + '</button></div>' +
    '<label for="r-nome">Nome</label><input id="r-nome" value="' + esc(r.nome) + '"><label for="r-imp">Importo (€)</label><input id="r-imp" inputmode="decimal" value="' + (r.importo === '' ? '' : dec(r.importo)) + '">' +
    '<label for="r-g">Giorno del mese</label><input id="r-g" type="number" min="1" max="31" inputmode="numeric" value="' + r.giorno + '"><label for="r-cat">Categoria</label><select id="r-cat">' + opts + '</select>' +
    (id ? '<label>Da quando vale il nuovo importo</label>' + seg([['next', 'Da ' + MESI[+addM(cur, 1).slice(5) - 1] + ' in poi'], ['cur', 'Anche ' + MESI[+cur.slice(5) - 1]]], 'next', 'setScope', 's') + '<p class="mut">Le spese già registrate non cambiano.</p>' : '') +
    '<button class="btn" data-a="saveRic" data-id="' + esc(id || '') + '">Salva</button>' + (id ? '<button class="btn warn" data-a="endRic" data-id="' + esc(id) + '">Termina questa ricorrente</button>' : ''), 'tall');
}
async function saveRic(btn, id) {
  const nome = val('r-nome'), imp = parseNum(val('r-imp')), g = parseInt(val('r-g'), 10), cat = val('r-cat');
  if (!nome) return toast('Inserisci un nome');
  if (!(imp > 0)) return toast('Inserisci un importo');
  if (!(g >= 1 && g <= 31)) return toast('Giorno non valido');
  btn.disabled = true; btn.textContent = 'Salvo…';
  try {
    await api('saveRicorrente', { ric: { id: id || undefined, nome: nome, importo: imp, categoria: cat, giorno: g, attiva: true, applyCurrentMonth: !!id && RS.scope === 'cur' } });
    closeModal(); toast('Ricorrente salvata'); await load(true);
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Salva'; }
}
async function endRic(id) {
  if (!confirm('Terminare questa ricorrente? Lo storico resta.')) return;
  try { await api('endRicorrente', { id: id }); closeModal(); toast('Ricorrente terminata'); await load(true); } catch (e) { toast(e.message); }
}

/* ===================== MODALI ===================== */
function openModal(html, cls) {
  const m = $('#modal');
  m.innerHTML = '<div class="scrim" data-a="closeModal"></div><div class="msheet ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  m.classList.add('on');
}
function closeModal() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; }

function openList(mode) {
  const ym = S.month;
  const arr = (mode === 'uncat' ? D().movimenti.filter(m => m.stato === UNCAT) : D().movimenti.filter(m => m.data.slice(0, 7) === ym))
    .slice().sort((a, b) => (b.data + b.creato).localeCompare(a.data + a.creato));
  openModal('<div class="mh"><span>' + (mode === 'uncat' ? 'Da categorizzare' : 'Movimenti · ' + mLabel(ym)) + '</span><button class="ic d" data-a="closeModal" aria-label="Chiudi">' + I.x + '</button></div>' +
    (arr.length ? arr.map(mrow).join('') : '<p class="mut">Nessun movimento.</p>'), 'tall');
}

/* ----- nuova spesa ----- */
let NM = {};
const chipsFor = g => D().categorie.filter(c => c.gruppo === g && c.attiva && c.nome !== UNCAT).map(c => '<button class="chip" data-a="pickCat" data-c="' + esc(c.nome) + '">' + esc(c.nome) + '</button>').join('');
function openNew() {
  if (!D()) return openSettings();
  NM = { g: 'Variabile', cat: '' };
  openModal(hd('<button class="ic" data-a="closeModal" aria-label="Chiudi">' + I.l + '</button><div class="ttl">NUOVA SPESA</div><span class="sp"></span>', 'Importo (€)', '<input id="n-imp" class="amt" inputmode="decimal" placeholder="0,00" autocomplete="off">', '') +
    sheet(seg([['Variabile', 'Variabile'], ['Fissa', 'Fissa'], ['Annuale', 'Annuale']], 'Variabile', 'setGroup', 'g') +
      '<div class="chips" id="n-chips">' + chipsFor('Variabile') + '</div>' +
      '<label for="n-es">Esercente</label><input id="n-es" placeholder="es. Pizzeria Alla Brace" autocomplete="off"><label for="n-nt">Nota</label><input id="n-nt" placeholder="es. cena" autocomplete="off"><label for="n-dt">Data</label><input id="n-dt" type="date" value="' + today() + '">' +
      '<div class="frow" style="margin-top:12px"><span>Salva posizione</span>' + sw('n-loc', false) + '</div><div class="frow"><span>Pagamento online</span>' + sw('n-onl', false) + '</div>' +
      '<button class="btn" data-a="saveNew">Salva spesa</button>'), 'full');
}
const getPos = () => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error('no geo'));
  navigator.geolocation.getCurrentPosition(p => res(p.coords), rej, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
});
async function saveNew(btn) {
  const imp = parseNum(val('n-imp'));
  if (!(imp > 0)) return toast('Inserisci un importo');
  if (!NM.cat) return toast('Scegli una categoria');
  const es = val('n-es'), nt = val('n-nt'), online = $('#n-onl').checked, loc = $('#n-loc').checked && !online;
  btn.disabled = true; btn.textContent = 'Salvo…';
  let lat, lng;
  if (loc) { try { const p = await getPos(); lat = p.latitude; lng = p.longitude; } catch (e) { toast('Posizione non disponibile: salvo senza'); } }
  try {
    await api('addMovimento', { mov: { data: val('n-dt') || today(), importo: imp, categoria: NM.cat, esercente: es, note: nt, origine: 'Manuale', lat: lat, lng: lng, online: online } });
    closeModal(); toast('Spesa salvata'); await load(true);
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Salva spesa'; }
}

/* ----- modifica movimento ----- */
function openEdit(id) {
  const m = D().movimenti.find(x => x.id === id); if (!m) return;
  const unc = m.stato === UNCAT;
  const opts = (unc ? '<option selected>' + UNCAT + '</option>' : '') + ['Variabile', 'Fissa', 'Annuale'].map(g => '<optgroup label="' + g + '">' +
    D().categorie.filter(c => c.gruppo === g && c.nome !== UNCAT && (c.attiva || c.nome === m.categoria)).map(c => '<option' + (c.nome === m.categoria ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</optgroup>').join('');
  openModal('<div class="mh"><span>Modifica movimento</span><button class="ic d" data-a="closeModal" aria-label="Chiudi">' + I.x + '</button></div>' +
    '<label for="e-imp">Importo (€)</label><input id="e-imp" inputmode="decimal" value="' + dec(m.importo) + '"><label for="e-cat">Categoria</label><select id="e-cat">' + opts + '</select>' +
    '<label for="e-es">Esercente</label><input id="e-es" value="' + esc(m.esercente) + '"><label for="e-nt">Nota</label><input id="e-nt" value="' + esc(m.note) + '"><label for="e-dt">Data</label><input id="e-dt" type="date" value="' + esc(m.data) + '">' +
    (unc ? '<div class="frow" style="margin-top:12px"><span>Ricorda questo esercente</span>' + sw('e-rule', true) + '</div><label for="e-kw">Quando l’esercente contiene</label><input id="e-kw" value="' + esc((m.esercente || '').toLowerCase()) + '">' : '') +
    '<div class="frow" style="margin-top:12px"><span>Pagamento online (senza posizione)</span>' + sw('e-onl', m.online) + '</div>' +
    '<p class="mut">' + esc(m.origine || '') + (m.lat != null ? ' · con posizione' : '') + '</p>' +
    '<button class="btn" data-a="saveEdit" data-id="' + esc(id) + '">Salva</button><button class="btn warn" data-a="delMov" data-id="' + esc(id) + '">Elimina movimento</button>', 'tall');
}
async function saveEdit(btn, id) {
  const m = D().movimenti.find(x => x.id === id); if (!m) return;
  const imp = parseNum(val('e-imp')); if (!(imp > 0)) return toast('Inserisci un importo');
  const ch = {};
  if (Math.abs(imp - m.importo) >= 0.005) ch.importo = imp;
  const dt = val('e-dt'); if (dt && dt !== m.data) ch.data = dt;
  const cat = val('e-cat'); if (cat !== m.categoria) ch.categoria = cat;
  const es = val('e-es'), nt = val('e-nt');
  if (es !== (m.esercente || '')) ch.esercente = es;
  if (nt !== (m.note || '')) ch.note = nt;
  const onl = $('#e-onl').checked;
  if (onl !== m.online) { ch.online = onl; if (onl) { ch.lat = ''; ch.lng = ''; } }
  btn.disabled = true; btn.textContent = 'Salvo…';
  try {
    if (Object.keys(ch).length) await api('updateMovimento', { id: id, changes: ch });
    const ru = document.getElementById('e-rule'), kw = val('e-kw');
    if (ru && ru.checked && ch.categoria && kw) await api('saveRegola', { regola: { parola: kw, categoria: cat, nota: nt || es, online: onl } });
    closeModal(); toast('Modifiche salvate'); await load(true);
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Salva'; }
}
async function delMov(id) {
  if (!confirm('Eliminare questo movimento?')) return;
  try { await api('deleteMovimento', { id: id }); closeModal(); hideCard(); toast('Movimento eliminato'); await load(true); } catch (e) { toast(e.message); }
}

/* ----- impostazioni ----- */
function insets() {
  const p = document.createElement('div');
  p.style.cssText = 'position:absolute;visibility:hidden;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)';
  document.body.appendChild(p);
  const cs = getComputedStyle(p), r = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
  document.body.removeChild(p);
  return r;
}
function fitViewport() {
  const t = insets().t, gap = Math.max(0, screen.height - window.innerHeight);
  document.documentElement.classList.toggle('gap', !!navigator.standalone && t > 0 && gap >= t - 2);
}
function vh(u) {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;visibility:hidden;height:' + u;
  document.body.appendChild(d); const h = d.offsetHeight; document.body.removeChild(d); return h;
}
function diag() {
  fitViewport();
  const i = insets(), vv = window.visualViewport ? Math.round(window.visualViewport.height) : '-';
  return 'Schermo ' + window.innerWidth + '×' + window.innerHeight + ' (dispositivo ' + screen.width + '×' + screen.height + ') · margini sicuri alto ' + i.t + 'px basso ' + i.b + 'px · ' +
    (navigator.standalone ? 'app installata' : 'Safari') + (document.documentElement.classList.contains('gap') ? ' · fascia in basso attiva' : ' · fascia in basso non attiva') +
    ' · vh ' + vh('100vh') + '/' + vh('100lvh') + '/' + vh('100dvh') + ' · vv ' + vv + ' · v6';
}
function openSettings() {
  const cf = D() ? (D().config || {}) : null;
  openModal('<div class="mh"><span>Impostazioni</span><button class="ic d" data-a="closeModal" aria-label="Chiudi">' + I.x + '</button></div>' +
    '<label for="s-url">URL dello script (finisce con /exec)</label><input id="s-url" type="url" autocapitalize="off" autocorrect="off" value="' + esc(localStorage.getItem(LS.url) || '') + '">' +
    '<label for="s-key">Chiave segreta</label><input id="s-key" type="password" autocapitalize="off" autocorrect="off" value="' + esc(localStorage.getItem(LS.key) || '') + '">' +
    '<h4>Mappa</h4><label>Stile</label>' + seg(Object.keys(MAPSTYLES).map(k => [k, MAPSTYLES[k].n]), mapPref().style, 'mapStyle', 'v') +
    '<div class="frow"><span>Raggruppa i pallini vicini</span>' + sw('m-cl', mapPref().cluster) + '</div>' +
    (cf ? '<h4>Budget e obiettivi</h4>' + CFG_KEYS.map((k, i) => '<label for="c' + i + '">' + k + ' (€)</label><input id="c' + i + '" data-p="' + k + '" inputmode="decimal" value="' + dec(cf[k] == null ? '' : cf[k]) + '">').join('') +
      '<h4>Nuova regola esercente</h4><label for="rg-p">Quando l’esercente contiene</label><input id="rg-p" autocapitalize="off"><label for="rg-c">Categoria</label><select id="rg-c">' +
      D().categorie.filter(c => c.attiva && c.nome !== UNCAT).map(c => '<option>' + esc(c.nome) + '</option>').join('') + '</select><label for="rg-n">Nota (facoltativa)</label><input id="rg-n"><div class="frow" style="margin-top:8px"><span>Esercente online</span>' + sw('rg-o', false) + '</div><button class="btn ghost" data-a="saveRule">Aggiungi regola</button><p class="mut">Regole attive: ' + (D().regole.length ? D().regole.map(r => esc(r.parola) + ' → ' + esc(r.categoria)).join(' · ') : 'nessuna') + '</p>' : '') +
    '<button class="btn" data-a="saveSet">Salva</button><button class="btn warn" data-a="logout">Disconnetti questo iPhone</button><p class="mut" style="font-size:11px">' + diag() + '</p>', 'tall');
}
async function saveSet(btn) {
  const url = val('s-url'), key = val('s-key');
  if (!/^https:\/\/script\.google\.com\//.test(url)) return toast('L’URL deve iniziare con https://script.google.com/');
  if (!key) return toast('Inserisci la chiave');
  localStorage.setItem(LS.url, url); localStorage.setItem(LS.key, key);
  btn.disabled = true; btn.textContent = 'Salvo…';
  try {
    if (D()) {
      const ins = document.querySelectorAll('#modal input[data-p]');
      for (let i = 0; i < ins.length; i++) {
        const n = parseNum(ins[i].value), old = Number((D().config || {})[ins[i].dataset.p]);
        if (!isNaN(n) && n !== old) await api('setConfig', { parametro: ins[i].dataset.p, valore: n });
      }
    }
    closeModal(); await load(false); toast('Impostazioni salvate');
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Salva'; }
}
async function saveRule(btn) {
  const p = val('rg-p'); if (!p) return toast('Inserisci la parola chiave');
  btn.disabled = true;
  try { await api('saveRegola', { regola: { parola: p, categoria: val('rg-c'), nota: val('rg-n'), online: $('#rg-o').checked } }); toast('Regola salvata'); await load(true); openSettings(); }
  catch (e) { toast(e.message); btn.disabled = false; }
}
function logout() {
  if (!confirm('Rimuovere URL, chiave e dati da questo iPhone?')) return;
  Object.keys(LS).forEach(k => localStorage.removeItem(LS[k]));
  S.data = null; closeModal(); render(); openSettings();
}

/* ===================== MAPPA ===================== */
const OSM = { u: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', a: '&copy; OpenStreetMap contributors' };
const MAPSTYLES = { chiaro: { n: 'Minimal', u: 'https://tiles.openfreemap.org/styles/positron' }, standard: { n: 'Dettagliata', u: 'https://tiles.openfreemap.org/styles/liberty' }, scuro: { n: 'Scura', u: 'https://tiles.openfreemap.org/styles/dark' } };
const OFM_ATTR = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const mapPref = () => ({ style: localStorage.getItem('fin_mstyle') || 'chiaro', cluster: localStorage.getItem('fin_mcluster') !== '0' });
let MAP = null, GROUP = null, TILE = null, lastCard = 0;
function applyTiles() {
  if (!MAP) return;
  if (TILE) MAP.removeLayer(TILE);
  const k = MAPSTYLES[mapPref().style] ? mapPref().style : 'chiaro', el = MAP.getContainer();
  Object.keys(MAPSTYLES).forEach(x => el.classList.remove('st-' + x));
  el.classList.add('st-' + k);
  el.classList.remove('fb');
  if (L.maplibreGL && window.maplibregl) {
    try { TILE = L.maplibreGL({ style: MAPSTYLES[k].u, attribution: OFM_ATTR }).addTo(MAP); return; } catch (e) { TILE = null; }
  }
  el.classList.add('fb'); // ripiego: tasselli OpenStreetMap con filtro CSS
  TILE = L.tileLayer(OSM.u, { maxZoom: 19, attribution: OSM.a }).addTo(MAP);
  if (TILE.bringToBack) TILE.bringToBack();
}
function initMap() {
  if (MAP || !window.L) return;
  MAP = L.map('map', { zoomControl: false }).setView([41.9, 12.5], 6);
  applyTiles();
  MAP.on('click', () => { if (Date.now() - lastCard > 500) hideCard(); });
}
function inPeriod(m) {
  const now = today().slice(0, 7);
  if (S.mp === 'month') return m.data.slice(0, 7) === now;
  if (S.mp === 'prev') return m.data.slice(0, 7) === addM(now, -1);
  if (S.mp === 'since') return m.data >= SINCE;
  return m.data >= (S.mfrom || '0000') && m.data <= (S.mto || '9999');
}
function hideCard() { const c = $('#mapcard'); if (c) c.hidden = true; }
function showCard(m) {
  const c = $('#mapcard'), cat = catBy(m.categoria);
  c.innerHTML = '<div class="r2" style="font-size:18px;font-family:\'Chakra Petch\',sans-serif"><span>' + esc(m.esercente || m.note || m.categoria) + '</span><span>' + money(m.importo) + '</span></div><small><span style="color:' + cat.colore + '">●</span> ' + esc(m.categoria) + ' · ' + dFull(m.data) + ' · ' + esc(m.origine || '') + '</small>' +
    (m.note && m.note !== m.esercente ? '<small>Nota: ' + esc(m.note) + '</small>' : '') +
    '<div class="btns"><button class="btn" data-a="mapEdit" data-id="' + esc(m.id) + '">Modifica</button><button class="btn ghost" data-a="mapClose">Chiudi</button></div>';
  c.hidden = false;
}
function drawMap(fit) {
  const ui = $('#mapui'); if (!ui) return;
  if (!window.L) { ui.innerHTML = '<div class="crow"><span class="chip on">Mappa non disponibile: serve la connessione</span></div>'; return; }
  initMap();
  if (!D()) { ui.innerHTML = ''; return; }
  const geo = D().movimenti.filter(m => m.tipo !== 'Entrata' && m.lat != null && m.lng != null);
  const cats = Array.from(new Set(geo.map(m => m.categoria)));
  const per = [['month', 'Questo mese'], ['prev', 'Mese scorso'], ['since', 'Dal 1° set'], ['range', 'Intervallo']];
  ui.innerHTML = '<div class="crow">' + per.map(p => '<button class="chip ' + (S.mp === p[0] ? 'on' : '') + '" data-a="mapPer" data-p="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>' +
    (S.mp === 'range' ? '<div class="crow"><input type="date" id="m-from" aria-label="Dal" value="' + esc(S.mfrom) + '"><input type="date" id="m-to" aria-label="Al" value="' + esc(S.mto) + '"></div>' : '') +
    '<div class="crow"><button class="chip ' + (S.mcat === '' ? 'on' : '') + '" data-a="mapCat" data-c="">Tutte</button>' + cats.map(c => '<button class="chip ' + (S.mcat === c ? 'on' : '') + '" data-a="mapCat" data-c="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
  if (GROUP) MAP.removeLayer(GROUP);
  GROUP = mapPref().cluster
    ? L.markerClusterGroup({ showCoverageOnHover: false, iconCreateFunction: c => L.divIcon({ html: '<div class="cl">' + c.getChildCount() + '</div>', className: '', iconSize: [38, 38] }) })
    : L.featureGroup();
  const pts = geo.filter(m => inPeriod(m) && (!S.mcat || m.categoria === S.mcat));
  pts.forEach(m => {
    const k = L.circleMarker([m.lat, m.lng], { radius: 11, color: '#fff', weight: 2.5, fillColor: catBy(m.categoria).colore, fillOpacity: 1, bubblingMouseEvents: false });
    k.on('click', () => { lastCard = Date.now(); showCard(m); }); GROUP.addLayer(k);
  });
  MAP.addLayer(GROUP);
  if (fit && pts.length) MAP.fitBounds(GROUP.getBounds().pad(0.2), { maxZoom: 16 });
  if (!pts.length && fit) toast('Nessun pagamento con posizione in questo periodo');
}

/* ===================== navigazione ===================== */
function render() {
  renderHome(); renderPat(); renderRic();
  if (S.tab === 'map') drawMap(false);
}
function go(t) {
  S.tab = t; hideCard();
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'scr-' + t));
  document.querySelectorAll('#tabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  if (t === 'map') { drawMap(true); setTimeout(() => { if (MAP) MAP.invalidateSize(); }, 80); }
}
const A = {
  prevM() { S.month = addM(S.month, -1); renderHome(); }, nextM() { S.month = addM(S.month, 1); renderHome(); },
  settings: openSettings, refresh() { load(false); }, closeModal: closeModal,
  listAll() { openList('month'); }, listUncat() { openList('uncat'); },
  editMov(b) { openEdit(b.dataset.id); }, mapEdit(b) { openEdit(b.dataset.id); }, mapClose: hideCard,
  newMov: openNew,
  setGroup(b) {
    NM.g = b.dataset.g; NM.cat = '';
    b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('#n-chips').innerHTML = chipsFor(NM.g);
  },
  pickCat(b) { NM.cat = b.dataset.c; b.parentNode.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); },
  saveNew(b) { saveNew(b); }, saveEdit(b) { saveEdit(b, b.dataset.id); }, delMov(b) { delMov(b.dataset.id); },
  snap: openSnap, saveSnap(b) { saveSnap(b); },
  editRic(b) { openRic(b.dataset.id); }, newRic() { openRic(''); },
  setScope(b) { RS.scope = b.dataset.s; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); },
  saveRic(b) { saveRic(b, b.dataset.id); }, endRic(b) { endRic(b.dataset.id); },
  saveSet(b) { saveSet(b); }, saveRule(b) { saveRule(b); }, logout: logout,
  mapStyle(b) { localStorage.setItem('fin_mstyle', b.dataset.v); b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); applyTiles(); },
  mapPer(b) { S.mp = b.dataset.p; drawMap(true); }, mapCat(b) { S.mcat = b.dataset.c; drawMap(true); }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && A[b.dataset.a]) { e.preventDefault(); A[b.dataset.a](b); return; }
  const t = e.target.closest('[data-t]'); if (t) go(t.dataset.t);
});
document.addEventListener('change', e => {
  if (e.target.id === 'm-from') { S.mfrom = e.target.value; drawMap(true); }
  if (e.target.id === 'm-to') { S.mto = e.target.value; drawMap(true); }
  if (e.target.id === 'm-cl') { localStorage.setItem('fin_mcluster', e.target.checked ? '1' : '0'); if (MAP) drawMap(false); }
});
document.addEventListener('visibilitychange', () => { fitViewport(); if (!document.hidden && localStorage.getItem(LS.key) && Date.now() - S.last > 60000) load(true); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

fitViewport();
['resize', 'orientationchange', 'pageshow', 'load'].forEach(ev => window.addEventListener(ev, fitViewport));
if (window.visualViewport) window.visualViewport.addEventListener('resize', fitViewport);
[200, 800, 2000].forEach(ms => setTimeout(fitViewport, ms));
render();
if (localStorage.getItem(LS.url) && localStorage.getItem(LS.key)) load(true); else openSettings();
