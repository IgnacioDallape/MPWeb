// Tendinopatía de Aquiles — vista lateral de la pierna baja y el talón.
// Gemelos y sóleo (rosado) que se afinan en el tendón de Aquiles (haz de fibras blanco, levemente torsionado),
// inserción en el calcáneo, engrosamiento fusiforme a media porción con fibras desorganizadas y halo cálido.
// Contorno de pierna y pie en "vidrio" tenue y huesos del tarso / pie atenuados.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

  // ------------------------------------------------------------ SDF (distancias con signo)
  const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
    const k0 = Math.sqrt(a * a + b * b + c * c);
    const k1 = Math.sqrt((a * a) / (rx * rx) + (b * b) / (ry * ry) + (c * c) / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  // Cono redondeado entre dos esferas (a, r1) → (b, r2)
  const cone = (px, py, pz, ax, ay, az, bx, by, bz, r1, r2) => {
    const bax = bx - ax, bay = by - ay, baz = bz - az;
    const l2 = bax * bax + bay * bay + baz * baz;
    const rr = r1 - r2;
    const a2 = l2 - rr * rr;
    const il2 = 1 / l2;
    const pax = px - ax, pay = py - ay, paz = pz - az;
    const y = pax * bax + pay * bay + paz * baz;
    const z = y - l2;
    const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
    const x2 = xx * xx + xy * xy + xz * xz;
    const y2 = y * y * l2;
    const z2 = z * z * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  };
  const chain = (x, y, z, nodes) => {
    let d = 1e9;
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      d = Math.min(d, cone(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], a[3], b[3]));
    }
    return d;
  };
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);

  // Surface nets: malla suave a partir de una SDF
  function polygonize(sdf, bmin, bmax, h) {
    const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1;
    const ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1;
    const nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
    const F = new Float32Array(nx * ny * nz);
    let q = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[q++] = sdf(bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h);
    const I = (i, j, k) => i + nx * (j + ny * k);
    const cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const C = (i, j, k) => i + cx * (j + cy * k);
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
          vid[C(i, j, k)] = pos.length / 3;
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
          quad(vid[C(i, j - 1, k - 1)], vid[C(i, j, k - 1)], vid[C(i, j, k)], vid[C(i, j - 1, k)], !a);
        }
    for (let k = 1; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const a = F[I(i, j, k)] < 0;
          if (a === F[I(i, j + 1, k)] < 0) continue;
          quad(vid[C(i - 1, j, k - 1)], vid[C(i - 1, j, k)], vid[C(i, j, k)], vid[C(i, j, k - 1)], !a);
        }
    for (let k = 0; k < nz - 1; k++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const a = F[I(i, j, k)] < 0;
          if (a === F[I(i, j, k + 1)] < 0) continue;
          quad(vid[C(i - 1, j - 1, k)], vid[C(i, j - 1, k)], vid[C(i, j, k)], vid[C(i - 1, j, k)], !a);
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

  // ------------------------------------------------------------ Haz de fibras a lo largo de una curva
  // radius(s) → [semieje antero-posterior, semieje medio-lateral]; chaos(s) → desorden de fibras; tint(s) → color por vértice
  function curvedBundle({ pts, fibers = 50, radius, fiberRadius = 0.045, twist = 0.3, samples = 44, segments = 72, radial = 6, chaos = null, chaosFreq = 26, tint = null, bias = 0.5 }) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const P = [], N = [];
    const B = V(0, 0, 1);
    for (let k = 0; k <= samples; k++) {
      const s = k / samples;
      P.push(curve.getPointAt(s));
      const t = curve.getTangentAt(s);
      N.push(V(-t.y, t.x, 0).normalize());
    }
    const geos = [];
    const col = new THREE.Color();
    for (let i = 0; i < fibers; i++) {
      const r = Math.pow(rnd(), bias);
      const th0 = rnd() * Math.PI * 2;
      const jit = rnd();
      const ph = rnd() * 10;
      const fp = [];
      for (let k = 0; k <= samples; k++) {
        const s = k / samples;
        const [a, b] = radius(s);
        const th = th0 + twist * Math.PI * 2 * s;
        let u = Math.sin(th) * r * a;
        let w = Math.cos(th) * r * b;
        if (chaos) {
          const d = chaos(s);
          if (d > 1e-4) {
            u += Math.sin(ph + s * chaosFreq * (0.7 + jit * 0.8)) * d * (0.35 + jit);
            w += Math.cos(ph * 1.3 + s * chaosFreq * 0.8 * (0.6 + jit)) * d * (0.35 + jit) * 1.3;
          }
        }
        fp.push(P[k].clone().addScaledVector(N[k], u).addScaledVector(B, w));
      }
      const fr = fiberRadius * (0.75 + jit * 0.5);
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), segments, fr, radial, false);
      if (tint) {
        const n = g.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let vtx = 0; vtx < n; vtx++) {
          const ring = Math.floor(vtx / (radial + 1));
          tint(ring / segments, col, i);
          arr[vtx * 3] = col.r;
          arr[vtx * 3 + 1] = col.g;
          arr[vtx * 3 + 2] = col.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      }
      geos.push(g);
    }
    return { geo: mergeGeometries(geos), curve };
  }


  // ------------------------------------------------------------ Materiales propios
  // Contorno "vidrio" (fresnel) que se desvanece hacia arriba (coordenada y del objeto)
  const ghost = (color, { rim = 0.6, power = 2.4, base = 0.03, f0 = 6.0, f1 = 7.6 } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uRim: { value: rim }, uPow: { value: power }, uBase: { value: base }, uF0: { value: f0 }, uF1: { value: f1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uRim; uniform float uPow; uniform float uBase; uniform float uF0; uniform float uF1;
        varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
          float a = (uBase + uRim*f) * (1.0 - smoothstep(uF0, uF1, vY));
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
  // Desvanecido hacia arriba para materiales físicos (y del objeto entre f0 y f1)
  // rim > 0 suma un borde fresnel azulado (aspecto "rayos X" para los huesos atenuados)
  const fadeTop = (mat, f0, f1, rim = 0) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uF0 = { value: f0 };
      sh.uniforms.uF1 = { value: f1 };
      sh.uniforms.uRimK = { value: rim };
      sh.vertexShader = 'varying float vOY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOY = position.y;');
      sh.fragmentShader =
        'uniform float uF0; uniform float uF1; uniform float uRimK; varying float vOY;\n' +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          float frz = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0) * uRimK;
          gl_FragColor.rgb += vec3(0.55, 0.68, 0.95) * frz * 0.6;
          gl_FragColor.a = min(1.0, gl_FragColor.a * (1.0 + 1.6 * frz));
          gl_FragColor.a *= 1.0 - smoothstep(uF0, uF1, vOY);`
        );
    };
    return mat;
  };
  const faintBone = fadeTop(new THREE.MeshPhysicalMaterial({ color: '#e4ecfa', roughness: 0.5, clearcoat: 0.5, opacity: 0.4 }), 2.2, 3.8, 1);
  const muscleMat = fadeTop(M.muscle(), 5.7, 6.7);

  // ------------------------------------------------------------ Escena (coordenadas "de pie": x+ = dedos, y+ = arriba, z+ = lateral)
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Calcáneo (hueso protagonista, sólido)
  const calcSDF = (x, y, z) => {
    let d = ell(x, y, z, -0.86, 0.56, 0, 0.47, 0.55, 0.42);
    d = smin(d, cone(x, y, z * 1.15, -0.75, 0.48, 0, 0.45, 0.66, 0, 0.4, 0.32), 0.25);
    d = smin(d, ell(x, y, z, 0.72, 0.7, 0.08, 0.27, 0.27, 0.33), 0.2);
    d = smin(d, ell(x, y, z, -0.62, 0.18, 0, 0.52, 0.19, 0.4), 0.25);
    d = smin(d, ell(x, y, z, 0.05, 0.36, 0, 0.5, 0.18, 0.3), 0.25);
    d = smin(d, ell(x, y, z, -0.82, 0.92, 0, 0.3, 0.24, 0.3), 0.2);
    d = smax(d, -ell(x, y, z, 0.1, 1.3, 0, 0.55, 0.4, 0.6), 0.15);
    return d;
  };
  body.add(new THREE.Mesh(polygonize(calcSDF, [-1.5, -0.2, -0.7], [1.15, 1.35, 0.7], 0.032), new THREE.MeshPhysicalMaterial({ color: '#e9dcc6', roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.22 })));

  // Huesos atenuados: astrágalo, tibia, peroné, tarso anterior, metatarsianos y falanges
  const MT_BASE = [[1.85, 1.05, -0.45], [1.85, 1.12, -0.15], [1.8, 1.0, 0.12], [1.7, 0.85, 0.35], [1.52, 0.55, 0.55]];
  const MT_HEAD = [[3.65, 0.32, -0.62], [3.75, 0.36, -0.3], [3.7, 0.36, 0.0], [3.6, 0.34, 0.28], [3.45, 0.3, 0.55]];
  const faintSDF = (x, y, z) => {
    let t = ell(x, y, z, 0.12, 1.28, 0, 0.52, 0.34, 0.46);
    t = smin(t, ell(x, y, z, 0.12, 1.42, 0, 0.44, 0.3, 0.4), 0.1);
    t = smin(t, cone(x, y, z, 0.35, 1.25, 0, 0.85, 1.15, 0, 0.27, 0.26), 0.12);
    let d = chain(x, y, z, [[0.15, 1.95, 0, 0.5], [0.22, 2.9, 0, 0.33], [0.3, 7.9, 0, 0.31]]);
    d = smin(d, ell(x, y, z, 0.15, 2.0, 0, 0.55, 0.3, 0.55), 0.2);
    d = smin(d, cone(x, y, z, 0.18, 2.0, -0.32, 0.2, 1.35, -0.48, 0.28, 0.17), 0.15);
    d = Math.min(d, t);
    d = Math.min(d, chain(x, y, z, [[-0.12, 1.0, 0.55, 0.15], [-0.18, 1.45, 0.56, 0.2], [-0.22, 2.4, 0.52, 0.13], [-0.32, 7.9, 0.48, 0.12]]));
    d = Math.min(d, ell(x, y, z, 1.25, 1.12, -0.18, 0.2, 0.32, 0.4));
    d = Math.min(d, ell(x, y, z, 1.18, 0.62, 0.3, 0.36, 0.3, 0.32));
    d = Math.min(d, ell(x, y, z, 1.62, 1.12, -0.45, 0.2, 0.28, 0.17));
    d = Math.min(d, ell(x, y, z, 1.6, 1.18, -0.08, 0.18, 0.24, 0.16));
    d = Math.min(d, ell(x, y, z, 1.58, 1.0, 0.25, 0.18, 0.25, 0.16));
    for (let i = 0; i < 5; i++) {
      const b = MT_BASE[i], hd = MT_HEAD[i];
      const r = i === 0 ? 0.15 : 0.1;
      let m = cone(x, y, z, b[0], b[1], b[2], hd[0], hd[1], hd[2], r * 1.15, r);
      m = smin(m, ell(x, y, z, hd[0] - 0.05, hd[1] + 0.02, hd[2], r * 1.25, r * 1.3, r * 1.25), 0.06);
      const p1 = [hd[0] + 0.5, 0.24, hd[2] * 1.08];
      const p2 = [p1[0] + (i === 0 ? 0.42 : 0.34), 0.2, hd[2] * 1.1];
      m = Math.min(m, cone(x, y, z, hd[0] + 0.12, hd[1] - 0.02, hd[2], p1[0], p1[1], p1[2], r * 0.85, r * 0.7));
      m = Math.min(m, cone(x, y, z, p1[0] + 0.05, p1[1], p1[2], p2[0], p2[1], p2[2], r * 0.68, r * 0.55));
      d = Math.min(d, m);
    }
    return d;
  };
  const faintGeo = polygonize(faintSDF, [-0.6, 0.0, -1.0], [4.8, 4.2, 1.0], 0.05);
  // Pre-pasada de profundidad: la transparencia muestra solo la capa más cercana (sin bandas por superposición)
  const depthMat = new THREE.ShaderMaterial({
    uniforms: { uCut: { value: 3.7 } },
    vertexShader: 'varying float vY; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uCut; varying float vY; void main(){ if (vY > uCut) discard; gl_FragColor = vec4(0.0); }',
    colorWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
  });
  body.add(new THREE.Mesh(faintGeo, depthMat));
  faintBone.depthWrite = false;
  const faint = new THREE.Mesh(faintGeo, faintBone);
  faint.renderOrder = 1;
  body.add(faint);

  // Músculos: gemelo (cabezas lateral y medial) y sóleo; se desvanecen hacia la rodilla
  const rise = (s, s1, p = 0.6) => Math.pow(Math.sin((Math.PI / 2) * Math.min(1, Math.max(0, s / s1))), p);
  reseed(301);
  const soleus = curvedBundle({
    pts: [V(-1.05, 3.2, 0), V(-1.08, 3.9, 0), V(-1.0, 5.0, 0), V(-0.9, 6.2, 0), V(-0.82, 7.3, 0)],
    fibers: 64,
    fiberRadius: 0.066,
    twist: 0.04,
    radius: (s) => [0.1 + 0.5 * rise(s, 0.5), 0.14 + 0.85 * rise(s, 0.45)],
    segments: 40,
    radial: 5,
  });
  const muscleDepth = depthMat.clone();
  muscleDepth.uniforms.uCut.value = 7.0;
  body.add(new THREE.Mesh(soleus.geo, muscleMat), new THREE.Mesh(soleus.geo, muscleDepth));
  const gastro = (seed, side, y0, a1, b1) => {
    reseed(seed);
    return curvedBundle({
      pts: [V(-1.25, y0, 0.1 * side), V(-1.55, y0 + 0.75, 0.24 * side), V(-1.72, y0 + 1.75, 0.3 * side), V(-1.68, y0 + 2.8, 0.3 * side), V(-1.55, 7.4, 0.28 * side)],
      fibers: 54,
      fiberRadius: 0.066,
      twist: 0.05 * side,
      radius: (s) => {
        const f = rise(s, 0.42, 0.65) * (1 - 0.12 * THREE.MathUtils.smoothstep(s, 0.5, 1));
        return [0.1 + a1 * f, 0.1 + b1 * f];
      },
      segments: 40,
      radial: 5,
    });
  };
  for (const gq of [gastro(302, 1, 4.35, 0.58, 0.46).geo, gastro(303, -1, 4.15, 0.62, 0.5).geo]) body.add(new THREE.Mesh(gq, muscleMat), new THREE.Mesh(gq, muscleDepth));

  // Tendón de Aquiles con engrosamiento fusiforme a media porción
  const S0 = 0.3; // centro de la lesión (≈ 4 cm sobre la inserción)
  const gl = (s) => Math.exp(-Math.pow((s - S0) / 0.09, 2));
  const warm = new THREE.Color('#ff9466');
  const white = new THREE.Color('#ffffff');
  const TA = 0.24, TB = 0.38, SA = 0.55, SB = 0.4;
  const tRad = (s) => {
    const ins = Math.exp(-Math.pow(s / 0.07, 2));
    const top = THREE.MathUtils.smoothstep(s, 0.6, 1);
    const g = gl(s);
    return [(TA + 0.05 * ins - 0.05 * top) * (1 + SA * g), (TB + 0.14 * ins + 0.12 * top) * (1 + SB * g)];
  };
  reseed(311);
  const tendon = curvedBundle({
    pts: [V(-1.1, 0.5, 0), V(-1.26, 0.85, 0), V(-1.22, 1.5, 0), V(-1.15, 2.3, 0), V(-1.14, 3.1, 0), V(-1.18, 3.9, 0), V(-1.24, 4.7, 0), V(-1.3, 5.5, 0)],
    fibers: 100,
    fiberRadius: 0.05,
    twist: 0.25,
    samples: 60,
    segments: 72,
    bias: 0.45,
    radius: tRad,
    chaos: (s) => 0.06 * gl(s),
    chaosFreq: 14,
    tint: (s, c) => {
      const g = THREE.MathUtils.smoothstep(gl(s), 0.1, 0.7);
      c.copy(white).lerp(warm, g);
    },
  });
  const tMat = M.tendon();
  tMat.vertexColors = true;
  body.add(new THREE.Mesh(tendon.geo, tMat));

  // Fibras desorganizadas (onduladas, levantadas) sobre el engrosamiento
  reseed(321);
  const loose = [];
  const curve = tendon.curve;
  for (let i = 0; i < 8; i++) {
    const sA = S0 - 0.13 + rnd() * 0.05;
    const sB = S0 + 0.08 + rnd() * 0.05;
    const th0 = rnd() * Math.PI * 2;
    const ph = rnd() * 10;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const s = sA + ((sB - sA) * k) / 24;
      const P = curve.getPointAt(s);
      const t = curve.getTangentAt(s);
      const N = V(-t.y, t.x, 0).normalize();
      const [a, b] = tRad(s);
      const rr = 1.0 + 0.1 * gl(s) + 0.07 * Math.sin(ph + k * 2.4);
      const th = th0 + 0.25 * Math.PI * 2 * s + Math.sin(ph + k * 0.9) * 0.18;
      pts.push(P.addScaledVector(N, Math.sin(th) * a * rr).add(V(0, 0, Math.cos(th) * b * rr)));
    }
    loose.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.026 + rnd() * 0.01, 6, false));
  }
  body.add(new THREE.Mesh(mergeGeometries(loose), M.lesion()));

  const lc = curve.getPointAt(S0);
  const h1 = halo('#ff9a6b', 2.2, 0.7);
  h1.position.set(lc.x - 0.1, lc.y, 0.75);
  body.add(h1);
  const h2 = halo('#ffc2a0', 1.0, 0.55);
  h2.position.set(lc.x, lc.y, 0.8);
  body.add(h2);

  // Envoltura cálida (fresnel) que dibuja el engrosamiento fusiforme
  const spindle = [];
  for (let k = 0; k <= 10; k++) {
    const s = S0 - 0.16 + (0.32 * k) / 10;
    const p = curve.getPointAt(s);
    spindle.push([p.x, p.y, 0, tRad(s)[0] * 1.18]);
  }
  const envSDF = (x, y, z) => chain(x, y, z * 0.62, spindle);
  const env = new THREE.Mesh(polygonize(envSDF, [lc.x - 1.0, lc.y - 1.3, -1.2], [lc.x + 1.0, lc.y + 1.3, 1.2], 0.04), ghost('#ff8a55', { rim: 0.9, power: 2.0, base: 0.05, f0: 50, f1: 60 }));
  env.renderOrder = 3;
  body.add(env);

  // Contorno de pierna y pie (vidrio tenue)
  const skinSDF = (x, y, z) => {
    const d = chain(x, y, z * 1.1, [[-0.25, 1.3, 0, 1.05], [-0.27, 2.4, 0, 1.0], [-0.48, 3.6, 0, 1.17], [-0.72, 4.9, 0, 1.52], [-0.82, 6.2, 0, 1.74], [-0.82, 7.6, 0, 1.76]]);
    let f = ell(x, y, z, -0.72, 0.62, 0, 0.82, 0.66, 0.62);
    f = smin(f, ell(x, y, z, 1.1, 0.82, 0, 1.55, 0.8, 0.74), 0.6);
    f = smin(f, ell(x, y, z, 3.0, 0.45, 0.05, 1.25, 0.46, 0.98), 0.6);
    f = smin(f, ell(x, y, z, 4.3, 0.3, 0.05, 0.62, 0.3, 0.92), 0.5);
    return smin(d, f, 0.6);
  };
  const skin = new THREE.Mesh(polygonize(skinSDF, [-2.8, -0.3, -1.7], [5.2, 7.4, 1.7], 0.085), ghost('#86aaf0', { rim: 0.65, power: 2.6, base: 0.025, f0: 5.4, f1: 6.7 }));
  skin.renderOrder = 2;
  body.add(skin);

  // Pose: apoyo de talón (pierna inclinada, punta del pie levemente arriba)
  body.rotation.z = 0.62;
  root.updateMatrixWorld(true);
  // Sombra de contacto propia, ceñida al talón y al pie
  const sh = halo('#0a1530', 1, 0.24);
  sh.scale.set(5.6, 0.6, 1);
  sh.position.set(0.7, -0.78, -0.3);
  root.add(sh);
  const look = V(-1.36, 2.64, 0);
  return { root, cam: [look.x - 4.5, look.y + 1.6, 14], look: [look.x, look.y, look.z], zoom: 1.15, shadow: false };
}
