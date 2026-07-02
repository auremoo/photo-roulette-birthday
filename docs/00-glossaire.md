# 00 — Glossaire

| Terme | Définition |
|---|---|
| **Hôte / PC serveur** | Le PC qui fait tourner le serveur (FastAPI). Il stocke les photos. |
| **Capture** | Page web ouverte par les invités sur leur téléphone pour prendre/envoyer des photos (`/`). |
| **Display / Diffusion** | Page plein écran affichée sur l'écran/vidéoprojecteur qui fait défiler les photos (`/display`). |
| **Pool** | Ensemble des photos connues côté page de diffusion. |
| **Cycle** | Une passe complète du slideshow : toutes les photos du pool montrées une fois. À la fin, un nouveau cycle démarre. |
| **Shown** | Ensemble des photos déjà affichées dans le cycle courant. |
| **Tunnel** | Lien réseau créé par `cloudflared` exposant le serveur local derrière une URL publique HTTPS. |
| **Quick tunnel** | Tunnel Cloudflare éphémère (`*.trycloudflare.com`), sans compte, URL différente à chaque lancement. |
| **Hotspot** | Point d'accès wifi créé par le PC (mode secours sans internet). |
| **Mode principal** | Lancement via tunnel internet (`start-all.ps1`). |
| **Mode local / secours** | Lancement sur réseau local sans internet (`start-local.ps1`). |
| **PWA** | *Progressive Web App* : appli web installable, capable de fonctionner hors-ligne via un service worker. |
| **Service worker (SW)** | Script du navigateur qui met en cache la coquille de l'app et intercepte les requêtes réseau. |
| **File d'attente (offline queue)** | Stockage local (IndexedDB) des photos en attente d'envoi côté téléphone. |
| **Drain** | Processus qui vide la file d'attente en envoyant les photos une par une au serveur. |
| **WebSocket (WS)** | Canal temps réel bidirectionnel entre le serveur et les pages ouvertes. |
| **EXIF** | Métadonnées d'image (dont l'orientation) intégrées par les téléphones. |
