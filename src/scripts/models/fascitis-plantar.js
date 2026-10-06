// Fascitis plantar — esqueleto del pie en vista medial, levemente desde abajo.
// Calcáneo, astrágalo, escafoides, cuneiformes, cuboides, metatarsianos en abanico y falanges (huesos con
// articulaciones encajadas), tibia y peroné que se desvanecen hacia arriba, y por debajo la fascia plantar:
// banda fibrosa blanca aplanada desde la tuberosidad del calcáneo que se abre en cinco lengüetas hacia los dedos.
// Lesión: origen de la fascia en el talón engrosado, con fibras desordenadas y acento cálido.
// Contorno de la planta del pie en "vidrio" tenue.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // ------------------------------------------------------------ SDF
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
  // Caja redondeada con giro en z (cabeceo) y en y (rumbo)
  const rbox = (x, y, z, c, h, r, rz, ry) => {
    let px = x - c[0], py = y - c[1], pz = z - c[2];
    if (ry) {
      const cs = Math.cos(ry), sn = Math.sin(ry);
      const tx = cs * px - sn * pz;
      pz = sn * px + cs * pz;
      px = tx;
    }
    if (rz) {
      const cs = Math.cos(rz), sn = Math.sin(rz);
      const tx = cs * px + sn * py;
      py = -sn * px + cs * py;
      px = tx;
    }
    const qx = Math.abs(px) - h[0] + r, qy = Math.abs(py) - h[1] + r, qz = Math.abs(pz) - h[2] + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
  const smin = (a, b, k) => {
    if (k <= 0) return Math.min(a, b);
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

  // Constructor de huesos: suma suave de primitivas con caja envolvente automática y cortes articulares
  function shape() {
    const add = [];
    const sub = [];
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const grow = (c, r) => {
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], c[i] - r[i]);
        hi[i] = Math.max(hi[i], c[i] + r[i]);
      }
    };
    const S = {
      lo,
      hi,
      ell(c, r, k = 0.12) {
        add.push([(x, y, z) => ell(x, y, z, c[0], c[1], c[2], r[0], r[1], r[2]), k]);
        grow(c, r);
        return S;
      },
      cone(a, b, r1, r2, k = 0.12) {
        add.push([(x, y, z) => cone(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], r1, r2), k]);
        grow(a, [r1, r1, r1]);
        grow(b, [r2, r2, r2]);
        return S;
      },
      box(c, h, r, rz = 0, ry = 0, k = 0.1) {
        add.push([(x, y, z) => rbox(x, y, z, c, h, r, rz, ry), k]);
        const m = Math.hypot(h[0], h[1], h[2]);
        grow(c, [m, m, m]);
        return S;
      },
      // Resta otro hueso (dilatado por la luz articular) para que encajen sin fundirse
      fit(other, gap = 0.035, k = 0.05) {
        sub.push([(x, y, z) => other.raw(x, y, z) - gap, k]);
        return S;
      },
      groove(fn, k = 0.05) {
        sub.push([fn, k]);
        return S;
      },
      raw(x, y, z) {
        let d = add[0][0](x, y, z);
        for (let i = 1; i < add.length; i++) d = smin(d, add[i][0](x, y, z), add[i][1]);
        return d;
      },
      sdf(x, y, z) {
        let d = S.raw(x, y, z);
        for (const [f, k] of sub) d = smax(d, -f(x, y, z), k);
        return d;
      },
    };
    return S;
  }
  const geoOf = (S, h) => polygonize(S.sdf, [S.lo[0] - 0.1, S.lo[1] - 0.1, S.lo[2] - 0.1], [S.hi[0] + 0.1, S.hi[1] + 0.1, S.hi[2] + 0.1], h);

  // ------------------------------------------------------------ Materiales propios
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
  // Desvanecido hacia arriba (y del objeto entre f0 y f1) para materiales físicos
  const fadeTop = (mat, f0, f1) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uF0 = { value: f0 };
      sh.uniforms.uF1 = { value: f1 };
      sh.vertexShader = 'varying float vOY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOY = position.y;');
      sh.fragmentShader =
        'uniform float uF0; uniform float uF1; varying float vOY;\n' +
        sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= 1.0 - smoothstep(uF0, uF1, vOY);');
    };
    return mat;
  };
  const boneMat = () => new THREE.MeshPhysicalMaterial({ color: '#ede2cf', roughness: 0.46, clearcoat: 0.6, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color('#ffffff') });

  // ------------------------------------------------------------ Esqueleto (x+ = dedos, y+ = arriba, z+ = medial, hacia la cámara)
  const root = new THREE.Group();
  const foot = new THREE.Group();
  root.add(foot);
  const GAP = 0.035;

  const talus = shape()
    .ell([-1.32, 1.5, 0.04], [0.5, 0.32, 0.4])
    .ell([-1.28, 1.62, 0.04], [0.44, 0.24, 0.36], 0.15)
    .cone([-0.95, 1.48, 0.12], [-0.62, 1.43, 0.26], 0.27, 0.25, 0.15)
    .ell([-0.52, 1.4, 0.28], [0.2, 0.26, 0.3], 0.12)
    .ell([-1.8, 1.3, -0.04], [0.16, 0.13, 0.15], 0.1)
    .groove((x, y, z) => ell(x, y, z, -1.28, 1.98, 0.05, 0.6, 0.14, 0.07), 0.08);

  const calc = shape()
    .ell([-2.33, 0.72, -0.05], [0.4, 0.46, 0.38])
    .box([-1.6, 0.78, -0.1], [0.72, 0.27, 0.3], 0.2, 0.12, 0, 0.3)
    .ell([-1.52, 1.03, -0.08], [0.36, 0.15, 0.3], 0.18)
    .ell([-0.82, 0.92, -0.3], [0.2, 0.24, 0.27], 0.2)
    .ell([-2.15, 0.4, 0.0], [0.42, 0.15, 0.34], 0.22)
    .ell([-2.2, 0.37, 0.2], [0.22, 0.12, 0.14], 0.12)
    .ell([-1.3, 1.0, 0.3], [0.26, 0.08, 0.16], 0.24)
    .groove((x, y, z) => ell(x, y, z, -1.4, 0.8, 0.5, 0.6, 0.13, 0.16), 0.1)
    .fit(talus, GAP);

  const tibia = shape()
    .ell([-1.28, 2.1, 0.06], [0.52, 0.28, 0.5])
    .cone([-1.26, 2.2, 0.06], [-1.08, 4.6, 0.04], 0.46, 0.31, 0.3)
    .cone([-1.24, 2.05, 0.5], [-1.22, 1.5, 0.52], 0.17, 0.1, 0.2)
    .fit(talus, GAP);
  const fibula = shape()
    .cone([-1.52, 1.08, -0.56], [-1.5, 1.6, -0.58], 0.13, 0.19, 0.1)
    .cone([-1.5, 1.6, -0.58], [-1.36, 4.6, -0.48], 0.19, 0.13, 0.1)
    .fit(talus, GAP)
    .fit(tibia, GAP);

  const nav = shape()
    .ell([-0.22, 1.32, 0.3], [0.16, 0.27, 0.42])
    .ell([-0.2, 1.02, 0.66], [0.15, 0.14, 0.13], 0.12)
    .fit(talus, GAP);

  const cuboid = shape().box([-0.32, 0.84, -0.46], [0.31, 0.24, 0.27], 0.12, -0.12).fit(calc, GAP).fit(nav, GAP);
  const cunM = shape().box([0.22, 1.12, 0.58], [0.22, 0.32, 0.14], 0.11, -0.08).fit(nav, GAP);
  const cunI = shape().box([0.16, 1.36, 0.28], [0.15, 0.17, 0.12], 0.1, -0.05).fit(nav, GAP).fit(cunM, GAP);
  const cunL = shape().box([0.18, 1.24, -0.02], [0.2, 0.2, 0.14], 0.1, -0.08).fit(nav, GAP).fit(cunI, GAP).fit(cuboid, GAP);

  // Rayos: base y cabeza del metatarsiano, radios y falanges [largo, radio base, radio cabeza]
  const RAYS = [
    { b: [0.6, 1.02, 0.62], h: [1.98, 0.42, 0.8], rb: 0.2, rs: 0.12, rh: 0.19, ph: [[0.66, 0.15, 0.125], [0.5, 0.125, 0.085]], prox: cunM },
    { b: [0.48, 1.26, 0.3], h: [2.14, 0.4, 0.4], rb: 0.14, rs: 0.085, rh: 0.135, ph: [[0.5, 0.09, 0.075], [0.27, 0.075, 0.065], [0.2, 0.065, 0.05]], prox: cunI },
    { b: [0.52, 1.14, 0.0], h: [2.06, 0.38, 0.0], rb: 0.13, rs: 0.082, rh: 0.13, ph: [[0.45, 0.087, 0.072], [0.24, 0.072, 0.062], [0.18, 0.062, 0.048]], prox: cunL },
    { b: [0.12, 0.98, -0.32], h: [1.86, 0.36, -0.42], rb: 0.13, rs: 0.08, rh: 0.125, ph: [[0.4, 0.083, 0.07], [0.21, 0.07, 0.06], [0.17, 0.06, 0.046]], prox: cuboid },
    { b: [0.04, 0.8, -0.6], h: [1.62, 0.33, -0.8], rb: 0.13, rs: 0.08, rh: 0.125, ph: [[0.34, 0.08, 0.066], [0.17, 0.066, 0.056], [0.14, 0.056, 0.044]], prox: cuboid },
  ];
  const bones = [talus, nav, cuboid, cunM, cunI, cunL];
  const toeTips = [];
  let prevMT = null;
  RAYS.forEach((r, j) => {
    const { b, h } = r;
    const m = [(b[0] + h[0]) / 2, (b[1] + h[1]) / 2 + 0.06, (b[2] + h[2]) / 2];
    const mt = shape()
      .ell(b, [r.rb * 1.05, r.rb * 1.35, r.rb * 1.05])
      .cone(b, m, r.rb * 0.8, r.rs, 0.14)
      .cone(m, h, r.rs, r.rs * 1.1, 0.1)
      .ell([h[0] - 0.02, h[1], h[2]], [r.rh * 1.05, r.rh * 1.15, r.rh * 0.92], 0.12)
      .fit(r.prox, GAP);
    if (j === 1) mt.fit(cunM, GAP).fit(cunL, GAP);
    if (j === 4) mt.ell([-0.08, 0.72, -0.8], [0.16, 0.12, 0.12], 0.12);
    if (prevMT) mt.fit(prevMT, 0.02);
    bones.push(mt);
    prevMT = mt;
    // Dirección del dedo: abanico del metatarsiano, enderezado a medias
    const dx = h[0] - b[0], dz = h[2] - b[2];
    const l = Math.hypot(dx, dz);
    const d = V(dx / l + 1, 0, dz / l).normalize();
    let prev = mt;
    let p = V(h[0], h[1], h[2]).addScaledVector(d, r.rh * 0.8);
    const dy = [0.03, -0.05, -0.07];
    const TS = j === 0 ? 1.08 : 1.22;
    r.ph.forEach(([len, ra0, rb0], k) => {
      const ra = ra0 * TS, rb2 = rb0 * TS;
      const a = p.clone().addScaledVector(d, ra * 0.55);
      const e = a.clone().addScaledVector(d, len - ra * 0.5);
      e.y += dy[k] * (len / 0.3);
      const ph = shape()
        .ell([a.x, a.y, a.z], [ra * 0.85, ra * 0.95, ra * 1.12])
        .cone([a.x, a.y, a.z], [e.x, e.y, e.z], ra * 0.68, rb2 * 0.62, 0.08)
        .ell([e.x, e.y, e.z], [rb2 * 0.8, rb2 * 0.82, rb2 * 1.05], 0.06)
        .fit(prev, 0.03);
      bones.push(ph);
      prev = ph;
      p = e.clone().addScaledVector(d, rb2 * 0.5);
    });
    toeTips.push(p.clone());
  });
  // Sesamoideos bajo la cabeza del primer metatarsiano
  const ses = shape().ell([1.86, 0.2, 0.71], [0.08, 0.06, 0.06]).ell([1.86, 0.2, 0.9], [0.08, 0.06, 0.06], 0);

  const bm = boneMat();
  for (const s of [...bones, ses]) foot.add(new THREE.Mesh(geoOf(s, s.hi[0] - s.lo[0] > 1 ? 0.03 : 0.022), bm));

  // Calcáneo con tinte cálido alrededor de la inserción de la fascia
  const O = V(-2.12, 0.24, 0.16);
  const calcGeo = geoOf(calc, 0.028);
  {
    const p = calcGeo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const base = new THREE.Color('#ede2cf'), warm = new THREE.Color('#ffb48c'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const d = Math.hypot(p.getX(i) - O.x, (p.getY(i) - O.y) * 1.3, p.getZ(i) - O.z);
      c.copy(base).lerp(warm, 0.9 * Math.exp(-Math.pow(d / 0.5, 2)));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    calcGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const calcMat = boneMat();
  calcMat.color.set('#ffffff');
  calcMat.vertexColors = true;
  foot.add(new THREE.Mesh(calcGeo, calcMat));

  // Tibia y peroné: se desvanecen hacia arriba
  const legMat = fadeTop(boneMat(), 2.35, 3.3);
  for (const s of [tibia, fibula]) foot.add(new THREE.Mesh(geoOf(s, 0.032), legMat));

  // ------------------------------------------------------------ Fascia plantar
  const les = (s) => Math.exp(-Math.pow(s / 0.17, 2));
  const ends = RAYS.map((r) => V(r.h[0] + 0.16, r.h[1] - r.rh - 0.08, r.h[2]));
  const slipHW = [0.12, 0.09, 0.085, 0.08, 0.075];
  const W0 = 0.24, WM = 0.7, ZC = 0.04;
  const white = new THREE.Color('#ffffff'), warmF = new THREE.Color('#ff9466'), col = new THREE.Color();
  reseed(501);
  const fibGeos = [];
  const NF = 136, SAMP = 46, SEG = 56, RAD = 6;
  for (let i = 0; i < NF; i++) {
    const q = (i + rnd()) / NF; // 0 = medial … 1 = lateral
    const u = 1 - 2 * q;
    const jf = q * 5;
    const j = Math.min(4, Math.floor(jf));
    const ul = jf - j - 0.5;
    const v = rnd() * 2 - 1;
    const E = ends[j];
    const Ez = E.z - ul * 2 * slipHW[j];
    const Zm = ZC + u * WM;
    const Az = O.z + u * W0;
    const ph = rnd() * 10, jit = rnd();
    const pts = [];
    for (let k = 0; k <= SAMP; k++) {
      const s = k / SAMP;
      const x = O.x + (E.x - O.x) * s;
      const zf = Az + (Zm - Az) * sstep(0, 0.6, s);
      let z = zf + (Ez - zf) * sstep(0.48, 0.95, s);
      const th = 0.055 + 0.09 * les(s);
      let y = O.y + (E.y - O.y) * s + 0.07 * Math.sin(Math.PI * s) + v * th;
      const l = les(s);
      y += Math.sin(ph + s * 40 * (0.7 + jit)) * 0.03 * l;
      z += Math.cos(ph * 1.3 + s * 34 * (0.6 + jit)) * 0.05 * l;
      pts.push(V(x, y, z));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), SEG, 0.029 * (0.75 + 0.5 * jit), RAD, false);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let vtx = 0; vtx < n; vtx++) {
      const s = Math.floor(vtx / (RAD + 1)) / SEG;
      col.copy(white).lerp(warmF, 1 - sstep(0.1, 0.32, s));
      arr[vtx * 3] = col.r;
      arr[vtx * 3 + 1] = col.g;
      arr[vtx * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    fibGeos.push(g);
  }
  const fMat = M.tendon();
  fMat.vertexColors = true;
  foot.add(new THREE.Mesh(mergeGeometries(fibGeos), fMat));

  // Fibras desorganizadas en el origen (lesión)
  reseed(521);
  const loose = [];
  for (let i = 0; i < 10; i++) {
    const u = rnd() * 2 - 1;
    const side = i % 2 ? 1 : -1;
    const ph = rnd() * 10;
    const pts = [];
    const sA = 0.01 + rnd() * 0.04, sB = 0.2 + rnd() * 0.08;
    for (let k = 0; k <= 20; k++) {
      const s = sA + ((sB - sA) * k) / 20;
      const E = ends[2];
      const x = O.x + (E.x - O.x) * s;
      const z = O.z + u * W0 * (1 + 0.6 * s) + Math.sin(ph + k * 0.9) * 0.05;
      const y = O.y + (E.y - O.y) * s + 0.07 * Math.sin(Math.PI * s) + side * (0.055 + 0.09 * les(s) + 0.02) + Math.sin(ph * 1.7 + k * 1.3) * 0.025;
      pts.push(V(x, y, z));
    }
    loose.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 50, 0.022 + rnd() * 0.01, 6, false));
  }
  foot.add(new THREE.Mesh(mergeGeometries(loose), M.lesion()));

  // Resplandor cálido sobre el origen de la fascia
  const h1 = halo('#ff9a6b', 1.9, 0.5);
  h1.position.set(O.x + 0.35, O.y + 0.02, O.z + 0.45);
  foot.add(h1);
  const h2 = halo('#ffc2a0', 0.9, 0.5);
  h2.position.set(O.x + 0.32, O.y - 0.02, O.z + 0.4);
  foot.add(h2);
  // Envoltura cálida (fresnel) que dibuja el engrosamiento fusiforme del origen
  const Ec = ends[2];
  const spindle = [];
  for (let k = 0; k <= 8; k++) {
    const s = 0.34 * (k / 8);
    const r = 0.1 + 0.17 * Math.exp(-Math.pow((s - 0.06) / 0.11, 2));
    spindle.push([O.x + (Ec.x - O.x) * s, O.y + (Ec.y - O.y) * s + 0.07 * Math.sin(Math.PI * s), 0, r]);
  }
  const env = new THREE.Mesh(
    polygonize((x, y, z) => chain(x, y, (z - O.z) * 0.62, spindle), [O.x - 0.5, O.y - 0.45, O.z - 0.75], [O.x + 2.6, O.y + 0.5, O.z + 0.75], 0.035),
    ghost('#ff8a55', { rim: 0.75, power: 2.2, base: 0.07, f0: 50, f1: 60 })
  );
  env.renderOrder = 3;
  foot.add(env);

  // ------------------------------------------------------------ Contorno del pie (vidrio tenue)
  // Piel "loft": perfil a lo largo del pie [x, y inferior, y superior, semiancho, centro z]
  const KS = [
    [-2.9, 0.3, 1.2, 0.42, -0.03],
    [-2.55, 0.03, 1.3, 0.54, -0.03],
    [-2.0, 0.0, 1.55, 0.6, -0.02],
    [-1.3, 0.04, 2.05, 0.66, 0.0],
    [-0.5, 0.1, 1.82, 0.76, 0.02],
    [0.3, 0.08, 1.62, 0.9, 0.02],
    [1.1, 0.03, 1.2, 1.04, 0.02],
    [1.9, 0.0, 0.78, 1.12, 0.03],
    [2.5, 0.02, 0.6, 1.1, 0.06],
    [3.1, 0.07, 0.52, 0.98, 0.1],
    [3.5, 0.12, 0.45, 0.8, 0.14],
  ];
  const X0 = -2.9, X1 = 3.58, CAPB = 0.42, CAPF = 0.5;
  const prof = (x) => {
    let i = 0;
    while (i < KS.length - 2 && x > KS[i + 1][0]) i++;
    const A = KS[i], B = KS[i + 1];
    let t = clamp((x - A[0]) / (B[0] - A[0]), 0, 1);
    t = t * t * (3 - 2 * t);
    return [A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t, A[4] + (B[4] - A[4]) * t];
  };
  const footSDF = (x, y, z) => {
    if (x < X0 - 0.02 || x > X1 + 0.02) return Math.max(X0 - x, x - X1) + 0.02;
    let cap = 1;
    if (x < X0 + CAPB) cap = Math.sqrt(Math.max(0, 1 - Math.pow((X0 + CAPB - x) / CAPB, 2)));
    if (x > X1 - CAPF) cap = Math.sqrt(Math.max(0, 1 - Math.pow((x - (X1 - CAPF)) / CAPF, 2)));
    if (cap < 0.03) return 0.03;
    const [yb, yt, hw, zc] = prof(x);
    const ry = ((yt - yb) / 2) * cap, rz = hw * cap;
    const yc = (yb + yt) / 2;
    const ny = Math.abs((y - yc) / ry), nz = Math.abs((z - zc) / rz);
    return (Math.pow(Math.pow(ny, 2.6) + Math.pow(nz, 2.6), 1 / 2.6) - 1) * Math.min(ry, rz);
  };
  const skinSDF = (x, y, z) => {
    const f = footSDF(x, y, z);
    const leg = chain(x, y, z * 1.08, [[-1.32, 1.7, 0, 0.74], [-1.26, 2.6, 0, 0.64], [-1.12, 4.6, 0, 0.6]]);
    return smax(smin(f, leg, 0.5), -y, 0.1);
  };
  const skin = new THREE.Mesh(polygonize(skinSDF, [-3.1, -0.2, -1.4], [3.8, 3.7, 1.5], 0.06), ghost('#86aaf0', { rim: 0.65, power: 2.6, base: 0.016, f0: 2.6, f1: 3.6 }));
  skin.renderOrder = 2;
  foot.add(skin);

  // Luz de relleno desde abajo para que la planta y la fascia no queden en sombra
  const under = new THREE.DirectionalLight('#e6eeff', 1.1);
  under.position.set(1.5, -4, 4);
  root.add(under);

  // Sombra de contacto
  const sh = halo('#0a1530', 1, 0.22);
  sh.scale.set(6.4, 0.55, 1);
  sh.position.set(0.3, -0.25, -0.4);
  root.add(sh);

  const look = [0.3, 1.25, 0];
  return { root, cam: [look[0] + 4.4, look[1] - 2.9, 9.3], look, zoom: 1.0, shadow: false };
}
