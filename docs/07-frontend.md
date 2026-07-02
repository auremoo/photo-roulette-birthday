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
  - lit tous les éléments, les envoie en FIFO via `POST /api/upload?author=...` avec le
    **blob en corps de requête** (binaire brut, pas de `FormData`/multipart — voir §3) ;
  - succès (2xx) → `queueDelete(id)` ;
  - erreur réseau (coupure) → **arrêt**, on conserve tout, message « en attente » ;
  - erreur serveur 5xx → **arrêt**, on réessaiera plus tard ;
  - refus 4xx (image invalide) → on retire l'élément (sinon il bloquerait la file).
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

## 3. Pourquoi un envoi binaire (et pas multipart) ?

Historiquement l'upload utilisait `FormData` (`multipart/form-data`). Problème constaté en
conditions réelles : **Safari/WebKit (iPhone)** produit un corps multipart que la lib
serveur `python-multipart` lit **vide** (`form keys=[]`), d'où un **422** et une photo
jamais enregistrée (message trompeur « format non supporté »). `curl` passait, mais pas le
téléphone. Solution : envoyer **les octets bruts du blob** dans le corps, prénom en
`?author=`. Simple, robuste, indépendant du navigateur.

## 4. Service worker — `sw.js`

- `install` : met en cache `SHELL` (`/`, CSS, `capture.js`, manifest) puis `skipWaiting`.
- `activate` : purge les vieux caches, `clients.claim`.
- `fetch` : **n'intercepte jamais** `/api`, `/uploads`, `/ws` (toujours réseau frais).
  Le reste : **réseau d'abord**, mise en cache au passage, **repli sur le cache hors-ligne**.

> Stratégie *réseau d'abord* choisie pour que les téléphones récupèrent **toujours la
> dernière version** du front (fini les soucis de cache pendant les mises à jour), tout en
> gardant l'ouverture hors-ligne grâce au cache de secours. Le SW ne met **pas** les photos
> en cache : le slideshow doit refléter l'état réel du serveur.

## 5. Styles

- `styles.css` (capture) et `display.css` (diffusion) : thème néon, animations, responsive.
- Aucune police/asset externe → fonctionne hors-ligne.

## 6. Points d'attention navigateur

- **iOS** : `capture` peut proposer photo/vidéo ; l'utilisateur choisit « Photo ».
- **HTTP local** : le service worker peut ne pas s'activer (contexte non sécurisé) ; la file
  IndexedDB fonctionne quand même.
- **Permission caméra** : gérée nativement par l'OS via le sélecteur, pas de prompt custom.
