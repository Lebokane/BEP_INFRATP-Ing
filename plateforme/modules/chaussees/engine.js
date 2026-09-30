// Multilayer linear elastic solver (Burmister) for circular uniform loads.
// Formulation: Huang, Pavement Analysis and Design (2004), ch. 2 / KENLAYER,
// boundary-condition scheme ported from PyMastic (Apache-2.0).
// Units: m, MPa. Sign convention returned: compression positive (stresses and strains).
(function (root) {
  'use strict';

  function bessj0(x) {
    let ax = Math.abs(x), y, ans1, ans2;
    if (ax < 8.0) {
      y = x * x;
      ans1 = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
      ans2 = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y * 1.0))));
      return ans1 / ans2;
    }
    const z = 8.0 / ax; y = z * z; const xx = ax - 0.785398164;
    ans1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
    ans2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
    return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
  }
  function bessj1(x) {
    let ax = Math.abs(x), y, ans1, ans2;
    if (ax < 8.0) {
      y = x * x;
      ans1 = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606))))));
      ans2 = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y * 1.0))));
      return ans1 / ans2;
    }
    const z = 8.0 / ax; y = z * z; const xx = ax - 2.356194491;
    ans1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
    ans2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
    return x < 0 ? -ans : ans;
  }

  // 4x4 linear solve (Gaussian elimination with partial pivoting); B is 4x4, returns X with A X = B
  function solve4(A, B) {
    const n = 4, a = A.map(r => r.slice()), b = B.map(r => r.slice());
    for (let c = 0; c < n; c++) {
      let p = c, mx = Math.abs(a[c][c]);
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > mx) { mx = Math.abs(a[r][c]); p = r; }
      if (p !== c) { [a[c], a[p]] = [a[p], a[c]]; [b[c], b[p]] = [b[p], b[c]]; }
      const piv = a[c][c];
      for (let r = c + 1; r < n; r++) {
        const f = a[r][c] / piv;
        if (f === 0) continue;
        for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
        for (let k = 0; k < b[0].length; k++) b[r][k] -= f * b[c][k];
      }
    }
    const x = b.map(r => r.map(() => 0));
    for (let k = 0; k < b[0].length; k++) {
      for (let r = n - 1; r >= 0; r--) {
        let s = b[r][k];
        for (let c = r + 1; c < n; c++) s -= a[r][c] * x[c][k];
        x[r][k] = s / a[r][r];
      }
    }
    return x;
  }
  function matmul(A, B) {
    const r = A.length, c = B[0].length, n = B.length, M = [];
    for (let i = 0; i < r; i++) { M.push(new Array(c).fill(0)); for (let j = 0; j < c; j++) { let s = 0; for (let k = 0; k < n; k++) s += A[i][k] * B[k][j]; M[i][j] = s; } }
    return M;
  }

  // Coefficients A,B,C,D (per layer) for one value of m (normalised by total thickness).
  // Global assembly of the 4n-2 boundary/interface equations (bonded or frictionless interfaces),
  // solved by Gaussian elimination with partial pivoting.
  function rowSZ(m, l, v, e1, e2) { return [e1, e2, -(1 - 2 * v - m * l) * e1, (1 - 2 * v + m * l) * e2]; }
  function rowTAU(m, l, v, e1, e2) { return [e1, -e2, (2 * v + m * l) * e1, (2 * v - m * l) * e2]; }
  function rowU(m, l, v, e1, e2) { return [e1, e2, (1 + m * l) * e1, -(1 - m * l) * e2]; }
  function rowW(m, l, v, e1, e2) { return [e1, -e2, -(2 - 4 * v - m * l) * e1, -(2 - 4 * v + m * l) * e2]; }
  function solveN(M, rhs) {
    const n = rhs.length, a = M.map(r => r.slice()), b = rhs.slice();
    for (let c = 0; c < n; c++) {
      let p = c, mx = Math.abs(a[c][c]);
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > mx) { mx = Math.abs(a[r][c]); p = r; }
      if (p !== c) { [a[c], a[p]] = [a[p], a[c]]; [b[c], b[p]] = [b[p], b[c]]; }
      const piv = a[c][c];
      if (piv === 0) return null;
      for (let r = c + 1; r < n; r++) {
        const f = a[r][c] / piv; if (f === 0) continue;
        for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let c = r + 1; c < n; c++) s -= a[r][c] * x[c]; x[r] = s / a[r][r]; }
    return x;
  }
  function coefficients(m, H, E, nu, bonded, sumH) {
    const n = E.length;
    const Lam = [0]; { let c = 0; for (const h of H) { c += h; Lam.push(c / sumH); } }
    const N = 4 * n - 2;               // unknowns: A,B,C,D of layers 1..n-1, then B_n, D_n
    const col = (i, k) => (i < n - 1) ? 4 * i + k : (k === 1 ? 4 * (n - 1) : (k === 3 ? 4 * (n - 1) + 1 : -1));
    const M = [], rhs = [];
    const put = (row, i, vec, sgn) => { for (let k = 0; k < 4; k++) { const c = col(i, k); if (c >= 0) row[c] += sgn * vec[k]; } };
    const newRow = () => new Array(N).fill(0);
    // surface (layer 0, l = 0): e1 = exp(-m*Lam1), e2 = 1
    const e0 = n > 1 ? Math.exp(-m * Lam[1]) : 0;
    { const r = newRow(); put(r, 0, rowSZ(m, 0, nu[0], e0, 1), 1); M.push(r); rhs.push(1); }
    { const r = newRow(); put(r, 0, rowTAU(m, 0, nu[0], e0, 1), 1); M.push(r); rhs.push(0); }
    for (let i = 0; i < n - 1; i++) {
      const l = Lam[i + 1];
      const Fi = Math.exp(-m * (Lam[i + 1] - Lam[i]));                   // upper layer: e1 = 1, e2 = Fi
      const Fn = (i + 1 < n - 1) ? Math.exp(-m * (Lam[i + 2] - Lam[i + 1])) : 0; // lower layer: e1 = Fn, e2 = 1
      const R = E[i] / E[i + 1] * (1 + nu[i + 1]) / (1 + nu[i]);
      const vu = nu[i], vl = nu[i + 1];
      const up = f => f(m, l, vu, 1, Fi), lo = f => f(m, l, vl, Fn, 1);
      const sc = (vec, s) => vec.map(x => x * s);
      { const r = newRow(); put(r, i, up(rowSZ), 1); put(r, i + 1, lo(rowSZ), -1); M.push(r); rhs.push(0); }
      { const r = newRow(); put(r, i, up(rowW), 1); put(r, i + 1, sc(lo(rowW), R), -1); M.push(r); rhs.push(0); }
      if (bonded[i]) {
        { const r = newRow(); put(r, i, up(rowTAU), 1); put(r, i + 1, lo(rowTAU), -1); M.push(r); rhs.push(0); }
        { const r = newRow(); put(r, i, up(rowU), 1); put(r, i + 1, sc(lo(rowU), R), -1); M.push(r); rhs.push(0); }
      } else {
        { const r = newRow(); put(r, i, up(rowTAU), 1); M.push(r); rhs.push(0); }
        { const r = newRow(); put(r, i + 1, lo(rowTAU), 1); M.push(r); rhs.push(0); }
      }
    }
    const x = solveN(M, rhs);
    if (!x) return null;
    const coef = [];
    for (let i = 0; i < n - 1; i++) coef.push([x[4 * i], x[4 * i + 1], x[4 * i + 2], x[4 * i + 3]]);
    coef.push([0, x[4 * (n - 1)], 0, x[4 * (n - 1) + 1]]);
    return coef;
  }

  // Gauss-Legendre 8 points on [-1,1]
  const GX = [-0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498, 0.1834346424956498, 0.5255324099163290, 0.7966664774136267, 0.9602898564975363];
  const GW = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620, 0.3626837833783620, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];

  /**
   * Single circular load responses at points (r, z).
   * layers: [{h (m, last ignored/Infinity), E (MPa), nu, bonded (interface below, bool)}]
   * returns for each point {sz, sr, st, ez, er, et, w} (MPa, strain, m) compression positive; w downward positive.
   */
  function circular(q, a, layers, pts, opts) {
    opts = opts || {};
    const n = layers.length;
    const H = layers.slice(0, n - 1).map(l => l.h);
    const E = layers.map(l => l.E), nu = layers.map(l => l.nu);
    const bonded = layers.slice(0, n - 1).map(l => l.bonded !== false);
    let sumH = H.reduce((s, v) => s + v, 0);
    let Hs = H.slice(), Es = E.slice(), nus = nu.slice(), bs = bonded.slice();
    if (n === 1) { // homogeneous: add a fictitious identical layer
      Hs = [1.0]; Es = [E[0], E[0]]; nus = [nu[0], nu[0]]; bs = [true]; sumH = 1.0;
    }
    const Lam = [0]; { let c = 0; for (const h of Hs) { c += h; Lam.push(c / sumH); } Lam.push(1e3); }
    const alpha = a / sumH;
    const P = pts.map(p => {
      const L = Math.max(p.z, 1e-9) / sumH;
      let k = 1; while (!(Lam[k] > L)) k++;
      return { rho: Math.max(p.r, 1e-6) / sumH, L, k: k - 1, acc: { w: 0, wrr: 0, sz: 0, sr: 0, st: 0, trz: 0 } };
    });
    // breakpoints: zeros of J1(m*alpha) and J0(m*rho)
    const minL = Math.min(...P.map(p => p.L).filter(v => v > 1e-6), 10);
    const mMax = Math.max(opts.mAlphaMax || 120, 40 * alpha / Math.max(minL, 1e-3)) / alpha;
    const bp = new Set([0]);
    for (let k = 1; ; k++) { const m = (k + 0.25) * Math.PI / alpha - 0.375 / ((k + 0.25) * Math.PI) / alpha; if (m > mMax) break; bp.add(m); }
    for (const p of P) if (p.rho > 1e-5) for (let k = 1; ; k++) { const m = (k - 0.25) * Math.PI / p.rho; if (m > mMax) break; bp.add(m); }
    bp.add(mMax);
    const brk = Array.from(bp).sort((x, y) => x - y);
    // refine first intervals
    const grid = [];
    for (let i = 0; i < brk.length - 1; i++) {
      const sub = i < 3 ? 6 : 2;
      for (let s = 0; s < sub; s++) grid.push([brk[i] + (brk[i + 1] - brk[i]) * s / sub, brk[i] + (brk[i + 1] - brk[i]) * (s + 1) / sub]);
    }
    // partial sums at J1 zeros for averaging
    const partial = P.map(() => []);
    const j1z = []; for (let k = 1; ; k++) { const m = (k + 0.25) * Math.PI / alpha; if (m > mMax) break; j1z.push(m); }
    let nextZ = 0;
    for (const [m0, m1] of grid) {
      const hm = (m1 - m0) / 2, cm = (m1 + m0) / 2;
      for (let g = 0; g < 8; g++) {
        const m = cm + hm * GX[g], wt = hm * GW[g];
        const co = coefficients(m, Hs, Es, nus, bs, sumH);
        if (!co || !co.every(r => r.every(Number.isFinite))) continue;
        const j1a = bessj1(m * alpha) / m * wt;
        for (const p of P) {
          const [A, B, C, D] = co[p.k];
          const v = nus[p.k], Ek = Es[p.k], L = p.L;
          const e1 = Math.exp(-m * (Lam[p.k + 1] - L)), e2 = Math.exp(-m * (L - Lam[p.k]));
          const J0 = bessj0(m * p.rho), J1 = bessj1(m * p.rho);
          const t1 = (A + C * (1 + m * L)) * e1 + (B - D * (1 - m * L)) * e2;
          const t2 = 2 * v * m * J0 * (C * e1 - D * e2);
          const wk = -(1 + v) / Ek * ((A - C * (2 - 4 * v - m * L)) * e1 - (B + D * (2 - 4 * v + m * L)) * e2) * j1a;
          p.acc.w += wk * J0;
          p.acc.wrr += wk * (-m * m) * (J0 - J1 / (m * p.rho));
          p.acc.sz += -m * J0 * ((A - C * (1 - 2 * v - m * L)) * e1 + (B + D * (1 - 2 * v + m * L)) * e2) * j1a;
          p.acc.sr += ((m * J0 - J1 / p.rho) * t1 + t2) * j1a;
          p.acc.st += ((J1 / p.rho) * t1 + t2) * j1a;
          p.acc.trz += m * J1 * ((A + C * (2 * v + m * L)) * e1 - (B - D * (2 * v - m * L)) * e2) * j1a;
        }
      }
      while (nextZ < j1z.length && j1z[nextZ] <= m1 + 1e-12) {
        P.forEach((p, i) => partial[i].push({ ...p.acc }));
        nextZ++;
      }
    }
    return P.map((p, i) => {
      // average last partial sums (oscillation damping), then final
      const ps = partial[i].slice(-8); ps.push({ ...p.acc });
      const avg = key => ps.reduce((s, o) => s + o[key], 0) / ps.length;
      const v = nus[p.k], Ek = Es[p.k];
      const sz = -q * alpha * avg('sz'), sr = -q * alpha * avg('sr'), st = -q * alpha * avg('st');
      const w = sumH * q * alpha * avg('w');
      const wrr = q * alpha / sumH * avg('wrr');
      return {
        sz, sr, st, w, wrr, trz: -q * alpha * avg('trz'),
        ez: (sz - v * (sr + st)) / Ek,
        er: (sr - v * (sz + st)) / Ek,
        et: (st - v * (sz + sr)) / Ek,
      };
    });
  }

  /**
   * Dual wheel (jumelage) responses, Alizé-like: at depth z, under wheel (R) and between wheels (J).
   * returns {epsT (µdef, extension +), sigT (MPa, traction +), epsZ (µdef, compression +), sigZ, w (mm/100)} maxima + detail
   */
  function dualWheel(load, layers, depths) {
    const { q, a, d } = load;
    const pts = [];
    for (const z of depths) { pts.push({ r: 0, z }, { r: d / 2, z }, { r: d, z }); }
    const R = circular(q, a, layers, pts);
    return depths.map((z, i) => {
      const r0 = R[3 * i], rm = R[3 * i + 1], rd = R[3 * i + 2];
      const under = { ex: r0.er + rd.er, ey: r0.et + rd.et, ez: r0.ez + rd.ez, sx: r0.sr + rd.sr, sy: r0.st + rd.st, sz: r0.sz + rd.sz, w: r0.w + rd.w };
      const mid = { ex: 2 * rm.er, ey: 2 * rm.et, ez: 2 * rm.ez, sx: 2 * rm.sr, sy: 2 * rm.st, sz: 2 * rm.sz, w: 2 * rm.w };
      const pick = (f) => { const vals = [['X-R', f(under, 'x')], ['Y-R', f(under, 'y')], ['X-J', f(mid, 'x')], ['Y-J', f(mid, 'y')]]; return vals.reduce((b, v) => v[1] > b[1] ? v : b); };
      // Alizé "EpsT": algebraically smallest (most extended) horizontal strain, reported with sign (extension negative)
      const et = [['X-R', under.ex], ['Y-R', under.ey], ['X-J', mid.ex], ['Y-J', mid.ey]].reduce((b, v) => v[1] < b[1] ? v : b);
      const stt = [['X-R', under.sx], ['Y-R', under.sy], ['X-J', mid.sx], ['Y-J', mid.sy]].reduce((b, v) => v[1] < b[1] ? v : b);
      const ezz = under.ez >= mid.ez ? ['R', under.ez] : ['J', mid.ez];
      const szz = under.sz >= mid.sz ? ['R', under.sz] : ['J', mid.sz];
      return {
        z,
        epsT: -et[1] * 1e6, epsTAt: et[0],        // extension positive (µdef)
        sigT: -stt[1], sigTAt: stt[0],             // traction positive (MPa)
        epsZ: ezz[1] * 1e6, epsZAt: ezz[0],        // compression positive (µdef)
        sigZ: szz[1], sigZAt: szz[0],
        wR: under.w, wJ: mid.w,
      };
    });
  }

  // Surface deflection (mm/100) and radius of curvature (m) between the wheels
  function deflection(load, layers) {
    const { q, a, d } = load;
    const h = 0.05;
    const xs = [d / 2 - h, d / 2, d / 2 + h, 0];
    const pts = [];
    // superpose wheels at x=0 and x=d
    for (const x of xs) { pts.push({ r: Math.abs(x), z: 0 }, { r: Math.abs(d - x), z: 0 }); }
    const R = circular(q, a, layers, pts);
    const w = xs.map((x, i) => R[2 * i].w + R[2 * i + 1].w);
    const curv = (w[0] - 2 * w[1] + w[2]) / (h * h); // w positive downward -> convex basin gives negative
    return { dJ: w[1] * 1e5, dR: w[3] * 1e5, dmax: Math.max(w[1], w[3]) * 1e5, Rc: Math.abs(1 / curv) };
  }

  // ---- LCPC-SETRA / NF P 98-086 admissible values
  function normInv(p) { // Acklam
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  function kr(risk, b, SN, Sh_m, c) { // c in cm^-1 (0.02), Sh in m
    const u = normInv(risk);
    const delta = Math.sqrt(SN * SN + Math.pow((c || 0.02) * Sh_m * 100 / b, 2));
    return { u, delta, kr: Math.pow(10, -u * b * delta) };
  }
  function epsTadm(p) { // bituminous
    const k = kr(p.risk, p.b, p.SN, p.Sh);
    const kth = Math.sqrt(p.E10 / p.Eteq);
    const val = p.eps6 * Math.pow(p.NE / 1e6, p.b) * kth * k.kr * p.ks * p.kc;
    return { value: val, kr: k.kr, u: k.u, delta: k.delta, ktheta: kth };
  }
  function sigTadm(p) { // hydraulic-bound
    const k = kr(p.risk, p.b, p.SN, p.Sh);
    const val = p.sig6 * Math.pow(p.NE / 1e6, p.b) * k.kr * p.kd * p.ks * p.kc;
    return { value: val, kr: k.kr, u: k.u, delta: k.delta };
  }
  function epsZadm(p) { return { value: p.A * Math.pow(p.NE, p.exp) }; }
  function trafficNE(p) { // MJA per lane, n years, growth rate (arith or geom), CAM
    const n = p.n, t = p.tau;
    const C = p.mode === 'geom' ? (Math.pow(1 + t, n) - 1) / t : n * (1 + (n - 1) * t / 2);
    const NPL = 365 * p.MJA * C;
    return { C, NPL, NE: NPL * p.CAM };
  }

  const api = { bessj0, bessj1, circular, dualWheel, deflection, epsTadm, sigTadm, epsZadm, trafficNE, kr, normInv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LEA = api;
})(typeof window !== 'undefined' ? window : globalThis);
