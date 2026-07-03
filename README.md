# 📸 Photo Roulette Birthday

Une petite app web pour une soirée d'anniversaire : les invités **scannent un QR code**,
prennent des photos avec leur téléphone, et celles-ci s'affichent **en direct et en
aléatoire** sur un écran (vidéoprojecteur / autre PC). Ton PC sert de serveur.

- 🎨 Visuel déjanté (néon, confettis, animations)
- 📶 Marche depuis **n'importe quel réseau** (4G/5G, wifi) grâce à un tunnel Cloudflare
- 🔌 **Mode secours hors-ligne** : file d'attente sur le téléphone + réenvoi auto au retour du réseau
- 🎬 Slideshow **aléatoire sans répétition** (une photo ne repasse pas tant que toutes ne sont pas passées)
- ⚡ Temps réel : une nouvelle photo apparaît instantanément à l'écran
- 📱 **QR code affiché à l'écran** pour rejoindre en un scan
- 🦄 **Mascottes** rigolotes qui traversent l'écran
- 🎈 **Ballon collaboratif** : les invités le gonflent ensemble jusqu'à l'explosion
- 🔧 **Admin/modération** : supprimer une photo, **export ZIP**, « nouvelle soirée » (voir [docs/13](docs/13-fonctionnalites-fete.md))

---

## 🚀 Démarrage en 1 clic

> Prérequis : **Python 3.11+** et **Git** (déjà installés). Tout se fait en
> **double-cliquant** sur les fichiers `.bat` à la racine — aucun terminal à ouvrir.

### Étape 1 — Installation (UNE seule fois, la veille avec du bon wifi)
Double-clique sur **`1 - INSTALLER (une seule fois).bat`**
→ crée l'environnement Python, installe les dépendances et télécharge `cloudflared`.

### Étape 2 — (optionnel) Photo d'accueil
Une photo est déjà en place (`web\hero.png`). Pour la changer, remplace ce fichier
par la tienne (garde le nom `hero.png`).

### Étape 3 — Lancer la soirée 🎉
Double-clique sur **`2 - LANCER LA SOIREE.bat`**. Ça fait **tout, automatiquement** :

1. ✅ démarre le **serveur** sur ton PC,
2. ✅ ouvre le **tunnel internet** et récupère l'URL publique `https://xxxx.trycloudflare.com`,
3. ✅ affiche le **QR code** (dans la fenêtre + image `bin\qr.png` qui s'ouvre),
4. ✅ ouvre l'**écran de diffusion** `/display` sur ton PC (en local).

Ensuite :
- 📱 **Les invités** scannent le QR → prennent des photos → elles s'affichent en direct.
- 🖥️ **L'écran de diffusion** est déjà ouvert sur ton PC (`http://localhost:8000/display`) ;
  mets-le en **plein écran (F11)** sur le vidéoprojecteur / la TV.

> ⏳ Attends **~15 secondes** après le lancement (le temps que le tunnel se raccroche)
> avant de scanner/tester.

### Arrêter
Double-clique sur **`3 - ARRETER.bat`**.

---

## 🖥️ Important : l'écran de diffusion s'ouvre en **local** sur le PC serveur

Sur **ton PC** (le serveur), ouvre toujours l'écran via **`http://localhost:8000/display`**
(le lanceur le fait tout seul). N'utilise **pas** l'URL `trycloudflare.com` sur ce PC :
certains réseaux d'entreprise ont un **DNS qui bloque `trycloudflare.com`** (erreur
`ERR_NAME_NOT_RESOLVED`). Ça ne concerne que ton PC — les invités, eux, passent par
l'URL publique depuis leur 4G/wifi sans problème.

---

## 🆘 Pas d'internet du tout ? Mode local (hotspot)

Si le lieu n'a **aucun** accès internet :

1. Sur ton PC : **Paramètres Windows → Réseau et Internet → Point d'accès sans fil mobile** → Activer.
   (ou branche-toi au wifi de la salle : tout le monde doit être sur le **même réseau**.)
2. Double-clique sur **`scripts\start-local.ps1`** (ou lance-le depuis PowerShell).
   Ça génère un QR vers l'IP locale du PC (ex. `http://192.168.1.20:8000`).
3. Les invités se connectent au **même wifi/hotspot** puis scannent le QR.

> En mode local, la 4G ne permet plus d'accéder à l'app : les invités doivent être sur
> le hotspot/wifi du PC. C'est pourquoi le mode tunnel (avec internet) reste le meilleur.

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
🖥️  PC diffusion (localhost) ┘     (URL HTTPS)            ├─ sert le front (HTML/JS)
                                                          ├─ POST /api/upload (binaire brut, Pillow: resize+orientation)
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
├── 1 - INSTALLER (une seule fois).bat   # 1 clic : installation
├── 2 - LANCER LA SOIREE.bat             # 1 clic : démarre tout (serveur+tunnel+QR+display)
├── 3 - ARRETER.bat                      # 1 clic : arrête tout
├── 4 - ADMIN (photos).bat               # 1 clic : ouvre l'admin (modération, export, reset)
├── server/app.py          # backend FastAPI (API + WebSocket + sert le front)
├── web/
│   ├── index.html         # page d'accueil / capture (téléphones) + bouton ballon
│   ├── capture.js         # prise de photo + file d'attente offline + PWA + ballon
│   ├── styles.css
│   ├── display.html       # écran de diffusion (slideshow) + QR + mascottes + ballon
│   ├── display.js         # aléatoire sans répétition + temps réel + mascottes + ballon
│   ├── display.css
│   ├── admin.html         # page d'administration (modération/export/reset)
│   ├── admin.js
│   ├── manifest.json      # PWA
│   ├── sw.js              # service worker (réseau d'abord, cache secours)
│   ├── icon.svg
│   └── hero.png           # photo d'accueil
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
