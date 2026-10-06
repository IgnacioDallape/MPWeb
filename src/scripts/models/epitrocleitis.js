// Epitrocleítis (codo de golfista): codo derecho en vista MEDIAL (interna).
// Húmero distal con la epitróclea (epicóndilo medial) prominente, tróclea, cúbito con olécranon y apófisis coronoides.
// De la epitróclea nace el tendón común de flexores-pronadores, que se continúa en los flexores del antebrazo
// (pronador redondo, palmar mayor, palmar menor, flexor superficial de los dedos, cubital anterior).
// El nervio cubital baja por detrás de la epitróclea (canal epitrócleo-olecraneano) y entra al antebrazo bajo el cubital anterior.
// La lesión (acento cálido) está en el origen flexor sobre la epitróclea.
//
// Coordenadas locales (antes de girar la escena 180° en Y): plano sagital = XY, eje de flexión = Z,
// lateral = +Z y MEDIAL = −Z. La escena se gira para que la cara medial mire a la cámara
// (brazo hacia arriba a la derecha, antebrazo hacia la izquierda; extremos desvanecidos en vez de cortes duros).
export default function build(L) {
  const { THREE, M, halo, rnd, reseed } = L;
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const DBG = QS.get('dbg');

  // ------------------------------------------------------------------ Marcos anatómicos
  // Húmero: s → proximal, q → anterior. Antebrazo: s → distal, q → anterior.
  const rad = (d) => (d * Math.PI) / 180;
  const frame = (ang, ccw) => {
    const sx = Math.cos(ang), sy = Math.sin(ang);
    return { sx, sy, qx: ccw ? -sy : sy, qy: ccw ? sx : -sx };
  };
  const FH = frame(rad(QS.get("ah") ? Number(QS.get("ah")) : 132), false);
  const FF = frame(rad(QS.get("af") ? Number(QS.get("af")) : -10), true);
  const toW = (fr, s, q, z) => [s * fr.sx + q * fr.qx, s * fr.sy + q * fr.qy, z];
  const toL = (fr, x, y, z) => [x * fr.sx + y * fr.sy, x * fr.qx + y * fr.qy, z];
  const Hp = (s, q, z) => toW(FH, s, q, z);
  const Fp = (s, q, z) => toW(FF, s, q, z);
  const H2F = (s, q, z) => {
    const w = Hp(s, q, z);
    return toL(FF, w[0], w[1], w[2]);
  };

  // ------------------------------------------------------------------ SDF
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const len = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
  const sph = (cx, cy, cz, r) => (x, y, z) => len(x - cx, y - cy, z - cz) - r;
  const ell = (cx, cy, cz, rx, ry, rz) => (x, y, z) => {
    const px = x - cx, py = y - cy, pz = z - cz;
    const k0 = len(px / rx, py / ry, pz / rz);
    const k1 = len(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  const rcone = (ax, ay, az, bx, by, bz, ra, rb) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz;
    return (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const h = clamp((px * dx + py * dy + pz * dz) / l2, 0, 1);
      return len(px - dx * h, py - dy * h, pz - dz * h) - (ra + (rb - ra) * h);
    };
  };
  const cylZ = (cx, cy, r, z0, z1, rr) => {
    const zc = (z0 + z1) / 2, hz = (z1 - z0) / 2;
    return (x, y, z) => {
      const a = Math.hypot(x - cx, y - cy) - r + rr, b = Math.abs(z - zc) - hz + rr;
      return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0)) - rr;
    };
  };
  const cylX = (x0, x1, cy, cz, r, rr) => {
    const xc = (x0 + x1) / 2, hx = (x1 - x0) / 2;
    return (x, y, z) => {
      const a = Math.hypot(y - cy, z - cz) - r + rr, b = Math.abs(x - xc) - hx + rr;
      return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0)) - rr;
    };
  };

  const CAP_H = [0.0, 0.09, 0.25];
  const capW = Hp(CAP_H[0], CAP_H[1], CAP_H[2]);
  const CAP_F = toL(FF, capW[0], capW[1], capW[2]);
  const CUT_H = 2.35; // corte proximal del húmero (se desvanece antes)
  const CUT_F = 2.9; // corte del antebrazo (se desvanece antes)
  const FADE_H = [1.55, 2.3];
  const FADE_F = [1.95, 2.85];

  // Epitróclea (epicóndilo medial): grande y saliente hacia medial y un poco hacia atrás
  const EPI_H = [0.3, -0.07, -0.74];

  // Húmero distal
  const humerus = (() => {
    const shaft = rcone(0.5, 0.0, -0.02, 3.4, 0.03, 0.0, 0.265, 0.225);
    const flare = ell(0.42, -0.04, -0.1, 0.45, 0.2, 0.58);
    const latRidge = rcone(0.2, -0.08, 0.44, 1.3, -0.04, 0.16, 0.075, 0.045);
    const medRidge = rcone(0.25, -0.05, -0.62, 1.25, 0.0, -0.2, 0.1, 0.05);
    const latEpi = ell(0.24, -0.09, 0.45, 0.15, 0.14, 0.13);
    const medEpi = ell(EPI_H[0] + 0.02, EPI_H[1], EPI_H[2] + 0.06, 0.25, 0.17, 0.2);
    const medTip = rcone(EPI_H[0] + 0.05, EPI_H[1], EPI_H[2] + 0.1, EPI_H[0] - 0.03, EPI_H[1] - 0.05, EPI_H[2] - 0.1, 0.15, 0.12);
    const capit = sph(CAP_H[0], CAP_H[1], CAP_H[2], 0.205);
    const trM = cylZ(0.0, 0.02, 0.295, -0.52, -0.3, 0.08);
    const trG = cylZ(0.0, 0.02, 0.235, -0.36, -0.06, 0.05);
    const trL = cylZ(0.0, 0.02, 0.25, -0.1, 0.06, 0.05);
    const fossa = sph(0.5, -0.32, -0.2, 0.19);
    // Surco del nervio cubital por detrás de la epitróclea
    const groove = rcone(0.75, -0.36, -0.6, -0.05, -0.36, -0.62, 0.075, 0.075);
    return (x, y, z) => {
      let d = smin(shaft(x, y, z), flare(x, y, z), 0.25);
      d = smin(d, latRidge(x, y, z), 0.12);
      d = smin(d, medRidge(x, y, z), 0.14);
      d = smin(d, latEpi(x, y, z), 0.1);
      d = smin(d, medEpi(x, y, z), 0.2);
      d = smin(d, medTip(x, y, z), 0.12);
      let t = smin(trM(x, y, z), trG(x, y, z), 0.06);
      t = smin(t, trL(x, y, z), 0.06);
      d = smin(d, t, 0.08);
      d = smin(d, capit(x, y, z), 0.07);
      d = smax(d, -fossa(x, y, z), 0.08);
      d = smax(d, -groove(x, y, z), 0.05);
      return smax(d, x - CUT_H, 0.035);
    };
  })();

  // Cúbito (coordenadas del antebrazo); tubérculo coronoideo medial (inserción del ligamento colateral)
  const ulna = (() => {
    const olec = rcone(-0.33, -0.25, -0.17, 0.3, -0.3, -0.16, 0.2, 0.19);
    const beak = sph(-0.36, -0.13, -0.17, 0.12);
    const coro = rcone(0.45, -0.08, -0.17, 0.2, 0.25, -0.2, 0.13, 0.06);
    const sublime = ell(0.36, 0.03, -0.33, 0.12, 0.08, 0.08);
    const shaft = rcone(0.3, -0.27, -0.15, 3.95, -0.3, -0.08, 0.18, 0.105);
    const notch = cylZ(0, 0, 0.3, -0.9, 0.5, 0);
    const radNotch = cylX(0.25, 0.55, 0.055, 0.25, 0.235, 0);
    return (x, y, z) => {
      let d = smin(olec(x, y, z), beak(x, y, z), 0.12);
      d = smin(d, shaft(x, y, z), 0.2);
      d = smin(d, coro(x, y, z), 0.1);
      d = smin(d, sublime(x, y, z), 0.08);
      d = smax(d, -notch(x, y, z), 0.035);
      d = smax(d, -radNotch(x, y, z), 0.03);
      return smax(d, x - CUT_F, 0.035);
    };
  })();

  // Radio (queda del lado lateral, casi oculto)
  const radius = (() => {
    const head = cylX(0.3, 0.47, 0.055, 0.25, 0.2, 0.045);
    const dish = sph(CAP_F[0], CAP_F[1], CAP_F[2], 0.245);
    const neck = rcone(0.42, 0.055, 0.25, 0.85, 0.035, 0.22, 0.1, 0.095);
    const tub = ell(0.88, 0.0, 0.12, 0.13, 0.09, 0.09);
    const sh1 = rcone(0.8, 0.035, 0.22, 2.2, 0.0, 0.29, 0.1, 0.12);
    const sh2 = rcone(2.2, 0.0, 0.29, 3.95, -0.02, 0.24, 0.12, 0.15);
    return (x, y, z) => {
      let d = smin(head(x, y, z), neck(x, y, z), 0.06);
      d = smax(d, -dish(x, y, z), 0.03);
      d = smin(d, smin(sh1(x, y, z), sh2(x, y, z), 0.15), 0.12);
      d = smin(d, tub(x, y, z), 0.08);
      return smax(d, x - CUT_F, 0.035);
    };
  })();

  const sceneSDF = (x, y, z) => {
    const h = toL(FH, x, y, z), f = toL(FF, x, y, z);
    return Math.min(humerus(h[0], h[1], h[2]), ulna(f[0], f[1], f[2]), radius(f[0], f[1], f[2]));
  };

  // ------------------------------------------------------------------ Surface nets
  function surfaceNets(f, bmin, bmax, h) {
    const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
    const val = new Float32Array(nx * ny * nz);
    let p = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[p++] = f(bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h);
    const gi = (i, j, k) => i + nx * (j + ny * k);
    const cx = nx - 1, cy = ny - 1;
    const ci = (i, j, k) => i + cx * (j + cy * k);
    const cell = new Int32Array(cx * cy * (nz - 1)).fill(-1);
    const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const cv = new Float32Array(8);
    const pos = [];
    const e = h * 0.5;
    const grad = (x, y, z) => [f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)];
    for (let k = 0; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            cv[c] = val[gi(i + C[c][0], j + C[c][1], k + C[c][2])];
            if (cv[c] < 0) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;
          let sx = 0, sy = 0, sz = 0, n = 0;
          for (const [a, b] of E) {
            if (cv[a] < 0 === cv[b] < 0) continue;
            const t = cv[a] / (cv[a] - cv[b]);
            sx += C[a][0] + t * (C[b][0] - C[a][0]);
            sy += C[a][1] + t * (C[b][1] - C[a][1]);
            sz += C[a][2] + t * (C[b][2] - C[a][2]);
            n++;
          }
          let x = bmin[0] + (i + sx / n) * h, y = bmin[1] + (j + sy / n) * h, z = bmin[2] + (k + sz / n) * h;
          for (let it = 0; it < 2; it++) {
            const d = f(x, y, z);
            const g = grad(x, y, z);
            const g2 = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / (4 * e * e);
            if (g2 < 1e-8) break;
            const s = d / g2 / (2 * e);
            x -= g[0] * s;
            y -= g[1] * s;
            z -= g[2] * s;
          }
          cell[ci(i, j, k)] = pos.length / 3;
          pos.push(x, y, z);
        }
    const idx = [];
    const quad = (a, b, c, d, inside) => {
      a = cell[a]; b = cell[b]; c = cell[c]; d = cell[d];
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (inside) idx.push(a, b, c, a, c, d);
      else idx.push(a, c, b, a, d, c);
    };
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const in0 = val[gi(i, j, k)] < 0;
          if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && in0 !== val[gi(i + 1, j, k)] < 0) quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k), in0);
          if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && in0 !== val[gi(i, j + 1, k)] < 0) quad(ci(i - 1, j, k - 1), ci(i - 1, j, k), ci(i, j, k), ci(i, j, k - 1), in0);
          if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && in0 !== val[gi(i, j, k + 1)] < 0) quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k), in0);
        }
    const nrm = new Float32Array(pos.length);
    for (let v = 0; v < pos.length; v += 3) {
      const g = grad(pos[v], pos[v + 1], pos[v + 2]);
      const l = Math.hypot(g[0], g[1], g[2]) || 1;
      nrm[v] = g[0] / l;
      nrm[v + 1] = g[1] / l;
      nrm[v + 2] = g[2] / l;
    }
    return { pos, nrm, idx };
  }

  // Zona lesionada: origen flexor común, cara anterior-distal de la epitróclea (lado medial)
  const E = H2F(EPI_H[0], EPI_H[1], EPI_H[2]); // epitróclea en coordenadas del antebrazo
  const O = (ds, dq, dz) => Fp(E[0] + ds, E[1] + dq, E[2] + dz);
  const LES = O(0.24, 0.03, -0.1);
  const heatAt = (x, y, z, r = 0.24) => {
    const d = len(x - LES[0], y - LES[1], z - LES[2]);
    return Math.exp(-Math.pow(d / r, 2));
  };

  function boneMesh(f, fr, bmin, bmax, mat) {
    const { pos, nrm, idx } = surfaceNets(f, bmin, bmax, 0.02);
    const n = pos.length / 3;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Col = new Float32Array(n * 3);
    const shadeC = [0.42, 0.46, 0.6];
    const hot = [1.0, 0.55, 0.38];
    const Ld = [-0.25, 0.85, -0.46]; // luz cenital horneada (la escena se gira 180°)
    for (let v = 0; v < n; v++) {
      const w = toW(fr, pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
      const wn = toW(fr, nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]);
      P.set(w, v * 3);
      N.set(wn, v * 3);
      let occ = 0, sca = 1;
      for (let i = 1; i <= 5; i++) {
        const hh = 0.015 + 0.07 * i;
        occ += (hh - sceneSDF(w[0] + wn[0] * hh, w[1] + wn[1] * hh, w[2] + wn[2] * hh)) * sca;
        sca *= 0.72;
      }
      const ao = clamp(1 - 1.7 * occ, 0, 1);
      const lam = 0.5 + 0.5 * (wn[0] * Ld[0] + wn[1] * Ld[1] + wn[2] * Ld[2]);
      const lit = ao * (0.62 + 0.38 * lam);
      const heat = heatAt(w[0], w[1], w[2], 0.27) * 0.6;
      for (let c = 0; c < 3; c++) {
        const base = shadeC[c] + (1 - shadeC[c]) * lit;
        Col[v * 3 + c] = base * (1 - heat) + hot[c] * heat;
      }
    }
    const det = fr.sx * fr.qy - fr.sy * fr.qx;
    const I = idx.slice();
    if (det < 0) for (let t = 0; t < I.length; t += 3) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(Col, 3));
    g.setIndex(I);
    return new THREE.Mesh(g, mat);
  }

  // ------------------------------------------------------------------ Tubos de radio variable (con color por vértice opcional)
  class Tubes {
    constructor(tint = null) {
      this.p = [];
      this.n = [];
      this.c = [];
      this.i = [];
      this.tint = tint;
    }
    add(P, R, up, radial = 6) {
      const base = this.p.length / 3, m = P.length;
      const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
      for (let a = 0; a < m; a++) {
        T.subVectors(P[Math.min(a + 1, m - 1)], P[Math.max(a - 1, 0)]).normalize();
        Nn.copy(up).addScaledVector(T, -up.dot(T)).normalize();
        B.crossVectors(T, Nn);
        const [rx, ry] = R[a];
        const col = this.tint ? this.tint(P[a]) : null;
        for (let r = 0; r < radial; r++) {
          const an = (r / radial) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
          this.p.push(P[a].x + B.x * c * rx + Nn.x * s * ry, P[a].y + B.y * c * rx + Nn.y * s * ry, P[a].z + B.z * c * rx + Nn.z * s * ry);
          const ex = c / Math.max(rx, 1e-4), ey = s / Math.max(ry, 1e-4);
          const nx = B.x * ex + Nn.x * ey, ny = B.y * ex + Nn.y * ey, nz = B.z * ex + Nn.z * ey;
          const l = Math.hypot(nx, ny, nz) || 1;
          this.n.push(nx / l, ny / l, nz / l);
          if (col) this.c.push(col[0], col[1], col[2]);
        }
      }
      for (let a = 0; a < m - 1; a++)
        for (let r = 0; r < radial; r++) {
          const i0 = base + a * radial + r, i1 = base + (a + 1) * radial + r, i2 = base + (a + 1) * radial + ((r + 1) % radial), i3 = base + a * radial + ((r + 1) % radial);
          this.i.push(i0, i1, i2, i0, i2, i3);
        }
    }
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      if (this.tint) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setIndex(this.i);
      return g;
    }
  }

  // Tinte cálido (lesión) para tendones y vientres cerca del origen flexor
  const warmTendon = [1.0, 0.46, 0.28];
  const warmBelly = [1.25, 0.95, 0.75];
  const tintWith = (warm, r, k) => (p) => {
    const h = heatAt(p.x, p.y, p.z, r) * k;
    return [1 + (warm[0] - 1) * h, 1 + (warm[1] - 1) * h, 1 + (warm[2] - 1) * h];
  };
  const bellyT = new Tubes(tintWith(warmBelly, 0.3, 0.6)), striaT = new Tubes(tintWith(warmBelly, 0.3, 0.6));
  const tendonT = new Tubes(tintWith(warmTendon, 0.4, 1)), tcoreT = new Tubes(tintWith(warmTendon, 0.4, 1));
  const lesionT = new Tubes(), nerveT = new Tubes(), nerveFT = new Tubes();

  // Músculo: tendón proximal → vientre con estrías → tendón distal, a lo largo de una curva
  function muscle({ pts, up, b0, b1, wM, tM, wA = 0.085, tA = 0.045, wB = 0.06, tB = 0.026, nF = 26, nT = 10, seed, lesion = 0, peak = 0.42, rF = 0.014, rT = 0.012, fleshy = false, tendonEnd = 1 }) {
    reseed(seed);
    const curve = new THREE.CatmullRomCurve3(pts.map(V3), false, 'centripetal');
    const fr = (t) => {
      const p = curve.getPointAt(t), T = curve.getTangentAt(t);
      const N = up.clone().addScaledVector(T, -up.dot(T)).normalize();
      return { p, N, B: new THREE.Vector3().crossVectors(T, N) };
    };
    const ex = Math.log(0.5) / Math.log(peak);
    const shape = (t) => {
      const u = (t - b0) / (b1 - b0);
      return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(Math.PI * Math.pow(u, ex)), 0.6);
    };
    const bw = (t) => wM * shape(t), bt = (t) => tM * shape(t);
    const L0 = b0 + (b1 - b0) * 0.3, L1 = b1 - (b1 - b0) * 0.3;
    const bulge = (t) => (lesion && t < lesion ? 1 + 0.6 * Math.sin((Math.PI * t) / lesion) : 1);
    const tw = (t) => (t < L0 ? wA * bulge(t) : t > L1 ? wB : 0);
    const tt = (t) => (t < L0 ? tA * bulge(t) : t > L1 ? tB : 0);
    const W = (t) => Math.max(bw(t), tw(t)), Th = (t) => Math.max(bt(t), tt(t));
    const endCap = (a, n, k = 3) => Math.sqrt(clamp(Math.min(a, n - a) / k, 0.08, 1));

    {
      const P = [], R = [], n = 64, s0 = Math.max(b0, 0), s1 = Math.min(b1, tendonEnd);
      for (let a = 0; a <= n; a++) {
        const t = s0 + ((s1 - s0) * a) / n, f = fr(t), e = fleshy ? endCap(a, n * 2, 3) : 1;
        P.push(f.p);
        R.push([Math.max(bw(t) * e, 0.004), Math.max(bt(t) * e, 0.004)]);
      }
      bellyT.add(P, R, up, 26);
    }
    const solid = (ta, tb, tubes, n) => {
      const P = [], R = [];
      for (let a = 0; a <= n; a++) {
        const t = ta + ((tb - ta) * a) / n, f = fr(t), e = endCap(a, n, 2);
        P.push(f.p);
        R.push([Math.max((t < L0 ? wA * bulge(t) : wB) * e * 0.92, 0.003), Math.max((t < L0 ? tA * bulge(t) : tB) * e * 0.92, 0.003)]);
      }
      tubes.add(P, R, up, 18);
    };
    if (lesion) {
      solid(0, lesion * 1.05, lesionT, 24);
      solid(lesion * 0.9, L0, tcoreT, 36);
    } else if (!fleshy) solid(0, L0, tcoreT, 40);
    if (tendonEnd > L1) solid(L1, tendonEnd, tcoreT, 40);

    for (let j = 0; j < nF; j++) {
      const phi = -0.3 * Math.PI + (1.6 * Math.PI * (j + 0.2 + rnd() * 0.6)) / nF;
      const ua = Math.max(b0 + (b1 - b0) * (0.02 + rnd() * 0.08), 0.01), ub = Math.min(b1 - (b1 - b0) * (0.02 + rnd() * 0.08), tendonEnd);
      const P = [], R = [], n = 46, wob = rnd() * 6;
      for (let a = 0; a <= n; a++) {
        const t = ua + ((ub - ua) * a) / n, f = fr(t), ph = phi + 0.06 * Math.sin(t * 9 + wob);
        P.push(f.p.clone().addScaledVector(f.B, Math.cos(ph) * bw(t) * 0.99).addScaledVector(f.N, Math.sin(ph) * bt(t) * 0.99));
        const r = rF * endCap(a, n, 6);
        R.push([r, r]);
      }
      striaT.add(P, R, up, 5);
    }
    const tfib = (ta, tb, fromTendon, mat, frayK, nn = nT, emb = 0.93) => {
      for (let j = 0; j < nn; j++) {
        const phi = (2 * Math.PI * (j + rnd() * 0.5)) / nn;
        const sp = rnd();
        const P = [], R = [], n = 40, wob = rnd() * 6;
        const a0 = fromTendon ? ta : ta + (tb - ta) * sp * 0.35, a1 = fromTendon ? tb - (tb - ta) * sp * 0.35 : tb;
        for (let a = 0; a <= n; a++) {
          const t = a0 + ((a1 - a0) * a) / n, f = fr(t), ph = phi + 0.05 * Math.sin(t * 11 + wob);
          const p = f.p.clone().addScaledVector(f.B, Math.cos(ph) * W(t) * emb).addScaledVector(f.N, Math.sin(ph) * Th(t) * emb);
          if (frayK) {
            const k = frayK * Math.max(0, 1 - t / (lesion * 1.1));
            p.addScaledVector(f.B, Math.sin(j * 1.7 + t * 50 + wob) * k).addScaledVector(f.N, Math.cos(j * 2.3 + t * 41 + wob) * k * 0.8);
          }
          P.push(p);
          const r = rT * endCap(a, n, 4);
          R.push([r, r]);
        }
        mat.add(P, R, up, 5);
      }
    };
    if (lesion) {
      tfib(0, lesion, true, lesionT, 0.03);
      tfib(lesion * 0.85, L0 + (b1 - b0) * 0.05, true, tendonT, 0);
    } else if (!fleshy) tfib(0, L0 + (b1 - b0) * 0.05, true, tendonT, 0);
    if (tendonEnd > L1) tfib(L1 - (b1 - b0) * 0.05, tendonEnd, false, tendonT, 0, 6, 0.86);
  }

  // ------------------------------------------------------------------ Materiales
  const boneMat = new THREE.MeshPhysicalMaterial({ color: '#eadcc5', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: new THREE.Color('#fff4e2'), vertexColors: true });
  const tendonMat = M.tendon();
  tendonMat.vertexColors = true;
  const tendonCoreMat = new THREE.MeshPhysicalMaterial({ color: '#c9d7ee', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.8, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4, vertexColors: true });
  const bellyMat = new THREE.MeshPhysicalMaterial({ color: '#c95d66', roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color('#ffb0b0'), vertexColors: true });
  const lesionMat = M.lesion();
  const nerveMat = M.nerve();
  nerveMat.color.set('#f9b53a');
  nerveMat.emissive.set('#ff9a1f');
  nerveMat.emissiveIntensity = 0.2;

  // Desvanecido suave de los extremos (brazo y antebrazo) en lugar de cortes duros.
  // Se calcula en coordenadas del objeto con la proyección sobre el eje de cada segmento.
  const FADE_GLSL = `float sH_ = dot(vOP.xy, uFH.xy); float sF_ = dot(vOP.xy, uFF.xy);
    float fade_ = (1.0 - smoothstep(uFH.z, uFH.w, sH_)) * (1.0 - smoothstep(uFF.z, uFF.w, sF_)); fade_ *= fade_;`;
  const fadeUniforms = () => ({ uFH: { value: new THREE.Vector4(FH.sx, FH.sy, FADE_H[0], FADE_H[1]) }, uFF: { value: new THREE.Vector4(FF.sx, FF.sy, FADE_F[0], FADE_F[1]) } });
  const fadeEnds = (mat) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, fadeUniforms());
      sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
      sh.fragmentShader =
        'uniform vec4 uFH; uniform vec4 uFF; varying vec3 vOP;\n' +
        sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n ${FADE_GLSL}\n gl_FragColor.a *= fade_;`);
    };
    return mat;
  };
  [boneMat, tendonMat, tendonCoreMat, bellyMat, lesionMat, nerveMat].forEach(fadeEnds);

  // ------------------------------------------------------------------ Escena
  const root = new THREE.Group();
  const bones = new THREE.Group();
  bones.add(boneMesh(humerus, FH, [-0.42, -0.5, -1.02], [CUT_H + 0.08, 0.45, 0.66], boneMat));
  bones.add(boneMesh(ulna, FF, [-0.72, -0.62, -0.48], [CUT_F + 0.08, 0.46, 0.16], boneMat));
  bones.add(boneMesh(radius, FF, [0.18, -0.26, -0.06], [CUT_F + 0.08, 0.34, 0.53], boneMat));
  root.add(bones);

  // Flexores-pronadores (lado medial = −Z)
  const Z = new THREE.Vector3(0, 0, 1);
  const MZ = new THREE.Vector3(0, 0, -1);
  const Q = V3(toW(FF, 0, 1, 0));
  const upMed = MZ.clone();
  const upAntMed = MZ.clone().addScaledVector(Q, 0.7).normalize();
  const upAnt = MZ.clone().addScaledVector(Q, 1.6).normalize();
  const upPostMed = MZ.clone().addScaledVector(Q, -0.45).normalize();
  const endS = CUT_F - 0.03;

  // Pronador redondo: el más proximal y anterior, cruza en diagonal hacia el radio
  muscle({ pts: [O(-0.2, 0.16, 0.02), O(0.1, 0.22, -0.06), O(0.55, 0.32, 0.04), O(1.05, 0.4, 0.22), Fp(1.55, 0.5, -0.15), Fp(2.0, 0.42, 0.12)], up: upAnt, b0: 0.12, b1: 0.86, wM: 0.15, tM: 0.12, seed: 401, peak: 0.42, wA: 0.07, tA: 0.04, tendonEnd: 0.97 });
  // Palmar mayor (flexor radial del carpo)
  muscle({ pts: [O(-0.02, 0.07, -0.06), O(0.3, 0.14, -0.1), O(0.8, 0.22, 0.0), Fp(1.4, 0.4, -0.52), Fp(2.1, 0.42, -0.42), Fp(endS, 0.4, -0.32)], up: upAntMed, b0: 0.17, b1: 0.78, wM: 0.14, tM: 0.1, seed: 402, lesion: 0.14 });
  // Palmar menor
  muscle({ pts: [O(0.0, 0.0, -0.1), O(0.32, 0.05, -0.12), O(0.85, 0.08, -0.05), Fp(1.45, 0.24, -0.66), Fp(2.2, 0.27, -0.6), Fp(endS, 0.28, -0.55)], up: upMed, b0: 0.18, b1: 0.68, wM: 0.09, tM: 0.07, seed: 403, rF: 0.012, nF: 18, lesion: 0.13 });
  // Flexor superficial de los dedos (más ancho, por debajo)
  muscle({ pts: [O(0.0, -0.06, -0.02), O(0.35, -0.06, -0.04), O(0.9, -0.05, 0.04), Fp(1.5, 0.08, -0.62), Fp(2.2, 0.1, -0.58), Fp(endS, 0.12, -0.54)], up: upMed, b0: 0.2, b1: 0.84, wM: 0.17, tM: 0.11, seed: 404, lesion: 0.12 });
  // Cubital anterior (flexor cubital del carpo): el más posterior, sobre el cúbito
  muscle({ pts: [O(-0.06, -0.14, -0.02), O(0.3, -0.2, 0.0), O(0.85, -0.28, 0.12), Fp(1.5, -0.16, -0.55), Fp(2.2, -0.15, -0.5), Fp(endS, -0.13, -0.46)], up: upPostMed, b0: 0.16, b1: 0.86, wM: 0.15, tM: 0.11, seed: 405, nF: 24 });

  if (DBG !== 'bones') {
    root.add(new THREE.Mesh(bellyT.geo(), bellyMat));
    root.add(new THREE.Mesh(striaT.geo(), bellyMat));
    root.add(new THREE.Mesh(tcoreT.geo(), tendonCoreMat));
    root.add(new THREE.Mesh(tendonT.geo(), tendonMat));
    root.add(new THREE.Mesh(lesionT.geo(), lesionMat));
  }

  // ------------------------------------------------------------------ Nervio cubital
  {
    const pts = [Hp(CUT_H - 0.04, -0.27, -0.2), Hp(1.4, -0.3, -0.32), Hp(0.9, -0.35, -0.5), Hp(0.48, -0.37, -0.6), Hp(0.1, -0.36, -0.63), Fp(0.15, -0.16, -0.56), Fp(0.8, -0.05, -0.5), Fp(1.6, 0.0, -0.46), Fp(2.4, 0.02, -0.46), Fp(endS, 0.03, -0.46)].map(V3);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const n = 160, R0 = 0.066;
    const P = [], R = [];
    for (let a = 0; a <= n; a++) {
      const t = a / n, e = Math.sqrt(clamp(Math.min(a, n - a) / 2, 0.1, 1));
      P.push(curve.getPointAt(t));
      R.push([R0 * e, R0 * e]);
    }
    nerveT.add(P, R, Z, 20);
    // Fascículos en espiral sobre la superficie
    reseed(77);
    for (let j = 0; j < 9; j++) {
      const ph0 = (j / 9) * Math.PI * 2, F = [], FR = [];
      for (let a = 0; a <= n; a++) {
        const t = a / n, p = curve.getPointAt(t), T = curve.getTangentAt(t);
        const N = Z.clone().addScaledVector(T, -Z.dot(T)).normalize();
        const B = new THREE.Vector3().crossVectors(T, N);
        const ph = ph0 + t * 9;
        const e = Math.sqrt(clamp(Math.min(a, n - a) / 3, 0.1, 1));
        F.push(p.clone().addScaledVector(N, Math.cos(ph) * R0 * 0.82 * e).addScaledVector(B, Math.sin(ph) * R0 * 0.82 * e));
        FR.push([0.018 * e, 0.018 * e]);
      }
      nerveFT.add(F, FR, Z, 6);
    }
    if (DBG !== 'nonerve') {
      root.add(new THREE.Mesh(nerveT.geo(), nerveMat));
      root.add(new THREE.Mesh(nerveFT.geo(), nerveMat));
    }
  }

  // Brillo cálido de la lesión (del lado medial, hacia la cámara)
  const h1 = halo('#ff9a6b', 1.3, 0.68);
  h1.position.set(LES[0], LES[1], LES[2] - 0.3);
  const h2 = halo('#ff9466', 0.55, 0.85);
  h2.position.set(LES[0], LES[1], LES[2] - 0.2);
  root.add(h1, h2);

  // Girar 180° para que la cara medial mire a la cámara (antebrazo hacia la izquierda)
  root.rotation.y = Math.PI;
  const wrap = new THREE.Group();
  wrap.add(root);
  if (QS.get('rx')) wrap.rotation.x = Number(QS.get('rx'));
  if (QS.get('ry')) wrap.rotation.y = Number(QS.get('ry'));
  wrap.rotation.z = QS.get('rz') ? Number(QS.get('rz')) : 0;

  const arr = (k, d) => (QS.get(k) ? QS.get(k).split(',').map(Number) : d);
  return { root: wrap, cam: arr('cam', [4.2, 1.8, 6.0]), look: arr('look', [-0.7, 0.4, -0.2]), zoom: QS.get('zoom') ? Number(QS.get('zoom')) : 1.2 };
}
