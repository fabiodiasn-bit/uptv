const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'leituras:v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtD = (s, withYear) => s ? parseD(s).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).replace('.', '') : '';
const fmtR = r => String(r).replace('.', ',');

let db = load();
let year = new Date().getFullYear();

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.books)) return { profile: { name: '', bio: '', photo: '', favorites: [], ...d.profile }, books: d.books }; } catch {}
  return { profile: { name: '', bio: '', photo: '', favorites: [] }, books: [] };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { toast('Não foi possível salvar: armazenamento cheio.'); } }
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }

/* ---------- domain ---------- */
const getBook = id => db.books.find(b => b.id === id);
const lastPage = b => (b.log || []).reduce((m, e) => Math.max(m, e.page || 0), 0);
const pct = b => b.pages ? Math.min(100, Math.round(lastPage(b) / b.pages * 100)) : 0;
const bookYear = b => Number((b.status === 'read' ? (b.finishedAt || b.addedAt) : (b.startedAt || b.addedAt)).slice(0, 4));
const avg = list => { const r = list.filter(b => b.rating > 0); return r.length ? (r.reduce((s, b) => s + b.rating, 0) / r.length) : 0; };
const stars = (r, cls = '') => `<span class="stars ${cls}" role="img" aria-label="${r} de 5 estrelas">${[0,1,2,3,4].map(i => `<i style="--f:${Math.max(0, Math.min(1, r - i)) * 100}%">★</i>`).join('')}</span>`;
const avatar = (cls = '') => db.profile.photo
  ? `<span class="avatar ${cls}"><img src="${db.profile.photo}" alt=""></span>`
  : `<span class="avatar ${cls}">${esc((db.profile.name || 'L').trim()[0].toUpperCase())}</span>`;

/* ---------- views ---------- */
function header() {
  return `<header class="top"><a class="brand" href="#/">Leituras</a>
    <a class="me" href="#/perfil">${esc(db.profile.name || 'Seu perfil')}${avatar()}</a></header>`;
}

function rowRead(b) {
  return `<a class="row" href="#/livro/${b.id}"><div><div class="t">${esc(b.title)}</div><div class="a">${esc(b.author)}</div></div>
    <div class="r">${b.rating > 0 ? stars(b.rating) + '<br>' : ''}${fmtD(b.finishedAt)}</div></a>`;
}

function home() {
  const years = [...new Set([new Date().getFullYear(), ...db.books.map(bookYear)])].sort((a, b) => b - a);
  const min = years[years.length - 1], max = years[0];
  if (year > max) year = max; if (year < min) year = min;
  const reading = db.books.filter(b => b.status === 'reading');
  const read = db.books.filter(b => b.status === 'read' && bookYear(b) === year).sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''));
  const want = db.books.filter(b => b.status === 'want');
  const pages = read.reduce((s, b) => s + (b.pages || 0), 0);
  const a = avg(read);
  return `${header()}<main class="view">
    <div class="year">
      <button class="arrow" data-year="-1" aria-label="Ano anterior" ${year <= min ? 'disabled style="opacity:.25;cursor:default"' : ''}>‹</button>
      <span class="y">${year}</span>
      <button class="arrow" data-year="1" aria-label="Próximo ano" ${year >= max ? 'disabled style="opacity:.25;cursor:default"' : ''}>›</button>
    </div>
    <div class="stats">
      <div class="stat"><b>${read.length}</b><span>${read.length === 1 ? 'livro lido' : 'livros lidos'}</span></div>
      <div class="stat"><b>${pages.toLocaleString('pt-BR')}</b><span>páginas</span></div>
      <div class="stat"><b>${a ? fmtR(a.toFixed(1)) : '—'}</b><span>nota média</span></div>
    </div>

    ${reading.length ? `<section class="sec"><p class="eyebrow">Lendo agora</p><div class="list">
      ${reading.map(b => `<a class="row" href="#/livro/${b.id}"><div style="flex:1"><div class="t">${esc(b.title)}</div><div class="a">${esc(b.author)}</div>
        ${b.pages ? `<div class="bar"><i style="width:${pct(b)}%"></i></div>` : ''}</div>
        <div class="r">${b.pages ? pct(b) + '%' : lastPage(b) ? 'pág. ' + lastPage(b) : ''}</div></a>`).join('')}</div></section>` : ''}

    <section class="sec"><p class="eyebrow">Lidos em ${year}</p>
      ${read.length ? `<div class="list">${read.map(rowRead).join('')}</div>` : `<div class="empty">Nenhuma leitura concluída ainda.</div>`}</section>

    ${want.length ? `<section class="sec"><p class="eyebrow">Para ler</p><div class="list">
      ${want.map(b => `<a class="row" href="#/livro/${b.id}"><div><div class="t">${esc(b.title)}</div><div class="a">${esc(b.author)}</div></div></a>`).join('')}</div></section>` : ''}

    <div class="actions" style="margin-top:56px"><button class="btn" id="add">Novo livro</button></div>
  </main>`;
}

