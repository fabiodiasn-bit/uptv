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
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.books)) return { profile: { name: '', bio: '', photo: '', favorites: [], ...d.profile }, books: d.books, seeded: !!d.seeded }; } catch {}
  return { profile: { name: '', bio: '', photo: '', favorites: [] }, books: [], seeded: false };
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

/* ---------- sample data ---------- */
const SAMPLE = [
  { title: 'Dom Casmurro', author: 'Machado de Assis', pages: 256, status: 'read', startedAt: '2026-01-04', finishedAt: '2026-01-19', rating: 4.5,
    review: 'Bentinho me enganou do começo ao fim, e foi delicioso cair nessa. A dúvida sobre Capitu fica rodando na cabeça muito depois do ponto final.',
    synopsis: 'Já mais velho, Bento Santiago decide escrever a própria história: o amor de infância por Capitu, a vida no seminário, o casamento e o ciúme que consome tudo. Um clássico da literatura brasileira sobre memória, desconfiança e a dúvida que nunca se resolve.',
    toc: 'Livro curto, dividido em 148 capítulos breves\nAbre com “Do título” e “Do livro”\nO ciúme cresce a partir da metade da obra\nO último capítulo é “Volta ao princípio”',
    log: [{ date: '2026-01-04', page: 40, note: 'A narração é irônica e envolvente.' }, { date: '2026-01-11', page: 140, note: 'Capitu e Bentinho já são adultos.' }, { date: '2026-01-19', page: 256, note: 'Terminei. Preciso conversar com alguém sobre esse final.' }] },
  { title: 'A Metamorfose', author: 'Franz Kafka', pages: 96, status: 'read', startedAt: '2026-02-02', finishedAt: '2026-02-05', rating: 4,
    review: 'Curtíssimo e desconfortável, do jeito certo. Fala de solidão e de como a família pode tratar quem deixa de ser útil.',
    synopsis: 'Certa manhã, o caixeiro-viajante Gregor Samsa acorda transformado num inseto gigante. A partir daí, a novela acompanha a reação da família e o isolamento de Gregor dentro do próprio quarto.',
    toc: 'Parte I\nParte II\nParte III',
    log: [{ date: '2026-02-02', page: 30, note: 'A primeira cena já pega pelo absurdo.' }, { date: '2026-02-05', page: 96, note: 'Final seco e inesquecível.' }] },
  { title: 'O Pequeno Príncipe', author: 'Antoine de Saint-Exupéry', pages: 96, status: 'read', startedAt: '2026-03-10', finishedAt: '2026-03-11', rating: 5,
    review: 'Reli e foi outro livro. Cada capítulo tem uma frase que dá vontade de anotar. Leitura rápida e que fica.',
    synopsis: 'Um piloto cai com o avião no deserto e encontra um menino vindo de um asteroide minúsculo. Pelas conversas, o livro fala de amizade, de amar e de olhar o mundo com olhos de criança.',
    toc: '27 capítulos curtos\nAs viagens do príncipe por vários planetas\nO encontro com a raposa\nO adeus no deserto',
    log: [{ date: '2026-03-10', page: 48, note: 'A raposa e o conceito de cativar.' }, { date: '2026-03-11', page: 96, note: 'Terminei com um nó na garganta.' }] },
  { title: 'Torto Arado', author: 'Itamar Vieira Junior', pages: 264, status: 'read', startedAt: '2026-05-03', finishedAt: '2026-05-24', rating: 5,
    review: 'Forte, bonito e doído. A linguagem tem uma força que prende, e a história das irmãs Bibiana e Belonísia me acompanhou por semanas.',
    synopsis: 'No sertão da Bahia, duas irmãs crescem numa fazenda de trabalhadores rurais e partilham um segredo desde a infância. O romance acompanha a vida delas, a ligação com a terra e a luta por direitos.',
    toc: 'Parte I: Fio de corte\nParte II: Torto arado\nParte III: Rio de sangue',
    log: [{ date: '2026-05-03', page: 60, note: 'A cena da faca é de tirar o fôlego.' }, { date: '2026-05-24', page: 264, note: 'Um livro para indicar a todo mundo.' }] },
  { title: '1984', author: 'George Orwell', pages: 416, status: 'read', startedAt: '2025-08-01', finishedAt: '2025-08-30', rating: 5,
    review: 'Assusta pela atualidade. A novilíngua e o controle da verdade são o que mais fica.',
    synopsis: 'Em um Estado totalitário vigiado pelo Grande Irmão, Winston Smith trabalha reescrevendo a história e começa a duvidar do sistema. Um romance sobre vigilância, propaganda e liberdade.',
    toc: 'Parte 1\nParte 2\nParte 3\nApêndice: Os princípios da novilíngua',
    log: [{ date: '2025-08-30', page: 416, note: 'Terminei. Fiquei pensando por dias.' }] },
  { title: 'Orgulho e Preconceito', author: 'Jane Austen', pages: 424, status: 'read', startedAt: '2025-06-02', finishedAt: '2025-06-28', rating: 4.5,
    review: 'Diálogos afiados e uma história de amor que cresce aos poucos. A ironia de Austen continua muito atual.',
    synopsis: 'Elizabeth Bennet, de família modesta, tem de lidar com a pressão para se casar bem e com o orgulhoso Sr. Darcy. Um romance sobre classe, primeiras impressões e o quanto elas enganam.',
    toc: 'Volume I (capítulos 1 a 23)\nVolume II (capítulos 24 a 42)\nVolume III (capítulos 43 a 61)',
    log: [{ date: '2025-06-28', page: 424, note: 'Final perfeito.' }] },
  { title: 'Cem Anos de Solidão', author: 'Gabriel García Márquez', pages: 448, status: 'reading', startedAt: '2026-10-20',
    synopsis: 'A saga da família Buendía ao longo de gerações na cidade imaginária de Macondo. Entre o real e o fantástico, o livro conta amores, guerras e a solidão que se repete em cada geração.',
    toc: '20 capítulos sem título\nÁrvore genealógica no início da edição\nSete gerações dos Buendía',
    log: [{ date: '2026-10-20', page: 50, note: 'Tantos Aurelianos! Estou usando a árvore genealógica.' }, { date: '2026-11-02', page: 180, note: 'A chegada dos ciganos e do gelo foi linda.' }, { date: '2026-11-18', page: 290, note: 'O ritmo ficou envolvente.' }] },
  { title: 'Grande Sertão: Veredas', author: 'João Guimarães Rosa', pages: 608, status: 'reading', startedAt: '2026-11-08',
    synopsis: 'Riobaldo, ex-jagunço, conta sua vida a um visitante: as batalhas pelo sertão, a amizade intensa com Diadorim e a dúvida sobre um possível pacto com o diabo.',
    toc: 'Narrativa contínua, sem divisão em capítulos\nA frase final é “Travessia”',
    log: [{ date: '2026-11-08', page: 40, note: 'A linguagem é difícil e musical, preciso ler devagar.' }, { date: '2026-11-17', page: 120, note: 'Diadorim.' }] },
  { title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', pages: 288, status: 'want',
    synopsis: 'Brás Cubas conta sua vida depois de morto, com humor ácido e ironia sobre a sociedade do Rio de Janeiro no século 19.',
    toc: 'Abre com “Ao leitor”\nCerca de 160 capítulos curtos\nPrimeiro capítulo: “Óbito do autor”', log: [] },
  { title: 'Capitães da Areia', author: 'Jorge Amado', pages: 280, status: 'want',
    synopsis: 'Em Salvador, nos anos 1930, um grupo de meninos abandonados vive num trapiche, sobrevive de pequenos roubos e sonha com uma vida melhor.', toc: '', log: [] },
  { title: 'A Hora da Estrela', author: 'Clarice Lispector', pages: 88, status: 'want',
    synopsis: 'O narrador Rodrigo S.M. conta a vida de Macabéa, jovem nordestina que vive no Rio de Janeiro e mal percebe a própria existência.', toc: '', log: [] }
];
function seed() {
  if (db.seeded) return;
  if (!db.books.length) {
    db.books = SAMPLE.map(s => ({ id: uid(), sample: true, addedAt: s.startedAt || '2026-01-02', rating: 0, review: '', ...s, log: (s.log || []).map(e => ({ id: uid(), ...e })) }));
    const by = t => db.books.find(b => b.title === t)?.id;
    db.profile.favorites = ['Torto Arado', 'O Pequeno Príncipe', '1984', 'Dom Casmurro'].map(by).filter(Boolean);
  }
  db.seeded = true; save();
}

