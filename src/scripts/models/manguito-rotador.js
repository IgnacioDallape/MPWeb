// Tendinopatía del manguito rotador (supraespinoso).
// Hombro derecho en vista anterolateral: cabeza humeral con tuberosidades e inicio de la diáfisis,
// escápula con glena, coracoides, espina y acromion (techo), músculo supraespinoso que se continúa
// en su tendón bajo el acromion hasta el troquíter, con la zona lesionada cerca de la inserción.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed } = L;
  const V3 = THREE.Vector3;
  const root = new THREE.Group();
  // Cámara (se usa también para oscurecer suavemente los contornos, como en una ilustración)
  const LOOK = [0.14, 0.08, -0.58], CAM = [3.42, 6.64, 8.67], ZOOM = 0.72;
  const EYE = new V3(...CAM).sub(new V3(...LOOK)).multiplyScalar(ZOOM).add(new V3(...LOOK));
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
  // Elipsoide con ejes locales (ax, ay, az unitarios) — aproximación de iq
  const ellipsoid = (c, r, ax = [1, 0, 0], ay = [0, 1, 0], az = [0, 0, 1]) => (x, y, z) => {
    const dx = x - c[0], dy = y - c[1], dz = z - c[2];
    const a = (dx * ax[0] + dy * ax[1] + dz * ax[2]) / r[0];
    const b = (dx * ay[0] + dy * ay[1] + dz * ay[2]) / r[1];
    const g = (dx * az[0] + dy * az[1] + dz * az[2]) / r[2];
    const k0 = Math.sqrt(a * a + b * b + g * g);
    const k1 = Math.sqrt((a / r[0]) ** 2 + (b / r[1]) ** 2 + (g / r[2]) ** 2) || 1e-6;
    return (k0 * (k0 - 1)) / k1;
  };
  // Cono redondeado entre a y b (radios r1, r2) — iq
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
  // Cadena de conos redondeados unidos suavemente
  const chain = (pts, rads, k = 0.08) => {
    const parts = [];
    for (let i = 0; i < pts.length - 1; i++) parts.push(roundCone(pts[i], pts[i + 1], rads[i], rads[i + 1]));
    return (x, y, z) => {
      let d = parts[0](x, y, z);
      for (let i = 1; i < parts.length; i++) d = smin(d, parts[i](x, y, z), k);
      return d;
    };
  };
  // Polígono 2D con signo — iq
  const poly2 = (V) => (px, py) => {
    let d = (px - V[0][0]) ** 2 + (py - V[0][1]) ** 2;
    let s = 1;
    for (let i = 0, j = V.length - 1; i < V.length; j = i, i++) {
      const ex = V[j][0] - V[i][0], ey = V[j][1] - V[i][1];
      const wx = px - V[i][0], wy = py - V[i][1];
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1);
      const bx = wx - ex * t, by = wy - ey * t;
      d = Math.min(d, bx * bx + by * by);
      const c1 = py >= V[i][1], c2 = py < V[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s *= -1;
    }
    return s * Math.sqrt(d);
  };

  // Malla a partir de un SDF (surface nets) con normales por gradiente
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
    // Proyección al iso-cero y normales
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
      // orientación según la normal del gradiente
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

  // ------------------------------------------------------------ anatomía (unidades: radio de la cabeza ≈ 0.95)
  const Hc = [0.9, 0, 0];
  const R = 0.95;

  // Húmero proximal: cabeza, troquíter (tuberosidad mayor), troquín, metáfisis e inicio de la diáfisis
  // La superficie articular (casquete esférico) mira hacia la glena: medial, arriba y atrás
  const dArt = nrm(-0.9, 0.45, -0.29);
  const headSph = sphere(Hc, R);
  const dome = (x, y, z) => smax(headSph(x, y, z), -((x - Hc[0]) * dArt[0] + (y - Hc[1]) * dArt[1] + (z - Hc[2]) * dArt[2] + 0.3), 0.06);
  const meta = ellipsoid(add(Hc, [0.42, -0.34, 0.12]), [0.62, 0.74, 0.64]);
  const gt = ellipsoid(add(Hc, [0.66, -0.06, 0.1]), [0.36, 0.48, 0.5]);
  const lt = ellipsoid(add(Hc, [0.3, -0.46, 0.66]), [0.21, 0.27, 0.19]);
  const groove = roundCone(add(Hc, [0.53, 0.0, 0.84]), add(Hc, [0.62, -1.3, 0.6]), 0.11, 0.1);
  const shaft = roundCone(add(Hc, [0.45, -0.6, 0.08]), add(Hc, [0.6, -2.3, 0.08]), 0.54, 0.36);
  const humBase = (x, y, z) => {
    let d = smin(dome(x, y, z), meta(x, y, z), 0.1);
    d = smin(d, gt(x, y, z), 0.16);
    d = smin(d, lt(x, y, z), 0.12);
    d = smin(d, shaft(x, y, z), 0.3);
    return smax(d, -groove(x, y, z), 0.09);
  };
  // Relieve óseo de la huella de inserción (se define cuando se conoce el recorrido del tendón)
  let footprint = () => 1e9;
  const humerus = (x, y, z) => smin(humBase(x, y, z), footprint(x, y, z), 0.22);
  // 1 sobre el cartílago articular, 0 fuera
  const cartilage = (x, y, z) => sstep(-0.18, -0.02, (x - Hc[0]) * dArt[0] + (y - Hc[1]) * dArt[1] + (z - Hc[2]) * dArt[2]) * sstep(0.05, 0.0, Math.abs(headSph(x, y, z)));

  // Escápula: plano escapular (m = hacia medial/posterior, n = cara anterior)
  const m = nrm(-1, 0, -0.32);
  const n = nrm(-0.32, 0, 1);
  const G = add(Hc, mul(m, R + 0.04)); // centro de la glena
  const W = (s, y, v) => add(G, mul(m, s), [0, y, 0], mul(n, v));
  const blade = poly2([
    [0.35, 0.4],
    [1.1, 0.62],
    [2.85, 0.86],
    [3.05, 0.3],
    [2.6, -2.9],
    [0.4, -0.5],
  ]);
  const TH = 0.085, RR = 0.075;
  const latBorder = roundCone(W(0.45, -0.45, 0), W(2.55, -2.8, 0), 0.16, 0.1);
  const supBorder = roundCone(W(1.05, 0.6, 0), W(2.8, 0.82, 0), 0.08, 0.1);
  const glenRim = ellipsoid(W(0.12, -0.05, 0), [0.18, 0.56, 0.38], m, [0, 1, 0], n);
  const glenNeck = roundCone(W(0.2, -0.04, 0), W(0.5, 0, 0), 0.28, 0.22);
  // Acromion: repisa ancha y aplanada sobre la cabeza humeral, continuación de la espina
  const flatChain = (pts, rads, ky, k) => {
    const c = chain(pts.map((p) => [p[0], p[1] * ky, p[2]]), rads, k);
    const s = Math.sqrt(ky);
    return (x, y, z) => c(x, y * ky, z) / s;
  };
  const A = [add(Hc, [-0.72, 1.22, -1.1]), add(Hc, [-0.12, 1.47, -0.62]), add(Hc, [0.5, 1.44, -0.22]), add(Hc, [0.86, 1.28, 0.02])];
  const acromion = flatChain(A, [0.3, 0.38, 0.38, 0.3], 2.3, 0.2);
  const spine = chain([A[0], W(1.1, 0.68, -0.85), W(2.1, 0.42, -0.45), W(3.0, 0.28, -0.1)], [0.2, 0.15, 0.12, 0.09], 0.12);
  const headCut = sphere(Hc, R + 0.05);
  const scapula = (x, y, z) => {
    const px = x - G[0], py = y - G[1], pz = z - G[2];
    const s = px * m[0] + pz * m[2];
    let v = px * n[0] + pz * n[2];
    v += 0.1 * Math.sin(clamp((s - 0.4) / 2.9, 0, 1) * Math.PI) * clamp((py + 2.2) / 1.2, 0, 1); // fosa subescapular cóncava
    const d2 = blade(s, py) + RR;
    const ez = Math.abs(v) - (TH - RR);
    let d = Math.min(Math.max(d2, ez), 0) + Math.sqrt(Math.max(d2, 0) ** 2 + Math.max(ez, 0) ** 2) - RR;
    d = smin(d, latBorder(x, y, z), 0.14);
    d = smin(d, supBorder(x, y, z), 0.08);
    d = smin(d, smin(glenRim(x, y, z), glenNeck(x, y, z), 0.18), 0.2);
    d = smin(d, spine(x, y, z), 0.14);
    d = smin(d, acromion(x, y, z), 0.16);
    return smax(d, -headCut(x, y, z), 0.05);
  };
  const bones = (x, y, z) => Math.min(humerus(x, y, z), scapula(x, y, z));


  // ------------------------------------------------------------ supraespinoso: vientre muscular → tendón → inserción
  // Punto sobre la superficie del húmero en la dirección d desde el centro de la cabeza, separado `off`
  const onHum = (d, off) => {
    const u = nrm(...d);
    let lo = 0.2, hi = 2.6;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (humBase(Hc[0] + u[0] * mid, Hc[1] + u[1] * mid, Hc[2] + u[2] * mid) < 0) lo = mid;
      else hi = mid;
    }
    return new V3(...add(Hc, mul(u, lo + off)));
  };
  const path = new THREE.CatmullRomCurve3(
    [
      new V3(...W(2.95, 0.7, -0.3)),
      new V3(...W(2.2, 0.92, -0.38)),
      new V3(...W(1.4, 1.08, -0.38)),
      new V3(...W(0.7, 1.16, -0.32)),
      onHum([-0.45, 1, -0.25], 0.17),
      onHum([-0.05, 1, -0.12], 0.16),
      onHum([0.4, 0.92, 0.0], 0.16),
      onHum([0.74, 0.66, 0.2], 0.19),
      onHum([0.88, 0.45, 0.27], 0.13),
      onHum([0.95, 0.3, 0.3], 0.0),
      onHum([0.99, 0.14, 0.31], -0.28),
    ],
    false,
    'centripetal'
  );
  {
    const fp = onHum([0.96, 0.27, 0.3], -0.2);
    footprint = sphere([fp.x, fp.y, fp.z], 0.31);
  }
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const T_TEN = 0.6; // unión musculotendinosa
  const T_LES = 0.86; // zona lesionada (cerca de la inserción)
  const tendonness = (t) => smooth(T_TEN - 0.08, T_TEN + 0.06, t);
  const les = (t) => Math.exp(-(((t - T_LES) / 0.045) ** 2));
  const startCap = (t) => Math.sqrt(1 - (1 - Math.min(1, t / 0.1)) ** 2);
  const halfW = (t) => (0.56 * (1 - tendonness(t)) + 0.4 * tendonness(t) * (1 - 0.3 * smooth(0.9, 1, t))) * (0.15 + 0.85 * startCap(t)) + 0.04 * les(t);
  const halfH = (t) => (0.42 * (1 - tendonness(t)) * (0.8 + 0.2 * Math.sin(Math.PI * clamp(t / T_TEN, 0, 1))) + 0.14 * tendonness(t) * (1 - 0.3 * smooth(0.93, 1, t))) * startCap(t) + 0.085 * les(t);
  const nref = (t, p) => {
    const radial = new V3(p.x - Hc[0], p.y - Hc[1], p.z - Hc[2]).normalize();
    return new V3(0, 1, 0).lerp(radial, smooth(0.45, 0.7, t)).normalize();
  };
  // Tabla de marcos a lo largo del recorrido
  const NT = 400;
  const FR = [];
  for (let s = 0; s <= NT; s++) {
    const t = s / NT;
    const p = path.getPointAt(t);
    const T = path.getTangentAt(t);
    const N = nref(t, p);
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

  // Aproximación del manguito (esferas a lo largo del recorrido) para la sombra de contacto sobre el hueso
  const cuffPts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const f = frameAt(t, { p: new V3(), N: new V3(), B: new V3() });
    cuffPts.push([f.p.x, f.p.y, f.p.z, Math.max(0.06, (halfH(t) + halfW(t)) * 0.5)]);
  }
  const cuffSDF = (x, y, z) => {
    let d = 1e9;
    for (const c of cuffPts) {
      const dx = x - c[0], dy = y - c[1], dz = z - c[2];
      d = Math.min(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - c[3]);
    }
    return d;
  };
  // Color de hueso con oclusión ambiental aproximada; la parte inferior se desvanece (escápula y diáfisis sugeridas)
  const boneBase = new THREE.Color('#e4d5bd');
  const cartColor = new THREE.Color('#d9e0ea');
  const humFade = (y) => sstep(-1.0, -0.3, y);
  const fadeTint = new THREE.Color('#b9c6db');
  const boneAO = (fade, tint, depth) => (x, y, z, g, c) => {
    let occ = 0, sca = 1;
    for (let i = 1; i <= 5; i++) {
      const hh = 0.03 + 0.09 * i;
      const d = Math.min(bones(x + g[0] * hh, y + g[1] * hh, z + g[2] * hh), cuffSDF(x + g[0] * hh, y + g[1] * hh, z + g[2] * hh));
      occ += (hh - d) * sca;
      sca *= 0.72;
    }
    const ao = clamp(1 - 1.15 * occ, 0, 1);
    c.copy(boneBase);
    if (tint) c.lerp(cartColor, 0.5 * tint(x, y, z));
    c.multiplyScalar((0.6 + 0.4 * ao) * (0.84 + 0.16 * sstep(-1.1, 0.9, y)));
    const al = fade(x, y, z);
    c.lerp(fadeTint, Math.min(1, (1 - al) * 0.75 + (depth ? depth(x, y, z) : 0)));
    return al;
  };
  const boneMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, transparent: true, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.28, sheen: 0.3, sheenColor: new THREE.Color('#fff4e6') });
  const scapMesh = new THREE.Mesh(edgeShade(meshSDF(scapula, [-3.3, -1.05, -2.0], [2.4, 2.25, 1.1], 0.028, boneAO((x, y) => sstep(-1.0, -0.42, y), null, (x, y, z) => 0.32 * sstep(1.3, 3.3, Math.hypot(x - Hc[0], z - Hc[2])))), 0.3), boneMat);
  const humMesh = new THREE.Mesh(edgeShade(meshSDF(humerus, [-0.2, -1.05, -1.1], [2.1, 1.05, 1.1], 0.024, boneAO((x, y) => humFade(y), cartilage)), 0.3), boneMat);
  scapMesh.renderOrder = 1;
  humMesh.renderOrder = 2;
  root.add(scapMesh, humMesh);

  const cMuscle = new THREE.Color('#bb4b57');
  const cMuscleHi = new THREE.Color('#d8777c');
  const cTendon = new THREE.Color('#eef3fb');
  const cLesion = new THREE.Color('#f47a48');
  const lesC = (t) => Math.exp(-(((t - T_LES) / 0.065) ** 2));
  const colorAt = (t, shade, out) => {
    out.copy(cMuscle).lerp(cMuscleHi, shade).lerp(cTendon, tendonness(t));
    out.lerp(cLesion, lesC(t));
    return out;
  };

  // Generador de tubos (fibras) con transporte paralelo y extremos redondeados
  const buf = { pos: [], col: [], idx: [] };
  function tube(pts, rads, cols, radial, B = buf) {
    const nP = pts.length;
    const base = B.pos.length / 3;
    const T = [];
    for (let i = 0; i < nP; i++) T.push(pts[Math.min(i + 1, nP - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize());
    const Nv = Math.abs(T[0].y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0);
    Nv.sub(T[0].clone().multiplyScalar(Nv.dot(T[0]))).normalize();
    const ax = new V3(), Bv = new V3(), dir = new V3();
    for (let i = 0; i < nP; i++) {
      if (i > 0) {
        ax.crossVectors(T[i - 1], T[i]);
        const l = ax.length();
        if (l > 1e-8) Nv.applyAxisAngle(ax.divideScalar(l), Math.acos(clamp(T[i - 1].dot(T[i]), -1, 1)));
      }
      Bv.crossVectors(T[i], Nv);
      for (let r = 0; r < radial; r++) {
        const a = (r / radial) * Math.PI * 2;
        dir.copy(Nv).multiplyScalar(Math.cos(a)).addScaledVector(Bv, Math.sin(a));
        B.pos.push(pts[i].x + dir.x * rads[i], pts[i].y + dir.y * rads[i], pts[i].z + dir.z * rads[i]);
        if (B.alpha) B.col.push(cols[i].r, cols[i].g, cols[i].b, cols[i].a ?? 1);
        else B.col.push(cols[i].r, cols[i].g, cols[i].b);
      }
    }
    for (let i = 0; i < nP - 1; i++)
      for (let r = 0; r < radial; r++) {
        const a = base + i * radial + r, b = base + i * radial + ((r + 1) % radial), c = a + radial, d = b + radial;
        B.idx.push(a, b, c, b, d, c);
      }
  }
  const roundEnds = (pts, rads) => {
    const n = pts.length;
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const len = cum[n - 1];
    for (let i = 0; i < n; i++) {
      const r = rads[i];
      const dEnd = Math.min(cum[i], len - cum[i]);
      const k = Math.min(1, dEnd / Math.max(r, 1e-4));
      rads[i] = r * Math.sqrt(Math.max(0, 1 - (1 - k) ** 2));
    }
  };
  const toGeo = (B) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, B.alpha ? 4 : 3));
    g.setIndex(B.idx);
    g.computeVertexNormals();
    return g;
  };

  // Vientre muscular y tendón: superficie continua con estrías longitudinales que convergen en el tendón
  const fr = { p: new V3(), N: new V3(), B: new V3() };
  const NR = 44;
  const ridgeAt = (a, t) => 0.5 - 0.5 * Math.cos(NR * a + 0.5 * Math.sin(a * 3 + t * 5));
  // Punto de la superficie para el parámetro t (a lo largo) y el ángulo a (alrededor)
  const surf = (t, a, f, scale = 1) => {
    const w = halfW(t), h = halfH(t);
    const tn = tendonness(t), l = les(t);
    const amp = 0.05 * (1 - tn) + 0.02 * tn;
    let rr = (1 - amp * ridgeAt(a, t)) * scale;
    rr += l * (0.06 * Math.sin(a * 9 + t * 120) + 0.04 * Math.sin(a * 17 - t * 80));
    const cu = Math.cos(a) * rr * w, su = Math.sin(a) * rr * h;
    return [f.p.x + f.B.x * cu + f.N.x * su, f.p.y + f.B.y * cu + f.N.y * su, f.p.z + f.B.z * cu + f.N.z * su];
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
    const c = new THREE.Color();
    sweepGrid(buf, 300, 176, 0, 1, (t, a) => surf(t, a, fr), (t, a) => {
      const ridge = ridgeAt(a, t), tn = tendonness(t);
      colorAt(t, 0.5 + 0.5 * Math.sin(a * 13.7 + 1.3 * Math.sin(a * 5)), c).multiplyScalar(1 - (0.2 * (1 - tn) + 0.08 * tn) * ridge);
      return [c.r, c.g, c.b];
    });
  }
  const fiberMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.35, sheenColor: new THREE.Color('#dfe6ff'), sheenRoughness: 0.45 });
  root.add(new THREE.Mesh(edgeShade(toGeo(buf), 0.22, 0.5), fiberMat));

  // Zona lesionada: tendón engrosado, cálido y algo luminoso (capa que se funde con el tendón sano)
  {
    const lb = { pos: [], col: [], idx: [], alpha: true };
    const W2 = 0.11;
    sweepGrid(lb, 90, 176, T_LES - W2, T_LES + W2, (t, a) => surf(t, a, fr, 1.012), (t) => [1, 1, 1, 0.92 * sstep(0, 0.5, lesC(t))]);
    const lesMat = new THREE.MeshPhysicalMaterial({ color: '#f0743f', vertexColors: true, transparent: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: new THREE.Color('#ff4d1f'), emissiveIntensity: 0.4 });
    const lm = new THREE.Mesh(toGeo(lb), lesMat);
    lm.renderOrder = 4;
    root.add(lm);
    // Algunas fibras deshilachadas que se levantan de la superficie
    reseed(77);
    const fb = { pos: [], col: [], idx: [] };
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < 8; i++) {
      const tc = T_LES + (rnd() - 0.5) * 0.08;
      const span = 0.035 + rnd() * 0.03;
      const ang = Math.PI * (0.18 + 0.64 * rnd());
      const ph = rnd() * 6.28;
      const pts = [], rads = [], cols = [];
      for (let k = 0; k <= 36; k++) {
        const sN = k / 36;
        const t = tc - span + 2 * span * sN;
        frameAt(t, fr);
        const p = surf(t, ang + 0.08 * Math.sin(sN * 4 + ph), fr, 1.0 + 0.22 * Math.sin(sN * Math.PI));
        pts.push(new V3(...p));
        rads.push(0.022);
        cols.push(white);
      }
      roundEnds(pts, rads);
      tube(pts, rads, cols, 8, fb);
    }
    const fMat = M.lesion();
    fMat.emissiveIntensity = 0.55;
    root.add(new THREE.Mesh(toGeo(fb), fMat));
  }

  // Halo cálido sobre la lesión
  frameAt(T_LES, fr);
  const glow = halo('#ff9a6b', 1.7, 0.7);
  glow.position.copy(fr.p).addScaledVector(fr.N, 0.12).add(new V3(0.12, 0.05, 0.3));
  root.add(glow);
  const core = halo('#ffb48a', 0.55, 0.55);
  core.position.copy(glow.position);
  root.add(core);

  return { root, cam: CAM, look: LOOK, zoom: ZOOM, shadow: false };
}
