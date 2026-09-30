#!/usr/bin/env node
// Compile la plateforme pour un ou plusieurs clients.
//
//   node scripts/build.mjs                 → tous les clients
//   node scripts/build.mjs --tenant infratp
//   node scripts/build.mjs --out /chemin/dist
//
// Pour chaque client : dist/<client>/index.html (portail), dist/<client>/modules/<id>.html
// (un fichier autonome par module : scripts, styles et logo intégrés, utilisable hors connexion)
// et dist/<client>/registry.json (catalogue des modules sous licence).
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, CORE_DIR, product, listModules, listTenants, loadTenant,
  enabledModules, logoDataURI, escapeHTML,
} from './lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const OUT = path.resolve(opt('--out') || path.join(ROOT, 'dist'));

/** Intègre les <script src> et <link rel=stylesheet> locaux pour obtenir un fichier autonome. */
export function inlineAssets(html, baseDir) {
  const read = src => {
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return null;
    const f = path.resolve(baseDir, src);
    if (!fs.existsSync(f)) throw Error(`Fichier introuvable : ${src} (depuis ${path.relative(ROOT, baseDir)})`);
    return fs.readFileSync(f, 'utf8');
  };
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const js = read(src);
    return js === null ? m : `<script>/* ${path.basename(src)} */\n${js.replace(/<\/script/gi, '<\\/script')}</script>`;
  });
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
    const css = read(href);
    return css === null ? m : `<style>/* ${path.basename(href)} */\n${css}</style>`;
  });
  return html;
}

/** Remplace les marqueurs {{…}} ; tout marqueur inconnu arrête la compilation. */
export function fillTokens(text, tokens, where) {
  const out = text.replace(/\{\{([A-Z_]+(?:\.[A-Za-z]+)?)\}\}/g, (m, key) => {
    if (!(key in tokens)) throw Error(`Marqueur inconnu {{${key}}} dans ${where}`);
    return tokens[key];
  });
  const left = out.match(/\{\{[^}]*\}\}/);
  if (left) throw Error(`Marqueur mal formé ${left[0]} dans ${where}`);
  return out;
}

export function themeCSS(t) {
  const vars = Object.entries(t.theme).map(([k, v]) => `--${k}:${v}`).join(';');
  return `<style id="theme-client">:root{${vars}}</style>`;
}

function platformBar(tenant, mod) {
  return `<nav class="plat-bar" aria-label="Plateforme"><a href="../index.html">← ${escapeHTML(tenant.portal?.title || 'Tous les modules')}</a><span>${escapeHTML(mod.name)} · v${mod.version}</span></nav>
<style>.plat-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:7px max(16px,calc((100vw - 1470px)/2));background:var(--forest);color:#fff;font:13px/1.4 Arial,sans-serif}.plat-bar a{color:#fff;text-decoration:none;font-weight:600}.plat-bar span{opacity:.75}@media print{.plat-bar{display:none!important}}</style>
<script>if(!/^https?:$/.test(location.protocol))document.currentScript.previousElementSibling.previousElementSibling.hidden=true;</script>`;
}

export function tokensFor(tenant, prod, mod) {
  const credit = tenant.credit !== false;
  const email = escapeHTML(prod.authorEmail);
  return {
    'BRAND.name': tenant.name,
    'BRAND.fullName': tenant.fullName,
    'BRAND.logoAlt': tenant.logoAlt,
    'BRAND.slug': tenant.slug,
    'BRAND.eyebrow': tenant.eyebrow,
    'BRAND.logo': logoDataURI(tenant),
    'PRODUCT.name': prod.name,
    'PRODUCT.version': prod.version,
    'PRODUCT.digitizer': tenant.digitizer || prod.name,
    'MODULE.id': mod?.id ?? '',
    'MODULE.name': mod?.name ?? '',
    'MODULE.version': mod?.version ?? '',
    'CREDIT_HTML': credit ? `<span>Développeur : <a href="mailto:${email}">${email}</a></span>` : '',
    'CREDIT_SUFFIX': credit ? ` · Développeur : ${email}` : '',
    'CREDIT_CSV_ROW': credit ? `['Developpeur','${email}'],` : '',
  };
}

