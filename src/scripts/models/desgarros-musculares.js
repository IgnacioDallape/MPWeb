// Desgarro muscular — vientre muscular fusiforme (gemelo / isquiotibial) aislado, envuelto en su vaina (epimisio)
// y con tendones blancos en ambos extremos; en el distal, una lengüeta de aponeurosis se mete sobre el vientre.
// En la cara anterior, a media altura, una rotura parcial: las fibras superficiales están cortadas y retraídas en dos
// muñones abultados con la cara de corte en acento cálido, dejando un hueco en V. En el fondo del hueco siguen las
// fibras profundas intactas (rotura parcial), en sombra, con un pequeño coágulo hundido y un teñido de moretón alrededor.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const ss = THREE.MathUtils.smoothstep;
  const gauss = (x, w) => Math.exp(-(x / w) * (x / w));
  const Z = V(0, 0, 1);
  const C = (h) => new THREE.Color(h);

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

  const S0 = 0.17, S1 = 0.84, RMAX = 0.98, RT = 0.27, FLAT = 0.84;
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
  // Normal hacia fuera de la sección elíptica en (un, ub)
  const outDir = (s, un, ub) => fr(s).N.multiplyScalar(un).addScaledVector(Z, ub / FLAT).normalize();
  const fibR = (s) => 0.056 * (0.45 + 0.55 * belly(s) / RMAX);

  // ------------------------------------------------------------ Desgarro
  const SC = 0.53; // centro de la rotura (a lo largo del eje)
  const G = 0.095; // semiancho máximo del hueco (en s)
  const T = 0.12; // profundidad: se rompen las fibras con proyección > T sobre la dirección de la cara rota
  const DN = 0.78, DB = Math.sqrt(1 - DN * DN); // cara rota: anterior y algo hacia arriba
  const PN = DB, PB = -DN; // dirección transversal (a lo ancho de la rotura)
  const BUL = 0.28; // abultamiento de los muñones
  const retract = (q) => G * (0.4 + 0.6 * Math.sqrt(q));

  // ------------------------------------------------------------ Tubo con radio, color, "calor" y normal suavizada por anillo
  // warp(x) reparte los anillos a lo largo (para afinar la resolución cerca de un extremo)
  function tube(pts, segs, radial, radF, colF, heatF, softF, warp) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const n = (segs + 1) * (radial + 1);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), ht = new Float32Array(n);
    const c = new THREE.Color();
    const nv = new THREE.Vector3();
    const Nn = new THREE.Vector3(), Bn = new THREE.Vector3();
    let first = true;
    let p = 0;
    for (let i = 0; i <= segs; i++) {
      const u = warp ? warp(i / segs) : i / segs;
      const P = curve.getPointAt(u);
      // marco por transporte paralelo (estable con anillos no uniformes)
      const Tn = curve.getTangentAt(u);
      if (first) {
        Nn.copy(Math.abs(Tn.z) < 0.9 ? Z : V(1, 0, 0)).cross(Tn).normalize();
        first = false;
      } else Nn.addScaledVector(Tn, -Nn.dot(Tn)).normalize();
      Bn.crossVectors(Tn, Nn).normalize();
      const r = radF(u);
      colF(u, c);
      const h = heatF(u);
      const sf = softF ? softF(u) : null;
      for (let j = 0; j <= radial; j++) {
        const v = (j / radial) * Math.PI * 2;
        const sn = Math.sin(v), cs = -Math.cos(v);
        const nx = cs * Nn.x + sn * Bn.x, ny = cs * Nn.y + sn * Bn.y, nz = cs * Nn.z + sn * Bn.z;
        pos[p * 3] = P.x + r * nx;
        pos[p * 3 + 1] = P.y + r * ny;
        pos[p * 3 + 2] = P.z + r * nz;
        nv.set(nx, ny, nz);
        if (sf && sf.k > 0) nv.addScaledVector(sf.dir, sf.k).normalize();
        nor[p * 3] = nv.x;
        nor[p * 3 + 1] = nv.y;
        nor[p * 3 + 2] = nv.z;
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

  const PINK = C('#c65360'), PALE = C('#efd2cf'), WARM = C('#f45a36'), BRUISE = C('#8a2a3e');
  const FLOOR = C('#7a2c3a'), FLOOR_D = C('#561828');
  const FRAY_A = C('#e5552f'), FRAY_B = C('#f07a52');
  const APO = C('#ffffff'), APO_TIP = C('#efc3c6');

  // ------------------------------------------------------------ Fibras del vientre
  // Cuánto se retrae el cabo de una fibra rota (en s): en V (las superficiales más) y con el borde externo redondeado
  const retractAt = (proj, rho) => {
    const q = Math.max(0, (proj - T) / (1 - T));
    return retract(q) + G * 0.36 * Math.pow(ss(rho, 0.56, 1.04), 1.5);
  };
  const fibs = [];
  const ends = [];
  const cells = [];
  const addFiber = (un0, ub0, fRad, ph, sA, sB, inner) => {
    const proj = un0 * DN + ub0 * DB;
    const rho = Math.hypot(un0, ub0);
    const pieces = [];
    if (proj > T) {
      cells.push([un0 * PN + ub0 * PB, proj]);
      const q = (proj - T) / (1 - T);
      const base = retractAt(proj, rho);
      const eL = SC - base - (rnd() - 0.3) * 0.012, eR = SC + base + (rnd() - 0.3) * 0.012;
      // las fibras internas del cabo son cortas: se pierden dentro del muñón
      pieces.push({ a: inner ? eL - inner : sA, b: eL, torn: 1, q });
      pieces.push({ a: eR, b: inner ? eR + inner : sB, torn: -1, q });
    } else pieces.push({ a: sA, b: sB, torn: 0, q: 0 });

    for (const pc of pieces) {
      const sEnd = pc.torn === 1 ? pc.b : pc.a;
      const lateral = (rnd() - 0.5) * 2;
      const lift = 0.25 + rnd() * 0.35;
      const K = Math.max(10, Math.round((pc.b - pc.a) * 110));
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const s = pc.a + ((pc.b - pc.a) * k) / K;
        let un = un0 + 0.012 * Math.sin(ph + s * 24), ub = ub0 + 0.012 * Math.cos(ph * 1.3 + s * 21);
        if (pc.torn) {
          const e = Math.abs(s - sEnd);
          const f = gauss(e, 0.05);
          const f2 = gauss(e, 0.022);
          // Muñón retraído: las fibras cortadas se acortan, se abultan y se levantan un poco
          const bul = 1 + BUL * pc.q * f;
          un = un * bul + DN * 0.1 * pc.q * lift * f2 + PN * 0.025 * lateral * f2;
          ub = ub * bul + DB * 0.1 * pc.q * lift * f2 + PB * 0.025 * lateral * f2;
        }
        pts.push(place(s, un, ub));
      }
      const S = (u) => pc.a + (pc.b - pc.a) * u;
      const radF = (u) => {
        const s = S(u);
        let r = fibR(s) * fRad;
        // extremos: cierre redondeado (rotura) o afinado (unión músculo-tendinosa)
        const capT = 0.012, capJ = 0.03;
        if (pc.torn) {
          const e = Math.abs(s - sEnd);
          r *= 1 + 0.35 * pc.q * gauss(e, 0.045); // las fibras retraídas se engrosan
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
        const bz = gauss(s - SC, 0.1);
        if (pc.torn) {
          c.lerp(BRUISE, bz * 0.3);
          c.lerp(WARM, gauss(s - sEnd, 0.018) * (0.82 + 0.18 * pc.q));
        } else c.lerp(BRUISE, bz * 0.42 * ss(proj, T - 0.6, T));
      };
      const heatF = (u) => (pc.torn ? gauss(S(u) - sEnd, 0.013) * (0.35 + 0.3 * pc.q) : 0);
      const softF = (u) => {
        const s = S(u);
        const k = 0.45 * (pc.torn ? 1 - gauss(s - sEnd, 0.04) : 1);
        return { dir: outDir(s, un0, ub0), k };
      };
      const warp = pc.torn === 1 ? (x) => 1 - Math.pow(1 - x, 2.2) : pc.torn === -1 ? (x) => Math.pow(x, 2.2) : null;
      fibs.push(tube(pts, Math.max(14, Math.round((pc.b - pc.a) * 85)), 6, radF, colF, heatF, softF, warp));
      if (pc.torn && !inner) ends.push({ s: sEnd, dir: pc.torn, un: un0, ub: ub0, q: pc.q, lateral, lift });
    }
  };

  reseed(501);
  const NF = 240;
  for (let i = 0; i < NF; i++) {
    const r = 0.5 + 0.5 * Math.pow(rnd(), 0.5);
    const th = rnd() * Math.PI * 2;
    const jit = rnd(), ph = rnd() * 10;
    const sA = S0 - 0.012 + rnd() * 0.035;
    const sB = S1 + 0.012 - rnd() * 0.035;
    addFiber(Math.sin(th) * r, Math.cos(th) * r, 0.7 + 0.6 * jit, ph, sA, sB, 0);
  }
  // Celdas (fascículos) de la cara de corte: centros de las fibras rotas + relleno en la zona interna
  reseed(511);
  for (let i = 0, n = 0; n < 40 && i < 2000; i++) {
    const r = 0.06 + 0.46 * Math.sqrt(rnd());
    const th = rnd() * Math.PI * 2;
    const un0 = Math.sin(th) * r, ub0 = Math.cos(th) * r;
    if (un0 * DN + ub0 * DB < T + 0.02) continue;
    n++;
    cells.push([un0 * PN + ub0 * PB, un0 * DN + ub0 * DB]);
  }


  // ------------------------------------------------------------ Fibras profundas intactas en el fondo del hueco
  reseed(521);
  const NFL = 14;
  for (let i = 0; i < NFL; i++) {
    const lat = -0.82 + (1.64 * (i + 0.5)) / NFL + (rnd() - 0.5) * 0.05;
    const pr = 0.05 + rnd() * 0.06;
    const un0 = DN * pr + PN * lat, ub0 = DB * pr + PB * lat;
    const fRad = 0.052 * (0.85 + 0.3 * rnd());
    const ph = rnd() * 10;
    const a = SC - G * 1.6 * (0.85 + 0.3 * rnd()), b = SC + G * 1.6 * (0.85 + 0.3 * rnd());
    const K = 30;
    const pts = [];
    for (let k = 0; k <= K; k++) {
      const s = a + ((b - a) * k) / K;
      pts.push(place(s, un0 + 0.01 * Math.sin(ph + s * 30), ub0 + 0.01 * Math.cos(ph + s * 26)));
    }
    const S = (u) => a + (b - a) * u;
    fibs.push(
      tube(
        pts,
        40,
        5,
        (u) => {
          const e = Math.min(u, 1 - u) * (b - a);
          return fRad * (0.2 + 0.8 * Math.min(1, e / 0.03)) * (u === 0 || u === 1 ? 0.05 : 1);
        },
        (u, c) => c.copy(FLOOR).lerp(FLOOR_D, gauss(S(u) - SC, 0.07) * 0.55),
        () => 0,
        () => ({ dir: outDir(SC, DN, DB), k: 0.15 })
      )
    );
  }

  // ------------------------------------------------------------ Hilachas: pocas, cortas y gruesas, en los muñones
  reseed(541);
  const frays = [];
  for (const side of [1, -1]) {
    const cand = ends.filter((e) => e.dir === side && e.q > 0.3);
    const n = 5;
    for (let m = 0; m < n; m++) {
      const e = cand[Math.min(cand.length - 1, Math.floor(((m + rnd() * 0.8) * cand.length) / n))];
      const len = (0.15 + 0.2 * rnd()) * retract(e.q);
      const sa = e.s - e.dir * 0.016;
      const lat = (rnd() - 0.5) * 0.12;
      const up = 0.02 + rnd() * 0.05 * e.q;
      const ph = rnd() * 10;
      const ou = (rnd() - 0.5) * 0.04, ov = (rnd() - 0.5) * 0.04;
      const K = 10;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const t = k / K;
        const s = sa + e.dir * (0.016 + len) * t;
        const bul = 1 + BUL * e.q;
        const kk = Math.pow(t, 1.6);
        const un = (e.un + ou) * bul + DN * (0.1 * e.q * e.lift + up * kk) + PN * (0.03 * e.lateral + lat * kk + 0.01 * Math.sin(ph + t * 7));
        const ub = (e.ub + ov) * bul + DB * (0.1 * e.q * e.lift + up * kk) + PB * (0.03 * e.lateral + lat * kk + 0.01 * Math.sin(ph + t * 7));
        pts.push(place(s, un, ub));
      }
      const r0 = 0.02 + rnd() * 0.008;
      frays.push(
        tube(
          pts,
          12,
          5,
          (u) => r0 * (1 - 0.55 * u) * (u > 0.92 ? Math.sqrt(Math.max(0.02, (1 - u) / 0.08)) : 1),
          (u, c) => c.copy(FRAY_A).lerp(FRAY_B, u),
          () => 0.45
        )
      );
    }
  }

  // ------------------------------------------------------------ Núcleo (relleno) con el fondo del hueco tallado y en sombra
  const core = (() => {
    const NS = 160, NR = 56;
    const sa = S0 - 0.015, sb = S1 + 0.015;
    const LIM = T - 0.1;
    const pos = [], col = [];
    const c = new THREE.Color();
    const OK = C('#b9505b'), DEEP = C('#a8434f'), CAV_A = C('#8c3441'), CAV_B = C('#5e1a26'), CAV_C = C('#6e1e2c');
    for (let i = 0; i <= NS; i++) {
      const s = sa + ((sb - sa) * i) / NS;
      const kc = 0.86 * Math.sqrt(ss(s, sa, sa + 0.05) * (1 - ss(s, sb - 0.05, sb)));
      const w = 1 - ss(Math.abs(s - SC), G * 1.25, G * 2.2);
      const near = 1 - ss(Math.abs(s - SC), G * 1.6, G * 2.2);
      const cen = gauss(s - SC, G * 1.1);
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
        c.copy(OK).lerp(DEEP, near);
        c.lerp(CAV_A, ss(carved, 0, 0.05));
        c.lerp(CAV_B, ss(carved, 0.04, 0.5));
        c.lerp(CAV_C, ss(carved, 0.3, 0.8) * cen * 0.6);
        col.push(c.r, c.g, c.b);
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

  // ------------------------------------------------------------ Vaina (epimisio): transparente, rota alrededor del hueco
  const sheath = (() => {
    const NS = 170, NR = 96;
    const sa = S0 - 0.004, sb = S1 + 0.004;
    const pos = [], open = [], fade = [];
    for (let i = 0; i <= NS; i++) {
      const s = sa + ((sb - sa) * i) / NS;
      const a = belly(s);
      const { P, N } = fr(s);
      const d0 = fibR(s) * 1.12;
      const side = s < SC ? 1 : -1;
      for (let j = 0; j <= NR; j++) {
        const th = (j / NR) * Math.PI * 2;
        const un = Math.sin(th), ub = Math.cos(th);
        const proj = un * DN + ub * DB, lat = un * PN + ub * PB;
        let bul = 1, lift = 0, d = d0, ov = 9;
        if (proj > T - 0.06) {
          const q = Math.max(0, (proj - T) / (1 - T));
          const base = retractAt(Math.max(proj, T), 1);
          const e = Math.abs(s - (SC - side * base));
          bul = 1 + BUL * q * gauss(e, 0.05);
          lift = 0.1 * q * 0.42 * gauss(e, 0.022);
          d *= 1 + 0.35 * q * gauss(e, 0.045);
          // borde de la vaina rota: irregular, algo por detrás de la cara de corte
          const phi = Math.atan2(lat, proj);
          const jag = G * (0.12 * Math.sin(phi * 7 + side * 1.3) + 0.07 * Math.sin(phi * 17 + 2 + side) + 0.04 * Math.sin(phi * 37 - side * 2));
          const halfW = (base + G * 0.16) * Math.sqrt(ss(proj, T - 0.06, T + 0.14)) + jag * ss(proj, T - 0.06, T + 0.1);
          ov = (Math.abs(s - SC) - halfW) / G;
        }
        const P2 = P.clone()
          .addScaledVector(N, (un * bul + DN * lift) * a + un * d)
          .addScaledVector(Z, (ub * bul + DB * lift) * a * FLAT + ub * d);
        pos.push(P2.x, P2.y, P2.z);
        open.push(ov);
        fade.push(ss(s, sa, S0 + 0.05) * (1 - ss(s, S1 - 0.06, sb)));
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
    g.setAttribute('aOpen', new THREE.Float32BufferAttribute(open, 1));
    g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();

  // ------------------------------------------------------------ Tendones: banda cohesiva (cuerda lisa + fibras ceñidas)
  reseed(551);
  const tendons = [];
  const tendon = (from, to, outer) => {
    const tipF = (s) => (outer === 'a' ? ss(s, 0.0, 0.07) : 1 - ss(s, 0.93, 1.0));
    // cuerda central lisa
    {
      const K = 40;
      const pts = [];
      for (let k = 0; k <= K; k++) pts.push(fr(from + ((to - from) * k) / K).P);
      const S = (u) => from + (to - from) * u;
      tendons.push(
        tube(
          pts,
          48,
          16,
          (u) => {
            const s = S(u);
            const eo = outer === 'a' ? u : 1 - u;
            const cap = eo < 0.045 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - eo / 0.045, 2))) : 1;
            return RT * 0.64 * (0.5 + 0.5 * tipF(s)) * cap * (u === 0 || u === 1 ? 0.02 : 1);
          },
          (u, c) => c.set('#ffffff'),
          () => 0
        )
      );
    }
    for (let i = 0; i < 30; i++) {
      const r = 0.6 + 0.16 * rnd();
      const th = rnd() * Math.PI * 2;
      const fRad = 0.042 * (0.85 + 0.3 * rnd());
      const a = from + (outer === 'a' ? 0.014 + rnd() * 0.006 : -rnd() * 0.02);
      const b = to + (outer === 'b' ? -0.014 - rnd() * 0.006 : rnd() * 0.02);
      const ph = rnd() * 10;
      const K = 30;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const s = a + ((b - a) * k) / K;
        const { P, N } = fr(s);
        const thh = th + (s - 0.5) * 2.2;
        const rr = r * RT * (0.5 + 0.5 * tipF(s));
        P.addScaledVector(N, Math.sin(thh) * rr + 0.003 * Math.sin(ph + s * 40)).addScaledVector(Z, Math.cos(thh) * rr);
        pts.push(P);
      }
      tendons.push(tube(pts, 34, 8, (u) => fRad * Math.min(1, 0.15 + Math.min(u, 1 - u) / 0.05) * (0.6 + 0.4 * tipF(a + (b - a) * u)), (u, c) => c.set('#ffffff'), () => 0));
    }
  };
  tendon(0.0, S0 + 0.08, 'a');
  tendon(S1 - 0.08, 1.0, 'b');

  // Aponeurosis: el tendón se abre en abanico en una lámina fibrosa fina que se mete sobre la cara del vientre
  // (sJ = unión con el tendón, dir = sentido hacia el vientre, L = cuánto entra en s, thC/thW = centro y semiancho angular)
  const aponeurosis = (sJ, dir, L, thC, thW, nF, seedV) => {
    reseed(seedV);
    const geos = [];
    const lenAt = (uu) => L * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(uu), 1.7)), 0.55);
    const wS = (s) => Math.pow(Math.min(1, (RT * 1.1) / belly(s)), 0.55);
    const at = (s, th, d) => {
      const a = belly(s);
      const { P, N } = fr(s);
      return P.addScaledVector(N, Math.sin(th) * (a + d)).addScaledVector(Z, Math.cos(th) * (a * FLAT + d));
    };
    // lámina base, muy delgada
    {
      const NU = 30, NV = 36;
      const pos = [], col = [];
      const cc = new THREE.Color();
      for (let v = 0; v <= NV; v++) {
        const t = v / NV;
        for (let u = 0; u <= NU; u++) {
          const uu = (u / NU) * 2 - 1;
          const s = sJ - dir * 0.03 + dir * (0.03 + lenAt(uu)) * t;
          const th = thC + uu * thW * wS(s);
          const Q = at(s, th, fibR(s) * 1.08 + 0.002 + 0.006 * Math.sqrt(Math.max(0, 1 - uu * uu)));
          pos.push(Q.x, Q.y, Q.z);
          cc.copy(APO).lerp(APO_TIP, ss(t, 0.45, 1) * 0.85);
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
    // fibras de la aponeurosis encima de la lámina
    for (let f = 0; f < nF; f++) {
      const uu = Math.max(-0.98, Math.min(0.98, -1 + (2 * (f + 0.5)) / nF + (rnd() - 0.5) * 0.06));
      const th = thC + uu * thW;
      const len = lenAt(uu) * (0.88 + 0.16 * rnd());
      const fR = 0.024 * (0.85 + 0.3 * rnd());
      const K = 24;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const s = sJ - dir * 0.04 + dir * (0.04 + len) * (k / K);
        pts.push(at(s, thC + (th - thC) * wS(s), fibR(s) * 1.08 + 0.026));
      }
      geos.push(tube(pts, 30, 7, (u) => fR * (u > 0.85 ? Math.sqrt(Math.max(0.03, (1 - u) / 0.15)) : 1) * (u === 1 ? 0.05 : 1), (u, c) => c.copy(APO).lerp(APO_TIP, ss(u, 0.5, 1) * 0.85), () => 0));
    }
    return mergeGeometries(geos);
  };

  // Cara de corte de cada muñón (side 1 = proximal, -1 = distal): cúpula redondeada que cierra el cabo retraído,
  // en acento cálido, con el dibujo de los fascículos (celdas) y más oscura hacia el fondo del hueco
  const stumpFace = (side) => {
    const NL = 96, NP = 42;
    const LATM = Math.sqrt(1 - T * T);
    const pos = [], col = [], ht = [];
    const c = new THREE.Color();
    const DEEPF = C('#5e1824'), MIDF = C('#a8343a'), RIMF = C('#f0603a'), LITF = C('#c4473c'), SEPF = C('#5a1622');
    for (let i = 0; i <= NL; i++) {
      const lat = -LATM + (2 * LATM * i) / NL;
      const pmax = Math.sqrt(Math.max(0, 0.98 - lat * lat));
      for (let j = 0; j <= NP; j++) {
        const t = j / NP;
        const proj = T + (pmax - T) * t;
        const rho = Math.hypot(proj, lat);
        const q = Math.max(0, (proj - T) / (1 - T));
        // fascículo más cercano y distancia al tabique
        let d1 = 9, d2 = 9, k1 = 0;
        for (let k = 0; k < cells.length; k++) {
          const dx = lat - cells[k][0], dy = proj - cells[k][1];
          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
            k1 = k;
          } else if (d < d2) d2 = d;
        }
        const edge = Math.sqrt(d2) - Math.sqrt(d1);
        const sep = 1 - ss(edge, 0.0, 0.03);
        const dB = Math.max(0, Math.min(proj - T, 0.98 - rho));
        const dome = G * 0.24 * Math.sqrt(ss(dB, 0, 0.3)) + 0.0025 * ss(edge, 0, 0.05) * ss(dB, 0, 0.06);
        const s = SC - side * (retractAt(proj, rho) + 0.002 - dome);
        const bul = 1 + BUL * q;
        const un = (DN * proj + PN * lat) * bul + DN * 0.042 * q;
        const ub = (DB * proj + PB * lat) * bul + DB * 0.042 * q;
        const P = place(s, un, ub);
        pos.push(P.x, P.y, P.z);
        const hv = (Math.sin(k1 * 12.9898 + side * 3.1) * 43758.5453) % 1;
        const rim = ss(rho, 0.78, 0.98);
        c.copy(MIDF).lerp(RIMF, rim);
        c.lerp(LITF, Math.abs(hv) * 0.35 * (1 - rim));
        c.lerp(DEEPF, (1 - ss(proj, T, T + 0.3)) * 0.65);
        c.lerp(SEPF, sep * 0.55);
        col.push(c.r, c.g, c.b);
        ht.push((0.03 + 0.3 * rim) * (1 - 0.6 * sep) * (0.4 + 0.6 * ss(proj, T, T + 0.3)));
      }
    }
    const idx = [];
    for (let i = 0; i < NL; i++)
      for (let j = 0; j < NP; j++) {
        const a = i * (NP + 1) + j, b = (i + 1) * (NP + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aHeat', new THREE.Float32BufferAttribute(ht, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };


  // ------------------------------------------------------------ Coágulo (SDF → malla suave), chico y aplanado
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
  // Marco local del coágulo: x = eje del músculo, y = hacia fuera (cara rota), z = a lo ancho de la rotura
  const hemSDF = (x, y, z) => {
    let d = ell(x, y, z, 0, 0, 0, 0.2, 0.05, 0.36) - 0.008 * Math.sin(x * 15 + z * 7) * Math.sin(z * 12 - x * 4);
    d = smin(d, ell(x, y, z, 0.02, 0.006, 0.12, 0.13, 0.04, 0.16), 0.1);
    // gotas aplanadas que se derraman hacia los muñones
    d = smin(d, ell(x, y, z, -0.25, -0.012, 0.05, 0.15, 0.028, 0.09), 0.12);
    d = smin(d, ell(x, y, z, 0.26, -0.014, -0.07, 0.14, 0.026, 0.08), 0.12);
    return d;
  };
  const hemGeo = polygonize(hemSDF, [-0.48, -0.1, -0.5], [0.48, 0.1, 0.5], 0.012);
  const fc = fr(SC);
  const out = fc.N.clone().multiplyScalar(DN).addScaledVector(Z, DB / FLAT).normalize();
  const xAx = fc.T.clone();
  const yAx = out.clone().sub(xAx.clone().multiplyScalar(out.dot(xAx))).normalize();
  const zAx = new THREE.Vector3().crossVectors(xAx, yAx).normalize();
  const hem = new THREE.Mesh(
    hemGeo,
    new THREE.MeshPhysicalMaterial({ color: '#4e0c1a', roughness: 0.6, clearcoat: 0.15, clearcoatRoughness: 0.4, specularIntensity: 0.3, emissive: new THREE.Color('#4a0814'), emissiveIntensity: 0.18 })
  );
  hem.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx));
  hem.position.copy(place(SC - 0.012, DN * 0.06, DB * 0.06));

  // ------------------------------------------------------------ Materiales y montaje
  const fibMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.5, sheenColor: new THREE.Color('#ffc4c4'), sheenRoughness: 0.5 }), '#ff6a3d', 0.75);
  const coreMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.4 });
  const frayMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.4 }), '#ff7a50', 0.45);
  const sheathMat = new THREE.MeshPhysicalMaterial({ color: '#ffeef0', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35, transparent: true, opacity: 0.11, depthWrite: false });
  sheathMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float aOpen;\nattribute float aFade;\nvarying float vOpen;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOpen = aOpen; vFade = aFade;');
    sh.fragmentShader =
      'varying float vOpen;\nvarying float vFade;\n' +
      sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if (vOpen < 0.0) discard;').replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float fres = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        float rim = exp(-pow(vOpen / 0.08, 2.0));
        gl_FragColor.a = clamp(gl_FragColor.a + 0.25 * pow(fres, 3.0) + 0.5 * max(lum - 0.8, 0.0) + 0.4 * rim, 0.0, 0.8) * vFade;`
      );
  };
  const tendonMat = M.tendon();
  // Las puntas de los tendones se desvanecen en un tramo corto
  tendonMat.transparent = true;
  tendonMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vOX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOX = position.x;');
    sh.fragmentShader = 'varying float vOX;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= 1.0 - smoothstep(4.3, 4.45, abs(vOX));');
  };
  const aponMat = M.tendon();
  aponMat.vertexColors = true;
  aponMat.side = THREE.DoubleSide;

  const body = new THREE.Group();
  body.add(new THREE.Mesh(core, coreMat));
  body.add(new THREE.Mesh(mergeGeometries(fibs), fibMat));
  body.add(new THREE.Mesh(mergeGeometries(frays), frayMat));
  body.add(new THREE.Mesh(mergeGeometries(tendons), tendonMat));
  body.add(new THREE.Mesh(aponeurosis(S1 + 0.03, -1, 0.11, 0.12, 0.75, 13, 561), aponMat));

  const faceMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.58, clearcoat: 0.25, clearcoatRoughness: 0.35, specularIntensity: 0.55, side: THREE.DoubleSide }), '#ff5a30', 0.55);
  body.add(new THREE.Mesh(stumpFace(1), faceMat));
  body.add(new THREE.Mesh(stumpFace(-1), faceMat));
  body.add(hem);
  const sheathMesh = new THREE.Mesh(sheath, sheathMat);
  sheathMesh.renderOrder = 2;
  body.add(sheathMesh);

  // Brillo cálido detrás de la rotura
  const h1 = halo('#ff8a6b', 2.2, 0.3);
  h1.position.copy(place(SC, DN * 0.3, DB * 0.3)).addScaledVector(Z, -1.6);
  body.add(h1);

  const root = new THREE.Group();
  body.rotation.z = 0.6;
  root.add(body);
  root.updateMatrixWorld(true);
  // Sombra de contacto propia, ceñida al vientre
  const box = new THREE.Box3().setFromObject(body);
  const sh = halo('#0a1530', 1, 0.22);
  sh.scale.set((box.max.x - box.min.x) * 0.7, 0.75, 1);
  sh.position.set((box.max.x + box.min.x) / 2 + 0.1, box.min.y + 0.35, -0.6);
  root.add(sh);
  const surf = place(SC, DN * 1.05, DB * 1.05);
  const look = surf.clone().applyMatrix4(body.matrixWorld).multiplyScalar(0.35);
  return { root, cam: [look.x + 2.0, look.y + 5.5, 12.4], look: [look.x, look.y, look.z], zoom: 1.0, shadow: false };
}