function bookView(id) {
  const b = getBook(id);
  if (!b) return `${header()}<main class="view"><p class="empty">Livro não encontrado.</p><a class="link" href="#/">Voltar</a></main>`;
  const label = { want: 'Para ler', reading: 'Lendo', read: 'Lido' }[b.status];
  const log = [...(b.log || [])].sort((x, y) => y.date.localeCompare(x.date) || y.id.localeCompare(x.id));
  const meta = [b.pages ? b.pages + ' páginas' : '', b.startedAt ? 'iniciado em ' + fmtD(b.startedAt, true) : '', b.status === 'read' && b.finishedAt ? 'concluído em ' + fmtD(b.finishedAt, true) : ''].filter(Boolean).join(' · ');
  return `<a class="back" href="#/">← Voltar</a><main class="view">
    <span class="chip">${label}</span>
    <h1>${esc(b.title)}</h1>
    ${b.author ? `<p class="by">${esc(b.author)}</p>` : ''}
    ${meta ? `<p class="meta">${meta}</p>` : ''}

    ${b.status === 'read' ? `<section class="sec" style="margin-top:36px">
      <div>${stars(b.rating || 0, 'big')} <span class="muted" style="margin-left:8px;font-size:13px">${b.rating > 0 ? fmtR(b.rating) + ' de 5' : 'sem nota'}</span></div>
      ${b.review ? `<p class="review">${esc(b.review)}</p>` : `<p class="empty" style="padding-left:0">Ainda sem resenha.</p>`}
      <div class="actions"><button class="btn ghost" id="finish">${b.review || b.rating ? 'Editar resenha' : 'Escrever resenha'}</button></div></section>` : ''}

    ${b.status === 'want' ? `<div class="actions"><button class="btn" id="start">Começar a ler</button></div>` : ''}

    ${b.status === 'reading' ? `<section class="sec" style="margin-top:36px">
      ${b.pages ? `<div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>${lastPage(b)} de ${b.pages} páginas</span><span>${pct(b)}%</span></div><div class="bar" style="height:3px"><i style="width:${pct(b)}%"></i></div>` : ''}
      <form id="logf" class="quick" style="margin-top:28px">
        <div><label for="lp">Página</label><input id="lp" type="number" min="0" inputmode="numeric" placeholder="${lastPage(b) || ''}"></div>
        <div><label for="ln">Como está sendo?</label><input id="ln" type="text" placeholder="Uma anotação, uma citação…"></div>
        <button class="btn" type="submit">Registrar</button>
      </form></section>` : ''}

    ${log.length ? `<section class="sec"><p class="eyebrow">Histórico de leitura</p><ul class="log">
      ${log.map(e => `<li><div class="d"><span>${fmtD(e.date, true)}</span>${e.page ? `<span>· pág. ${e.page}</span>` : ''}<button class="x" data-del="${e.id}" aria-label="Remover registro">✕</button></div>${e.note ? `<div class="n">${esc(e.note)}</div>` : ''}</li>`).join('')}</ul></section>` : ''}

    <div class="actions" style="margin-top:48px">
      ${b.status === 'reading' ? `<button class="btn" id="finish">Concluí a leitura</button>` : ''}
      <button class="link" id="edit">Editar livro</button>
    </div>
  </main>`;
}

