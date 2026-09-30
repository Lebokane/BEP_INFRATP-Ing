# Kalc Systems — plateforme modulaire d’outils d’études

Plateforme qui regroupe des outils de calcul d’ingénierie (hydrologie, hydraulique routière, chaussées…)
et se **personnalise par client** : marque, logo, couleurs et modules sous licence.
Premier client : **INFRATP**. Le même code produira ensuite la version d’autres bureaux d’études, puis la version SaaS.

## Modules actuels

| Module | Catégorie | Version | Offre |
|---|---|---|---|
| `debits-hydro` — Débits hydrologiques | Hydrologie | 1.2.0 | standard |
| `dalots-bceom` — Dalots, méthode BCEOM | Hydraulique routière | 1.0.2 | standard |
| `dalots-fhwa` — Dalots, méthode FHWA (bêta) | Hydraulique routière | 1.1.0 | standard |
| `chaussees` — Chaussées multicouche | Chaussées | 2.0.0 | pro |

## Démarrage

Seul Node.js 20 ou plus est nécessaire (aucune dépendance à installer).

```bash
cd plateforme
npm test          # tests des moteurs de calcul et de la compilation
npm run dev       # compile tous les clients puis ouvre http://localhost:8080/
```

`npm run build` produit, pour chaque client, `dist/<client>/` :

- `index.html` : portail du client (ses modules, groupés par catégorie) ;
- `modules/<id>.html` : **un fichier autonome par module** (scripts, styles et logo intégrés), qui fonctionne hors connexion et peut être envoyé tel quel ;
- `registry.json` : catalogue des modules sous licence (servira à la version SaaS).

Le dossier `dist/<client>/` se dépose sur n’importe quel hébergement statique : serveur interne, Netlify, GitHub Pages, S3…

## Organisation

```
plateforme/
├── product.json          nom et version du produit, auteur
├── core/                 éléments partagés : portail, styles et kit JS des nouveaux modules
├── modules/
│   ├── _template/        modèle copié par « npm run new-module »
│   └── <id>/             module.json (manifeste) · index.html (interface) · engine.js (calcul) · *.test.mjs
├── tenants/<client>/     tenant.json (marque, couleurs, modules) · logo
├── scripts/              build, new-module, serve
├── tests/                tests des moteurs et de la marque blanche
└── docs/                 guides
```

**Règle d’architecture :** le calcul vit dans `engine.js` (fonctions pures, sans DOM), l’interface dans `index.html`.
Le même `engine.js` est exécuté par le navigateur et par les tests Node, ce qui évite d’avoir deux versions du calcul.

## Guides

- [Ajouter un module](docs/AJOUTER_UN_MODULE.md)
- [Ajouter un client / personnaliser](docs/NOUVEAU_CLIENT.md)
- [Commercialisation et feuille de route SaaS](docs/SAAS.md)
- [Points techniques à confirmer](docs/POINTS_TECHNIQUES.md)
