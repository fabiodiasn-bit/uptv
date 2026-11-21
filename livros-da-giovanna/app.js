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
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.books)) return { profile: { name: '', bio: '', photo: '', favorites: [], ...d.profile }, books: d.books, seeded: !!d.seeded, posts: d.posts || [], social: d.social || {}, coverRetry: !!d.coverRetry, postsSeeded: !!d.postsSeeded }; } catch {}
  return { profile: { name: '', bio: '', photo: '', favorites: [] }, books: [], seeded: false, posts: [], social: {}, coverRetry: false, postsSeeded: false };
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
const avatarFrom = (st, name, cls = '') => st.photo
  ? `<span class="avatar ${cls}"><img src="${st.photo}" alt=""></span>`
  : (st.mascot && MASCOTS[st.mascot])
    ? `<span class="avatar mascot ${cls}" style="background:${BG[st.bg || 0] || BG[0]}">${mascotSvg(st.mascot)}</span>`
    : `<span class="avatar ${cls}">${esc((name || 'L').trim()[0].toUpperCase())}</span>`;
const avatar = (cls = '') => avatarFrom(db.profile, db.profile.name, cls);

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
  Object.assign(db.profile, { name: db.profile.name || "Giovanna", mascot: db.profile.mascot || "", bg: db.profile.bg || 0, stickers: db.profile.stickers || ["♡", "✿", "☁", "✦"], goal: db.profile.goal || 12 });
  db.seeded = true; save();
}

function seedPosts() {
  if (!db.postsSeeded && !db.posts.length && db.books.some(b => b.sample)) {
    const by2 = t => db.books.find(b => b.title === t)?.id || '';
    const T = s => new Date(s + 'T18:30:00').getTime();
    const mk = (kind, bookId, text, d) => ({ id: uid(), kind, bookId, text, ts: T(d), sample: true });
    db.posts = [
      mk('note', by2('Cem Anos de Solidão'), 'Tantos Aurelianos que já estou desenhando a árvore genealógica no caderno ✿', '2026-11-19'),
      mk('quote', '', 'Ler é uma forma de morar em outros lugares.', '2026-11-12'),
      mk('note', by2('Grande Sertão: Veredas'), 'Primeira vez que leio devagar só pelo som das palavras ♡', '2026-11-10')
    ];
    db.social['post:' + db.posts[0].id] = { liked: true, saved: false, comments: [{ id: uid(), text: 'Lembrar de comprar post-its coloridos pra marcar as páginas.', ts: T('2026-11-19') + 3600000 }] };
    db.social['post:' + db.posts[1].id] = { liked: true, saved: true, comments: [] };
  }
  db.postsSeeded = true; save();
}

/* ---------- capas ilustradas (arte própria, livros de domínio público) ---------- */
const svgUri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const SVG_HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 540" width="360" height="540">';
const ART = {
  'Dom Casmurro': () => `${SVG_HEAD}<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17344d"/><stop offset="1" stop-color="#0b1a29"/></linearGradient></defs>
<rect width="360" height="540" fill="url(#g)"/><rect x="18" y="18" width="324" height="504" fill="none" stroke="#e9c46a" stroke-width="2"/><rect x="26" y="26" width="308" height="488" fill="none" stroke="#e9c46a" stroke-width=".8" opacity=".6"/>
<text x="180" y="96" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="34" fill="#f4e9cd" letter-spacing="8">DOM</text>
<text x="180" y="142" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="40" fill="#f4e9cd" letter-spacing="3">CASMURRO</text>
<path d="M64 300 Q180 205 296 300 Q180 395 64 300Z" fill="#f4e9cd"/><circle cx="180" cy="300" r="50" fill="#2a9d8f"/><circle cx="180" cy="300" r="23" fill="#0b1a29"/><circle cx="193" cy="287" r="8" fill="#f4e9cd"/>
<path d="M44 428 q34 -22 68 0 t68 0 t68 0 t68 0" stroke="#2a9d8f" fill="none" stroke-width="3"/><path d="M44 448 q34 -22 68 0 t68 0 t68 0 t68 0" stroke="#7fd1c7" fill="none" stroke-width="2" opacity=".7"/><path d="M44 466 q34 -22 68 0 t68 0 t68 0 t68 0" stroke="#e9c46a" fill="none" stroke-width="1.4" opacity=".6"/>
<text x="180" y="506" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="17" fill="#e9c46a" letter-spacing="4">MACHADO DE ASSIS</text></svg>`,
  'A Metamorfose': () => `${SVG_HEAD}<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e76f51"/><stop offset="1" stop-color="#f4a261"/></linearGradient></defs>
<rect width="360" height="540" fill="url(#g)"/><rect x="22" y="22" width="316" height="496" fill="none" stroke="#2b1d14" stroke-width="3"/>
<text x="180" y="86" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="24" fill="#2b1d14" letter-spacing="6">A</text>
<text x="180" y="128" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="35" fill="#2b1d14" letter-spacing="1">METAMORFOSE</text>
<g stroke="#2b1d14" stroke-width="5" stroke-linecap="round" fill="none"><path d="M128 262 L84 232 L62 248"/><path d="M124 306 L72 306 L54 328"/><path d="M128 350 L84 384 L66 372"/><path d="M232 262 L276 232 L298 248"/><path d="M236 306 L288 306 L306 328"/><path d="M232 350 L276 384 L294 372"/><path d="M168 196 L150 160"/><path d="M192 196 L210 160"/></g>
<ellipse cx="180" cy="320" rx="62" ry="100" fill="#2b1d14"/><circle cx="180" cy="208" r="28" fill="#2b1d14"/><circle cx="170" cy="204" r="5" fill="#f4a261"/><circle cx="190" cy="204" r="5" fill="#f4a261"/>
<g stroke="#e76f51" stroke-width="3" fill="none"><path d="M128 268 Q180 288 232 268"/><path d="M121 304 Q180 328 239 304"/><path d="M122 340 Q180 366 238 340"/><path d="M134 374 Q180 396 226 374"/><path d="M180 232 V420"/></g>
<text x="180" y="496" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="20" fill="#2b1d14" letter-spacing="5">FRANZ KAFKA</text></svg>`,
  'O Pequeno Príncipe': () => `${SVG_HEAD}<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1946"/><stop offset="1" stop-color="#3b4aa0"/></linearGradient></defs>
<rect width="360" height="540" fill="url(#g)"/>
<g fill="#ffe9a8"><circle cx="60" cy="190" r="2.2"/><circle cx="300" cy="170" r="2.6"/><circle cx="110" cy="250" r="1.8"/><circle cx="250" cy="240" r="2"/><circle cx="320" cy="260" r="1.6"/><circle cx="40" cy="270" r="1.6"/><circle cx="210" cy="190" r="1.8"/></g>
<g fill="#ffe9a8"><path d="M300 210 l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4 l12 -4z"/><path d="M70 220 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 l9 -3z"/></g>
<text x="180" y="82" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="26" fill="#ffe08a" letter-spacing="7">O PEQUENO</text>
<text x="180" y="130" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="42" fill="#ffe08a" letter-spacing="3">PRÍNCIPE</text>
<circle cx="180" cy="690" r="290" fill="#f2c14e"/><circle cx="180" cy="690" r="290" fill="none" stroke="#f7dc8a" stroke-width="6"/>
<g><polygon points="164,402 196,402 180,350" fill="#2a9d8f"/><circle cx="180" cy="334" r="16" fill="#f6d7b0"/><path d="M164 330 q16 -26 32 0 q-6 -6 -16 -6 q-10 0 -16 6z" fill="#ffd34d"/><path d="M164 346 q16 10 32 0" stroke="#ffd34d" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M196 352 q28 -2 34 12" stroke="#ffd34d" stroke-width="6" fill="none" stroke-linecap="round"/></g>
<g><path d="M110 402 q-2 -26 6 -40" stroke="#2a9d8f" stroke-width="3" fill="none"/><circle cx="118" cy="356" r="9" fill="#e63946"/><circle cx="111" cy="360" r="6.5" fill="#d62839"/></g>
<text x="180" y="488" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="14" fill="#2a2349" letter-spacing="2.4">ANTOINE DE SAINT-EXUPÉRY</text></svg>`
};
function applySampleArt() {
  let ch = false;
  if (!db.coverRetry) { db.books.forEach(b => { if (!b.cover) b.coverTried = false; }); db.coverRetry = true; ch = true; }
  db.books.forEach(b => {
    if (b.sample && b.cover && b.cover.startsWith('data:image/svg+xml')) { b.art = b.cover; b.cover = ''; b.coverTried = false; ch = true; }
    if (b.sample && !b.art && ART[b.title]) { b.art = svgUri(ART[b.title]()); ch = true; }
  });
  if (ch) save();
}