/* ---------- covers ---------- */
let coverTimer;
async function findCover(b) {
  if (b.cover || b.coverTried) return;
  try {
    const u = `https://openlibrary.org/search.json?title=${encodeURIComponent(b.title)}${b.author ? '&author=' + encodeURIComponent(b.author) : ''}&limit=8&fields=cover_i`;
    const r = await fetch(u); if (!r.ok) return;
    const doc = ((await r.json()).docs || []).find(x => x.cover_i);
    b.coverTried = true;
    if (!doc) { save(); return; }
    const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    await new Promise((ok, no) => { const i = new Image(); i.onload = ok; i.onerror = no; i.src = url; });
    b.cover = url; save();
    clearTimeout(coverTimer); coverTimer = setTimeout(() => { if (!dlg.open && !zoomDlg.open) render(); }, 500);
  } catch { /* sem internet: tenta de novo na próxima abertura */ }
}
async function findAllCovers() { for (const b of [...db.books]) await findCover(b); }
function fileToCover(file) {
  return new Promise((ok, no) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 360, H = 540, c = document.createElement('canvas'); c.width = W; c.height = H;
      const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
      c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .85));
    };
    img.onerror = no; img.src = url;
  });
}

/* ---------- views ---------- */
const hashN = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const PAL = [['#a07cf5','#6b3fd0'],['#8b5cf0','#4b2a9e'],['#7c4dde','#2e175f'],['#b08af7','#7c4dde'],['#6b3fd0','#241350'],['#9d78ee','#43228a']];
const cover = (b, cls = '') => {
  const [x, y] = PAL[hashN(b.title) % PAL.length];
  return `<span class="cover ${cls} ${b.cover ? 'has-img' : ''}" style="--a:${x};--c:${y}"><b>${esc(b.title)}</b><i>${esc(b.author)}</i>${b.cover ? `<img src="${esc(b.cover)}" alt="Capa de ${esc(b.title)}" loading="lazy" draggable="false" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ''}</span>`;
};
const STATUS = { want: 'Para ler', reading: 'Lendo', read: 'Lido' };

function carousel(items, render, label) {
  return `<div class="carousel" data-car><button class="cbtn prev" aria-label="Anterior">‹</button>
    <div class="track" tabindex="0" role="list" aria-label="${esc(label)}">${items.map((it, i) => `<div class="item" role="listitem">${render(it, i)}</div>`).join('')}</div>
    <button class="cbtn next" aria-label="Próximo">›</button></div>`;
}
const slide = (b, meta = '', rank = 0) => `<article class="slide">
  <button class="coverbtn" data-zoom="${b.id}" aria-label="Ampliar a capa de ${esc(b.title)}">${rank ? `<span class="rank">${rank}</span>` : ''}${cover(b)}<span class="hint">Ampliar</span></button>
  <a class="st" href="#/livro/${b.id}">${esc(b.title)}</a><div class="sa">${esc(b.author)}</div>${meta}</article>`;
const metaRead = b => `<div class="smeta">${b.rating > 0 ? stars(b.rating) : '<span></span>'}<span>${fmtD(b.finishedAt)}</span></div>`;
const metaReading = b => b.pages ? `<div class="bar"><i style="width:${pct(b)}%"></i></div><div class="smeta"><span>${pct(b)}%</span><span>pág. ${lastPage(b)}/${b.pages}</span></div>` : (lastPage(b) ? `<div class="smeta"><span>pág. ${lastPage(b)}</span></div>` : '');

function header() {
  return `<header class="top"><a class="brand" href="#/"><span class="logo">✦</span>Leituras</a>
    <nav class="nav"><button class="btn sm" id="add">+ Novo livro</button>
    <a class="me" href="#/perfil">${avatar()}<span class="nm">${esc(db.profile.name || 'Meu perfil')}</span></a></nav></header>`;
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
    <section class="hero-card">
      <div class="year">
        <button class="arrow" data-year="-1" aria-label="Ano anterior" ${year <= min ? 'disabled style="opacity:.3;cursor:default"' : ''}>‹</button>
        <span class="y">${year}</span>
        <button class="arrow" data-year="1" aria-label="Próximo ano" ${year >= max ? 'disabled style="opacity:.3;cursor:default"' : ''}>›</button>
      </div>
      <p class="lede">${read.length ? 'Seu ano em livros' : 'Suas leituras deste ano aparecem aqui'}</p>
      <div class="stats">
        <div class="stat"><b>${read.length}</b><span>${read.length === 1 ? 'livro lido' : 'livros lidos'}</span></div>
        <div class="stat"><b>${pages.toLocaleString('pt-BR')}</b><span>páginas</span></div>
        <div class="stat"><b>${a ? fmtR(a.toFixed(1)) : '—'}</b><span>nota média</span></div>
      </div>
    </section>

    ${reading.length ? `<section class="sec"><h2 class="sh">Lendo agora</h2>${carousel(reading, b => slide(b, metaReading(b)), 'Lendo agora')}</section>` : ''}

    <section class="sec"><h2 class="sh">Lidos em ${year}</h2>
      ${read.length ? carousel(read, b => slide(b, metaRead(b)), 'Lidos em ' + year) : `<div class="empty">Nenhuma leitura concluída em ${year} ainda.</div>`}</section>

    ${want.length ? `<section class="sec"><h2 class="sh">Para ler</h2>${carousel(want, b => slide(b), 'Para ler')}</section>` : ''}
  </main>`;
}

