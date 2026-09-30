/* Moteur de calcul du module — fonctions pures, unités SI, sans accès au DOM.
   Exemple fourni : tirant normal d'un canal rectangulaire par Manning. Remplacer par votre méthode.
   Le même fichier est chargé par la page et par les tests Node (engine.test.mjs). */
(function (root) {
  'use strict';
  const G = 9.81;

  function validate(p) {
    for (const k of ['Q', 'B', 'n', 'S'])
      if (!Number.isFinite(p[k]) || p[k] <= 0) throw Error(`Valeur invalide : ${k} doit être strictement positif.`);
    return p;
  }

  /** Débit uniforme (m³/s) pour un tirant y. */
  const manning = (y, B, n, S) => {
    const A = B * y, R = A / (B + 2 * y);
    return A * Math.pow(R, 2 / 3) * Math.sqrt(S) / n;
  };

  function calculate(input) {
    const p = validate({ ...input });
    let hi = 1;
    while (manning(hi, p.B, p.n, p.S) < p.Q) hi *= 2;
    let lo = 0;
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2;
      if (manning(m, p.B, p.n, p.S) < p.Q) lo = m; else hi = m;
    }
    const yn = (lo + hi) / 2, V = p.Q / (p.B * yn), Fr = V / Math.sqrt(G * yn);
    const yc = Math.cbrt(p.Q * p.Q / (G * p.B * p.B));
    const warnings = [];
    if (Fr > 1) warnings.push('Régime torrentiel (Fr > 1) : vérifier les ressauts et la dissipation.');
    return { ...p, yn, yc, V, Fr, regime: Fr > 1 ? 'torrentiel' : 'fluvial', warnings };
  }

  const api = { validate, manning, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
