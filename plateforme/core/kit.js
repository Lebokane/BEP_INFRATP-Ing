/* Kit commun des modules : formatage, échappement, export CSV, impression, état périmé.
   Référencé par la page du module (balise script vers ../../core/kit.js) ; intégré au fichier final à la compilation. */
(function (root) {
  'use strict';

  /** Nombre au format français, « — » si absent ou non fini. */
  const fmt = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v)
    ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** CSV compatible Excel français : séparateur « ; », virgule décimale, BOM UTF-8. */
  function csv(name, rows) {
    const cell = v => '"' + (typeof v === 'number'
      ? (Number.isFinite(v) ? v.toPrecision(12).replace('.', ',') : '')
      : String(v ?? '')).replace(/"/g, '""') + '"';
    download(name, '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function toast(text, ms = 3600) {
    let el = document.getElementById('kit-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kit-toast'; el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, ms);
  }

  /** Signale que les résultats ne correspondent plus aux saisies du formulaire. */
  function watchStale(form, results) {
    let stale = false;
    const mark = () => {
      if (stale || !results.children.length) return;
      stale = true;
      results.insertAdjacentHTML('afterbegin', '<div class="stale-msg">Données modifiées. Relancer le calcul pour actualiser les résultats.</div>');
      for (const c of results.children) if (!c.classList.contains('stale-msg')) c.classList.add('stale');
    };
    form.addEventListener('input', mark);
    form.addEventListener('change', mark);
    return { reset: () => { stale = false; }, get isStale() { return stale; } };
  }

  /** Lit les champs numériques d'un formulaire : { id: nombre }. */
  function readNumbers(form) {
    const p = {};
    form.querySelectorAll('input[type=number], select[data-number]').forEach(el => { p[el.id] = Number(el.value); });
    return p;
  }

  root.Kit = { fmt, esc, download, csv, toast, watchStale, readNumbers };
})(typeof window !== 'undefined' ? window : globalThis);
