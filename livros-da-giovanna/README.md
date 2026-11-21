# Livros da Giovanna

App minimalista para registrar suas leituras: histórico durante a leitura, resenha e nota (0–5 estrelas, com meia estrela) ao concluir, e um perfil com foto, nome e top 5 favoritos.

## Como rodar
```bash
npm start        # abre em http://localhost:3000
PORT=8080 npm start
```
Precisa apenas do Node 16+ (sem `npm install`). Também funciona abrindo `index.html` direto no navegador.

## Recursos
- Abre direto na Estante; publicações, salvos e jornal editável no perfil e na estante
- Estante compacta em carrosséis; clique na capa para ampliar (sinopse e sumário)
- Capas buscadas na internet (Google Livros e Open Library) e guardadas no app; ou envie a sua
- Perfil com foto em moldura de renda, destaques e estatísticas
- PIN opcional para esconder o app ao abrir (não criptografa os dados)
- Já vem com livros e publicações de exemplo (removíveis em Perfil → Seus dados)

## Dados
Ficam no `localStorage` do navegador. Use **Perfil → Exportar backup** para guardar ou levar seus dados a outro aparelho (**Importar backup**).

## Estrutura
`Livros-da-Giovanna.html` (versão em arquivo único) · `index.html` · `style.css` · `app.js` · `server.js`
