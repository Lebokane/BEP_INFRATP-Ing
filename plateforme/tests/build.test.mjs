// Tests de la compilation par client (marque blanche, licences, fichiers autonomes).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listModules, listTenants, loadTenant, enabledModules, validateModule, TENANTS_DIR } from '../scripts/lib.mjs';
import { buildTenant, fillTokens } from '../scripts/build.mjs';

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'plateforme-'));
const built = Object.fromEntries(listTenants().map(t => [t.id, buildTenant(t, OUT)]));
const pages = id => fs.readdirSync(path.join(OUT, id, 'modules')).map(f => path.join(OUT, id, 'modules', f)).concat(path.join(OUT, id, 'index.html'));

test('tous les manifestes de modules sont valides', () => {
  assert.ok(listModules().length >= 4);
});

test('aucun marqueur {{…}} ne reste dans les pages compilées', () => {
  for (const id in built) for (const f of pages(id)) assert.ok(!fs.readFileSync(f, 'utf8').includes('{{'), f);
});

test('chaque page est autonome (aucun script ni style local externe)', () => {
  for (const id in built) for (const f of pages(id)) {
    const html = fs.readFileSync(f, 'utf8');
    assert.ok(!/<script src="(?!https?:)/.test(html) && !/<link rel="stylesheet" href="(?!https?:)/.test(html), f);
  }
});

test('marque blanche : la sortie du client démo ne mentionne pas INFRATP', () => {
  for (const f of pages('demo')) {
    const html = fs.readFileSync(f, 'utf8').replace(/'INFRATP-HYDRO-1'/g, ''); // format de fichier historique accepté à l’import
    assert.ok(!/infratp|seydou/i.test(html), `${path.basename(f)} contient une référence INFRATP`);
  }
});

test('licences : chaque client ne reçoit que ses modules', () => {
  for (const t of listTenants()) {
    const expected = enabledModules(t, listModules()).map(m => m.id).sort();
    assert.deepEqual([...built[t.id].modules].sort(), expected);
    const reg = JSON.parse(fs.readFileSync(path.join(OUT, t.id, 'registry.json'), 'utf8'));
    assert.deepEqual(reg.modules.map(m => m.id).sort(), expected);
  }
});

test('les couleurs du client sont appliquées', () => {
  const t = loadTenant('demo');
  const html = fs.readFileSync(path.join(OUT, 'demo', 'index.html'), 'utf8');
  assert.ok(html.includes(`--forest:${t.theme.forest}`));
});

test('un marqueur inconnu arrête la compilation', () => {
  assert.throws(() => fillTokens('{{BRAND.inconnu}}', {}, 'test'), /Marqueur inconnu/);
});

test('un nom de client avec apostrophe droite est refusé', () => {
  const dir = path.join(TENANTS_DIR, '_tmp-test');
  fs.mkdirSync(dir, { recursive: true });
  try {
    const t = JSON.parse(fs.readFileSync(path.join(TENANTS_DIR, 'demo', 'tenant.json'), 'utf8'));
    fs.copyFileSync(path.join(TENANTS_DIR, 'demo', t.logo), path.join(dir, t.logo));
    fs.writeFileSync(path.join(dir, 'tenant.json'), JSON.stringify({ ...t, id: '_tmp-test', name: "Bureau d'études" }));
    assert.throws(() => loadTenant('_tmp-test'), /caractère interdit/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('un manifeste de module incomplet est signalé', () => {
  assert.ok(validateModule({ id: 'x' }, 'x').length > 0);
});
