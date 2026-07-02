# 04 — Architecture

## 1. Vue d'ensemble

```
        📱 Téléphones (capture)                🖥️ Écran de diffusion
        ┌───────────────────┐                 ┌───────────────────┐
        │ index.html        │                 │ display.html      │
        │ capture.js        │                 │ display.js        │
        │ IndexedDB (queue) │                 │ pool + shown      │
        │ service worker    │                 │ WebSocket client  │
        └─────────┬─────────┘                 └─────────┬─────────┘
                  │  HTTPS (POST /api/upload)            │ WS /ws + GET /api/photos
                  │  + WS /ws                            │
                  ▼                                      ▼
        ┌──────────────────────────────────────────────────────────┐
        │                🌐 tunnel cloudflared (HTTPS)               │
        │                 https://xxxx.trycloudflare.com            │
        └───────────────────────────┬──────────────────────────────┘
                                     │  (connexion sortante)
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │           💻 PC HÔTE — FastAPI / uvicorn :8000            │
        │  ┌────────────────────────────────────────────────────┐  │
        │  │  Routes pages   :  /  ,  /display                    │  │
        │  │  API            :  POST /api/upload                  │  │
        │  │                    GET  /api/photos                  │  │
        │  │                    GET  /api/health                  │  │
        │  │  Temps réel     :  WS   /ws  (Hub broadcast)         │  │
        │  │  Statique       :  /static/* , /uploads/*            │  │
        │  │  Traitement     :  Pillow (orientation + resize)     │  │
        │  └────────────────────────────────────────────────────┘  │
        │                     Disque : uploads/*.jpg                │
        └──────────────────────────────────────────────────────────┘
```

## 2. Composants

### 2.1 Serveur (`server/app.py`)
- **Un seul process** sert le front (HTML/JS) ET l'API → une seule origine, pas de CORS.
- **Hub WebSocket** : maintient l'ensemble des connexions ouvertes et diffuse les
  évènements « nouvelle photo ».
- **Pipeline upload** : lecture → `ImageOps.exif_transpose` → `convert("RGB")` →
  `thumbnail(MAX_SIDE)` → `save(JPEG)` → broadcast.
- **Liste photos** : dérivée du contenu de `uploads/` (pas de base de données), triée par
  timestamp encodé dans le nom de fichier.

### 2.2 Page capture (`web/index.html` + `capture.js`)
- Photo d'accueil + bouton caméra (`<input type=file accept=image/* capture=environment>`).
- File d'attente IndexedDB : robustesse offline (voir [07-frontend](07-frontend.md)).
- Service worker : coquille en cache.

### 2.3 Page diffusion (`web/display.html` + `display.js`)
- Charge le pool initial via `GET /api/photos`.
- Se connecte au WebSocket pour le temps réel (reconnexion auto).
- Algorithme aléatoire sans répétition (`pickNext`).

### 2.4 Tunnel (`cloudflared`)
- Processus séparé, connexion **sortante** vers Cloudflare, expose `localhost:8000`.

## 3. Diagramme de séquence — envoi d'une photo

```
Invité      Navigateur(capture.js)     IndexedDB      Serveur(FastAPI)     Écran(display.js)
  │  prend photo  │                        │               │                    │
  │──────────────▶│  queueAdd(blob)        │               │                    │
  │               │───────────────────────▶│               │                    │
  │               │  confetti + vignette    │               │                    │
  │               │  drainQueue()           │               │                    │
  │               │  POST /api/upload ───────────────────────▶│                  │
  │               │                         │   resize+save  │                    │
  │               │                         │◀── queueDelete │                    │
  │               │◀───── 200 {photo} ───────────────────────│                    │
  │               │                         │               │  WS "new" photo ───▶│
  │               │                         │               │                    │ affiche direct
```

## 4. Diagramme de séquence — démarrage de l'écran

```
display.js                         Serveur
   │  GET /api/photos ─────────────────▶│
   │◀──── {photos:[...]} ───────────────│
   │  connectWS() → WS /ws ─────────────▶│  (ajout au Hub)
   │  boucle: toutes ADVANCE_MS         │
   │     pickNext() → affiche           │
   │  à réception "new": affiche direct │
```

## 5. Flux de données

1. **Upload** : téléphone → (queue) → serveur → fichier `uploads/{ts}-{uuid}.jpg`.
2. **Notification** : serveur → tous les WS → `{type:"new", photo}`.
3. **Diffusion** : écran choisit une photo (pool − shown) → `<img src=/uploads/...>`.

## 6. Décisions clés (résumé)

| Décision | Alternative écartée | Raison |
|---|---|---|
| Tunnel cloudflared | ouverture de ports / ngrok / cloud | gratuit, sans compte, sans config, sûr |
| Front servi par FastAPI | GitHub Pages | pas de CORS, un seul process, statique+API ensemble |
| Fichiers sur disque | base de données | simplicité, persistance, volume faible |
| `<input capture>` | `getUserMedia` live | compatibilité maximale, marche aussi en HTTP |
| WebSocket | polling HTTP | vrai temps réel, moins de charge |
| Queue IndexedDB | envoi direct | zéro perte si réseau coupé |

Détails et alternatives complètes : [08 - Réseau](08-reseau-et-connectivite.md).
