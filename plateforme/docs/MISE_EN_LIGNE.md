# Mise en ligne de la plateforme INFRATP

**Cible :** `https://kalc-infratp.pages.dev`, puis éventuellement `https://outils.infratp.com`.
Seules les personnes qui ont une adresse **@infratp.com** peuvent ouvrir la plateforme. Elles se connectent
avec un code à usage unique reçu par e-mail : aucun mot de passe à gérer.

- **Hébergement :** Cloudflare Pages, gratuit.
- **Contrôle d’accès :** Cloudflare Access (Zero Trust), gratuit jusqu’à 50 utilisateurs.
- **Déploiement :** automatique par GitHub Actions à chaque modification de la branche `main`, uniquement si les tests passent.

Durée : environ 30 minutes, à faire une seule fois.

> **Ordre important :** configurer la protection (étape 3) **avant** le premier déploiement (étape 5),
> pour que la plateforme ne soit jamais accessible sans connexion.

---

## 1. Créer le compte Cloudflare

1. Créer un compte sur <https://dash.cloudflare.com/sign-up>, idéalement avec une adresse INFRATP ou une adresse dédiée à Kalc Systems.
2. Relever l’**Account ID** : menu *Workers & Pages* → colonne de droite, « Account ID ».

## 2. Créer le projet Pages (vide)

*Workers & Pages* → *Create* → onglet *Pages* → **Upload assets** (« Direct Upload ») :

- Project name : **`kalc-infratp`** (doit correspondre exactement au workflow) ;
- déposer n’importe quel petit fichier, par exemple un `index.html` contenant « En préparation » ;
- *Deploy*.

L’adresse `https://kalc-infratp.pages.dev` est créée.

## 3. Protéger l’accès (Cloudflare Access)

1. Dans le projet `kalc-infratp` : *Settings* → *General* → **Access policy** → *Enable*.
   Cloudflare crée une application Access qui protège les adresses de prévisualisation (`*.kalc-infratp.pages.dev`).
2. Aller dans **Zero Trust** (menu de gauche). À la première visite, choisir un nom d’équipe et l’offre **Free**.
3. *Access* → *Applications* → ouvrir l’application créée à l’étape 1 → *Overview*/*Configure* :
   ajouter aussi le domaine principal **`kalc-infratp.pages.dev`** (sans sous-domaine), en plus de `*.kalc-infratp.pages.dev`.
4. Onglet *Policies* → modifier la règle :
   - Action : **Allow** ;
   - *Include* → **Emails ending in** → `@infratp.com` ;
   - ajouter, si besoin, des adresses individuelles (*Emails*) pour des personnes hors INFRATP.
5. *Settings* → *Authentication* : vérifier que **One-time PIN** est activé.
6. Test en navigation privée : `https://kalc-infratp.pages.dev` doit afficher la page de connexion Cloudflare,
   et non la page « En préparation ».

## 4. Donner à GitHub l’autorisation de déployer

1. Cloudflare → icône profil → *My Profile* → *API Tokens* → *Create Token* → *Create Custom Token* :
   - Permissions : **Account** → **Cloudflare Pages** → **Edit** ;
   - Account Resources : votre compte ;
   - *Continue* → *Create Token*, puis copier le jeton (affiché une seule fois).
2. GitHub → dépôt `Lebokane/BEP_INFRATP-Ing` → *Settings* → *Secrets and variables* → *Actions* → *New repository secret* :
   - `CLOUDFLARE_API_TOKEN` = le jeton ;
   - `CLOUDFLARE_ACCOUNT_ID` = l’Account ID de l’étape 1.

## 5. Premier déploiement

Fusionner la branche de travail dans `main`. Le workflow **Plateforme** (onglet *Actions* du dépôt) :

1. lance les tests ;
2. compile les clients ;
3. déploie `dist/infratp` sur `kalc-infratp`.

On peut aussi le relancer à la main : *Actions* → *Plateforme* → *Run workflow* (branche `main`).
Sans les secrets, le déploiement est simplement ignoré, avec un avertissement.

Vérifier ensuite en navigation privée : connexion par code, puis portail avec les 4 modules.

## 6. (Facultatif) Adresse à l’enseigne INFRATP : `outils.infratp.com`

1. Projet `kalc-infratp` → *Custom domains* → *Set up a custom domain* → `outils.infratp.com`.
2. Si le DNS d’infratp.com n’est pas chez Cloudflare, Cloudflare indique un enregistrement **CNAME**
   `outils` → `kalc-infratp.pages.dev`. L’informaticien d’INFRATP l’ajoute chez l’hébergeur du domaine.
3. Zero Trust → *Access* → *Applications* → ajouter `outils.infratp.com` à la même application,
   pour que la protection s’applique aussi à cette adresse.

---

## Ce qui est déjà en place côté plateforme

- **En-têtes de sécurité** (`dist/<client>/_headers`, lus par Cloudflare Pages) :
  - politique de contenu stricte : aucune ressource externe chargée, pages non intégrables dans un autre site ;
  - `nosniff`, `no-referrer`.
- **Non-indexation :** `robots.txt` et `X-Robots-Tag: noindex`. La plateforme n’apparaît pas dans les moteurs de recherche.
- **Calculs locaux :** les calculs se font dans le navigateur. Aucune donnée d’étude n’est envoyée au serveur.
- **Hors connexion :** chaque module reste téléchargeable pour un usage sans connexion (« ↓ Hors connexion » sur le portail).

## Gestion au quotidien

| Action | Où |
|---|---|
| Ajouter / retirer une personne | Zero Trust → Access → Applications → Policies |
| Voir qui s’est connecté | Zero Trust → Logs → Access |
| Revenir à une version précédente | Workers & Pages → `kalc-infratp` → Deployments → *Rollback* |
| Mettre à jour la plateforme | modifier le code → fusion dans `main` → déploiement automatique |

**Note :** le dépôt GitHub est public. Le site en ligne est protégé, mais le code source reste lisible par tous sur GitHub.
