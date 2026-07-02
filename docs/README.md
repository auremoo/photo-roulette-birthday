# 📚 Documentation — Photo Roulette Birthday

Documentation complète du projet. Chaque document est autonome ; commence par la vision
puis descends vers les détails techniques selon ton besoin.

## Sommaire

| # | Document | Pour qui / quand |
|---|---|---|
| 00 | [Glossaire](00-glossaire.md) | Vocabulaire commun |
| 01 | [Vision & périmètre](01-vision-et-perimetre.md) | Comprendre le but, les personas, les user stories |
| 02 | [Spécifications fonctionnelles](02-specifications-fonctionnelles.md) | Exigences détaillées, règles de gestion, critères d'acceptation |
| 03 | [Spécifications techniques](03-specifications-techniques.md) | Stack, arborescence, réglages, contraintes |
| 04 | [Architecture](04-architecture.md) | Composants, flux, diagrammes de séquence |
| 05 | [Référence API](05-api.md) | Endpoints, schémas, exemples, codes d'erreur |
| 06 | [Modèle de données & stockage](06-modele-de-donnees.md) | Objet photo, nommage, cycle de vie sur disque |
| 07 | [Front-end](07-frontend.md) | Pages, PWA, service worker, algorithme du slideshow, file offline |
| 08 | [Réseau & connectivité](08-reseau-et-connectivite.md) | Tunnel, hotspot, modes, matrice de pannes/fallback |
| 09 | [Sécurité & vie privée](09-securite-et-vie-privee.md) | Modèle de menace, recommandations, données personnelles |
| 10 | [Exploitation — Runbook](10-exploitation-runbook.md) | Install, lancement, checklist jour J, dépannage |
| 11 | [Tests & recette](11-tests-et-recette.md) | Plan de test, scénarios, checklist de validation |
| 12 | [Évolutions & backlog](12-evolutions.md) | Idées futures, dette assumée |

## Lecture rapide selon ton rôle

- **Tu organises la soirée** → [10 - Runbook](10-exploitation-runbook.md) puis
  [08 - Réseau](08-reseau-et-connectivite.md).
- **Tu veux comprendre/modifier le code** → [04 - Architecture](04-architecture.md),
  [05 - API](05-api.md), [07 - Front-end](07-frontend.md).
- **Tu veux savoir “est-ce que ça résiste aux coupures ?”** →
  [08 - Réseau §Matrice de pannes](08-reseau-et-connectivite.md#5-matrice-de-pannes-et-de-reprise).
