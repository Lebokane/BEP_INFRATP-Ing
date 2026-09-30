from flask import Blueprint, render_template, request

from .calculs.poutre import poutre_isostatique

bp = Blueprint("main", __name__)


@bp.route("/")
def accueil():
    return render_template("accueil.html")


@bp.route("/poutre", methods=["GET", "POST"])
def poutre():
    resultat, erreur = None, None
    if request.method == "POST":
        try:
            resultat = poutre_isostatique(
                portee_m=float(request.form["portee"]),
                charge_kn_m=float(request.form["charge"]),
                E_mpa=float(request.form["E"]),
                I_cm4=float(request.form["I"]),
            )
        except (KeyError, ValueError) as e:
            erreur = str(e) or "Valeurs invalides."
    return render_template("poutre.html", resultat=resultat, erreur=erreur, form=request.form)
