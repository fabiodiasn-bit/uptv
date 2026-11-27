# Organizador de biblioteca do Spotify

Cria playlists por gênero (Sertanejo, Rock, Rap, Eletrônica, Funk BR, etc.) a partir das suas músicas curtidas, e opcionalmente das suas playlists atuais.

**Seguro:** por padrão só simula. Nunca apaga nem altera playlists existentes. Só cria novas (privadas) com o prefixo `Org · `.

## Passo a passo (uma vez só)

1. Acesse https://developer.spotify.com/dashboard e clique em **Create app**.
2. Em **Redirect URI** coloque exatamente: `http://127.0.0.1:8888/callback`
3. Marque **Web API**, salve e copie o **Client ID**. Não precisa do Client Secret.
4. No computador (precisa de Python 3.8+):

```bash
export SPOTIFY_CLIENT_ID=seu_client_id
python3 organize.py                 # simulação: mostra o plano e salva plan.json
python3 organize.py --apply         # cria as playlists de verdade
```

O navegador abre para você autorizar com a sua conta. A senha e o token ficam só na sua máquina.

## Opções

| Opção | O que faz |
|---|---|
| `--source all` | Inclui também as músicas das suas playlists (padrão: só curtidas) |
| `--prefix "Meu · "` | Muda o prefixo das playlists criadas |
| `--min-tracks 15` | Categorias menores que isso vão para "Outros" |
| `--public` | Cria playlists públicas |

Rodar de novo é seguro: playlists com o mesmo nome só recebem as faixas novas.

## Ajustando as categorias

Edite a lista `BUCKETS` no topo de `organize.py` (nome da playlist + palavras-chave de gênero). A primeira categoria que casar vence.

## Desfazer

Basta apagar as playlists que começam com `Org · `. Suas músicas curtidas e playlists originais continuam intactas.

## Versão web (celular)

`web/index.html` faz o mesmo no navegador, sem instalar nada. Hospede a pasta `web` em qualquer endereço https (por exemplo GitHub Pages), cadastre esse endereço como Redirect URI no app do Spotify, abra a página no celular, cole o Client ID e toque em Entrar.
