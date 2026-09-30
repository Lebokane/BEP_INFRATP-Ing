import pytest

from app.calculs.poutre import poutre_isostatique


def test_valeurs_classiques():
    r = poutre_isostatique(portee_m=6, charge_kn_m=10, E_mpa=210000, I_cm4=8356)
    assert r["moment_max"] == pytest.approx(45.0)
    assert r["tranchant_max"] == pytest.approx(30.0)
    assert r["fleche_max"] == pytest.approx(9.62, abs=0.01)
    assert r["fleche_admissible"] == pytest.approx(20.0)


def test_portee_invalide():
    with pytest.raises(ValueError):
        poutre_isostatique(portee_m=0, charge_kn_m=10, E_mpa=210000, I_cm4=8356)
