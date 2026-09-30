// Fonctions partagées par les scripts de la plateforme (aucune dépendance externe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MODULES_DIR = path.join(ROOT, 'modules');
export const TENANTS_DIR = path.join(ROOT, 'tenants');
export const CORE_DIR = path.join(ROOT, 'core');

export const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const SEMVER = /^\d+\.\d+\.\d+$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const STATUSES = ['stable', 'beta', 'alpha'];
const TIERS = ['standard', 'pro'];
// Ces textes sont injectés dans du HTML et dans des chaînes JavaScript :
// les caractères qui casseraient l'un ou l'autre sont refusés (utiliser ’ pour l'apostrophe).
const UNSAFE = /['"<>`\\]/;

export function product() {
  return readJSON(path.join(ROOT, 'product.json'));
}

/** Modules disponibles, triés par catégorie puis nom. Les dossiers commençant par « _ » sont ignorés. */
export function listModules() {
  return fs.readdirSync(MODULES_DIR)
    .filter(d => !d.startsWith('_') && fs.existsSync(path.join(MODULES_DIR, d, 'module.json')))
    .map(d => {
      const m = readJSON(path.join(MODULES_DIR, d, 'module.json'));
      const errs = validateModule(m, d);
      if (errs.length) throw Error(`Module ${d} : ${errs.join(' ; ')}`);
      return { ...m, dir: path.join(MODULES_DIR, d) };
    })
    .sort((a, b) => a.category.localeCompare(b.category, 'fr') || a.name.localeCompare(b.name, 'fr'));
}

export function validateModule(m, dir) {
  const e = [];
  if (m.id !== dir) e.push(`id « ${m.id} » différent du dossier « ${dir} »`);
  if (!ID.test(m.id || '')) e.push('id invalide (minuscules, chiffres et tirets)');
  for (const k of ['name', 'category', 'summary']) {
    if (typeof m[k] !== 'string' || !m[k].trim()) e.push(`champ « ${k} » manquant`);
    else if (UNSAFE.test(m[k])) e.push(`champ « ${k} » : caractère interdit (' " < > \` \\)`);
  }
  if (!SEMVER.test(m.version || '')) e.push('version au format X.Y.Z attendue');
  if (!STATUSES.includes(m.status)) e.push(`status parmi ${STATUSES.join(', ')}`);
  if (!TIERS.includes(m.tier)) e.push(`tier parmi ${TIERS.join(', ')}`);
  for (const k of ['methods', 'references'])
    if (!Array.isArray(m[k])) e.push(`champ « ${k} » : liste attendue`);
  return e;
}

export function listTenants() {
  return fs.readdirSync(TENANTS_DIR)
    .filter(d => fs.existsSync(path.join(TENANTS_DIR, d, 'tenant.json')))
    .map(loadTenant);
}

export function loadTenant(id) {
  const dir = path.join(TENANTS_DIR, id);
  const t = readJSON(path.join(dir, 'tenant.json'));
  const errs = [];
  if (t.id !== id) errs.push(`id « ${t.id} » différent du dossier « ${id} »`);
  for (const k of ['name', 'fullName', 'logoAlt', 'slug', 'eyebrow']) {
    if (typeof t[k] !== 'string' || !t[k].trim()) errs.push(`champ « ${k} » manquant`);
    else if (UNSAFE.test(t[k])) errs.push(`champ « ${k} » : caractère interdit (utiliser ’ au lieu de ')`);
  }
  if (t.digitizer !== undefined && UNSAFE.test(t.digitizer)) errs.push('champ « digitizer » : caractère interdit');
  if (!/^[A-Za-z0-9_-]+$/.test(t.slug || '')) errs.push('slug : lettres, chiffres, - et _ uniquement (sert aux noms de fichiers)');
  if (!t.logo || !fs.existsSync(path.join(dir, t.logo))) errs.push(`logo introuvable : ${t.logo}`);
  for (const k of ['green', 'lime', 'forest', 'ink', 'muted', 'line', 'bg', 'amber'])
    if (!/^#[0-9a-fA-F]{6}$/.test(t.theme?.[k] || '')) errs.push(`theme.${k} : couleur #RRGGBB attendue`);
  if (!Array.isArray(t.modules) || !t.modules.length) errs.push('modules : liste attendue (["*"] pour tous)');
  if (errs.length) throw Error(`Client ${id} : ${errs.join(' ; ')}`);
  return { ...t, dir };
}

/** Modules sous licence pour ce client. */
export function enabledModules(tenant, modules) {
  if (tenant.modules.includes('*')) return modules;
  const unknown = tenant.modules.filter(id => !modules.some(m => m.id === id));
  if (unknown.length) throw Error(`Client ${tenant.id} : modules inconnus ${unknown.join(', ')}`);
  return modules.filter(m => tenant.modules.includes(m.id));
}

export function logoDataURI(tenant) {
  const file = path.join(tenant.dir, tenant.logo);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' }[ext];
  if (!mime) throw Error(`Format de logo non géré : ${ext}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

export const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
