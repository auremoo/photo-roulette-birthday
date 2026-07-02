# 06 — Modèle de données & stockage

## 1. Pas de base de données

Le système n'utilise **aucune base de données**. La « source de vérité » est le contenu du
dossier `uploads/`. Cela simplifie l'exploitation et garantit la persistance des photos si
le serveur redémarre.

## 2. Nommage des fichiers

Chaque photo est stockée sous :

```
uploads/{timestamp_ms}-{uuid8}.jpg
        └── ex : 1719950400123-a1b2c3d4.jpg
```

- `timestamp_ms` : instant de réception serveur en millisecondes → **tri chronologique**
  naturel par nom.
- `uuid8` : 8 hex aléatoires → évite les collisions si deux photos arrivent la même ms.
- Extension toujours `.jpg` (les images sont re-encodées en JPEG à l'upload).

## 3. Objet `Photo` (exposé par l'API)

| Champ | Type | Source | Présent dans |
|---|---|---|---|
| `id` | string | nom de fichier sans extension | `/api/photos`, `/api/upload`, WS |
| `url` | string | `/uploads/{fichier}` | idem |
| `ts` | number (ms) | préfixe du nom de fichier | idem |
| `author` | string | champ `author` de l'upload | `/api/upload`, WS (pas dans `/api/photos`) |

> ⚠️ `author` n'est **pas** persisté séparément : il n'est connu qu'au moment de l'upload
> (donc présent dans la réponse d'upload et l'évènement WS temps réel), mais pas re-listé
> par `/api/photos` après un redémarrage. C'est un choix de simplicité v1
> (voir [12 - Évolutions](12-evolutions.md) pour le persister via un sidecar JSON).

## 4. Cycle de vie d'une photo

```
prise → file d'attente locale (téléphone, IndexedDB)
      → upload → normalisation Pillow → écriture uploads/{ts}-{uuid}.jpg
      → broadcast WS → affichée à l'écran
      → (après la soirée) sauvegarde manuelle du dossier uploads/
```

## 5. Normalisation à l'écriture (Pillow)

| Étape | But |
|---|---|
| `ImageOps.exif_transpose` | remet la photo droite selon l'orientation EXIF du téléphone |
| `convert("RGB")` | supprime canal alpha / modes exotiques → JPEG valide |
| `thumbnail((MAX_SIDE, MAX_SIDE))` | réduit à ≤ 1600 px (préserve le ratio) |
| `save(JPEG, quality=82, optimize=True)` | poids raisonnable, slideshow fluide |

## 6. Estimation de volume

- Une photo normalisée ≈ 200–500 Ko.
- 500 photos ≈ 100–250 Mo. Négligeable pour un PC.

## 7. Données côté client (téléphone)

| Stockage | Contenu | Durée de vie |
|---|---|---|
| `localStorage.author` | prénom saisi | persistant (jusqu'à effacement) |
| `localStorage.myCount` | compteur perso de photos envoyées | persistant |
| IndexedDB `queue` | photos en attente d'envoi (blob + author + ts) | jusqu'à envoi réussi |
| Cache SW `photo-roulette-v1` | coquille de l'app | jusqu'à mise à jour du SW |

## 8. Sauvegarde / récupération après la soirée

- Copier le dossier `uploads/` (ex. sur un disque externe / cloud perso).
- Optionnel : en faire un diaporama ou un ZIP souvenir.
