// Epitrocleítis (codo de golfista): codo derecho en vista POSTEROMEDIAL (cara interna, algo desde atrás).
// Húmero distal en "pala" con la epitróclea (epicóndilo medial) como apófisis saliente, tróclea visible,
// cúbito con el olécranon en gancho y su borde posterior subcutáneo a lo largo del antebrazo.
// El nervio cubital (cordón amarillo) baja por detrás de la epitróclea (túnel cubital) y entra al antebrazo bajo el cubital anterior.
// De la cara anterior de la epitróclea nace el tendón común flexor-pronador (corto y grueso) que se abre en abanico
// en los flexores del antebrazo. La lesión (acento cálido, fibras nítidas) está en ese origen, sobre el hueso.
//
// Coordenadas locales (antes de girar la escena 180° en Y): plano sagital = XY, eje de flexión = Z,
// lateral = +Z y MEDIAL = −Z. La escena se gira para que la cara medial mire a la cámara
// (brazo hacia arriba a la derecha, antebrazo hacia la izquierda; extremos desvanecidos en vez de cortes duros).
export default function build(L) {
  const { THREE, rnd, reseed } = L;
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const num = (k, d) => (QS.get(k) !== null && QS.get(k) !== '' ? Number(QS.get(k)) : d);
  const arr = (k, d) => (QS.get(k) ? QS.get(k).split(',').map(Number) : d);
  const DBG = QS.get('dbg') || '';

  // ------------------------------------------------------------------ Vista
  const CAM = arr('cam', [3.2, 1.2, 6.6]);
  const LOOK = arr('look', [-0.55, 0.3, 0]);
  const ZOOM = num('zoom', 1.35);
  const wrap = new THREE.Group();
  wrap.rotation.set(num('rx', -0.12), num('ry', -0.2), num('rz', -0.22));
  const root = new THREE.Group();
  root.rotation.y = Math.PI; // cara medial hacia la cámara
  wrap.add(root);
  wrap.updateMatrixWorld(true);
  const invQ = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const toLocalDir = (v) => V3(v).normalize().applyQuaternion(invQ);
  const VIEW = toLocalDir([CAM[0] - LOOK[0], CAM[1] - LOOK[1], CAM[2] - LOOK[2]]); // hacia la cámara (local)
  const LD = toLocalDir([0.25, 0.9, 0.4]); // luz cenital horneada (local)

  // ------------------------------------------------------------------ Marcos anatómicos
  // Húmero: s → proximal, q → anterior. Antebrazo: s → distal, q → anterior.
  const rad = (d) => (d * Math.PI) / 180;
  const frame = (ang, ccw) => {
    const sx = Math.cos(ang), sy = Math.sin(ang);
    return { sx, sy, qx: ccw ? -sy : sy, qy: ccw ? sx : -sx };
  };
  const FH = frame(rad(num('ah', 114)), false);
  const FF = frame(rad(num('af', -8)), true);
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
  const CUT_H = num('cuth', 1.6); // fin del húmero (dentro del desvanecido)
  const CUT_F = 2.45; // fin del antebrazo (ídem)
  const FADE_H = [num('fh0', 1.0), num('fh1', 1.5)], FADE_F = [1.7, 2.4];
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const fadeW = (x, y) => (1 - sstep(FADE_H[0], FADE_H[1], x * FH.sx + y * FH.sy)) * (1 - sstep(FADE_F[0], FADE_F[1], x * FF.sx + y * FF.sy));
  const dim = (f) => 0.3 + 0.7 * f; // los extremos se apagan al desvanecerse (sin "haz" claro sobre fondo oscuro)

  // Epitróclea (epicóndilo medial): apófisis en lágrima, saliente hacia medial y algo hacia atrás
  const EPI_H = [0.32, -0.08, -0.88];

  // Tróclea (coordenadas del húmero); también talla la escotadura troclear del cúbito (articulación congruente)
  const trM = cylZ(0.0, 0.02, 0.295, -0.54, -0.3, 0.08);
  const trG = cylZ(0.0, 0.02, 0.235, -0.36, -0.06, 0.05);
  const trL = cylZ(0.0, 0.02, 0.25, -0.1, 0.06, 0.05);
  const troch = (x, y, z) => smin(smin(trM(x, y, z), trG(x, y, z), 0.06), trL(x, y, z), 0.06);

  // Húmero distal: pala triangular (cresta supracondílea medial → epitróclea), tróclea y capítulo
  const humerus = (() => {
    const shaft = rcone(0.55, 0.0, -0.04, 3.4, 0.03, 0.0, 0.25, 0.215);
    const flare = ell(0.42, -0.04, -0.12, 0.5, 0.2, 0.72);
    const latRidge = rcone(0.2, -0.08, 0.44, 1.3, -0.04, 0.16, 0.075, 0.045);
    const medRidge = rcone(0.25, -0.05, -0.66, 1.3, 0.0, -0.18, 0.12, 0.06);
    const latEpi = ell(0.24, -0.09, 0.45, 0.15, 0.14, 0.13);
    const medEpi = ell(EPI_H[0] + 0.02, EPI_H[1], EPI_H[2] + 0.06, 0.28, 0.18, 0.24);
    const medTip = rcone(EPI_H[0] + 0.05, EPI_H[1], EPI_H[2] + 0.08, EPI_H[0] - 0.05, EPI_H[1] - 0.04, EPI_H[2] - 0.12, 0.15, 0.12);
    const capit = sph(CAP_H[0], CAP_H[1], CAP_H[2], 0.205);
    const fossa = sph(0.52, -0.33, -0.18, 0.2); // fosa olecraneana
    const coroF = sph(0.42, 0.3, -0.2, 0.15); // fosa coronoidea
    const groove = rcone(0.8, -0.4, -0.64, -0.1, -0.38, -0.66, 0.085, 0.085); // canal del nervio cubital
    return (x, y, z) => {
      let d = smin(shaft(x, y, z), flare(x, y, z), 0.25);
      d = smin(d, latRidge(x, y, z), 0.12);
      d = smin(d, medRidge(x, y, z), 0.14);
      d = smin(d, latEpi(x, y, z), 0.1);
      d = smin(d, medEpi(x, y, z), 0.1);
      d = smin(d, medTip(x, y, z), 0.07);
      d = smin(d, troch(x, y, z), 0.07);
      d = smin(d, capit(x, y, z), 0.07);
      d = smax(d, -fossa(x, y, z), 0.08);
      d = smax(d, -coroF(x, y, z), 0.08);
      d = smax(d, -groove(x, y, z), 0.05);
      return smax(d, x - CUT_H, 0.035);
    };
  })();

  // Cúbito (coordenadas del antebrazo): olécranon en gancho, coronoides, tubérculo sublime y diáfisis
  const ulna = (() => {
    const olec = rcone(-0.5, -0.3, -0.17, 0.35, -0.33, -0.15, 0.17, 0.19);
    const olecB = ell(-0.22, -0.36, -0.18, 0.38, 0.13, 0.2); // cara posterior (subcutánea) ancha
    const beak = rcone(-0.56, -0.3, -0.17, -0.5, -0.05, -0.17, 0.1, 0.07);
    const coro = rcone(0.45, -0.08, -0.17, 0.2, 0.25, -0.2, 0.13, 0.06);
    const sublime = ell(0.36, 0.03, -0.34, 0.12, 0.08, 0.08);
    const shaft = rcone(0.3, -0.29, -0.15, 3.95, -0.3, -0.08, 0.21, 0.11);
    const radNotch = cylX(0.25, 0.55, 0.055, 0.27, 0.24, 0);
    const notch = (x, y, z) => {
      const w = toW(FF, x, y, z), h = toL(FH, w[0], w[1], w[2]);
      return troch(h[0], h[1], h[2]) - 0.022;
    };
    return (x, y, z) => {
      let d = smin(olec(x, y, z), beak(x, y, z), 0.08);
      d = smin(d, olecB(x, y, z), 0.1);
      d = smin(d, shaft(x, y, z), 0.2);
      d = smin(d, coro(x, y, z), 0.1);
      d = smin(d, sublime(x, y, z), 0.08);
      d = smax(d, -(x + 0.66), 0.06); // cara proximal del olécranon (inserción del tríceps)
      d = smax(d, -notch(x, y, z), 0.03);
      d = smax(d, -radNotch(x, y, z), 0.03);
      return smax(d, x - CUT_F, 0.035);
    };
  })();

  // Radio (lado lateral, casi oculto)
  const radius = (() => {
    const head = cylX(0.29, 0.47, 0.055, 0.27, 0.21, 0.045);
    const dish = sph(CAP_F[0], CAP_F[1], CAP_F[2], 0.245);
    const neck = rcone(0.42, 0.055, 0.27, 0.85, 0.035, 0.22, 0.1, 0.095);
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

  // ------------------------------------------------------------------ Origen flexor común y zona lesionada
  const E = H2F(EPI_H[0], EPI_H[1], EPI_H[2]); // epitróclea en coordenadas del antebrazo
  const O = (ds, dq, dz) => Fp(E[0] + ds, E[1] + dq, E[2] + dz);
  const T0 = O(-0.02, 0.04, -0.04), T1 = O(0.2, 0.08, -0.15), T2 = O(0.46, 0.1, -0.15), SPLIT = O(0.64, 0.1, -0.11);
  const LES = O(0.1, 0.08, -0.16); // centro de la lesión (sobre la inserción)

  // Malla ósea con oclusión ambiental, luz horneada, contorno y tinte cálido en la inserción
  function boneMesh(f, fr, bmin, bmax, mat) {
    const { pos, nrm, idx } = surfaceNets(f, bmin, bmax, 0.02);
    const n = pos.length / 3;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Col = new Float32Array(n * 4), Heat = new Float32Array(n);
    const shadeC = [0.36, 0.4, 0.55];
    const hot = [1.0, 0.52, 0.34];
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
      const ao = clamp(1 - 2.2 * occ, 0, 1);
      const lam = 0.5 + 0.5 * (wn[0] * LD.x + wn[1] * LD.y + wn[2] * LD.z);
      let shd = 0;
      for (let k = 0; k < OCC.length; k++) {
        const o = OCC[k], dx = o[0] - w[0], dy = o[1] - w[1], dz = o[2] - w[2];
        if (Math.abs(dx) > o[3] + 0.7 || Math.abs(dy) > o[3] + 0.7) continue;
        const dd = Math.max(len(dx, dy, dz) - o[3], 0);
        shd = Math.max(shd, Math.exp(-Math.pow(dd / 0.17, 2)));
        const along = dx * LD.x + dy * LD.y + dz * LD.z;
        if (along > 0 && along < 0.8) {
          const px = dx - LD.x * along, py = dy - LD.y * along, pz = dz - LD.z * along;
          const perp = Math.max(len(px, py, pz) - o[3] * 0.85, 0);
          shd = Math.max(shd, Math.exp(-Math.pow(perp / (0.035 + 0.08 * along), 2)) * (1 - along / 0.8) * 0.9);
        }
      }
      const lit = ao * (0.45 + 0.55 * lam) * (1 - 0.42 * shd);
      const g = Math.exp(-Math.pow(len(w[0] - LES[0], w[1] - LES[1], w[2] - LES[2]) / 0.22, 2));
      const heat = g * 0.45;
      const fw = fadeW(w[0], w[1]);
      const nv = Math.abs(wn[0] * VIEW.x + wn[1] * VIEW.y + wn[2] * VIEW.z);
      const edge = 1 - 0.24 * Math.pow(1 - nv, 2.2);
      for (let c = 0; c < 3; c++) {
        const base = (shadeC[c] + (1 - shadeC[c]) * lit) * edge;
        Col[v * 4 + c] = (base * (1 - heat) + hot[c] * heat) * dim(fw);
      }
      Col[v * 4 + 3] = fw;
      Heat[v] = g * 0.3;
    }
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

  // ------------------------------------------------------------------ Tubos de radio variable (color RGBA + calor por anillo)
  class Tubes {
    constructor() {
      this.p = [];
      this.n = [];
      this.c = [];
      this.h = [];
      this.i = [];
    }
    add(P, R, up, radial = 6, C = null, edge = 0) {
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
          const fw = fadeW(x, y);
          const ed = edge ? 1 - edge * Math.pow(Math.abs(c), 5) * (s < 0.2 ? 1 : 0.6) : 1;
          this.c.push(col[0] * dim(fw) * ed, col[1] * dim(fw) * ed, col[2] * dim(fw) * ed, fw);
          this.h.push(col[3] * fw);
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
  const OCC = []; // [x, y, z, r]: tubos que sombrean el hueso (nervio, vientres)
  const deepT = new Tubes(), bellyT = new Tubes(), striaT = new Tubes(), tendonT = new Tubes(), tcoreT = new Tubes(), nerveT = new Tubes();

  const col = (h) => new THREE.Color(h);
  const PINK = col('#c95d66'), PINK_D = col('#b8505b'), PINK_L = col('#cf6870'), TWHITE = col('#e9eef8');
  const CORE = col('#ff5a2a'), AMBER = col('#ffae6a'), WHITE = col('#ffffff');
  // Degradado de la lesión a lo largo del tendón común (u = 0 en el hueso): núcleo → ámbar → blanco
  const lesionCol = (u) => {
    const h = 1 - sstep(0.3, 0.6, u);
    const c = h > 0.5 ? AMBER.clone().lerp(CORE, (h - 0.5) * 2) : WHITE.clone().lerp(AMBER, h * 2);
    return [c.r, c.g, c.b, h * 1.35];
  };

  // ------------------------------------------------------------------ Tendón común flexor-pronador (corto, grueso, nacarado)
  const Z = new THREE.Vector3(0, 0, 1);
  const MZ = new THREE.Vector3(0, 0, -1);
  const Q = V3(toW(FF, 0, 1, 0));
  const tilt = (k) => MZ.clone().addScaledVector(Q, k).normalize(); // normal hacia medial, inclinada hacia anterior
  {
    const curve = new THREE.CatmullRomCurve3([T0, T1, T2, SPLIT].map(V3), false, 'centripetal');
    const up = tilt(0.35);
    const wA = 0.14, tA = 0.08;
    const bul = (u) => 1 + 0.18 * Math.sin(Math.PI * clamp(u / 0.5, 0, 1)); // engrosamiento (tendinosis)
    const fr = (u) => {
      const p = curve.getPointAt(u), T = curve.getTangentAt(u);
      const N = up.clone().addScaledVector(T, -up.dot(T)).normalize();
      return { p, N, B: new THREE.Vector3().crossVectors(T, N) };
    };
    // Núcleo macizo
    {
      const P = [], R = [], C = [], n = 40;
      for (let a = 0; a <= n; a++) {
        const u = a / n, f = fr(u), widen = 1 + 0.25 * (1 - sstep(0, 0.2, u)) + 0.12 * sstep(0.7, 1, u);
        P.push(f.p);
        R.push([wA * bul(u) * widen * 0.93, tA * bul(u) * 0.93]);
        C.push(lesionCol(u));
      }
      tcoreT.add(P, R, up, 26, C);
    }
    // Fibras en la superficie (deshilachadas en la zona lesionada)
    reseed(511);
    const nn = 16;
    for (let j = 0; j < nn; j++) {
      const phi = (2 * Math.PI * (j + rnd() * 0.5)) / nn, wob = rnd() * 6, sp = rnd();
      const P = [], R = [], C = [], n = 36, u1 = 1.0 - sp * 0.06;
      for (let a = 0; a <= n; a++) {
        const u = (u1 * a) / n, f = fr(u), ph = phi + 0.05 * Math.sin(u * 11 + wob);
        const widen = 1 + 0.25 * (1 - sstep(0, 0.2, u)) + 0.12 * sstep(0.7, 1, u);
        const p = f.p.clone().addScaledVector(f.B, Math.cos(ph) * wA * bul(u) * widen * 0.97).addScaledVector(f.N, Math.sin(ph) * tA * bul(u) * 0.97);
        const k = 0.022 * Math.max(0, 1 - u / 0.45);
        p.addScaledVector(f.B, Math.sin(j * 1.7 + u * 38 + wob) * k).addScaledVector(f.N, Math.cos(j * 2.3 + u * 31 + wob) * k * 0.8);
        P.push(p);
        const r = 0.015 * Math.sqrt(clamp(Math.min(a, n - a) / 4, 0.08, 1));
        R.push([r, r]);
        C.push(lesionCol(u));
      }
      tendonT.add(P, R, up, 5, C);
    }
  }

  // ------------------------------------------------------------------ Vientres flexores en abanico desde el tendón común
  // pts: curva (empieza dentro del extremo del tendón). w0/t0: semiancho/semiespesor al salir del tendón.
  // wM/tM: máximos. endW: fracción del ancho que conserva al final (dentro del desvanecido). insert: termina en tendón plano.
  function belly({ pts, up, wM, tM, peak = 0.28, w0 = 0.06, t0 = 0.04, endW = 0.55, rise = 1.0, seed, nF = 26, tint = PINK, mtj = 0.1, insert = false, cap = 3 }) {
    reseed(seed);
    const curve = new THREE.CatmullRomCurve3(pts.map(V3), false, 'centripetal');
    const upAt = typeof up === 'function' ? up : () => up;
    const fr = (t) => {
      const p = curve.getPointAt(t), T = curve.getTangentAt(t), U = upAt(t);
      const N = U.clone().addScaledVector(T, -U.dot(T)).normalize();
      return { p, N, B: new THREE.Vector3().crossVectors(T, N), U };
    };
    const S = (t) => (t < peak ? Math.pow(Math.sin((0.5 * Math.PI * t) / peak), rise) : endW + (1 - endW) * Math.pow(Math.cos((0.5 * Math.PI * (t - peak)) / (1 - peak)), 1.3));
    const ins = (t) => (insert ? sstep(0.7, 0.95, t) : 0);
    const bw = (t) => Math.max(w0 + (wM - w0) * S(t) * (1 - ins(t)), insert ? 0.06 : 0) ;
    const bt = (t) => Math.max(t0 + (tM - t0) * S(t) * (1 - ins(t)), insert ? 0.025 : 0);
    const bellyCol = (t) => {
      const m = Math.max(1 - sstep(0.0, mtj, t), insert ? sstep(0.8, 0.95, t) : 0);
      const c = tint.clone().lerp(TWHITE, m);
      return [c.r, c.g, c.b, 0];
    };
    {
      const P = [], R = [], Up = [], C = [], n = 90;
      for (let a = 0; a <= n; a++) {
        const t = a / n, f = fr(t), e = Math.sqrt(clamp((n - a) / cap, 0.05, 1));
        P.push(f.p);
        Up.push(f.U);
        R.push([Math.max(bw(t) * e, 0.004), Math.max(bt(t) * e, 0.004)]);
        C.push(bellyCol(t));
        if (a % 4 === 0) OCC.push([f.p.x, f.p.y, f.p.z, (bw(t) + bt(t)) * 0.5 * e]);
      }
      bellyT.add(P, R, Up, 30, C, 0.42);
    }
    // Estrías del vientre
    for (let j = 0; j < nF; j++) {
      const phi = -0.3 * Math.PI + (1.6 * Math.PI * (j + 0.2 + rnd() * 0.6)) / nF;
      const ua = 0.04 + rnd() * 0.06, ub = (insert ? 0.7 : 0.93) - rnd() * 0.08;
      const P = [], R = [], Up = [], C = [], n = 60, wob = rnd() * 6;
      for (let a = 0; a <= n; a++) {
        const t = ua + ((ub - ua) * a) / n, f = fr(t), ph = phi + 0.06 * Math.sin(t * 9 + wob);
        P.push(f.p.clone().addScaledVector(f.B, Math.cos(ph) * bw(t) * 0.982).addScaledVector(f.N, Math.sin(ph) * bt(t) * 0.982));
        Up.push(f.U);
        const r = 0.0095 * Math.min(1, 0.15 + Math.min(a, n - a) / 8);
        R.push([r, r]);
        const bc = bellyCol(t), ek = 1 - 0.38 * Math.pow(Math.abs(Math.cos(ph)), 5);
        C.push([bc[0] * ek, bc[1] * ek, bc[2] * ek, 0]);
      }
      striaT.add(P, R, Up, 5, C);
    }
    // Fibras tendinosas que continúan el tendón común sobre el inicio del vientre
    for (let j = 0; j < 3; j++) {
      const phi = -0.25 * Math.PI + (1.5 * Math.PI * (j + rnd() * 0.6)) / 3;
      const ub = 0.06 + rnd() * 0.05;
      const P = [], R = [], Up = [], C = [], n = 30, wob = rnd() * 6;
      for (let a = 0; a <= n; a++) {
        const t = (ub * a) / n, f = fr(t), ph = phi + 0.05 * Math.sin(t * 11 + wob);
        P.push(f.p.clone().addScaledVector(f.B, Math.cos(ph) * bw(t) * 0.99).addScaledVector(f.N, Math.sin(ph) * bt(t) * 0.99));
        Up.push(f.U);
        const r = 0.011 * Math.sqrt(clamp((n - a) / 6, 0.05, 1));
        R.push([r, r]);
        C.push([1, 1, 1, 0]);
      }
      tendonT.add(P, R, Up, 5, C);
    }
  }

  // Plano profundo (flexor profundo de los dedos): rellena el abanico, sin huecos entre vientres
  {
    const P = [], R = [], C = [], n = 50;
    for (let a = 0; a <= n; a++) {
      const u = a / n, s = 0.45 + 2.0 * u;
      P.push(V3(Fp(s, 0.12 + 0.06 * Math.sin(Math.PI * u), -0.46 + 0.06 * u)));
      const k = Math.sqrt(clamp(Math.min(a / 1.5, (n - a) * 2) / 5, 0.1, 1));
      R.push([(0.36 - 0.04 * u) * k, (0.22 - 0.04 * u) * k]);
      C.push([1, 1, 1, 0]);
    }
    deepT.add(P, R, tilt(0.2), 28, C);
  }

  const SF = toL(FF, SPLIT[0], SPLIT[1], SPLIT[2]); // fin del tendón común en coordenadas del antebrazo
  const Sf = (ds, dq, dz) => Fp(SF[0] + ds, SF[1] + dq, SF[2] + dz);
  const fan = { peak: 0.55, w0: 0.085, t0: 0.06, rise: 1.3 };
  // Flexor superficial de los dedos (ancho, algo más profundo)
  belly({ ...fan, pts: [Sf(-0.16, -0.02, 0.04), Sf(0.3, -0.06, 0.12), Fp(1.25, 0.1, -0.66), Fp(1.85, 0.08, -0.58), Fp(CUT_F, 0.08, -0.52)], up: tilt(0.05), wM: 0.24, tM: 0.13, endW: 0.75, seed: 404, tint: PINK_D });
  // Cubital anterior (cabeza humeral): el más posterior, desciende hacia el borde del cúbito
  belly({ ...fan, pts: [Sf(-0.18, -0.1, 0.03), Fp(0.55, 0.06, -0.88), Fp(1.15, -0.1, -0.77), Fp(1.75, -0.2, -0.65), Fp(CUT_F, -0.23, -0.56)], up: tilt(-0.1), wM: 0.2, tM: 0.13, endW: 0.75, seed: 405 });
  // Palmar menor (delgado y superficial)
  belly({ ...fan, pts: [Sf(-0.16, 0.0, -0.01), Sf(0.3, 0.06, -0.02), Fp(1.25, 0.32, -0.86), Fp(1.85, 0.33, -0.76), Fp(CUT_F, 0.33, -0.67)], up: tilt(0.2), wM: 0.12, tM: 0.07, w0: 0.06, endW: 0.6, seed: 403, nF: 16, tint: PINK_L });
  // Palmar mayor (flexor radial del carpo)
  belly({ ...fan, pts: [Sf(-0.16, 0.03, 0.02), Sf(0.3, 0.12, 0.02), Fp(1.25, 0.5, -0.76), Fp(1.85, 0.5, -0.66), Fp(CUT_F, 0.48, -0.58)], up: tilt(0.5), wM: 0.19, tM: 0.12, endW: 0.6, seed: 402 });
  // Pronador redondo: cabeza humeral carnosa desde la cresta supracondílea medial; cruza en diagonal por delante hacia el radio
  belly({ ...fan, peak: 0.4, w0: 0.1, t0: 0.05, mtj: 0.03, pts: [Hp(0.82, 0.02, -0.46), Hp(0.5, 0.2, -0.72), Fp(0.35, 0.5, -0.78), Fp(1.0, 0.62, -0.68), Fp(1.5, 0.7, -0.42), Fp(1.9, 0.62, -0.06), Fp(2.15, 0.45, 0.2)], up: (t) => tilt(0.5 + 1.6 * t), wM: 0.19, tM: 0.1, endW: 0.5, seed: 401, tint: PINK, insert: true });

  // ------------------------------------------------------------------ Nervio cubital: cordón redondo con fascículos helicoidales
  const NERVE = [Hp(CUT_H - 0.02, -0.42, -0.36), Hp(1.4, -0.45, -0.46), Hp(0.9, -0.45, -0.58), Hp(0.45, -0.42, -0.66), Hp(0.12, -0.4, -0.66), Fp(0.15, -0.28, -0.55), Fp(0.55, -0.2, -0.47), Fp(1.1, -0.15, -0.44), Fp(1.6, -0.12, -0.44)];
  {
    const curve = new THREE.CatmullRomCurve3(NERVE.map(V3), false, 'centripetal');
    const n = 180, R0 = 0.075;
    const P = [], R = [], C = [];
    const NC = col('#f9b53a');
    for (let a = 0; a <= n; a++) {
      const e = Math.sqrt(clamp(Math.min(a, n - a) / 2, 0.1, 1));
      P.push(curve.getPointAt(a / n));
      R.push([R0 * e, R0 * e]);
      if (a % 3 === 0) OCC.push([P[a].x, P[a].y, P[a].z, R0]);
      C.push([NC.r, NC.g, NC.b, 0]);
    }
    nerveT.add(P, R, Z, 28, C);
    const FC = col('#fcc251');
    for (let j = 0; j < 5; j++) {
      const ph0 = (j / 5) * Math.PI * 2, F = [], FR = [], FCs = [];
      for (let a = 0; a <= n; a++) {
        const t = a / n, p = curve.getPointAt(t), T = curve.getTangentAt(t);
        const N = Z.clone().addScaledVector(T, -Z.dot(T)).normalize();
        const B = new THREE.Vector3().crossVectors(T, N);
        const ph = ph0 + t * 11;
        const e = Math.sqrt(clamp(Math.min(a, n - a) / 3, 0.1, 1));
        F.push(p.clone().addScaledVector(N, Math.cos(ph) * R0 * 0.7 * e).addScaledVector(B, Math.sin(ph) * R0 * 0.7 * e));
        FR.push([0.024 * e, 0.024 * e]);
        FCs.push([FC.r, FC.g, FC.b, 0]);
      }
      nerveT.add(F, FR, Z, 8, FCs);
    }
  }

  // ------------------------------------------------------------------ Materiales
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
  const boneMat = patch(new THREE.MeshPhysicalMaterial({ color: '#eadcc5', roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new THREE.Color('#fff4e2') }), 0.6);
  const tendonMat = patch(L.M.tendon(), 0.9);
  const tendonCoreMat = patch(new THREE.MeshPhysicalMaterial({ color: '#d2def2', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.8, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4 }), 0.9);
  const bellyMat = patch(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color('#ffc0c0') }), 0.9);
  const deepMat = patch(new THREE.MeshPhysicalMaterial({ color: '#a44955', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }));
  const nerveMat = patch(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, emissive: new THREE.Color('#ff9a1f'), emissiveIntensity: 0.1 }));

  // ------------------------------------------------------------------ Escena
  root.add(boneMesh(humerus, FH, [-0.42, -0.62, -1.12], [CUT_H + 0.06, 0.45, 0.68], boneMat));
  root.add(boneMesh(ulna, FF, [-0.74, -0.62, -0.48], [CUT_F + 0.06, 0.46, 0.16], boneMat));
  root.add(boneMesh(radius, FF, [0.18, -0.26, -0.06], [CUT_F + 0.06, 0.36, 0.53], boneMat));
  if (!DBG.includes('nomus')) {
    root.add(new THREE.Mesh(deepT.geo(), deepMat));
    root.add(new THREE.Mesh(bellyT.geo(), bellyMat));
    root.add(new THREE.Mesh(striaT.geo(), bellyMat));
    root.add(new THREE.Mesh(tcoreT.geo(), tendonCoreMat));
    root.add(new THREE.Mesh(tendonT.geo(), tendonMat));
  }
  if (!DBG.includes('nonerve')) root.add(new THREE.Mesh(nerveT.geo(), nerveMat));

  // Brillo cálido de la lesión, pequeño y centrado en la inserción
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
  if (!DBG.includes('noglow')) {
    const h1 = glow('#ff9a6b', 0.6, 0.5);
    h1.position.copy(V3(LES)).addScaledVector(VIEW, 0.15);
    const h2 = glow('#ff6a35', 0.4, 0.45);
    h2.position.copy(V3(T0).lerp(V3(T1), 0.5)).addScaledVector(VIEW, 0.2);
    root.add(h1, h2);
  }

  return { root: wrap, cam: CAM, look: LOOK, zoom: ZOOM, shadow: false };
}
