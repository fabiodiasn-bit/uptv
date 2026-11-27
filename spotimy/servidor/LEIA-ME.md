# Spotimy no seu computador (tocar a sua pasta de música no celular)

O navegador do celular não consegue abrir uma pasta do computador por conta própria.
Este pequeno servidor resolve isso: ele roda no computador, lê a sua pasta de músicas e
transmite pela rede Wi-Fi. **Nada é copiado ou importado**: o celular toca direto do computador.

## O que você precisa

- Python 3 no computador (gratuito, em python.org; no Windows marque "Add Python to PATH").
- O computador e o celular **no mesmo Wi-Fi**.
- O computador ligado enquanto você ouve.
- Esta pasta (`servidor`) dentro da pasta `spotimy`, como está no repositório.

## Passo a passo

1. Abra o terminal (no Windows: PowerShell) dentro da pasta `spotimy/servidor`.
2. Rode, trocando o caminho pela sua pasta de músicas:

   ```
   python servidor.py "C:\Users\Voce\Musicas"
   ```

   Pode ser uma pasta compartilhada, por exemplo `python servidor.py "Z:\Musicas"`.
3. A janela mostra um endereço, parecido com `http://192.168.0.10:8765`.
4. No celular, abra esse endereço no navegador. O Spotimy abre já conectado ao computador.
5. Em **Início**, veja a seção **No seu computador**, ou toque no botão **Computador** do topo.

Para parar o servidor: `Ctrl+C` na janela.

## Proteger com senha (recomendado)

Sem senha, qualquer aparelho do seu Wi-Fi consegue ouvir a pasta.

```
python servidor.py "C:\Users\Voce\Musicas" --senha minhasenha
```

O Spotimy pede a senha na primeira vez e lembra depois.

## Outras opções

| Opção | O que faz |
| --- | --- |
| `--porta 8800` | usa outra porta (padrão: 8765) |
| `--local` | aceita conexões só deste computador |

## Como o Spotimy organiza as músicas

- Arquivo `Artista - Música.mp3` vira artista e título.
- A pasta onde o arquivo está vira o álbum.
- Com a estrutura `Artista/Álbum/Música.mp3`, o artista vem do nome da pasta.
- Formatos: mp3, m4a, aac, wav, ogg, opus e flac.

## Problemas comuns

- **O celular não abre o endereço:** o firewall do computador pode estar bloqueando.
  No Windows, aceite a janela "Permitir acesso" que aparece na primeira vez.
  Confira também se os dois estão no mesmo Wi-Fi (Wi-Fi de visitantes costuma isolar os aparelhos).
- **Músicas novas não aparecem:** a lista atualiza sozinha em poucos segundos. Recarregue a página.
- **Spotify e Jamendo:** o login do Spotify exige endereço https, então use a versão publicada do
  Spotimy para o Spotify. A versão aberta pelo servidor é a que toca a pasta do computador.
  Elas guardam as configurações separadas.
- **Segurança:** o servidor só entrega arquivos de áudio que ele mesmo achou dentro da pasta
  escolhida. Não acesse pelo celular fora do Wi-Fi de casa; ele não foi feito para a internet.
