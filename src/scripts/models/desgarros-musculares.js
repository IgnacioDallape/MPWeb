// Desgarro muscular — vientre muscular fusiforme (gemelo / isquiotibial) aislado, con tendones blancos en ambos extremos.
// En la cara anterior, a media altura del vientre, una rotura parcial: un grupo de fibras cortadas y retraídas
// que deja un hueco en V, con extremos deshilachados en acento cálido, fibras profundas intactas en el fondo
// y un pequeño hematoma rojo oscuro alojado en el hueco.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const ss = THREE.MathUtils.smoothstep;
  const Z = V(0, 0, 1);

  // ------------------------------------------------------------ Eje y perfil del músculo
  const axis = new THREE.CatmullRomCurve3([V(-4.4, -0.12), V(-2.8, 0.02), V(-1.1, 0.17), V(0.6, 0.15), V(2.3, -0.02), V(4.4, -0.18)], false, 'centripetal');
  const AX = 600;
  const AP = [], AN = [], AT = [];
  for (let k = 0; k <= AX; k++) {
    const s = k / AX;
    AP.push(axis.getPointAt(s));
    const t = axis.getTangentAt(s);
    AT.push(t);
    AN.push(V(-t.y, t.x, 0).normalize());
  }
  const fr = (s) => {
    const x = Math.min(AX, Math.max(0, s * AX));
    const k = Math.min(AX - 1, Math.floor(x));
    const f = x - k;
    return { P: AP[k].clone().lerp(AP[k + 1], f), N: AN[k].clone().lerp(AN[k + 1], f).normalize(), T: AT[k].clone().lerp(AT[k + 1], f).normalize() };
  };

  const S0 = 0.17, S1 = 0.84, RMAX = 1.02, RT = 0.23, FLAT = 0.84;
  const belly = (s) => {
    const t = (s - S0) / (S1 - S0);
    if (t <= 0 || t >= 1) return RT * 0.8;
    return RT * 0.8 + (RMAX - RT * 0.8) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.92)), 0.72);
  };
  // Punto del vientre en coordenadas normalizadas de la sección (un → N, ub → Z)
  const place = (s, un, ub) => {
    const { P, N } = fr(s);
    const a = belly(s);
    return P.addScaledVector(N, un * a).addScaledVector(Z, ub * a * FLAT);
  };

  // ------------------------------------------------------------ Desgarro
  const SC = 0.53; // centro de la rotura (a lo largo del eje)
  const G = 0.078; // semiancho máximo del hueco (en s)
  const T = 0.12; // profundidad: se rompen las fibras con proyección > T sobre la dirección de la cara rota
  const DN = 0.78, DB = Math.sqrt(1 - DN * DN); // cara rota: anterior y algo hacia arriba
  const PN = DB, PB = -DN; // dirección transversal (a lo ancho de la rotura)

  // ------------------------------------------------------------ Tubo con radio, color y "calor" por anillo
  function tube(pts, segs, radial, radF, colF, heatF) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const frames = curve.computeFrenetFrames(segs, false);
    const n = (segs + 1) * (radial + 1);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), ht = new Float32Array(n);
    const c = new THREE.Color();
    let p = 0;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const P = curve.getPointAt(u);
      const Nn = frames.normals[i], Bn = frames.binormals[i];
      const r = radF(u);
      colF(u, c);
      const h = heatF(u);
      for (let j = 0; j <= radial; j++) {
        const v = (j / radial) * Math.PI * 2;
        const sn = Math.sin(v), cs = -Math.cos(v);
        const nx = cs * Nn.x + sn * Bn.x, ny = cs * Nn.y + sn * Bn.y, nz = cs * Nn.z + sn * Bn.z;
        pos[p * 3] = P.x + r * nx;
        pos[p * 3 + 1] = P.y + r * ny;
        pos[p * 3 + 2] = P.z + r * nz;
        nor[p * 3] = nx;
        nor[p * 3 + 1] = ny;
        nor[p * 3 + 2] = nz;
        col[p * 3] = c.r;
        col[p * 3 + 1] = c.g;
        col[p * 3 + 2] = c.b;
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
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
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

  const C = (h) => new THREE.Color(h);
  const PINK = C('#c95d66'), PALE = C('#efd2cf'), WARM = C('#f26a4b'), HOT = C('#ff9c78'), BLOOD = C('#7e1a2c'), DEEP = C('#a8434f');

  // ------------------------------------------------------------ Fibras del vientre
  reseed(501);
  const fibs = [];
  const ends = [];
  const NF = 210;
  for (let i = 0; i < NF; i++) {
    const r = 0.5 + 0.5 * Math.pow(rnd(), 0.5);
    const th = rnd() * Math.PI * 2;
    const jit = rnd(), ph = rnd() * 10;
    const fRad = 0.056 * (0.8 + 0.4 * jit);
    const sA = S0 - 0.012 + rnd() * 0.035;
    const sB = S1 + 0.012 - rnd() * 0.035;
    const un0 = Math.sin(th) * r, ub0 = Math.cos(th) * r;
    const proj = un0 * DN + ub0 * DB;
    const pieces = [];
    if (proj > T) {
      const q = (proj - T) / (1 - T);
      const base = G * (0.4 + 0.6 * Math.sqrt(q));
      pieces.push({ a: sA, b: SC - base * (0.78 + 0.44 * rnd()), torn: 1, q });
      pieces.push({ a: SC + base * (0.78 + 0.44 * rnd()), b: sB, torn: -1, q });
    } else pieces.push({ a: sA, b: sB, torn: 0, q: 0 });

    for (const pc of pieces) {
      const sEnd = pc.torn === 1 ? pc.b : pc.a;
      const lateral = (rnd() - 0.5) * 2;
      const lift = 0.5 + rnd() * 0.8;
      const K = Math.max(10, Math.round((pc.b - pc.a) * 110));
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const s = pc.a + ((pc.b - pc.a) * k) / K;
        let un = un0 + 0.012 * Math.sin(ph + s * 24), ub = ub0 + 0.012 * Math.cos(ph * 1.3 + s * 21);
        if (pc.torn) {
          const e = Math.abs(s - sEnd);
          const f = Math.exp(-Math.pow(e / 0.05, 2));
          const f2 = Math.exp(-Math.pow(e / 0.022, 2));
          // Labio retraído: las fibras cortadas se abultan y se levantan hacia fuera; las puntas se abren
          const bul = 1 + 0.16 * pc.q * f;
          un = un * bul + DN * 0.1 * pc.q * lift * f2 + PN * 0.035 * lateral * f2;
          ub = ub * bul + DB * 0.1 * pc.q * lift * f2 + PB * 0.035 * lateral * f2;
        }
        pts.push(place(s, un, ub));
      }
      const S = (u) => pc.a + (pc.b - pc.a) * u;
      const radF = (u) => {
        const s = S(u);
        let r = fRad * (0.45 + 0.55 * belly(s) / RMAX);
        // extremos: cierre redondeado (rotura) o afinado (unión músculo-tendinosa)
        const capT = 0.014, capJ = 0.03;
        if (pc.torn) {
          const e = Math.abs(s - sEnd);
          if (e < capT) r *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - e / capT, 2))) * 0.9 + 0.1 * (e / capT);
        }
        const eJ = pc.torn === 1 ? s - pc.a : pc.torn === -1 ? pc.b - s : Math.min(s - pc.a, pc.b - s);
        if (eJ < capJ) r *= 0.25 + 0.75 * (eJ / capJ);
        if (u === 0 || u === 1) r *= 0.05;
        return r;
      };
      const colF = (u, c) => {
        const s = S(u);
        c.copy(PINK);
        const j = Math.max(1 - ss(s, S0 - 0.01, S0 + 0.07), ss(s, S1 - 0.07, S1 + 0.01));
        c.lerp(PALE, j * 0.85);
        if (pc.torn) {
          const e = Math.abs(s - sEnd);
          const w = Math.exp(-Math.pow(e / 0.03, 2)) * (0.65 + 0.35 * pc.q);
          c.lerp(WARM, w);
        } else {
          const w = Math.exp(-Math.pow((s - SC) / 0.07, 2)) * ss(proj, T - 0.3, T);
          c.lerp(DEEP, w * 0.7);
        }
      };
      const heatF = (u) => {
        if (!pc.torn) return 0;
        const e = Math.abs(S(u) - sEnd);
        return Math.exp(-Math.pow(e / 0.022, 2)) * (0.3 + 0.3 * pc.q);
      };
      fibs.push(tube(pts, Math.max(12, Math.round((pc.b - pc.a) * 95)), 5, radF, colF, heatF));
      if (pc.torn) ends.push({ s: sEnd, dir: pc.torn, un: un0, ub: ub0, q: pc.q, lateral, lift });
    }
  }

  // Hilachas: fibrillas finas que salen de los extremos rotos hacia el hueco
  reseed(541);
  const frays = [];
  for (const e of ends) {
    if (rnd() > 0.45) continue;
    const n = 1;
    for (let m = 0; m < n; m++) {
      const len = (0.2 + 0.4 * rnd()) * (G * (0.4 + 0.6 * e.q));
      const sa = e.s - e.dir * 0.016;
      const lat = (rnd() - 0.5) * 0.16;
      const up = 0.03 + rnd() * 0.09 * e.q;
      const ph = rnd() * 10;
      const ou = (rnd() - 0.5) * 0.05, ov = (rnd() - 0.5) * 0.05;
      const K = 14;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const t = k / K;
        const s = sa + e.dir * (0.016 + len) * t;
        const bul = 1 + 0.16 * e.q;
        const kk = Math.pow(t, 1.6);
        const un = (e.un + ou) * bul + DN * (0.1 * e.q * e.lift + up * kk) + PN * (0.035 * e.lateral + lat * kk + 0.015 * Math.sin(ph + t * 9));
        const ub = (e.ub + ov) * bul + DB * (0.1 * e.q * e.lift + up * kk) + PB * (0.035 * e.lateral + lat * kk + 0.015 * Math.sin(ph + t * 9));
        pts.push(place(s, un, ub));
      }
      const r0 = 0.013 + rnd() * 0.007;
      frays.push(
        tube(
          pts,
          16,
          4,
          (u) => r0 * (1 - 0.8 * u),
          (u, c) => c.copy(WARM).lerp(HOT, u),
          () => 0.85
        )
      );
    }
  }

  // ------------------------------------------------------------ Núcleo (relleno) con el fondo del hueco aplanado
  const core = (() => {
    const NS = 150, NR = 48;
    const sa = S0 - 0.015, sb = S1 + 0.015;
    const LIM = T - 0.1;
    const pos = [], col = [], ht = [];
    const c = new THREE.Color();
    for (let i = 0; i <= NS; i++) {
      const s = sa + ((sb - sa) * i) / NS;
      const kc = 0.82 * Math.sqrt(ss(s, sa, sa + 0.05) * (1 - ss(s, sb - 0.05, sb)));
      const w = 1 - ss(Math.abs(s - SC), G * 1.25, G * 2.2);
      for (let j = 0; j <= NR; j++) {
        const th = (j / NR) * Math.PI * 2;
        let un = Math.sin(th) * kc, ub = Math.cos(th) * kc;
        const pj = un * DN + ub * DB;
        let carved = 0;
        if (pj > LIM) {
          carved = (pj - LIM) * w;
          un -= DN * carved;
          ub -= DB * carved;
        }
        const P = place(s, un, ub);
        pos.push(P.x, P.y, P.z);
        c.copy(DEEP).lerp(BLOOD, ss(carved, 0.0, 0.05));
        col.push(c.r, c.g, c.b);
        ht.push(0.12 * ss(carved, 0, 0.05));
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
    g.setAttribute('aHeat', new THREE.Float32BufferAttribute(ht, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();

  // ------------------------------------------------------------ Tendones
  reseed(551);
  const tendons = [];
  const tendon = (from, to, outer) => {
    for (let i = 0; i < 44; i++) {
      const r = Math.sqrt(rnd());
      const th = rnd() * Math.PI * 2;
      const fRad = 0.034 * (0.8 + 0.4 * rnd());
      const a = from + (outer === 'a' ? rnd() * 0.008 : -rnd() * 0.02);
      const b = to + (outer === 'b' ? -rnd() * 0.008 : rnd() * 0.02);
      const ph = rnd() * 10;
      const K = 36;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const s = a + ((b - a) * k) / K;
        const { P, N } = fr(s);
        const thh = th + (s - 0.5) * 2.2;
        const tip = outer === 'a' ? ss(s, 0, 0.05) : 1 - ss(s, 0.95, 1);
        const rr = r * RT * (0.55 + 0.45 * tip);
        P.addScaledVector(N, Math.sin(thh) * rr * 1.05 + 0.006 * Math.sin(ph + s * 40)).addScaledVector(Z, Math.cos(thh) * rr * 0.7);
        pts.push(P);
      }
      tendons.push(tube(pts, 44, 5, (u) => fRad * (u < 0.03 || u > 0.97 ? 0.35 : 1), (u, c) => c.set('#ffffff'), () => 0));
    }
  };
  tendon(0.0, S0 + 0.08, 'a');
  tendon(S1 - 0.08, 1.0, 'b');

  // ------------------------------------------------------------ Hematoma (SDF → malla suave)
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
    g.setIndex(idx);
    return g;
  }
  // Marco local del hematoma: x = eje del músculo, y = hacia fuera (cara rota), z = a lo ancho de la rotura
  const hemSDF = (x, y, z) => {
    let d = ell(x, y, z, 0, 0, 0, 0.42, 0.13, 0.8) - 0.012 * Math.sin(x * 15 + z * 7) * Math.sin(z * 12 - x * 4);
    d = smin(d, ell(x, y, z, 0.04, 0.03, 0.18, 0.3, 0.1, 0.36), 0.12);
    d = smin(d, ell(x, y, z, -0.06, 0.02, -0.34, 0.3, 0.09, 0.3), 0.12);
    return d;
  };
  const hemGeo = polygonize(hemSDF, [-0.6, -0.3, -1.0], [0.6, 0.4, 1.0], 0.022);
  const fc = fr(SC);
  const aC = belly(SC);
  const out = fc.N.clone().multiplyScalar(DN).addScaledVector(Z, DB / FLAT).normalize();
  const xAx = fc.T.clone();
  const yAx = out.clone().sub(xAx.clone().multiplyScalar(out.dot(xAx))).normalize();
  const zAx = new THREE.Vector3().crossVectors(xAx, yAx).normalize();
  const hem = new THREE.Mesh(
    hemGeo,
    new THREE.MeshPhysicalMaterial({ color: '#8a1a2c', roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3, specularIntensity: 0.6, emissive: new THREE.Color('#5a0a14'), emissiveIntensity: 0.55 })
  );
  hem.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx));
  hem.position.copy(place(SC, DN * (T - 0.02), DB * (T - 0.02)));

  // ------------------------------------------------------------ Materiales y montaje
  const fibMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color('#ffb0b0') }), '#ff6a3d', 0.75);
  const coreMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3 }), '#ff5a3d', 0.6);
  const frayMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: 0.6 }), '#ff6a3d', 0.5);
  const tendonMat = M.tendon();
  // Las puntas de los tendones se desvanecen (continúan fuera de cuadro)
  tendonMat.transparent = true;
  tendonMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vOX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOX = position.x;');
    sh.fragmentShader = 'varying float vOX;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= 1.0 - smoothstep(3.25, 4.0, abs(vOX));');
  };

  const body = new THREE.Group();
  body.add(new THREE.Mesh(core, coreMat));
  //DBG body.add(new THREE.Mesh(mergeGeometries(fibs), fibMat));
  body.add(new THREE.Mesh(mergeGeometries(frays), frayMat));
  body.add(new THREE.Mesh(mergeGeometries(tendons), tendonMat));
  body.add(hem);

  // Halo cálido sobre la rotura
  const surf = place(SC, DN * 1.05, DB * 1.05);
  const h1 = halo('#ff9a6b', 3.6, 0.6);
  h1.position.copy(place(SC, DN * 0.75, DB * 0.75)).addScaledVector(Z, -1.4);
  body.add(h1);
  const h2 = halo('#ffb48a', 2.2, 0.5);
  h2.position.copy(place(SC, DN * 0.9, DB * 0.9)).addScaledVector(Z, -1.0);
  body.add(h2);

  const root = new THREE.Group();
  body.rotation.z = 0.7;
  root.add(body);
  root.updateMatrixWorld(true);
  // Sombra de contacto propia, ceñida al vientre
  const sh = halo('#0a1530', 1, 0.22);
  sh.scale.set(6.2, 0.75, 1);
  sh.position.set(0.1, -2.1, -0.6);
  root.add(sh);
  const look = surf.clone().applyMatrix4(body.matrixWorld).multiplyScalar(0.35);
  return { root, cam: [look.x + 2.0, look.y + 5.5, 12.4], look: [look.x, look.y, look.z], zoom: 0.45, shadow: false };
}