function profileView() {
  const p = db.profile, read = db.books.filter(b => b.status === 'read');
  const favs = (p.favorites || []).map(getBook).filter(Boolean);
  const byYear = {}; read.forEach(b => { const y = bookYear(b); byYear[y] = (byYear[y] || 0) + 1; });
  const a = avg(read);
  return `<a class="back" href="#/">← Voltar</a><main class="view">
    <div class="hero">${avatar('lg')}<div><h1>${esc(p.name || 'Seu nome')}</h1>${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}</div></div>
    <div class="actions"><button class="btn ghost" id="editp">Editar perfil</button></div>
    <div class="stats" style="margin-top:36px">
      <div class="stat"><b>${read.length}</b><span>livros lidos</span></div>
      <div class="stat"><b>${read.reduce((s, b) => s + (b.pages || 0), 0).toLocaleString('pt-BR')}</b><span>páginas</span></div>
      <div class="stat"><b>${a ? fmtR(a.toFixed(1)) : '—'}</b><span>nota média</span></div>
    </div>
    <section class="sec"><p class="eyebrow">Favoritos</p>
      ${favs.length ? `<ol class="favs">${favs.map(b => `<li><a href="#/livro/${b.id}">${esc(b.title)}</a><span class="muted" style="font-size:13px">${esc(b.author)}</span></li>`).join('')}</ol>` : `<div class="empty">Escolha até cinco livros em “Editar perfil”.</div>`}</section>
    ${Object.keys(byYear).length ? `<section class="sec"><p class="eyebrow">Ano a ano</p><div class="list">
      ${Object.keys(byYear).sort((x, y) => y - x).map(y => `<div class="row" style="cursor:pointer" data-goyear="${y}"><span class="t">${y}</span><span class="r">${byYear[y]} ${byYear[y] === 1 ? 'livro' : 'livros'}</span></div>`).join('')}</div></section>` : ''}
    <section class="sec"><p class="eyebrow">Seus dados</p>
      <p class="muted" style="margin:0 0 14px;font-size:13px;max-width:46ch">Tudo fica salvo neste aparelho, neste navegador. Exporte um backup de tempos em tempos, ou para levar seu perfil para outro aparelho.</p>
      <div class="actions" style="margin-top:0"><button class="btn ghost" id="exp">Exportar backup</button><button class="btn ghost" id="imp">Importar backup</button><input type="file" id="impf" accept="application/json" hidden></div></section>
  </main>`;
}

/* ---------- dialogs ---------- */
const dlg = $('#dlg');
function openDlg(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); return dlg; }
function closeDlg() { if (dlg.open) dlg.close(); }
dlg.addEventListener('click', e => { if (e.target === dlg) closeDlg(); });

function ratingInput(v) { return `<div class="stars input" id="ri" data-v="${v}" role="slider" aria-label="Nota" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${v}" tabindex="0">${[0,1,2,3,4].map(i => `<i style="--f:${Math.max(0, Math.min(1, v - i)) * 100}%">★</i>`).join('')}</div><span class="muted" id="rv" style="margin-left:12px;font-size:13px">${v > 0 ? fmtR(v) + ' de 5' : 'toque para dar nota'}</span>`; }
function wireRating(root) {
  const el = $('#ri', root), out = $('#rv', root);
  const set = v => { el.dataset.v = v; el.setAttribute('aria-valuenow', v); [...el.children].forEach((c, i) => c.style.setProperty('--f', Math.max(0, Math.min(1, v - i)) * 100 + '%')); out.textContent = v > 0 ? fmtR(v) + ' de 5' : 'toque para dar nota'; };
  el.addEventListener('click', e => {
    const r = el.getBoundingClientRect();
    let v = Math.ceil(Math.max(0.01, Math.min(1, (e.clientX - r.left) / r.width)) * 10) / 2;
    set(v === Number(el.dataset.v) ? 0 : v);
  });
  el.addEventListener('keydown', e => {
    const c = Number(el.dataset.v);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(Math.min(5, c + .5)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(Math.max(0, c - .5)); }
  });
}

