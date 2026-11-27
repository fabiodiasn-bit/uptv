#!/usr/bin/env python3
"""
Servidor de música do Spotimy.

Roda no seu computador, lê uma pasta de músicas e transmite os arquivos pela
rede Wi-Fi. O celular toca direto daqui: nada é copiado nem importado.

Uso:
    python servidor.py "C:\\Musicas"
    python servidor.py ~/Musicas --porta 8765 --senha minhasenha

Só usa a biblioteca padrão do Python 3 (nada para instalar).
"""
import argparse
import hashlib
import hmac
import json
import os
import re
import socket
import sys
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

EXT = {
    ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac",
    ".wav": "audio/wav", ".ogg": "audio/ogg", ".oga": "audio/ogg",
    ".opus": "audio/ogg", ".flac": "audio/flac",
}
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # pasta spotimy/
CACHE_SECONDS = 20


def scan(root):
    items = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if name.startswith(".") or ext not in EXT:
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            parts = rel.split("/")
            base = os.path.splitext(name)[0]
            m = re.split(r"\s+-\s+", base, maxsplit=1)
            if len(m) > 1:
                artist, title = m[0], m[1]
            else:
                title = base
                artist = parts[-3] if len(parts) >= 3 else "Artista desconhecido"
            album = parts[-2] if len(parts) >= 2 else (os.path.basename(root.rstrip("/\\")) or "Música")
            items.append({
                "id": hashlib.sha1(rel.encode("utf-8")).hexdigest()[:16],
                "title": title.strip() or base,
                "artist": artist.strip(),
                "album": album,
                "path": full,
                "ext": ext,
            })
    items.sort(key=lambda x: (x["album"].lower(), x["title"].lower()))
    return items


class Library:
    def __init__(self, root):
        self.root = root
        self.items = []
        self.by_id = {}
        self.at = 0

    def get(self, force=False):
        if force or time.time() - self.at > CACHE_SECONDS:
            self.items = scan(self.root)
            self.by_id = {i["id"]: i for i in self.items}
            self.at = time.time()
        return self.items


def make_handler(lib, password):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "SpotimyServer"

        def log_message(self, *args):  # silencioso
            pass

        # ---------- utilidades ----------
        def cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Allow-Headers", "Range")
            self.send_header("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")

        def reply(self, status, body=b"", ctype="text/plain; charset=utf-8", extra=None):
            self.send_response(status)
            self.cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def authorized(self, query):
            if not password:
                return True
            given = (query.get("k") or [""])[0]
            return hmac.compare_digest(given.encode("utf-8"), password.encode("utf-8"))

        # ---------- rotas ----------
        def do_OPTIONS(self):
            self.send_response(204)
            self.cors()
            self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_HEAD(self):
            self.do_GET()

        def do_GET(self):
            url = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(url.query)
            path = urllib.parse.unquote(url.path)
            try:
                if path in ("/", "/index.html"):
                    return self.serve_app()
                if path == "/logo.svg":
                    return self.serve_static("logo.svg", "image/svg+xml")
                if path == "/api/library":
                    if not self.authorized(query):
                        return self.reply(401, b'{"erro":"senha"}', "application/json")
                    items = lib.get(force="refresh" in query)
                    body = json.dumps({
                        "nome": os.path.basename(lib.root.rstrip("/\\")) or lib.root,
                        "tracks": [{k: i[k] for k in ("id", "title", "artist", "album", "ext")} for i in items],
                    }, ensure_ascii=False).encode("utf-8")
                    return self.reply(200, body, "application/json; charset=utf-8", {"Cache-Control": "no-store"})
                m = re.fullmatch(r"/files/([0-9a-f]{16})", path)
                if m:
                    if not self.authorized(query):
                        return self.reply(401, b"senha")
                    lib.get()
                    item = lib.by_id.get(m.group(1))
                    if not item or not os.path.isfile(item["path"]):
                        return self.reply(404, b"nao encontrado")
                    return self.send_file(item["path"], EXT[item["ext"]])
                return self.reply(404, b"nao encontrado")
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass  # o navegador cancelou (ex.: pulou para outro ponto da música)

        def serve_static(self, name, ctype):
            p = os.path.join(APP_DIR, name)
            if not os.path.isfile(p):
                return self.reply(404, b"nao encontrado")
            with open(p, "rb") as f:
                self.reply(200, f.read(), ctype)

        def serve_app(self):
            p = os.path.join(APP_DIR, "index.html")
            if not os.path.isfile(p):
                msg = "Spotimy não encontrado. Deixe a pasta 'servidor' dentro da pasta 'spotimy'."
                return self.reply(200, msg.encode("utf-8"), "text/plain; charset=utf-8")
            with open(p, "rb") as f:
                html = f.read().decode("utf-8")
            html = html.replace("</head>", "<script>window.SPOTIMY_SERVER=true</script></head>", 1)
            self.reply(200, html.encode("utf-8"), "text/html; charset=utf-8", {"Cache-Control": "no-cache"})

        def send_file(self, path, ctype):
            size = os.path.getsize(path)
            start, end, status = 0, size - 1, 200
            rng = self.headers.get("Range")
            if rng:
                m = re.match(r"bytes=(\d*)-(\d*)", rng)
                if m:
                    a, b = m.groups()
                    if a == "" and b != "":
                        start = max(0, size - int(b))
                    else:
                        if a != "":
                            start = int(a)
                        if b != "":
                            end = min(int(b), size - 1)
                    if start > end or start >= size:
                        return self.reply(416, b"", extra={"Content-Range": "bytes */%d" % size})
                    status = 206
            length = end - start + 1
            self.send_response(status)
            self.cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(length))
            if status == 206:
                self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
            self.end_headers()
            if self.command == "HEAD":
                return
            with open(path, "rb") as f:
                f.seek(start)
                left = length
                while left > 0:
                    chunk = f.read(min(64 * 1024, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)

    return Handler


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # não envia nada, só descobre a interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main():
    ap = argparse.ArgumentParser(description="Servidor de música do Spotimy")
    ap.add_argument("pasta", help="pasta com as suas músicas (pode ser uma pasta compartilhada)")
    ap.add_argument("--porta", type=int, default=8765)
    ap.add_argument("--senha", default="", help="senha opcional para acessar a biblioteca")
    ap.add_argument("--local", action="store_true", help="aceitar conexões só deste computador")
    a = ap.parse_args()

    root = os.path.abspath(os.path.expanduser(a.pasta))
    if not os.path.isdir(root):
        sys.exit("Pasta não encontrada: " + root)

    lib = Library(root)
    n = len(lib.get(force=True))
    host = "127.0.0.1" if a.local else "0.0.0.0"
    try:
        srv = ThreadingHTTPServer((host, a.porta), make_handler(lib, a.senha))
    except OSError as e:
        sys.exit("Não consegui usar a porta %d (%s). Tente outra com --porta 8800." % (a.porta, e))

    ip = "127.0.0.1" if a.local else lan_ip()
    print("=" * 60)
    print(" Spotimy servidor")
    print(" Pasta:   %s" % root)
    print(" Músicas: %d" % n)
    print()
    print(" No celular (mesmo Wi-Fi), abra:")
    print("     http://%s:%d" % (ip, a.porta))
    print(" Neste computador:")
    print("     http://localhost:%d" % a.porta)
    if not a.senha and not a.local:
        print()
        print(" Aviso: sem senha, qualquer aparelho da sua rede Wi-Fi pode ouvir")
        print("        esta pasta. Use --senha para proteger.")
    print()
    print(" Para parar: Ctrl+C")
    print("=" * 60)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
