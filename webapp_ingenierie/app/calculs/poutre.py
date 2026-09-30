"""Poutre isostatique sur deux appuis simples sous charge uniformément répartie."""


def poutre_isostatique(portee_m, charge_kn_m, E_mpa, I_cm4):
    """Retourne moment max (kN.m), effort tranchant max (kN) et flèche max (mm)."""
    if portee_m <= 0 or E_mpa <= 0 or I_cm4 <= 0:
        raise ValueError("La portée, E et I doivent être strictement positifs.")

    L = portee_m
    q = charge_kn_m
    moment_max = q * L**2 / 8
    tranchant_max = q * L / 2

    # Flèche = 5 q L^4 / (384 E I), en unités N et mm
    q_n_mm = q  # 1 kN/m = 1 N/mm
    L_mm = L * 1000
    I_mm4 = I_cm4 * 1e4
    fleche_mm = 5 * q_n_mm * L_mm**4 / (384 * E_mpa * I_mm4)

    return {
        "moment_max": moment_max,
        "tranchant_max": tranchant_max,
        "fleche_max": fleche_mm,
        "fleche_admissible": L_mm / 300,
    }
