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
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps

# --- Chemins ---------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# --- Réglages --------------------------------------------------------------
MAX_SIDE = 1600          # côté max des photos stockées (px) -> slideshow fluide
JPEG_QUALITY = 82        # compression JPEG
ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

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
async def upload(file: UploadFile = File(...), author: str = Form("")):
    """Reçoit une photo, la normalise (orientation + resize + JPEG) et la stocke."""
    raw = await file.read()
    if not raw:
        return JSONResponse({"error": "fichier vide"}, status_code=400)

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)          # corrige l'orientation du tel
        img = img.convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE))          # réduit si trop grand
    except Exception:
        return JSONResponse({"error": "image illisible"}, status_code=400)

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
