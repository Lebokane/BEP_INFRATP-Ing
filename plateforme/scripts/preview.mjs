#!/usr/bin/env node
// Aperçu en un seul fichier : le portail d'un client avec tous ses modules intégrés.
// Pratique pour montrer la plateforme sans serveur (pièce jointe, visionneuse).
//   node scripts/preview.mjs --tenant infratp   → dist/infratp-apercu.html
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadTenant } from './lib.mjs';
import { buildTenant } from './build.mjs';

const args = process.argv.slice(2);
const id = args[args.indexOf('--tenant') + 1] || 'infratp';
const DIST = path.join(ROOT, 'dist');

const tenant = loadTenant(id);
const { out, modules } = buildTenant(tenant, DIST);
const pages = Object.fromEntries(modules.map(m => [m, fs.readFileSync(path.join(out, 'modules', `${m}.html`), 'utf8')]));

const viewer = `
<div id="apercu" style="position:fixed;inset:0;z-index:100;background:#fff;display:none;flex-direction:column">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:var(--forest);color:#fff;font:14px Arial,sans-serif">
    <button id="apercu-retour" style="background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:4px;padding:6px 12px;cursor:pointer">← Retour au portail</button>
    <span>Aperçu</span>
  </div>
  <iframe id="apercu-frame" title="Module" style="flex:1;border:0;width:100%"></iframe>
</div>
<script id="apercu-pages" type="application/json">${JSON.stringify(pages).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  const pages = JSON.parse(document.getElementById('apercu-pages').textContent);
  const box = document.getElementById('apercu'), frame = document.getElementById('apercu-frame');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="modules/"]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(8, -5);
    frame.srcdoc = pages[id];
    box.style.display = 'flex';
    window.scrollTo(0, 0);
  });
  document.getElementById('apercu-retour').onclick = () => { box.style.display = 'none'; frame.srcdoc = ''; };
})();
</script>`;

const portal = fs.readFileSync(path.join(out, 'index.html'), 'utf8').replace('</body>', `${viewer}\n</body>`);
const file = path.join(DIST, `${id}-apercu.html`);
fs.writeFileSync(file, portal);
console.log(`✓ ${path.relative(process.cwd(), file)} (${(fs.statSync(file).size / 1024).toFixed(0)} Ko, ${modules.length} modules)`);
