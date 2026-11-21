#!/usr/bin/env python3
"""Organiza sua biblioteca do Spotify em playlists por gênero.

Seguro por padrão:
  * Sem --apply ele só mostra o plano (dry-run) e salva plan.json.
  * Nunca apaga nem altera playlists existentes; só cria playlists novas
    com o prefixo configurado e adiciona faixas que ainda não estão nelas.
Só usa a biblioteca padrão do Python (3.8+).
"""
import argparse, base64, hashlib, http.server, json, os, secrets, sys, threading
import time, urllib.error, urllib.parse, urllib.request, webbrowser
from collections import defaultdict

API = "https://api.spotify.com/v1"
AUTH = "https://accounts.spotify.com/authorize"
TOKEN = "https://accounts.spotify.com/api/token"
PORT = 8888
REDIRECT = f"http://127.0.0.1:{PORT}/callback"
SCOPES = "user-library-read playlist-read-private playlist-modify-private playlist-modify-public"

# Ordem importa: a primeira categoria que casar vence.
BUCKETS = [
    ("Funk BR", ["funk carioca", "funk paulista", "funk brasileiro", "funk ostentacao", "funk melody", "brazilian funk", "baile funk", "funk mtg", "funk bh"]),
    ("Sertanejo", ["sertanejo", "modao", "arrocha"]),
    ("Pagode e Samba", ["pagode", "samba", "axe", "roda de samba"]),
    ("Forró", ["forro", "piseiro", "brega", "xote"]),
    ("MPB e Bossa", ["mpb", "bossa nova", "tropicalia", "musica popular brasileira", "brazilian"]),
    ("Gospel", ["gospel", "worship", "christian", "louvor"]),
    ("Rap e Hip-Hop", ["hip hop", "rap", "trap", "drill", "boom bap"]),
    ("Metal", ["metal", "hardcore", "grindcore"]),
    ("Rock", ["rock", "grunge", "punk", "hard rock", "emo"]),
    ("Indie e Alternativo", ["indie", "alternative", "shoegaze", "dream pop", "lo-fi", "lofi"]),
    ("Eletrônica", ["edm", "house", "techno", "trance", "electro", "dubstep", "drum and bass", "dance", "synthwave", "eletronic", "electronic"]),
    ("R&B e Soul", ["r&b", "soul", "neo soul", "funk", "disco", "motown"]),
    ("Reggae", ["reggae", "dancehall", "ska", "dub"]),
    ("Jazz e Blues", ["jazz", "blues", "swing"]),
    ("Clássica e Trilhas", ["classical", "orchestra", "soundtrack", "score", "piano", "opera", "baroque"]),
    ("Latina", ["reggaeton", "latin", "salsa", "bachata", "cumbia", "urbano latino", "corrido"]),
    ("Country e Folk", ["country", "folk", "bluegrass", "americana", "singer-songwriter"]),
    ("Pop", ["pop", "k-pop", "j-pop", "boy band", "girl group"]),
]
FALLBACK = "Outros"


def http(method, url, headers=None, data=None, retries=5):
    body = None
    headers = dict(headers or {})
    if data is not None:
        if headers.get("Content-Type") == "application/json":
            body = json.dumps(data).encode()
        else:
            body = urllib.parse.urlencode(data).encode()
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "2")) + 1
                print(f"  rate limit, aguardando {wait}s...")
                time.sleep(wait)
                continue
            if e.code >= 500 and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"{method} {url} -> {e.code}: {e.read().decode()[:300]}")
    raise RuntimeError(f"Falhou após {retries} tentativas: {url}")


def login(client_id):
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    result = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            result.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<h2>Pronto! Pode fechar esta aba e voltar ao terminal.</h2>".encode())

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", PORT), H)
    url = AUTH + "?" + urllib.parse.urlencode({
        "client_id": client_id, "response_type": "code", "redirect_uri": REDIRECT,
        "scope": SCOPES, "state": state, "code_challenge_method": "S256",
        "code_challenge": challenge})
    print("Abrindo o navegador para você autorizar. Se não abrir, acesse:\n" + url)
    webbrowser.open(url)
    srv.timeout = 300
    while "code" not in result and "error" not in result:
        srv.handle_request()
    srv.server_close()
    if result.get("state") != state or "code" not in result:
        sys.exit(f"Autorização falhou: {result.get('error', 'state inválido')}")
    tok = http("POST", TOKEN, {"Content-Type": "application/x-www-form-urlencoded"}, {
        "grant_type": "authorization_code", "code": result["code"],
        "redirect_uri": REDIRECT, "client_id": client_id, "code_verifier": verifier})
    return tok["access_token"]