/* ---------- covers ---------- */
let coverTimer;
function loadImg(url, cors) {
  return new Promise(res => { const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
}
// baixa a imagem e guarda uma cópia reduzida no próprio app (funciona sem internet depois)
async function cacheImg(url) {
  let i = await loadImg(url, true);
  if (i && i.naturalWidth >= 60) {
    try { const s = Math.min(1, 360 / i.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * s); c.height = Math.round(i.naturalHeight * s); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .82); } catch { return url; }
  }
  i = await loadImg(url, false);
  return i && i.naturalWidth >= 60 ? url : null;
}
async function lookupCoverUrl(b) {
  let gErr = false, oErr = false;
  try { // Google Livros
    const q = `intitle:${b.title}${b.author ? ' inauthor:' + b.author : ''}`;
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&printType=books`);
    if (!r.ok) throw 0;
    const it = ((await r.json()).items || []).find(x => x.volumeInfo && x.volumeInfo.imageLinks);
    if (it) { const l = it.volumeInfo.imageLinks; const u = (l.thumbnail || l.smallThumbnail || '').replace('http://', 'https://').replace('&edge=curl', '').replace(/zoom=\d/, 'zoom=2'); if (u) return u; }
  } catch { gErr = true; }
  try { // Open Library
    const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(b.title)}${b.author ? '&author=' + encodeURIComponent(b.author) : ''}&limit=8&fields=cover_i`);
    if (!r.ok) throw 0;
    const d = ((await r.json()).docs || []).find(x => x.cover_i);
    if (d) return `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`;
  } catch { oErr = true; }
  if (gErr && oErr) throw new Error('offline');
  return null;
}
async function findCover(b) {
  if (b.cover || b.coverTried) return;
  try {
    const url = await lookupCoverUrl(b);
    if (!url) { b.coverTried = true; save(); return; }
    const data = await cacheImg(url);
    b.coverTried = true;
    if (!data) { save(); return; }
    b.cover = data; save();
    clearTimeout(coverTimer); coverTimer = setTimeout(() => { if (!dlg.open && !zoomDlg.open && !locked) render(); }, 600);
  } catch { /* sem internet: tenta de novo na próxima abertura */ }
}
async function findAllCovers() { for (const b of [...db.books]) { await findCover(b); await new Promise(r => setTimeout(r, 250)); } }
function fileToCover(file, W = 360, H = 540) {
  return new Promise((ok, no) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
      c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .85));
    };
    img.onerror = no; img.src = url;
  });
}

/* ---------- bichinhos e símbolos ---------- */
const BG = ['#efe4cf', '#e1d3f5', '#f3dccd', '#d9c3a0', '#eadff9', '#e5d9c0'];
const GLYPHS = ['♡', '✿', '☁', '☾', '✦', '★', '❀', '♪', '✧', '❥', '☼', '✩'];
const EYES = '<circle cx="37" cy="56" r="4.6" fill="#2b1d3a"/><circle cx="63" cy="56" r="4.6" fill="#2b1d3a"/><circle cx="38.7" cy="54.3" r="1.5" fill="#fff"/><circle cx="64.7" cy="54.3" r="1.5" fill="#fff"/>';
const CHEEK = '<ellipse cx="27" cy="66" rx="6" ry="4" fill="#ff9fc4" opacity=".75"/><ellipse cx="73" cy="66" rx="6" ry="4" fill="#ff9fc4" opacity=".75"/>';
const MOUTH = '<ellipse cx="50" cy="62" rx="2.6" ry="1.9" fill="#2b1d3a"/><path d="M45 66 q5 5 10 0" stroke="#2b1d3a" stroke-width="2" fill="none" stroke-linecap="round"/>';
const ST = 'stroke="rgba(70,40,120,.2)" stroke-width="1.5"';
const head = c => `<ellipse cx="50" cy="60" rx="33" ry="29" fill="${c}" ${ST}/>`;
const MASCOTS = {
  bunny: { label: 'Coelhinho', svg: `<ellipse cx="35" cy="22" rx="9.5" ry="22" fill="#fff" ${ST}/><ellipse cx="65" cy="22" rx="9.5" ry="22" fill="#fff" ${ST}/><ellipse cx="35" cy="25" rx="4.5" ry="14" fill="#ffc6dd"/><ellipse cx="65" cy="25" rx="4.5" ry="14" fill="#ffc6dd"/>${head('#fff')}${EYES}${CHEEK}${MOUTH}` },
  cat: { label: 'Gatinho', svg: `<polygon points="22,44 24,12 46,34" fill="#ffd9a8" ${ST}/><polygon points="78,44 76,12 54,34" fill="#ffd9a8" ${ST}/><polygon points="27,38 28,20 40,32" fill="#ffb3cf"/><polygon points="73,38 72,20 60,32" fill="#ffb3cf"/>${head('#ffd9a8')}<path d="M13 60 h14 M13 68 l13 -3 M87 60 h-14 M87 68 l-13 -3" stroke="#b98a5e" stroke-width="1.6" stroke-linecap="round"/>${EYES}${CHEEK}${MOUTH}` },
  bear: { label: 'Ursinho', svg: `<circle cx="26" cy="33" r="11" fill="#d8a778" ${ST}/><circle cx="74" cy="33" r="11" fill="#d8a778" ${ST}/><circle cx="26" cy="33" r="5.5" fill="#f2cba5"/><circle cx="74" cy="33" r="5.5" fill="#f2cba5"/>${head('#d8a778')}<ellipse cx="50" cy="68" rx="14" ry="10" fill="#f6d9ba"/>${EYES}${CHEEK}${MOUTH}` },
  panda: { label: 'Pandinha', svg: `<circle cx="26" cy="33" r="11" fill="#2b1d3a"/><circle cx="74" cy="33" r="11" fill="#2b1d3a"/>${head('#fff')}<ellipse cx="36" cy="57" rx="8" ry="9.5" transform="rotate(-18 36 57)" fill="#2b1d3a"/><ellipse cx="64" cy="57" rx="8" ry="9.5" transform="rotate(18 64 57)" fill="#2b1d3a"/><circle cx="37" cy="56" r="3" fill="#fff"/><circle cx="63" cy="56" r="3" fill="#fff"/><circle cx="37.8" cy="55.2" r="1.2" fill="#2b1d3a"/><circle cx="63.8" cy="55.2" r="1.2" fill="#2b1d3a"/>${CHEEK}${MOUTH}` },
  frog: { label: 'Sapinho', svg: `${head('#9be29f')}<circle cx="30" cy="34" r="13" fill="#9be29f" ${ST}/><circle cx="70" cy="34" r="13" fill="#9be29f" ${ST}/><circle cx="30" cy="34" r="8" fill="#fff"/><circle cx="70" cy="34" r="8" fill="#fff"/><circle cx="31" cy="35" r="4" fill="#2b1d3a"/><circle cx="71" cy="35" r="4" fill="#2b1d3a"/><circle cx="32.2" cy="33.6" r="1.3" fill="#fff"/><circle cx="72.2" cy="33.6" r="1.3" fill="#fff"/>${CHEEK}<path d="M34 64 q16 14 32 0" stroke="#2b1d3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>` },
  duck: { label: 'Patinho', svg: `<path d="M46 32 q4 -14 11 -3 q-2 5 -5 5 z" fill="#ffe27a" ${ST}/>${head('#ffe27a')}${EYES}${CHEEK}<ellipse cx="50" cy="66" rx="12" ry="6.5" fill="#ffab5e"/><path d="M42 66 h16" stroke="#e8893a" stroke-width="1.4" stroke-linecap="round"/>` },
  fox: { label: 'Raposinha', svg: `<polygon points="20,46 22,12 46,32" fill="#ffa862" ${ST}/><polygon points="80,46 78,12 54,32" fill="#ffa862" ${ST}/><polygon points="26,38 27,22 38,32" fill="#fff0e0"/><polygon points="74,38 73,22 62,32" fill="#fff0e0"/>${head('#ffa862')}<path d="M17 62 q16 4 33 26 q17 -22 33 -26 q-6 22 -33 28 q-27 -6 -33 -28z" fill="#fff"/><ellipse cx="50" cy="76" rx="3.8" ry="2.7" fill="#2b1d3a"/>${EYES}<ellipse cx="25" cy="63" rx="4" ry="3" fill="#ff9fc4" opacity=".6"/><ellipse cx="75" cy="63" rx="4" ry="3" fill="#ff9fc4" opacity=".6"/>` },
  hamster: { label: 'Hamster', svg: `<circle cx="27" cy="36" r="9" fill="#ffb7c9" ${ST}/><circle cx="73" cy="36" r="9" fill="#ffb7c9" ${ST}/><circle cx="27" cy="36" r="4.5" fill="#ffe0e8"/><circle cx="73" cy="36" r="4.5" fill="#ffe0e8"/>${head('#ffdcb8')}<ellipse cx="50" cy="70" rx="22" ry="14" fill="#fff3e3"/>${EYES}${CHEEK}${MOUTH}<rect x="47" y="67.5" width="6" height="6" rx="1.5" fill="#fff" stroke="#e8c9a8"/>` }
};
const mascotSvg = k => MASCOTS[k] ? `<svg viewBox="0 0 100 100" aria-hidden="true">${MASCOTS[k].svg}</svg>` : '';
const decor = () => (db.profile.stickers || []).slice(0, 4).map((g, i) => `<span class="deco d${i}" aria-hidden="true">${esc(g)}</span>`).join('');
function companion(read, reading, goal) {
  const p = db.profile; if (!p.mascot || !MASCOTS[p.mascot]) return '';
  const n = (p.name || '').trim().split(' ')[0];
  const msg = goal && read.length >= goal ? 'Meta batida! Que orgulho de você ♡' : reading[0] ? `Vamos continuar “${esc(reading[0].title)}”?` : read.length ? 'Que tal um livro novo? ✿' : 'Vamos começar uma leitura? ✿';
  return `<div class="companion"><div class="bubble"><b>Oi${n ? ', ' + esc(n) : ''}!</b> ${msg}</div><span class="avatar mascot" style="background:${BG[p.bg || 0] || BG[0]}">${mascotSvg(p.mascot)}</span></div>`;
}
function pickerHTML(st, withPhoto) {
  return `<div class="pk-prev"><span id="pkprev"></span>${withPhoto ? `<div><button class="btn sm" type="button" id="pickph">Adicionar minha foto</button> <button class="link" type="button" id="rmph">remover foto</button><input type="file" id="phf" accept="image/*" hidden></div>` : ''}</div>
    <details class="pk-more" ${st.mascot && !st.photo ? 'open' : ''}><summary>Prefere um bichinho no lugar da foto? (opcional)</summary>
    <div class="pk-grid" role="radiogroup" aria-label="Bichinho">${Object.entries(MASCOTS).map(([k, m]) => `<button type="button" class="pk" role="radio" aria-checked="false" aria-label="${m.label}" title="${m.label}" data-m="${k}">${mascotSvg(k)}</button>`).join('')}</div>
    <label>Cor de fundo</label><div class="pk-bg" role="radiogroup" aria-label="Cor de fundo">${BG.map((c, i) => `<button type="button" class="sw" role="radio" aria-checked="false" aria-label="Cor ${i + 1}" data-bg="${i}" style="background:${c}"></button>`).join('')}</div>
    <button class="link" type="button" id="nomasc" style="margin-top:12px">não quero bichinho</button></details>`;
}
function wirePicker(d, st, nameEl) {
  const show = () => {
    $('#pkprev', d).innerHTML = avatarFrom(st, nameEl ? nameEl.value : '', 'lg');
    d.querySelectorAll('.pk').forEach(b => b.setAttribute('aria-checked', b.dataset.m === st.mascot));
    d.querySelectorAll('.sw').forEach(b => b.setAttribute('aria-checked', Number(b.dataset.bg) === st.bg));
  };
  d.querySelectorAll('.pk').forEach(b => b.onclick = () => { st.mascot = b.dataset.m; st.photo = ''; show(); });
  $('#nomasc', d).onclick = () => { st.mascot = ''; show(); };
  d.querySelectorAll('.sw').forEach(b => b.onclick = () => { st.bg = Number(b.dataset.bg); show(); });
  if ($('#pickph', d)) {
    $('#pickph', d).onclick = () => $('#phf', d).click();
    $('#rmph', d).onclick = () => { st.photo = ''; show(); };
    $('#phf', d).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { st.photo = await fileToCover(f, 320, 320); show(); } catch { toast('Não consegui abrir essa imagem'); } };
  }
  if (nameEl) nameEl.addEventListener('input', show);
  show();
}