export function buildModule(tenant, prod, mod) {
  const src = path.join(mod.dir, 'index.html');
  let html = inlineAssets(fs.readFileSync(src, 'utf8'), mod.dir);
  html = fillTokens(html, tokensFor(tenant, prod, mod), path.relative(ROOT, src));
  if (!html.includes('</head>') || !/<body[^>]*>/.test(html)) throw Error(`${mod.id} : balises <head>/<body> attendues`);
  html = html.replace('</head>', `${themeCSS(tenant)}\n</head>`);
  html = html.replace(/<body[^>]*>/, m => `${m}\n${platformBar(tenant, mod)}`);
  return html;
}

export function buildPortal(tenant, prod, mods) {
  const tpl = fs.readFileSync(path.join(CORE_DIR, 'portal.html'), 'utf8');
  const cats = [...new Set(mods.map(m => m.category))];
  const card = m => `<article class="card">
      <div class="card-top"><h3>${escapeHTML(m.name)}</h3>${m.status !== 'stable' ? `<span class="badge">${m.status}</span>` : ''}</div>
      <p>${escapeHTML(m.summary)}</p>
      <ul class="methods">${m.methods.map(x => `<li>${escapeHTML(x)}</li>`).join('')}</ul>
      <div class="card-foot"><a class="open" href="modules/${m.id}.html">Ouvrir →</a><a class="dl" href="modules/${m.id}.html" download="${escapeHTML(tenant.slug)}-${m.id}.html" title="Fichier autonome, utilisable hors connexion">↓ Hors connexion</a><span class="ver">v${m.version}</span></div>
    </article>`;
  const sections = cats.map(c => `<section><h2>${escapeHTML(c)}</h2><div class="grid">${mods.filter(m => m.category === c).map(card).join('')}</div></section>`).join('\n');
  const tokens = {
    ...tokensFor(tenant, prod, null),
    'PORTAL.title': escapeHTML(tenant.portal?.title || 'Outils'),
    'PORTAL.subtitle': escapeHTML(tenant.portal?.subtitle || ''),
    'PORTAL.count': String(mods.length),
    'PORTAL.sections': sections || '<p class="empty">Aucun module activé pour ce client.</p>',
  };
  const html = fillTokens(tpl, tokens, 'core/portal.html');
  return html.replace('</head>', `${themeCSS(tenant)}\n</head>`);
}

// Les pages sont autonomes : scripts et styles en ligne, images en data URI, aucun appel réseau.
export const CSP = [
  "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'", "img-src data:",
  "connect-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ');
const HEADERS = `/*
  Content-Security-Policy: ${CSP}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`;

export function buildTenant(tenant, outRoot = OUT) {
  const prod = product();
  const mods = enabledModules(tenant, listModules());
  const out = path.join(outRoot, tenant.id);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'modules'), { recursive: true });
  for (const m of mods) fs.writeFileSync(path.join(out, 'modules', `${m.id}.html`), buildModule(tenant, prod, m));
  fs.writeFileSync(path.join(out, 'index.html'), buildPortal(tenant, prod, mods));
  const registry = {
    product: { name: prod.name, version: prod.version },
    tenant: { id: tenant.id, name: tenant.name },
    builtAt: new Date().toISOString(),
    modules: mods.map(({ dir, ...m }) => ({ ...m, path: `modules/${m.id}.html` })),
  };
  fs.writeFileSync(path.join(out, 'registry.json'), JSON.stringify(registry, null, 2));
  // Fichiers d’hébergement (Cloudflare Pages, Netlify) : en-têtes de sécurité et non-indexation.
  fs.writeFileSync(path.join(out, '_headers'), HEADERS);
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  return { out, modules: mods.map(m => m.id) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const id = opt('--tenant');
    const tenants = id ? [loadTenant(id)] : listTenants();
    for (const t of tenants) {
      const r = buildTenant(t);
      console.log(`✓ ${t.id} → ${path.relative(process.cwd(), r.out) || r.out} (${r.modules.join(', ') || 'aucun module'})`);
    }
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(1);
  }
}