class Spotify:
    def __init__(self, token):
        self.h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def get(self, path, **params):
        url = path if path.startswith("http") else API + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        return http("GET", url, self.h)

    def post(self, path, data):
        return http("POST", API + path, self.h, data)

    def paged(self, path, **params):
        page = self.get(path, limit=50, **params)
        while True:
            yield from page.get("items", [])
            if not page.get("next"):
                break
            page = self.get(page["next"])

    def items_path(self, pid):
        return f"/playlists/{pid}/items"

    def playlist_tracks(self, pid):
        try:
            return list(self.paged(self.items_path(pid), fields="items(item(uri,type),track(uri,type)),next"))
        except RuntimeError:
            return list(self.paged(f"/playlists/{pid}/tracks"))

    def add(self, pid, uris):
        for i in range(0, len(uris), 100):
            chunk = {"uris": uris[i:i + 100]}
            try:
                self.post(self.items_path(pid), chunk)
            except RuntimeError:
                self.post(f"/playlists/{pid}/tracks", chunk)


def track_of(entry):
    t = entry.get("track") or entry.get("item") or entry
    if not t or t.get("type", "track") != "track" or not t.get("uri", "").startswith("spotify:track:"):
        return None
    return t


def collect(sp, source, me):
    tracks = {}
    print("Lendo músicas curtidas...")
    for e in sp.paged("/me/tracks"):
        t = track_of(e)
        if t:
            tracks[t["uri"]] = t
    if source == "all":
        for pl in sp.paged("/me/playlists"):
            if pl["owner"]["id"] != me:
                continue
            print(f"Lendo playlist: {pl['name']}")
            for e in sp.playlist_tracks(pl["id"]):
                t = track_of(e)
                if t and "artists" in t:
                    tracks.setdefault(t["uri"], t)
    return tracks


def genres_for(sp, tracks):
    ids = sorted({a["id"] for t in tracks.values() for a in t.get("artists", []) if a.get("id")})
    out = {}
    print(f"Buscando gêneros de {len(ids)} artistas...")
    for i in range(0, len(ids), 50):
        res = sp.get("/artists", ids=",".join(ids[i:i + 50]))
        for a in res.get("artists", []):
            if a:
                out[a["id"]] = a.get("genres", [])
    return out


def bucket(genres):
    scores = defaultdict(int)
    for g in genres:
        g = g.lower()
        for rank, (name, keys) in enumerate(BUCKETS):
            if any(k in g for k in keys):
                scores[name] += 1
                break
    if not scores:
        return FALLBACK
    order = {n: i for i, (n, _) in enumerate(BUCKETS)}
    return max(scores, key=lambda n: (scores[n], -order[n]))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--client-id", default=os.environ.get("SPOTIFY_CLIENT_ID"), help="Client ID do app Spotify (ou env SPOTIFY_CLIENT_ID)")
    ap.add_argument("--source", choices=["liked", "all"], default="liked", help="liked = só curtidas; all = curtidas + suas playlists")
    ap.add_argument("--prefix", default="Org · ", help="prefixo das playlists criadas")
    ap.add_argument("--min-tracks", type=int, default=10, help="categorias menores que isso vão para 'Outros'")
    ap.add_argument("--public", action="store_true", help="criar playlists públicas (padrão: privadas)")
    ap.add_argument("--apply", action="store_true", help="de fato criar as playlists (sem isso é só simulação)")
    a = ap.parse_args()
    if not a.client_id:
        sys.exit("Informe --client-id ou defina SPOTIFY_CLIENT_ID (veja o README).")

    sp = Spotify(login(a.client_id))
    me = sp.get("/me")["id"]
    tracks = collect(sp, a.source, me)
    print(f"{len(tracks)} músicas únicas encontradas.")
    gmap = genres_for(sp, tracks)

    groups = defaultdict(list)
    for uri, t in tracks.items():
        gs = [g for ar in t.get("artists", []) for g in gmap.get(ar.get("id"), [])]
        groups[bucket(gs)].append(uri)
    for name in [n for n, u in groups.items() if len(u) < a.min_tracks and n != FALLBACK]:
        groups[FALLBACK].extend(groups.pop(name))

    plan = {a.prefix + n: u for n, u in sorted(groups.items(), key=lambda kv: -len(kv[1]))}
    with open("plan.json", "w", encoding="utf-8") as f:
        json.dump({k: len(v) for k, v in plan.items()}, f, ensure_ascii=False, indent=2)
    print("\nPlano:")
    for n, u in plan.items():
        print(f"  {len(u):5d}  {n}")
    if not a.apply:
        print("\nSimulação apenas. Rode de novo com --apply para criar as playlists.")
        return

    existing = {pl["name"]: pl["id"] for pl in sp.paged("/me/playlists") if pl["owner"]["id"] == me}
    for name, uris in plan.items():
        if name in existing:
            pid = existing[name]
            have = {t["uri"] for e in sp.playlist_tracks(pid) if (t := track_of(e))}
            uris = [u for u in uris if u not in have]
            print(f"Atualizando '{name}': +{len(uris)}")
        else:
            pid = sp.post("/me/playlists", {"name": name, "public": a.public,
                                            "description": "Organizada automaticamente por gênero"})["id"]
            print(f"Criada '{name}': {len(uris)} faixas")
        if uris:
            sp.add(pid, uris)
    print("\nConcluído. Nenhuma playlist existente foi apagada ou alterada.")


if __name__ == "__main__":
    main()
