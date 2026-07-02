# 08 — Réseau & connectivité

C'est le cœur du sujet : « accéder à mon PC depuis n'importe quel réseau », avec un plan de
secours si le wifi manque.

## 1. Le problème

Un PC derrière une box internet n'a **pas d'adresse publique joignable** :
- IP publique souvent dynamique et partagée (CGNAT chez certains opérateurs) ;
- ouvrir un port sur la box = manipulation fragile, dépendante du matériel, et risquée.

Il faut donc un moyen d'exposer le serveur local sans toucher au routeur.

## 2. Solution principale : tunnel Cloudflare (`start-all.ps1`)

`cloudflared tunnel --url http://localhost:8000` ouvre une **connexion sortante** vers
Cloudflare, qui publie une URL `https://xxxx.trycloudflare.com` routée jusqu'à ton PC.

```
Téléphone (4G / n'importe quel wifi)
      │  HTTPS
      ▼
Cloudflare edge  ──(tunnel sortant établi par ton PC)──▶  localhost:8000
```

**Avantages**
- ✅ Accessible depuis **n'importe quel réseau** (données mobiles incluses).
- ✅ HTTPS gratuit (nécessaire au service worker / PWA).
- ✅ Aucun port à ouvrir, aucune config box.
- ✅ Sans compte (quick tunnel).

**Limites**
- ⚠️ L'URL **change à chaque lancement** → générer le QR le jour J (le script le fait).
- ⚠️ Dépend de l'accès internet du PC hôte.

## 3. Solution de secours : réseau local (`start-local.ps1`)

Si **aucun** internet :
1. Le PC crée un **hotspot wifi** (Paramètres Windows → Réseau → Point d'accès mobile),
   ou tout le monde rejoint le **wifi de la salle**.
2. Le serveur écoute sur `0.0.0.0:8000` ; le script détecte l'**IP locale** et génère le QR
   (`http://192.168.x.x:8000`).
3. Les invités doivent être sur le **même réseau** que le PC.

**Limites**
- ⚠️ HTTP (pas HTTPS) : le service worker peut rester inactif ; la file IndexedDB marche quand même.
- ⚠️ Tout le monde doit être à portée du même wifi/hotspot.
- ⚠️ Le nombre d'appareils sur un hotspot Windows est limité (≈ 8) — OK pour un petit groupe.

## 4. Comparatif des options envisagées

| Option | Multi-réseau | HTTPS | Compte | Config box | Retenu |
|---|---|---|---|---|---|
| **cloudflared quick tunnel** | ✅ | ✅ | ❌ | ❌ | ✅ principal |
| Réseau local / hotspot | ❌ (même wifi) | ❌ | ❌ | ❌ | ✅ secours |
| ngrok | ✅ | ✅ | ⚠️ (token) | ❌ | ❌ (compte requis) |
| Ouverture de port + DynDNS | ✅ | ⚠️ | ❌ | ✅ (fragile) | ❌ |
| Hébergement cloud complet | ✅ | ✅ | ⚠️ | ❌ | ❌ (le serveur doit être le PC) |
| GitHub Pages | ✅ (front only) | ✅ | ⚠️ | ❌ | ❌ (pas d'upload ni temps réel) |

## 4bis. Écran de diffusion : toujours en local, et le piège du DNS d'entreprise

L'écran de diffusion tourne sur le **PC serveur lui-même**. Il doit donc s'ouvrir via
**`http://localhost:8000/display`** (direct, pas de tunnel, pas de DNS). Le lanceur le fait
automatiquement.

⚠️ **Piège observé** : sur un **PC d'entreprise**, le DNS interne peut **bloquer
`trycloudflare.com`** → ouvrir l'URL publique sur ce PC donne `ERR_NAME_NOT_RESOLVED`.
- Ça ne concerne **que ce PC** : les invités (4G / autre wifi) résolvent l'URL normalement.
- Solution : sur le PC serveur, utiliser `localhost` pour l'écran (déjà le cas).
- Pour la soirée, le PC ne sera généralement pas sur le réseau d'entreprise → aucun souci.
  Si jamais le wifi du lieu filtrait aussi `trycloudflare.com`, les invités en 4G restent OK.

## 5. Matrice de pannes et de reprise

| Panne | Effet | Reprise |
|---|---|---|
| Wifi invité instable | uploads échouent ponctuellement | file d'attente + retry auto (rien perdu) |
| Invité perd totalement le réseau | photos en file locale | envoi auto au retour ; tant que la page est rouverte à portée du serveur |
| Internet du PC hôte coupé | tunnel tombe, plus d'accès distant | basculer en `start-local.ps1` (hotspot) ; photos déjà stockées conservées |
| Serveur redémarré | WS coupé un instant | reconnexion WS auto ; `uploads/` intact, `/api/photos` re-liste tout |
| WebSocket coupé (écran) | plus de temps réel | reconnexion auto toutes les 2 s |
| URL tunnel perdue | QR obsolète | relancer `start-all.ps1` → nouvelle URL + nouveau QR |

## 6. Recommandations le jour J

1. **La veille** : lancer `setup.ps1` avec un bon wifi (télécharge cloudflared + deps).
2. **Sur place** : tester d'abord `start-all.ps1`. Si le PC a internet (même 4G via partage
   de connexion d'un téléphone en USB/wifi), c'est le mode idéal.
3. **Plan B prêt** : savoir activer le hotspot Windows + lancer `start-local.ps1`.
4. **Empêcher la veille** du PC (voir [Runbook](10-exploitation-runbook.md)).
5. Garder le QR affiché en grand (imprimé ou sur un second écran).
