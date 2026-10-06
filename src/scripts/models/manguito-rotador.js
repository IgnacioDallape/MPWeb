// Tendinopatía del manguito rotador (supraespinoso).
// Hombro derecho en vista anterolateral-superior: cabeza humeral con tuberosidades y la diáfisis,
// escápula con glena, coracoides, espina y acromion (techo), muñón de clavícula (articulación
// acromioclavicular) y el músculo supraespinoso, que se continúa en su tendón bajo el acromion hasta
// la huella de inserción en el troquíter. La zona lesionada está en el tendón, cerca de la inserción.
export default function build(L) {
  const { THREE, halo, rnd, reseed } = L;
  const V3 = THREE.Vector3;
  const root = new THREE.Group();
  // Cámara (elevación y azimut desde anterior hacia lateral). Se usa también para oscurecer los contornos.
  const LOOK = [-0.1, -0.45, -0.5], ZOOM = 1.0;
  const EL = 0.5, AZ = 0.4, DIST = 11.8, ROLL = 0.26;
  const CAM = [LOOK[0] + DIST * Math.sin(AZ) * Math.cos(EL), LOOK[1] + DIST * Math.sin(EL), LOOK[2] + DIST * Math.cos(AZ) * Math.cos(EL)];
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
  // Cadena aplastada en vertical (ky > 1 = más plana)
  const flatChain = (pts, rads, ky, k) => {
    const c = chain(pts.map((p) => [p[0], p[1] * ky, p[2]]), rads, k);
    const s = Math.sqrt(ky);
    return (x, y, z) => c(x, y * ky, z) / s;
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

  // Húmero proximal: cabeza, troquíter (tuberosidad mayor), troquín, corredera bicipital, metáfisis y diáfisis.
  // Se modela en posición neutra (marco local) y se abduce ABD rad en el plano de la escápula alrededor del
  // centro de la cabeza: el brazo baja hacia afuera, lo que da una silueta más apaisada y natural.
  // La superficie articular mira hacia la glena: medial, arriba y atrás.
  const ABD = 0.42;
  const nAx = nrm(-0.32, 0, 1); // eje de abducción (normal al plano escapular)
  const rotM = (ang) => {
    const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c, [x, y, z] = nAx;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  };
  const RF = rotM(ABD), RI = rotM(-ABD);
  const app = (Mx, v) => [Mx[0] * v[0] + Mx[1] * v[1] + Mx[2] * v[2], Mx[3] * v[0] + Mx[4] * v[1] + Mx[5] * v[2], Mx[6] * v[0] + Mx[7] * v[1] + Mx[8] * v[2]];
  const toLocal = (x, y, z) => add(app(RI, [x - Hc[0], y - Hc[1], z - Hc[2]]), Hc);
  const dArt = nrm(-0.9, 0.45, -0.29);
  const artP = (x, y, z) => (x - Hc[0]) * dArt[0] + (y - Hc[1]) * dArt[1] + (z - Hc[2]) * dArt[2];
  const headSph = sphere(Hc, R);
  // Casquete amplio con borde muy suavizado: el cuello anatómico queda como un surco suave, sin escalón
  const dome = (x, y, z) => smax(headSph(x, y, z), -(artP(x, y, z) + 0.42), 0.34);
  const meta = ellipsoid(add(Hc, [0.4, -0.4, 0.1]), [0.66, 0.74, 0.66]);
  const gt = ellipsoid(add(Hc, [0.62, 0.0, 0.12]), [0.4, 0.5, 0.52]);
  const lt = ellipsoid(add(Hc, [0.3, -0.5, 0.64]), [0.17, 0.22, 0.15]);
  const groove = roundCone(add(Hc, [0.5, -0.1, 0.86]), add(Hc, [0.6, -1.25, 0.6]), 0.085, 0.07);
  const shaft = roundCone(add(Hc, [0.45, -0.6, 0.08]), add(Hc, [0.55, -2.8, 0.06]), 0.5, 0.34);
  const humLocal = (x, y, z) => {
    let d = smin(dome(x, y, z), meta(x, y, z), 0.3);
    d = smin(d, gt(x, y, z), 0.3);
    d = smin(d, lt(x, y, z), 0.14);
    d = smin(d, shaft(x, y, z), 0.4);
    return smax(d, -groove(x, y, z), 0.1);
  };
  const humBase = (x, y, z) => {
    const p = toLocal(x, y, z);
    return humLocal(p[0], p[1], p[2]);
  };
  // Relieve óseo de la huella de inserción (se define cuando se conoce el recorrido del tendón)
  let footprint = () => 1e9;
  const humerus = (x, y, z) => smin(humBase(x, y, z), footprint(x, y, z), 0.22);
  // 1 sobre el cartílago articular, 0 fuera
  const cartilage = (x, y, z) => {
    const p = toLocal(x, y, z);
    return sstep(-0.12, 0.08, artP(p[0], p[1], p[2])) * sstep(0.06, 0.0, Math.abs(headSph(p[0], p[1], p[2])));
  };

  // Escápula: plano escapular (m = hacia medial/posterior, n = cara anterior)
  const m = nrm(-1, 0, -0.32);
  const n = nrm(-0.32, 0, 1);
  const G = add(Hc, mul(m, R + 0.04)); // centro de la glena
  const W = (s, y, v) => add(G, mul(m, s), [0, y, 0], mul(n, v));
  const blade = poly2([
    [0.35, 0.6],
    [1.1, 0.74],
    [2.85, 0.86],
    [3.05, 0.3],
    [2.6, -2.9],
    [0.4, -0.5],
  ]);
  const TH = 0.085, RR = 0.075;
  const latBorder = roundCone(W(0.45, -0.45, 0), W(2.55, -2.8, 0), 0.16, 0.1);
  const supBorder = roundCone(W(1.05, 0.6, 0), W(2.8, 0.82, 0), 0.08, 0.1);
  const glenRim = ellipsoid(W(0.05, -0.05, 0), [0.08, 0.5, 0.34], m, [0, 1, 0], n);
  const glenNeck = roundCone(W(0.12, -0.04, 0), W(0.55, 0, 0), 0.2, 0.26);
  // Coracoides: sale del cuello de la escápula hacia arriba y adelante y se curva como un gancho
  const coracoid = chain([W(0.3, 0.36, 0.12), add(Hc, [-0.72, 0.64, 0.72]), add(Hc, [-0.52, 0.52, 1.06])], [0.27, 0.17, 0.15], 0.22);
  // Acromion: losa plana y angulosa sobre la cabeza humeral (contorno poligonal, sección en lente: gruesa
  // al centro y de borde fino), apenas arqueada hacia abajo en su parte anterior; continuación de la espina.
  const AO = add(Hc, [0.15, 1.42, -0.42]);
  const AU = nrm(0.8, 0, 0.6), AW = nrm(-0.6, 0, 0.8); // u: de la espina a la punta; w: hacia anteromedial
  const acrPoly = poly2([
    [-1.1, -0.18],
    [-0.6, -0.36],
    [0.4, -0.38],
    [0.95, -0.2],
    [1.06, 0.08],
    [0.85, 0.3],
    [0.2, 0.34],
    [-0.6, 0.24],
    [-1.1, 0.06],
  ]);
  const ATH = 0.13;
  const acromion = (x, y, z) => {
    const px = x - AO[0], py = y - AO[1], pz = z - AO[2];
    const u = px * AU[0] + pz * AU[2], w = px * AW[0] + pz * AW[2];
    const h = py + 0.14 * Math.max(u, 0) ** 2 + 0.1 * Math.max(u, 0) + 0.04 * Math.min(u, 0); // desciende hacia la punta anterolateral
    const d2 = acrPoly(u, w);
    const th = ATH * (0.35 + 0.65 * sstep(0, 0.28, -d2));
    return smax(d2, Math.abs(h) - th, 0.05);
  };
  const A0 = add(AO, mul(AU, -0.95), [0, 0.0, -0.02]);
  const spine = chain([A0, W(1.1, 0.6, -0.8), W(2.1, 0.4, -0.45), W(3.0, 0.28, -0.1)], [0.15, 0.13, 0.11, 0.09], 0.14);
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
    d = smin(d, supBorder(x, y, z), 0.18);
    d = smin(d, smin(glenRim(x, y, z), glenNeck(x, y, z), 0.35), 0.2);
    d = smin(d, coracoid(x, y, z), 0.3);
    d = smin(d, spine(x, y, z), 0.14);
    d = smin(d, acromion(x, y, z), 0.26);
    return smax(d, -headCut(x, y, z), 0.05);
  };
  // Clavícula: curva en S, aplanada en su extremo lateral, que se articula con el borde anteromedial del
  // acromion (articulación acromioclavicular) y se desvanece hacia medial
  const CL = [add(Hc, [0.16, 1.47, 0.3]), add(Hc, [-0.45, 1.52, 0.52]), add(Hc, [-1.5, 1.6, 0.92]), add(Hc, [-2.7, 1.62, 0.92])];
  const clavicle = flatChain(CL, [0.2, 0.165, 0.15, 0.17], 1.6, 0.25);
  const bones = (x, y, z) => Math.min(humerus(x, y, z), scapula(x, y, z), clavicle(x, y, z));

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
      new V3(...W(2.65, 0.62, -0.42)),
      new V3(...W(2.2, 0.8, -0.46)),
      new V3(...W(1.4, 0.96, -0.46)),
      new V3(...W(0.7, 0.98, -0.36)),
      onHum([-0.45, 1, -0.25], 0.17),
      onHum([-0.05, 1, -0.1], 0.16),
      onHum([0.35, 0.92, 0.04], 0.16),
      onHum([0.62, 0.74, 0.16], 0.15),
      onHum([0.8, 0.52, 0.26], 0.13),
      onHum([0.88, 0.37, 0.3], 0.1),
    ],
    false,
    'centripetal'
  );
  {
    const fp = onHum([0.84, 0.44, 0.28], -0.2);
    footprint = sphere([fp.x, fp.y, fp.z], 0.3);
  }
  const smooth = sstep;
  const T_TEN = 0.6; // unión musculotendinosa
  const T_LES = 0.82; // zona lesionada (cerca de la inserción)
  const tendonness = (t) => smooth(T_TEN - 0.08, T_TEN + 0.06, t);
  const les = (t) => Math.exp(-(((t - T_LES) / 0.075) ** 2)); // engrosamiento fusiforme largo y suave
  const fan = (t) => smooth(0.9, 1, t); // abanico de inserción: más ancho y plano
  const startCap = (t) => Math.sqrt(1 - (1 - Math.min(1, t / 0.1)) ** 2);
  const endCap = (t) => Math.sqrt(Math.max(0, 1 - Math.max(0, (t - 0.965) / 0.035) ** 2));
  const halfW = (t) => (0.64 * (1 - tendonness(t)) + 0.36 * tendonness(t) * (1 + 0.15 * fan(t))) * (0.15 + 0.85 * startCap(t)) * (0.35 + 0.65 * endCap(t)) + 0.04 * les(t);
  const halfH = (t) => (0.34 * (1 - tendonness(t)) * (0.8 + 0.2 * Math.sin(Math.PI * clamp(t / T_TEN, 0, 1))) + 0.14 * tendonness(t) * (1 - 0.85 * fan(t))) * startCap(t) + 0.065 * les(t);
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
  // Suavizado de marcos: elimina quiebres de la curva en los puntos de control (si no, el tendón apoyado
  // sobre el hueso se pliega en una arista)
  for (let it = 0; it < 60; it++) {
    const P0 = FR.map((f) => f.p.clone()), N0 = FR.map((f) => f.N.clone()), B0 = FR.map((f) => f.B.clone());
    for (let s = 1; s < NT; s++) {
      FR[s].p.copy(P0[s - 1]).add(P0[s + 1]).addScaledVector(P0[s], 2).multiplyScalar(0.25);
      FR[s].N.copy(N0[s - 1]).add(N0[s + 1]).addScaledVector(N0[s], 2).normalize();
      FR[s].B.copy(B0[s - 1]).add(B0[s + 1]).addScaledVector(B0[s], 2).normalize();
    }
  }
  for (const f of FR) f.B.sub(f.N.clone().multiplyScalar(f.B.dot(f.N))).normalize();
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
  const occlusion = (sdf, x, y, z, g, k = 1.5) => {
    let occ = 0, sca = 1;
    for (let i = 1; i <= 5; i++) {
      const hh = 0.03 + 0.09 * i;
      occ += (hh - sdf(x + g[0] * hh, y + g[1] * hh, z + g[2] * hh)) * sca;
      sca *= 0.72;
    }
    return clamp(1 - k * occ, 0, 1);
  };
  const sceneSDF = (x, y, z) => Math.min(bones(x, y, z), cuffSDF(x, y, z));

  // Hueso: color con oclusión ambiental; las partes alejadas se desvanecen solo en alfa (sin tinte)
  const boneBase = new THREE.Color('#d8c4a6');
  const cartColor = new THREE.Color('#d6dde8');
  const boneAO = (fade, tint) => (x, y, z, g, c) => {
    const ao = occlusion(sceneSDF, x, y, z, g, 1.5);
    c.copy(boneBase);
    if (tint) c.lerp(cartColor, 0.5 * tint(x, y, z));
    const al = fade(x, y, z);
    // lo que se desvanece también se apaga un poco (se aleja en sombra, sin halo lechoso sobre fondo oscuro)
    c.multiplyScalar((0.56 + 0.44 * ao) * (0.86 + 0.14 * sstep(-1.6, 1.2, y)) * (0.76 + 0.24 * al));
    return al;
  };
  const boneMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, transparent: true, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.28, sheen: 0.3, sheenColor: new THREE.Color('#fff4e6') });
  // Escápula: se ve la franja alta (bajo el supraespinoso) y la zona de la glena; se desvanece hacia abajo
  // siguiendo una línea inclinada y, en el extremo medial, de forma breve
  const scapFade = (x, y, z) => {
    const s = (x - G[0]) * m[0] + (z - G[2]) * m[2], py = y - G[1];
    const low = -0.42 + 0.3 * Math.max(s, 0);
    return sstep(low - 0.28, low, py) * sstep(3.15, 2.8, s);
  };
  const humFade = (x, y, z) => sstep(-2.3, -1.55, toLocal(x, y, z)[1]); // a lo largo del eje de la diáfisis
  const clavFade = (x, y, z) => sstep(3.0, 1.8, Math.hypot(x - CL[0][0], y - CL[0][1], z - CL[0][2]));
  const scapMesh = new THREE.Mesh(edgeShade(meshSDF(scapula, [-3.4, -1.5, -2.2], [2.2, 1.85, 1.45], 0.03, boneAO(scapFade, null)), 0.5, 0.68), boneMat);
  const humMesh = new THREE.Mesh(edgeShade(meshSDF(humerus, [-0.2, -2.6, -1.1], [3.1, 1.15, 1.25], 0.027, boneAO(humFade, cartilage)), 0.5, 0.68), boneMat);
  const clavMesh = new THREE.Mesh(edgeShade(meshSDF(clavicle, [-2.05, 1.15, -0.05], [1.4, 1.9, 1.25], 0.026, boneAO(clavFade, null)), 0.5, 0.68), boneMat);
  scapMesh.renderOrder = 1;
  humMesh.renderOrder = 2;
  clavMesh.renderOrder = 3;
  root.add(scapMesh, humMesh, clavMesh);

  // ------------------------------------------------------------ superficie del músculo y el tendón
  const cMuscle = new THREE.Color('#bb4b57');
  const cMuscleHi = new THREE.Color('#d8777c');
  const cTendon = new THREE.Color('#eef3fb');
  const cLesion = new THREE.Color('#f47a48');
  const lesC = (t) => Math.exp(-(((t - T_LES) / 0.07) ** 2));
  const colorAt = (t, shade, out) => {
    out.copy(cMuscle).lerp(cMuscleHi, shade).lerp(cTendon, tendonness(t));
    out.lerp(cLesion, lesC(t));
    return out;
  };

  // Generador de tubos (fibras) con transporte paralelo y extremos redondeados
  function tube(pts, rads, cols, radial, B) {
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
        B.col.push(cols[i].r, cols[i].g, cols[i].b);
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
  // Sobre la cabeza el tendón se "apoya" en el hueso: sección en lente proyectada sobre la superficie del
  // húmero (los bordes tocan el hueso y no quedan en el aire); antes, sección elíptica libre.
  const drapeK = (t) => smooth(0.53, 0.66, t);
  const gradHum = (x, y, z) => {
    const e = 0.008;
    return nrm(humBase(x + e, y, z) - humBase(x - e, y, z), humBase(x, y + e, z) - humBase(x, y - e, z), humBase(x, y, z + e) - humBase(x, y, z - e));
  };
  const surf = (t, a, f, scale = 1, lift = 0) => {
    const w = halfW(t), h = halfH(t);
    const tn = tendonness(t), l = les(t);
    const amp = 0.05 * (1 - tn) + 0.02 * tn;
    let rr = (1 - amp * ridgeAt(a, t) * (1 - 0.7 * l)) * scale;
    rr += l * 0.004 * Math.sin(a * 9 + t * 40); // engrosamiento casi liso
    const cu = Math.cos(a) * rr * w;
    const su = Math.sin(a) * rr * h;
    const ex = f.p.x + f.B.x * cu + f.N.x * su, ey = f.p.y + f.B.y * cu + f.N.y * su, ez = f.p.z + f.B.z * cu + f.N.z * su;
    const k = drapeK(t);
    if (k <= 0) return [ex, ey, ez];
    // base sobre el hueso: se baja en dirección radial desde el centro de la cabeza (dirección suave, sin
    // saltos entre la cabeza y el troquíter) hasta tocar la superficie; la normal del hueso da el espesor
    const u = nrm(f.p.x + f.B.x * cu - Hc[0], f.p.y + f.B.y * cu - Hc[1], f.p.z + f.B.z * cu - Hc[2]);
    let r = 1.7;
    for (let i = 0; i < 60; i++) {
      const d = humBase(Hc[0] + u[0] * r, Hc[1] + u[1] * r, Hc[2] + u[2] * r);
      if (Math.abs(d) < 3e-4) break;
      r -= d * 0.9;
    }
    const px = Hc[0] + u[0] * r, py = Hc[1] + u[1] * r, pz = Hc[2] + u[2] * r;
    const g = gradHum(px, py, pz);
    const sa = Math.sin(a);
    const off = lift + (sa > 0 ? -0.012 + (2 * h + 0.024) * Math.pow(sa, 0.85) * rr : -0.012 - 0.04 * -sa);
    const dx = px + g[0] * off, dy = py + g[1] * off, dz = pz + g[2] * off;
    return [ex + (dx - ex) * k, ey + (dy - ey) * k, ez + (dz - ez) * k];
  };
  // Normal aproximada de la sección elíptica (para la oclusión del manguito)
  const surfN = (t, a, f) => {
    const w = halfW(t), h = halfH(t);
    const cu = Math.cos(a) / w, su = Math.sin(a) / h;
    return nrm(f.B.x * cu + f.N.x * su, f.B.y * cu + f.N.y * su, f.B.z * cu + f.N.z * su);
  };
  const sweepGrid = (B, segs, radial, tA, tB, pointAt, colorOf) => {
    const base = B.pos.length / 3;
    for (let k = 0; k <= segs; k++) {
      const u = (1 - Math.cos((Math.PI * k) / segs)) / 2;
      const t = tA + (tB - tA) * u;
      frameAt(t, fr);
      for (let r = 0; r < radial; r++) {
        const a = (r / radial) * Math.PI * 2;
        const p = pointAt(t, a);
        B.pos.push(...p);
        B.col.push(...colorOf(t, a, p));
      }
    }
    for (let k = 0; k < segs; k++)
      for (let r = 0; r < radial; r++) {
        const a = base + k * radial + r, b = base + k * radial + ((r + 1) % radial), cc = a + radial, d = b + radial;
        B.idx.push(a, cc, b, b, cc, d);
      }
  };
  {
    const buf = { pos: [], col: [], idx: [] };
    const c = new THREE.Color();
    sweepGrid(buf, 260, 136, 0, 1, (t, a) => surf(t, a, fr), (t, a, p) => {
      const ridge = ridgeAt(a, t), tn = tendonness(t);
      colorAt(t, 0.5 + 0.5 * Math.sin(a * 13.7 + 1.3 * Math.sin(a * 5)), c).multiplyScalar(1 - (0.2 * (1 - tn) + 0.08 * tn) * ridge);
      // sombra de contacto: acromion por encima (espacio subacromial), hueso por debajo
      const ao = occlusion(bones, p[0], p[1], p[2], surfN(t, a, fr), 1.6);
      c.multiplyScalar(0.5 + 0.5 * ao);
      return [c.r, c.g, c.b];
    });
    const fiberMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.35, sheenColor: new THREE.Color('#dfe6ff'), sheenRoughness: 0.45 });
    root.add(new THREE.Mesh(edgeShade(toGeo(buf), 0.24, 0.5), fiberMat));
  }

  // Zona lesionada: engrosamiento fusiforme liso, cálido y algo luminoso (capa que se funde con el tendón sano)
  {
    const lb = { pos: [], col: [], idx: [], alpha: true };
    const W2 = 0.15;
    sweepGrid(lb, 76, 136, T_LES - W2, T_LES + W2, (t, a) => surf(t, a, fr, 1.012, 0.008), (t, a, p) => {
      const ao = 0.5 + 0.5 * occlusion(bones, p[0], p[1], p[2], surfN(t, a, fr), 1.6);
      return [ao, ao, ao, 0.92 * sstep(0.02, 0.6, lesC(t))];
    });
    const lesMat = new THREE.MeshPhysicalMaterial({ color: '#f0743f', vertexColors: true, transparent: true, depthWrite: false, roughness: 0.36, clearcoat: 0.8, clearcoatRoughness: 0.18, emissive: new THREE.Color('#ff5a26'), emissiveIntensity: 0.38 });
    const lm = new THREE.Mesh(toGeo(lb), lesMat);
    lm.renderOrder = 4;
    root.add(lm);
    // Pocas fibras deshilachadas, finas y pegadas a la superficie
    reseed(77);
    const fb = { pos: [], col: [], idx: [] };
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < 4; i++) {
      const tc = T_LES + (rnd() - 0.5) * 0.05;
      const span = 0.03 + rnd() * 0.02;
      const ang = Math.PI * (0.32 + 0.12 * i);
      const ph = rnd() * 6.28;
      const pts = [], rads = [], cols = [];
      for (let k = 0; k <= 36; k++) {
        const sN = k / 36;
        const t = tc - span + 2 * span * sN;
        frameAt(t, fr);
        const p = surf(t, ang, fr, 1.0 + 0.05 * Math.sin(sN * Math.PI), 0.01 + 0.025 * Math.sin(sN * Math.PI));
        pts.push(new V3(...p));
        rads.push(0.013);
        cols.push(white);
      }
      roundEnds(pts, rads);
      tube(pts, rads, cols, 8, fb);
    }
    const fMat = new THREE.MeshPhysicalMaterial({ color: '#f2804f', vertexColors: true, roughness: 0.4, clearcoat: 0.4, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.3 });
    root.add(new THREE.Mesh(toGeo(fb), fMat));
  }

  // Halo cálido centrado sobre la lesión (siempre visible, sin taparse con el hueso)
  frameAt(T_LES, fr);
  const glow = halo('#ff9a6b', 1.1, 0.45);
  glow.position.copy(fr.p).addScaledVector(fr.N, 0.05);
  glow.material.depthTest = false;
  glow.renderOrder = 6;
  root.add(glow);
  const core = halo('#ffb48a', 0.45, 0.6);
  core.position.copy(glow.position);
  core.material.depthTest = false;
  core.renderOrder = 7;
  root.add(core);

  // Giro leve del encuadre alrededor del eje de la cámara (el brazo cae en diagonal): composición apaisada
  const pivot = new THREE.Group();
  pivot.position.set(...LOOK);
  root.position.set(-LOOK[0], -LOOK[1], -LOOK[2]);
  pivot.add(root);
  pivot.quaternion.setFromAxisAngle(new V3(...CAM).sub(new V3(...LOOK)).normalize(), ROLL);
  return { root: pivot, cam: CAM, look: LOOK, zoom: ZOOM, shadow: false };
}
