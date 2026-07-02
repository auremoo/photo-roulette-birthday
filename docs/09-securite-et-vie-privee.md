# 09 — Sécurité & vie privée

App conçue pour une **soirée privée entre amis**. La sécurité est volontairement légère,
mais voici les risques et comment les limiter.

## 1. Modèle de menace (simplifié)

| Actif | Menace | Gravité | Mitigation |
|---|---|---|---|
| Photos de la soirée | accès non autorisé via l'URL | moyenne | ne diffuser le QR qu'aux invités ; URL tunnel imprévisible et éphémère |
| PC hôte | exposition d'un service au public | moyenne | seul le port applicatif est exposé via le tunnel, rien d'autre ; arrêter après la soirée |
| Photos (contenu) | upload d'images non désirées | faible | événement privé ; possibilité de supprimer un fichier dans `uploads/` |
| Vie privée des invités | photos + prénoms partagés | moyenne | données restent sur le PC hôte ; pas de cloud tiers |

## 2. Absence d'authentification — assumée

- N'importe qui possédant l'URL peut **uploader** et **lister** les photos.
- C'est un choix pour la simplicité d'accès (0 friction pour les invités).
- **Contre-mesure principale** : l'URL du quick tunnel est aléatoire et **change à chaque
  lancement** ; elle n'est pas indexée. Ne la partage qu'aux invités.

### Si tu veux durcir (optionnel)
- Ajouter un **code secret** dans l'URL (ex. `/?k=motdepasse`) vérifié côté serveur.
- Utiliser **Cloudflare Access** (nécessite un compte + domaine) pour une vraie auth.
- Passer par un tunnel **nommé** (URL fixe + politique d'accès).

Voir [12 - Évolutions](12-evolutions.md).

## 3. Données personnelles

- **Nature** : photos de personnes + prénoms facultatifs.
- **Localisation** : uniquement sur le PC hôte (`uploads/`) et, temporairement, dans le
  navigateur des invités (file d'attente, cache coquille).
- **Aucun** envoi à un service tiers d'analyse ; Cloudflare ne fait que router le trafic
  (il transite chiffré en HTTPS jusqu'à ton PC).
- **Bon usage** : prévenir les invités que leurs photos s'affichent à l'écran ; supprimer
  sur demande un fichier de `uploads/` ; effacer le dossier si quelqu'un le souhaite.

## 4. ⚠️ Publication du code sur GitHub public

- **Ne jamais committer** de photos personnelles (dont `web/hero.png`) : elles seraient
  publiques et potentiellement indexées/mises en cache **même après suppression**.
- Le `.gitignore` exclut déjà `web/hero.*`, `accueil.*` et le dossier `uploads/`.
- Vérifier avant push : `git status` ne doit montrer **aucune** image perso.
- Ne pas committer non plus `bin/` (contient `cloudflared.exe`, logs, `qr.png` avec l'URL).

## 5. Surface réseau

- Le tunnel n'expose **que** l'application (port 8000), pas le reste du PC.
- En mode local, le serveur écoute sur `0.0.0.0` : accessible à tout le réseau local le
  temps de la soirée — acceptable sur un hotspot privé. **Arrêter** le serveur après
  (`stop-all.ps1`).

## 6. Checklist sécurité/vie privée avant la soirée

- [ ] `git status` : aucune photo perso suivie par git.
- [ ] QR partagé uniquement aux invités.
- [ ] PC à jour (antivirus/pare-feu actifs).
- [ ] Après la soirée : `stop-all.ps1`, sauvegarder puis, si besoin, purger `uploads/`.
