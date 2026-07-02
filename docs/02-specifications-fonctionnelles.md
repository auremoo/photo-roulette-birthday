# 02 — Spécifications fonctionnelles

Notation des exigences : **F** = fonctionnelle, **NF** = non fonctionnelle.
Chaque exigence a des **critères d'acceptation** (CA) vérifiables.

## 1. Accès à l'application

### F1 — Accès par QR code
- Le système génère un QR code encodant l'URL racine de l'app.
- **CA1.1** : scanner le QR ouvre la page de capture dans le navigateur du téléphone.
- **CA1.2** : le QR est disponible en image imprimable (`bin/qr.png`) et en ASCII dans le terminal.
- **CA1.3** : en mode tunnel, l'URL est publique HTTPS ; en mode local, c'est l'IP locale.

### F2 — Page d'accueil
- Affiche une **photo fournie par l'hôte** (`web/hero.png`) et un **bouton d'appareil photo**.
- **CA2.1** : si la photo existe, elle s'affiche ; si absente, la page fonctionne (photo masquée).
- **CA2.2** : un champ « prénom » optionnel est mémorisé entre les prises (localStorage).
- **CA2.3** : le bouton principal ouvre l'appareil photo du téléphone.

## 2. Prise et envoi de photo

### F3 — Capture
- **CA3.1** : appuyer sur le bouton ouvre la caméra arrière par défaut (`capture="environment"`).
- **CA3.2** : l'invité peut prendre plusieurs photos à la suite.

### F4 — Envoi & stockage temps réel
- **CA4.1** : après capture, la photo est envoyée au serveur qui la stocke sur disque.
- **CA4.2** : le serveur normalise la photo (orientation EXIF corrigée, redimensionnée ≤ 1600 px, JPEG).
- **CA4.3** : le serveur diffuse un évènement temps réel « nouvelle photo » aux pages de diffusion.
- **CA4.4** : l'invité reçoit un retour visuel (succès / en attente / échec).

### Règles de gestion — envoi
- **RG-ENV-1** : une photo est **toujours** mise en file d'attente locale avant l'envoi (aucune perte).
- **RG-ENV-2** : la file est vidée en FIFO ; un échec conserve les éléments non envoyés.
- **RG-ENV-3** : réessai automatique toutes les 8 s et à chaque retour de connexion (`online`).
- **RG-ENV-4** : le prénom associé est tronqué à 40 caractères côté serveur.

## 3. Diffusion (écran)

### F5 — Slideshow aléatoire sans répétition
- **CA5.1** : les photos défilent automatiquement (intervalle réglable, défaut 5 s).
- **CA5.2** : aucune photo ne repasse tant que **toutes** les photos du pool ne sont pas passées.
- **CA5.3** : quand toutes sont passées, un **nouveau cycle** démarre (ré-aléatoire).
- **CA5.4** : les photos ajoutées en cours de cycle entrent dans le tirage.

### Règles de gestion — diffusion
- **RG-DIF-1** : `shown` (photos déjà vues) se réinitialise uniquement à l'épuisement du pool.
- **RG-DIF-2** : une même photo n'est jamais présente deux fois dans le pool (dédup par `id`).
- **RG-DIF-3** : tant que le pool est vide, un écran d'attente invite à envoyer des photos.

### F6 — Temps réel
- **CA6.1** : une nouvelle photo arrivant via WebSocket est **affichée immédiatement**.
- **CA6.2** : une bannière « nouvelle photo » signale l'évènement.
- **CA6.3** : si le WebSocket tombe, la page se reconnecte automatiquement (indicateur d'état).

## 4. Résilience

### F7 — Accès multi-réseau
- **CA7.1** : en mode tunnel, l'app est joignable depuis n'importe quel réseau internet.
- **CA7.2** : en mode local, l'app est joignable par tout appareil sur le même wifi/hotspot.

### F8 — Résilience offline (téléphone)
- **CA8.1** : couper le réseau puis prendre des photos ne provoque aucune perte.
- **CA8.2** : au retour du réseau, les photos en attente s'envoient sans action de l'invité.
- **CA8.3** : l'app s'ouvre même hors-ligne (coquille en cache via service worker).

### F9 — Mode secours sans internet
- **CA9.1** : un script démarre l'app en réseau local et génère le QR vers l'IP locale.
- **CA9.2** : le passage tunnel → local ne perd aucune photo déjà stockée.

## 5. Ambiance & récupération

### F10 — Visuel festif
- **CA10.1** : arrière-plans animés, confettis à l'envoi, animations d'entrée/sortie des photos.

### F11 — Récupération des souvenirs
- **CA11.1** : toutes les photos sont dans `uploads/` et récupérables après la soirée.

## 6. Exigences non fonctionnelles

| ID | Exigence | Cible |
|---|---|---|
| NF1 | Zéro install côté invité | navigateur mobile uniquement |
| NF2 | Zéro build front, zéro CDN | assets 100 % locaux |
| NF3 | Lancement simple | 1 script (`start-all.ps1`) |
| NF4 | Latence temps réel | apparition < ~3 s après réception serveur |
| NF5 | Robustesse | reconnexion WS auto, retry upload auto |
| NF6 | Coût | 0 € |
| NF7 | Compatibilité | iOS Safari + Android Chrome récents |
| NF8 | Performance écran | slideshow fluide (photos ≤ 1600 px) |

## 7. Matrice de traçabilité (exigence → implémentation)

| Exigence | Où c'est réalisé |
|---|---|
| F1 | `scripts/make_qr.py`, `scripts/start-*.ps1` |
| F2 | `web/index.html`, `web/styles.css` |
| F3 | `web/index.html` (`<input capture>`) |
| F4 | `server/app.py` (`/api/upload`, Pillow, `hub.broadcast`) |
| F5 | `web/display.js` (`pickNext`, `shown`) |
| F6 | `server/app.py` (`/ws`), `web/display.js` (WebSocket) |
| F7 | `scripts/start-all.ps1` (tunnel) |
| F8 | `web/capture.js` (IndexedDB, drain), `web/sw.js` |
| F9 | `scripts/start-local.ps1` |
| F10 | `web/styles.css`, `web/display.css`, confettis JS |
| F11 | dossier `uploads/` |