/* ---------- colagem: renda, fita, recortes, risquinhos ---------- */
(function () {
  const N = 18, R = 45, r = 5.2, holes = [];
  let bumps = '';
  for (let i = 0; i < N; i++) { const a = 2 * Math.PI * i / N, cx = 50 + R * Math.cos(a), cy = 50 + R * Math.sin(a); bumps += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r}"/>`; const b = a + Math.PI / N; holes.push(`<circle cx="${(50 + 41 * Math.cos(b)).toFixed(2)}" cy="${(50 + 41 * Math.sin(b)).toFixed(2)}" r="1.9" fill="#000"/>`); const h2 = `<circle cx="${(50 + 41 * Math.cos(a)).toFixed(2)}" cy="${(50 + 41 * Math.sin(a)).toFixed(2)}" r="1.1" fill="#000"/>`; holes.push(h2); }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><mask id="m"><rect width="100" height="100" fill="#fff"/>${holes.join('')}<circle cx="50" cy="50" r="38.2" fill="#000"/></mask></defs><g mask="url(#m)" fill="#fbf5e8" stroke="#c9ad86" stroke-width=".6"><circle cx="50" cy="50" r="${R}"/>${bumps}</g></svg>`;
  document.documentElement.style.setProperty('--lace', `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`);
})();

