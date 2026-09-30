# Ajouter un client (marque blanche)

Chaque client est un dossier `tenants/<id>/` avec un `tenant.json` et un logo. Aucun code à modifier.

## 1. Créer le dossier

Copier `tenants/demo/` vers `tenants/<id>/` puis adapter :

```json
{
  "id": "acme",
  "name": "ACME",
  "fullName": "ACME · Ingénierie",
  "logo": "logo.png",
  "logoAlt": "ACME Ingénierie",
  "slug": "ACME",
  "eyebrow": "ACME / OUTILS",
  "credit": false,
  "portal": { "title": "Outils de calcul", "subtitle": "Texte d’accueil du portail." },
  "theme": {
    "green": "#1d5fa8", "lime": "#4a90d9", "forest": "#16324f", "ink": "#1c2833",
    "muted": "#5d6d7e", "line": "#d6dee8", "bg": "#f2f5f9", "amber": "#9a6412"
  },
  "modules": ["debits-hydro", "dalots-bceom"]
}
```

| Champ | Rôle |
|---|---|
| `id` | identique au nom du dossier |
| `name`, `fullName`, `logoAlt`, `eyebrow` | textes affichés. Utiliser l’apostrophe typographique ’ : l’apostrophe droite ' est refusée |
| `slug` | préfixe des fichiers exportés (CSV, JSON) : lettres, chiffres, - et _ |
| `logo` | fichier du dossier : jpg, png, svg ou webp. Il est intégré dans chaque page |
| `credit` | `true` affiche « Développeur : … » (depuis `product.json`), `false` le masque |
| `digitizer` | facultatif : auteur affiché pour les abaques numérisés (par défaut, le nom du produit) |
| `theme` | 8 couleurs de la charte : `green` accent, `lime` accent clair, `forest` fond foncé, `ink` texte, `muted` texte secondaire, `line` bordures, `bg` fond de page, `amber` alertes |
| `modules` | `["*"]` pour tous les modules, sinon la liste des modules sous licence |

## 2. Compiler et vérifier

```bash
npm run build -- --tenant acme
npm test
npm run serve        # http://localhost:8080/acme/
```

La compilation refuse un logo absent, une couleur mal écrite ou un module inconnu. Le test « marque blanche »
vérifie que la sortie du client démo ne contient aucune mention d’INFRATP.

## 3. Livrer

- **Installation chez le client** : envoyer le dossier `dist/acme/`, ou le déposer sur son intranet.
- **Outil isolé** : un seul fichier `dist/acme/modules/<id>.html` suffit. Il fonctionne hors connexion.
- **Hébergé par vous** : déposer `dist/acme/` sur `acme.votre-domaine.com` (voir [SAAS.md](SAAS.md)).

## Limites actuelles de la personnalisation

Les 8 couleurs principales suivent le thème. Quelques teintes secondaires sont encore écrites en dur dans
les outils d’origine (bordure de carte sélectionnée, pastilles « Présélection », courbes). À convertir en jetons
au fil des mises à jour des modules.
