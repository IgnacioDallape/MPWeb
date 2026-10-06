// Bursopatía — bursitis trocantérea (cadera).
// Cadera vista de frente y algo desde afuera (anterolateral): extremo proximal del fémur (cabeza en el
// acetábulo, cuello, trocánter mayor prominente y trocánter menor), pelvis tenue (acetábulo sólido; ala ilíaca
// y anillo obturador en "rayos X" que se desvanecen), glúteo medio que baja desde el ala ilíaca y se continúa
// en su tendón blanco hasta el trocánter, banda iliotibial translúcida tensa por fuera del trocánter y, entre
// ambos, la bursa trocantérea inflamada: bolsa translúcida, hinchada, cálida, con vasos finos y halo.
export default function build(L) {
  const { THREE, halo, rnd, reseed, mergeGeometries } = L;
  const V3 = THREE.Vector3;

  // ------------------------------------------------------------ cámara (x+ = lateral, y+ = arriba, z+ = anterior)
  const LOOK = [0.5, -0.3, 0];
  const CDIR = new V3(0.46, 0.2, 0.86).normalize();
  const DIST = 15, ZOOM = 1.0, ROLL = 0;
  const CAM = new V3(...LOOK).addScaledVector(CDIR, DIST);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.quaternion.setFromAxisAngle(CDIR, ROLL);
  body.position.copy(new V3(...LOOK).sub(new V3(...LOOK).applyQuaternion(body.quaternion)));
  root.updateMatrixWorld(true);
  const EYE = body.worldToLocal(new V3(...LOOK).addScaledVector(CDIR, DIST * ZOOM));

  // Oscurece suavemente los contornos vistos de canto (como en una ilustración)
  const edgeShade = (geo, amount, width = 0.55) => {
    const P = geo.attributes.position, Nn = geo.attributes.normal, Cc = geo.attributes.color;
    const v = new V3(), nn = new V3();
    for (let i = 0; i < P.count; i++) {
      v.set(EYE.x - P.getX(i), EYE.y - P.getY(i), EYE.z - P.getZ(i)).normalize();
      nn.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i));
      const t = Math.min(1, Math.max(0, nn.dot(v) / width));
      const k = 1 - amount * (1 - t * t * (3 - 2 * t));
      Cc.setXYZ(i, Cc.getX(i) * k, Cc.getY(i) * k, Cc.getZ(i) * k);
    }
    return geo;
  };

  // ------------------------------------------------------------ utilidades SDF
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const nrm = (x, y, z) => {
    const l = Math.sqrt(x * x + y * y + z * z);
    return [x / l, y / l, z / l];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const add = (...vs) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
  const mul = (v, k) => [v[0] * k, v[1] * k, v[2] * k];

  const sphere = (c, r) => (x, y, z) => {
    const dx = x - c[0], dy = y - c[1], dz = z - c[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  };
  const ellipsoid = (c, r, ax = [1, 0, 0], ay = [0, 1, 0], az = [0, 0, 1]) => (x, y, z) => {
    const dx = x - c[0], dy = y - c[1], dz = z - c[2];
    const a = (dx * ax[0] + dy * ax[1] + dz * ax[2]) / r[0];
    const b = (dx * ay[0] + dy * ay[1] + dz * ay[2]) / r[1];
    const g = (dx * az[0] + dy * az[1] + dz * az[2]) / r[2];
    const k0 = Math.sqrt(a * a + b * b + g * g);
    const k1 = Math.sqrt((a / r[0]) ** 2 + (b / r[1]) ** 2 + (g / r[2]) ** 2) || 1e-6;
    return (k0 * (k0 - 1)) / k1;
  };
  const roundCone = (a, b, r1, r2) => {
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const l2 = bax * bax + bay * bay + baz * baz;
    const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    return (x, y, z) => {
      const pax = x - a[0], pay = y - a[1], paz = z - a[2];
      const yy = pax * bax + pay * bay + paz * baz;
      const zz = yy - l2;
      const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    };
  };
  const chain = (pts, rads, k = 0.08) => {
    const parts = [];
    for (let i = 0; i < pts.length - 1; i++) parts.push(roundCone(pts[i], pts[i + 1], rads[i], rads[i + 1]));
    return (x, y, z) => {
      let d = parts[0](x, y, z);
      for (let i = 1; i < parts.length; i++) d = smin(d, parts[i](x, y, z), k);
      return d;
    };
  };
  const poly2 = (Vs) => (px, py) => {
    let d = (px - Vs[0][0]) ** 2 + (py - Vs[0][1]) ** 2;
    let s = 1;
    for (let i = 0, j = Vs.length - 1; i < Vs.length; j = i, i++) {
      const ex = Vs[j][0] - Vs[i][0], ey = Vs[j][1] - Vs[i][1];
      const wx = px - Vs[i][0], wy = py - Vs[i][1];
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
      const bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= Vs[i][1], c2 = py < Vs[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s *= -1;
    }
    return s * Math.sqrt(d);
  };

  // Malla a partir de una SDF (surface nets), normales por gradiente y color/alfa por vértice
  function meshSDF(sdf, mn, mx, h, colorAt) {
    const nx = Math.ceil((mx[0] - mn[0]) / h) + 1, ny = Math.ceil((mx[1] - mn[1]) / h) + 1, nz = Math.ceil((mx[2] - mn[2]) / h) + 1;
    const F = new Float32Array(nx * ny * nz);
    let q = 0;
    for (let k = 0; k < nz; k++) {
      const z = mn[2] + k * h;
      for (let j = 0; j < ny; j++) {
        const y = mn[1] + j * h;
        for (let i = 0; i < nx; i++) F[q++] = sdf(mn[0] + i * h, y, z);
      }
    }
    const sy = nx, sz = nx * ny, cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const cell = new Int32Array(cx * cy * cz).fill(-1);
    const P = [];
    const off = [0, 1, sy, 1 + sy, sz, 1 + sz, sy + sz, 1 + sy + sz];
    const cor = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const v = new Float32Array(8);
    for (let k = 0; k < cz; k++)
      for (let j = 0; j < cy; j++)
        for (let i = 0; i < cx; i++) {
          const base = i + j * sy + k * sz;
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            v[c] = F[base + off[c]];
            if (v[c] < 0) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;
          let ax = 0, ay = 0, az = 0, n = 0;
          for (let e = 0; e < 12; e++) {
            const a = E[e][0], b = E[e][1];
            if (v[a] < 0 !== v[b] < 0) {
              const t = v[a] / (v[a] - v[b]);
              ax += cor[a][0] + t * (cor[b][0] - cor[a][0]);
              ay += cor[a][1] + t * (cor[b][1] - cor[a][1]);
              az += cor[a][2] + t * (cor[b][2] - cor[a][2]);
              n++;
            }
          }
          cell[i + j * cx + k * cx * cy] = P.length / 3;
          P.push(mn[0] + (i + ax / n) * h, mn[1] + (j + ay / n) * h, mn[2] + (k + az / n) * h);
        }
    const C = (i, j, k) => cell[i + j * cx + k * cx * cy];
    const quads = [];
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const a = F[i + j * sy + k * sz] < 0;
          if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && a !== F[i + 1 + j * sy + k * sz] < 0) quads.push(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k));
          if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && a !== F[i + (j + 1) * sy + k * sz] < 0) quads.push(C(i - 1, j, k - 1), C(i, j, k - 1), C(i, j, k), C(i - 1, j, k));
          if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && a !== F[i + j * sy + (k + 1) * sz] < 0) quads.push(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k));
        }
    const pos = new Float32Array(P), nor = new Float32Array(P.length), col = new Float32Array((P.length / 3) * 4);
    const e = h * 0.5;
    const grad = (x, y, z) => nrm(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e));
    const c = new THREE.Color();
    for (let p = 0, q4 = 0; p < pos.length; p += 3, q4 += 4) {
      let x = pos[p], y = pos[p + 1], z = pos[p + 2];
      for (let it = 0; it < 2; it++) {
        const d = clamp(sdf(x, y, z), -h, h);
        const g = grad(x, y, z);
        x -= g[0] * d;
        y -= g[1] * d;
        z -= g[2] * d;
      }
      const g = grad(x, y, z);
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      nor[p] = g[0]; nor[p + 1] = g[1]; nor[p + 2] = g[2];
      const alpha = colorAt(x, y, z, g, c);
      col[q4] = c.r; col[q4 + 1] = c.g; col[q4 + 2] = c.b; col[q4 + 3] = alpha;
    }
    const I = [];
    for (let i = 0; i < quads.length; i += 4) {
      const a = quads[i], b = quads[i + 1], cc = quads[i + 2], d = quads[i + 3];
      const ux = pos[cc * 3] - pos[a * 3], uy = pos[cc * 3 + 1] - pos[a * 3 + 1], uz = pos[cc * 3 + 2] - pos[a * 3 + 2];
      const wx = pos[d * 3] - pos[b * 3], wy = pos[d * 3 + 1] - pos[b * 3 + 1], wz = pos[d * 3 + 2] - pos[b * 3 + 2];
      const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
      const gx = nor[a * 3] + nor[cc * 3], gy = nor[a * 3 + 1] + nor[cc * 3 + 1], gz = nor[a * 3 + 2] + nor[cc * 3 + 2];
      if (fx * gx + fy * gy + fz * gz >= 0) I.push(a, b, cc, a, cc, d);
      else I.push(a, cc, b, a, d, cc);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(I), 1));
    return geo;
  }

  // ------------------------------------------------------------ fémur proximal (radio de la cabeza = 0.85)
  const R = 0.85;
  const H = [0, 0, 0];
  const head = sphere(H, R);
  const dN = nrm(0.78, -0.58, -0.22); // eje del cuello (cabeza → trocánter): ángulo cervicodiafisario ≈ 125°, anteversión
  const eN = nrm(...cross(dN, [0, 1, 0]));
  const neckC = chain([mul(dN, 0.3), mul(dN, 1.0), mul(dN, 1.75)], [0.54, 0.4, 0.6], 0.2);
  const NK = 1.22; // cuello ovalado (más fino en sentido anteroposterior)
  const neck = (x, y, z) => {
    const s = (x * eN[0] + y * eN[1] + z * eN[2]) * (NK - 1);
    return neckC(x + eN[0] * s, y + eN[1] * s, z + eN[2] * s) / NK;
  };
  const GB = [2.0, -0.85, -0.32]; // centro del trocánter mayor
  const gtBody = ellipsoid(GB, [0.5, 0.82, 0.68]);
  const gtApex = ellipsoid([1.82, -0.12, -0.55], [0.42, 0.42, 0.42]);
  const fossa = sphere([1.38, -0.42, -0.84], 0.3);
  const crestIT = roundCone([1.95, -0.25, -0.88], [1.0, -1.9, -0.78], 0.2, 0.18);
  const lt = ellipsoid([0.82, -2.0, -0.62], [0.34, 0.38, 0.3]);
  const meta = ellipsoid([1.5, -1.3, -0.32], [0.7, 0.95, 0.62]);
  const shaft = roundCone([1.5, -1.4, -0.3], [1.22, -5.2, -0.15], 0.64, 0.52);
  const femur = (x, y, z) => {
    let d = smin(head(x, y, z), neck(x, y, z), 0.12);
    d = smin(d, meta(x, y, z), 0.3);
    d = smin(d, gtBody(x, y, z), 0.22);
    d = smin(d, gtApex(x, y, z), 0.2);
    d = smin(d, crestIT(x, y, z), 0.15);
    d = smin(d, lt(x, y, z), 0.2);
    d = smin(d, shaft(x, y, z), 0.35);
    return smax(d, -fossa(x, y, z), 0.12);
  };
  // Punto sobre la superficie del fémur desde un centro interior c en la dirección d, separado `off`
  const onFem = (c, d, off) => {
    const u = nrm(...d);
    let lo = 0.0, hi = 2.5;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (femur(c[0] + u[0] * mid, c[1] + u[1] * mid, c[2] + u[2] * mid) < 0) lo = mid;
      else hi = mid;
    }
    return add(c, mul(u, lo + off));
  };

  // ------------------------------------------------------------ pelvis (ala ilíaca, acetábulo, columnas)
  const uW = nrm(0.77, 0, 0.64); // de posterior-medial a anterior-lateral (EIPS → EIAS)
  const v0 = [0.35, 0.93, 0];
  const vW = nrm(...add(v0, mul(uW, -dot(v0, uW))));
  let nW = nrm(...cross(uW, vW));
  if (nW[0] < 0) nW = mul(nW, -1); // cara glútea (lateral)
  const Ow = [0.15, 1.0, -0.35];
  const curv = (s) => -0.05 * s * s;
  const W = (s, t, o = 0) => add(Ow, mul(uW, s), mul(vW, t), mul(nW, o + curv(s)));
  const wingPoly = poly2([[1.55, 1.0], [1.25, 0.42], [1.12, 0.02], [0.85, -0.45], [-0.9, -0.62], [-1.45, -0.45], [-1.8, 0.1], [-2.3, 0.62], [-2.75, 0.98], [-2.65, 1.6], [-1.7, 2.42], [-0.35, 2.82], [0.75, 2.68], [1.35, 2.12]]);
  const wing = (x, y, z) => {
    const px = x - Ow[0], py = y - Ow[1], pz = z - Ow[2];
    const s = px * uW[0] + py * uW[1] + pz * uW[2];
    const t = px * vW[0] + py * vW[1] + pz * vW[2];
    const o = px * nW[0] + py * nW[1] + pz * nW[2] - curv(s);
    const th = 0.1 + 0.22 * sstep(0.8, -0.5, t);
    const RR = 0.07;
    const d2 = wingPoly(s, t) + RR;
    const ez = Math.abs(o) - (th - RR);
    return Math.min(Math.max(d2, ez), 0) + Math.sqrt(Math.max(d2, 0) ** 2 + Math.max(ez, 0) ** 2) - RR;
  };
  const crestIl = chain([W(-2.72, 0.98), W(-2.62, 1.6), W(-1.7, 2.4), W(-0.35, 2.8), W(0.75, 2.66), W(1.35, 2.1), W(1.52, 1.0)], [0.15, 0.15, 0.13, 0.12, 0.17, 0.13, 0.13], 0.1);
  const dA = nrm(0.72, -0.6, 0.35); // apertura del acetábulo
  const cupO = sphere(H, R + 0.42), socket = sphere(H, R + 0.05);
  const cup = (x, y, z) => smax(cupO(x, y, z), x * dA[0] + y * dA[1] + z * dA[2] - 0.05, 0.14);
  const postCol = chain([[-0.35, -0.5, -0.95], [-0.45, -1.4, -1.05], [-0.4, -2.05, -0.95], [-0.95, -2.45, -0.35], [-1.6, -2.4, 0.3], [-2.35, -1.5, 1.2]], [0.42, 0.36, 0.4, 0.24, 0.2, 0.26], 0.15);
  const pubic = chain([[-0.55, 0.2, 0.75], [-1.4, -0.1, 1.25], [-2.3, -0.55, 1.42], [-2.4, -1.4, 1.3]], [0.36, 0.28, 0.3, 0.3], 0.12);
  const aiis = ellipsoid(W(1.0, 0.0, 0.02), [0.3, 0.2, 0.12], uW, vW, nW);
  const pelvis = (x, y, z) => {
    let d = smin(wing(x, y, z), crestIl(x, y, z), 0.1);
    d = smin(d, cup(x, y, z), 0.3);
    d = smin(d, postCol(x, y, z), 0.25);
    d = smin(d, pubic(x, y, z), 0.2);
    d = smin(d, aiis(x, y, z), 0.25);
    return smax(d, -socket(x, y, z), 0.05);
  };

  // ------------------------------------------------------------ bursa trocantérea: bolsa de líquido sobre la cara lateral del trocánter

  const dB = nrm(1, -0.03, 0.15);
  const SB = onFem(GB, dB, 0);
  const tB = nrm(...cross(dB, [0, 1, 0]));
  const yB = nrm(...cross(tB, dB));
  const BU = 0.68, BV = 0.98;
  // dos lóbulos (el inferior más hinchado) hundidos en el hueso: la parte visible es una cúpula que se amolda al trocánter
  const lobeA = ellipsoid(add(SB, mul(dB, -0.24), mul(yB, 0.3)), [0.6, 0.66, 0.66], tB, yB, dB);
  const lobeB = ellipsoid(add(SB, mul(dB, -0.24), mul(yB, -0.32)), [0.68, 0.74, 0.74], tB, yB, dB);
  const bursaK = (shrink, gap) => (x, y, z) => {
    const lump = 0.02 * Math.sin(x * 8 + y * 6.5) * Math.sin(z * 7.5 - y * 4.5);
    const d = smin(lobeA(x, y, z), lobeB(x, y, z), 0.35) + shrink + lump;
    return smax(d, gap - femur(x, y, z), 0.05);
  };
  const bursa = bursaK(0, -0.05);
  const BC = add(SB, mul(dB, 0.25), mul(yB, -0.05));

  // ------------------------------------------------------------ glúteo medio: abanico sobre el ala ilíaca → tendón → trocánter
  const CG = [1.95, -0.65, -0.45];
  const gmPath = new THREE.CatmullRomCurve3(
    [W(-0.5, 2.25, 0.22), W(-0.3, 1.5, 0.42), W(0.05, 0.75, 0.6), onFem(GB, [0.0, 1, 0.12], 0.24), onFem(GB, [0.3, 0.92, 0.3], 0.12), onFem(GB, [0.55, 0.75, 0.42], -0.25)].map((p) => new V3(...p)),
    false,
    'centripetal'
  );
  const T_TEN = 0.6;
  const tendonness = (t) => sstep(T_TEN - 0.08, T_TEN + 0.06, t);
  const capW = (t) => Math.sqrt(1 - (1 - Math.min(1, t / 0.14)) ** 2);
  const capH = (t) => Math.sqrt(1 - (1 - Math.min(1, t / 0.06)) ** 2);
  const halfW = (t) => {
    const tn = tendonness(t);
    return ((1 - tn) * 1.35 * (1 - 0.74 * sstep(0.12, T_TEN + 0.02, t)) + tn * (0.22 + 0.08 * sstep(0.85, 1, t))) * (0.2 + 0.8 * capW(t));
  };
  const halfH = (t) => {
    const tn = tendonness(t);
    return ((1 - tn) * (0.15 + 0.24 * Math.sin(Math.PI * clamp(t / T_TEN, 0, 1) * 0.85 + 0.25)) + tn * 0.13 * (1 - 0.3 * sstep(0.93, 1, t))) * capH(t);
  };
  const NT = 400;
  const FR = [];
  for (let s = 0; s <= NT; s++) {
    const t = s / NT;
    const p = gmPath.getPointAt(t);
    const T = gmPath.getTangentAt(t);
    const radial = new V3(p.x - CG[0], p.y - CG[1], p.z - CG[2]).normalize();
    const N = new V3(...nW).lerp(radial, sstep(0.45, 0.72, t)).normalize();
    N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    FR.push({ p, N, B: new V3().crossVectors(T, N) });
  }
  const frameAt = (t, out) => {
    const f = clamp(t, 0, 1) * NT;
    const i0 = Math.min(Math.floor(f), NT - 1);
    const a = f - i0;
    out.p.lerpVectors(FR[i0].p, FR[i0 + 1].p, a);
    out.N.lerpVectors(FR[i0].N, FR[i0 + 1].N, a).normalize();
    out.B.lerpVectors(FR[i0].B, FR[i0 + 1].B, a).normalize();
    return out;
  };
  // Aproximación del músculo/tendón con esferas (oclusión y apoyo de la banda iliotibial)
  const gmPts = [];
  for (let i = 0; i <= 70; i++) {
    const t = i / 70;
    const f = frameAt(t, { p: new V3(), N: new V3(), B: new V3() });
    gmPts.push([f.p.x, f.p.y, f.p.z, Math.max(0.06, halfH(t) * 0.8 + halfW(t) * 0.25), t]);
  }
  const gmSDF = (x, y, z, tMin = 0) => {
    let d = 1e9;
    for (const c of gmPts) {
      if (c[4] < tMin) continue;
      const dx = x - c[0], dy = y - c[1], dz = z - c[2];
      d = Math.min(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - c[3]);
    }
    return d;
  };

  // ------------------------------------------------------------ mallas óseas
  const sceneSDF = (x, y, z) => Math.min(femur(x, y, z), pelvis(x, y, z), bursa(x, y, z), gmSDF(x, y, z));
  const boneBase = new THREE.Color('#e4d5bd');
  const cartColor = new THREE.Color('#d9e0ea');
  const fadeTint = new THREE.Color('#b9c6db');
  const warmC = new THREE.Color('#f3b08f');
  const boneAO = (fade, tint, depth, warm) => (x, y, z, g, c) => {
    let occ = 0, sca = 1;
    for (let i = 1; i <= 5; i++) {
      const hh = 0.03 + 0.09 * i;
      occ += (hh - sceneSDF(x + g[0] * hh, y + g[1] * hh, z + g[2] * hh)) * sca;
      sca *= 0.72;
    }
    const ao = clamp(1 - 1.1 * occ, 0, 1);
    c.copy(boneBase);
    if (tint) c.lerp(cartColor, 0.55 * tint(x, y, z));
    if (warm) c.lerp(warmC, 0.55 * Math.exp(-((x - BC[0]) ** 2 + (y - BC[1]) ** 2 * 0.6 + (z - BC[2]) ** 2) / 0.45));
    c.multiplyScalar((0.6 + 0.4 * ao) * (0.86 + 0.14 * sstep(-2.5, 1.5, y)));
    const al = fade(x, y, z);
    c.lerp(fadeTint, Math.min(1, (1 - al) * 0.75 + (depth ? depth(x, y, z) : 0)));
    return al;
  };
  const cartilage = (x, y, z) => sstep(0.06, 0.0, Math.abs(head(x, y, z))) * sstep(0.62, 0.3, (x * dN[0] + y * dN[1] + z * dN[2]) / R);
  const boneMat = () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, transparent: true, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.28, sheen: 0.3, sheenColor: new THREE.Color('#fff4e6') });
  // Hueso "fantasma": donde el alfa del vértice es bajo, borde fresnel azulado (aspecto de rayos X)
  const ghostMat = () => {
    const m = boneMat();
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float ghost = 1.0 - smoothstep(0.3, 0.85, vColor.a);
        float frz = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.85 + vec3(0.5, 0.64, 0.95) * frz * 0.7, ghost);
        gl_FragColor.a = min(1.0, gl_FragColor.a * (1.0 + 2.2 * frz * ghost));`
      );
    };
    return m;
  };
  const PC = [0.2, 0.35, -0.35];
  const pelFade = (x, y, z) => (0.13 + 0.85 * (1 - sstep(1.3, 1.75, Math.hypot(x - 0.05, y - 0.1, z + 0.1))) - 0.06 * sstep(2.0, 3.0, Math.hypot(x, y, z))) * sstep(2.45, 1.7, y) * sstep(-2.1, -1.0, z);
  const pelMesh = new THREE.Mesh(edgeShade(meshSDF(pelvis, [-3.0, -2.95, -2.3], [2.0, 2.6, 2.0], 0.045, boneAO(pelFade, null, (x, y, z) => 0.2 * sstep(1.2, 3, Math.hypot(x - PC[0], y - PC[1], z - PC[2])))), 0.3), ghostMat());
  const femFade = (x, y) => sstep(-2.55, -1.8, y);
  const femMesh = new THREE.Mesh(edgeShade(meshSDF(femur, [-0.95, -2.7, -1.25], [2.75, 1.0, 0.95], 0.029, boneAO(femFade, cartilage, null, true)), 0.3), boneMat());
  pelMesh.renderOrder = 4;
  femMesh.renderOrder = 1;
  body.add(pelMesh, femMesh);

  // ------------------------------------------------------------ glúteo medio (superficie continua con estrías que convergen al tendón)
  const buf = { pos: [], col: [], idx: [], alpha: true };
  const toGeo = (B) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, B.alpha ? 4 : 3));
    g.setIndex(B.idx);
    g.computeVertexNormals();
    return g;
  };
  const fr = { p: new V3(), N: new V3(), B: new V3() };
  const NR = 40;
  const ridgeAt = (a, t) => 0.5 - 0.5 * Math.cos(NR * a + 0.5 * Math.sin(a * 3 + t * 5));
  const surf = (t, a, f) => {
    const w = halfW(t), h = halfH(t);
    const tn = tendonness(t);
    const amp = 0.05 * (1 - tn) + 0.006 * tn;
    const rr = 1 - amp * ridgeAt(a, t);
    const cu = Math.cos(a) * rr * w, su = Math.sin(a) * rr * h;
    const p = [f.p.x + f.B.x * cu + f.N.x * su, f.p.y + f.B.y * cu + f.N.y * su, f.p.z + f.B.z * cu + f.N.z * su];
    // el vientre se curva siguiendo el ala ilíaca
    const wb = 1 - sstep(0.3, 0.55, t);
    if (wb > 0) {
      const sc = (f.p.x - Ow[0]) * uW[0] + (f.p.y - Ow[1]) * uW[1] + (f.p.z - Ow[2]) * uW[2];
      const sp = (p[0] - Ow[0]) * uW[0] + (p[1] - Ow[1]) * uW[1] + (p[2] - Ow[2]) * uW[2];
      const k = (curv(sp) - curv(sc)) * wb;
      p[0] += nW[0] * k; p[1] += nW[1] * k; p[2] += nW[2] * k;
    }
    return p;
  };
  const sweepGrid = (B, segs, radial, tA, tB, pointAt, colorOf) => {
    const base = B.pos.length / 3;
    for (let k = 0; k <= segs; k++) {
      const u = (1 - Math.cos((Math.PI * k) / segs)) / 2;
      const t = tA + (tB - tA) * u;
      frameAt(t, fr);
      for (let r = 0; r < radial; r++) {
        const a = (r / radial) * Math.PI * 2;
        B.pos.push(...pointAt(t, a));
        B.col.push(...colorOf(t, a));
      }
    }
    for (let k = 0; k < segs; k++)
      for (let r = 0; r < radial; r++) {
        const a = base + k * radial + r, b = base + k * radial + ((r + 1) % radial), cc = a + radial, d = b + radial;
        B.idx.push(a, cc, b, b, cc, d);
      }
  };
  {
    const cMuscle = new THREE.Color('#bb4b57');
    const cMuscleHi = new THREE.Color('#d8777c');
    const cTendon = new THREE.Color('#eef3fb');
    const c = new THREE.Color();
    sweepGrid(buf, 220, 132, 0, 1, (t, a) => surf(t, a, fr), (t, a) => {
      const ridge = ridgeAt(a, t), tn = tendonness(t);
      c.copy(cMuscle).lerp(cMuscleHi, 0.5 + 0.5 * Math.sin(a * 13.7 + 1.3 * Math.sin(a * 5))).lerp(cTendon, tn);
      c.multiplyScalar(1 - (0.2 * (1 - tn) + 0.035 * tn) * ridge);
      frameAt(t, fr);
      const yy = surf(t, a, fr)[1];
      return [c.r, c.g, c.b, sstep(2.08, 1.4, yy)];
    });
  }
  const fiberMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, transparent: true, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.35, sheenColor: new THREE.Color('#dfe6ff'), sheenRoughness: 0.45 });
  const gmMesh = new THREE.Mesh(edgeShade(toGeo(buf), 0.22, 0.5), fiberMat);
  gmMesh.renderOrder = 2;
  body.add(gmMesh);

  // ------------------------------------------------------------ bursa inflamada
  {
    const mn = add(SB, [-0.6, -1.1, -0.85]), mx = add(SB, [0.65, 1.0, 0.85]);
    const cThin = new THREE.Color('#ffc6a6'), cThick = new THREE.Color('#ff7444');
    const geo = meshSDF(bursa, mn, mx, 0.025, (x, y, z, g, c) => {
      c.copy(cThin).lerp(cThick, sstep(0.04, 0.4, femur(x, y, z)));
      return 1;
    });
    const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, emissive: new THREE.Color('#ff4f1c'), emissiveIntensity: 0.28, transparent: true, opacity: 0.55, depthWrite: false });
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float frz = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
        gl_FragColor.rgb += vec3(1.0, 0.8, 0.66) * frz * 0.3;
        gl_FragColor.a = min(1.0, gl_FragColor.a * (0.8 + 1.0 * frz));`
      );
    };
    const shell = new THREE.Mesh(geo, mat);
    shell.renderOrder = 5;
    // líquido inflamatorio: volumen interior cálido que se ve a través de la pared
    const coreGeo = meshSDF(bursaK(0.08, -0.05), mn, mx, 0.03, (x, y, z, g, c) => {
      c.set('#ec4520').lerp(new THREE.Color('#ff8a50'), sstep(0.32, 0.04, femur(x, y, z)));
      return 1;
    });
    const coreMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, emissive: new THREE.Color('#ff4a18'), emissiveIntensity: 0.62 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    body.add(core, shell);

    // vasos finos sobre la pared (signo de inflamación)
    const surfAt = (u, v) => {
      const base = add(SB, mul(tB, u * BU), mul(yB, v * BV - 0.02));
      let lo = 0, hi = 0.9;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const q = add(base, mul(dB, mid));
        if (bursa(q[0], q[1], q[2]) < 0) lo = mid;
        else hi = mid;
      }
      return new V3(...add(base, mul(dB, lo + 0.008)));
    };
    reseed(29);
    const vGeos = [];
    const vessel = (u, v, ang, len, r, depth) => {
      const pts = [];
      const n = 14;
      for (let k = 0; k <= n; k++) {
        if (u * u + v * v > 0.8) break;
        pts.push(surfAt(u, v));
        if (depth > 0 && k === Math.floor(n * 0.45)) vessel(u, v, ang + (rnd() > 0.5 ? 0.8 : -0.8), len * 0.55, r * 0.75, depth - 1);
        ang += (rnd() - 0.5) * 0.8;
        u += (Math.cos(ang) * len) / n / BU;
        v += (Math.sin(ang) * len) / n / BV;
      }
      if (pts.length > 3) vGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 4, r, 6, false));
    };
    for (let i = 0; i < 7; i++) {
      const th = (i / 7) * Math.PI * 2 + rnd() * 0.5;
      vessel(0.86 * Math.cos(th), 0.86 * Math.sin(th), th + Math.PI + (rnd() - 0.5) * 0.7, 0.55 + rnd() * 0.25, 0.017, 1);
    }
    const vMat = new THREE.MeshPhysicalMaterial({ color: '#c8322a', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color('#ff2a10'), emissiveIntensity: 0.2 });
    const vMesh = new THREE.Mesh(mergeGeometries(vGeos), vMat);
    body.add(vMesh);
  }

  // ------------------------------------------------------------ banda iliotibial (translúcida, tensa sobre el trocánter y la bursa)
  {
    const under = (x, y, z) => Math.min(femur(x, y, z), bursa(x, y, z), gmSDF(x, y, z, 0.55));
    const Y0 = -2.6, Y1 = 1.55, NY = 110, NZ = 48, GAP = 0.05, TH = 0.06;
    const zc = (y) => -0.6 - 0.08 * sstep(-1, 1.5, y);
    const bw = (y) => 0.62 + 0.3 * sstep(-0.3, 1.6, y) - 0.06 * sstep(-1.6, -3.1, y);
    const X = [], Xmin = [];
    for (let i = 0; i <= NY; i++) {
      const y = Y0 + ((Y1 - Y0) * i) / NY;
      X.push([]);
      Xmin.push([]);
      for (let j = 0; j <= NZ; j++) {
        const z = zc(y) + (2 * j / NZ - 1) * bw(y);
        // marcha desde afuera hasta tocar lo que hay debajo
        let x = 4.2;
        for (let it = 0; it < 120 && x > 1.0; it++) {
          const d = under(x, y, z) - GAP;
          if (d < 0.002) break;
          x -= Math.max(d * 0.9, 0.004);
        }
        const xs = x > 1.0 ? x : -1e9;
        Xmin[i].push(xs);
        X[i].push(Math.max(2.62 + 0.025 * (y + 1) - 0.32 * (z - zc(y)) ** 2, xs));
      }
    }
    // tensar: suavizar manteniendo la banda por fuera de lo que cubre
    for (let pass = 0; pass < 40; pass++) {
      for (let i = 1; i < NY; i++)
        for (let j = 0; j <= NZ; j++) {
          const jl = Math.max(0, j - 1), jr = Math.min(NZ, j + 1);
          const avg = (X[i - 1][j] + X[i + 1][j]) * 0.35 + (X[i][jl] + X[i][jr]) * 0.15;
          X[i][j] = Math.max(avg, Xmin[i][j]);
        }
    }
    const pos = [], col = [], idx = [];
    const cBand = new THREE.Color('#d8e4f8');
    const cWarm = new THREE.Color('#ffd0b8');
    const c = new THREE.Color();
    const vid = (layer, i, j) => layer * (NY + 1) * (NZ + 1) + i * (NZ + 1) + j;
    for (let layer = 0; layer < 2; layer++)
      for (let i = 0; i <= NY; i++) {
        const y = Y0 + ((Y1 - Y0) * i) / NY;
        for (let j = 0; j <= NZ; j++) {
          const s = 2 * j / NZ - 1;
          const z = zc(y) + s * bw(y);
          const edge = Math.sqrt(Math.max(0, 1 - s ** 8));
          const x = X[i][j] + (layer ? TH * edge : 0);
          pos.push(x, y, z);
          const streak = 0.5 + 0.5 * Math.cos(s * 54 + 0.6 * Math.sin(y * 2.3 + s * 3));
          c.copy(cBand).multiplyScalar(1 - 0.09 * streak);
          const db = Math.hypot(y - BC[1], (z - BC[2]) * 1.2);
          const a = (0.6 + 0.3 * Math.abs(s) ** 6) * (1 - 0.55 * sstep(0.95, 0.3, db) * (1 - Math.abs(s) ** 6)) * sstep(Y0, Y0 + 0.9, y) * sstep(Y1, Y1 - 1.0, y);
          c.lerp(cWarm, 0.35 * sstep(1.0, 0.25, db));
          col.push(c.r, c.g, c.b, a);
        }
      }
    for (let i = 0; i < NY; i++)
      for (let j = 0; j < NZ; j++) {
        const a = vid(1, i, j), b = vid(1, i, j + 1), cc = vid(1, i + 1, j), d = vid(1, i + 1, j + 1);
        idx.push(a, b, cc, b, d, cc);
        const a0 = vid(0, i, j), b0 = vid(0, i, j + 1), c0 = vid(0, i + 1, j), d0 = vid(0, i + 1, j + 1);
        idx.push(a0, c0, b0, b0, c0, d0);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, transparent: true, depthWrite: false, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.8, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4, side: THREE.DoubleSide });
    const band = new THREE.Mesh(geo, mat);
    band.renderOrder = 6;
    body.add(band);
  }

  // ------------------------------------------------------------ brillo cálido de la inflamación
  // sobre el rayo cámara → bursa, por delante de todo (así queda centrado en la bursa)
  const gc = new V3(...add(BC, mul(tB, 0.06)));
  const glowP = gc.clone().add(EYE.clone().sub(gc).normalize().multiplyScalar(2.2)).toArray();
  const h1 = halo('#ff8a5a', 2.5, 0.85);
  h1.position.set(...glowP);
  const h2 = halo('#ffb48a', 0.9, 0.5);
  h2.position.set(...glowP);
  h1.renderOrder = h2.renderOrder = 8;
  body.add(h1, h2);

  return { root, cam: CAM.toArray(), look: LOOK, zoom: ZOOM, shadow: false };
}
