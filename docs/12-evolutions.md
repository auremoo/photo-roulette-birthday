# 12 — Évolutions & backlog

Idées non implémentées en v1, classées par intérêt/effort. La v1 privilégie la fiabilité
pour la soirée.

## 1. Confort invité

| Idée | Effort | Notes |
|---|---|---|
| Caméra live in-app (`getUserMedia`) + cadre photobooth | M | nécessite HTTPS (OK en tunnel) ; filtres, compte à rebours |
| Filtres/stickers déjantés avant envoi | M | canvas côté client |
| Légende texte / emoji sur la photo | S | champ en plus dans le formulaire |
| Prévisualisation avant envoi + « refaire » | S | |

## 2. Écran de diffusion

| Idée | Effort | Notes |
|---|---|---|
| Mode mosaïque / mur de photos | M | alternative au plein écran |
| Transitions variées (Ken Burns, glitch) | S | CSS |
| QR affiché en coin de l'écran de diffusion | S | pour que les nouveaux invités rejoignent |
| Compteur/animation « X photos ce soir » | S | |
| Musique/ambiance synchronisée | L | |

## 3. Données & persistance

| Idée | Effort | Notes |
|---|---|---|
| Persister `author` (sidecar JSON par photo) | S | pour le re-afficher après redémarrage |
| Export ZIP de la soirée | S | endpoint `/api/export` |
| Génération d'un diaporama vidéo final | M | ffmpeg |
| Miniatures séparées (thumbnails) | S | chargement plus léger |
| Suppression d'une photo depuis un écran admin | M | modération |

## 4. Réseau & robustesse

| Idée | Effort | Notes |
|---|---|---|
| Tunnel Cloudflare **nommé** (URL fixe) | M | nécessite compte + domaine → QR réutilisable |
| QR imprimé avec URL stable | — | dépend du tunnel nommé |
| Reprise d'upload résumable (gros fichiers) | M | |
| Compression côté client avant upload | S | réduit la bande passante |

## 5. Sécurité

| Idée | Effort | Notes |
|---|---|---|
| Code secret dans l'URL (`?k=...`) | S | filtre simple côté serveur |
| Cloudflare Access (vraie auth) | M | compte requis |
| Rate limiting upload | S | anti-spam |

## 6. Qualité / dev

| Idée | Effort | Notes |
|---|---|---|
| Tests API (`pytest` + `httpx`) | S | upload → photos |
| Algo `pickNext` extrait + testé | S | module JS isolé |
| Dockerfile | S | portabilité hors Windows |
| CI GitHub Actions (lint + tests) | S | |

## 7. Dette technique assumée (v1)

- `author` non persisté après redémarrage serveur (connu au temps réel seulement).
- Pas d'authentification (sécurité par obscurité de l'URL éphémère).
- Pas de miniatures (les photos sont déjà réduites à 1600 px).
- Scripts spécifiques Windows/PowerShell (le PC hôte est sous Windows).
- Nettoyage des vieux tunnels/logs manuel (`bin/`).

_Légende effort : S = petit, M = moyen, L = large._
