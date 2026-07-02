# 07 — Front-end

Front 100 % statique, sans build ni CDN. Trois pages logiques : accueil/capture, diffusion,
plus la couche PWA (manifest + service worker).

## 1. Page capture — `index.html` + `capture.js`

### Éléments
- `#hero` : photo d'accueil (`/static/hero.png`), masquée si absente (`onerror`).
- `#author` : prénom optionnel, mémorisé dans `localStorage`.
- Bouton `.shoot` → `<input type="file" accept="image/*" capture="environment">` : ouvre
  l'appareil photo (caméra arrière) sur mobile.
- `#status`, `#count`, `#gallery` : retours visuels.

### Flux de prise de photo
```
change sur <input>
  → queueAdd({blob, author, ts})   // IndexedDB : AUCUNE perte
  → myCount++ ; vignette ; confettis
  → drainQueue()                    // tente l'envoi
```

### File d'attente offline (IndexedDB)
- Base `photo-roulette`, store `queue` (clé auto-incrémentée).
- `queueAdd` / `queueAll` / `queueDelete` encapsulent les transactions.
- `drainQueue()` :
  - lit tous les éléments, les envoie en FIFO via `POST /api/upload` ;
  - succès → `queueDelete(id)` ;
  - échec (réseau) → **arrêt**, on conserve tout, message « en attente ».
- **Déclencheurs de drain** : au chargement, sur évènement `online`, toutes les 8 s.
- Garde-fou `draining` : empêche deux drains simultanés.

### PWA
- `manifest.json` : nom, couleurs, icône → installable (« Ajouter à l'écran d'accueil »).
- `sw.js` enregistré au chargement ; met en cache la coquille (`/`, CSS, JS, manifest).

## 2. Page diffusion — `display.html` + `display.js`

### État
| Variable | Rôle |
|---|---|
| `pool` | toutes les photos connues |
| `poolIds` | `Set` d'`id` pour dédupliquer |
| `shown` | `Set` des `id` déjà montrés dans le cycle courant |
| `currentEl` | photo actuellement à l'écran (pour l'animation de sortie) |
| `timer` | timer d'avance automatique |

### Algorithme aléatoire sans répétition
```js
pickNext():
  candidats = pool.filter(p => !shown.has(p.id))
  if (candidats vide) { shown = new Set(); candidats = pool }  // nouveau cycle
  choix = candidats[random]
  shown.add(choix.id)
  return choix
```
- Avance auto toutes les `ADVANCE_MS` (défaut 5000).
- **Propriété garantie** : aucune photo ne repasse avant épuisement complet du pool.

### Temps réel (WebSocket)
- `connectWS()` : ouvre `ws(s)://host/ws`.
  - `onopen` → point d'état vert.
  - `onclose` → point rouge + reconnexion après 2 s.
  - `onmessage` `{type:"new"}` → ajoute au pool, bannière « nouvelle photo »,
    **affiche immédiatement** la photo et la marque `shown`.
- Choix `ws`/`wss` selon `location.protocol` (HTTP local vs HTTPS tunnel).

### Animations
- Entrée `enter` (zoom + rotation), sortie `leave`, légende avec le prénom, fond néon animé.

## 3. Service worker — `sw.js`

- `install` : met en cache `SHELL` (`/`, CSS, `capture.js`, manifest) puis `skipWaiting`.
- `activate` : purge les vieux caches, `clients.claim`.
- `fetch` : **n'intercepte jamais** `/api`, `/uploads`, `/ws` (toujours réseau frais).
  Le reste : *cache-first* avec repli réseau.

> Le SW ne met **pas** les photos en cache : le slideshow doit refléter l'état réel du
> serveur, et on évite de saturer le stockage du navigateur.

## 4. Styles

- `styles.css` (capture) et `display.css` (diffusion) : thème néon, animations, responsive.
- Aucune police/asset externe → fonctionne hors-ligne.

## 5. Points d'attention navigateur

- **iOS** : `capture` peut proposer photo/vidéo ; l'utilisateur choisit « Photo ».
- **HTTP local** : le service worker peut ne pas s'activer (contexte non sécurisé) ; la file
  IndexedDB fonctionne quand même.
- **Permission caméra** : gérée nativement par l'OS via le sélecteur, pas de prompt custom.