function bookDialog(id) {
  const b = id ? getBook(id) : { title: '', author: '', pages: '', status: 'reading', finishedAt: today() };
  const d = openDlg(`<form id="bf"><h2>${id ? 'Editar livro' : 'Novo livro'}</h2>
    <label for="bt">Título</label><input id="bt" type="text" required value="${esc(b.title)}" autocomplete="off">
    <label for="ba">Autor(a)</label><input id="ba" type="text" value="${esc(b.author)}" autocomplete="off">
    <div class="two"><div><label for="bp">Páginas</label><input id="bp" type="number" min="1" inputmode="numeric" value="${b.pages || ''}"></div>
    <div><label for="bs">Situação</label><select id="bs"><option value="reading">Lendo</option><option value="want">Quero ler</option><option value="read">Já li</option></select></div></div>
    <div id="bdw"><label for="bd">Concluído em</label><input id="bd" type="date" value="${b.finishedAt || today()}"></div>
    <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" id="cx">Cancelar</button>
    ${id ? `<button class="btn danger" type="button" id="rm" style="margin-left:auto">Excluir</button>` : ''}</div></form>`);
  const s = $('#bs', d); s.value = b.status;
  const sync = () => { $('#bdw', d).style.display = s.value === 'read' ? '' : 'none'; }; sync(); s.onchange = sync;
  $('#cx', d).onclick = closeDlg;
  if (id) $('#rm', d).onclick = () => {
    if (!confirm(`Excluir “${b.title}” e todo o seu histórico?`)) return;
    db.books = db.books.filter(x => x.id !== id); db.profile.favorites = db.profile.favorites.filter(f => f !== id);
    save(); closeDlg(); location.hash = '#/';
  };
  $('#bf', d).onsubmit = e => {
    e.preventDefault();
    const status = s.value, t = today();
    const data = { title: $('#bt', d).value.trim(), author: $('#ba', d).value.trim(), pages: Number($('#bp', d).value) || 0 };
    if (!data.title) return;
    let nb = b;
    if (id) Object.assign(b, data); else { nb = { id: uid(), addedAt: t, log: [], rating: 0, review: '', ...data }; db.books.push(nb); }
    if (status !== nb.status || !id) {
      nb.status = status;
      if (status === 'reading' && !nb.startedAt) nb.startedAt = t;
    }
    if (nb.status === 'read') nb.finishedAt = $('#bd', d).value || t;
    save(); closeDlg(); if (id) render(); else location.hash = '#/livro/' + nb.id;
    if (!id) render();
  };
  $('#bt', d).focus();
}

function finishDialog(id) {
  const b = getBook(id), wasRead = b.status === 'read';
  const d = openDlg(`<form id="ff"><h2>${wasRead ? 'Sua resenha' : 'Leitura concluída'}</h2><p class="muted" style="margin:0 0 18px;font-family:var(--serif);font-size:19px;font-style:italic">${esc(b.title)}</p>
    <div>${ratingInput(b.rating || 0)}</div>
    <label for="fr">O que você achou?</label><textarea id="fr" placeholder="Escreva do seu jeito…">${esc(b.review)}</textarea>
    <label for="fd">Concluído em</label><input id="fd" type="date" value="${b.finishedAt || today()}">
    <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" id="cx">${wasRead ? 'Cancelar' : 'Ainda não'}</button></div></form>`);
  wireRating(d); $('#cx', d).onclick = closeDlg;
  $('#ff', d).onsubmit = e => {
    e.preventDefault();
    b.rating = Number($('#ri', d).dataset.v) || 0; b.review = $('#fr', d).value.trim();
    b.status = 'read'; b.finishedAt = $('#fd', d).value || today();
    if (b.pages && lastPage(b) < b.pages) { /* keep log as is */ }
    save(); closeDlg(); render(); toast(wasRead ? 'Resenha salva' : 'Leitura concluída ✓');
  };
}

