# Ajouter un module

## 1. Créer le squelette

```bash
npm run new-module -- descente-charges --name "Descente de charges" --category "Structures"
```

Le dossier `modules/descente-charges/` est créé à partir de `modules/_template/`. Il contient un exemple complet
et fonctionnel (canal rectangulaire, Manning) à remplacer.

| Fichier | Rôle |
|---|---|
| `module.json` | Manifeste : nom, catégorie, version, statut, résumé, méthodes, références, offre |
| `engine.js` | Le calcul : fonctions pures, unités SI, aucune manipulation de la page |
| `engine.test.mjs` | Tests du calcul (cas de référence, cas limites) |
| `index.html` | L’interface : formulaire, résultats, méthode et limites |

## 2. Écrire le calcul dans `engine.js`

- Une fonction `validate(p)` qui refuse les saisies hors domaine avec un message clair.
- Une fonction `calculate(p)` qui renvoie les résultats **et** une liste `warnings` (domaine d’emploi, hypothèses).
- Pas d’arrondi intermédiaire : l’arrondi se fait à l’affichage.
- Le fichier se termine par l’export commun navigateur / Node (déjà présent dans le modèle).

## 3. Tester

Dans `engine.test.mjs`, comparer à des **cas de référence publiés** (exemples de manuel, logiciel de référence,
solution exacte), comme le fait l’onglet « Validation » du module Chaussées.

```bash
npm test
```

## 4. Construire l’interface

`index.html` utilise `core/base.css` (charte commune) et `core/kit.js` :

| Fonction | Usage |
|---|---|
| `Kit.fmt(v, d)` | nombre au format français, « — » si indéfini |
| `Kit.esc(s)` | échappement HTML |
| `Kit.csv(nom, lignes)` | export CSV compatible Excel français |
| `Kit.toast(texte)` | message temporaire |
| `Kit.watchStale(form, zone)` | signale que les résultats ne correspondent plus aux saisies |
| `Kit.readNumbers(form)` | lit tous les champs numériques du formulaire |

### Marqueurs disponibles

Ne jamais écrire le nom d’une entreprise en dur : utiliser les marqueurs remplacés à la compilation.

| Marqueur | Exemple (INFRATP) |
|---|---|
| `{{BRAND.name}}` | INFRATP |
| `{{BRAND.fullName}}` | INFRATP · Ingénieur Conseil |
| `{{BRAND.logo}}` | logo intégré (data URI) |
| `{{BRAND.logoAlt}}` | INFRATP — Ingénieur Conseil |
| `{{BRAND.slug}}` | INFRATP (noms de fichiers exportés) |
| `{{BRAND.eyebrow}}` | INFRATP / OUTILS D’ÉTUDES |
| `{{MODULE.id}}`, `{{MODULE.name}}`, `{{MODULE.version}}` | depuis `module.json` |
| `{{PRODUCT.name}}`, `{{PRODUCT.version}}` | depuis `product.json` |
| `{{CREDIT_HTML}}`, `{{CREDIT_SUFFIX}}`, `{{CREDIT_CSV_ROW}}` | mention du développeur, vide si le client l’a désactivée |

Un marqueur inconnu arrête la compilation.

Les couleurs s’écrivent avec les jetons `var(--green)`, `--lime`, `--forest`, `--ink`, `--muted`, `--line`, `--bg`
et `--amber`. Le thème du client les remplace. Une couleur écrite en dur (`#54800e`) ne suivra pas la charte du client.

## 5. Publier

1. Passer `status` à `beta` puis `stable`, et incrémenter `version` à chaque modification du calcul.
2. `npm test && npm run dev` : le module apparaît dans le portail des clients configurés avec `"modules": ["*"]`.
3. Pour un client qui a une liste de modules, ajouter l’id dans son `tenant.json`.

## Intégrer un outil HTML existant

C’est ce qui a été fait pour les 4 premiers outils :

1. Copier le fichier dans `modules/<id>/index.html`.
2. Sortir le `<script>` de calcul dans `engine.js` et le remplacer par `<script src="engine.js"></script>`.
3. Remplacer le logo et les mentions d’entreprise par les marqueurs ci-dessus.
4. Remplacer les couleurs du `:root` par les jetons de la charte.
5. Écrire `module.json`, puis lancer `npm test` : le test « marque blanche » signale toute mention oubliée.
