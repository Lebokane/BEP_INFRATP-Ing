# WebApp d'Ingénierie – INFRATP

Application web Flask regroupant des outils de calcul de structure et d'exploitation
des données issues de Revit et Robot Structural Analysis.

## Structure

```
webapp_ingenierie/
├── app/
│   ├── calculs/        # Modules de calcul (poutre isostatique, …)
│   ├── templates/      # Pages HTML (Jinja2)
│   ├── static/         # CSS
│   └── routes.py       # Routes Flask
├── donnees/
│   ├── exports_revit/  # Nomenclatures / exports Revit
│   └── exports_robot/  # Tableaux de résultats Robot (CSV / Excel)
├── rapports/           # Notes de calcul générées
├── tests/              # Tests unitaires (pytest)
├── requirements.txt
└── run.py
```

## Lancer l'application

```bash
cd webapp_ingenierie
pip install -r requirements.txt
python run.py          # http://127.0.0.1:5000
```

## Tests

```bash
cd webapp_ingenierie
python -m pytest
```

## Outils disponibles

- **Poutre isostatique** : moment max, effort tranchant max, flèche et vérification à L/300.
