// Tests du moteur : lancer « npm test » depuis le dossier plateforme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const E = createRequire(import.meta.url)('./engine.js');

test('le tirant normal redonne le débit demandé', () => {
  const r = E.calculate({ Q: 10, B: 3, n: 0.015, S: 0.005 });
  assert.ok(Math.abs(E.manning(r.yn, 3, 0.015, 0.005) - 10) < 1e-9);
});

test('les saisies invalides sont refusées', () => {
  assert.throws(() => E.calculate({ Q: 0, B: 3, n: 0.015, S: 0.005 }));
});
