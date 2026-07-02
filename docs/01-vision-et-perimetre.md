# 01 — Vision & périmètre

## 1. Pitch

> Pour l'anniversaire, les invités scannent un QR code, prennent des photos de la soirée
> depuis leur téléphone, et ces photos s'affichent **en direct et en aléatoire** sur un
> grand écran — comme une roulette de souvenirs qui tourne toute la nuit.

## 2. Objectifs

| Objectif | Mesure de succès |
|---|---|
| Accès ultra-simple pour les invités | Ouvrir l'app = scanner un QR, 0 install, < 10 s |
| Photos affichées en temps réel | Une photo prise apparaît à l'écran en quelques secondes |
| Diffusion variée | Pas de répétition avant que toutes les photos soient passées |
| Robustesse réseau | La soirée continue même si le wifi est instable / coupé |
| Ambiance festive | Visuel « déjanté » (néon, confettis, animations) |
| Souvenirs conservés | Toutes les photos récupérables après la soirée |

## 3. Non-objectifs (hors périmètre)

- Pas de comptes utilisateurs / authentification (soirée privée entre amis).
- Pas de modération avancée (l'événement est bon enfant).
- Pas de retouche/filtres photo côté app (v1).
- Pas d'hébergement cloud permanent : le serveur **est** le PC de l'hôte.
- Pas de scalabilité « grand public » : dimensionné pour une soirée (dizaines d'invités).

## 4. Personas

### 🎂 L'hôte (toi)
Lance le serveur sur son PC, gère le QR, l'écran de diffusion, et récupère les photos
après. Veut que « ça marche » sans stress technique le jour J.

### 🥳 L'invité
Sur son téléphone, réseau inconnu (4G ou wifi de la salle). Veut prendre une photo et la
voir passer à l'écran, sans installer d'app ni créer de compte.

### 🎬 L'écran
Un PC/laptop branché au vidéoprojecteur ou à la TV, ouvert sur `/display` en plein écran.

## 5. User stories

| ID | En tant que… | je veux… | afin de… | Priorité |
|---|---|---|---|---|
| US1 | invité | scanner un QR pour ouvrir l'app | ne rien installer | Must |
| US2 | invité | voir une photo perso sur l'accueil + un bouton photo | comprendre tout de suite quoi faire | Must |
| US3 | invité | prendre une photo et l'envoyer | participer à la soirée | Must |
| US4 | invité | mettre mon prénom (optionnel) | qu'on sache qui a pris la photo | Should |
| US5 | invité | que mes photos partent même si le réseau saute | ne rien perdre | Must |
| US6 | écran | afficher les photos en aléatoire sans répétition | garder de la variété | Must |
| US7 | écran | voir une nouvelle photo apparaître tout de suite | effet « waouh » temps réel | Must |
| US8 | hôte | lancer tout en une commande | ne pas galérer | Must |
| US9 | hôte | un mode de secours sans internet | assurer même sans wifi | Must |
| US10 | hôte | récupérer toutes les photos après | garder les souvenirs | Must |

## 6. Contexte & contraintes fortes

- **Événement daté** : la soirée a lieu à une date précise → fiabilité > richesse fonctionnelle.
- **Réseau incertain** : présence et qualité du wifi inconnues → deux modes prévus (tunnel / local) + résilience offline.
- **Matériel** : PC hôte sous Windows 11, Python 3.11, Git installés.
- **Budget** : 0 € (outils gratuits, pas de compte payant).
