# Points techniques

Relevés lors de la revue d’expert des outils.

## Corrigés

| Module | Correction | Justification | Impact |
|---|---|---|---|
| dalots-fhwa 1.1.0 | Entrée noyée : correction de pente `−0,5·S` au lieu de `+0,7·S` | HDS-5 (FHWA, 2012), éq. A.3 et §3 : « Ks = −0,5 (mitered inlets +0,7) ». Le `+0,7·S` ne s’applique qu’aux entrées biseautées selon le talus, absentes du module (ailes évasées, ailes parallèles, chanfrein 45°). La figure 15 de FHWA-HRT-06-138 n’écrit que la forme « biseautée ». Les coefficients utilisés pour les ailes évasées et parallèles proviennent eux-mêmes des charts HDS-5 (tableau 11 du rapport, colonne « Source »). | HWᵢ diminue de 1,2·S·D en régime noyé : ≈ 1,2 cm pour D = 2 m et S = 0,5 % ; 12 cm pour S = 5 %. Le raccordement reste continu (test automatique). |
| dalots-bceom 1.0.2 | g par défaut 9,81 m/s² au lieu de 9,8 | Harmonisation avec le module FHWA ; la valeur reste modifiable dans le formulaire. | ≈ 0,1 % sur les grandeurs |

## Restant à faire

| Module | Point | Ce qu’il faut |
|---|---|---|
| chaussees | Les paramètres LBTP 2024 (ε6, b, SN, kθ, kc, ks, Sh, A, risques, catalogue F1–F17) viennent du cahier des charges de l’application ; l’outil indique qu’ils doivent être confrontés au manuel. | Le manuel LBTP 2024 (fascicules 1 et 2) pour contrôler chaque valeur et ajouter des tests de non-régression. |
| dalots-bceom / dalots-fhwa | Les deux modules se recoupent. Contre-vérification (2 × 3 × 2 m, S = 0,5 %) : hauteur amont BCEOM / FHWA à 1–4 % près pour Q = 5 à 45 m³/s. | Décision produit : un seul module Dalots avec les deux méthodes côte à côte. |

## Corrections d’habillage faites lors de l’intégration

- Dalots FHWA : le logo pointait vers un fichier externe absent. Le logo est maintenant intégré par la compilation.
- Dalots FHWA : couleurs hors charte remplacées par les jetons de la charte.
- Débits Hydro : versions incohérentes (en-tête 1.0, pied de page 1.2). La version vient désormais de `module.json` (1.2.0).
- Chaussées : la page n’avait pas de structure `<html>/<head>/<body>`. Elle a été ajoutée.
- Débits Hydro : le format du fichier projet devient `HYDRO-PROJET-1` (neutre). Les fichiers `INFRATP-HYDRO-1` existants s’ouvrent toujours.
