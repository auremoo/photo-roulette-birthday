# 11 — Tests & recette

Pas de suite de tests automatisés (v1, projet événementiel). Voici un **plan de recette
manuel** à dérouler la veille pour valider que tout marche.

## 1. Pré-requis de test

- PC hôte avec `setup.ps1` déjà exécuté.
- Au moins 1 téléphone (idéalement 1 iPhone + 1 Android).
- Un second écran/onglet pour `/display`.

## 2. Scénarios de recette

### T1 — Démarrage tunnel
1. `\.\scripts\start-all.ps1`.
2. **Attendu** : URL `trycloudflare.com` affichée, QR généré, `/display` ouvert.
- ✅ / ❌

### T2 — Accès invité
1. Scanner le QR avec un téléphone (en 4G, wifi coupé).
2. **Attendu** : la page d'accueil s'ouvre, la photo `hero` s'affiche.
- ✅ / ❌

### T3 — Prise & affichage temps réel
1. Prendre une photo, saisir un prénom.
2. **Attendu** : confettis + vignette ; sous quelques secondes, la photo apparaît sur
   `/display` avec la bannière « nouvelle photo » et le prénom en légende.
- ✅ / ❌

### T4 — Orientation
1. Prendre une photo en tenant le téléphone verticalement.
2. **Attendu** : la photo s'affiche droite à l'écran (pas tournée).
- ✅ / ❌

### T5 — Aléatoire sans répétition
1. Envoyer ≥ 5 photos. Observer `/display` sur plusieurs cycles.
2. **Attendu** : aucune photo ne repasse avant que les 5 soient toutes passées ; puis
   nouveau cycle.
- ✅ / ❌

### T6 — Résilience offline (LE test clé)
1. Sur le téléphone, activer le **mode avion** (ou couper le wifi/4G).
2. Prendre 2–3 photos.
3. **Attendu** : message « 📴 Pas de réseau — X en attente », aucune erreur bloquante.
4. Réactiver le réseau.
5. **Attendu** : sous ~10 s, les photos partent automatiquement et apparaissent à l'écran.
- ✅ / ❌

### T7 — Reconnexion WebSocket
1. Sur `/display`, couper puis rétablir le réseau du PC (ou redémarrer le serveur).
2. **Attendu** : le point d'état repasse au vert, le temps réel refonctionne.
- ✅ / ❌

### T8 — Persistance après redémarrage serveur
1. Arrêter puis relancer le serveur.
2. Ouvrir `/display`.
3. **Attendu** : toutes les photos déjà envoyées sont toujours là (rechargées via `/api/photos`).
- ✅ / ❌

### T9 — Mode local (secours)
1. `\.\scripts\stop-all.ps1` puis activer le hotspot Windows.
2. `\.\scripts\start-local.ps1`.
3. Connecter un téléphone au hotspot, scanner le QR.
4. **Attendu** : prise et affichage fonctionnent en local.
- ✅ / ❌

### T10 — Multi-téléphones
1. 2+ téléphones envoient en même temps.
2. **Attendu** : toutes les photos arrivent, pas de collision de fichiers.
- ✅ / ❌

## 3. Checklist de validation finale

- [ ] T1 démarrage OK
- [ ] T2 accès invité OK
- [ ] T3 temps réel OK
- [ ] T4 orientation OK
- [ ] T5 aléatoire sans répétition OK
- [ ] T6 offline/retry OK
- [ ] T7 reconnexion WS OK
- [ ] T8 persistance OK
- [ ] T9 mode local OK
- [ ] T10 multi-téléphones OK
- [ ] Photo d'accueil en place (`web/hero.png`)
- [ ] `git status` : aucune image perso suivie
- [ ] Veille PC désactivée

## 4. Vérifs techniques rapides

```powershell
# santé serveur
curl http://localhost:8000/api/health        # -> {"ok":true,"count":N}

# liste des photos
curl http://localhost:8000/api/photos

# upload de test (depuis le PC)
curl -X POST http://localhost:8000/api/upload -F "file=@web/hero.png" -F "author=Test"
```

## 5. Idées de tests automatisés (futur)

- Test API `upload` → `photos` avec `pytest` + `httpx`.
- Test unité de l'algo `pickNext` (extrait en module JS testable).
- Voir [12 - Évolutions](12-evolutions.md).