function bookView(id) {
  const b = getBook(id);
  if (!b) return `${header()}<main class="view"><p class="empty">Livro não encontrado.</p><a class="link" href="#/">Voltar</a></main>`;
  const label = STATUS[b.status];
  const log = [...(b.log || [])].sort((x, y) => y.date.localeCompare(x.date) || y.id.localeCompare(x.id));
  const meta = [b.pages ? b.pages + ' páginas' : '', b.startedAt ? 'iniciado em ' + fmtD(b.startedAt, true) : '', b.status === 'read' && b.finishedAt ? 'concluído em ' + fmtD(b.finishedAt, true) : ''].filter(Boolean).join(' · ');
  return `${header()}<a class="back" href="#/">← Voltar</a><main class="view">
    <section class="card bookhead"><button class="coverbtn" data-zoom="${b.id}" aria-label="Ampliar a capa">${cover(b, 'lg')}<span class="hint">Ampliar</span></button><div>
      <span class="chip">${label}</span><h1>${esc(b.title)}</h1>
      ${b.author ? `<p class="by">${esc(b.author)}</p>` : ''}${meta ? `<p class="meta">${meta}</p>` : ''}
      <div class="actions">
        ${b.status === 'want' ? `<button class="btn" id="start">Começar a ler</button>` : ''}
        ${b.status === 'reading' ? `<button class="btn" id="finish">Concluí a leitura</button>` : ''}
        <button class="btn ghost" data-zoom="${b.id}">Sinopse e sumário</button>
        <button class="btn ghost" id="edit">Editar livro</button>
      </div></div></section>

    ${b.status === 'read' ? `<section class="card sec" style="margin-top:20px">
      <div class="rrow">${stars(b.rating || 0, 'big')}<span class="muted" style="font-size:13px">${b.rating > 0 ? fmtR(b.rating) + ' de 5' : 'sem nota'}</span></div>
      ${b.review ? `<p class="review">${esc(b.review)}</p>` : `<p class="muted" style="margin:14px 0 0">Ainda sem resenha.</p>`}
      <div class="actions"><button class="btn ghost sm" id="finish">${b.review || b.rating ? 'Editar resenha' : 'Escrever resenha'}</button></div></section>` : ''}

    ${b.status === 'reading' ? `<section class="card" style="margin-top:20px">
      <h2 class="sh" style="font-size:20px">Registrar leitura</h2>
      ${b.pages ? `<div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>${lastPage(b)} de ${b.pages} páginas</span><span>${pct(b)}%</span></div><div class="bar"><i style="width:${pct(b)}%"></i></div>` : ''}
      <form id="logf" class="quick" style="margin-top:18px">
        <div><label for="lp">Página</label><input id="lp" type="number" min="0" inputmode="numeric" placeholder="${lastPage(b) || ''}"></div>
        <div><label for="ln">Como está sendo?</label><input id="ln" type="text" placeholder="Uma anotação, uma citação…"></div>
        <button class="btn" type="submit">Registrar</button>
      </form></section>` : ''}

    ${log.length ? `<section class="card" style="margin-top:20px"><h2 class="sh" style="font-size:20px">Histórico de leitura</h2><ul class="log">
      ${log.map(e => `<li><div class="d"><span>${fmtD(e.date, true)}</span>${e.page ? `<span>· pág. ${e.page}</span>` : ''}<button class="x" data-del="${e.id}" aria-label="Remover registro">✕</button></div>${e.note ? `<div class="n">${esc(e.note)}</div>` : ''}</li>`).join('')}</ul></section>` : ''}
  </main>`;
}

