// Tests de non-régression des moteurs de calcul existants.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const BCEOM = require('../modules/dalots-bceom/engine.js').BCEOM;
const FHWA = require('../modules/dalots-fhwa/engine.js').Hydro;
require('../modules/debits-hydro/orstom-classique.js');
const Debits = require('../modules/debits-hydro/engine.js');
const LEA = require('../modules/chaussees/engine.js');

const close = (a, b, rel, msg) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${msg} : ${a} au lieu de ${b}`);

const bceomP = { Q: 15, B: 3, D: 2, N: 2, Ks: 67, g: 9.8, slope: 0.005, slopeMode: 'critical', hlimit: 1.25, fill: 80, vmax: 4, Bmax: 6, Dmax: 5, step: 0.5 };
const fhwaP = { Q: 15, B: 3, D: 2, N: 2, L: 20, n: 1 / 67, TW: 0.5, HW: 3, crest: 3.5, freeboard: 0.5, fill: 80, vmin: 0.5, vmax: 5, Bmax: 6, Dmax: 4, S: 0.005, inlet: 'flared', freeFlow: true };

test('BCEOM : à la pente critique, le tirant uniforme égale le tirant critique', () => {
  for (const Q of [2, 15, 40]) {
    const r = BCEOM.calculate(Q, 3, 2, 2, bceomP);
    close(r.y, r.yc, 1e-6, `Q = ${Q}`);
  }
});

test('BCEOM : le débit capable atteint exactement le critère dimensionnant', () => {
  const p = { ...bceomP, slopeMode: 'fixed' };
  const c = BCEOM.capacity(3, 2, 2, p);
  assert.ok(c.Q > 0);
  const r = BCEOM.calculate(c.Q, 3, 2, 2, p);
  if (c.governing === 'head') close(r.hstar, p.hlimit, 1e-6, 'H1/D');
  if (c.governing === 'velocity') close(r.V, p.vmax, 1e-6, 'V');
  if (c.governing === 'fill') close(r.fill, p.fill / 100, 1e-6, 'y/D');
});

test('BCEOM : les propositions satisfont tous les critères', () => {
  for (const group of BCEOM.proposals({ ...bceomP, Q: 15 }))
    for (const r of group) assert.ok(r.pass && r.hstar <= bceomP.hlimit && r.V <= bceomP.vmax);
});

test('FHWA : le débit capable donne le niveau amont admissible', () => {
  const cap = FHWA.capacity(3, 2, 2, fhwaP);
  close(FHWA.heads(cap, 3, 2, 2, fhwaP).hw, FHWA.limits(fhwaP), 1e-6, 'HW');
});

test('Contre-vérification BCEOM / FHWA : hauteur amont à moins de 5 %', () => {
  const p = { ...bceomP, slopeMode: 'fixed' };
  for (const Q of [5, 15, 30]) {
    const a = BCEOM.calculate(Q, 3, 2, 2, p).H1, b = FHWA.heads(Q, 3, 2, 2, fhwaP).hwi;
    close(a, b, 0.05, `Q = ${Q}`);
  }
});

test('Débits : formule de Kirpich', () => {
  const t = Debits.kirpich({ length: 1000, slope: 1 });
  close(t, 0.0195 * 1000 ** 0.77 * 0.01 ** -0.385, 1e-12, 'tc');
});

test('Chaussées : solution de Boussinesq (massif homogène) à 0,5 % près', () => {
  const q = 0.7, a = 0.15, E = 100, nu = 0.35, zs = [0.05, 0.2, 0.8];
  const R = LEA.circular(q, a, [{ E, nu }], zs.map(z => ({ r: 0, z })), { mAlphaMax: 400 });
  zs.forEach((z, k) => {
    const s = Math.hypot(a, z);
    close(R[k].sz, q * (1 - z ** 3 / s ** 3), 0.005, `σz à z = ${z}`);
    close(R[k].ez, (1 + nu) * q / E * (1 - 2 * nu + 2 * nu * z / s - z ** 3 / s ** 3), 0.005, `εz à z = ${z}`);
  });
});
