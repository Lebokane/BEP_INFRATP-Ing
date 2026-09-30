# Points techniques à confirmer

Relevés lors de la revue d’expert des outils. Les calculs n’ont **pas** été modifiés : ces points
demandent une décision de l’ingénieur.

| # | Module | Point | Impact |
|---|---|---|---|
| 1 | dalots-fhwa | En entrée noyée, le terme de pente vaut `+0,7·S`. Dans HDS-5, le terme courant est `−0,5·S`, et `+0,7·S` ne concerne que les entrées biseautées selon le talus. Vérifier la figure 15 de FHWA-HRT-06-138. | Faible : ≈ 1,2·S·D, soit ≈ 1 cm pour D = 2 m et S = 0,5 % |
| 2 | dalots-bceom / dalots-fhwa | g = 9,8 dans BCEOM, 9,81 dans FHWA. | Négligeable, mais à harmoniser pour les notes |
| 3 | chaussees | Les paramètres LBTP 2024 viennent du cahier des charges de l’application ; l’outil indique qu’ils doivent être confrontés au manuel. | À faire avant tout usage contractuel |
| 4 | dalots-bceom / dalots-fhwa | Les deux modules se recoupent. Contre-vérification (2 × 3 × 2 m, S = 0,5 %) : hauteur amont BCEOM / FHWA à 1–4 % près pour Q = 5 à 45 m³/s. | Piste : un seul module Dalots avec les deux méthodes côte à côte |

## Corrections déjà faites lors de l’intégration

- Dalots FHWA : le logo pointait vers un fichier externe absent. Le logo est maintenant intégré par la compilation.
- Dalots FHWA : couleurs hors charte remplacées par les jetons de la charte.
- Débits Hydro : versions incohérentes (en-tête 1.0, pied de page 1.2). La version vient désormais de `module.json` (1.2.0).
- Chaussées : la page n’avait pas de structure `<html>/<head>/<body>`. Elle a été ajoutée.
- Débits Hydro : le format du fichier projet devient `HYDRO-PROJET-1` (neutre). Les fichiers `INFRATP-HYDRO-1` existants s’ouvrent toujours.
