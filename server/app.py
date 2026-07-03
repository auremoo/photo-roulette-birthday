"""
Photo Roulette Birthday — serveur FastAPI.

Un seul serveur qui :
  - sert le front (page capture pour les téléphones + page diffusion)
  - reçoit les photos (POST /api/upload), les redimensionne et les stocke sur disque
  - liste les photos (GET /api/photos)
  - pousse les nouvelles photos en temps réel via WebSocket (WS /ws)

Lancement :
    uvicorn server.app:app --host 0.0.0.0 --port 8000
(voir scripts/start-all.ps1 qui automatise tout)
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import time
import uuid
import zipfile
from pathlib import Path

logger = logging.getLogger("uvicorn.error")

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps

# Support des photos iPhone (HEIC/HEIF) : sans ça, Pillow ne sait pas les
# décoder et l'upload renvoie « image illisible ».
try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except Exception:
    pass  # si l'extension manque, on reste sur jpeg/png/webp

# --- Chemins ---------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"
UPLOAD_DIR = BASE_DIR / "uploads"
BIN_DIR = BASE_DIR / "bin"
UPLOAD_DIR.mkdir(exist_ok=True)

# --- Réglages --------------------------------------------------------------
MAX_SIDE = 1600          # côté max des photos stockées (px) -> slideshow fluide
JPEG_QUALITY = 82        # compression JPEG
ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

# Code d'accès à la page d'administration /admin (modération, export, reset).
# Change-le si tu veux ; il évite surtout les manipulations accidentelles.
ADMIN_PIN = "1234"

# Mini-jeu collaboratif du ballon : les invités appuient pour le gonfler ;
# quand le compteur atteint GOAL, le ballon explose à l'écran puis repart.
balloon = {"count": 0, "goal": 25}

# Réglages modifiables en direct depuis l'admin.
# compress : si True, les téléphones réduisent la photo AVANT l'envoi (uploads plus
# rapides/fiables en réseau faible). Désactivé par défaut.
settings = {"compress": False}

app = FastAPI(title="Photo Roulette Birthday")


# --- Gestion des connexions WebSocket (temps réel) -------------------------
class Hub:
    """Diffuse les évènements 'nouvelle photo' à toutes les pages ouvertes."""

    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self.lock:
            self.connections.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self.lock:
            self.connections.discard(ws)

    async def broadcast(self, message: dict) -> None:
        data = json.dumps(message)
        dead: list[WebSocket] = []
        async with self.lock:
            targets = list(self.connections)
        for ws in targets:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


hub = Hub()


# --- Helpers ---------------------------------------------------------------
def photo_entry(path: Path) -> dict:
    """Construit l'objet JSON décrivant une photo à partir de son fichier."""
    return {
        "id": path.stem,
        "url": f"/uploads/{path.name}",
        # le nom de fichier commence par le timestamp -> tri chronologique
        "ts": int(path.stem.split("-", 1)[0]) if "-" in path.stem else 0,
    }


def list_photos_sorted() -> list[dict]:
    files = [p for p in UPLOAD_DIR.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    entries = [photo_entry(p) for p in files]
    entries.sort(key=lambda e: e["ts"])
    return entries


# --- API -------------------------------------------------------------------
@app.post("/api/upload")
async def upload(request: Request):
    """Reçoit une photo en BINAIRE BRUT (corps de la requête) et la stocke.

    On n'utilise volontairement PAS de multipart/form-data : Safari/WebKit produit
    un multipart que la lib python-multipart lit parfois vide. Le corps de la
    requête = les octets de l'image ; le prénom passe en paramètre d'URL (?author=).
    """
    raw = await request.body()
    author = (request.query_params.get("author") or "").strip()[:40]
    logger.info(
        "UPLOAD recu: taille=%d octets author=%r content_type=%s",
        len(raw), author, request.headers.get("content-type"),
    )
    if not raw:
        return JSONResponse({"error": "fichier vide"}, status_code=400)

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)          # corrige l'orientation du tel
        img = img.convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE))          # réduit si trop grand
    except Exception as e:
        logger.exception("UPLOAD decode KO: err=%s", e)
        return JSONResponse({"error": f"image illisible: {e}"}, status_code=400)

    ts = int(time.time() * 1000)
    stem = f"{ts}-{uuid.uuid4().hex[:8]}"
    out_path = UPLOAD_DIR / f"{stem}.jpg"
    img.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True)

    entry = photo_entry(out_path)
    entry["author"] = (author or "").strip()[:40]
    await hub.broadcast({"type": "new", "photo": entry})
    return {"ok": True, "photo": entry}


@app.get("/api/photos")
async def photos():
    return {"photos": list_photos_sorted()}


@app.get("/api/health")
async def health():
    return {"ok": True, "count": len(list_photos_sorted())}


