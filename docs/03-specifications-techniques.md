# 03 — Spécifications techniques

## 1. Stack

| Couche | Techno | Version | Pourquoi |
|---|---|---|---|
| Serveur web/API | FastAPI | 0.115 | upload multipart simple, WebSocket natif, async |
| Serveur ASGI | uvicorn[standard] | 0.34 | serveur perf + support WebSocket |
| Traitement image | Pillow | 11.1 | resize + correction orientation EXIF |
| Photos iPhone | pillow-heif | 1.4 | décodage HEIC/HEIF (au cas où iOS n'envoie pas du JPEG) |
| QR code | qrcode[pil] | 8.0 | génération QR (PNG + ASCII) |
| Tunnel | cloudflared | latest | URL publique HTTPS gratuite, sans compte |
| Front | HTML/CSS/JS natif | — | zéro build, zéro CDN, fonctionne hors-ligne |
| Runtime | Python | 3.11+ | déjà installé sur le PC hôte |
| OS cible | Windows 11 | — | PC de l'hôte |

## 2. Arborescence

```
photo-roulette-birthday/
├── server/
│   └── app.py              # backend FastAPI (API + WS + sert le front)
├── web/                    # front statique (servi sous /static)
│   ├── index.html          # accueil + capture
│   ├── capture.js          # capture, file offline (IndexedDB), PWA
│   ├── styles.css
│   ├── display.html        # écran de diffusion
│   ├── display.js          # slideshow aléatoire sans répétition + WS
│   ├── display.css
│   ├── manifest.json       # PWA
│   ├── sw.js               # service worker (offline shell)
│   ├── icon.svg
│   └── hero.png            # photo d'accueil (locale, ignorée par git)
├── scripts/
│   ├── setup.ps1           # venv + deps + cloudflared
│   ├── get-cloudflared.ps1
│   ├── start-all.ps1       # lancement principal (tunnel)
│   ├── start-local.ps1     # secours (hotspot / wifi local)
│   ├── stop-all.ps1
│   └── make_qr.py
├── uploads/                # photos (ignoré par git sauf .gitkeep)
├── bin/                    # cloudflared.exe, qr.png, logs (ignoré par git)
├── docs/                   # cette documentation
├── requirements.txt
├── .gitignore
└── README.md
```

## 3. Paramètres configurables

| Paramètre | Fichier | Valeur | Effet |
|---|---|---|---|
| `MAX_SIDE` | `server/app.py` | 1600 | côté max (px) des photos stockées |
| `JPEG_QUALITY` | `server/app.py` | 82 | compression JPEG (0–95) |
| `ALLOWED` | `server/app.py` | jpeg/png/webp/heic | types acceptés (Pillow re-encode en JPEG) |
| `ADVANCE_MS` | `web/display.js` | 5000 | durée d'affichage d'une photo (ms) |
| Port | `scripts/*.ps1` | 8000 | port d'écoute uvicorn |
| Host | `scripts/*.ps1` | 0.0.0.0 | écoute toutes interfaces (indispensable en local) |

## 4. Dépendances externes & réseau

- **Sortant** : `cloudflared` établit une connexion sortante vers Cloudflare (aucun port
  entrant à ouvrir sur la box).
- **Téléchargement unique** : `cloudflared.exe` récupéré depuis les releases GitHub officielles.
- **Aucune** dépendance CDN côté front (tout est servi localement).

## 5. Contraintes & hypothèses

- Le PC hôte reste allumé, déverrouillé, et ne se met pas en veille pendant la soirée
  (voir [Runbook §veille](10-exploitation-runbook.md)).
- Le pare-feu Windows autorise Python à écouter sur le réseau local (prompt au 1er lancement).
- Les navigateurs invités sont récents (iOS Safari ≥ 15, Android Chrome récent).
- Volume attendu : dizaines d'invités, centaines de photos — tient largement sur disque.

## 6. Compatibilité navigateurs

| Fonction | iOS Safari | Android Chrome | Desktop |
|---|---|---|---|
| `<input capture>` (caméra) | ✅ | ✅ | ouvre sélecteur fichier |
| IndexedDB (file offline) | ✅ | ✅ | ✅ |
| Service worker (PWA) | ✅ (HTTPS) | ✅ (HTTPS) | ✅ |
| WebSocket | ✅ | ✅ | ✅ |

> Le service worker nécessite un **contexte sécurisé** (HTTPS ou `localhost`). En mode
> tunnel c'est HTTPS → OK. En mode local HTTP, le SW peut être inactif : la file d'attente
> IndexedDB fonctionne quand même (elle ne dépend pas du SW).