function profileDialog() {
  const p = db.profile; let photo = p.photo;
  const opts = sel => `<option value="">—</option>` + db.books.map(b => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${esc(b.title)}</option>`).join('');
  const d = openDlg(`<form id="pf"><h2>Seu perfil</h2>
    <div class="photo"><span id="ph"></span><div><button class="btn ghost" type="button" id="pickph">Escolher foto</button> <button class="link" type="button" id="rmph">remover</button><input type="file" id="phf" accept="image/*" hidden></div></div>
    <label for="pn">Nome</label><input id="pn" type="text" value="${esc(p.name)}" autocomplete="off">
    <label for="pb">Sobre você</label><textarea id="pb" style="min-height:64px" placeholder="Uma frase sobre suas leituras">${esc(p.bio)}</textarea>
    <label>Top livros favoritos</label>
    ${[0,1,2,3,4].map(i => `<select class="fv" style="margin-bottom:4px" aria-label="Favorito ${i + 1}">${opts((p.favorites || [])[i])}</select>`).join('')}
    ${db.books.length ? '' : '<p class="muted" style="font-size:12px">Adicione livros à sua biblioteca para escolhê-los aqui.</p>'}
    <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" id="cx">Cancelar</button></div></form>`);
  const showPh = () => { $('#ph', d).innerHTML = photo ? `<span class="avatar lg"><img src="${photo}" alt=""></span>` : `<span class="avatar lg">${esc(($('#pn', d).value || 'L').trim()[0]?.toUpperCase() || 'L')}</span>`; };
  showPh();
  $('#pickph', d).onclick = () => $('#phf', d).click();
  $('#rmph', d).onclick = () => { photo = ''; showPh(); };
  $('#phf', d).onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const S = 320, c = document.createElement('canvas'); c.width = c.height = S;
      const m = Math.min(img.width, img.height), sx = (img.width - m) / 2, sy = (img.height - m) / 2;
      c.getContext('2d').drawImage(img, sx, sy, m, m, 0, 0, S, S);
      photo = c.toDataURL('image/jpeg', .85); URL.revokeObjectURL(url); showPh();
    };
    img.onerror = () => toast('Não consegui abrir essa imagem'); img.src = url;
  };
  $('#cx', d).onclick = closeDlg;
  $('#pf', d).onsubmit = e => {
    e.preventDefault();
    p.name = $('#pn', d).value.trim(); p.bio = $('#pb', d).value.trim(); p.photo = photo;
    p.favorites = [...new Set([...d.querySelectorAll('.fv')].map(s => s.value).filter(Boolean))];
    save(); closeDlg(); render();
  };
}

/* ---------- events ---------- */
function bind() {
  const app = $('#app');
  app.querySelectorAll('[data-year]').forEach(b => b.onclick = () => { if (b.disabled) return; year += Number(b.dataset.year); render(); });
  app.querySelectorAll('[data-goyear]').forEach(r => r.onclick = () => { year = Number(r.dataset.goyear); location.hash = '#/'; });
  const on = (id, fn) => { const el = $(id, app); if (el) el.onclick = fn; };
  const id = (location.hash.match(/^#\/livro\/(.+)$/) || [])[1];
  on('#add', () => bookDialog());
  on('#edit', () => bookDialog(id));
  on('#finish', () => finishDialog(id));
  on('#editp', profileDialog);
  on('#start', () => { const b = getBook(id); b.status = 'reading'; b.startedAt = b.startedAt || today(); save(); render(); });
  on('#exp', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
    a.download = `leituras-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  on('#imp', () => $('#impf', app).click());
  const impf = $('#impf', app);
  if (impf) impf.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || !Array.isArray(d.books)) throw 0;
      if (!confirm('Importar este backup vai substituir os dados atuais. Continuar?')) return;
      localStorage.setItem(KEY, JSON.stringify(d)); db = load(); render(); toast('Backup importado');
    } catch { toast('Arquivo de backup inválido'); }
  };
  const lf = $('#logf', app);
  if (lf) lf.onsubmit = e => {
    e.preventDefault();
    const b = getBook(id), page = Number($('#lp', app).value) || 0, note = $('#ln', app).value.trim();
    if (!page && !note) { $('#lp', app).focus(); return; }
    b.log = b.log || []; b.log.push({ id: uid(), date: today(), page, note });
    save(); render(); toast('Registrado');
  };
  app.querySelectorAll('[data-del]').forEach(x => x.onclick = () => {
    const b = getBook(id); b.log = b.log.filter(e => e.id !== x.dataset.del); save(); render();
  });
}

function render() {
  const h = location.hash;
  let m;
  const app = $('#app');
  if (h === '#/perfil') app.innerHTML = profileView();
  else if ((m = h.match(/^#\/livro\/(.+)$/))) app.innerHTML = bookView(m[1]);
  else app.innerHTML = home();
  bind();
}
let lastHash = null;
addEventListener('hashchange', () => { render(); if (location.hash !== lastHash) scrollTo(0, 0); lastHash = location.hash; });
render();
