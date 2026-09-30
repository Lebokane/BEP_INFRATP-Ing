# Commercialisation et feuille de route SaaS

## Trois façons de vendre, un seul code

| Offre | Ce que reçoit le client | État |
|---|---|---|
| **Licence installée** (ex. INFRATP) | `dist/<client>/` à sa marque, hébergé chez lui, utilisable hors connexion | Prêt |
| **Marque blanche** (autre bureau d’études) | Idem, avec son logo, ses couleurs et les modules achetés | Prêt |
| **SaaS** (abonnement) | Accès en ligne sur `<client>.votre-domaine.com`, comptes utilisateurs, projets enregistrés | À construire (voir ci-dessous) |

Ce qui est déjà en place pour le SaaS :

- séparation produit / client / module (`product.json`, `tenants/`, `modules/`) ;
- licences par module (`"modules"` dans `tenant.json`) et offre par module (`"tier": "standard" | "pro"`) ;
- catalogue lisible par une machine (`registry.json`) ;
- calculs dans des moteurs purs et testés, qui pourront tourner aussi côté serveur si besoin.

## Étapes vers le SaaS

1. **Hébergement multi-clients.** Un hébergement statique par client, par exemple `acme.domaine.com` qui sert `dist/acme/`. Déploiement automatique à chaque `git push`.
2. **Comptes et accès.** Authentification (Supabase Auth, Auth0 ou Clerk) placée devant le portail. Le `tenant.json` devient une ligne en base : client, utilisateurs, modules, date de fin d’abonnement.
3. **Projets enregistrés.** Le fichier projet JSON (déjà présent dans Débits Hydro) devient un enregistrement en base par utilisateur, avec un historique des versions de calcul.
4. **Chaînage des modules.** Un projet routier contient des bassins, puis leurs débits, puis les ouvrages. Le Q calculé dans Débits alimente le module Dalots.
5. **Paiement.** Stripe Billing : un abonnement par offre (standard / pro), avec les modules débloqués selon l’offre.
6. **Notes de calcul.** Génération PDF à la charte du client, avec archivage signé (date, version du module, hypothèses).

Les calculs restent dans le navigateur : pas de coût serveur de calcul, confidentialité des données
d’étude, et fonctionnement hors connexion conservé. C’est un argument commercial.

## Avant de vendre à d’autres clients

- **Propriété intellectuelle.** Réglée avec INFRATP, premier client de la plateforme. Conserver l’accord écrit avec les documents du produit.
- **Données et abaques tiers.** Les méthodes publiées (BCEOM, ORSTOM, FHWA, LBTP, NF P 98-086) se citent. Vérifier
  les conditions de reproduction des tableaux et paramètres repris (catalogue LBTP notamment).
- **Responsabilité.** Conditions générales qui limitent la responsabilité : outil d’aide au calcul, vérification
  par l’ingénieur. Les avertissements sont déjà présents dans chaque module.
- **Validation.** Un dossier de validation par module (cas de référence, écarts) rassure les acheteurs. Le module
  Chaussées en a déjà un (160 essais conformes à Boussinesq, KENLAYER et Alizé-LCPC).
