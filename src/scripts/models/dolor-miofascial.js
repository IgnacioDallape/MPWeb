// Dolor miofascial / puntos gatillo.
// Nuca, cuello y hombros vistos desde atrás dentro de una silueta translúcida: los dos trapecios como láminas
// musculares rosadas de fibras que van de la línea media (aponeurosis blanca) a clavícula, acromion y espina de la
// escápula, bajo una fascia translúcida muy fina. Tres puntos gatillo: bandas tensas (cordón más oscuro y abultado)
// con un engrosamiento fusiforme; el activo (trapecio superior derecho) en acento cálido con halo, ondas sutiles
// que suben hacia la nuca y una estela tenue de dolor referido por el cuello hasta detrás de la oreja y la sien.
export default function build(L) {
  const { THREE, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const ss = THREE.MathUtils.smoothstep;
  const lerp = THREE.MathUtils.lerp;
  const clamp = THREE.MathUtils.clamp;
  const C = (h) => new THREE.Color(h);

  // ------------------------------------------------------------ SDF básicos
  const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
    const k0 = Math.sqrt(a * a + b * b + c * c);
    const k1 = Math.sqrt((a * a) / (rx * rx) + (b * b) / (ry * ry) + (c * c) / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  const seg = (x, y, z, a, b, r) => {
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
  };
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };

  // ------------------------------------------------------------ Cuerpo guía: tórax + hombros + cuello + cráneo
  // x = derecha del paciente (vista posterior), y = arriba, z = posterior (hacia la cámara)
  const bodyD = (x, y, z) => {
    const ax = Math.abs(x);
    let d = ell(ax, y, z, 0, -1.0, -1.1, 2.6, 3.0, 1.75);
    d = smin(d, ell(ax, y, z, 2.5, 0.5, -0.85, 1.1, 0.95, 1.0), 1.0);
    d = smin(d, seg(ax, y, z, [0, 0.8, -0.95], [0, 3.5, -0.85], 0.74), 1.3);
    d = smin(d, ell(ax, y, z, 0, 4.15, -0.8, 0.98, 1.2, 1.2), 0.45);
    return d;
  };
  const gradF = (f, x, y, z) => {
    const e = 0.002;
    return V(f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)).normalize();
  };
  const grad = (x, y, z) => gradF(bodyD, x, y, z);
  const projF = (f, p, off = 0) => {
    for (let i = 0; i < 16; i++) {
      const d = f(p.x, p.y, p.z) - off;
      if (Math.abs(d) < 2e-4) break;
      p.addScaledVector(gradF(f, p.x, p.y, p.z), -d);
    }
    return p;
  };
  const proj = (p, off = 0) => projF(bodyD, p, off);

  // ------------------------------------------------------------ Trapecio derecho: origen (línea media) e inserción
  // Origen: tercio medial de la línea nucal superior → protuberancia occipital → ligamento nucal → apófisis espinosas.
  // La línea nucal arranca apenas lateral (x 0.45) y sube suave hasta la protuberancia: sin muesca en la línea media.
  const ORY = [[0, 0.45, 3.64], [0.06, 0, 3.7], [0.32, 0, 1.15], [0.62, 0, -0.5], [1, 0, -2.6]];
  const WX = 0.66;
  const origin = (v) => {
    let i = 1;
    while (i < ORY.length - 1 && v > ORY[i][0]) i++;
    const t = clamp((v - ORY[i - 1][0]) / (ORY[i][0] - ORY[i - 1][0]), 0, 1);
    return proj(V(lerp(ORY[i - 1][1], ORY[i][1], t), lerp(ORY[i - 1][2], ORY[i][2], t), 2.5));
  };
  const insCurve = new THREE.CatmullRomCurve3(
    [V(1.65, 1.5, -1.1), V(2.45, 1.52, -0.9), V(3.0, 1.38, -0.45), V(2.82, 1.25, -0.02), V(2.2, 0.95, 0.3), V(1.6, 0.6, 0.5), V(1.1, 0.3, 0.6)].map((p) => proj(p)),
    false,
    'centripetal'
  );

  // Malla base sobre el cuerpo: posición y normal para (u, v); u: origen→inserción, v: arriba→abajo
  const NU = 72, NV = 120;
  const GP = new Float32Array((NU + 1) * (NV + 1) * 3), GN = new Float32Array((NU + 1) * (NV + 1) * 3);
  // Geodésica aproximada entre dos puntos de la superficie (recta proyectada + suavizado)
  const geo = (A, B, K, iters = 6) => {
    let P = [];
    for (let k = 0; k <= K; k++) P.push(proj(A.clone().lerp(B, k / K)));
    for (let it = 0; it < iters; it++) {
      const Q = [P[0]];
      for (let k = 1; k < K; k++) Q.push(proj(P[k - 1].clone().add(P[k]).add(P[k]).add(P[k + 1]).multiplyScalar(0.25)));
      Q.push(P[K]);
      P = Q;
    }
    return P;
  };
  // Las fibras superiores bajan por la cara lateral del cuello antes de abrirse hacia la clavícula:
  // el borde libre del trapecio superior dibuja la pendiente cuello-hombro.
  const W0 = proj(V(WX, 2.75, -0.6));
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    const O = origin(v);
    const I = insCurve.getPointAt(v);
    const K = 40;
    let P = geo(O, I, K);
    const wv = 1 - ss(v, 0, 0.32);
    if (wv > 1e-3) {
      const Wp = proj(P[Math.round(K * 0.42)].clone().lerp(W0, wv));
      P = geo(O, Wp, 18).concat(geo(Wp, I, 22).slice(1));
      for (let it = 0; it < 5; it++) {
        const Q = [P[0]];
        for (let k = 1; k < P.length - 1; k++) Q.push(proj(P[k - 1].clone().add(P[k]).add(P[k]).add(P[k + 1]).multiplyScalar(0.25)));
        Q.push(P[P.length - 1]);
        P = Q;
      }
    }
    const cur = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    for (let i = 0; i <= NU; i++) {
      const p = cur.getPointAt(i / NU);
      const n = grad(p.x, p.y, p.z);
      const q = (j * (NU + 1) + i) * 3;
      GP[q] = p.x; GP[q + 1] = p.y; GP[q + 2] = p.z;
      GN[q] = n.x; GN[q + 1] = n.y; GN[q + 2] = n.z;
    }
  }
  // Muestreo bilineal; side = 1 derecha, -1 izquierda (espejo)
  const sample = (side, u, v) => {
    const fu = clamp(u, 0, 1) * NU, fv = clamp(v, 0, 1) * NV;
    const i = Math.min(NU - 1, Math.floor(fu)), j = Math.min(NV - 1, Math.floor(fv));
    const a = fu - i, b = fv - j;
    const P = V(), N = V();
    const w = [(1 - a) * (1 - b), a * (1 - b), (1 - a) * b, a * b];
    const id = [j * (NU + 1) + i, j * (NU + 1) + i + 1, (j + 1) * (NU + 1) + i, (j + 1) * (NU + 1) + i + 1];
    for (let k = 0; k < 4; k++) {
      const q = id[k] * 3;
      P.x += GP[q] * w[k]; P.y += GP[q + 1] * w[k]; P.z += GP[q + 2] * w[k];
      N.x += GN[q] * w[k]; N.y += GN[q + 1] * w[k]; N.z += GN[q + 2] * w[k];
    }
    P.x *= side; N.x *= side;
    return { P, N: N.normalize() };
  };

  // ------------------------------------------------------------ Espesor, bandas tensas, puntos gatillo
  const prof = (u) => 0.1 + 0.9 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(u, 0, 1), 0.85)), 0.7);
  const edge = (v) => Math.sqrt(ss(v, -0.005, 0.08) * (1 - ss(v, 0.92, 1.005)));
  // El trapecio superior se afina hacia la nuca (sin picos en la línea nucal)
  const hBase = (u, v) => lerp(0.38, 0.13, ss(v, 0.15, 0.9)) * prof(u) * edge(v) * (0.45 + 0.55 * ss(v, 0, 0.12));

  const TPS = [
    { s: 1, u: 0.55, v: 0.19, amp: 0.2, wu: 0.11, wv: 0.045, act: 1 },
    { s: 1, u: 0.32, v: 0.48, amp: 0.15, wu: 0.1, wv: 0.04, act: 0 },
    { s: -1, u: 0.45, v: 0.2, amp: 0.16, wu: 0.1, wv: 0.042, act: 0 },
  ];
  const BAND = 0.09;
  const tpF = (s, u, v) => {
    const r = { bump: 0, band: 0, kA: 0, kL: 0, bA: 0, bL: 0 };
    for (const t of TPS) {
      if (t.s !== s) continue;
      const gu = Math.exp(-(((u - t.u) / t.wu) ** 2)), gv = Math.exp(-(((v - t.v) / t.wv) ** 2));
      const gvb = Math.exp(-(((v - t.v) / (t.wv * 0.95)) ** 2));
      const along = (0.45 + 0.55 * Math.exp(-(((u - t.u) / (t.wu * 3.2)) ** 2))) * ss(u, 0.04, 0.18) * (1 - ss(u, 0.86, 0.98));
      const k = gu * gv;
      r.bump += t.amp * k;
      r.band += BAND * gvb * along;
      if (t.act) { r.kA = Math.max(r.kA, k); r.bA = Math.max(r.bA, gvb * along); }
      else { r.kL = Math.max(r.kL, k); r.bL = Math.max(r.bL, gvb * along); }
    }
    return r;
  };
  // Las fibras vecinas convergen hacia el nódulo (forma fusiforme)
  const bunch = (s, u, v) => {
    let dv = 0;
    for (const t of TPS) if (t.s === s) dv -= (v - t.v) * 0.2 * Math.exp(-(((u - t.u) / (t.wu * 2.2)) ** 2)) * Math.exp(-(((v - t.v) / (t.wv * 2.2)) ** 2));
    return dv;
  };
  const topH = (s, u, v) => {
    const t = tpF(s, u, v);
    return hBase(u, v) + (t.bump + t.band) * edge(v);
  };

  // ------------------------------------------------------------ Tubo con radio, color y calor por anillo
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
        const a = (j / radial) * Math.PI * 2;
        const sn = Math.sin(a), cs = -Math.cos(a);
        const nx = cs * Nn.x + sn * Bn.x, ny = cs * Nn.y + sn * Bn.y, nz = cs * Nn.z + sn * Bn.z;
        pos[p * 3] = P.x + r * nx; pos[p * 3 + 1] = P.y + r * ny; pos[p * 3 + 2] = P.z + r * nz;
        nor[p * 3] = nx; nor[p * 3 + 1] = ny; nor[p * 3 + 2] = nz;
        col[p * 3] = c.r; col[p * 3 + 1] = c.g; col[p * 3 + 2] = c.b;
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

  // Material con color por vértice y emisión cálida (aHeat)
  // y desvanecido hacia abajo (la espalda sigue fuera de cuadro)
  const FB0 = -0.15, FB1 = 0.85;
  const FADE = `gl_FragColor.a *= smoothstep(${FB0.toFixed(2)}, ${FB1.toFixed(2)}, vOY);`;
  const fadeVS = (sh) => 'varying float vOY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOY = position.y;');
  const heatMat = (mat, warm = '#ff6a3d', k = 0.6) => {
    mat.vertexColors = true;
    mat.color.set('#ffffff');
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWarm = { value: new THREE.Color(warm).multiplyScalar(k) };
      sh.vertexShader = 'attribute float aHeat;\nvarying float vHeat;\n' + fadeVS(sh).replace('vOY = position.y;', 'vOY = position.y; vHeat = aHeat;');
      sh.fragmentShader =
        'uniform vec3 uWarm;\nvarying float vHeat;\nvarying float vOY;\n' +
        sh.fragmentShader
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWarm * vHeat;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n ' + FADE);
    };
    return mat;
  };

  const PINK = C('#c4505f'), ROSE = C('#de7c87'), APO = C('#f4e9e6'), DEEP = C('#9c3346'), KNOT = C('#6e1a2d'), WARM = C('#ff7a4c'), HOT = C('#ffb48e');
  const apoAt = (u, v) => {
    const w = 0.045 + 0.11 * Math.exp(-(((v - 0.38) / 0.12) ** 2));
    return Math.max(1 - ss(u, w * 0.5, w * 1.4), ss(u, 0.9, 0.985));
  };

  // ------------------------------------------------------------ Fibras (ambos lados)
  const fibs = [];
  const sides = [1, -1];
  for (const s of sides) {
    reseed(s > 0 ? 701 : 733);
    const NF = 104;
    for (let i = 0; i < NF; i++) {
      const v0 = clamp((i + 0.5 + (rnd() - 0.5) * 0.7) / NF, 0.004, 0.996);
      const jit = rnd(), ph = rnd() * 10, tone = rnd();
      const ua = rnd() * 0.012, ub = 1 - rnd() * 0.02;
      const KF = 70;
      const pts = [], uu = [], vv = [];
      for (let k = 0; k <= KF; k++) {
        const u = ua + ((ub - ua) * k) / KF;
        const v = clamp(v0 + bunch(s, u, v0) + 0.0018 * Math.sin(ph + u * 23), 0, 1);
        const { P, N } = sample(s, u, v);
        pts.push(P.addScaledVector(N, topH(s, u, v) + 0.008));
        uu.push(u);
        vv.push(v);
      }
      const at = (arr, t) => arr[Math.min(KF, Math.round(t * KF))];
      const fr0 = 0.05 * (0.8 + 0.4 * jit);
      fibs.push(
        tube(
          pts,
          56,
          5,
          (t) => {
            const u = at(uu, t), v = at(vv, t);
            const f = tpF(s, u, v);
            let r = fr0 * (0.45 + 0.55 * prof(u)) * (1 + 0.42 * Math.max(f.bA, f.bL) + 0.5 * Math.max(f.kA, f.kL)) * (0.55 + 0.45 * edge(v));
            if (t < 0.02 || t > 0.98) r *= 0.35;
            return r;
          },
          (t, c) => {
            const u = at(uu, t), v = at(vv, t);
            c.copy(PINK).lerp(ROSE, 0.1 + 0.55 * tone * tone);
            c.lerp(APO, apoAt(u, v) * 0.92);
            const f = tpF(s, u, v);
            c.lerp(DEEP, Math.min(1, Math.max(f.bL, f.bA * 0.7) * 1.0));
            c.lerp(KNOT, Math.min(1, f.kL * 1.6) * 0.92);
            c.lerp(WARM, Math.min(1, f.bA * 0.4 + f.kA * 1.5));
            c.lerp(HOT, Math.min(1, f.kA * 1.1) * 0.18);
          },
          (t) => {
            const f = tpF(s, at(uu, t), at(vv, t));
            return Math.min(1, f.kA * 1.15 + f.bA * 0.22);
          }
        )
      );
    }
  }

  // ------------------------------------------------------------ Láminas (relleno bajo las fibras y fascia)
  const sheet = (s, hF, colF, uMaxF = () => 1, v0 = 0, v1 = 1, nu = NU, nv = NV, extra = null) => {
    const pos = [], col = [], ht = [], ex = [];
    const c = new THREE.Color();
    for (let j = 0; j <= nv; j++) {
      const v = v0 + ((v1 - v0) * j) / nv;
      const um = uMaxF(v);
      for (let i = 0; i <= nu; i++) {
        const u = (um * i) / nu;
        const { P, N } = sample(s, u, v);
        P.addScaledVector(N, hF(u, v));
        pos.push(P.x, P.y, P.z);
        const h = colF(u, v, c);
        col.push(c.r, c.g, c.b);
        ht.push(h || 0);
        if (extra) ex.push(extra(u, v));
      }
    }
    const idx = [];
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = (j + 1) * (nu + 1) + i;
        if (s > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
        else idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aHeat', new THREE.Float32BufferAttribute(ht, 1));
    if (extra) g.setAttribute('aEdge', new THREE.Float32BufferAttribute(ex, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const cores = sides.map((s) =>
    sheet(
      s,
      (u, v) => topH(s, u, v) - 0.014,
      (u, v, c) => {
        c.copy(DEEP).lerp(PINK, 0.3);
        c.lerp(APO, apoAt(u, v) * 0.8);
        const f = tpF(s, u, v);
        c.lerp(KNOT, Math.min(1, f.kL * 1.5 + f.bL * 0.5));
        c.lerp(WARM, Math.min(1, f.kA * 1.5));
        return f.kA;
      }
    )
  );

  // Fascia translúcida: velo fino sobre el músculo, apenas despegado en el hombro derecho, que se disuelve en el borde
  const FAS = 0.085;
  const liftW = (s, u, v) => (s > 0 ? ss(u, 0.72, 0.9) * (1 - ss(u, 0.93, 0.985)) * ss(v, 0.38, 0.47) * (1 - ss(v, 0.52, 0.6)) : 0);
  const lift = (s, u, v) => 0.25 * liftW(s, u, v);
  const fasciaH = (s) => (u, v) => {
    const t = tpF(s, u, v);
    return hBase(u, v) + (t.bump * 0.85 + t.band) * edge(v) + FAS * Math.pow(edge(v), 0.6) + lift(s, u, v);
  };
  const edgeFade = (u, v) => ss(u, 0, 0.03) * (1 - ss(u, 0.93, 0.985)) * edge(v);
  const fascias = sides.map((s) => sheet(s, fasciaH(s), (u, v, c) => (c.set('#ffffff'), liftW(s, u, v)), () => 0.985, 0.004, 0.996, 60, 100, edgeFade));

  const fasciaMat = new THREE.MeshPhysicalMaterial({
    color: '#e4eeff',
    emissive: new THREE.Color('#e4eeff'),
    emissiveIntensity: 0.05,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.25,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  fasciaMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float aHeat;\nattribute float aEdge;\nvarying float vLift;\nvarying float vEdge;\n' + fadeVS(sh).replace('vOY = position.y;', 'vOY = position.y; vLift = aHeat; vEdge = aEdge;');
    sh.fragmentShader = 'varying float vOY;\nvarying float vLift;\nvarying float vEdge;\n' + sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
       vec3 spc = max(outgoingLight - totalDiffuse, vec3(0.0));
       float a = clamp(0.06 + 0.14 * vLift + 0.3 * fres + 0.35 * max(max(spc.r, spc.g), spc.b), 0.0, 0.6) * vEdge;
       gl_FragColor = vec4(outgoingLight, a);
       ${FADE}`
    );
  };

  // ------------------------------------------------------------ Silueta translúcida (piel): cabeza, cuello, hombros, brazos
  const skinD = (x, y, z) => {
    const ax = Math.abs(x);
    // piel más ceñida en el cuello, para que el trapecio superior dibuje su contorno
    let d = bodyD(x, y, z) - (0.36 - 0.1 * ss(y, 1.9, 2.7) * (1 - ss(y, 3.3, 3.9)));
    d = smin(d, ell(ax, y, z, 2.95, 0.35, -0.85, 0.85, 1.05, 0.95), 0.6);
    d = smin(d, seg(ax, y, z, [3.2, 0.2, -0.9], [3.55, -2.6, -0.95], 0.72), 0.7);
    d = smin(d, ell(ax, y, z, 1.32, 3.95, -0.9, 0.17, 0.36, 0.24), 0.22);
    return d;
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
      nrm[p] = gx / l; nrm[p + 1] = gy / l; nrm[p + 2] = gz / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  }

  // ------------------------------------------------------------ Puntos gatillo: posición y marco local
  for (const t of TPS) {
    const { P, N } = sample(t.s, t.u, t.v);
    const P2 = sample(t.s, t.u + 0.01, t.v).P;
    const T = P2.sub(P).normalize();
    const B = V().crossVectors(N, T).normalize();
    t.P = P; t.N = N; t.T = V().crossVectors(B, N).normalize(); t.B = B;
    t.top = P.clone().addScaledVector(N, topH(t.s, t.u, t.v));
  }
  const A = TPS[0];

  // Estela de dolor referido del trapecio superior (patrón en "signo de pregunta"): sube por la cara posterolateral
  // derecha del cuello, pasa por detrás de la oreja (mastoides) y se curva por encima de ella hasta la sien.
  const PATH = [
    A.top.clone(),
    V(0.95, 2.6, -0.15),
    V(0.78, 3.1, -0.2),
    V(0.78, 3.5, -0.3),
    V(0.98, 3.85, -0.48),
    V(1.15, 4.2, -0.6),
    V(1.26, 4.46, -0.95),
    V(1.25, 4.42, -1.3),
    V(1.15, 4.28, -1.6),
  ].map((p, i) => (i === 0 ? p : projF(skinD, p, 0)));
  // ancho y presencia a lo largo de la estela (nace tenue en el punto gatillo, se concentra en mastoides y sien)
  const PW = [0.28, 0.3, 0.3, 0.32, 0.34, 0.33, 0.32, 0.32, 0.3];
  const PA = [0.0, 0.35, 0.55, 0.75, 0.9, 0.9, 0.85, 0.85, 0.0];

  const ghost = (color, { rim = 0.6, power = 2.4, base = 0.02, top0 = 98, top1 = 99, bot0 = -0.3, bot1 = 0.75 } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uRim: { value: rim },
        uPow: { value: power },
        uBase: { value: base },
        uWarm: { value: new THREE.Color('#ff8a5c') },
        uPath: { value: PATH },
        uPW: { value: PW },
        uPA: { value: PA },
      },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uRim; uniform float uPow; uniform float uBase; uniform vec3 uWarm;
        uniform vec3 uPath[${PATH.length}]; uniform float uPW[${PATH.length}]; uniform float uPA[${PATH.length}];
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
          float a = (uBase + uRim*f) * (1.0 - smoothstep(${top0.toFixed(2)}, ${top1.toFixed(2)}, vP.y)) * smoothstep(${bot0.toFixed(2)}, ${bot1.toFixed(2)}, vP.y);
          float z = 0.0;
          for (int i = 0; i < ${PATH.length - 1}; i++) {
            vec3 pa = vP - uPath[i]; vec3 ba = uPath[i+1] - uPath[i];
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            float d = length(pa - ba * h);
            float w = mix(uPW[i], uPW[i+1], h);
            z = max(z, exp(-d * d / (w * w)) * mix(uPA[i], uPA[i+1], h));
          }
          vec3 col = mix(uColor, uWarm, clamp(z * 1.6, 0.0, 1.0));
          a = max(a, 0.0) + z * 0.34;
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
  const skin = new THREE.Mesh(polygonize(skinD, [-4.6, -2.4, -2.9], [4.6, 6.8, 1.9], 0.075), ghost('#86aaf0', { rim: 0.62, power: 2.5, base: 0.018, top0: 4.4, top1: 5.3 }));
  skin.renderOrder = 1;

  // ------------------------------------------------------------ Montaje
  const root = new THREE.Group();
  const fibMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.44, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.25, sheenColor: new THREE.Color('#ffc4c4') }), '#ff6a3d', 0.85);
  const coreMat = heatMat(new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.4, side: THREE.DoubleSide }), '#ff5a3d', 0.6);
  root.add(new THREE.Mesh(mergeGeometries(fibs), fibMat));
  for (const g of cores) root.add(new THREE.Mesh(g, coreMat));
  for (const g of fascias) {
    const m = new THREE.Mesh(g, fasciaMat);
    m.renderOrder = 2;
    root.add(m);
  }
  root.add(skin);

  const CAM = V(2.4, 7.0, 10.5), LOOK = V(0.3, 1.9, -0.4);

  // Nódulos: engrosamiento fusiforme semienterrado bajo las fibras de la banda tensa
  for (const t of TPS) {
    const nod = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 28),
      t.act
        ? new THREE.MeshPhysicalMaterial({ color: '#ff5a2e', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: new THREE.Color('#ff3300'), emissiveIntensity: 0.5 })
        : new THREE.MeshPhysicalMaterial({ color: '#7d2436', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 })
    );
    nod.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t.T, t.N, t.B));
    nod.scale.set(t.act ? 0.7 : 0.55, t.act ? 0.12 : 0.1, t.act ? 0.22 : 0.18);
    nod.position.copy(t.P).addScaledVector(t.N, hBase(t.u, t.v) + t.amp * 0.35);
    root.add(nod);
  }

  // ------------------------------------------------------------ Ondas de dolor referido: cintas suaves pegadas a la
  // superficie del músculo, con centros que se corren hacia la nuca (el dolor sube por el cuello)
  const locate = (s, target, u0, v0) => {
    let u = u0, v = v0;
    for (let it = 0; it < 24; it++) {
      const P = sample(s, u, v).P;
      const eu = u > 0.995 ? -1e-3 : 1e-3, ev = v > 0.995 ? -1e-3 : 1e-3;
      const Pu = sample(s, u + eu, v).P.sub(P).divideScalar(eu);
      const Pv = sample(s, u, v + ev).P.sub(P).divideScalar(ev);
      const r = target.clone().sub(P);
      const a = Pu.dot(Pu), b = Pu.dot(Pv), c = Pv.dot(Pv), d1 = Pu.dot(r), d2 = Pv.dot(r);
      const det = a * c - b * b;
      if (Math.abs(det) < 1e-12) break;
      u = clamp(u + 0.8 * (c * d1 - b * d2) / det, 0, 1);
      v = clamp(v + 0.8 * (a * d2 - b * d1) / det, 0, 1);
    }
    const P = sample(s, u, v).P;
    return { u, v, miss: P.distanceTo(target) };
  };
  const occ = V(0, 3.75, -0.2);
  const dirOcc = occ.clone().sub(A.P);
  dirOcc.addScaledVector(A.N, -dirOcc.dot(A.N)).normalize();
  const side2 = V().crossVectors(A.N, dirOcc).normalize();
  const RAD = [0.45, 0.8, 1.15];
  const ALPHA = [0.65, 0.35, 0.15];
  const ringGeos = [];
  RAD.forEach((r, k) => {
    const n = 180;
    const ctr = A.P.clone().addScaledVector(dirOcc, k * 0.3);
    const pos = [], col = [], idx = [];
    const cc = C(k === 0 ? '#ff8a5c' : '#ff9a6b');
    const w = 0.032 - k * 0.006;
    let uv = { u: A.u, v: A.v };
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const radial = dirOcc.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side2, Math.sin(ang));
      const target = ctr.clone().addScaledVector(radial, r);
      uv = locate(1, target, uv.u, uv.v);
      const { P, N } = sample(1, uv.u, uv.v);
      const inside = (1 - ss(uv.miss, 0.04, 0.2)) * ss(uv.u, 0.02, 0.08) * ss(uv.v, 0.0, 0.05) * (1 - ss(uv.u, 0.94, 0.99));
      const up = 0.6 + 0.4 * Math.max(0, Math.cos(ang));
      const al = ALPHA[k] * inside * up;
      const base = P.clone().addScaledVector(N, topH(1, uv.u, uv.v) + 0.075);
      const rd = radial.clone().addScaledVector(N, -radial.dot(N)).normalize();
      for (const [o, aa] of [[-1, 0], [0, al], [1, 0]]) {
        const q = base.clone().addScaledVector(rd, o * w * 1.6);
        pos.push(q.x, q.y, q.z);
        col.push(cc.r, cc.g, cc.b, aa);
      }
    }
    for (let i = 0; i < n; i++) {
      const a0 = i * 3, a1 = (i + 1) * 3;
      for (let j = 0; j < 2; j++) idx.push(a0 + j, a1 + j, a0 + j + 1, a1 + j, a1 + j + 1, a0 + j + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    ringGeos.push(g);
  });
  const ringMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ringMesh = new THREE.Mesh(mergeGeometries(ringGeos), ringMat);
  ringMesh.renderOrder = 3;
  root.add(ringMesh);

  // Halo cálido sobre el punto activo (amplio y suave + núcleo denso)
  const hp = A.top.clone().addScaledVector(A.N, 0.12);
  for (const h of [halo('#ff9a6b', 3.4, 0.45), halo('#ff8a5c', 1.2, 0.6)]) {
    h.position.copy(hp);
    h.material.depthTest = false;
    h.renderOrder = 4;
    root.add(h);
  }

  return { root, cam: CAM.toArray(), look: LOOK.toArray(), zoom: 1.35, shadow: false, _dbg: { sample, topH, TPS, PATH, skin } };
}
