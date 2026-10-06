// Epicondilitis lateral (codo de tenista): codo derecho en vista lateral (externa).
// Húmero distal con epicóndilo lateral, cabeza del radio, cúbito con olécranon e inicio del antebrazo.
// Del epicóndilo nace el tendón extensor común, que se abre en abanico hacia los extensores del antebrazo.
// La lesión (acento cálido) está en el origen del tendón, sobre el epicóndilo (extensor radial corto del carpo).
export default function build(L) {
  const { THREE, M, halo, rnd, reseed } = L;
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  // ------------------------------------------------------------------ Marcos anatómicos
  // Plano sagital = XY, eje de flexión = Z, lateral (+Z) hacia la cámara.
  // Húmero: s → proximal, q → anterior. Antebrazo: s → distal, q → anterior.
  const rad = (d) => (d * Math.PI) / 180;
  const frame = (ang, ccw) => {
    const sx = Math.cos(ang), sy = Math.sin(ang);
    return { sx, sy, qx: ccw ? -sy : sy, qy: ccw ? sx : -sx };
  };
  const FH = frame(rad(122), false);
  const FF = frame(rad(-12), true);
  const toW = (fr, s, q, z) => [s * fr.sx + q * fr.qx, s * fr.sy + q * fr.qy, z];
  const toL = (fr, x, y, z) => [x * fr.sx + y * fr.sy, x * fr.qx + y * fr.qy, z];
  const Hp = (s, q, z) => toW(FH, s, q, z);
  const Fp = (s, q, z) => toW(FF, s, q, z);

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
  // Cápsula de radio variable entre dos puntos
  const rcone = (ax, ay, az, bx, by, bz, ra, rb) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz;
    return (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const h = clamp((px * dx + py * dy + pz * dz) / l2, 0, 1);
      return len(px - dx * h, py - dy * h, pz - dz * h) - (ra + (rb - ra) * h);
    };
  };
  // Cilindros redondeados (eje Z y eje X locales)
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

  // Cóndilo humeral: capítulo (centro) en coordenadas del húmero y del antebrazo
  const CAP_H = [0.0, 0.09, 0.25];
  const capW = Hp(CAP_H[0], CAP_H[1], CAP_H[2]);
  const CAP_F = toL(FF, capW[0], capW[1], capW[2]);
  const CUT_H = 2.0; // fin del húmero (queda dentro del desvanecido)
  const CUT_F = 3.3; // fin del antebrazo (ídem)
  // Desvanecido suave de los extremos (alfa por vértice): húmero proximal y antebrazo distal
  const FADE_H = [1.58, 1.95], FADE_F = [2.4, 3.25];
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const fadeW = (x, y) => (1 - sstep(FADE_H[0], FADE_H[1], x * FH.sx + y * FH.sy)) * (1 - sstep(FADE_F[0], FADE_F[1], x * FF.sx + y * FF.sy));

  // Húmero distal (coordenadas locales del húmero)
  const humerus = (() => {
    const shaft = rcone(0.5, 0.0, -0.02, 3.4, 0.03, 0.0, 0.265, 0.225);
    const flare = ell(0.42, -0.04, -0.07, 0.45, 0.2, 0.56);
    const latRidge = rcone(0.2, -0.08, 0.44, 1.3, -0.04, 0.16, 0.08, 0.045);
    const medRidge = rcone(0.2, -0.05, -0.58, 1.15, 0.0, -0.2, 0.085, 0.05);
    const latEpi = ell(0.24, -0.09, 0.45, 0.17, 0.16, 0.15);
    const medEpi = ell(0.26, -0.06, -0.68, 0.19, 0.15, 0.17);
    const capit = sph(CAP_H[0], CAP_H[1], CAP_H[2], 0.205);
    const trM = cylZ(0.0, 0.02, 0.28, -0.5, -0.3, 0.07);
    const trG = cylZ(0.0, 0.02, 0.235, -0.36, -0.06, 0.05);
    const trL = cylZ(0.0, 0.02, 0.25, -0.1, 0.06, 0.05);
    const fossa = sph(0.5, -0.32, -0.2, 0.19);
    return (x, y, z) => {
      let d = smin(shaft(x, y, z), flare(x, y, z), 0.25);
      d = smin(d, latRidge(x, y, z), 0.12);
      d = smin(d, medRidge(x, y, z), 0.12);
      d = smin(d, latEpi(x, y, z), 0.1);
      d = smin(d, medEpi(x, y, z), 0.1);
      let t = smin(trM(x, y, z), trG(x, y, z), 0.06);
      t = smin(t, trL(x, y, z), 0.06);
      d = smin(d, t, 0.08);
      d = smin(d, capit(x, y, z), 0.07);
      d = smax(d, -fossa(x, y, z), 0.08);
      return smax(d, x - CUT_H, 0.035);
    };
  })();

  // Cúbito (coordenadas del antebrazo)
  const ulna = (() => {
    const olec = rcone(-0.33, -0.25, -0.17, 0.3, -0.3, -0.16, 0.2, 0.19);
    const beak = sph(-0.36, -0.13, -0.17, 0.12);
    const coro = rcone(0.45, -0.08, -0.17, 0.2, 0.25, -0.2, 0.13, 0.06);
    const shaft = rcone(0.3, -0.27, -0.15, 3.95, -0.3, -0.08, 0.18, 0.105);
    const notch = cylZ(0, 0, 0.3, -0.9, 0.5, 0);
    const radNotch = cylX(0.25, 0.55, 0.055, 0.25, 0.235, 0);
    return (x, y, z) => {
      let d = smin(olec(x, y, z), beak(x, y, z), 0.12);
      d = smin(d, shaft(x, y, z), 0.2);
      d = smin(d, coro(x, y, z), 0.1);
      d = smax(d, -notch(x, y, z), 0.035);
      d = smax(d, -radNotch(x, y, z), 0.03);
      return smax(d, x - CUT_F, 0.035);
    };
  })();

  // Radio (coordenadas del antebrazo)
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

  // SDF de toda la escena ósea en coordenadas de mundo (para oclusión ambiental)
  const sceneSDF = (x, y, z) => {
    const h = toL(FH, x, y, z), f = toL(FF, x, y, z);
    return Math.min(humerus(h[0], h[1], h[2]), ulna(f[0], f[1], f[2]), radius(f[0], f[1], f[2]));
  };

  // ------------------------------------------------------------------ Surface nets (malla suave a partir de la SDF)
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
    // Normales por gradiente de la SDF
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

  // Lleva una malla local (frame) al mundo, con oclusión ambiental y tinte de lesión en colores de vértice
  const LES = Fp(0.0, 0.1, 0.64); // origen del tendón extensor común (zona lesionada)
  function boneMesh(f, fr, bmin, bmax, mat) {
    const { pos, nrm, idx } = surfaceNets(f, bmin, bmax, 0.02);
    const n = pos.length / 3;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Col = new Float32Array(n * 4);
    const shadeC = [0.42, 0.46, 0.6];
    const hot = [1.0, 0.55, 0.38];
    const Ld = [0.25, 0.85, 0.46]; // luz cenital suave horneada (modelado de la forma)
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
      const dl = len(w[0] - LES[0], w[1] - LES[1], w[2] - LES[2]);
      const heat = Math.exp(-Math.pow(dl / 0.26, 2)) * 0.55;
      for (let c = 0; c < 3; c++) {
        const base = shadeC[c] + (1 - shadeC[c]) * lit;
        Col[v * 4 + c] = base * (1 - heat) + hot[c] * heat;
      }
      Col[v * 4 + 3] = fadeW(w[0], w[1]);
    }
    // El marco del húmero es "zurdo": se invierte el orden de los triángulos para mantener las caras hacia afuera
    const det = fr.sx * fr.qy - fr.sy * fr.qx;
    const I = idx.slice();
    if (det < 0) for (let t = 0; t < I.length; t += 3) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(Col, 4));
    g.setIndex(I);
    return new THREE.Mesh(g, mat);
  }

  // ------------------------------------------------------------------ Tubos de radio variable (fibras, vientres)
  class Tubes {
    constructor() {
      this.p = [];
      this.n = [];
      this.i = [];
    }
    // P: Vector3[], R: [rx, ry][], up: Vector3 (dirección del espesor)
    add(P, R, up, radial = 6) {
      const base = this.p.length / 3, m = P.length;
      const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
      for (let a = 0; a < m; a++) {
        T.subVectors(P[Math.min(a + 1, m - 1)], P[Math.max(a - 1, 0)]).normalize();
        Nn.copy(up).addScaledVector(T, -up.dot(T)).normalize();
        B.crossVectors(T, Nn);
        const [rx, ry] = R[a];
        for (let r = 0; r < radial; r++) {
          const an = (r / radial) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
          this.p.push(P[a].x + B.x * c * rx + Nn.x * s * ry, P[a].y + B.y * c * rx + Nn.y * s * ry, P[a].z + B.z * c * rx + Nn.z * s * ry);
          const ex = c / Math.max(rx, 1e-4), ey = s / Math.max(ry, 1e-4);
          const nx = B.x * ex + Nn.x * ey, ny = B.y * ex + Nn.y * ey, nz = B.z * ex + Nn.z * ey;
          const l = Math.hypot(nx, ny, nz) || 1;
          this.n.push(nx / l, ny / l, nz / l);
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
      const col = new Float32Array((this.p.length / 3) * 4);
      for (let v = 0; v < this.p.length / 3; v++) col.set([1, 1, 1, fadeW(this.p[v * 3], this.p[v * 3 + 1])], v * 4);
      g.setAttribute('color', new THREE.BufferAttribute(col, 4));
      g.setIndex(this.i);
      return g;
    }
  }

  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const bellyT = new Tubes(), striaT = new Tubes(), tendonT = new Tubes(), tcoreT = new Tubes(), lesionT = new Tubes();

  // Músculo: tendón proximal → vientre macizo con estrías → tendón distal, a lo largo de una curva.
  // b0..b1: tramo del vientre (0..1 de la curva). wM/tM: semiancho y semiespesor del vientre.
  function muscle({ pts, up, b0, b1, wM, tM, wA = 0.085, tA = 0.045, wB = 0.06, tB = 0.026, nF = 26, nT = 10, seed, lesion = 0, peak = 0.42, rF = 0.014, rT = 0.012, fleshy = false }) {
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
      const org = fleshy ? Math.sqrt(smooth(0, 0.09, t)) : 1; // origen carnoso: converge sobre el hueso
      return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(Math.PI * Math.pow(u, ex)), 0.6) * org;
    };
    const bw = (t) => wM * shape(t), bt = (t) => tM * shape(t);
    const L0 = b0 + (b1 - b0) * 0.3, L1 = b1 - (b1 - b0) * 0.3; // hasta dónde entra cada tendón en el vientre
    const bulge = (t) => (lesion && t < lesion ? 1 + 0.6 * Math.sin((Math.PI * t) / lesion) : 1);
    // Sección del conjunto (el mayor entre tendón y vientre)
    const tw = (t) => (t < L0 ? wA * bulge(t) : t > L1 ? wB : 0);
    const tt = (t) => (t < L0 ? tA * bulge(t) : t > L1 ? tB : 0);
    const W = (t) => Math.max(bw(t), tw(t)), Th = (t) => Math.max(bt(t), tt(t));
    const endCap = (a, n, k = 3) => Math.sqrt(clamp(Math.min(a, n - a) / k, 0.08, 1));

    // Vientre macizo
    {
      const P = [], R = [], n = 64, s0 = Math.max(b0, 0);
      for (let a = 0; a <= n; a++) {
        const t = s0 + ((b1 - s0) * a) / n, f = fr(t), e = 1;
        P.push(f.p);
        R.push([Math.max(bw(t) * e, 0.004), Math.max(bt(t) * e, 0.004)]);
      }
      bellyT.add(P, R, up, 26);
    }
    // Tendones macizos (proximal y distal); el proximal puede tener un tramo lesionado
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
    solid(L1, 1, tcoreT, 40);

    // Estrías del vientre: fibras finas sobre la superficie exterior
    for (let j = 0; j < nF; j++) {
      const phi = -0.3 * Math.PI + (1.6 * Math.PI * (j + 0.2 + rnd() * 0.6)) / nF;
      const ua = Math.max(b0 + (b1 - b0) * (0.004 + rnd() * 0.01), 0.002), ub = b1 - (b1 - b0) * (0.004 + rnd() * 0.01);
      const P = [], R = [], n = 46, wob = rnd() * 6;
      for (let a = 0; a <= n; a++) {
        const t = ua + ((ub - ua) * a) / n, f = fr(t), ph = phi + 0.06 * Math.sin(t * 9 + wob);
        P.push(f.p.clone().addScaledVector(f.B, Math.cos(ph) * bw(t) * 0.99).addScaledVector(f.N, Math.sin(ph) * bt(t) * 0.99));
        const r = rF * Math.min(1, 0.15 + Math.min(a, n - a) / 7);
        R.push([r, r]);
      }
      striaT.add(P, R, up, 5);
    }
    // Fibras tendinosas: recorren el tendón y se abren sobre el vientre (aponeurosis)
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
            p.addScaledVector(f.B, Math.sin(j * 1.7 + t * 32 + wob) * k).addScaledVector(f.N, Math.cos(j * 2.3 + t * 27 + wob) * k * 0.8);
          }
          P.push(p);
          const r = rT * endCap(a, n, 4);
          R.push([r, r]);
        }
        mat.add(P, R, up, 5);
      }
    };
    if (lesion) {
      tfib(0, lesion, true, lesionT, 0.016, 16, 0.95);
      tfib(lesion * 0.85, L0 + (b1 - b0) * 0.05, true, tendonT, 0);
    } else if (!fleshy) tfib(0, L0 + (b1 - b0) * 0.05, true, tendonT, 0);
    tfib(L1 - (b1 - b0) * 0.05, 1, false, tendonT, 0, 6, 0.86);
  }

  // ------------------------------------------------------------------ Materiales
  const boneMat = new THREE.MeshPhysicalMaterial({ color: '#eadcc5', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: new THREE.Color('#fff4e2'), vertexColors: true, transparent: true });
  const tendonMat = M.tendon();
  const tendonCoreMat = new THREE.MeshPhysicalMaterial({ color: '#bfd0ec', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.8, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4 });
  const bellyMat = new THREE.MeshPhysicalMaterial({ color: '#c95d66', roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color('#ffb0b0') });
  const lesionMat = M.lesion();
  lesionMat.color.set('#ff8452');
  lesionMat.emissive.set('#ff4f1f');
  lesionMat.emissiveIntensity = 0.5;
  for (const m of [tendonMat, tendonCoreMat, bellyMat, lesionMat]) {
    m.vertexColors = true;
    m.transparent = true;
  }

  // ------------------------------------------------------------------ Escena
  const root = new THREE.Group();
  root.add(boneMesh(humerus, FH, [-0.42, -0.44, -0.97], [CUT_H + 0.08, 0.45, 0.76], boneMat));
  root.add(boneMesh(ulna, FF, [-0.72, -0.62, -0.46], [CUT_F + 0.08, 0.46, 0.16], boneMat));
  root.add(boneMesh(radius, FF, [0.18, -0.26, -0.06], [CUT_F + 0.08, 0.34, 0.53], boneMat));


  // Extensores del antebrazo (lado lateral, hacia la cámara)
  const Z = new THREE.Vector3(0, 0, 1);
  const Q = V3(toW(FF, 0, 1, 0));
  const upPost = Z.clone().addScaledVector(Q, -0.6).normalize();
  const upAnt = Z.clone().addScaledVector(Q, 0.5).normalize();
  // Extensor radial corto del carpo: origen lesionado sobre el epicóndilo
  muscle({ pts: [Fp(-0.24, 0.09, 0.5), Fp(0.08, 0.09, 0.64), Fp(0.55, 0.11, 0.66), Fp(1.15, 0.13, 0.6), Fp(1.8, 0.11, 0.53), Fp(2.4, 0.08, 0.47), Fp(2.98, 0.06, 0.43), Fp(3.3, 0.05, 0.41)], up: Z, b0: 0.19, b1: 0.655, wM: 0.15, tM: 0.1, seed: 301, lesion: 0.15 });
  // Extensor de los dedos
  muscle({ pts: [Fp(-0.24, 0.06, 0.5), Fp(0.08, 0.05, 0.63), Fp(0.55, -0.02, 0.64), Fp(1.15, -0.14, 0.58), Fp(1.8, -0.17, 0.52), Fp(2.4, -0.16, 0.47), Fp(2.98, -0.14, 0.43), Fp(3.3, -0.13, 0.41)], up: Z, b0: 0.228, b1: 0.69, wM: 0.16, tM: 0.105, seed: 302 });
  // Extensor cubital del carpo
  muscle({ pts: [Fp(-0.24, 0.03, 0.5), Fp(0.08, 0.01, 0.61), Fp(0.55, -0.12, 0.58), Fp(1.15, -0.32, 0.43), Fp(1.8, -0.37, 0.33), Fp(2.4, -0.38, 0.26), Fp(2.98, -0.37, 0.21), Fp(3.3, -0.36, 0.19)], up: upPost, b0: 0.255, b1: 0.73, wM: 0.135, tM: 0.09, seed: 303 });
  // Extensor radial largo del carpo (cresta supracondílea lateral)
  muscle({ pts: [Fp(-0.6, 0.56, 0.24), Fp(-0.2, 0.5, 0.47), Fp(0.5, 0.39, 0.51), Fp(1.15, 0.35, 0.46), Fp(1.8, 0.33, 0.4), Fp(2.4, 0.3, 0.35), Fp(2.98, 0.27, 0.32), Fp(3.3, 0.26, 0.31)], up: upAnt, b0: -0.13, b1: 0.55, wM: 0.16, tM: 0.11, seed: 304, peak: 0.36, fleshy: true });
  // Braquiorradial (borde radial/anterior del antebrazo)
  muscle({ pts: [Fp(-1.05, 1.1, 0.16), Fp(-0.45, 0.86, 0.3), Fp(0.35, 0.62, 0.34), Fp(1.15, 0.54, 0.31), Fp(1.8, 0.5, 0.27), Fp(2.4, 0.46, 0.23), Fp(2.98, 0.43, 0.21), Fp(3.3, 0.42, 0.2)], up: Z.clone().addScaledVector(Q, 0.9).normalize(), b0: -0.11, b1: 0.61, wM: 0.17, tM: 0.13, seed: 305, peak: 0.4, fleshy: true });

  root.add(new THREE.Mesh(bellyT.geo(), bellyMat));
  root.add(new THREE.Mesh(striaT.geo(), bellyMat));
  root.add(new THREE.Mesh(tcoreT.geo(), tendonCoreMat));
  root.add(new THREE.Mesh(tendonT.geo(), tendonMat));
  root.add(new THREE.Mesh(lesionT.geo(), lesionMat));

  // Brillo cálido de la lesión
  const h1 = halo('#ff9a6b', 1.2, 0.55);
  h1.position.set(LES[0] + 0.03, LES[1], LES[2] + 0.3);
  const h2 = halo('#ff7a45', 0.55, 0.4);
  h2.position.set(LES[0], LES[1], LES[2] + 0.32);
  h1.renderOrder = h2.renderOrder = 10; // siempre por encima de las mallas (que son transparentes por el desvanecido)
  root.add(h1, h2);

  return { root, cam: [-0.6, 0.8, 7.5], look: [0.9, 0.4, 0.2], zoom: 1.1 };
}
