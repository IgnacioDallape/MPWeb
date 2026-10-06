// Fibrosis muscular / cicatriz — vientre muscular fusiforme y alargado visto en oblicuo, con su tendón a la izquierda
// (que se abre en una aponeurosis sobre la cara superior) y un corte transversal limpio a la derecha (fascículos
// rosados con sus tabiques de perimisio).
// En la cara anterior, un sector de fibras fue reemplazado por tejido cicatricial: una placa densa, blanco-grisácea
// y opaca, al ras o levemente hundida respecto de las fibras, hecha de haces cortos, apretados y enredados (algunos
// retorcidos en cordones). La cicatriz frunce las fibras vecinas (que convergen hacia ella), se prolonga en espículas
// entre las fibras y se adhiere con bridas que cruzan por encima del músculo sano. En el corte se ve cómo penetra en
// cuña hacia la profundidad y se extiende por los tabiques. Acento cálido sutil en el margen de la cicatriz.
export default function build(L) {
  const { THREE, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const ss = THREE.MathUtils.smoothstep;
  const gauss = (x, w) => Math.exp(-(x / w) * (x / w));
  const Z = V(0, 0, 1);
  const C = (h) => new THREE.Color(h);

  // ------------------------------------------------------------ Eje y perfil del músculo
  const axis = new THREE.CatmullRomCurve3([V(-4.3, -0.2), V(-2.7, 0.0), V(-0.9, 0.12), V(0.7, 0.1), V(2.3, -0.04), V(3.9, -0.2)], false, 'centripetal');
  const AX = 600;
  const AP = [], AN = [], AT = [];
  for (let k = 0; k <= AX; k++) {
    const s = k / AX;
    AP.push(axis.getPointAt(s));
    const t = axis.getTangentAt(s);
    AT.push(t);
    AN.push(V(-t.y, t.x, 0).normalize());
  }
  const LEN = axis.getLength();
  const segL = LEN / AX;
  const fr = (s) => {
    const x = Math.min(AX, Math.max(0, s * AX));
    const k = Math.min(AX - 1, Math.floor(x));
    const f = x - k;
    return { P: AP[k].clone().lerp(AP[k + 1], f), N: AN[k].clone().lerp(AN[k + 1], f).normalize(), T: AT[k].clone().lerp(AT[k + 1], f).normalize() };
  };

  const S0 = 0.153, S1 = 0.89, RMAX = 0.9, RT = 0.27, FLAT = 0.86, SCUT = 0.70;
  const R0 = RT * 0.85;
  const belly = (s) => {
    const t = (s - S0) / (S1 - S0);
    if (t <= 0 || t >= 1) return R0;
    return R0 + (RMAX - R0) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.88)), 1.1);
  };
  const place = (s, un, ub) => {
    const { P, N } = fr(s);
    const a = belly(s);
    return P.addScaledVector(N, un * a).addScaledVector(Z, ub * a * FLAT);
  };

  // ------------------------------------------------------------ Coordenadas de superficie alrededor de la cicatriz
  // xw a lo largo de las fibras, yw profundidad (0 = superficie, negativo hacia adentro), zw a lo ancho (arco)
  const SC = 0.585;
  const DN = 0.42, DB = Math.sqrt(1 - DN * DN);
  const thc = Math.atan2(DN, DB);
  const surfC = (x, y, z) => {
    let lo = 0, hi = AX;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (AP[m].x < x) lo = m;
      else hi = m;
    }
    const q = (x - AP[lo].x) * AT[lo].x + (y - AP[lo].y) * AT[lo].y + (z - AP[lo].z) * AT[lo].z;
    const sf = Math.min(AX - 1e-6, Math.max(0, lo + q / segL));
    const k = Math.floor(sf), f = sf - k;
    const Px = AP[k].x + (AP[k + 1].x - AP[k].x) * f, Py = AP[k].y + (AP[k + 1].y - AP[k].y) * f, Pz = AP[k].z + (AP[k + 1].z - AP[k].z) * f;
    let Nx = AN[k].x + (AN[k + 1].x - AN[k].x) * f, Ny = AN[k].y + (AN[k + 1].y - AN[k].y) * f;
    const nl = Math.hypot(Nx, Ny);
    Nx /= nl;
    Ny /= nl;
    const s = sf / AX;
    const a = belly(s);
    const un = ((x - Px) * Nx + (y - Py) * Ny) / a, ub = (z - Pz) / (a * FLAT);
    const rho = Math.hypot(un, ub);
    const dth = Math.atan2(un, ub) - thc;
    return [(s - SC) * LEN, (rho - 1) * a, Math.atan2(Math.sin(dth), Math.cos(dth)) * a, rho];
  };
  const W2P = (xw, yw, zw) => {
    const s = SC + xw / LEN;
    const a = belly(s);
    const th = thc + zw / a;
    const rho = 1 + yw / a;
    return place(s, Math.sin(th) * rho, Math.cos(th) * rho);
  };
  const XCUT = (SCUT - SC) * LEN;

  // ------------------------------------------------------------ SDF de la cicatriz (en coordenadas de superficie)
  const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
    const k0 = Math.sqrt(a * a + b * b + c * c);
    const k1 = Math.sqrt((a * a) / (rx * rx) + (b * b) / (ry * ry) + (c * c) / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);

  // Espículas: prolongaciones afinadas que salen del borde y se meten entre las fibras (casi todas siguiendo la fibra)
  const FING = [
    [8, 0.62, 10, 0.03],
    [-14, 0.5, -14, -0.025],
    [38, 0.36, 22, 0.02],
    [172, 0.66, -8, -0.03],
    [196, 0.5, 14, 0.025],
    [148, 0.34, -20, 0.02],
    [96, 0.3, 30, -0.02],
    [276, 0.34, -26, 0.02],
  ].map(([deg, L, tw, wg]) => {
    const f = (deg * Math.PI) / 180;
    const bx = 0.86 * Math.cos(f), bz = 0.38 * Math.sin(f);
    const a = Math.atan2(Math.sin(f) / 0.5, Math.cos(f) / 1.05) + (tw * Math.PI) / 180;
    return { ax: bx - Math.cos(a) * 0.12, az: bz - Math.sin(a) * 0.12, ca: Math.cos(a), sa: Math.sin(a), L: L + 0.12, wg };
  });
  const spike = (xw, yw, zw, F) => {
    const px = xw - F.ax, pz = zw - F.az;
    const t = Math.min(1, Math.max(0, (px * F.ca + pz * F.sa) / F.L));
    const wig = F.wg * Math.sin(Math.PI * t);
    const qx = px - F.ca * F.L * t + F.sa * wig, qz = pz - F.sa * F.L * t - F.ca * wig;
    const qy = (yw + 0.02) / 0.6;
    return Math.sqrt(qx * qx + qy * qy + qz * qz) - (0.1 + (0.025 - 0.1) * Math.pow(t, 0.8));
  };
  // Cuerpo sin "tapa": sobresale por encima de la superficie (sirve para recortar las fibras que reemplaza)
  const scarBase = (xw, yw, zw) => {
    // placa superficial
    let d = ell(xw, yw, zw, 0, -0.12, 0, 1.05, 0.26, 0.5);
    d = smin(d, ell(xw, yw, zw, -0.5, -0.1, 0.16, 0.42, 0.2, 0.26), 0.14);
    d = smin(d, ell(xw, yw, zw, 0.36, -0.1, -0.16, 0.4, 0.2, 0.27), 0.14);
    d = smin(d, ell(xw, yw, zw, 0.7, -0.08, 0.14, 0.3, 0.16, 0.2), 0.12);
    // quilla que penetra en cuña hacia el centro del vientre (se ve en el corte)
    d = smin(d, ell(xw, yw, zw, 0.42, -0.25, 0.0, 0.78, 0.14, 0.22), 0.1);
    d = smin(d, ell(xw, yw, zw, 0.55, -0.38, 0.02, 0.62, 0.12, 0.15), 0.08);
    d = smin(d, ell(xw, yw, zw, 0.64, -0.5, 0.03, 0.47, 0.1, 0.1), 0.07);
    d = smin(d, ell(xw, yw, zw, 0.7, -0.6, 0.04, 0.36, 0.08, 0.06), 0.06);
    d +=
      0.025 * Math.sin(xw * 4.3 + zw * 2.1 + 0.5) * Math.cos(zw * 5.7 - xw * 1.3 - 1) +
      0.014 * Math.sin(xw * 7.1 + 1.3) * Math.sin(zw * 8.3 + 0.4) * Math.sin(yw * 6.7 + 2.1) +
      0.008 * Math.sin(xw * 13 + zw * 11) * Math.cos(zw * 12 - yw * 9);
    for (const F of FING) d = smin(d, spike(xw, yw, zw, F), 0.08);
    return d;
  };
  // Tapa: la cara superior queda al ras o apenas hundida respecto de las fibras (retracción)
  const capH = (xw, zw) => -0.01 - 0.022 * Math.exp(-(xw * xw) / 0.5 - (zw * zw) / 0.09) + 0.005 * Math.sin(xw * 9 + zw * 5) * Math.sin(zw * 11 - xw * 3);
  const scarW = (xw, yw, zw) => smax(scarBase(xw, yw, zw), yw - capH(xw, zw), 0.04);
  const fCut = fr(SCUT);
  const PC = fCut.P, TC = fCut.T;
  const CLIP = 0.012;
  const scarCap = (x, y, z) => {
    const [xw, yw, zw] = surfC(x, y, z);
    return scarW(xw, yw, zw);
  };
  const scarSDF = (x, y, z) => Math.max(scarCap(x, y, z), (x - PC.x) * TC.x + (y - PC.y) * TC.y + (z - PC.z) * TC.z + CLIP);
  const footprint = (xw, zw) => scarBase(xw, 0.0, zw);

  // ------------------------------------------------------------ Tubo con radio, color y "calor" por punto
  // Si se pasa `ups` (vector "afuera" por punto) la sección es elíptica: ancho wS, alto hS (aplastado contra la superficie)
  function tubeArr(pts, radial, rad, col, heat, segMul = 1.5, ups = null, wS = 1, hS = 1) {
    const n0 = pts.length;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const segs = Math.max(6, Math.round((n0 - 1) * segMul));
    const frames = curve.computeFrenetFrames(segs, false);
    const n = (segs + 1) * (radial + 1);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cl = new Float32Array(n * 3), ht = new Float32Array(n);
    const c = new THREE.Color();
    const U = V(0, 0, 0), W = V(0, 0, 0), T = V(0, 0, 0);
    let p = 0;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const P = curve.getPoint(u);
      const x = u * (n0 - 1);
      const k = Math.min(n0 - 2, Math.floor(x));
      const f = x - k;
      const r = rad[k] + (rad[k + 1] - rad[k]) * f;
      const h = heat[k] + (heat[k + 1] - heat[k]) * f;
      c.copy(col[k]).lerp(col[k + 1], f);
      let Nn = frames.normals[i], Bn = frames.binormals[i];
      let ws = 1, hs = 1;
      if (ups) {
        T.copy(frames.tangents[i]);
        U.copy(ups[k]).lerp(ups[k + 1], f);
        U.addScaledVector(T, -U.dot(T)).normalize();
        W.crossVectors(U, T).normalize();
        Nn = W;
        Bn = U;
        ws = wS;
        hs = hS;
      }
      for (let j = 0; j <= radial; j++) {
        const v = (j / radial) * Math.PI * 2;
        const sn = Math.sin(v), cs = -Math.cos(v);
        const ox = cs * ws * Nn.x + sn * hs * Bn.x, oy = cs * ws * Nn.y + sn * hs * Bn.y, oz = cs * ws * Nn.z + sn * hs * Bn.z;
        let nx = (cs / ws) * Nn.x + (sn / hs) * Bn.x, ny = (cs / ws) * Nn.y + (sn / hs) * Bn.y, nz = (cs / ws) * Nn.z + (sn / hs) * Bn.z;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        pos[p * 3] = P.x + r * ox;
        pos[p * 3 + 1] = P.y + r * oy;
        pos[p * 3 + 2] = P.z + r * oz;
        nor[p * 3] = nx;
        nor[p * 3 + 1] = ny;
        nor[p * 3 + 2] = nz;
        cl[p * 3] = c.r;
        cl[p * 3 + 1] = c.g;
        cl[p * 3 + 2] = c.b;
        ht[p] = h;
        p++;
      }
    }
    const idx = [];
    for (let i = 1; i <= segs; i++)
      for (let j = 1; j <= radial; j++) {
        const a = (radial + 1) * (i - 1) + (j - 1), b = (radial + 1) * i + (j - 1), cc = (radial + 1) * i + j, d = (radial + 1) * (i - 1) + j;
        idx.push(a, b, d, b, cc, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    g.setAttribute('aHeat', new THREE.BufferAttribute(ht, 1));
    g.setIndex(idx);
    return g;
  }

  // Material con color por vértice y emisión cálida según el atributo aHeat
  const heatMat = (mat, warm = '#ff6a3d', k = 0.6) => {
    mat.vertexColors = true;
    mat.color.set('#ffffff');
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWarm = { value: new THREE.Color(warm).multiplyScalar(k) };
      sh.vertexShader = 'attribute float aHeat;\nvarying float vHeat;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHeat = aHeat;');
      sh.fragmentShader = 'uniform vec3 uWarm;\nvarying float vHeat;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWarm * vHeat;');
    };
    return mat;
  };

  const PINK = C('#c95d66'), PALE = C('#efd2cf'), DEEP = C('#a8434f');
  const TRANS = C('#d6a7a6'), FIBW = C('#cdc4c0'), WARMC = C('#eea489');
  const SCAR_M = C('#8f8783'), SCAR_L = C('#e2ddd8');
  const CUT_C = C('#d9737c'), CUT_E = C('#a9424f'), PERI = C('#f0d4d2'), SEPT = C('#bfb5b1');
  const RING_H = 0.55; // intensidad del anillo cálido en el margen
  const ringAt = (d) => gauss(d - 0.01, 0.03);

  // ------------------------------------------------------------ Fibras del vientre (fruncidas y reemplazadas por la cicatriz)
  reseed(601);
  const fibs = [];
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const NF = 230;
  const sinkAt = (D) => 0.028 * Math.exp(-Math.pow(Math.max(D, 0) / 0.2, 2));
  for (let i = 0; i < NF; i++) {
    const r = 0.5 + 0.5 * Math.pow(rnd(), 0.35);
    const th = rnd() * Math.PI * 2;
    const jit = rnd(), ph = rnd() * 10;
    const fRad = 0.056 * (0.8 + 0.4 * jit);
    const dth = wrap(th - thc);
    const sr = rnd(), sl = rnd();
    // algunas fibras alineadas con la cicatriz quedan fibrosadas en un tramo más largo
    const streak = Math.abs(dth) < 0.6 && sr < 0.15 ? 0.08 + 0.2 * sl : 0;
    const sA = S0 - 0.012 + rnd() * 0.035;
    const K = Math.round((SCUT - sA) * 120);
    const P = [], D = [];
    for (let k = 0; k <= K; k++) {
      const s = sA + ((SCUT - sA) * k) / K;
      // Fruncido: la cicatriz tira de las fibras vecinas hacia su eje
      const bump = Math.exp(-Math.pow((s - SC) / 0.18, 2));
      const pull = 0.62 * bump * Math.exp(-Math.pow(dth / 1.1, 2)) * ss(r, 0.55, 1.0);
      const t2 = thc + dth * (1 - pull);
      let rr = r;
      let un = Math.sin(t2) * rr + 0.012 * Math.sin(ph + s * 24);
      let ub = Math.cos(t2) * rr + 0.012 * Math.cos(ph * 1.3 + s * 21);
      let p = place(s, un, ub);
      const [xw, yw, zw] = surfC(p.x, p.y, p.z);
      const d = scarBase(xw, yw, zw);
      // hundimiento suave hacia la cicatriz (la cicatriz retrae el tejido)
      const sk = (sinkAt(d) / belly(s)) * ss(r, 0.6, 1.0);
      if (sk > 1e-4) {
        const f = (r - sk) / r;
        p = place(s, un * f, ub * f);
      }
      P.push(p);
      D.push(d);
    }
    const IN = -0.05;
    let k = 0;
    while (k <= K) {
      while (k <= K && D[k] < IN) k++;
      if (k > K) break;
      const a = k;
      while (k <= K && D[k] >= IN) k++;
      const b = k - 1;
      const a2 = Math.max(0, a - 1), b2 = Math.min(K, b + 1);
      if (b2 - a2 < 3) continue;
      const pts = P.slice(a2, b2 + 1);
      const rad = [], col = [], ht = [];
      for (let m = a2; m <= b2; m++) {
        const s = sA + ((SCUT - sA) * m) / K;
        let rr = fRad * (0.45 + (0.55 * belly(s)) / RMAX);
        const eJ = s - sA;
        if (eJ < 0.03) rr *= 0.25 + 0.75 * (eJ / 0.03);
        const d = D[m];
        const fib = 1 - ss(d, -0.01, 0.1 + streak * ss(r, 0.75, 0.95));
        const inner = ss(-d, 0.0, 0.05);
        rr *= 1 - 0.25 * fib;
        if (m === 0) rr *= 0.05;
        if ((m === a2 && a2 > 0) || (m === b2 && b2 < K)) rr *= 0.55;
        const c = PINK.clone();
        c.lerp(PALE, (1 - ss(s, S0 - 0.01, S0 + 0.07)) * 0.85);
        c.lerp(TRANS, 0.85 * fib);
        c.lerp(FIBW, inner);
        const w = ringAt(d) * ss(r, 0.8, 0.97);
        c.lerp(WARMC, 0.22 * w);
        rad.push(rr);
        col.push(c);
        ht.push(RING_H * w);
      }
      fibs.push(tubeArr(pts, 5, rad, col, ht, 1.15));
    }
  }

  // ------------------------------------------------------------ Núcleo (relleno) con un bolsillo bajo la cicatriz
  const core = (() => {
    const NS = 110, NR = 48;
    const sa = S0 - 0.015, sb = SCUT;
    const pos = [], col = [];
    for (let i = 0; i <= NS; i++) {
      const s = sa + ((sb - sa) * i) / NS;
      const kc = 0.82 * Math.sqrt(ss(s, sa, sa + 0.05));
      for (let j = 0; j <= NR; j++) {
        const th = (j / NR) * Math.PI * 2;
        let k2 = kc;
        let p = place(s, Math.sin(th) * k2, Math.cos(th) * k2);
        for (let t = 0; t < 14 && scarCap(p.x, p.y, p.z) < 0.03; t++) {
          k2 *= 0.9;
          p = place(s, Math.sin(th) * k2, Math.cos(th) * k2);
        }
        pos.push(p.x, p.y, p.z);
        col.push(DEEP.r, DEEP.g, DEEP.b);
      }
    }
    const idx = [];
    for (let i = 0; i < NS; i++)
      for (let j = 0; j < NR; j++) {
        const a = i * (NR + 1) + j, b = (i + 1) * (NR + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();

  // ------------------------------------------------------------ Cara de corte: fascículos (Voronoi) + sección de la cicatriz
  const cutFace = (() => {
    reseed(611);
    const vf = [], vF = [];
    const jg = (g, out, lim) => {
      for (let y = -1.3; y <= 1.3; y += g)
        for (let x = -1.3; x <= 1.3; x += g) {
          const px = x + (rnd() - 0.5) * g * 0.8, py = y + (rnd() - 0.5) * g * 0.8;
          if (Math.hypot(px, py) < lim) out.push(px, py);
        }
    };
    jg(0.1, vf, 1.2);
    jg(0.38, vF, 1.3);
    // celdas de la sección cicatricial: haces de colágeno entrelazados, con estrías en direcciones al azar
    const vS = [];
    for (let y = -1.4; y <= 1.4; y += 0.13)
      for (let x = -1.4; x <= 1.4; x += 0.13) {
        const u = x + (rnd() - 0.5) * 0.1, v = y + (rnd() - 0.5) * 0.1;
        const a = rnd() * Math.PI, f = 40 + rnd() * 30, p = rnd() * 6, dot = rnd() < 0.12, t = (rnd() - 0.5) * 0.12;
        const P = place(SCUT, u, v);
        if (scarCap(P.x, P.y, P.z) < 0.15) vS.push({ u, v, a, f, p, dot, t });
      }
    const near2 = (arr, u, v) => {
      let d1 = 1e9, d2 = 1e9;
      for (let q = 0; q < arr.length; q += 2) {
        const dx = arr[q] - u, dy = arr[q + 1] - v;
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      return [Math.sqrt(d1), Math.sqrt(d2)];
    };
    const NG = 210, UM = 1.4;
    const pos = [], col = [], ht = [], ok = [];
    const c = new THREE.Color();
    for (let iy = 0; iy <= NG; iy++) {
      const v = -UM + (2 * UM * iy) / NG;
      for (let ix = 0; ix <= NG; ix++) {
        const u = -UM + (2 * UM * ix) / NG;
        const P0 = place(SCUT, u, v);
        const rho = Math.hypot(u, v);
        const dS = scarCap(P0.x, P0.y, P0.z);
        if (globalThis.__PROBE) { const o = (globalThis.__PROBE_OUT ||= { neg: 0, min: 9, at: null }); if (dS < 0) o.neg++; if (dS < o.min) { o.min = dS; o.at = [u, v, ...surfC(P0.x, P0.y, P0.z)]; } }
        const inside = rho <= 1.04 || dS < 0;
        ok.push(inside);
        let h = 0, heat = 0;
        if (dS < 0) {
          let b1 = 1e9, b2 = 1e9, bi = 0;
          for (let q = 0; q < vS.length; q++) {
            const dx = vS[q].u - u, dy = vS[q].v - v;
            const d = dx * dx + dy * dy;
            if (d < b1) {
              b2 = b1;
              b1 = d;
              bi = q;
            } else if (d < b2) b2 = d;
          }
          const cs = vS[bi];
          const e = ss(Math.sqrt(b2) - Math.sqrt(b1), 0.0, 0.02);
          const st = cs.dot
            ? 0.5 + 0.5 * Math.sin(cs.f * (u - cs.u)) * Math.sin(cs.f * (v - cs.v))
            : 0.5 + 0.5 * Math.sin(cs.f * (u * Math.cos(cs.a) + v * Math.sin(cs.a)) + cs.p);
          c.copy(SCAR_M).lerp(SCAR_L, Math.min(1, 0.1 + 0.25 * e + 0.55 * st * e + cs.t));
          const m = ss(dS, -0.06, 0);
          c.lerp(TRANS, 0.55 * m);
          const w = gauss(dS + 0.012, 0.022);
          c.lerp(WARMC, 0.2 * w);
          heat = RING_H * 0.8 * w;
          h = 0.003 + 0.005 * st * e;
        } else {
          const [d1] = near2(vf, u, v);
          const [D1, D2] = near2(vF, u, v);
          const cell = ss(d1, 0.0, 0.075);
          c.copy(CUT_C).lerp(CUT_E, cell * 0.75);
          const near = Math.exp(-dS / 0.25);
          const thr = 0.013 + 0.03 * Math.exp(-dS / 0.18);
          const peri = 1 - ss(D2 - D1, thr * 0.5, thr);
          c.lerp(PERI, 0.85 * peri);
          // fibrosis que se extiende por los tabiques cerca de la cicatriz
          c.lerp(SEPT, 0.85 * near * peri);
          c.lerp(TRANS, 0.45 * Math.exp(-dS / 0.06));
          const w = gauss(dS - 0.012, 0.022);
          c.lerp(WARMC, 0.2 * w);
          heat = RING_H * 0.8 * w;
          h = 0.009 * (1 - cell) - 0.004 * peri;
        }
        P0.addScaledVector(TC, h);
        pos.push(P0.x, P0.y, P0.z);
        col.push(c.r, c.g, c.b);
        ht.push(heat);
      }
    }
    const idx = [];
    const W = NG + 1;
    for (let iy = 0; iy < NG; iy++)
      for (let ix = 0; ix < NG; ix++) {
        const a = iy * W + ix, b = a + 1, d = a + W, cc = d + 1;
        if (!(ok[a] && ok[b] && ok[cc] && ok[d])) continue;
        idx.push(a, b, cc, a, cc, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aHeat', new THREE.Float32BufferAttribute(ht, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();

  // ------------------------------------------------------------ Masa cicatricial (SDF → malla)
  function polygonize(sdf, bmin, bmax, h) {
    const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1;
    const ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1;
    const nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
    const F = new Float32Array(nx * ny * nz);
    let q = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[q++] = sdf(bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h);
    const I = (i, j, k) => i + nx * (j + ny * k);
    const cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const Ci = (i, j, k) => i + cx * (j + cy * k);
    const vid = new Int32Array(cx * cy * cz).fill(-1);
    const pos = [];
    const co = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const ed = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const v = new Float32Array(8);
    for (let k = 0; k < cz; k++)
      for (let j = 0; j < cy; j++)
        for (let i = 0; i < cx; i++) {
          let neg = 0;
          for (let c = 0; c < 8; c++) {
            v[c] = F[I(i + co[c][0], j + co[c][1], k + co[c][2])];
            if (v[c] < 0) neg++;
          }
          if (neg === 0 || neg === 8) continue;
          let sx = 0, sy = 0, sz = 0, n = 0;
          for (const [a, b] of ed) {
            if (v[a] < 0 !== v[b] < 0) {
              const t = v[a] / (v[a] - v[b]);
              sx += co[a][0] + t * (co[b][0] - co[a][0]);
              sy += co[a][1] + t * (co[b][1] - co[a][1]);
              sz += co[a][2] + t * (co[b][2] - co[a][2]);
              n++;
            }
          }
          vid[Ci(i, j, k)] = pos.length / 3;
          pos.push(bmin[0] + (i + sx / n) * h, bmin[1] + (j + sy / n) * h, bmin[2] + (k + sz / n) * h);
        }
    const idx = [];
    const quad = (a, b, c, d, flip) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) idx.push(a, c, b, a, d, c);
      else idx.push(a, b, c, a, c, d);
    };
    for (let k = 1; k < nz - 1; k++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const a = F[I(i, j, k)] < 0;
          if (a === F[I(i + 1, j, k)] < 0) continue;
          quad(vid[Ci(i, j - 1, k - 1)], vid[Ci(i, j, k - 1)], vid[Ci(i, j, k)], vid[Ci(i, j - 1, k)], !a);
        }
    for (let k = 1; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const a = F[I(i, j, k)] < 0;
          if (a === F[I(i, j + 1, k)] < 0) continue;
          quad(vid[Ci(i - 1, j, k - 1)], vid[Ci(i - 1, j, k)], vid[Ci(i, j, k)], vid[Ci(i, j, k - 1)], !a);
        }
    for (let k = 0; k < nz - 1; k++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const a = F[I(i, j, k)] < 0;
          if (a === F[I(i, j, k + 1)] < 0) continue;
          quad(vid[Ci(i - 1, j - 1, k)], vid[Ci(i, j - 1, k)], vid[Ci(i, j, k)], vid[Ci(i - 1, j, k)], !a);
        }
    // Quitar islas sueltas (componentes conexas chicas)
    const nv = pos.length / 3;
    const par = new Int32Array(nv);
    for (let i = 0; i < nv; i++) par[i] = i;
    const find = (a) => {
      while (par[a] !== a) {
        par[a] = par[par[a]];
        a = par[a];
      }
      return a;
    };
    const uni = (a, b) => {
      a = find(a);
      b = find(b);
      if (a !== b) par[a] = b;
    };
    for (let t = 0; t < idx.length; t += 3) {
      uni(idx[t], idx[t + 1]);
      uni(idx[t], idx[t + 2]);
    }
    const cnt = new Int32Array(nv);
    for (let i = 0; i < nv; i++) cnt[find(i)]++;
    const keep = [];
    for (let t = 0; t < idx.length; t += 3) if (cnt[find(idx[t])] >= 200) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    const nrm = new Float32Array(pos.length);
    const e = h * 0.5;
    for (let p = 0; p < pos.length; p += 3) {
      const x = pos[p], y = pos[p + 1], z = pos[p + 2];
      const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
      const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
      const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
      const l = Math.hypot(gx, gy, gz) || 1;
      nrm[p] = gx / l;
      nrm[p + 1] = gy / l;
      nrm[p + 2] = gz / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(keep);
    return g;
  }
  // caja de la cicatriz a partir de muestras en coordenadas de superficie
  const bmin = [1e9, 1e9, 1e9], bmax = [-1e9, -1e9, -1e9];
  for (let i = 0; i <= 8; i++)
    for (let j = 0; j <= 6; j++)
      for (let k = 0; k <= 6; k++) {
        const p = W2P(-1.75 + ((XCUT + 0.05 + 1.75) * i) / 8, -0.85 + (0.95 * j) / 6, -1.0 + (2.0 * k) / 6);
        bmin[0] = Math.min(bmin[0], p.x);
        bmin[1] = Math.min(bmin[1], p.y);
        bmin[2] = Math.min(bmin[2], p.z);
        bmax[0] = Math.max(bmax[0], p.x);
        bmax[1] = Math.max(bmax[1], p.y);
        bmax[2] = Math.max(bmax[2], p.z);
      }
  for (let a = 0; a < 3; a++) {
    bmin[a] -= 0.06;
    bmax[a] += 0.06;
  }
  const scarGeo = polygonize(scarSDF, bmin, bmax, 0.024);

  // Veta del colágeno: función de corriente sobre la superficie (xw a lo largo, zw a lo ancho) con varios nudos chicos.
  reseed(621);
  const VORT = [];
  for (let i = 0; i < 12; i++) {
    const vx = -0.92 + (1.8 * (i + 0.2 + rnd() * 0.6)) / 12;
    const vz = (rnd() * 2 - 1) * 0.3;
    const S = (rnd() < 0.5 ? -1 : 1) * (0.18 + 0.02 * rnd());
    const R = 0.12 + 0.06 * rnd();
    VORT.push([vx, vz, S, R]);
  }
  const psi = (xw, zw) => {
    let p = zw + 0.018 * Math.sin(xw * 11 + zw * 5) + 0.012 * Math.sin(xw * 23 - zw * 17 + 1.3);
    for (const [vx, vz, S, R] of VORT) {
      const dx = xw - vx, dz = zw - vz;
      p += S * Math.exp(-(dx * dx + dz * dz) / (R * R));
    }
    return p;
  };
  {
    const p = scarGeo.attributes.position;
    const col = new Float32Array(p.count * 3), ht = new Float32Array(p.count), w2 = new Float32Array(p.count * 2);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 0.5 + 0.5 * Math.sin(x * 6.1 + z * 4.3) * Math.sin(y * 5.7 - x * 3.1 + 1.7);
      c.copy(SCAR_M).lerp(SCAR_L, 0.3 + 0.45 * n);
      const [xw, , zw] = surfC(x, y, z);
      const fp = footprint(xw, zw);
      // franja de transición rosa-grisácea: tejido que reemplaza al músculo, no un parche pegado
      const tb = ss(fp, -0.07, -0.005);
      c.lerp(TRANS, 0.85 * tb);
      const w = ringAt(fp + 0.02);
      c.lerp(WARMC, 0.2 * w);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      ht[i] = RING_H * w;
      w2[i * 2] = xw;
      w2[i * 2 + 1] = zw;
    }
    scarGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scarGeo.setAttribute('aHeat', new THREE.BufferAttribute(ht, 1));
    scarGeo.setAttribute('aW', new THREE.BufferAttribute(w2, 2));
  }

  // ------------------------------------------------------------ Haces cicatriciales en relieve: apretados, cruzados y enredados
  // Recorren la veta (con sus nudos) pero con desvíos al azar que cambian cada pocos pasos; las puntas se hunden en la masa.
  const flow2 = (xw, zw) => {
    const e = 0.004;
    const gx = (psi(xw + e, zw) - psi(xw - e, zw)) / (2 * e), gz = (psi(xw, zw + e) - psi(xw, zw - e)) / (2 * e);
    const l = Math.hypot(gx, gz) || 1;
    return [gz / l, -gx / l];
  };
  const topOK = (xw, zw) => xw < XCUT - 0.05 && footprint(xw, zw) < -0.035;
  const walk2 = (steps, step) => {
    for (let tries = 0; tries < 40; tries++) {
      let xw = (rnd() * 2 - 1) * 0.92, zw = (rnd() * 2 - 1) * 0.42;
      if (!topOK(xw, zw)) continue;
      const sgn = rnd() < 0.5 ? 1 : -1;
      const base = (rnd() * 2 - 1) * 0.35;
      let off = base, target = base, next = 0;
      const pts = [[xw, zw]];
      for (let k = 0; k < steps; k++) {
        if (k >= next) {
          target = base + (rnd() < 0.5 ? -1 : 1) * (0.61 + 0.44 * rnd());
          next = k + 3 + Math.floor(rnd() * 2);
        }
        off += (target - off) * 0.3;
        let [dx, dz] = flow2(xw, zw);
        dx *= sgn;
        dz *= sgn;
        const co = Math.cos(off), si = Math.sin(off);
        const x2 = xw + (dx * co - dz * si) * step, z2 = zw + (dx * si + dz * co) * step;
        if (!topOK(x2, z2)) break;
        xw = x2;
        zw = z2;
        pts.push([xw, zw]);
      }
      if (pts.length >= 7) return pts;
    }
    return null;
  };
  const outAt = (xw, zw) => W2P(xw, 0.1, zw).sub(W2P(xw, 0.0, zw)).normalize();
  reseed(631);
  const tangles = [];
  for (let i = 0; i < 58; i++) {
    const twisted = i % 8 === 3;
    const path = walk2(10 + Math.floor(rnd() * 14), 0.03);
    if (!path) continue;
    const n = path.length;
    const r0 = twisted ? 0.032 + 0.008 * rnd() : 0.022 + 0.016 * rnd();
    const tone = 0.5 + 0.5 * rnd();
    const strands = twisted ? 3 : 1;
    const ph0 = rnd() * 6.28;
    for (let st = 0; st < strands; st++) {
      const pts = [], rad = [], col = [], ht = [], ups = [];
      for (let k = 0; k < n; k++) {
        const [xw, zw] = path[k];
        const u = k / (n - 1);
        const taper = Math.min(1, Math.sin(Math.PI * u) * 2.2 + 0.1);
        // las puntas se hunden en la masa (no quedan "gusanos" apoyados encima)
        const dive = (1 - Math.min(1, Math.sin(Math.PI * u) * 2.5)) * r0 * 1.3;
        const O = outAt(xw, zw);
        let P;
        if (twisted) {
          const [xa, za] = path[Math.max(0, k - 1)], [xb, zb] = path[Math.min(n - 1, k + 1)];
          const T = W2P(xb, 0, zb).sub(W2P(xa, 0, za)).normalize();
          const S = new THREE.Vector3().crossVectors(T, O).normalize();
          const ang = ph0 + k * 1.0 + (st * Math.PI * 2) / 3;
          const rr = r0 * 0.5 * taper;
          P = W2P(xw, capH(xw, zw) + r0 * 0.2 - dive, zw).addScaledVector(S, Math.cos(ang) * rr).addScaledVector(O, Math.sin(ang) * rr * 0.7);
          rad.push(r0 * 0.5 * taper);
        } else {
          P = W2P(xw, capH(xw, zw) - r0 * 0.05 - dive, zw);
          rad.push(r0 * taper);
        }
        pts.push(P);
        ups.push(O);
        col.push(SCAR_M.clone().lerp(SCAR_L, Math.min(1, tone + (twisted ? 0.12 * st : 0))));
        ht.push(0);
      }
      if (twisted) tangles.push(tubeArr(pts, 6, rad, col, ht, 3));
      else tangles.push(tubeArr(pts, 7, rad, col, ht, 1.6, ups, 1.25, 0.7));
    }
  }

  // ------------------------------------------------------------ Bridas: adherencias que salen del borde y cruzan sobre el músculo sano
  const BRIDA = C('#cdb8b4');
  const bridles = [];
  const edgeFrom = (phi) => {
    // marcha desde el centro de la cicatriz hasta su borde en la dirección phi
    const cx = Math.cos(phi), cz = Math.sin(phi);
    let t = 0;
    while (t < 1.6 && footprint(cx * t, cz * t) < -0.05) t += 0.01;
    return [cx * t, cz * t];
  };
  [
    [95, 60, 0.5],
    [68, 115, 0.36],
    [-84, -55, 0.55],
    [-110, -130, 0.4],
    [152, 150, 0.34],
    [-152, -158, 0.42],
    [32, 66, 0.3],
  ].forEach(([phiD, dirD, Lb], bi) => {
    const [x0, z0] = edgeFrom((phiD * Math.PI) / 180);
    const dir = (dirD * Math.PI) / 180;
    const K = 18;
    const bend = (bi % 2 ? 1 : -1) * 0.18;
    const pts = [], ups = [], rad = [], col = [], ht = [];
    for (let k = 0; k <= K; k++) {
      const u = k / K;
      const a = dir + bend * u;
      const l = -0.1 + (Lb + 0.1) * u;
      const xw = x0 + Math.cos(a) * l, zw = z0 + Math.sin(a) * l;
      if (xw > XCUT - 0.04) break;
      const fp = footprint(xw, zw);
      // aplastada contra las fibras (o contra la cicatriz en su raíz)
      const onFib = 0.016 - sinkAt(fp) + 0.004;
      const yw = THREE.MathUtils.lerp(capH(xw, zw) + 0.003, onFib, ss(fp, -0.05, 0.02));
      pts.push(W2P(xw, yw, zw));
      ups.push(outAt(xw, zw));
      const rr = 0.02 * (1.3 - 0.5 * u) * (u > 0.75 ? Math.max(0.35, Math.sqrt((1 - u) / 0.25)) : 1);
      rad.push(rr);
      // se funde con el rosa al final: se lee como tejido que se pega, no como una espina
      col.push(BRIDA.clone().lerp(SCAR_L, 0.3 * (1 - u)).lerp(TRANS, ss(u, 0.6, 1.0) * 0.8));
      ht.push(0.3 * RING_H * gauss(fp - 0.015, 0.05));
    }
    if (pts.length >= 5) bridles.push(tubeArr(pts, 8, rad, col, ht, 2.5, ups, 1.7, 0.45));
  });

  // ------------------------------------------------------------ Tendón (izquierda): cuerda lisa + fibras ceñidas
  reseed(661);
  const tendons = [];
  const SJ = S0 + 0.05;
  const tipF = (s) => ss(s, 0.0, 0.06);
  const WHITE = C('#ffffff');
  {
    const K = 40;
    const pts = [], rad = [], col = [], ht = [];
    for (let k = 0; k <= K; k++) {
      const s = (SJ * k) / K;
      pts.push(fr(s).P);
      const eo = k / K;
      const cap = eo < 0.04 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - eo / 0.04, 2))) : 1;
      rad.push(RT * 0.6 * (0.62 + 0.38 * tipF(s)) * cap * (k === 0 ? 0.02 : 1));
      col.push(WHITE);
      ht.push(0);
    }
    tendons.push(tubeArr(pts, 24, rad, col, ht, 1.2));
  }
  for (let i = 0; i < 42; i++) {
    const r = 0.85 * Math.sqrt(rnd());
    const th = rnd() * Math.PI * 2;
    const fRad = 0.038 * (0.8 + 0.4 * rnd());
    const a = rnd() * 0.006, b = SJ + rnd() * 0.02;
    const ph = rnd() * 10;
    const K = 30;
    const pts = [], rad = [], col = [], ht = [];
    for (let k = 0; k <= K; k++) {
      const s = a + ((b - a) * k) / K;
      const { P, N } = fr(s);
      const thh = th + s * 2.2;
      const flare = 1 + 0.18 * ss(s, S0 - 0.05, SJ);
      const rr = r * RT * (0.62 + 0.38 * tipF(s)) * flare;
      P.addScaledVector(N, Math.sin(thh) * rr + 0.004 * Math.sin(ph + s * 40)).addScaledVector(Z, Math.cos(thh) * rr * 0.78);
      pts.push(P);
      const u = k / K;
      rad.push(fRad * Math.min(1, 0.15 + Math.min(u, 1 - u) / 0.06) * (0.65 + 0.35 * tipF(s)));
      col.push(WHITE);
      ht.push(0);
    }
    tendons.push(tubeArr(pts, 5, rad, col, ht, 1.2));
  }

  // Aponeurosis: el tendón se abre en una lámina que sube por la cara superior del vientre
  const APO = C('#e3e9f2'), APO_TIP = C('#efd6d6');
  const fibTop = (s) => 0.036 + 0.022 * (1 - belly(s) / RMAX);
  const aponeurosis = (sJ, Lap, thC, thW, nF, seedV) => {
    reseed(seedV);
    const geos = [];
    const lenAt = (uu) => Lap * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(uu), 1.7)), 0.55);
    const wS = (s) => Math.pow(Math.min(1, (RT * 1.2) / belly(s)), 0.5);
    const at = (s, th, d) => {
      const a = belly(s);
      const { P, N } = fr(s);
      return P.addScaledVector(N, Math.sin(th) * (a + d)).addScaledVector(Z, Math.cos(th) * (a * FLAT + d));
    };
    {
      const NU = 30, NV = 40;
      const pos = [], col = [];
      const cc = new THREE.Color();
      for (let v = 0; v <= NV; v++) {
        const t = v / NV;
        for (let u = 0; u <= NU; u++) {
          const uu = (u / NU) * 2 - 1;
          const s = sJ + lenAt(uu) * t;
          const th = thC + uu * thW * wS(s);
          const Q = at(s, th, fibTop(s) + 0.004 + 0.008 * Math.sqrt(Math.max(0, 1 - uu * uu)));
          pos.push(Q.x, Q.y, Q.z);
          cc.copy(APO).lerp(APO_TIP, ss(t, 0.5, 1) * 0.8);
          col.push(cc.r, cc.g, cc.b);
        }
      }
      const idx = [];
      for (let v = 0; v < NV; v++)
        for (let u = 0; u < NU; u++) {
          const a = v * (NU + 1) + u, b = (v + 1) * (NU + 1) + u;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const n = g.attributes.position.count;
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('aHeat', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
      geos.push(g);
    }
    for (let f = 0; f < nF; f++) {
      const uu = Math.max(-0.98, Math.min(0.98, -1 + (2 * (f + 0.5)) / nF + (rnd() - 0.5) * 0.06));
      const len = lenAt(uu) * (0.88 + 0.14 * rnd());
      const fR = 0.022 * (0.85 + 0.3 * rnd());
      const K = 26;
      const pts = [], rad = [], col = [], ht = [];
      for (let k = 0; k <= K; k++) {
        const u = k / K;
        const s = sJ - 0.02 + (0.02 + len) * u;
        pts.push(at(s, thC + uu * thW * wS(s), fibTop(s) + 0.014));
        rad.push(fR * (u > 0.85 ? Math.sqrt(Math.max(0.03, (1 - u) / 0.15)) : 1) * (k === K ? 0.05 : 1));
        col.push(APO.clone().lerp(APO_TIP, ss(u, 0.5, 1) * 0.8));
        ht.push(0);
      }
      geos.push(tubeArr(pts, 5, rad, col, ht, 1.3));
    }
    return mergeGeometries(geos);
  };
  const apoGeo = aponeurosis(S0 - 0.03, 0.25, 1.2, 0.62, 12, 671);

  // ------------------------------------------------------------ Materiales y montaje
  const fibMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color('#ffb0b0') }), '#ff6a3d', 0.75);
  const coreMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const cutMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.36, clearcoat: 0.9, clearcoatRoughness: 0.18, sheen: 0.3, sheenColor: new THREE.Color('#ffd0d0') }), '#ff6a3d', 0.7);
  const scarMat = new THREE.MeshPhysicalMaterial({ roughness: 0.58, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.75, vertexColors: true });
  scarMat.onBeforeCompile = (sh) => {
    sh.uniforms.uWarm = { value: new THREE.Color('#ff6a3d').multiplyScalar(0.6) };
    sh.uniforms.uV = { value: VORT.map(([x, z, S, R]) => new THREE.Vector4(x, z, S, R)) };
    sh.uniforms.uLam = { value: 0.1 };
    sh.uniforms.uBump = { value: 1.0 };
    sh.vertexShader =
      'attribute float aHeat;\nattribute vec2 aW;\nvarying float vHeat;\nvarying vec2 vW;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHeat = aHeat;\n vW = aW;');
    sh.fragmentShader =
      `uniform vec3 uWarm;\nuniform vec4 uV[${VORT.length}];\nuniform float uLam;\nuniform float uBump;\nvarying float vHeat;\nvarying vec2 vW;
float psiF(vec2 w) {
  float p = w.y + 0.018 * sin(w.x * 11.0 + w.y * 5.0) + 0.012 * sin(w.x * 23.0 - w.y * 17.0 + 1.3);
  for (int i = 0; i < ${VORT.length}; i++) { vec2 d = w - uV[i].xy; p += uV[i].z * exp(-dot(d, d) / (uV[i].w * uV[i].w)); }
  return p;
}
vec3 grainPerturb(vec3 sp, vec3 sn, vec2 dH, float fd) {
  vec3 sx = normalize(dFdx(sp)); vec3 sy = normalize(dFdy(sp));
  vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx);
  float det = dot(sx, r1) * fd;
  vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
  return normalize(abs(det) * sn - g);
}
` +
      sh.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  float gPh = psiF(vW) / uLam + 0.35 * sin(vW.x * 7.0 + vW.y * 3.0);
  float gSt = 0.5 + 0.5 * sin(6.2831853 * gPh);
  gSt = smoothstep(0.08, 0.92, gSt);
  float gAA = clamp(1.3 - fwidth(gPh) * 5.0, 0.0, 1.0);
  gSt = mix(0.55, gSt, gAA);
  float gBr = 0.5 + 0.5 * sin(vW.x * 34.0 + vW.y * 9.0 + 2.0 * sin(vW.y * 21.0)) * sin(vW.y * 27.0 - vW.x * 13.0 + 1.7);
  gSt *= mix(1.0, smoothstep(0.15, 0.45, gBr), 0.8 * gAA);
  diffuseColor.rgb *= mix(0.62, 1.0, gSt);`
        )
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  normal = grainPerturb(-vViewPosition, normal, vec2(dFdx(gSt), dFdy(gSt)) * uBump, faceDirection);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWarm * vHeat;');
  };
  const tangleMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.85 }), '#ff6a3d', 0.6);
  const bridleMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#ffffff') }), '#ff6a3d', 0.6);
  // Tendón: blanco azulado con brillo (contrasta sobre fondo claro); la punta apenas se desvanece
  const tendonMat = new THREE.MeshPhysicalMaterial({ color: '#d5dbe4', roughness: 0.26, metalness: 0.0, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 1, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.35 });
  tendonMat.transparent = true;
  tendonMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vOX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOX = position.x;');
    sh.fragmentShader = 'varying float vOX;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= mix(0.6, 1.0, smoothstep(-4.35, -4.15, vOX));');
  };
  const aponMat = new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.14, sheen: 1, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4, vertexColors: true, side: THREE.DoubleSide });

  const body = new THREE.Group();
  body.add(new THREE.Mesh(core, coreMat));
  body.add(new THREE.Mesh(mergeGeometries(fibs), fibMat));
  body.add(new THREE.Mesh(cutFace, cutMat));
  body.add(new THREE.Mesh(scarGeo, scarMat));
  body.add(new THREE.Mesh(mergeGeometries(tangles), tangleMat));
  if (bridles.length) body.add(new THREE.Mesh(mergeGeometries(bridles), bridleMat));
  body.add(new THREE.Mesh(mergeGeometries(tendons), tendonMat));
  body.add(new THREE.Mesh(apoGeo, aponMat));

  const root = new THREE.Group();
  body.rotation.set(0, -0.38, 0.22);
  root.add(body);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body);

  // Brillo cálido sutil sobre el margen de la cicatriz
  const h1 = halo('#ff9a6b', 1.7, 0.22);
  h1.position.copy(W2P(0.05, 0.12, 0.0));
  // body.add(h1);

  let tris = 0;
  body.traverse((o) => {
    if (o.isMesh && o.geometry.index) tris += o.geometry.index.count / 3;
  });
  console.log('fibrosis tris', tris);

  const sh = halo('#0a1530', 1, 0.22);
  const bw = box.max.x - box.min.x;
  sh.scale.set(bw * 0.88, 0.75, 1);
  sh.position.set((box.min.x + box.max.x) / 2 - 0.1, box.min.y - 0.12, (box.min.z + box.max.z) / 2 - 0.4);
  root.add(sh);
  const look = V((box.min.x + box.max.x) / 2 + 0.6, (box.min.y + box.max.y) / 2 - 0.1, 0);
  const out = { root, cam: [look.x + 3.6, look.y + 4.0, 11], look: [look.x, look.y, look.z], zoom: 0.9, shadow: false };
  // DBG-START
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('dbg') : null;
    const sc = W2P(0, 0, 0).applyMatrix4(body.matrixWorld), cc = fr(SCUT).P.applyMatrix4(body.matrixWorld);
    console.log('scar', sc.toArray().map((v) => v.toFixed(2)).join(','), 'cut', cc.toArray().map((v) => v.toFixed(2)).join(','), 'box', box.min.toArray().map((v) => v.toFixed(2)).join(','), box.max.toArray().map((v) => v.toFixed(2)).join(','));
    if (q) Object.assign(out, JSON.parse(q));
  } catch (e) {
    console.log('dbg err', e.message);
  }
  // DBG-END
  return out;
}
