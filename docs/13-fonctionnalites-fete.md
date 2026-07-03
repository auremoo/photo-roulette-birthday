# 13 — Fonctionnalités fête (QR écran, mascottes, ballon, admin)

Fonctionnalités ajoutées pour rendre la soirée plus vivante et gérable, inspirées de
projets similaires. Toutes sont actives par défaut.

## 1. QR code sur l'écran de diffusion

Un QR code s'affiche en bas à gauche de `/display` avec le message « Scanne pour envoyer
tes photos ! ». Les nouveaux arrivants rejoignent en scannant directement l'écran géant.

- Image servie via `/static/qr.png`, générée au lancement par `scripts/make_qr.py`
  (qui écrit `web/qr.png` + `bin/public_url.txt`).
- L'écran récupère l'URL publique via `GET /api/info`.
- `web/qr.png` est **ignoré par git** (il contient l'URL éphémère du tunnel).

## 2. Mascottes animées

Des emojis rigolos (🦄 🍾 🤖 🦖 …) traversent l'écran de diffusion à intervalle aléatoire
(toutes les 6–12 s). 100 % côté client (`display.js`, fonction `spawnMascot`), aucune
charge serveur. Pour ajouter/retirer des mascottes : éditer le tableau `MASCOTS`.

## 3. Ballon collaboratif (mini-jeu)

Sur la page de capture, un bouton **« 🎈 GONFLE LE BALLON ! »**. Chaque appui incrémente un
compteur **partagé** ; l'écran de diffusion montre un ballon qui **grossit en temps réel**,
puis **explose** avec des confettis quand l'objectif est atteint, avant de repartir.

- `POST /api/balloon` → incrémente, diffuse `balloon` (ou `balloon_pop`) via WebSocket.
- Objectif configurable dans `server/app.py` → `balloon = {"count": 0, "goal": 25}`.
- L'affichage du ballon disparaît après 30 s sans activité.

## 4. Administration / modération (`/admin`)

Page protégée par **code PIN** (défaut `1234`, dans `server/app.py` → `ADMIN_PIN`) pour :

- **Voir** toutes les photos (plus récentes d'abord).
- **Supprimer** une photo gênante (disparaît aussi du diaporama en direct, via `deleted`).
- **Exporter** un **ZIP** de toutes les photos (bouton ⬇️).
- **Nouvelle soirée** : supprime toutes les photos (après double confirmation) et vide le
  diaporama en direct (via `reset`).

Accès rapide : double-clic sur **`4 - ADMIN (photos).bat`** (ouvre `/admin?pin=1234` en
local) ou va sur `http://localhost:8000/admin`.

> 🔒 La page /admin est aussi joignable via l'URL publique du tunnel : le PIN évite les
> manipulations accidentelles. Pour une vraie sécurité, change le PIN et voir
> [09 - Sécurité](09-securite-et-vie-privee.md).

## 5. Récapitulatif des réglages

| Réglage | Fichier | Défaut |
|---|---|---|
| Code PIN admin | `server/app.py` → `ADMIN_PIN` | `1234` |
| Objectif du ballon | `server/app.py` → `balloon["goal"]` | 25 |
| Liste des mascottes | `web/display.js` → `MASCOTS` | 15 emojis |
| Fréquence mascottes | `web/display.js` → `startMascots` | 6–12 s |

## 6. Workflow conseillé en fin de soirée

1. Ouvre l'admin (`4 - ADMIN (photos).bat`).
2. Clique **⬇️ Export ZIP** → sauvegarde le fichier `photos-soiree.zip`.
3. (Optionnel) **🗑️ Nouvelle soirée** pour repartir sur une galerie vide.
