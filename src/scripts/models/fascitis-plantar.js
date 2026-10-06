// Fascitis plantar — esqueleto del pie en vista medial, con la cámara casi a la altura del arco.
// Calcáneo (tuberosidad con procesos plantares y sustentáculo), astrágalo, escafoides, cuñas, cuboides,
// metatarsianos en abanico y dedos articulados que apoyan hacia el suelo; tibia y peroné que se desvanecen.
// Por debajo, la fascia plantar: una sola lámina fibrosa aplanada (SDF) que nace en la tuberosidad medial
// del calcáneo, tensa el arco como una cuerda y se abre en cinco lengüetas hasta la base de los dedos.
// Lesión: origen engrosado en huso, con tinte cálido, algunas fibras abiertas y resplandor.
// Contorno del pie en vidrio tenue, con los dedos modelados.
export default function build(L) {
  const { THREE, M, halo, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
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
  // Intersección con borde redondeado de radio r (para láminas)
  const roundMax = (a, b, r) => Math.hypot(Math.max(a + r, 0), Math.max(b + r, 0)) + Math.min(Math.max(a + r, b + r), 0) - r;

  // Surface nets con proyección de vértices sobre la superficie (siluetas limpias, sin dientes).
  // h puede ser un número o [hx, hy, hz] (rejilla anisótropa, p. ej. más fina en el espesor de la fascia).
  function polygonize(sdf, bmin, bmax, hh, smooth = 0.3) {
    const [hx, hy, hz] = Array.isArray(hh) ? hh : [hh, hh, hh];
    const h = Math.min(hx, hy, hz);
    const nx = Math.ceil((bmax[0] - bmin[0]) / hx) + 1;
    const ny = Math.ceil((bmax[1] - bmin[1]) / hy) + 1;
    const nz = Math.ceil((bmax[2] - bmin[2]) / hz) + 1;
    const F = new Float32Array(nx * ny * nz);
    let q = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[q++] = sdf(bmin[0] + i * hx, bmin[1] + j * hy, bmin[2] + k * hz);
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
          pos.push(bmin[0] + (i + sx / n) * hx, bmin[1] + (j + sy / n) * hy, bmin[2] + (k + sz / n) * hz);
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
    // Proyección (un paso de Newton) y normales por gradiente
    let e = h * 0.3;
    const en = h * smooth;
    const grad = (x, y, z) => [sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)];
    const nrm = new Float32Array(pos.length);
    for (let p = 0; p < pos.length; p += 3) {
      let x = pos[p], y = pos[p + 1], z = pos[p + 2];
      let g = grad(x, y, z);
      let l = Math.hypot(g[0], g[1], g[2]);
      if (l > 1e-9) {
        const d = sdf(x, y, z);
        const step = clamp(d / (l / (2 * e)), -0.45 * h, 0.45 * h);
        x -= (g[0] / l) * step;
        y -= (g[1] / l) * step;
        z -= (g[2] / l) * step;
        pos[p] = x;
        pos[p + 1] = y;
        pos[p + 2] = z;
        e = en;
        g = grad(x, y, z);
        e = h * 0.3;
        l = Math.hypot(g[0], g[1], g[2]) || 1;
      }
      nrm[p] = g[0] / l;
      nrm[p + 1] = g[1] / l;
      nrm[p + 2] = g[2] / l;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    return geo;
  }

  // Constructor de huesos: suma suave de primitivas, planos articulares y cortes por los huesos vecinos
  function shape() {
    const add = [];
    const cuts = [];
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
      // Plano de faceta articular: conserva el lado dot(n, p) < off
      cut(n, off, k = 0.06) {
        const l = Math.hypot(n[0], n[1], n[2]);
        const a = n[0] / l, b = n[1] / l, c = n[2] / l;
        cuts.push([(x, y, z) => a * x + b * y + c * z - off, k]);
        return S;
      },
      // Resta otro hueso (dilatado por la luz articular) para que encajen sin fundirse
      fit(other, gap = 0.03, k = 0.05) {
        sub.push([(x, y, z) => other.body(x, y, z) - gap, k]);
        return S;
      },
      groove(fn, k = 0.05) {
        sub.push([fn, k]);
        return S;
      },
      body(x, y, z) {
        let d = add[0][0](x, y, z);
        for (let i = 1; i < add.length; i++) d = smin(d, add[i][0](x, y, z), add[i][1]);
        for (const [f, k] of cuts) d = smax(d, f(x, y, z), k);
        return d;
      },
      sdf(x, y, z) {
        let d = S.body(x, y, z);
        for (const [f, k] of sub) d = smax(d, -f(x, y, z), k);
        return d;
      },
    };
    return S;
  }
  const geoOf = (S, h) => polygonize(S.sdf, [S.lo[0] - 0.08, S.lo[1] - 0.08, S.lo[2] - 0.08], [S.hi[0] + 0.08, S.hi[1] + 0.08, S.hi[2] + 0.08], h);

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
  // Oscurecimiento suave hacia la silueta: define volúmenes y separa piezas sobre fondo claro
  const rimDark = (sh, k) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      diffuseColor.rgb *= mix(${k.toFixed(3)}, 1.0, smoothstep(0.0, 0.55, abs(dot(normal, normalize(vViewPosition)))));`
    );
  };
  const fadeTop = (mat, f0, f1) => {
    mat.transparent = true;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uF0 = { value: f0 };
      sh.uniforms.uF1 = { value: f1 };
      sh.vertexShader = 'varying float vOY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOY = position.y;');
      sh.fragmentShader =
        'uniform float uF0; uniform float uF1; varying float vOY;\n' +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          '#include <dithering_fragment>\n float ff = smoothstep(uF0, uF1, vOY);\n gl_FragColor.rgb *= mix(vec3(1.0), vec3(0.62, 0.69, 0.86), ff);\n gl_FragColor.a *= 1.0 - ff;'
        );
    };
    return mat;
  };
  const boneMat = () => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.28, sheen: 0.25, sheenColor: new THREE.Color('#ffffff') });
    m.onBeforeCompile = (sh) => rimDark(sh, 0.8);
    return m;
  };

  // ------------------------------------------------------------ Esqueleto (x+ = dedos, y+ = arriba, z+ = medial, hacia la cámara)
  const root = new THREE.Group();
  const foot = new THREE.Group();
  root.add(foot);
  const GAP = 0.03;

  const talus = shape()
    .ell([-1.32, 1.52, 0.04], [0.5, 0.32, 0.4])
    .ell([-1.28, 1.64, 0.04], [0.44, 0.24, 0.36], 0.15)
    .cone([-0.95, 1.5, 0.12], [-0.62, 1.5, 0.26], 0.26, 0.24, 0.15)
    .ell([-0.5, 1.48, 0.29], [0.2, 0.26, 0.3], 0.12)
    .ell([-1.8, 1.32, -0.04], [0.16, 0.13, 0.15], 0.1)
    .groove((x, y, z) => ell(x, y, z, -1.28, 2.0, 0.05, 0.6, 0.14, 0.07), 0.08);

  // Calcáneo: tuberosidad alta con la cara posterior aplanada, procesos plantares medial y lateral
  // (origen de la fascia), sustentáculo del astrágalo y apófisis anterior hacia el cuboides.
  const calc = shape()
    .ell([-2.28, 0.78, -0.05], [0.34, 0.48, 0.36])
    .box([-1.62, 0.8, -0.1], [0.72, 0.26, 0.3], 0.2, 0.12, 0, 0.3)
    .ell([-1.55, 1.05, -0.08], [0.36, 0.15, 0.3], 0.18)
    .ell([-0.82, 0.93, -0.3], [0.2, 0.24, 0.27], 0.2)
    .ell([-2.16, 0.5, -0.03], [0.3, 0.16, 0.3], 0.2)
    .ell([-2.06, 0.33, 0.17], [0.2, 0.12, 0.14], 0.14)
    .ell([-2.12, 0.34, -0.22], [0.15, 0.1, 0.11], 0.14)
    .ell([-1.06, 0.6, -0.14], [0.13, 0.08, 0.13], 0.16)
    .ell([-1.3, 1.06, 0.34], [0.28, 0.085, 0.2], 0.2)
    .cut([-1, 0, 0], 2.55, 0.16)
    .groove((x, y, z) => ell(x, y, z, -1.4, 0.88, 0.56, 0.62, 0.09, 0.12), 0.1)
    .fit(talus, GAP);

  // Tibia con maléolo medial ancho y peroné con maléolo lateral (se desvanecen hacia arriba)
  const tibia = shape()
    .ell([-1.28, 2.12, 0.06], [0.52, 0.28, 0.5])
    .cone([-1.26, 2.2, 0.06], [-1.14, 3.5, 0.04], 0.46, 0.33, 0.3)
    .ell([-1.22, 1.76, 0.5], [0.22, 0.28, 0.1], 0.2)
    .fit(talus, GAP);
  const fibula = shape()
    .cone([-1.52, 1.1, -0.56], [-1.5, 1.6, -0.58], 0.13, 0.19, 0.1)
    .cone([-1.5, 1.6, -0.58], [-1.38, 3.5, -0.5], 0.19, 0.13, 0.1)
    .fit(talus, GAP)
    .fit(tibia, GAP);

  // Mediopié elevado (arco): escafoides con su tuberosidad, cuñas en cuña y cuboides con surco peroneo
  const nav = shape()
    .ell([-0.2, 1.42, 0.3], [0.17, 0.27, 0.42])
    .ell([-0.19, 1.18, 0.6], [0.15, 0.12, 0.13], 0.26)
    .fit(talus, GAP);
  // Cuñas: caras articulares planas (delante y detrás) y perfil en cuña; la medial alta, ancha abajo,
  // la intermedia y la lateral más anchas en el dorso
  const cunM = shape()
    .cone([0.19, 1.56, 0.56], [0.21, 1.02, 0.61], 0.12, 0.2, 0.1)
    .ell([0.2, 0.92, 0.64], [0.17, 0.1, 0.14], 0.14)
    .cut([1, 0, 0], 0.42, 0.07)
    .cut([-1, 0, 0], 0.03, 0.07)
    .fit(nav, GAP);
  const cunI = shape()
    .cone([0.14, 1.5, 0.3], [0.14, 1.2, 0.3], 0.15, 0.08, 0.1)
    .cut([1, 0, 0], 0.3, 0.06)
    .cut([-1, 0, 0], 0.0, 0.06)
    .fit(nav, GAP)
    .fit(cunM, GAP);
  const cunL = shape()
    .cone([0.16, 1.4, -0.03], [0.16, 1.05, -0.03], 0.17, 0.1, 0.1)
    .cut([1, 0, 0], 0.36, 0.06)
    .cut([-1, 0, 0], 0.02, 0.06)
    .fit(nav, GAP)
    .fit(cunI, GAP);
  const cuboid = shape()
    .ell([-0.3, 0.88, -0.48], [0.32, 0.26, 0.29])
    .ell([-0.36, 0.7, -0.5], [0.14, 0.09, 0.24], 0.12)
    .cut([0.97, 0, 0.243], -0.155, 0.08)
    .groove((x, y, z) => ell(x, y, z, -0.17, 0.66, -0.5, 0.075, 0.075, 0.7), 0.05)
    .fit(calc, GAP)
    .fit(nav, GAP)
    .fit(cunL, GAP);

  // Rayos: base y cabeza del metatarsiano, radios, falanges [largo, radio base, radio cabeza] y flexión de cada falange
  const RAYS = [
    { b: [0.6, 1.1, 0.62], h: [1.98, 0.42, 0.8], rb: 0.2, rby: 1.5, rs: 0.12, rh: 0.19, prox: [cunM], ph: [[0.66, 0.162, 0.135], [0.5, 0.135, 0.095]], pitch: [-0.05, -0.15] },
    { b: [0.48, 1.33, 0.3], h: [2.14, 0.4, 0.4], rb: 0.14, rby: 1.35, rs: 0.085, rh: 0.135, prox: [cunI, cunM, cunL], ph: [[0.5, 0.11, 0.092], [0.23, 0.092, 0.078], [0.17, 0.078, 0.06]], pitch: [-0.1, -0.52, -0.38] },
    { b: [0.52, 1.2, 0.0], h: [2.06, 0.38, 0.0], rb: 0.13, rby: 1.35, rs: 0.082, rh: 0.13, prox: [cunL], ph: [[0.45, 0.106, 0.088], [0.2, 0.088, 0.076], [0.15, 0.076, 0.058]], pitch: [-0.11, -0.52, -0.38] },
    { b: [0.12, 1.02, -0.32], h: [1.86, 0.36, -0.42], rb: 0.13, rby: 1.35, rs: 0.08, rh: 0.125, prox: [cuboid, cunL], ph: [[0.4, 0.1, 0.085], [0.18, 0.085, 0.073], [0.145, 0.073, 0.056]], pitch: [-0.12, -0.5, -0.36] },
    { b: [0.04, 0.82, -0.6], h: [1.62, 0.33, -0.8], rb: 0.13, rby: 1.35, rs: 0.08, rh: 0.125, prox: [cuboid], ph: [[0.34, 0.097, 0.08], [0.145, 0.08, 0.068], [0.12, 0.068, 0.054]], pitch: [-0.12, -0.48, -0.34] },
  ];
  const MTS = [];
  const PHS = [];
  const TOE = []; // nodos de piel de cada dedo
  let prevMT = null;
  RAYS.forEach((r, j) => {
    const { b, h } = r;
    const m = [(b[0] + h[0]) / 2, (b[1] + h[1]) / 2 + 0.06, (b[2] + h[2]) / 2];
    const mt = shape()
      .ell(b, [r.rb * 1.05, r.rb * r.rby, r.rb * 1.05])
      .cone(b, m, r.rb * 0.8, r.rs, 0.14)
      .cone(m, h, r.rs, r.rs * 1.1, 0.1)
      .ell([h[0] - 0.02, h[1], h[2]], [r.rh * 1.05, r.rh * 1.15, r.rh * 0.92], 0.12);
    for (const p of r.prox) mt.fit(p, GAP);
    if (j === 4) mt.ell([-0.08, 0.74, -0.8], [0.16, 0.12, 0.12], 0.12);
    if (prevMT) mt.fit(prevMT, 0.02);
    MTS.push(mt);
    prevMT = mt;
    // Dedo: dirección del abanico enderezada a medias, cada falange con su flexión hacia el suelo
    const dx = h[0] - b[0], dz = h[2] - b[2];
    const l = Math.hypot(dx, dz);
    const d = V(dx / l + 1, 0, dz / l).normalize();
    let prev = mt;
    let c = V(h[0] - 0.02, h[1], h[2]);
    let cR = r.rh * 1.05;
    const nodes = [[c.x, c.y, c.z, r.rh + 0.13]];
    let dir = null, rbL = 0;
    r.ph.forEach(([len, ra, rb], k) => {
      const p = r.pitch[k];
      dir = V(d.x * Math.cos(p), Math.sin(p), d.z * Math.cos(p));
      const a = c.clone().addScaledVector(dir, cR * 0.9 + ra * 0.55);
      const e = a.clone().addScaledVector(dir, Math.max(len - ra * 0.6 - rb * 0.6, 0.05));
      const last = k === r.ph.length - 1;
      const ph = shape()
        .ell([a.x, a.y, a.z], [ra, ra * 0.96, ra * 1.12])
        .cone([a.x, a.y, a.z], [e.x, e.y, e.z], ra * 0.6, rb * 0.58, 0.07)
        .ell([e.x, e.y, e.z], last ? [rb * 0.85, rb * 0.6, rb * 1.08] : [rb * 0.78, rb * 0.82, rb * 1.06], 0.06)
        .fit(prev, 0.018);
      if (k === 0) r.plate = V(a.x - dir.x * ra * 0.1, a.y - ra * 0.72, a.z);
      PHS.push(ph);
      prev = ph;
      nodes.push([a.x, a.y, a.z, ra + (j === 0 ? 0.085 : 0.075)]);
      c = e;
      cR = rb * 0.78;
      rbL = rb;
    });
    const tip = c.clone().addScaledVector(dir, rbL * 0.85);
    nodes.push([c.x, c.y - 0.012, c.z, rbL + 0.07]);
    nodes.push([tip.x, tip.y - 0.02, tip.z, rbL * 0.7 + 0.065]);
    TOE.push(nodes);
  });
  // Sesamoideos alojados bajo la cabeza del primer metatarsiano
  const ses = shape().ell([1.9, 0.2, 0.71], [0.085, 0.055, 0.065]).ell([1.9, 0.2, 0.89], [0.085, 0.055, 0.065], 0).fit(MTS[0], 0.012);

  // Oclusión ambiental horneada (entre todos los huesos) + leve enfriado de las piezas laterales (profundidad)
  const ALL = [talus, calc, tibia, fibula, nav, cuboid, cunM, cunI, cunL, ...MTS, ...PHS, ses];
  const world = (x, y, z) => {
    let d = 1e9;
    for (const S of ALL) {
      if (x < S.lo[0] - 0.2 || x > S.hi[0] + 0.2 || y < S.lo[1] - 0.2 || y > S.hi[1] + 0.2 || z < S.lo[2] - 0.2 || z > S.hi[2] + 0.2) continue;
      d = Math.min(d, S.sdf(x, y, z));
    }
    return d;
  };
  const aoAt = (x, y, z, nx, ny, nz) => {
    let occ = 0, sc = 1;
    for (let i = 1; i <= 4; i++) {
      const hr = 0.035 * i;
      occ += (hr - world(x + nx * hr, y + ny * hr, z + nz * hr)) * sc;
      sc *= 0.75;
    }
    return clamp(1 - 3.0 * occ, 0, 1);
  };
  const O = V(-2.04, 0.27, 0.19); // origen de la fascia: tuberosidad medial del calcáneo
  const BASE = new THREE.Color('#e9d8bc'), SHADE = new THREE.Color('#917b5b'), COOL = new THREE.Color('#bfc8d8'), WARMB = new THREE.Color('#ff8f5e');
  const paint = (geo, warm = 0) => {
    const p = geo.attributes.position, n = geo.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ao = aoAt(x, y, z, n.getX(i), n.getY(i), n.getZ(i));
      c.copy(BASE).lerp(COOL, 0.32 * sstep(0.15, -0.85, z)).lerp(SHADE, (1 - ao) * 0.85);
      if (warm) {
        const dd = Math.hypot(x - O.x, (y - O.y) * 1.25, (z - O.z) * 0.9);
        c.lerp(WARMB, warm * Math.exp(-Math.pow(dd / 0.6, 2)));
      }
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  };
  const bm = boneMat();
  for (const S of [talus, nav, cuboid, cunM, cunI, cunL, ...MTS, ...PHS, ses]) foot.add(new THREE.Mesh(paint(geoOf(S, S.hi[0] - S.lo[0] > 0.6 ? 0.026 : 0.018)), bm));
  foot.add(new THREE.Mesh(paint(geoOf(calc, 0.026), 1.0), bm));
  const legMat = fadeTop(boneMat(), 1.95, 2.62);
  legMat.clearcoat = 0.15;
  legMat.sheen = 0;
  for (const S of [tibia, fibula]) foot.add(new THREE.Mesh(paint(geoOf(S, 0.03)), legMat));

  // ------------------------------------------------------------ Fascia plantar: una lámina SDF que se divide en 5 lengüetas
  const xA = -2.36;
  const lesG = (x) => Math.exp(-Math.pow((x + 1.86) / 0.3, 2));
  const lineY = (x) => {
    const s = clamp((x - xA) / (1.9 - xA), 0, 1);
    return lerp(0.25, 0.205, s) - 0.018 * Math.sin(Math.PI * s);
  };
  const Ycom = (x) => lineY(x) + 0.15 * sstep(-1.95, -2.36, x) - 0.012 * lesG(x);
  const Tof = (x) => {
    const s = (x - xA) / (2.0 - xA);
    return 0.07 - 0.022 * sstep(0.05, 0.35, s) - 0.014 * sstep(0.45, 0.85, s) - 0.004 * sstep(0.85, 1.05, s) + 0.075 * lesG(x);
  };
  const SW = [0.1, 0.08, 0.077, 0.073, 0.068];
  const SL = RAYS.map((r, j) => ({
    H: V(r.h[0] - 0.02, r.h[1], r.h[2]),
    YH: (j === 0 ? 0.145 : r.h[1] - r.rh * 1.15) - 0.028,
    E: r.plate,
    zO: 0.1 + (2 - j) * 0.075,
    sw: SW[j],
  }));
  // [z del eje, pendiente dz/dx, semiancho, y del eje] de la lengüeta j en x
  const slip = (j, x) => {
    const S = SL[j];
    let zc, sl, w, Y;
    if (x <= S.H.x) {
      const s = (x - xA) / (S.H.x - xA);
      zc = S.zO + (S.H.z - S.zO) * s;
      sl = (S.H.z - S.zO) / (S.H.x - xA);
      const sp = lerp(0.075, 0.31, clamp(s, 0, 1));
      w = lerp(sp * 0.5 + 0.035, S.sw, sstep(0.52, 0.82, s));
      Y = Ycom(x) + (S.YH - Ycom(S.H.x)) * sstep(S.H.x - 1.3, S.H.x, x);
    } else {
      const u = (x - S.H.x) / (S.E.x - S.H.x);
      zc = S.H.z + (S.E.z - S.H.z) * u;
      sl = (S.E.z - S.H.z) / (S.E.x - S.H.x);
      w = S.sw * lerp(1, 0.72, clamp(u, 0, 1));
      Y = S.YH + (S.E.y + 0.01 - S.YH) * sstep(0, 1, u);
    }
    // El origen se angosta y se mete en la tuberosidad (sin asomar detrás del hueso)
    w *= lerp(1, 0.55, sstep(-2.02, -2.36, x));
    return [zc, sl, w + 0.03 * lesG(x), Y];
  };
  const dj = new Float64Array(5), yj = new Float64Array(5);
  const field = (x, z) => {
    let dmin = 1e9;
    for (let j = 0; j < 5; j++) {
      const [zc, sl, w, Y] = slip(j, x);
      const lat = (Math.abs(z - zc) - w) / Math.sqrt(1 + sl * sl);
      dj[j] = roundMax(lat, x - SL[j].E.x - 0.03, SL[j].sw * 0.6);
      yj[j] = Y;
      dmin = Math.min(dmin, dj[j]);
    }
    let D = dj[0];
    for (let j = 1; j < 5; j++) D = smin(D, dj[j], 0.07);
    D = Math.max(D, xA - x);
    let ws = 0, ys = 0;
    for (let j = 0; j < 5; j++) {
      const wt = Math.exp(-(dj[j] - dmin) / 0.03);
      ws += wt;
      ys += wt * yj[j];
    }
    return [D, ys / ws, Tof(x)];
  };
  const FB0 = [-2.42, 0.0, -1.1], FB1 = [Math.max(...SL.map((s) => s.E.x)) + 0.12, 0.52, 1.2], FH = 0.014;
  const gx = Math.ceil((FB1[0] - FB0[0]) / FH) + 2, gz = Math.ceil((FB1[2] - FB0[2]) / FH) + 2;
  const GD = new Float32Array(gx * gz), GY = new Float32Array(gx * gz), GT = new Float32Array(gx * gz);
  for (let k = 0; k < gz; k++)
    for (let i = 0; i < gx; i++) {
      const [d, y, t] = field(FB0[0] + i * FH, FB0[2] + k * FH);
      GD[i + gx * k] = d;
      GY[i + gx * k] = y;
      GT[i + gx * k] = t;
    }
  const samp = (A, x, z) => {
    const fx = clamp((x - FB0[0]) / FH, 0, gx - 1.001), fz = clamp((z - FB0[2]) / FH, 0, gz - 1.001);
    const i = fx | 0, k = fz | 0, tx = fx - i, tz = fz - k, o = i + gx * k;
    return lerp(lerp(A[o], A[o + 1], tx), lerp(A[o + gx], A[o + gx + 1], tx), tz);
  };
  // Placas plantares bajo cada articulación metatarsofalángica: la lengüeta termina en un cojinete redondeado
  const PLATES = SL.map((S, j) => {
    const cx = (S.H.x + S.E.x) / 2 + 0.02;
    return [cx, (S.YH + S.E.y) / 2 + 0.012, (S.H.z + S.E.z) / 2, Math.max(0.12, (S.E.x - S.H.x) * 0.62), j === 0 ? 0.06 : 0.048, S.sw * 1.05];
  });
  const fasciaSDF = (x, y, z) => {
    let dp = 1e9;
    if (x > 1.3) for (const P of PLATES) dp = Math.min(dp, ell(x, y, z, P[0], P[1], P[2], P[3], P[4], P[5]));
    const d2 = samp(GD, x, z);
    if (d2 > 0.1) return Math.min(d2, dp);
    const T = samp(GT, x, z);
    return smin(roundMax(d2, Math.abs(y - samp(GY, x, z)) - T / 2, T * 0.45), dp, 0.05);
  };
  const fGeo = polygonize(fasciaSDF, [FB0[0], 0.06, FB0[2]], [FB1[0], 0.47, FB1[2]], [FH, 0.006, FH], 1.6);
  {
    const p = fGeo.attributes.position;
    const fu = new Float32Array(p.count), wa = new Float32Array(p.count), col = new Float32Array(p.count * 3);
    const zc = [0, 0, 0, 0, 0];
    const cool = new THREE.Color('#d3e1f6'), hot = new THREE.Color('#ff7c48'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      for (let j = 0; j < 5; j++) zc[j] = slip(j, x)[0];
      let u;
      if (z >= zc[0]) u = -(z - zc[0]) / Math.max(zc[0] - zc[1], 0.02);
      else if (z <= zc[4]) u = 4 + (zc[4] - z) / Math.max(zc[3] - zc[4], 0.02);
      else {
        let j = 0;
        while (j < 3 && z < zc[j + 1]) j++;
        u = j + (zc[j] - z) / Math.max(zc[j] - zc[j + 1], 1e-4);
      }
      fu[i] = u;
      const w = 1 - sstep(-2.0, -1.3, x);
      wa[i] = w;
      c.copy(cool).lerp(hot, Math.pow(w, 0.85));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    fGeo.setAttribute('fu', new THREE.BufferAttribute(fu, 1));
    fGeo.setAttribute('warm', new THREE.BufferAttribute(wa, 1));
    fGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  // Material: blanco frío con brillo azulado, estriado fino por relieve (normal) y emisión cálida en la lesión
  const fMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 1, sheenColor: new THREE.Color('#b4cdff'), sheenRoughness: 0.4 });
  fMat.onBeforeCompile = (sh) => {
    sh.uniforms.uFreq = { value: 9.0 };
    sh.uniforms.uBump = { value: 0.35 };
    sh.uniforms.uWarmE = { value: new THREE.Color('#ff6a3d').multiplyScalar(0.6) };
    sh.vertexShader =
      'attribute float fu;\nattribute float warm;\nvarying float vFu;\nvarying float vWarm;\nvarying float vNy;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFu = fu; vWarm = warm; vNy = normal.y;');
    sh.fragmentShader =
      'uniform float uFreq; uniform float uBump; uniform vec3 uWarmE; varying float vFu; varying float vWarm; varying float vNy;\n' +
      sh.fragmentShader
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          diffuseColor.rgb *= mix(0.74, 1.0, smoothstep(0.0, 0.5, abs(dot(normal, normalize(vViewPosition)))));
          {
            float ph = vFu * uFreq;
            float fw = fwidth(ph);
            float H = 0.5 + 0.5 * sin(ph * 6.2831853);
            float amp = uBump * (1.0 - smoothstep(0.25, 0.6, fw)) * (1.0 - 0.7 * vWarm) * smoothstep(0.55, 0.9, abs(vNy));
            vec2 dH = vec2(dFdx(H), dFdy(H)) * amp;
            vec3 sx = normalize(dFdx(-vViewPosition));
            vec3 sy = normalize(dFdy(-vViewPosition));
            vec3 R1 = cross(sy, normal);
            vec3 R2 = cross(normal, sx);
            float det = dot(sx, R1) * faceDirection;
            normal = normalize(abs(det) * normal - sign(det) * (dH.x * R1 + dH.y * R2));
          }`
        )
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWarmE * vWarm;');
  };
  foot.add(new THREE.Mesh(fGeo, fMat));

  // ------------------------------------------------------------ Lesión: fibras abiertas en el origen engrosado
  const band = (x) => {
    const m = slip(0, x), l = slip(4, x);
    return { Y: Ycom(x), T: Tof(x), zMed: m[0] + m[2], zLat: l[0] - l[2] };
  };
  const taperTube = (pts, r0, seg = 40, rad = 8) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const fr = curve.computeFrenetFrames(seg, false);
    const pos = [], nor = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const P = curve.getPointAt(t);
      const r = r0 * (0.12 + 0.88 * Math.pow(Math.sin(Math.PI * t), 0.6));
      for (let k = 0; k <= rad; k++) {
        const a = (k / rad) * Math.PI * 2;
        const cs = -Math.cos(a), sn = Math.sin(a);
        const nx = fr.normals[i].x * cs + fr.binormals[i].x * sn;
        const ny = fr.normals[i].y * cs + fr.binormals[i].y * sn;
        const nz = fr.normals[i].z * cs + fr.binormals[i].z * sn;
        pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r);
        nor.push(nx, ny, nz);
      }
    }
    for (let i = 0; i < seg; i++)
      for (let k = 0; k < rad; k++) {
        const a = i * (rad + 1) + k, b = a + rad + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  };
  // [x0, x1, desplazamiento z desde el borde medial, lado (-1 abajo, 0 borde, 1 arriba), separación, radio, fase]
  const LOOSE = [
    [-2.06, -1.52, -0.04, -1, 0.022, 0.014, 0.3],
    [-2.0, -1.6, 0.0, 0, 0.026, 0.013, 1.7],
    [-2.1, -1.64, -0.13, -1, 0.017, 0.012, 2.9],
    [-1.98, -1.48, -0.07, 1, 0.02, 0.012, 4.1],
    [-2.04, -1.72, -0.22, -1, 0.014, 0.011, 5.3],
  ];
  const looseGeos = LOOSE.map(([x0, x1, zo, side, lift, r, ph]) => {
    const pts = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const x = lerp(x0, x1, t);
      const B = band(x);
      const bump = Math.pow(Math.sin(Math.PI * t), 1.4);
      let y, z;
      if (side === 0) {
        z = B.zMed + zo + lift * bump - 0.012;
        y = B.Y + 0.01 * Math.sin(ph + t * 7);
      } else {
        z = B.zMed + zo + 0.02 * Math.sin(ph + t * 6) * bump;
        y = B.Y + side * (B.T / 2 - 0.012 + (lift + 0.012) * bump) + 0.01 * Math.sin(ph * 1.3 + t * 8) * bump;
      }
      pts.push(V(x, y, z));
    }
    return taperTube(pts, r);
  });
  const lesMat = M.lesion();
  lesMat.color.set('#ff9a6a');
  foot.add(new THREE.Mesh(mergeGeometries(looseGeos), lesMat));

  // Envoltura tenue (fresnel) del engrosamiento fusiforme, sin borde duro
  const spindle = [];
  for (let k = 0; k <= 10; k++) {
    const x = lerp(-2.14, -1.45, k / 10);
    spindle.push([x, band(x).Y, 0, 0.045 + 0.1 * lesG(x)]);
  }
  const zMid = (x) => {
    const B = band(x);
    return (B.zMed + B.zLat) / 2;
  };
  const env = new THREE.Mesh(
    polygonize((x, y, z) => chain(x, y, (z - zMid(x)) * 0.48, spindle), [-2.35, -0.1, -0.6], [-1.2, 0.6, 0.9], 0.03),
    ghost('#ff8a55', { rim: 0.35, power: 3.2, base: 0.0, f0: 50, f1: 60 })
  );
  env.renderOrder = 3;
  foot.add(env);

  // Resplandor cálido: delante del origen y un aura saturada detrás del talón (se ve sobre fondo claro)
  const h1 = halo('#ff9a6b', 1.3, 0.75);
  h1.position.set(-1.8, 0.32, 0.7);
  const h2 = halo('#ffc2a0', 0.7, 0.5);
  h2.position.set(-1.86, 0.27, 0.62);
  const h3 = halo('#ff7a45', 1.2, 0.6);
  h3.position.set(-1.95, 0.32, -0.4);
  foot.add(h1, h2, h3);

  // ------------------------------------------------------------ Contorno del pie (vidrio tenue) con dedos
  // Perfil a lo largo del pie [x, y inferior, y superior, semiancho, centro z, inclinación medial]
  const KS = [
    [-2.92, 0.34, 1.12, 0.4, -0.03, 0],
    [-2.62, -0.03, 1.3, 0.52, -0.03, 0],
    [-2.1, -0.07, 1.62, 0.6, -0.02, 0.04],
    [-1.4, 0.02, 2.15, 0.68, 0, 0.1],
    [-0.6, 0.06, 2.02, 0.82, -0.04, 0.18],
    [-0.1, 0.05, 1.92, 0.94, -0.07, 0.19],
    [0.3, 0.04, 1.8, 0.96, -0.02, 0.2],
    [1.1, 0.03, 1.32, 1.02, 0.02, 0.12],
    [1.9, -0.01, 0.86, 1.1, 0.03, 0.04],
    [2.5, 0.04, 0.76, 1.06, 0.06, 0],
  ];
  const X0 = -2.92, X1 = 2.62, CAPB = 0.42, CAPF = 0.42;
  const prof = (x) => {
    let i = 0;
    while (i < KS.length - 2 && x > KS[i + 1][0]) i++;
    const A = KS[i], B = KS[i + 1];
    let t = clamp((x - A[0]) / (B[0] - A[0]), 0, 1);
    t = t * t * (3 - 2 * t);
    return [1, 2, 3, 4, 5].map((q) => A[q] + (B[q] - A[q]) * t);
  };
  const footSDF = (x, y, z) => {
    // Fuera de los extremos: distancia que crece con x (sin paredes falsas al fundir con los dedos)
    const xc = clamp(x, X0, X1);
    const dx = Math.max(X0 - x, x - X1, 0);
    let cap = 1;
    if (xc < X0 + CAPB) cap = Math.sqrt(Math.max(0, 1 - Math.pow((X0 + CAPB - xc) / CAPB, 2)));
    if (xc > X1 - CAPF) cap = Math.sqrt(Math.max(0, 1 - Math.pow((xc - (X1 - CAPF)) / CAPF, 2)));
    cap = Math.max(cap, 0.06);
    const [yb, yt, hw, zc, tl] = prof(xc);
    // El dorso sube del lado medial (arco); la planta queda casi plana (sección más cuadrada abajo)
    const ytz = yt + tl * (z - zc);
    const ry = ((ytz - yb) / 2) * cap, rz = hw * cap;
    const yc = (yb + ytz) / 2;
    const pw = y < yc ? 4 : 3;
    const ny = Math.abs((y - yc) / ry), nz = Math.abs((z - zc) / rz);
    const ds = (Math.pow(Math.pow(ny, pw) + Math.pow(nz, pw), 1 / pw) - 1) * Math.min(ry, rz);
    return dx > 0 ? Math.hypot(dx, Math.max(ds, 0)) : ds;
  };
  const toeSDF = (x, y, z) => {
    if (x < 1.0) return 1.0;
    let d = 1e9;
    for (const t of TOE) d = smin(d, chain(x, y, z, t), 0.1);
    return d;
  };
  const legSDF = (x, y, z) => chain(x, y, z, [[-1.32, 1.7, -0.04, 0.76], [-1.27, 2.6, -0.05, 0.68], [-1.18, 3.7, -0.05, 0.62]]);
  const skinSDF = (x, y, z) => smax(smin(smin(footSDF(x, y, z), toeSDF(x, y, z), 0.3), legSDF(x, y, z), 0.5), -y - 0.12, 0.1);
  const skin = new THREE.Mesh(polygonize(skinSDF, [-3.1, -0.2, -1.4], [3.7, 3.6, 1.5], 0.058), ghost('#86aaf0', { rim: 0.65, power: 2.6, base: 0.016, f0: 2.6, f1: 3.5 }));
  skin.renderOrder = 2;
  foot.add(skin);

  // Luz de relleno desde abajo para que la planta y la fascia no queden en sombra
  const under = new THREE.DirectionalLight('#e6eeff', 1.1);
  under.position.set(1.5, -4, 4);
  root.add(under);

  // Sombra de contacto
  const sh = halo('#0a1530', 1, 0.22);
  sh.scale.set(6.0, 0.48, 1);
  sh.position.set(0.3, -0.22, -0.3);
  root.add(sh);

  root.userData.debug = { skinSDF, fasciaSDF, ALL, world };
  const look = [0.45, 1.15, 0];
  return { root, cam: [look[0] + 4.4, look[1] - 2.35, 9.3], look, zoom: 1.0, shadow: false };
}
