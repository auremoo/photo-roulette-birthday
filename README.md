# 📸 Photo Roulette Birthday

Une petite app web pour une soirée d'anniversaire : les invités **scannent un QR code**,
prennent des photos avec leur téléphone, et celles-ci s'affichent **en direct et en
aléatoire** sur un écran (vidéoprojecteur / autre PC). Ton PC sert de serveur.

- 🎨 Visuel déjanté (néon, confettis, animations)
- 📶 Marche depuis **n'importe quel réseau** (4G/5G, wifi) grâce à un tunnel Cloudflare
- 🔌 **Mode secours hors-ligne** : file d'attente sur le téléphone + réenvoi auto au retour du réseau
- 🎬 Slideshow **aléatoire sans répétition** (une photo ne repasse pas tant que toutes ne sont pas passées)
- ⚡ Temps réel : une nouvelle photo apparaît instantanément à l'écran

---

## 🚀 Démarrage rapide (3 étapes)

> Prérequis : **Python 3.11+** et **Git** (déjà installés chez toi ✅).
> Ouvre un terminal **PowerShell** dans le dossier du projet.

### 1. Installation (à faire UNE fois, la veille avec du bon wifi)
```powershell
.\scripts\setup.ps1
```
Ça crée l'environnement Python, installe les dépendances et télécharge `cloudflared`.

### 2. (Optionnel) Dépose la photo d'accueil
Mets ta photo dans `web\hero.jpg` (ou `.png`) → elle s'affiche sur la page d'accueil.
Si absente, la page marche quand même (photo simplement masquée).

### 3. Lancer la soirée 🎉
```powershell
.\scripts\start-all.ps1
```
Le script :
- démarre le serveur,
- ouvre un **tunnel public** et récupère l'URL `https://xxxx.trycloudflare.com`,
- affiche un **QR code** (dans le terminal + image `bin\qr.png`),
- ouvre l'**écran de diffusion** sur ce PC.

Puis :
- 📱 **Invités** → scannent le QR (URL racine) → prennent des photos.
- 🖥️ **Écran de diffusion** → ouvre `https://xxxx.trycloudflare.com/display` sur le PC/écran voulu.

Pour tout arrêter :
```powershell
.\scripts\stop-all.ps1
```

---

## 🆘 Pas d'internet du tout ? Mode local (hotspot)

1. Sur ton PC : **Paramètres Windows → Réseau et Internet → Point d'accès sans fil mobile** → Activer.
   (ou branche-toi au wifi de la salle : tout le monde doit être sur le **même réseau**.)
2. Lance :
   ```powershell
   .\scripts\start-local.ps1
   ```
   Ça génère un QR vers l'IP locale du PC (ex. `http://192.168.1.20:8000`).
3. Les invités se connectent au **même wifi/hotspot** puis scannent le QR.

> En mode local, l'appareil photo s'ouvre via le sélecteur de fichiers du téléphone
> (fonctionne en HTTP). Le tunnel (mode principal) fournit du HTTPS.

---

## 🧠 Et si on perd la connexion pendant la soirée ?

C'est prévu :

- **Côté téléphone** : chaque photo prise est d'abord **stockée en file d'attente** dans le
  navigateur (IndexedDB). Si le réseau est coupé, **rien n'est perdu** : l'app réessaie
  automatiquement toutes les 8 s et dès que la connexion revient (événement `online`).
  L'invité voit un message *« 📴 Pas de réseau — X photo(s) en attente »*.
- **App installable / hors-ligne** : un *service worker* met en cache la page ; l'app
  s'ouvre même sans réseau (on peut « Ajouter à l'écran d'accueil »).
- **Côté serveur** : si ton PC perd internet, le **tunnel se coupe** → bascule sur le
  **mode local** (hotspot) avec `start-local.ps1` sans rien reprendre. Les photos déjà
  stockées sur le disque restent là (`uploads/`) et le slideshow continue.

Limite honnête : si un téléphone quitte totalement la soirée avec des photos encore en
file d'attente et ne rouvre jamais la page, ces photos-là ne partiront pas. Tant que la
page est rouverte à portée du serveur, elles s'envoient.

---

## 🏗️ Architecture

```
📱 Téléphones (capture) ─┐
                         ├─► 🌐 tunnel cloudflared ─► 💻 TON PC : FastAPI (uvicorn)
🖥️  PC diffusion ─────────┘        (URL HTTPS)            ├─ sert le front (HTML/JS)
                                                          ├─ POST /api/upload (Pillow: resize + orientation)
                                                          ├─ GET  /api/photos
                                                          └─ WS   /ws (temps réel)
                                                          photos stockées dans uploads/
```

- **Un seul serveur** sert le front ET l'API → une seule origine, pas de CORS.
- **Pas de build front** : HTML/CSS/JS pur, aucune dépendance CDN (marche hors-ligne).
- **Stockage** : fichiers JPEG sur disque dans `uploads/` (redimensionnés à 1600 px max).

📚 **Documentation complète et specs détaillées dans [docs/](docs/README.md)** (vision,
specs fonctionnelles/techniques, architecture, API, réseau, sécurité, runbook, tests…).

---

## 📂 Structure

```
photo-roulette-birthday/
├── server/app.py          # backend FastAPI (API + WebSocket + sert le front)
├── web/
│   ├── index.html         # page d'accueil / capture (téléphones)
│   ├── capture.js         # prise de photo + file d'attente offline + PWA
│   ├── styles.css
│   ├── display.html       # écran de diffusion (slideshow)
│   ├── display.js         # tirage aléatoire sans répétition + temps réel
│   ├── display.css
│   ├── manifest.json      # PWA
│   ├── sw.js              # service worker (offline)
│   ├── icon.svg
│   └── hero.jpg           # (à déposer) photo d'accueil
├── scripts/
│   ├── setup.ps1          # install (venv + deps + cloudflared)
│   ├── get-cloudflared.ps1
│   ├── start-all.ps1      # LANCEMENT principal (tunnel internet)
│   ├── start-local.ps1    # mode secours (hotspot / wifi local)
│   ├── stop-all.ps1
│   └── make_qr.py         # génère le QR code
├── uploads/               # photos de la soirée (ignoré par git)
├── docs/                  # documentation complète (specs, archi, API, runbook…)
├── requirements.txt
└── README.md
```

---

## 🔧 Réglages utiles

| Réglage | Où | Défaut |
|---|---|---|
| Durée d'affichage d'une photo | `web/display.js` → `ADVANCE_MS` | 5000 ms |
| Taille max des photos stockées | `server/app.py` → `MAX_SIDE` | 1600 px |
| Qualité JPEG | `server/app.py` → `JPEG_QUALITY` | 82 |
| Port | scripts `start-*.ps1` | 8000 |

---

## ⚠️ Notes

- L'URL `trycloudflare.com` **change à chaque lancement** du tunnel. Génère le QR **le jour J**,
  juste avant la soirée (le script le fait automatiquement).
- App pensée pour une soirée privée : **pas d'authentification**, tout le monde avec le lien
  peut envoyer/voir. Ne partage le QR qu'aux invités.
- Sauvegarde le dossier `uploads/` après la soirée pour garder les souvenirs 💾.
```
