# 05 — Référence API

Base URL = l'URL du tunnel (`https://xxxx.trycloudflare.com`) ou l'IP locale
(`http://192.168.x.x:8000`). Toutes les routes sont servies par le même process.

## Modèle `Photo`

```jsonc
{
  "id":     "1719950400123-a1b2c3d4", // = nom de fichier sans extension
  "url":    "/uploads/1719950400123-a1b2c3d4.jpg",
  "ts":     1719950400123,            // timestamp ms (ordre chronologique)
  "author": "Alex"                    // présent seulement dans la réponse d'upload
}
```

---

## `GET /`
Page d'accueil / capture (HTML). Destinée aux téléphones.

## `GET /display`
Page de diffusion plein écran (HTML). Destinée à l'écran/vidéoprojecteur.

---

## `POST /api/upload`
Envoie une photo. Le corps de la requête = **les octets bruts de l'image** (PAS de
`multipart/form-data`). Le prénom passe en **paramètre d'URL**.

> ⚠️ Choix volontaire : Safari/WebKit produit un `multipart/form-data` que la lib
> `python-multipart` lit parfois **vide** côté serveur (→ 422 / upload échoué). L'envoi
> en binaire brut élimine complètement ce problème. Voir [07-frontend](07-frontend.md).

**Paramètres**

| Où | Nom | Type | Requis | Notes |
|---|---|---|---|---|
| query | `author` | texte | ❌ | prénom, tronqué à 40 caractères |
| body | (corps) | octets image | ✅ | jpeg/png/webp/heic ; re-encodé en JPEG |
| header | `Content-Type` | mime | ❌ | ex. `image/jpeg` (indicatif) |

**Réponses**

| Code | Corps | Cas |
|---|---|---|
| 200 | `{ "ok": true, "photo": { id, url, ts, author } }` | succès |
| 400 | `{ "error": "fichier vide" }` | corps vide |
| 400 | `{ "error": "image illisible: ..." }` | image corrompue / format non décodable |

**Effets de bord** : écrit `uploads/{ts}-{uuid}.jpg` et diffuse `{type:"new", photo}` sur `/ws`.

**Exemple**
```bash
curl -X POST "https://xxxx.trycloudflare.com/api/upload?author=Alex" \
  --data-binary "@photo.jpg" \
  -H "Content-Type: image/jpeg"
```

---

## `GET /api/photos`
Liste toutes les photos, triées par ordre chronologique croissant.

**Réponse 200**
```json
{ "photos": [ { "id": "...", "url": "/uploads/....jpg", "ts": 1719950400123 } ] }
```

**Exemple**
```bash
curl https://xxxx.trycloudflare.com/api/photos
```

---

## `GET /api/health`
Sonde de santé.

**Réponse 200**
```json
{ "ok": true, "count": 42 }
```

---

## `WS /ws`
Canal temps réel. Le serveur pousse un message à chaque nouvelle photo. Le client n'a
rien à envoyer (les messages entrants côté serveur sont ignorés, la boucle garde juste la
connexion ouverte).

**Message poussé (serveur → client)**
```json
{ "type": "new", "photo": { "id": "...", "url": "/uploads/....jpg", "ts": 1719950400123, "author": "Alex" } }
```

**Comportement client** (voir `display.js`) : reconnexion automatique après 2 s si la
connexion tombe ; un indicateur (point vert/rouge) reflète l'état.

---

## `GET /api/info`
Infos pour l'écran de diffusion : URL publique (pour le QR à l'écran) + objectif du ballon.
```json
{ "public_url": "https://xxxx.trycloudflare.com", "balloon_goal": 25 }
```

## `GET /api/settings`
Réglages lus par la page de capture. Actuellement : compression côté téléphone.
```json
{ "compress": false }
```

## `POST /api/balloon`
Un invité gonfle le **ballon collaboratif** (mini-jeu). Incrémente le compteur partagé et
diffuse l'état via `/ws`. À l'objectif, le ballon « explose » (`balloon_pop`) et repart.
```json
{ "pop": false, "count": 7, "goal": 25 }
```

---

## Administration (modération) — protégé par PIN

Toutes ces routes exigent le PIN (`?pin=...` ou en-tête `X-Admin-Pin`). Défaut `1234`,
configurable dans `server/app.py` (`ADMIN_PIN`). Sinon → `403`.

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/admin` | Page d'administration (HTML) |
| `GET` | `/api/admin/photos?pin=` | Liste des photos (plus récentes d'abord) |
| `POST` | `/api/admin/settings?pin=&compress=1\|0` | Active/désactive la compression côté téléphone |
| `POST` | `/api/admin/delete?pin=&id=` | Supprime une photo (broadcast `deleted`) |
| `GET` | `/api/admin/export?pin=` | Télécharge un **ZIP** de toutes les photos |
| `POST` | `/api/admin/reset?pin=` | Supprime toutes les photos (broadcast `reset`) |

> Sécurité : `id` est validé (pas de `/`, `\`, `..`) et résolu strictement dans `uploads/`
> pour empêcher tout accès hors du dossier (path traversal).

---

## Messages WebSocket (serveur → client)

| `type` | Charge utile | Effet côté écran |
|---|---|---|
| `new` | `{photo}` | affiche la nouvelle photo |
| `deleted` | `{id}` | retire la photo du diaporama |
| `reset` | — | vide le diaporama |
| `balloon` | `{count, goal}` | met à jour la taille du ballon |
| `balloon_pop` | — | fait exploser le ballon + confettis |

---

## `GET /uploads/{fichier}`
Sert un fichier photo (image/jpeg). Monté via `StaticFiles`.

## `GET /static/{fichier}`
Sert les assets front (`styles.css`, `capture.js`, `display.js`, `manifest.json`, `sw.js`,
`icon.svg`, `hero.png`…).

---

## Codes d'erreur & robustesse

| Situation | Comportement |
|---|---|
| Upload d'un fichier non-image | 400 `image illisible` ; le client garde la photo en file et n'insiste pas (l'utilisateur peut réessayer) |
| Réseau coupé pendant l'upload | `fetch` échoue → la photo reste en file d'attente, retry auto |
| WebSocket coupé | reconnexion auto côté client |
| Serveur redémarré | les photos sur disque restent listées via `/api/photos` |

## Notes de sécurité

Aucune authentification (voir [09 - Sécurité & vie privée](09-securite-et-vie-privee.md)).
Quiconque possède l'URL peut uploader et lister. À réserver aux invités.
