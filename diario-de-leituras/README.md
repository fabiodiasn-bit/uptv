# Diário de Leituras

App minimalista para registrar suas leituras: histórico durante a leitura, resenha e nota (0–5 estrelas, com meia estrela) ao concluir, e um perfil com foto, nome e top 5 favoritos.

## Como rodar
```bash
npm start        # abre em http://localhost:3000
PORT=8080 npm start
```
Precisa apenas do Node 16+ (sem `npm install`). Também funciona abrindo `index.html` direto no navegador.

## Recursos
- Carrosséis de livros (setas, arrastar, deslizar no celular, teclado ← →)
- Clique na capa para ampliar, com abas de Sinopse e Sumário (clique na capa ampliada para tela cheia)
- Capas buscadas automaticamente no Open Library quando há internet; ou envie a sua
- Já vem com 11 livros de exemplo (removíveis em Perfil → Seus dados)

## Dados
Ficam no `localStorage` do navegador. Use **Perfil → Exportar backup** para guardar ou levar seus dados a outro aparelho (**Importar backup**).

## Estrutura
`index.html` · `style.css` · `app.js` · `server.js`