def read_public_url() -> str:
    """URL publique du tunnel, écrite par make_qr.py au lancement (pour le QR à l'écran)."""
    try:
        return (BIN_DIR / "public_url.txt").read_text(encoding="utf-8").strip()
    except Exception:
        return ""


@app.get("/api/info")
async def info():
    """Infos affichées par l'écran de diffusion (URL pour le QR, objectif ballon)."""
    return {"public_url": read_public_url(), "balloon_goal": balloon["goal"]}


@app.get("/api/settings")
async def get_settings():
    """Réglages lus par la page de capture (ex. compression côté téléphone)."""
    return {"compress": settings["compress"]}


@app.post("/api/balloon")
async def balloon_tap():
    """Un invité gonfle le ballon collaboratif."""
    balloon["count"] += 1
    if balloon["count"] >= balloon["goal"]:
        balloon["count"] = 0
        await hub.broadcast({"type": "balloon_pop"})
        return {"pop": True, "count": 0, "goal": balloon["goal"]}
    await hub.broadcast({"type": "balloon", "count": balloon["count"], "goal": balloon["goal"]})
    return {"pop": False, "count": balloon["count"], "goal": balloon["goal"]}


# --- Administration (modération / export / reset) --------------------------
def _check_pin(request: Request) -> bool:
    given = request.query_params.get("pin") or request.headers.get("x-admin-pin") or ""
    return given == ADMIN_PIN


def _safe_photo_path(pid: str) -> Path | None:
    """Résout un id de photo en chemin sûr dans uploads/ (anti path-traversal)."""
    if not pid or "/" in pid or "\\" in pid or ".." in pid:
        return None
    p = (UPLOAD_DIR / f"{pid}.jpg").resolve()
    if p.parent != UPLOAD_DIR.resolve():
        return None
    return p


@app.get("/admin")
async def admin_page():
    return FileResponse(WEB_DIR / "admin.html")


@app.get("/api/admin/photos")
async def admin_photos(request: Request):
    if not _check_pin(request):
        return JSONResponse({"error": "pin invalide"}, status_code=403)
    # ordre le plus récent d'abord (pratique pour modérer)
    return {"photos": list(reversed(list_photos_sorted()))}


@app.post("/api/admin/settings")
async def admin_set_settings(request: Request):
    if not _check_pin(request):
        return JSONResponse({"error": "pin invalide"}, status_code=403)
    val = request.query_params.get("compress")
    if val is not None:
        settings["compress"] = val.lower() in ("1", "true", "on", "yes")
    logger.info("ADMIN settings compress=%s", settings["compress"])
    return {"ok": True, "compress": settings["compress"]}


@app.post("/api/admin/delete")
async def admin_delete(request: Request):
    if not _check_pin(request):
        return JSONResponse({"error": "pin invalide"}, status_code=403)
    pid = request.query_params.get("id", "")
    target = _safe_photo_path(pid)
    if target is None or not target.exists():
        return JSONResponse({"error": "introuvable"}, status_code=404)
    target.unlink()
    await hub.broadcast({"type": "deleted", "id": pid})
    logger.info("ADMIN suppression photo %s", pid)
    return {"ok": True}


@app.get("/api/admin/export")
async def admin_export(request: Request):
    if not _check_pin(request):
        return JSONResponse({"error": "pin invalide"}, status_code=403)
    BIN_DIR.mkdir(exist_ok=True)
    zip_path = BIN_DIR / "photos-soiree.zip"
    # JPEG déjà compressés -> ZIP_STORED (rapide, pas de recompression)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as z:
        for p in sorted(UPLOAD_DIR.glob("*.jpg")):
            z.write(p, p.name)
    return FileResponse(zip_path, filename="photos-soiree.zip", media_type="application/zip")


@app.post("/api/admin/reset")
async def admin_reset(request: Request):
    if not _check_pin(request):
        return JSONResponse({"error": "pin invalide"}, status_code=403)
    n = 0
    for p in UPLOAD_DIR.glob("*.jpg"):
        try:
            p.unlink()
            n += 1
        except Exception:
            pass
    await hub.broadcast({"type": "reset"})
    logger.info("ADMIN reset galerie (%d photos supprimées)", n)
    return {"ok": True, "deleted": n}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await hub.connect(ws)
    try:
        while True:
            # on n'attend rien du client, mais garder la boucle ouverte
            await ws.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(ws)
    except Exception:
        await hub.disconnect(ws)


# --- Pages -----------------------------------------------------------------
@app.get("/")
async def index():
    return FileResponse(WEB_DIR / "index.html")


@app.get("/display")
async def display():
    return FileResponse(WEB_DIR / "display.html")


# fichiers photos + assets statiques
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")