(function () {
  let sc = '', holes = '';
  for (let i = 0; i < 12; i++) { const p = 24 + i * 13.45; for (const [x, y] of [[p, 12], [p, 188], [12, p], [188, p]]) sc += `<circle cx="${x.toFixed(1)}" cy="${y}" r="8.2"/>`.replace(/cx="([\d.]+)" cy="(\d+)"/, (m, a, b) => `cx="${a}" cy="${b}"`); }
  for (let i = 0; i < 11; i++) { const p = 30.7 + i * 13.45; for (const [x, y] of [[p, 13], [p, 187], [13, p], [187, p]]) holes += `<circle cx="${x.toFixed(1)}" cy="${y}" r="2" fill="#000"/>`; }
  for (let i = 0; i < 9; i++) { const p = 38 + i * 15.5; for (const [x, y] of [[p, 25], [p, 175], [25, p], [175, p]]) holes += `<circle cx="${x.toFixed(1)}" cy="${y}" r="1.5" fill="#000"/>`; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><mask id="m"><rect width="200" height="200" fill="#fff"/>${holes}<rect x="28" y="28" width="144" height="144" rx="3" fill="#000"/></mask></defs><g mask="url(#m)" fill="#f4e6c9" stroke="#c9ad7f" stroke-width=".8"><rect x="10" y="10" width="180" height="180" rx="8"/>${sc}</g><rect x="27" y="27" width="146" height="146" rx="4" fill="none" stroke="#c9ad7f" stroke-width="1.2"/></svg>`;
  document.documentElement.style.setProperty('--lace-frame', `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`);
})();
const SCRIB = {
  zig: '<svg class="scrib CLS" style="STY" viewBox="0 0 80 24" aria-hidden="true"><path d="M2 18 L14 4 L26 20 L38 4 L50 20 L62 4 L78 18"/></svg>',
  loop: '<svg class="scrib CLS" style="STY" viewBox="0 0 80 28" aria-hidden="true"><path d="M2 22 C14 2 30 2 26 15 C22 25 10 14 30 8 C48 2 58 24 78 8"/></svg>',
  ring: '<svg class="scrib CLS" style="STY" viewBox="0 0 80 48" aria-hidden="true"><path d="M42 4 C16 2 2 20 18 33 C36 46 72 37 76 18 C78 6 56 0 30 7"/></svg>',
  star: '<svg class="scrib CLS" style="STY" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 V22 M2 12 H22 M5 5 L19 19 M19 5 L5 19"/></svg>',
  wave: '<svg class="scrib CLS" style="STY" viewBox="0 0 104 16" aria-hidden="true"><path d="M2 8 Q12 0 22 8 T42 8 T62 8 T82 8 T102 8"/></svg>'
};
const scrib = (k, cls, sty) => SCRIB[k].replace('CLS', cls).replace('STY', sty);
const tape = (cls, sty) => `<span class="tape ${cls}" style="${sty}" aria-hidden="true"></span>`;
const clip = (cls, sty, head, text) => `<div class="clip ${cls}" style="${sty}" aria-hidden="true"><div class="clip-in"><b>${head}</b>${text}</div></div>`;
const NEWS = ['Nesta edição, as melhores páginas da semana. Leitores contam o que ficou marcado entre um capítulo e outro, e as estantes ganham novos moradores. <i>Café frio, luz baixa</i> e mais um capítulo antes de dormir. A cidade inteira parece falar de livros nas últimas noites.', 'Sebos relatam procura recorde por clássicos. Clubes de leitura se multiplicam nos bairros e há quem leia no ônibus, na fila, no intervalo. <i>Folhear devagar</i> voltou à moda, dizem as livreiras, entre uma xícara e outra.'];
function collage(kind) {
  if (kind === 'hero') return clip('', 'right:150px;top:-26px;transform:rotate(5deg)', 'A HORA DA LEITURA', NEWS[0]) +
    tape('b', 'left:34px;top:-6px;transform:rotate(-8deg)') +
    scrib('wave', 'c', 'left:290px;top:104px;width:110px') + scrib('star', 'l', 'left:54%;top:118px;width:20px') +
    scrib('zig', 'p', 'right:30px;bottom:-14px;width:74px;transform:rotate(-8deg)') + scrib('loop', 'b', 'right:44%;bottom:8px;width:70px;opacity:.8') +
    tape('l', 'right:-18px;bottom:46px;transform:rotate(58deg);width:70px');
  return clip('dark', 'right:30px;top:12px;transform:rotate(-4deg)', 'DIÁRIO DE LEITURAS', NEWS[1]) +
    tape('b', 'left:22px;top:-6px;transform:rotate(-7deg)') + tape('c', 'right:12px;top:6px;transform:rotate(40deg);width:64px') +
    scrib('ring', 'c', 'left:34%;top:30px;width:80px') + scrib('zig', 'p', 'left:48%;bottom:18px;width:70px') + scrib('star', 'k', 'left:40%;bottom:30px;width:22px');
}

/* ---------- views ---------- */
const hashN = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const PAL = [['#a8774f','#6a4429'],['#8b5cf0','#4b2a9e'],['#b08968','#6f4a30'],['#7c4dde','#2e175f'],['#9c7a5b','#5a3b27'],['#a07cf5','#6b3fd0']];
const cover = (b, cls = '') => {
  const [x, y] = PAL[hashN(b.title) % PAL.length], src = b.cover || b.art;
  return `<span class="cover ${cls} ${src ? 'has-img' : ''}" style="--a:${x};--c:${y}"><b>${esc(b.title)}</b><i>${esc(b.author)}</i>${src ? `<img src="${esc(src)}" ${b.cover && b.art ? `data-art="${esc(b.art)}"` : ''} alt="Capa de ${esc(b.title)}" loading="lazy" draggable="false" referrerpolicy="no-referrer" onerror="coverFail(this)">` : ''}</span>`;
};
function coverFail(img) { if (img.dataset.art && img.getAttribute('src') !== img.dataset.art) { img.src = img.dataset.art; } else { img.parentNode.classList.remove('has-img'); img.remove(); } }
const STATUS = { want: 'Para ler', reading: 'Lendo', read: 'Lido' };

function carousel(items, render, label) {
  return `<div class="carousel" data-car><button class="cbtn prev" aria-label="Anterior">‹</button>
    <div class="track" tabindex="0" role="list" aria-label="${esc(label)}">${items.map((it, i) => `<div class="item" role="listitem">${render(it, i)}</div>`).join('')}</div>
    <button class="cbtn next" aria-label="Próximo">›</button></div>`;
}
const metaRead = b => `<div class="smeta">${b.rating > 0 ? stars(b.rating) : '<span></span>'}<span>${fmtD(b.finishedAt)}</span></div>`;
const metaReading = b => b.pages ? `<div class="bar"><i style="width:${pct(b)}%"></i></div><div class="smeta"><span>${pct(b)}%</span><span>pág. ${lastPage(b)}/${b.pages}</span></div>` : (lastPage(b) ? `<div class="smeta"><span>pág. ${lastPage(b)}</span></div>` : '');

/* ---------- ícones ---------- */
const IC = {
  home: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  books: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><path d="M16.5 5.5l4 1-3.6 14-4-1z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.8-8 11-8 11z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
};

/* ---------- peças sociais ---------- */
let locked = false, unlocked = false, profTab = 'posts';
const soc = k => (db.social[k] = db.social[k] || { liked: false, saved: false, comments: [] });
const dayTs = s => new Date(s + 'T12:00:00').getTime();
function ago(t) {
  const d = Math.floor((Date.now() - t) / 864e5);
  if (d <= 0) return 'hoje'; if (d === 1) return 'ontem'; if (d < 7) return `há ${d} dias`;
  return new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(d > 300 ? { year: 'numeric' } : {}) }).replace('.', '');
}
const stamp = (text, cls = '') => `<div class="stamp ${cls}">${esc(text)}</div>`;
const miniBook = b => `<button class="coverbtn mini" data-zoom="${b.id}" aria-label="Ampliar a capa de ${esc(b.title)}">${cover(b, 'xs')}</button>`;
function feedItems() {
  const items = [];
  db.books.forEach(b => {
    (b.log || []).forEach(e => items.push({ key: 'log:' + e.id, type: 'log', book: b, e, t: e.ts || dayTs(e.date) }));
    if (b.status === 'read' && (b.review || b.rating)) items.push({ key: 'rev:' + b.id, type: 'review', book: b, t: dayTs(b.finishedAt || b.addedAt) + 7200000 });
  });
  db.posts.forEach(p => items.push({ key: 'post:' + p.id, type: p.kind, post: p, book: getBook(p.bookId), t: p.ts }));
  return items.sort((a, b) => b.t - a.t);
}
function postCard(it) {
  const s = soc(it.key), b = it.book, p = db.profile, name = p.name || 'Você', manual = !!it.post;
  const bookLink = b => `<a href="#/livro/${b.id}">${esc(b.title)}</a>`;
  let body = '';
  if (it.type === 'log') {
    const e = it.e, pc = b.pages && e.page ? Math.min(100, Math.round(e.page / b.pages * 100)) : 0;
    body = `<div class="pbook">${miniBook(b)}<div class="pt"><div class="pl">Leu${e.page ? ` até a <b>página ${e.page}</b>` : ''} de ${bookLink(b)}</div>${pc ? `<div class="bar"><i style="width:${pc}%"></i></div><div class="pc">${pc}% do livro</div>` : ''}</div></div>${e.note ? `<p class="ptext">${esc(e.note)}</p>` : ''}`;
  } else if (it.type === 'review') {
    body = `<div class="pbook">${miniBook(b)}<div class="pt"><div class="pl">Terminou ${bookLink(b)}</div><div>${stars(b.rating || 0)}${b.rating > 0 ? `<span class="pc" style="margin-left:6px">${fmtR(b.rating)} de 5</span>` : ''}</div></div></div>${b.review ? `<p class="ptext">${esc(b.review)}</p>` : ''}`;
  } else if (it.type === 'quote') {
    body = stamp(it.post.text, 'big') + (b ? `<div class="pbook" style="margin-top:12px">${miniBook(b)}<div class="pt"><div class="pl">${bookLink(b)}</div></div></div>` : '');
  } else {
    body = `${it.post.text ? `<p class="ptext">${esc(it.post.text)}</p>` : ''}${b ? `<div class="pbook">${miniBook(b)}<div class="pt"><div class="pl">Sobre ${bookLink(b)}</div><div class="pc">${esc(b.author)}</div></div></div>` : ''}`;
  }
  const shareText = it.type === 'review' ? `${b.title} — ${b.rating || 0}/5\n${b.review || ''}` : it.type === 'log' ? `${b.title}${it.e.page ? ' (pág. ' + it.e.page + ')' : ''}\n${it.e.note || ''}` : it.post.text;
  return `<article class="post" data-key="${esc(it.key)}" data-share="${esc(shareText.trim())}">
    <header class="phead">${avatar()}<div class="pwho"><b>${esc(name)}</b><span>${ago(it.t)} · só você vê</span></div>${manual ? `<button class="ab del" data-delpost="${it.post.id}" aria-label="Apagar publicação">${IC.trash}</button>` : ''}</header>
    ${body}
    <div class="pact">
      <button class="ab like" data-like="${esc(it.key)}" aria-pressed="${s.liked}" aria-label="Curtir">${IC.heart}<span>${s.liked ? 'Curtido' : ''}</span></button>
      <button class="ab" data-cmt="${esc(it.key)}" aria-label="Comentar">${IC.chat}<span class="cn">${s.comments.length || ''}</span></button>
      <button class="ab save" data-save="${esc(it.key)}" aria-pressed="${s.saved}" aria-label="Salvar">${IC.bookmark}</button>
      <button class="ab" data-sharebtn="${esc(it.key)}" aria-label="Copiar texto" style="margin-left:auto">${IC.send}</button>
    </div>
    <div class="cmts" data-cbox="${esc(it.key)}" hidden>${s.comments.map(c => cmtHTML(c)).join('')}
      <form class="cmf" data-cform="${esc(it.key)}"><input type="text" maxlength="300" placeholder="Anotar um comentário…" aria-label="Comentário"><button class="btn sm" type="submit">Enviar</button></form></div>
  </article>`;
}
const cmtHTML = c => `<div class="cm">${avatar()}<div><b>${esc(db.profile.name || 'Você')}</b> ${esc(c.text)}<div class="pc">${ago(c.ts)}</div></div></div>`;

function header() {
  const pin = !!db.profile.pin;
  return `<header class="top"><a class="brand" href="#/"><span class="logo">✦</span>Livros da Giovanna</a>
    <div class="nav"><span class="privacy">${IC.lock} Privado</span><button class="iconbtn" id="lockbtn" aria-label="${pin ? 'Bloquear o app' : 'Definir um PIN'}" title="${pin ? 'Bloquear' : 'Definir PIN'}">${IC.lock}</button></div></header>`;
}
function navHTML(tab) {
  const a = (h, id, ic, l) => `<a href="${h}" class="${tab === id ? 'on' : ''}">${ic}<span>${l}</span></a>`;
  return `<nav class="tabbar" aria-label="Navegação"><div class="tabin">
    ${a('#/', 'home', IC.home, 'Início')}${a('#/estante', 'lib', IC.books, 'Estante')}
    <button class="plus" id="newbtn" aria-label="Criar">+</button>
    ${a('#/salvos', 'saved', IC.bookmark, 'Salvos')}${a('#/perfil', 'me', IC.user, 'Perfil')}</div></nav>`;
}
function masthead() {
  const d = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="mh-wrap" aria-hidden="true"><div class="masthead"><div class="mh-top"><span>DIÁRIO ${db.profile.name ? 'DE ' + esc(db.profile.name.toUpperCase()) : 'DE LEITURAS'}</span><span>${d}</span></div><div class="mh-cols">${NEWS[0]} ${NEWS[1]}</div></div></div>`;
}

function feedView() {
  const reading = db.books.filter(b => b.status === 'reading');
  const items = feedItems();
  return `${header()}<main class="view">
    ${masthead()}
    <section class="stories dots" aria-label="Lendo agora"><div class="strack">
      <button class="story new" id="newpost" aria-label="Nova publicação"><span class="lacering"><span class="thumb">+</span></span><span class="sl">Novo</span></button>
      ${reading.map(b => `<a class="story" href="#/livro/${b.id}"><span class="lacering"><span class="thumb">${cover(b)}</span></span><span class="sl">${esc(b.title)}${b.pages ? ` · ${pct(b)}%` : ''}</span></a>`).join('')}
    </div></section>
    <button class="composer post" id="composer">${avatar()}<span>No que você está pensando, ${esc((db.profile.name || '').split(' ')[0] || 'leitora')}?</span></button>
    ${items.length ? items.map(postCard).join('') : `<div class="empty">Sua linha do tempo está vazia. Registre uma leitura ou escreva uma nota ♡</div>`}
    <p class="endnote">Só você vê o que está aqui ✿</p>
  </main>`;
}
function savedView() {
  const items = feedItems().filter(i => soc(i.key).saved);
  return `${header()}<main class="view"><h2 class="sh"><span>Salvos</span></h2>
    ${items.length ? items.map(postCard).join('') : `<div class="empty">Toque no marcador de uma publicação para guardá-la aqui.</div>`}</main>`;
}

const slide = (b, meta = '', rank = 0) => `<article class="slide">
  <button class="coverbtn" data-zoom="${b.id}" aria-label="Ampliar a capa de ${esc(b.title)}">${rank ? `<span class="rank">${rank}</span>` : ''}${cover(b)}</button>
  <a class="st" href="#/livro/${b.id}">${esc(b.title)}</a><div class="sa">${esc(b.author)}</div>${meta}</article>`;

function libraryView() {
  const years = [...new Set([new Date().getFullYear(), ...db.books.map(bookYear)])].sort((a, b) => b - a);
  const min = years[years.length - 1], max = years[0];
  if (year > max) year = max; if (year < min) year = min;
  const reading = db.books.filter(b => b.status === 'reading');
  const read = db.books.filter(b => b.status === 'read' && bookYear(b) === year).sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''));
  const want = db.books.filter(b => b.status === 'want');
  const pages = read.reduce((s, b) => s + (b.pages || 0), 0), a = avg(read), goal = Number(db.profile.goal) || 0;
  return `${header()}<main class="view lib">
    <section class="yearbar">
      <div class="yb-top"><button class="arrow" data-year="-1" aria-label="Ano anterior" ${year <= min ? 'disabled style="opacity:.3;cursor:default"' : ''}>‹</button><span class="y">${year}</span><button class="arrow" data-year="1" aria-label="Próximo ano" ${year >= max ? 'disabled style="opacity:.3;cursor:default"' : ''}>›</button>
        <button class="btn sm" id="add" style="margin-left:auto">+ Livro</button></div>
      <div class="ystats"><span><b>${read.length}</b> ${read.length === 1 ? 'lido' : 'lidos'}</span><span><b>${pages.toLocaleString('pt-BR')}</b> páginas</span><span><b>${a ? fmtR(a.toFixed(1)) : '—'}</b> nota média</span></div>
      ${goal ? `<div class="mgoal"><span>♡ Meta: ${read.length} de ${goal}</span><div class="gbar"><i style="width:${Math.min(100, read.length / goal * 100)}%"></i></div></div>` : ''}
    </section>
    ${reading.length ? `<section class="sec"><h2 class="sh"><span>Lendo agora</span></h2>${carousel(reading, b => slide(b, metaReading(b)), 'Lendo agora')}</section>` : ''}
    <section class="sec"><h2 class="sh"><span>Lidos em ${year}</span></h2>
      ${read.length ? carousel(read, b => slide(b, metaRead(b)), 'Lidos em ' + year) : `<div class="empty">Nenhuma leitura concluída em ${year} ainda ♡</div>`}</section>
    ${want.length ? `<section class="sec"><h2 class="sh"><span>Para ler</span></h2>${carousel(want, b => slide(b), 'Para ler')}</section>` : ''}
  </main>`;
}

