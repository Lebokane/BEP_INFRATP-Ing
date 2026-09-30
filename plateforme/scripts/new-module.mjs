#!/usr/bin/env node
// Crée un nouveau module à partir de modules/_template.
//   npm run new-module -- mon-module --name "Mon module" --category "Structures"
import fs from 'node:fs';
import path from 'node:path';
import { MODULES_DIR, validateModule, readJSON } from './lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const id = args[0];
const name = opt('--name') || id;
const category = opt('--category') || 'Divers';

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

if (!id || id.startsWith('--')) fail('Usage : npm run new-module -- <id> --name "Nom" --category "Catégorie"');
const dest = path.join(MODULES_DIR, id);
if (fs.existsSync(dest)) fail(`Le module « ${id} » existe déjà.`);

fs.cpSync(path.join(MODULES_DIR, '_template'), dest, { recursive: true });
const f = path.join(dest, 'module.json');
fs.writeFileSync(f, fs.readFileSync(f, 'utf8')
  .replace('__ID__', id).replace('__NAME__', name).replace('__CATEGORY__', category));

const errs = validateModule(readJSON(f), id);
if (errs.length) { fs.rmSync(dest, { recursive: true }); fail(errs.join(' ; ')); }

console.log(`✓ Module créé : modules/${id}
  1. Écrire la méthode dans modules/${id}/engine.js et ses tests dans engine.test.mjs
  2. Adapter l’interface : modules/${id}/index.html
  3. npm test && npm run dev   → le module apparaît dans le portail des clients qui ont "modules": ["*"]
  4. Pour un client avec une liste de modules, ajouter "${id}" dans tenants/<client>/tenant.json`);
