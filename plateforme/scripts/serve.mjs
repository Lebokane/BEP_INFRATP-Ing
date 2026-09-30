#!/usr/bin/env node
// Serveur local de prévisualisation du dossier dist/.  npm run serve  → http://localhost:8080/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listTenants } from './lib.mjs';

const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') {
    res.setHeader('content-type', TYPES['.html']);
    return res.end(`<!doctype html><meta charset="utf-8"><title>Clients</title><body style="font:16px Arial;margin:40px"><h1>Clients compilés</h1><ul>${
      listTenants().map(t => `<li><a href="/${t.id}/">${t.fullName}</a></li>`).join('')}</ul>`);
  }
  let file = path.join(DIST, url);
  if (!file.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Introuvable — lancer « npm run build » ?'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(PORT, () => console.log(`Prévisualisation : http://localhost:${PORT}/`));