function bookView(id) {
  const b = getBook(id);
  if (!b) return `${header()}<main class="view"><p class="empty">Livro não encontrado.</p><a class="link" href="#/estante">Voltar</a></main>`;
  const label = STATUS[b.status];
  const log = [...(b.log || [])].sort((x, y) => y.date.localeCompare(x.date) || y.id.localeCompare(x.id));
  const meta = [b.pages ? b.pages + ' páginas' : '', b.startedAt ? 'iniciado em ' + fmtD(b.startedAt, true) : '', b.status === 'read' && b.finishedAt ? 'concluído em ' + fmtD(b.finishedAt, true) : ''].filter(Boolean).join(' · ');
  return `${header()}<a class="back" href="#/estante">← Estante</a><main class="view">
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
      <h2 class="sh" style="font-size:20px"><span>Registrar leitura</span></h2>
      ${b.pages ? `<div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>${lastPage(b)} de ${b.pages} páginas</span><span>${pct(b)}%</span></div><div class="bar"><i style="width:${pct(b)}%"></i></div>` : ''}
      <form id="logf" class="quick" style="margin-top:18px">
        <div><label for="lp">Página</label><input id="lp" type="number" min="0" inputmode="numeric" placeholder="${lastPage(b) || ''}"></div>
        <div><label for="ln">Como está sendo?</label><input id="ln" type="text" placeholder="Uma anotação, uma citação…"></div>
        <button class="btn" type="submit">Registrar</button>
      </form></section>` : ''}

    ${log.length ? `<section class="card" style="margin-top:20px"><h2 class="sh" style="font-size:20px"><span>Histórico de leitura</span></h2><ul class="log">
      ${log.map(e => `<li><div class="d"><span>${fmtD(e.date, true)}</span>${e.page ? `<span>· pág. ${e.page}</span>` : ''}<button class="x" data-del="${e.id}" aria-label="Remover registro">✕</button></div>${e.note ? `<div class="n">${esc(e.note)}</div>` : ''}</li>`).join('')}</ul></section>` : ''}
  </main>`;
}

function profileView() {
  const p = db.profile, read = db.books.filter(b => b.status === 'read');
  const favs = (p.favorites || []).map(getBook).filter(Boolean);
  const byYear = {}; read.forEach(b => { const y = bookYear(b); byYear[y] = (byYear[y] || 0) + 1; });
  const mx = Math.max(1, ...Object.values(byYear));
  const items = feedItems(), mine = items.filter(i => i.post || i.type === 'review'), saved = items.filter(i => soc(i.key).saved);
  let tab;
  if (profTab === 'saved') tab = saved.length ? saved.map(postCard).join('') : '<div class="empty">Nada salvo ainda.</div>';
  else if (profTab === 'year') tab = Object.keys(byYear).length ? `<div class="card years">${Object.keys(byYear).sort((x, y) => y - x).map(y => `<div class="yr" data-goyear="${y}"><b>${y}</b><div class="bar"><i style="width:${byYear[y] / mx * 100}%"></i></div><span>${byYear[y]} ${byYear[y] === 1 ? 'livro' : 'livros'}</span></div>`).join('')}</div>` : '<div class="empty">Ainda sem leituras concluídas.</div>';
  else tab = mine.length ? `<div class="pgrid">${mine.map(i => i.type === 'review' ? `<a class="t3" href="#/livro/${i.book.id}">${cover(i.book)}</a>` : `<div class="t3 txt ${i.type === 'quote' ? 'q' : ''}"><span>${esc(i.post.text)}</span></div>`).join('')}</div>` : '<div class="empty">Suas publicações aparecem aqui.</div>';
  return `${header()}<main class="view prof">
    <section class="pcardx"><div class="pbanner dots">${clip('dark', 'left:16px;top:14px;transform:rotate(-3deg)', 'DIÁRIO DE LEITURAS', NEWS[1])}${tape('b', 'left:8px;top:6px;transform:rotate(-32deg);width:70px')}${scrib('star', 'l', 'left:47%;top:20px;width:20px')}${scrib('zig', 'p', 'left:42%;bottom:24px;width:56px')}${decor()}${stamp('sou um museu de tudo que já li e amei', 'onbanner')}</div>
      <div class="pbody"><label class="lframe avatar-btn" title="Trocar foto">${avatar('lg')}<span class="cam" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><input type="file" id="quickph" accept="image/*" aria-label="Trocar foto de perfil"></label>
        <div class="pinfo"><h1>${esc(p.name || 'Seu nome')}</h1>${p.handle ? `<div class="handle">@${esc(p.handle)}</div>` : ''}${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
          <div class="pstats"><div><b>${db.posts.length + read.filter(b => b.review || b.rating).length}</b><span>publicações</span></div><div><b>${read.length}</b><span>livros</span></div><div><b>${read.reduce((s, b) => s + (b.pages || 0), 0).toLocaleString('pt-BR')}</b><span>páginas</span></div></div>
          <div class="actions" style="margin-top:12px"><button class="btn sm" id="editp">Editar perfil</button></div></div></div></section>
    ${favs.length ? `<section class="sec"><h2 class="sh"><span>Destaques</span></h2>${carousel(favs, (b, i) => slide(b, '', i + 1), 'Destaques')}</section>` : ''}
    <div class="ptabs" role="tablist">${[['posts', 'Publicações'], ['saved', 'Salvos'], ['year', 'Ano a ano']].map(([k, l]) => `<button role="tab" data-ptab="${k}" aria-selected="${profTab === k}">${l}</button>`).join('')}</div>
    <div class="ptab">${tab}</div>
    <section class="sec"><h2 class="sh"><span>Seus dados</span></h2><div class="card">
      <p class="muted" style="margin:0;font-size:13px;max-width:52ch">Tudo fica salvo só neste aparelho e neste navegador. Exporte um backup de tempos em tempos, ou para levar seu perfil para outro aparelho.</p>
      <div class="actions" style="margin-top:16px"><button class="btn ghost sm" id="exp">Exportar backup</button><button class="btn ghost sm" id="imp">Importar backup</button>${db.books.some(b => b.sample) ? '<button class="btn danger sm" id="rmsamples">Remover livros de exemplo</button>' : ''}</div></div></section>
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
  if (id) $('#rm', d).onclick = async () => {
    if (!await askConfirm(`Excluir “${b.title}” e todo o seu histórico?`, 'Excluir')) return;
    db.books = db.books.filter(x => x.id !== id); db.profile.favorites = db.profile.favorites.filter(f => f !== id);
    save(); closeDlg(); location.hash = '#/estante';
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
  const p = db.profile, st = { mascot: p.mascot || '', bg: p.bg || 0, photo: p.photo || '' };
  let stickers = [...(p.stickers || [])];
  const opts = sel => `<option value="">—</option>` + db.books.map(b => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${esc(b.title)}</option>`).join('');
  const d = openDlg(`<form id="pf"><h2>Seu perfil ✿</h2>
    <label for="pn">Como você quer ser chamada?</label><input id="pn" type="text" maxlength="40" value="${esc(p.name)}" autocomplete="off" placeholder="Seu nome ou apelido">
    <label for="ph">Nome de usuária <span style="font-weight:400">(opcional)</span></label><input id="ph" type="text" maxlength="24" value="${esc(p.handle || '')}" autocomplete="off" placeholder="giovanna">
    ${pickerHTML(st, true)}
    <label>Símbolos fofinhos <span style="font-weight:400">(até 4, enfeitam seu perfil)</span></label><div class="gl-grid">${GLYPHS.map(g => `<button type="button" class="gl" aria-pressed="false" data-g="${g}">${g}</button>`).join('')}</div>
    <div class="two"><div><label for="pg">Meta de livros no ano</label><input id="pg" type="number" min="0" max="999" inputmode="numeric" value="${p.goal || ''}" placeholder="Ex.: 12"></div><div></div></div>
    <label for="pb">Sobre você</label><textarea id="pb" style="min-height:64px" placeholder="Uma frase sobre suas leituras">${esc(p.bio)}</textarea>
    <label for="pp">PIN de privacidade <span style="font-weight:400">(opcional, 4 a 6 números)</span></label><input id="pp" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="${p.pin ? 'PIN ativo: deixe vazio para manter' : 'Ex.: 1234'}">
    <p class="muted" style="font-size:12px;margin:6px 0 0">O PIN esconde o app ao abrir. Ele não criptografa os dados: quem usar este navegador pode ver o armazenamento.${p.pin ? ' <button class="link" type="button" id="rmpin">remover PIN</button>' : ''}</p>
    <label>Top livros favoritos</label>
    ${[0,1,2,3,4].map(i => `<select class="fv" style="margin-bottom:6px" aria-label="Favorito ${i + 1}">${opts((p.favorites || [])[i])}</select>`).join('')}
    ${db.books.length ? '' : '<p class="muted" style="font-size:12px">Adicione livros para escolhê-los aqui.</p>'}
    <div class="actions"><button class="btn" type="submit">Salvar</button><button class="btn ghost" type="button" id="cx">Cancelar</button></div></form>`);
  wirePicker(d, st, $('#pn', d));
  const syncG = () => d.querySelectorAll('.gl').forEach(b => b.setAttribute('aria-pressed', stickers.includes(b.dataset.g)));
  d.querySelectorAll('.gl').forEach(b => b.onclick = () => { const g = b.dataset.g; if (stickers.includes(g)) stickers = stickers.filter(x => x !== g); else if (stickers.length < 4) stickers.push(g); else toast('São só 4 símbolos'); syncG(); });
  syncG();
  $('#cx', d).onclick = closeDlg;
  let dropPin = false;
  if ($('#rmpin', d)) $('#rmpin', d).onclick = () => { dropPin = true; $('#rmpin', d).textContent = 'PIN será removido'; };
  $('#pf', d).onsubmit = async e => {
    e.preventDefault();
    const pinv = $('#pp', d).value.trim();
    if (pinv && !/^\d{4,6}$/.test(pinv)) { toast('O PIN precisa ter de 4 a 6 números'); return; }
    if (pinv) p.pin = await hashPin(pinv); else if (dropPin) p.pin = '';
    Object.assign(p, { name: $('#pn', d).value.trim(), handle: $('#ph', d).value.trim().toLowerCase().replace(/[^a-z0-9._]/g, ''), bio: $('#pb', d).value.trim(), mascot: st.mascot, bg: st.bg, photo: st.photo, stickers, goal: Number($('#pg', d).value) || 0, welcomed: true });
    p.favorites = [...new Set([...d.querySelectorAll('.fv')].map(s => s.value).filter(Boolean))];
    save(); closeDlg(); render(); toast('Perfil salvo ♡');
  };
}

function welcomeDialog() {
  const p = db.profile, st = { mascot: p.mascot || '', bg: p.bg || 0, photo: p.photo || '' };
  const d = openDlg(`<form id="wf"><h2>Oi! Bem-vinda ♡</h2><p class="muted" style="margin:6px 0 0;font-size:14px">Vamos deixar tudo com a sua cara.</p>
    <label for="wn">Como você quer ser chamada?</label><input id="wn" type="text" maxlength="40" value="${esc(p.name)}" autocomplete="off" placeholder="Seu nome ou apelido">
    ${pickerHTML(st, true)}
    <div class="actions"><button class="btn" type="submit">Começar ✿</button></div></form>`);
  wirePicker(d, st, $('#wn', d));
  const done = () => { Object.assign(p, { welcomed: true }); save(); };
  d.addEventListener('close', function f() { d.removeEventListener('close', f); if (!p.welcomed) done(); render(); });
  $('#wf', d).onsubmit = e => { e.preventDefault(); Object.assign(p, { name: $('#wn', d).value.trim() || p.name, mascot: st.mascot, bg: st.bg, photo: st.photo, welcomed: true }); save(); closeDlg(); toast('Que lindo! ♡'); };
  $('#wn', d).focus();
}

/* ---------- publicar, criar, bloquear ---------- */
function composeDialog(kind = 'note') {
  let k = kind;
  const d = openDlg(`<form id="cf"><h2>Nova publicação</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Só você vê ♡</p>
    <div class="tabs" role="tablist" style="margin:16px 0 4px"><button type="button" role="tab" data-k="note" aria-selected="true">Nota</button><button type="button" role="tab" data-k="quote" aria-selected="false">Citação</button></div>
    <label for="ct" id="ctl">O que você está pensando ou lendo?</label><textarea id="ct" maxlength="600" style="min-height:110px" required></textarea>
    <label for="cbk">Sobre qual livro? (opcional)</label><select id="cbk"><option value="">Nenhum</option>${db.books.map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select>
    <div class="actions"><button class="btn" type="submit">Publicar</button><button class="btn ghost" type="button" id="cx">Cancelar</button></div></form>`);
  const sync = () => { d.querySelectorAll('[data-k]').forEach(t => t.setAttribute('aria-selected', t.dataset.k === k)); $('#ctl', d).textContent = k === 'quote' ? 'A frase que você quer guardar' : 'O que você está pensando ou lendo?'; };
  d.querySelectorAll('[data-k]').forEach(t => t.onclick = () => { k = t.dataset.k; sync(); }); sync();
  $('#cx', d).onclick = closeDlg; $('#ct', d).focus();
  $('#cf', d).onsubmit = e => {
    e.preventDefault(); const text = $('#ct', d).value.trim(); if (!text) return;
    db.posts.push({ id: uid(), kind: k, bookId: $('#cbk', d).value, text, ts: Date.now() });
    save(); closeDlg(); if (location.hash !== '#/') location.hash = '#/'; else render(); toast('Publicado ♡');
  };
}
function createDialog() {
  const d = openDlg(`<h2>Criar</h2><div class="stack" style="margin-top:16px;gap:10px"><button class="btn" id="cpost">Nova publicação</button><button class="btn ghost" id="cbook">Novo livro na estante</button><button class="btn ghost" id="cx">Cancelar</button></div>`);
  $('#cpost', d).onclick = () => { closeDlg(); composeDialog(); };
  $('#cbook', d).onclick = () => { closeDlg(); bookDialog(); };
  $('#cx', d).onclick = closeDlg;
}
async function hashPin(pin) {
  try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lg:' + pin)); return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch { let h = 5381; for (const c of 'lg:' + pin) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'x' + h; }
}
function showLock() {
  locked = true; $('#app').innerHTML = ''; document.getElementById('lock')?.remove();
  const el = document.createElement('div'); el.id = 'lock'; el.className = 'lock dots';
  el.innerHTML = `<div class="lockin"><div class="lframe">${avatar('lg')}</div><h2>${esc(db.profile.name || 'Livros da Giovanna')}</h2><p>Este espaço é privado ♡</p>
    <form id="lf"><input id="lpin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="Digite seu PIN" aria-label="PIN"><button class="btn" type="submit">Entrar</button></form><p class="lerr" id="lerr" role="alert"></p></div>`;
  document.body.appendChild(el);
  $('#lpin', el).focus();
  $('#lf', el).onsubmit = async e => {
    e.preventDefault();
    if (await hashPin($('#lpin', el).value) === db.profile.pin) { el.remove(); locked = false; unlocked = true; render(); if (!db.profile.welcomed) welcomeDialog(); }
    else { $('#lerr', el).textContent = 'PIN incorreto'; $('#lpin', el).value = ''; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  };
}

/* ---------- confirmação própria (substitui confirm()) ---------- */
const askDlg = $('#ask');
function askConfirm(msg, okLabel = 'Confirmar') {
  return new Promise(res => {
    askDlg.innerHTML = `<form method="dialog"><h2>${esc(msg)}</h2><div class="actions"><button class="btn" value="ok">${esc(okLabel)}</button><button class="btn ghost" value="no">Cancelar</button></div></form>`;
    askDlg.returnValue = 'no'; askDlg.onclose = () => res(askDlg.returnValue === 'ok'); askDlg.showModal();
  });
}
askDlg.addEventListener('click', e => { if (e.target === askDlg) askDlg.close('no'); });

/* ---------- backup (copiar ou baixar; importar arquivo ou texto) ---------- */
function exportDialog() {
  const json = JSON.stringify(db, null, 2);
  const d = openDlg(`<h2>Backup dos seus livros</h2><p class="muted" style="font-size:13px;margin:6px 0 0">Guarde este texto ou baixe o arquivo. Para restaurar, use “Importar backup”.</p>
    <label for="bk">Conteúdo do backup</label><textarea id="bk" readonly style="min-height:140px;font-size:12px;font-family:ui-monospace,Menlo,monospace">${esc(json)}</textarea>
    <div class="actions"><button class="btn" id="bkcopy">Copiar</button><button class="btn ghost" id="bkdl">Baixar arquivo</button><button class="btn ghost" id="cx">Fechar</button></div>`);
  $('#cx', d).onclick = closeDlg;
  $('#bkcopy', d).onclick = async () => { try { await navigator.clipboard.writeText(json); toast('Backup copiado'); } catch { $('#bk', d).select(); toast('Selecionei o texto: use Ctrl+C'); } };
  $('#bkdl', d).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = `livros-da-giovanna-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
}
function importDialog() {
  const d = openDlg(`<h2>Importar backup</h2><p class="muted" style="font-size:13px;margin:6px 0 0">Isto substitui os dados atuais.</p>
    <div class="actions" style="margin-top:14px"><button class="btn ghost sm" id="pickf">Escolher arquivo</button><input type="file" id="bkf" accept="application/json" hidden></div>
    <label for="bkt">Ou cole o texto do backup</label><textarea id="bkt" style="min-height:110px;font-size:12px;font-family:ui-monospace,Menlo,monospace"></textarea>
    <div class="actions"><button class="btn" id="bkgo">Importar</button><button class="btn ghost" id="cx">Cancelar</button></div>`);
  $('#cx', d).onclick = closeDlg; $('#pickf', d).onclick = () => $('#bkf', d).click();
  $('#bkf', d).onchange = async e => { const f = e.target.files[0]; if (f) $('#bkt', d).value = await f.text(); };
  $('#bkgo', d).onclick = async () => {
    try {
      const x = JSON.parse($('#bkt', d).value); if (!x || !Array.isArray(x.books)) throw 0;
      if (!await askConfirm('Substituir os dados atuais por este backup?', 'Substituir')) return;
      try { localStorage.setItem(KEY, JSON.stringify(x)); } catch {}
      db = load(); closeDlg(); render(); toast('Backup importado');
    } catch { toast('Backup inválido'); }
  };
}

/* ---------- events ---------- */
function bindSocial(app) {
  const by = (sel, k) => app.querySelector(`${sel}[data-cbox="${CSS.escape(k)}"]`);
  app.querySelectorAll('[data-like]').forEach(b => b.onclick = () => { const s = soc(b.dataset.like); s.liked = !s.liked; save(); b.setAttribute('aria-pressed', s.liked); b.querySelector('span').textContent = s.liked ? 'Curtido' : ''; });
  app.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { const s = soc(b.dataset.save); s.saved = !s.saved; save(); b.setAttribute('aria-pressed', s.saved); toast(s.saved ? 'Salvo ♡' : 'Removido dos salvos'); });
  app.querySelectorAll('[data-cmt]').forEach(b => b.onclick = () => { const box = app.querySelector(`[data-cbox="${CSS.escape(b.dataset.cmt)}"]`); box.hidden = !box.hidden; if (!box.hidden) $('input', box).focus(); });
  app.querySelectorAll('[data-cform]').forEach(f => f.onsubmit = e => {
    e.preventDefault(); const inp = $('input', f), text = inp.value.trim(); if (!text) return;
    const k = f.dataset.cform, s = soc(k), c = { id: uid(), text, ts: Date.now() }; s.comments.push(c); save();
    f.insertAdjacentHTML('beforebegin', cmtHTML(c)); inp.value = '';
    const n = app.querySelector(`[data-cmt="${CSS.escape(k)}"] .cn`); if (n) n.textContent = s.comments.length;
  });
  app.querySelectorAll('[data-sharebtn]').forEach(b => b.onclick = async () => {
    const t = b.closest('.post').dataset.share;
    try { await navigator.clipboard.writeText(t); toast('Texto copiado'); } catch { toast('Não consegui copiar'); }
  });
  app.querySelectorAll('[data-delpost]').forEach(b => b.onclick = async () => {
    if (!await askConfirm('Apagar esta publicação?', 'Apagar')) return;
    db.posts = db.posts.filter(p => p.id !== b.dataset.delpost); save(); render();
  });
  const n1 = $('#composer', app), n2 = $('#newpost', app), n3 = $('#newbtn', app), lk = $('#lockbtn', app);
  if (n1) n1.onclick = () => composeDialog(); if (n2) n2.onclick = () => composeDialog(); if (n3) n3.onclick = createDialog;
  if (lk) lk.onclick = () => { if (db.profile.pin) showLock(); else { toast('Defina um PIN em Editar perfil para bloquear'); } };
  app.querySelectorAll('[data-ptab]').forEach(t => t.onclick = () => { profTab = t.dataset.ptab; render(); });
}

function bind() {
  const app = $('#app');
  app.querySelectorAll('[data-year]').forEach(b => b.onclick = () => { if (b.disabled) return; year += Number(b.dataset.year); render(); });
  app.querySelectorAll('[data-goyear]').forEach(r => r.onclick = () => { year = Number(r.dataset.goyear); location.hash = '#/estante'; });
  bindSocial(app);
  app.querySelectorAll('[data-zoom]').forEach(x => x.onclick = () => zoomBook(x.dataset.zoom));
  initCarousels(app);
  const on = (id, fn) => { const el = $(id, app); if (el) el.onclick = fn; };
  const id = (location.hash.match(/^#\/livro\/(.+)$/) || [])[1];
  on('#add', () => bookDialog());
  on('#edit', () => bookDialog(id));
  on('#finish', () => finishDialog(id));
  on('#editp', profileDialog);
  const qp = $('#quickph', app);
  if (qp) qp.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { db.profile.photo = await fileToCover(f, 320, 320); save(); render(); toast('Foto atualizada ♡'); } catch { toast('Não consegui abrir essa imagem'); } };
  on('#start', () => { const b = getBook(id); b.status = 'reading'; b.startedAt = b.startedAt || today(); save(); render(); });
  on('#rmsamples', async () => {
    if (!await askConfirm('Remover os livros de exemplo e as publicações de exemplo? O que você criou continua.', 'Remover')) return;
    const gone = db.books.filter(b => b.sample).map(b => b.id);
    db.books = db.books.filter(b => !b.sample); db.profile.favorites = db.profile.favorites.filter(f => !gone.includes(f));
    db.posts = db.posts.filter(p => !p.sample); db.postsSeeded = true;
    save(); render(); toast('Exemplos removidos');
  });
  on('#exp', exportDialog);
  on('#imp', importDialog);
  const lf = $('#logf', app);
  if (lf) lf.onsubmit = e => {
    e.preventDefault();
    const b = getBook(id), page = Number($('#lp', app).value) || 0, note = $('#ln', app).value.trim();
    if (!page && !note) { $('#lp', app).focus(); return; }
    b.log = b.log || []; b.log.push({ id: uid(), date: today(), page, note });
    save(); render(); toast('Registrado ♡');
  };
  app.querySelectorAll('[data-del]').forEach(x => x.onclick = () => {
    const b = getBook(id); b.log = b.log.filter(e => e.id !== x.dataset.del); save(); render();
  });
}

function render() {
  if (locked) return;
  const h = location.hash; let m, html, tab = 'home';
  if (h === '#/perfil') { html = profileView(); tab = 'me'; }
  else if (h === '#/estante') { html = libraryView(); tab = 'lib'; }
  else if (h === '#/salvos') { html = savedView(); tab = 'saved'; }
  else if ((m = h.match(/^#\/livro\/(.+)$/))) { html = bookView(m[1]); tab = 'lib'; }
  else html = feedView();
  $('#app').innerHTML = html + navHTML(tab);
  bind();
}
let lastHash = null;
addEventListener('hashchange', () => { render(); if (location.hash !== lastHash) scrollTo(0, 0); lastHash = location.hash; });
seed();
seedPosts();
applySampleArt();
if (db.profile.pin) showLock(); else render();
findAllCovers();
if (!db.profile.welcomed && !locked) welcomeDialog();
