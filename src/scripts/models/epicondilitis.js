// Epicondilitis lateral (codo de tenista): codo derecho en vista lateral (externa).
// Húmero distal con epicóndilo lateral, cabeza del radio con ligamento anular, cúbito con olécranon e inicio del antebrazo.
// Del epicóndilo nace el tendón extensor común (corto), que se abre en abanico hacia la masa extensora del antebrazo.
// La lesión (acento cálido, degradado) está en el origen del tendón, sobre el epicóndilo (extensor radial corto del carpo).
export default function build(L) {
  const { THREE, M, rnd, reseed } = L;
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
  const CUT_F = 3.05; // fin del antebrazo (ídem)
  // Desvanecido suave de los extremos (alfa por vértice): húmero proximal y antebrazo distal
  const FADE_H = [1.35, 1.95], FADE_F = [2.05, 2.75];
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const fadeW = (x, y) => (1 - sstep(FADE_H[0], FADE_H[1], x * FH.sx + y * FH.sy)) * (1 - sstep(FADE_F[0], FADE_F[1], x * FF.sx + y * FF.sy));

  // Tróclea (coordenadas del húmero): también talla la escotadura troclear del cúbito (articulación congruente)
  const trM = cylZ(0.0, 0.02, 0.28, -0.5, -0.3, 0.07);
  const trG = cylZ(0.0, 0.02, 0.235, -0.36, -0.06, 0.05);
  const trL = cylZ(0.0, 0.02, 0.25, -0.1, 0.06, 0.05);
  const troch = (x, y, z) => smin(smin(trM(x, y, z), trG(x, y, z), 0.06), trL(x, y, z), 0.06);

  // Húmero distal (coordenadas locales del húmero)
  const humerus = (() => {
    const shaft = rcone(0.5, 0.0, -0.02, 3.4, 0.03, 0.0, 0.265, 0.225);
    const flare = ell(0.42, -0.04, -0.07, 0.45, 0.2, 0.56);
    const latRidge = rcone(0.2, -0.08, 0.44, 1.3, -0.04, 0.16, 0.08, 0.045);
    const medRidge = rcone(0.2, -0.05, -0.58, 1.15, 0.0, -0.2, 0.085, 0.05);
    const latEpi = ell(0.24, -0.08, 0.48, 0.25, 0.19, 0.18);
    const medEpi = ell(0.26, -0.06, -0.68, 0.19, 0.15, 0.17);
    const capit = sph(CAP_H[0], CAP_H[1], CAP_H[2], 0.205);
    const fossa = sph(0.5, -0.32, -0.2, 0.19);
    return (x, y, z) => {
      let d = smin(shaft(x, y, z), flare(x, y, z), 0.25);
      d = smin(d, latRidge(x, y, z), 0.12);
      d = smin(d, medRidge(x, y, z), 0.12);
      d = smin(d, latEpi(x, y, z), 0.16);
      d = smin(d, medEpi(x, y, z), 0.1);
      d = smin(d, troch(x, y, z), 0.08);
      d = smin(d, capit(x, y, z), 0.07);
      d = smax(d, -fossa(x, y, z), 0.08);
      return smax(d, x - CUT_H, 0.035);
    };
  })();

  // Cúbito (coordenadas del antebrazo)
  const ulna = (() => {
    const olec = rcone(-0.27, -0.24, -0.17, 0.3, -0.3, -0.16, 0.17, 0.15);
    const beak = sph(-0.33, -0.12, -0.17, 0.09);
    const coro = rcone(0.45, -0.08, -0.17, 0.2, 0.25, -0.2, 0.13, 0.06);
    const shaft = rcone(0.3, -0.27, -0.15, 3.95, -0.3, -0.08, 0.17, 0.1);
    const radNotch = cylX(0.25, 0.55, 0.055, 0.27, 0.24, 0);
    // Escotadura troclear = tróclea dilatada 0.02 (en coordenadas del húmero)
    const notch = (x, y, z) => {
      const w = toW(FF, x, y, z), h = toL(FH, w[0], w[1], w[2]);
      return troch(h[0], h[1], h[2]) - 0.02;
    };
    return (x, y, z) => {
      let d = smin(olec(x, y, z), beak(x, y, z), 0.1);
      d = smin(d, shaft(x, y, z), 0.2);
      d = smin(d, coro(x, y, z), 0.1);
      d = smax(d, -(x + 0.4), 0.1); // superficie proximal (inserción del tríceps) cuadrada
      d = smax(d, -notch(x, y, z), 0.03);
      d = smax(d, -radNotch(x, y, z), 0.03);
      return smax(d, x - CUT_F, 0.035);
    };
  })();

  // Radio (coordenadas del antebrazo)
  const HEAD = { q: 0.055, z: 0.28, r: 0.22 };
  const radius = (() => {
    const head = cylX(0.29, 0.47, HEAD.q, HEAD.z, HEAD.r, 0.05);
    const collar = cylX(0.33, 0.45, HEAD.q, HEAD.z, HEAD.r + 0.028, 0.025); // ligamento anular
    const dish = sph(CAP_F[0], CAP_F[1], CAP_F[2], 0.245);
    const neck = rcone(0.42, 0.055, 0.27, 0.85, 0.035, 0.22, 0.1, 0.095);
    const tub = ell(0.88, 0.0, 0.12, 0.13, 0.09, 0.09);
    const sh1 = rcone(0.8, 0.035, 0.22, 2.2, 0.0, 0.29, 0.1, 0.12);
    const sh2 = rcone(2.2, 0.0, 0.29, 3.95, -0.02, 0.24, 0.12, 0.15);
    return (x, y, z) => {
      let d = smin(head(x, y, z), neck(x, y, z), 0.06);
      d = smax(d, -dish(x, y, z), 0.03);
      d = smin(d, collar(x, y, z), 0.025);
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
  // Altura (z) de la superficie lateral del húmero en (s, q): para apoyar orígenes musculares sobre el hueso
  const humSurfZ = (s, q) => {
    let z = 1.4;
    for (let i = 0; i < 80; i++) {
      const d = humerus(s, q, z);
      if (d < 0.002) break;
      z -= Math.max(d * 0.8, 0.002);
    }
    return z;
  };
  const Hs = (s, q, off) => Hp(s, q, humSurfZ(s, q) + off);

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

  // Atenuación del color con el desvanecido (los extremos se funden en el fondo en vez de quedar como manchas blancas)
  const dim = (f) => 0.45 + 0.55 * f;

  // Lleva una malla local (frame) al mundo, con oclusión ambiental, luz horneada y tinte de lesión en colores de vértice
  const LES = Fp(-0.02, 0.1, 0.66); // origen del tendón extensor común (zona lesionada)
  const VIEW = new THREE.Vector3(-0.2, 0.06, 0.98).normalize(); // dirección aproximada hacia la cámara
  function boneMesh(f, fr, bmin, bmax, mat, tintFn = null) {
    const { pos, nrm, idx } = surfaceNets(f, bmin, bmax, 0.02);
    const n = pos.length / 3;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Col = new Float32Array(n * 4), Heat = new Float32Array(n);
    const shadeC = [0.34, 0.38, 0.52];
    const hot = [1.0, 0.5, 0.32];
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
      const ao = clamp(1 - 2.1 * occ, 0, 1);
      const lam = 0.5 + 0.5 * (wn[0] * Ld[0] + wn[1] * Ld[1] + wn[2] * Ld[2]);
      const lit = ao * (0.36 + 0.64 * lam);
      const dl = len(w[0] - LES[0], w[1] - LES[1], w[2] - LES[2]);
      const g = Math.exp(-Math.pow(dl / 0.35, 2));
      const heat = g * 0.6;
      const fw = fadeW(w[0], w[1]);
      const nv = Math.abs(wn[0] * VIEW.x + wn[1] * VIEW.y + wn[2] * VIEW.z);
      const edge = 1 - 0.22 * Math.pow(1 - nv, 2.2); // contorno algo más oscuro: la silueta se lee sobre fondo claro
      const tc = tintFn ? tintFn(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]) : null;
      for (let c = 0; c < 3; c++) {
        let base = (shadeC[c] + (1 - shadeC[c]) * lit) * edge;
        if (tc) base = base * (1 - tc[3]) + tc[c] * edge * tc[3];
        Col[v * 4 + c] = (base * (1 - heat) + hot[c] * heat) * dim(fw);
      }
      Col[v * 4 + 3] = fw;
      Heat[v] = g * 0.35;
    }
    // El marco del húmero es "zurdo": se invierte el orden de los triángulos para mantener las caras hacia afuera
    const det = fr.sx * fr.qy - fr.sy * fr.qx;
    const I = idx.slice();
    if (det < 0) for (let t = 0; t < I.length; t += 3) [I[t + 1], I[t + 2]] = [I[t + 2], I[t + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(Col, 4));
    g.setAttribute('heat', new THREE.BufferAttribute(Heat, 1));
    g.setIndex(I);
    return new THREE.Mesh(g, mat);
  }

  // ------------------------------------------------------------------ Tubos de radio variable (fibras, vientres)
  // Cada anillo puede llevar color [r,g,b] y "calor" (emisión cálida de la lesión).
  class Tubes {
    constructor() {
      this.p = [];
      this.n = [];
      this.c = [];
      this.h = [];
      this.i = [];
    }
    // P: Vector3[], R: [rx, ry][], up: Vector3 o Vector3[] (dirección del espesor), C: [r,g,b,heat][] opcional
    add(P, R, up, radial = 6, C = null) {
      const base = this.p.length / 3, m = P.length;
      const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
      for (let a = 0; a < m; a++) {
        const U = Array.isArray(up) ? up[a] : up;
        T.subVectors(P[Math.min(a + 1, m - 1)], P[Math.max(a - 1, 0)]).normalize();
        Nn.copy(U).addScaledVector(T, -U.dot(T)).normalize();
        B.crossVectors(T, Nn);
        const [rx, ry] = R[a];
        const col = C ? C[a] : [1, 1, 1, 0];
        for (let r = 0; r < radial; r++) {
          const an = (r / radial) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
          const x = P[a].x + B.x * c * rx + Nn.x * s * ry, y = P[a].y + B.y * c * rx + Nn.y * s * ry, z = P[a].z + B.z * c * rx + Nn.z * s * ry;
          this.p.push(x, y, z);
          const ex = c / Math.max(rx, 1e-4), ey = s / Math.max(ry, 1e-4);
          const nx = B.x * ex + Nn.x * ey, ny = B.y * ex + Nn.y * ey, nz = B.z * ex + Nn.z * ey;
          const l = Math.hypot(nx, ny, nz) || 1;
          this.n.push(nx / l, ny / l, nz / l);
          const fw = fadeW(x, y) * (col.length > 4 ? col[4] : 1);
          this.c.push(col[0] * dim(fw), col[1] * dim(fw), col[2] * dim(fw), fw);
          this.h.push(col[3]);
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
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 4));
      g.setAttribute('heat', new THREE.Float32BufferAttribute(this.h, 1));
      g.setIndex(this.i);
      return g;
    }
  }

  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const pmax = (a, b) => Math.pow(a * a * a * a + b * b * b * b, 0.25); // máximo suave
  const deepT = new Tubes(), bellyT = new Tubes(), striaT = new Tubes(), tendonT = new Tubes(), tcoreT = new Tubes();

  // Colores por vértice (lineales) — músculo, unión miotendinosa y degradado de la lesión
  const col = (h) => new THREE.Color(h);
  const PINK = col('#c95d66'), PINK_D = col('#b8505b'), TWHITE = col('#e9eef8');
  const TDIST = [0.8, 0.85, 0.93, 0]; // tendones distales algo más apagados (no compiten con la lesión)
  const CORE = col('#ff5a2a'), AMBER = col('#ffae6a'), WHITE = col('#ffffff');
  const lesionCol = (t, les) => {
    if (!les) return [1, 1, 1, 0];
    const h = 1 - smooth(0.45 * les, 1.9 * les, t);
    const c = h > 0.5 ? AMBER.clone().lerp(CORE, (h - 0.5) * 2) : WHITE.clone().lerp(AMBER, h * 2);
    return [c.r, c.g, c.b, h * 1.1];
  };

  // Músculo: tendón proximal corto → vientre carnoso con estrías → unión miotendinosa → tendón distal.
  // b0..b1: tramo del vientre (0..1 de la curva). wM/tM: semiancho y semiespesor máximos. peak: posición del máximo.
  // rise/fall: forma de la subida (proximal) y de la bajada (distal). El vientre nunca baja del ancho del tendón:
  // se continúa con él (sin puntas). up: Vector3 o función t → Vector3 (dirección del espesor).
  function muscle({ pts, up, b0, b1, wM, tM, peak = 0.32, rise = 0.55, fall = 1.0, wA = 0.085, tA = 0.045, wB = 0.055, tB = 0.028, nF = 32, seed, lesion = 0, fleshy = false, tint = PINK }) {
    reseed(seed);
    const curve = new THREE.CatmullRomCurve3(pts.map(V3), false, 'centripetal');
    const upAt = typeof up === 'function' ? up : () => up;
    const fr = (t) => {
      const p = curve.getPointAt(t), T = curve.getTangentAt(t), U = upAt(t);
      const N = U.clone().addScaledVector(T, -U.dot(T)).normalize();
      return { p, N, B: new THREE.Vector3().crossVectors(T, N), U };
    };
    const U = (t) => (t - b0) / (b1 - b0);
    const S = (t) => {
      const u = U(t);
      if (u <= 0 || u >= 1) return 0;
      return u < peak ? Math.pow(Math.sin((0.5 * Math.PI * u) / peak), rise) : Math.pow(Math.cos((0.5 * Math.PI * (u - peak)) / (1 - peak)), fall);
    };
    // Hacia distal el espesor cae antes que el ancho: el vientre se aplana en aponeurosis
    const flat = (t) => {
      const u = U(t);
      return u <= peak ? 1 : Math.pow(Math.max(Math.cos((0.5 * Math.PI * (u - peak)) / (1 - peak)), 0), 0.4);
    };
    const bulge = (t) => (lesion && t < lesion * 1.6 ? 1 + 0.25 * Math.sin((Math.PI * t) / (lesion * 1.6)) : 1);
    const org = (t) => 0.5 + 0.5 * Math.sqrt(smooth(0, 0.12, t)); // origen carnoso: ancho mínimo 0.5·wM, anclado al hueso
    const baseW = (t) => (U(t) < peak ? (fleshy ? 0.5 * wM : wA * bulge(t)) : wB);
    const baseT = (t) => (U(t) < peak ? (fleshy ? 0.5 * tM : tA * bulge(t)) : tB);
    const bw = (t) => pmax(wM * S(t) * (fleshy ? org(t) : 1), baseW(t));
    const orgT = (t) => 0.3 + 0.7 * Math.sqrt(smooth(0, 0.16, t));
    const bt = (t) => pmax(tM * S(t) * flat(t) * (fleshy ? orgT(t) : 1), fleshy ? 0.3 * tM * orgT(t) : baseT(t));
    // Color del vientre: rosa, blanqueando en las uniones miotendinosas
    const bellyCol = (t) => {
      const u = U(t);
      const m = Math.max(fleshy ? 0.75 * (1 - smooth(0.0, 0.07, t)) : 1 - smooth(0.0, 0.13, u), smooth(0.74, 0.97, u));
      const c = tint.clone().lerp(TWHITE, m);
      const lc = !fleshy && lesion ? lesionCol(t, lesion) : null;
      if (lc && lc[3] > 0.01) c.lerp(new THREE.Color(lc[0], lc[1], lc[2]), Math.min(1, lc[3]) * m);
      return [c.r, c.g, c.b, lc ? lc[3] * m : 0];
    };

    // Vientre macizo (de b0 a b1, o desde el origen carnoso en t = 0 con extremo redondeado)
    {
      const P = [], R = [], Up = [], C = [], n = 84, s0 = Math.max(b0, 0);
      for (let a = 0; a <= n; a++) {
        const t = s0 + ((b1 - s0) * a) / n, f = fr(t);
        const cap = fleshy ? Math.sqrt(clamp(a / 5, 0.0, 1)) : 1;
        P.push(f.p);
        Up.push(f.U);
        R.push([Math.max(bw(t) * cap, 0.004), Math.max(bt(t) * cap, 0.004)]);
        C.push(bellyCol(t));
      }
      bellyT.add(P, R, Up, 30, C);
    }
    // Tendones macizos: proximal (con el degradado de la lesión) y distal (continúa el vientre)
    const solid = (ta, tb, n, wq, tq, capA, capB) => {
      const P = [], R = [], Up = [], C = [];
      for (let a = 0; a <= n; a++) {
        const t = ta + ((tb - ta) * a) / n, f = fr(t);
        const e = Math.sqrt(clamp(Math.min(capA ? a / 2 : 9, capB ? (n - a) / 2 : 9), 0.08, 1));
        P.push(f.p);
        Up.push(f.U);
        R.push([Math.max(wq(t) * e * 0.94, 0.003), Math.max(tq(t) * e * 0.94, 0.003)]);
        C.push(t < b1 ? lesionCol(t, lesion) : [...TDIST, 1 - smooth(b1 + (1 - b1) * 0.04, b1 + (1 - b1) * 0.32, t)]);
      }
      tcoreT.add(P, R, Up, 20, C);
    };
    if (!fleshy) solid(0, b0 + (b1 - b0) * 0.04, 48, (t) => wA * bulge(t), (t) => tA * bulge(t), true, false);
    solid(b1 - (b1 - b0) * 0.03, 1, 40, () => wB, () => tB, false, true);

    // Estrías del vientre: fibras finas sobre la superficie exterior
    for (let j = 0; j < nF; j++) {
      const phi = -0.3 * Math.PI + (1.6 * Math.PI * (j + 0.2 + rnd() * 0.6)) / nF;
      const ua = fleshy ? 0.02 + rnd() * 0.035 : b0 + (b1 - b0) * (0.07 + rnd() * 0.06);
      const ub = b1 - (b1 - b0) * (0.1 + rnd() * 0.1);
      const P = [], R = [], Up = [], C = [], n = 56, wob = rnd() * 6;
      for (let a = 0; a <= n; a++) {
        const t = ua + ((ub - ua) * a) / n, f = fr(t), ph = phi + 0.06 * Math.sin(t * 9 + wob);
        P.push(f.p.clone().addScaledVector(f.B, Math.cos(ph) * bw(t) * 0.982).addScaledVector(f.N, Math.sin(ph) * bt(t) * 0.982));
        Up.push(f.U);
        const r = 0.0095 * Math.min(1, 0.15 + Math.min(a, n - a) / 8);
        R.push([r, r]);
        C.push(bellyCol(t));
      }
      striaT.add(P, R, Up, 5, C);
    }
    // Fibras tendinosas: recorren el tendón y se abren sobre la unión miotendinosa
    const tfib = (ta, tb, fromTendon, frayK, nn, emb) => {
      for (let j = 0; j < nn; j++) {
        const phi = (2 * Math.PI * (j + rnd() * 0.5)) / nn;
        const sp = rnd();
        const P = [], R = [], Up = [], C = [], n = 44, wob = rnd() * 6;
        const a0 = fromTendon ? ta : ta + (tb - ta) * sp * 0.3, a1 = fromTendon ? tb - (tb - ta) * sp * 0.3 : tb;
        for (let a = 0; a <= n; a++) {
          const t = a0 + ((a1 - a0) * a) / n, f = fr(t), ph = phi + 0.05 * Math.sin(t * 11 + wob);
          const inB = U(t) > 0 && U(t) < 1;
          const W = inB ? bw(t) : t < b0 ? wA * bulge(t) : wB, Th = inB ? bt(t) : t < b0 ? tA * bulge(t) : tB;
          const p = f.p.clone().addScaledVector(f.B, Math.cos(ph) * W * emb).addScaledVector(f.N, Math.sin(ph) * Th * emb);
          if (frayK && lesion) {
            const k = frayK * Math.max(0, 1 - t / (lesion * 1.5));
            p.addScaledVector(f.B, Math.sin(j * 1.7 + t * 40 + wob) * k).addScaledVector(f.N, Math.cos(j * 2.3 + t * 33 + wob) * k * 0.8);
          }
          P.push(p);
          Up.push(f.U);
          C.push(fromTendon ? lesionCol(t, lesion) : [1, 1, 1, 0]);
          const r = 0.011 * Math.sqrt(clamp(Math.min(a, n - a) / 4, 0.08, 1));
          R.push([r, r]);
        }
        tendonT.add(P, R, Up, 5, C);
      }
    };
    if (!fleshy) tfib(0, b0 + (b1 - b0) * 0.1, true, lesion ? 0.012 : 0, lesion ? 16 : 10, 0.96);
    tfib(b1 - (b1 - b0) * 0.2, b1 + (1 - b1) * 0.15, false, 0, 6, 0.9);
  }

  // ------------------------------------------------------------------ Materiales
  // Parche común: emisión cálida por vértice ("heat") y brillo (sheen/clearcoat) atenuado en la lesión y en el desvanecido
  const HOT = new THREE.Color('#ff4a1a');
  const patch = (mat, hotK = 1) => {
    mat.vertexColors = true;
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uHot = { value: HOT.clone().multiplyScalar(hotK) };
      sh.vertexShader = 'attribute float heat;\nvarying float vHeat;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHeat = heat;');
      sh.fragmentShader =
        'uniform vec3 uHot;\nvarying float vHeat;\n' +
        sh.fragmentShader
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uHot * vHeat;')
          .replace(
            '#include <lights_physical_fragment>',
            `#include <lights_physical_fragment>
            #ifdef USE_SHEEN
              material.sheenColor *= (1.0 - min(vHeat, 1.0)) * vColor.a;
            #endif
            #ifdef USE_CLEARCOAT
              material.clearcoat *= mix(0.25, 1.0, vColor.a);
            #endif`
          );
    };
    return mat;
  };
  const boneMat = patch(new THREE.MeshPhysicalMaterial({ color: '#eadcc5', roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new THREE.Color('#fff4e2') }), 0.6);
  const tendonMat = patch(M.tendon(), 0.9);
  const tendonCoreMat = patch(new THREE.MeshPhysicalMaterial({ color: '#d2def2', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.8, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4 }), 0.9);
  const bellyMat = patch(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color('#ffc0c0') }), 0.9);
  const deepMat = patch(new THREE.MeshPhysicalMaterial({ color: '#b04f5b', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }));

  // ------------------------------------------------------------------ Escena
  const root = new THREE.Group();
  root.add(boneMesh(humerus, FH, [-0.42, -0.44, -0.97], [CUT_H + 0.08, 0.45, 0.76], boneMat));
  root.add(boneMesh(ulna, FF, [-0.62, -0.62, -0.46], [CUT_F + 0.08, 0.46, 0.16], boneMat));
  const LIGC = [0.86, 0.9, 0.98];
  root.add(
    boneMesh(radius, FF, [0.18, -0.26, -0.06], [CUT_F + 0.08, 0.36, 0.6], boneMat, (x, y, z) => {
      const rr = Math.hypot(y - HEAD.q, z - HEAD.z);
      const k = smooth(0.315, 0.335, x) * (1 - smooth(0.445, 0.465, x)) * smooth(HEAD.r + 0.004, HEAD.r + 0.016, rr);
      return k > 0 ? [LIGC[0], LIGC[1], LIGC[2], k] : null;
    })
  );

  const Z = new THREE.Vector3(0, 0, 1);
  const Q = V3(toW(FF, 0, 1, 0));
  const tilt = (k) => Z.clone().addScaledVector(Q, k).normalize();

  // Plano profundo (supinador y extensores profundos): llena los huecos entre los vientres superficiales
  {
    const P = [], R = [], n = 50;
    for (let a = 0; a <= n; a++) {
      const s = 0.3 + (1.22 * a) / n, u = a / n;
      P.push(V3(Fp(s, 0.19 - 0.17 * u, 0.32)));
      const k = Math.sqrt(clamp(Math.min(a, n - a) / 5, 0.1, 1));
      R.push([(0.42 - 0.16 * u) * k, (0.2 - 0.06 * u) * k]);
    }
    deepT.add(P, R, Z, 28, P.map(() => [1, 1, 1, 0]));
  }

  // Extensor radial corto del carpo: origen lesionado sobre el epicóndilo
  muscle({ pts: [Fp(-0.2, 0.1, 0.55), Fp(0.06, 0.1, 0.64), Fp(0.55, 0.12, 0.65), Fp(1.15, 0.13, 0.6), Fp(1.8, 0.11, 0.53), Fp(2.4, 0.08, 0.47), Fp(2.98, 0.06, 0.43), Fp(3.3, 0.05, 0.41)], up: Z, b0: 0.1, b1: 0.65, wM: 0.19, tM: 0.12, peak: 0.3, rise: 0.85, seed: 301, lesion: 0.1, wA: 0.1, tA: 0.05 });
  // Extensor de los dedos (más fusiforme)
  muscle({ pts: [Fp(-0.2, 0.06, 0.55), Fp(0.06, 0.05, 0.62), Fp(0.55, -0.01, 0.62), Fp(1.15, -0.1, 0.57), Fp(1.8, -0.12, 0.51), Fp(2.4, -0.12, 0.46), Fp(2.98, -0.11, 0.42), Fp(3.3, -0.1, 0.4)], up: Z, b0: 0.11, b1: 0.68, wM: 0.2, tM: 0.13, peak: 0.4, rise: 0.8, fall: 1.1, seed: 302, tint: PINK_D });
  // Extensor cubital del carpo
  muscle({ pts: [Fp(-0.2, 0.03, 0.55), Fp(0.06, 0.0, 0.6), Fp(0.55, -0.1, 0.55), Fp(1.15, -0.24, 0.43), Fp(1.8, -0.28, 0.34), Fp(2.4, -0.3, 0.27), Fp(2.98, -0.3, 0.22), Fp(3.3, -0.3, 0.2)], up: tilt(-0.6), b0: 0.13, b1: 0.72, wM: 0.18, tM: 0.12, peak: 0.3, seed: 303 });
  // Extensor radial largo del carpo: origen carnoso en el tercio distal de la cresta supracondílea lateral
  muscle({
    pts: [Hs(0.8, -0.02, -0.01), Hs(0.5, 0.06, 0.05), Fp(0.1, 0.47, 0.56), Fp(0.75, 0.43, 0.53), Fp(1.45, 0.38, 0.46), Fp(2.2, 0.34, 0.38), Fp(2.9, 0.32, 0.33), Fp(3.3, 0.31, 0.31)],
    up: (t) => tilt(0.5 * smooth(0.05, 0.3, t)),
    b0: -0.1, b1: 0.58, wM: 0.18, tM: 0.1, peak: 0.34, rise: 0.6, fall: 1.0, seed: 304, fleshy: true, tint: PINK_D,
  });
  // Braquiorradial: origen carnoso en los dos tercios proximales de la cresta; cruza por delante del codo
  muscle({
    pts: [Hs(1.3, 0.0, -0.01), Hs(0.88, 0.1, 0.06), Fp(-0.2, 0.64, 0.42), Fp(0.6, 0.64, 0.38), Fp(1.3, 0.58, 0.32), Fp(2.0, 0.53, 0.27), Fp(2.7, 0.48, 0.22), Fp(3.3, 0.45, 0.2)],
    up: (t) => tilt(0.95 * smooth(0.04, 0.3, t)),
    b0: -0.1, b1: 0.62, wM: 0.21, tM: 0.1, peak: 0.38, rise: 0.6, fall: 0.9, seed: 305, fleshy: true,
  });

  root.add(new THREE.Mesh(deepT.geo(), deepMat));
  root.add(new THREE.Mesh(bellyT.geo(), bellyMat));
  root.add(new THREE.Mesh(striaT.geo(), bellyMat));
  root.add(new THREE.Mesh(tcoreT.geo(), tendonCoreMat));
  root.add(new THREE.Mesh(tendonT.geo(), tendonMat));

  // Brillo cálido de la lesión: gradiente suave propio (núcleo moderado para no velar el tendón)
  const glow = (color, size, opacity) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.75)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.42)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, depthWrite: false, depthTest: false }));
    s.scale.setScalar(size);
    s.renderOrder = 10;
    return s;
  };
  const h1 = glow('#ff9a6b', 1.45, 0.85);
  h1.position.set(LES[0] + 0.03, LES[1], LES[2] + 0.3);
  const h2 = glow('#ff5a25', 0.7, 0.55);
  h2.position.set(LES[0], LES[1], LES[2] + 0.32);
  root.add(h1, h2);

  return { root, cam: [-0.6, 0.95, 7.5], look: [0.9, 0.55, 0.2], zoom: 1.18, shadow: false };
}
