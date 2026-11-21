// Servidor estático mínimo, sem dependências. Uso: npm start  (PORT=8080 npm start para mudar a porta)
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const root = __dirname, port = process.env.PORT || 3000;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const file = path.join(root, path.normalize(p));
  if (!file.startsWith(root) || ['server.js', 'package.json'].includes(path.basename(file))) { res.writeHead(403); return res.end('Proibido'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  });
}).listen(port, () => console.log(`Diário de Leituras rodando em http://localhost:${port}`));