function profileView() {
  const p = db.profile, read = db.books.filter(b => b.status === 'read');
  const favs = (p.favorites || []).map(getBook).filter(Boolean);
  const byYear = {}; read.forEach(b => { const y = bookYear(b); byYear[y] = (byYear[y] || 0) + 1; });
  const mx = Math.max(1, ...Object.values(byYear));
  const a = avg(read);
  return `${header()}<a class="back" href="#/">← Voltar</a><main class="view">
    <section class="card" style="padding:0;overflow:hidden"><div class="banner"></div><div class="pcard">
      <div class="hero">${avatar('lg')}<div class="who"><h1>${esc(p.name || 'Seu nome')}</h1>${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}</div>
      <button class="btn ghost sm" id="editp">Editar perfil</button></div></div></section>

    <div class="stats light" style="margin-top:20px">
      <div class="stat"><b>${read.length}</b><span>livros lidos</span></div>
      <div class="stat"><b>${read.reduce((s, b) => s + (b.pages || 0), 0).toLocaleString('pt-BR')}</b><span>páginas</span></div>
      <div class="stat"><b>${a ? fmtR(a.toFixed(1)) : '—'}</b><span>nota média</span></div>
    </div>

    <section class="sec"><h2 class="sh">Top favoritos</h2>
      ${favs.length ? carousel(favs, (b, i) => slide(b, '', i + 1), 'Top favoritos') : `<div class="empty">Escolha até cinco livros em “Editar perfil”.</div>`}</section>

    ${Object.keys(byYear).length ? `<section class="sec"><h2 class="sh">Ano a ano</h2><div class="card years">
      ${Object.keys(byYear).sort((x, y) => y - x).map(y => `<div class="yr" data-goyear="${y}"><b>${y}</b><div class="bar"><i style="width:${byYear[y] / mx * 100}%"></i></div><span>${byYear[y]} ${byYear[y] === 1 ? 'livro' : 'livros'}</span></div>`).join('')}</div></section>` : ''}

    <section class="sec"><h2 class="sh">Seus dados</h2><div class="card">
      <p class="muted" style="margin:0;font-size:13px;max-width:52ch">Tudo fica salvo neste aparelho, neste navegador. Exporte um backup de tempos em tempos, ou para levar seu perfil para outro aparelho.</p>
      <div class="actions" style="margin-top:16px"><button class="btn ghost sm" id="exp">Exportar backup</button><button class="btn ghost sm" id="imp">Importar backup</button>${db.books.some(b => b.sample) ? '<button class="btn danger sm" id="rmsamples">Remover livros de exemplo</button>' : ''}<input type="file" id="impf" accept="application/json" hidden></div></div></section>
  </main>`;
}

/* ---------- zoom (capa ampliada, sinopse e sumário) ---------- */
const zoomDlg = $('#zoom');
function zoomBook(id) {
  const b = getBook(id); if (!b) return;
  const lines = (b.toc || '').split('\n').map(s => s.trim()).filter(Boolean);
  const panes = {
    syn: b.synopsis ? `<p>${esc(b.synopsis)}</p>` : `<p class="muted">Sem sinopse ainda. Adicione em “Editar livro”.</p>`,
    toc: lines.length ? `<ol class="toc">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : `<p class="muted">Sem sumário ou prefácio ainda. Adicione em “Editar livro”.</p>`
  };
  zoomDlg.classList.remove('full');
  zoomDlg.innerHTML = `<button class="zx" aria-label="Fechar">✕</button><div class="zbody">
    <button class="zcover" id="zc" aria-label="Alternar tela cheia da capa">${cover(b, 'xl')}</button>
    <div class="zinfo"><span class="chip">${STATUS[b.status]}</span><h2>${esc(b.title)}</h2>${b.author ? `<p class="by" style="margin-top:4px">${esc(b.author)}</p>` : ''}
      <div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="syn">Sinopse</button><button role="tab" aria-selected="false" data-tab="toc">Sumário</button></div>
      <div class="tabpane" id="zp">${panes.syn}</div>
      <div class="actions"><a class="btn" id="zopen" href="#/livro/${b.id}">Abrir meu diário deste livro</a></div></div></div>`;
  zoomDlg.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => {
    zoomDlg.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === t));
    $('#zp', zoomDlg).innerHTML = panes[t.dataset.tab];
  });
  $('.zx', zoomDlg).onclick = () => zoomDlg.close();
  $('#zc', zoomDlg).onclick = () => zoomDlg.classList.toggle('full');
  $('#zopen', zoomDlg).onclick = () => zoomDlg.close();
  zoomDlg.showModal();
}
zoomDlg.addEventListener('click', e => { if (e.target === zoomDlg) zoomDlg.close(); });

/* ---------- carousel ---------- */
function initCarousels(root) {
  root.querySelectorAll('[data-car]').forEach(car => {
    const tr = $('.track', car), prev = $('.prev', car), next = $('.next', car);
    const upd = () => {
      const max = tr.scrollWidth - tr.clientWidth;
      car.classList.toggle('noscroll', max < 4);
      prev.disabled = tr.scrollLeft < 4; next.disabled = tr.scrollLeft > max - 4;
    };
    const by = dir => tr.scrollBy({ left: dir * Math.max(160, tr.clientWidth * .85), behavior: 'smooth' });
    prev.onclick = () => by(-1); next.onclick = () => by(1);
    tr.addEventListener('scroll', upd, { passive: true });
    tr.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); by(.4); } if (e.key === 'ArrowLeft') { e.preventDefault(); by(-.4); } });
    // arrastar com o mouse
    let down = false, sx = 0, sl = 0, moved = false;
    tr.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = tr.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; tr.classList.add('drag'); } if (moved) tr.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; tr.classList.remove('drag'); });
    tr.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    new ResizeObserver(upd).observe(tr); upd();
  });
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
  const b = id ? getBook(id) : { title: '', author: '', pages: '', status: 'reading', finishedAt: today(), synopsis: '', toc: '', cover: '' };
  let cv = b.cover || '';
  const d = openDlg(`<form id="bf"><h2>${id ? 'Editar livro' : 'Novo livro'}</h2>
    <div class="photo"><span id="cvp"></span><div><button class="btn ghost sm" type="button" id="pickcv">Enviar capa</button> <button class="link" type="button" id="rmcv">remover</button><input type="file" id="cvf" accept="image/*" hidden>
    <p class="muted" style="font-size:12px;margin:8px 0 0;max-width:30ch">Sem capa enviada, o app tenta encontrar uma online.</p></div></div>
    <label for="bt">Título</label><input id="bt" type="text" required value="${esc(b.title)}" autocomplete="off">
    <label for="ba">Autor(a)</label><input id="ba" type="text" value="${esc(b.author)}" autocomplete="off">
    <div class="two"><div><label for="bp">Páginas</label><input id="bp" type="number" min="1" inputmode="numeric" value="${b.pages || ''}"></div>
    <div><label for="bs">Situação</label><select id="bs"><option value="reading">Lendo</option><option value="want">Quero ler</option><option value="read">Já li</option></select></div></div>
    <div id="bdw"><label for="bd">Concluído em</label><input id="bd" type="date" value="${b.finishedAt || today()}"></div>
    <label for="bsy">Sinopse</label><textarea id="bsy" style="min-height:84px" placeholder="Do que se trata o livro?">${esc(b.synopsis)}</textarea>
    <label for="btoc">Sumário ou prefácio <span style="font-weight:400">(um item por linha)</span></label><textarea id="btoc" style="min-height:84px" placeholder="Parte 1&#10;Parte 2…">${esc(b.toc)}</textarea>
    <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" id="cx">Cancelar</button>
    ${id ? `<button class="btn danger" type="button" id="rm" style="margin-left:auto">Excluir</button>` : ''}</div></form>`);
  const showCv = () => { $('#cvp', d).innerHTML = cover({ title: $('#bt', d).value || 'Título', author: $('#ba', d).value, cover: cv }, 'sm'); };
  showCv(); $('#bt', d).oninput = $('#ba', d).oninput = showCv;
  $('#pickcv', d).onclick = () => $('#cvf', d).click();
  $('#rmcv', d).onclick = () => { cv = ''; showCv(); };
  $('#cvf', d).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { cv = await fileToCover(f); showCv(); } catch { toast('Não consegui abrir essa imagem'); } };
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
    const data = { title: $('#bt', d).value.trim(), author: $('#ba', d).value.trim(), pages: Number($('#bp', d).value) || 0, synopsis: $('#bsy', d).value.trim(), toc: $('#btoc', d).value.trim(), cover: cv };
    if (!data.title) return;
    let nb = b;
    const changed = id && (b.title !== data.title || b.author !== data.author);
    if (id) Object.assign(b, data); else { nb = { id: uid(), addedAt: t, log: [], rating: 0, review: '', ...data }; db.books.push(nb); }
    if (!cv) nb.coverTried = id && !changed ? nb.coverTried : false;
    if (status !== nb.status || !id) {
      nb.status = status;
      if (status === 'reading' && !nb.startedAt) nb.startedAt = t;
    }
    if (nb.status === 'read') nb.finishedAt = $('#bd', d).value || t;
    save(); closeDlg();
    if (id) render(); else location.hash = '#/livro/' + nb.id;
    if (!cv) findCover(nb);
  };
  $('#bt', d).focus();
}

function finishDialog(id) {
  const b = getBook(id), wasRead = b.status === 'read';
  const d = openDlg(`<form id="ff"><h2>${wasRead ? 'Sua resenha' : 'Leitura concluída'}</h2><p class="muted" style="margin:0 0 18px;font-size:15px">${esc(b.title)}</p>
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
  app.querySelectorAll('[data-zoom]').forEach(x => x.onclick = () => zoomBook(x.dataset.zoom));
  initCarousels(app);
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
  on('#rmsamples', () => {
    if (!confirm('Remover os livros de exemplo? Os livros que você adicionou continuam.')) return;
    const gone = db.books.filter(b => b.sample).map(b => b.id);
    db.books = db.books.filter(b => !b.sample); db.profile.favorites = db.profile.favorites.filter(f => !gone.includes(f)); save(); render(); toast('Exemplos removidos');
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
seed();
render();
findAllCovers();
