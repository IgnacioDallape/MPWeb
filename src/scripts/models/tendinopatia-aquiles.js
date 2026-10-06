// Tendinopatía de Aquiles — pierna baja y talón derechos en vista lateral, levemente desde atrás (cara externa hacia la cámara).
// Gemelo (cabezas lateral y medial) y sóleo en rosado, que se afinan en una transición aponeurótica y continúan
// en el tendón de Aquiles: cordón blanco de fibras, largo y levemente torsionado, que se inserta en abanico corto
// sobre la cara posterior de la tuberosidad del calcáneo. A media porción (≈4 cm sobre la inserción), engrosamiento
// fusiforme con fibras desorganizadas, tinte cálido y halo. Calcáneo macizo; astrágalo, maléolo, tibia y pie
// atenuados; contorno de pierna y pie en vidrio tenue. Músculos, piel y huesos largos se desvanecen hacia la rodilla.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const f3 = (v) => v.toFixed(3);

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

  // Surface nets (con proyección de Newton sobre la superficie) → malla suave
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
    const e = h * 0.5;
    const grad = (x, y, z) => [sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)];
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
          let x = bmin[0] + (i + sx / n) * h, y = bmin[1] + (j + sy / n) * h, z = bmin[2] + (k + sz / n) * h;
          for (let it = 0; it < 2; it++) {
            const d = sdf(x, y, z);
            const g = grad(x, y, z);
            const g2 = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / (4 * e * e);
            if (g2 < 1e-8) break;
            const s = d / g2 / (2 * e);
            const nxp = x - g[0] * s, nyp = y - g[1] * s, nzp = z - g[2] * s;
            if (Math.abs(nxp - x) > h || Math.abs(nyp - y) > h || Math.abs(nzp - z) > h) break;
            x = nxp;
            y = nyp;
            z = nzp;
          }
          vid[C(i, j, k)] = pos.length / 3;
          pos.push(x, y, z);
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
    for (let p = 0; p < pos.length; p += 3) {
      const g = grad(pos[p], pos[p + 1], pos[p + 2]);
      const l = Math.hypot(g[0], g[1], g[2]) || 1;
      nrm[p] = g[0] / l;
      nrm[p + 1] = g[1] / l;
      nrm[p + 2] = g[2] / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setIndex(idx);
    return g;
  }

  // Constructor de huesos: suma suave de primitivas, caja envolvente automática y cortes articulares
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

  // ------------------------------------------------------------ Desvanecido hacia la rodilla (eje de la pierna = y del cuerpo)
  const FA = 5.4, FB = 7.0;
  const SF0 = 4.9, SF1 = 6.0;
  const fadeY = (y) => 1 - sstep(FA, FB, y);

  // ------------------------------------------------------------ Materiales
  const NOISE = `
    float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
  `;
  // Contorno "vidrio" (fresnel) que se desvanece hacia arriba
  const ghost = (color, { rim = 0.6, power = 2.4, base = 0.03, f0 = 50, f1 = 60 } = {}) =>
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
  // Microdetalle de hueso: relieve suave por ruido y rugosidad variable (el barniz queda liso)
  const boneDetail = (mat, amp = 0.09, freq = 13) => {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
      sh.fragmentShader =
        'varying vec3 vOP;\n' +
        NOISE +
        sh.fragmentShader
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * (0.7 + 0.6 * vn(vOP * ${f3(freq * 0.4)})), 0.05, 1.0);`)
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>
            { vec3 q = vOP * ${f3(freq)}; vec3 q2 = vOP * ${f3(freq * 2.7)};
              vec3 nn = vec3(vn(q), vn(q + 17.3), vn(q + 41.9)) - 0.5 + 0.45 * (vec3(vn(q2), vn(q2 + 7.1), vn(q2 + 23.7)) - 0.5);
              normal = normalize(normal + ${f3(amp)} * 2.0 * nn); }`
          )
          .replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
            { float ed = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
              gl_FragColor.rgb *= mix(1.0, 0.8, ed); }`
          );
    };
    return mat;
  };
  // Huesos atenuados: cuerpo azul grisáceo semitransparente con borde fresnel azul medio (se lee sobre fondo claro y oscuro)
  const ghostBone = (f0, f1, opacity = 0.6) => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#c3d0e9', roughness: 0.36, clearcoat: 0.8, clearcoatRoughness: 0.18, transparent: true, opacity, depthWrite: false });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uGF0 = { value: f0 };
      sh.uniforms.uGF1 = { value: f1 };
      sh.vertexShader = 'varying float vOY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOY = position.y;');
      sh.fragmentShader =
        'uniform float uGF0; uniform float uGF1; varying float vOY;\n' +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          float frz = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.40, 0.53, 0.82), frz * 0.62);
          gl_FragColor.a = mix(gl_FragColor.a, 0.95, frz * 0.85);
          gl_FragColor.a *= 1.0 - smoothstep(uGF0, uGF1, vOY);`
        );
    };
    return m;
  };
  // Pre-pasada de profundidad: con transparencia se ve solo la capa más cercana
  const depthOnly = (cut) =>
    new THREE.ShaderMaterial({
      uniforms: { uCut: { value: cut } },
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uCut; varying float vY; void main(){ if (vY > uCut) discard; gl_FragColor = vec4(0.0); }',
      colorWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });

  const ROT = 0.33; // pierna casi vertical, punta del pie apenas elevada
  const VIEW = V(-0.4, 0.14, 1).normalize(); // vista lateral, levemente desde atrás (posterolateral)
  const VIEWB = VIEW.clone().applyAxisAngle(V(0, 0, 1), -ROT);

  // ------------------------------------------------------------ Escena (x+ = dedos, y+ = arriba, z+ = lateral, hacia la cámara)
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const GAP = 0.035;

  // Astrágalo
  const talus = shape()
    .ell([-0.08, 1.5, -0.04], [0.5, 0.32, 0.4])
    .ell([-0.04, 1.62, -0.04], [0.44, 0.24, 0.36], 0.15)
    .cone([0.29, 1.48, -0.12], [0.62, 1.43, -0.26], 0.27, 0.25, 0.15)
    .ell([0.72, 1.4, -0.28], [0.2, 0.26, 0.3], 0.12)
    .ell([-0.56, 1.3, 0.04], [0.16, 0.13, 0.15], 0.1)
    .ell([-0.08, 1.3, 0.34], [0.2, 0.16, 0.08], 0.1)
    .groove((x, y, z) => ell(x, y, z, -0.04, 1.98, -0.05, 0.6, 0.14, 0.07), 0.08);

  // Calcáneo: tuberosidad posterior alta y cuadrada con prominencia posterosuperior, cintura, carilla talar posterior,
  // sustentáculo (medial), seno del tarso, apófisis anterior con carilla plana hacia el cuboides y tróclea peronea.
  const calc = shape()
    .ell([-1.08, 0.72, 0.0], [0.44, 0.5, 0.36])
    .box([-1.02, 0.7, 0.0], [0.36, 0.42, 0.33], 0.2, 0, 0, 0.12)
    .ell([-1.2, 1.03, 0.0], [0.28, 0.21, 0.3], 0.16)
    .ell([-1.0, 0.34, -0.1], [0.42, 0.16, 0.28], 0.16)
    .ell([-1.08, 0.33, 0.16], [0.3, 0.14, 0.18], 0.14)
    .cone([-0.8, 0.7, 0.0], [-0.1, 0.78, 0.02], 0.34, 0.3, 0.22)
    .ell([-0.12, 0.98, 0.0], [0.34, 0.15, 0.27], 0.14)
    .ell([0.1, 0.94, -0.36], [0.28, 0.09, 0.18], 0.1)
    .cone([0.0, 0.76, 0.06], [0.5, 0.8, 0.1], 0.29, 0.22, 0.16)
    .groove((x, y, z) => ell(x, y, z, -0.66, 1.27, 0.0, 0.26, 0.24, 0.7), 0.16)
    .groove((x, y, z) => ell(x, y, z, 0.26, 1.1, 0.15, 0.15, 0.14, 0.5), 0.07)
    .groove((x, y, z) => ell(x, y, z, -0.35, 0.16, 0.0, 0.42, 0.16, 0.6), 0.14)
    .groove((x) => 0.6 - x, 0.05)
    .fit(talus, GAP);

  const tibia = shape()
    .ell([-0.04, 2.1, -0.06], [0.52, 0.28, 0.5])
    .cone([-0.02, 2.2, -0.06], [0.04, 4.6, -0.05], 0.46, 0.38, 0.3)
    .cone([0.0, 2.05, -0.5], [0.02, 1.5, -0.52], 0.17, 0.1, 0.2)
    .groove((x, y) => 4.2 - y, 0.05)
    .fit(talus, GAP);
  // Peroné: diáfisis fina que termina en el bulbo del maléolo lateral, junto al astrágalo
  const fibula = shape()
    .ell([-0.3, 1.38, 0.5], [0.2, 0.3, 0.17])
    .cone([-0.3, 1.56, 0.5], [-0.33, 2.4, 0.47], 0.17, 0.12, 0.16)
    .cone([-0.33, 2.4, 0.47], [-0.4, 4.6, 0.45], 0.12, 0.12, 0.1)
    .groove((x, y) => 4.2 - y, 0.05)
    .fit(talus, GAP)
    .fit(tibia, GAP)
    .fit(calc, GAP);

  const nav = shape().ell([1.02, 1.32, -0.3], [0.16, 0.27, 0.42]).ell([1.04, 1.02, -0.66], [0.15, 0.14, 0.13], 0.12).fit(talus, GAP);
  const cuboid = shape().box([0.92, 0.84, 0.46], [0.31, 0.24, 0.27], 0.12, -0.12).fit(calc, GAP).fit(nav, GAP);
  const cunM = shape().box([1.46, 1.12, -0.58], [0.22, 0.32, 0.14], 0.11, -0.08).fit(nav, GAP);
  const cunI = shape().box([1.4, 1.36, -0.28], [0.15, 0.17, 0.12], 0.1, -0.05).fit(nav, GAP).fit(cunM, GAP);
  const cunL = shape().box([1.42, 1.24, 0.02], [0.2, 0.2, 0.14], 0.1, -0.08).fit(nav, GAP).fit(cunI, GAP).fit(cuboid, GAP);

  const RAYS = [
    { b: [1.84, 1.02, -0.62], h: [3.22, 0.42, -0.8], rb: 0.2, rs: 0.12, rh: 0.19, ph: [[0.66, 0.15, 0.125], [0.5, 0.125, 0.085]], prox: cunM },
    { b: [1.72, 1.26, -0.3], h: [3.38, 0.4, -0.4], rb: 0.14, rs: 0.085, rh: 0.135, ph: [[0.5, 0.09, 0.075], [0.27, 0.075, 0.065], [0.2, 0.065, 0.05]], prox: cunI },
    { b: [1.76, 1.14, 0.0], h: [3.3, 0.38, 0.0], rb: 0.13, rs: 0.082, rh: 0.13, ph: [[0.45, 0.087, 0.072], [0.24, 0.072, 0.062], [0.18, 0.062, 0.048]], prox: cunL },
    { b: [1.36, 0.98, 0.32], h: [3.1, 0.36, 0.42], rb: 0.13, rs: 0.08, rh: 0.125, ph: [[0.4, 0.083, 0.07], [0.21, 0.07, 0.06], [0.17, 0.06, 0.046]], prox: cuboid },
    { b: [1.28, 0.8, 0.6], h: [2.86, 0.33, 0.8], rb: 0.13, rs: 0.08, rh: 0.125, ph: [[0.34, 0.08, 0.066], [0.17, 0.066, 0.056], [0.14, 0.056, 0.044]], prox: cuboid },
  ];
  const footBones = [talus, nav, cuboid, cunM, cunI, cunL];
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
    if (j === 4) mt.ell([1.16, 0.72, 0.8], [0.16, 0.12, 0.12], 0.12);
    if (prevMT) mt.fit(prevMT, 0.02);
    footBones.push(mt);
    prevMT = mt;
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
      footBones.push(ph);
      prev = ph;
      p = e.clone().addScaledVector(d, rb2 * 0.5);
    });
  });

  // Calcáneo macizo, con oclusión ambiental horneada en colores de vértice
  const calcGeo = geoOf(calc, 0.022);
  {
    const occSDF = (x, y, z) => Math.min(calc.sdf(x, y, z), talus.raw(x, y, z), cuboid.raw(x, y, z), fibula.raw(x, y, z));
    const p = calcGeo.attributes.position, n = calcGeo.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const base = new THREE.Color('#e2cdad'), deep = new THREE.Color('#957657'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
      let occ = 0, sca = 1;
      for (let k = 1; k <= 5; k++) {
        const hh = 0.015 + 0.06 * k;
        occ += (hh - occSDF(x + nx * hh, y + ny * hh, z + nz * hh)) * sca;
        sca *= 0.7;
      }
      const ao = clamp(1 - 1.6 * occ, 0, 1);
      c.copy(deep).lerp(base, 0.35 + 0.65 * ao);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    calcGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const calcMat = boneDetail(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.28, sheen: 0.2, sheenColor: new THREE.Color('#fff4e2'), envMapIntensity: 0.7 }), 0.14, 12);
  const calcMesh = new THREE.Mesh(calcGeo, calcMat);
  body.add(calcMesh);

  // Huesos atenuados (astrágalo, pie, tibia y peroné) con pre-pasada de profundidad
  const faintGeos = footBones.map((s) => geoOf(s, s.hi[0] - s.lo[0] > 0.9 ? 0.036 : 0.027));
  const footGeo = mergeGeometries(faintGeos);
  const legGeo = mergeGeometries([geoOf(tibia, 0.035), geoOf(fibula, 0.03)]);
  const LB0 = 2.4, LB1 = 3.9;
  const footPre = new THREE.Mesh(footGeo, depthOnly(99));
  const legPre = new THREE.Mesh(legGeo, depthOnly(LB1));
  const footMesh = new THREE.Mesh(footGeo, ghostBone(50, 60, 0.62));
  const legMesh = new THREE.Mesh(legGeo, ghostBone(LB0, LB1, 0.3));
  footMesh.renderOrder = legMesh.renderOrder = 1;
  body.add(footPre, legPre, footMesh, legMesh);

  // ------------------------------------------------------------ Tubos de sección elíptica (vientres musculares, núcleo del tendón)
  class Tubes {
    constructor() {
      this.p = [];
      this.n = [];
      this.c = [];
      this.uv = [];
      this.i = [];
    }
    // P: Vector3[], R: [semieje sobre B, semieje sobre N][], up: dirección de N, C: [r, g, b, a][] por anillo
    add(P, R, up, radial, C) {
      const base = this.p.length / 3, m = P.length;
      const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
      for (let a = 0; a < m; a++) {
        T.subVectors(P[Math.min(a + 1, m - 1)], P[Math.max(a - 1, 0)]).normalize();
        Nn.copy(up).addScaledVector(T, -up.dot(T)).normalize();
        B.crossVectors(T, Nn);
        const [rx, ry] = R[a];
        for (let r = 0; r <= radial; r++) {
          const an = (r / radial) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
          this.uv.push(r / radial, a / (m - 1));
          this.p.push(P[a].x + B.x * c * rx + Nn.x * s * ry, P[a].y + B.y * c * rx + Nn.y * s * ry, P[a].z + B.z * c * rx + Nn.z * s * ry);
          const ex = c / Math.max(rx, 1e-4), ey = s / Math.max(ry, 1e-4);
          const nx = B.x * ex + Nn.x * ey, ny = B.y * ex + Nn.y * ey, nz = B.z * ex + Nn.z * ey;
          const l = Math.hypot(nx, ny, nz) || 1;
          this.n.push(nx / l, ny / l, nz / l);
          this.c.push(...C[a]);
        }
      }
      const rr = radial + 1;
      for (let a = 0; a < m - 1; a++)
        for (let r = 0; r < radial; r++) {
          const i0 = base + a * rr + r, i1 = base + (a + 1) * rr + r, i2 = base + (a + 1) * rr + r + 1, i3 = base + a * rr + r + 1;
          this.i.push(i0, i1, i2, i0, i2, i3);
        }
    }
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 4));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.setIndex(this.i);
      return g;
    }
  }

  // ------------------------------------------------------------ Músculos: vientre macizo + estrías superficiales
  const bellyT = new Tubes(), striaT = new Tubes();
  const cPink = new THREE.Color('#cf6a72'), cApo = new THREE.Color('#f1e3e6'), cTmp = new THREE.Color();
  const AX = V(1, 0, 0);
  // pts: de arriba (rodilla) a la punta inferior. ap/ml: semiespesor antero-posterior y semiancho medio-lateral máximos.
  function belly({ pts, ap, ml, plateau = 0.45, tipExp = 0.85, nStri = 34, seed, apo = 0.2, phiSpan = 0.62 }) {
    reseed(seed);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const prof = (s) => (s <= plateau ? 1 : Math.pow(Math.sin((Math.PI / 2) * clamp((1 - s) / (1 - plateau), 0, 1)), tipExp));
    const fr = (s) => {
      const p = curve.getPointAt(s), T = curve.getTangentAt(s);
      const N = AX.clone().addScaledVector(T, -AX.dot(T)).normalize();
      return { p, N, B: new THREE.Vector3().crossVectors(T, N) };
    };
    const colAt = (y, s, k = 1) => {
      cTmp.copy(cPink).lerp(cApo, k * sstep(1 - apo, 1.0, s));
      return [cTmp.r, cTmp.g, cTmp.b, fadeY(y)];
    };
    {
      const P = [], R = [], C = [], n = 80;
      for (let a = 0; a <= n; a++) {
        const s = a / n, f = fr(s);
        P.push(f.p);
        R.push([Math.max(ml * prof(s), 0.004), Math.max(ap * prof(s), 0.004)]);
        C.push(colAt(f.p.y, s, 0.85));
      }
      bellyT.add(P, R, AX, 30, C);
    }
    // Las estrías solo existen donde se ven (por encima de SF1 ya se hundieron en el vientre)
    let sTop = 0;
    while (sTop < 0.9 && fr(sTop).p.y > SF1 + 0.05) sTop += 0.01;
    for (let j = 0; j < nStri; j++) {
      const phi = -phiSpan * Math.PI + (2 * phiSpan * Math.PI * (j + 0.2 + rnd() * 0.6)) / nStri;
      const sb = 1 - (0.015 + rnd() * 0.12);
      const P = [], R = [], C = [], n = 30, wob = rnd() * 6, rr = 0.022 + rnd() * 0.008;
      for (let a = 0; a <= n; a++) {
        const s = sTop + ((sb - sTop) * a) / n, f = fr(s), ph = phi + 0.05 * Math.sin(s * 9 + wob);
        const k = prof(s) * 0.995;
        P.push(f.p.clone().addScaledVector(f.B, Math.cos(ph) * ml * k).addScaledVector(f.N, Math.sin(ph) * ap * k));
        const r = rr * Math.min(1, 0.2 + (n - a) / 8) * Math.min(1, 0.35 + prof(s)) * (1 - sstep(SF0, SF1, f.p.y)) + 1e-4;
        R.push([r, r]);
        C.push(colAt(f.p.y, s, 1));
      }
      striaT.add(P, R, AX, 5, C);
    }
  }
  // Sóleo (profundo, ancho; llega más abajo, sobre la cara anterior del tendón)
  belly({ pts: [V(-1.0, 8.0, 0.02), V(-1.02, 6.6, 0.04), V(-1.12, 5.5, 0.04), V(-1.33, 4.55, 0.02), V(-1.56, 3.7, 0.0)], ap: 0.42, ml: 0.84, plateau: 0.55, tipExp: 0.8, nStri: 44, seed: 401, apo: 0.22, phiSpan: 0.7 });
  // Gemelo, cabeza medial (detrás, más voluminosa y más baja)
  belly({ pts: [V(-1.75, 8.0, -0.42), V(-1.9, 6.8, -0.45), V(-1.95, 5.8, -0.38), V(-1.9, 5.0, -0.25), V(-1.82, 4.4, -0.1)], ap: 0.6, ml: 0.52, plateau: 0.6, nStri: 30, seed: 402 });
  // Gemelo, cabeza lateral (hacia la cámara)
  belly({ pts: [V(-1.62, 8.0, 0.45), V(-1.76, 6.8, 0.48), V(-1.82, 5.9, 0.42), V(-1.8, 5.2, 0.3), V(-1.76, 4.65, 0.14)], ap: 0.52, ml: 0.46, plateau: 0.6, nStri: 36, seed: 403 });

  // Textura procedural de fibras (relieve) para el vientre: estrías finas que siguen al músculo y se desvanecen con él
  const fiberTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#7a7a7a';
    g.fillRect(0, 0, 1024, 64);
    reseed(77);
    const N = 150;
    for (let i = 0; i < N; i++) {
      const x0 = (i / N) * 1024 + rnd() * 1.5, w = (1024 / N) * (0.75 + rnd() * 0.5);
      const l = 0.75 + rnd() * 0.25;
      const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
      gr.addColorStop(0, 'rgba(40,40,40,1)');
      gr.addColorStop(0.5, 'rgba(' + Math.round(255 * l) + ',' + Math.round(255 * l) + ',' + Math.round(255 * l) + ',1)');
      gr.addColorStop(1, 'rgba(40,40,40,1)');
      g.fillStyle = gr;
      g.fillRect(x0, 0, w, 64);
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    t.anisotropy = 8;
    return t;
  })();
  const muscleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.35, sheenColor: new THREE.Color('#ffc0c0'), vertexColors: true, transparent: true });
  const bellyMat = muscleMat.clone();
  bellyMat.bumpMap = fiberTex;
  bellyMat.bumpScale = 1.6;
  const bellyGeo = bellyT.geo(), striaGeo = striaT.geo();
  // Las estrías se desvanecen antes que el vientre: arriba queda un degradé liso, sin estrías ni barrido
  const mMeshes = [new THREE.Mesh(bellyGeo, depthOnly(FB)), new THREE.Mesh(striaGeo, depthOnly(SF1)), new THREE.Mesh(bellyGeo, bellyMat), new THREE.Mesh(striaGeo, muscleMat)];
  body.add(...mMeshes);

  // ------------------------------------------------------------ Tendón de Aquiles
  // Eje casi vertical por detrás del tobillo; abajo las fibras se curvan hacia delante y terminan dentro del calcáneo
  // a distinta altura (abanico corto sobre la cara posterior de la tuberosidad, tercio medio).
  const TP = [V(-1.2, 0.3), V(-1.44, 0.72), V(-1.62, 1.2), V(-1.72, 1.7), V(-1.74, 2.2), V(-1.74, 2.7), V(-1.77, 3.35), V(-1.84, 4.1), V(-1.93, 4.75), V(-2.0, 5.15)];
  const tc = new THREE.CatmullRomCurve3(TP, false, 'centripetal');
  const SAMP = 150;
  const FP = [], FN = [];
  for (let k = 0; k <= SAMP; k++) {
    const s = k / SAMP;
    FP.push(tc.getPointAt(s));
    const t = tc.getTangentAt(s);
    FN.push(V(-t.y, t.x, 0).normalize());
  }
  // Centro de la lesión ≈ 4-5 cm (≈1.1 unidades) sobre la inserción
  let S0 = 0;
  for (let k = 0; k <= SAMP; k++) if (FP[k].y < 2.38) S0 = k / SAMP;
  const gl = (s) => Math.exp(-Math.pow((s - S0) / 0.056, 2));
  const yAt = (s) => FP[Math.round(clamp(s, 0, 1) * SAMP)].y;
  const aR = (s) => {
    const top = sstep(0.74, 1, s);
    const low = sstep(1.35, 0.8, yAt(s));
    return (0.23 - 0.075 * top - 0.05 * low) * (1 + 0.42 * gl(s));
  };
  const bR = (s) => {
    const top = sstep(0.74, 1, s);
    const low = sstep(1.5, 0.85, yAt(s));
    return (0.35 + 0.2 * top - 0.12 * low) * (1 + 0.3 * gl(s));
  };
  // Curva de aterrizaje: empuja la fibra hacia delante (hacia el hueso) cerca de la inserción
  const land = (y) => 0.8 * Math.pow(Math.max(0, 1.0 - y), 2);
  const Z = V(0, 0, 1);
  const inBone = (p) => calc.sdf(p.x, p.y, p.z) < -0.02;

  const white = new THREE.Color('#ffffff'), coral = new THREE.Color('#ff5a1f'), blush = new THREE.Color('#f6dfe2'), col = new THREE.Color();
  reseed(311);
  const fibGeos = [];
  const NF = 104;
  for (let i = 0; i < NF; i++) {
    const r = Math.pow(rnd(), 0.45);
    const th0 = rnd() * Math.PI * 2;
    const jit = rnd(), ph = rnd() * 10, warmK = 0.8 + 0.2 * rnd();
    const kEnd = Math.round(SAMP * (1 - rnd() * 0.08));
    const pts = [];
    let kStart = -1;
    for (let k = 0; k <= kEnd; k++) {
      const s = k / SAMP;
      const th = th0 + 0.25 * Math.PI * 2 * s;
      let u = Math.sin(th) * r * aR(s);
      let w = Math.cos(th) * r * bR(s);
      const d = 0.08 * gl(s);
      if (d > 1e-4) {
        u += Math.sin(ph + s * 15 * (0.7 + jit * 0.8)) * d * (0.35 + jit);
        w += Math.cos(ph * 1.3 + s * 12 * (0.6 + jit)) * d * (0.35 + jit) * 1.3;
      }
      const p = FP[k].clone().addScaledVector(FN[k], u).addScaledVector(Z, w);
      p.x += land(p.y);
      if (inBone(p)) kStart = pts.length;
      pts.push(p);
    }
    if (kStart < 0) kStart = pts.findIndex((p) => p.y > 0.62);
    const fp = pts.slice(Math.max(0, kStart - 1));
    const s0 = (kEnd - (fp.length - 1)) / SAMP, s1 = kEnd / SAMP;
    const segs = Math.max(8, Math.round(fp.length * 0.5));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), segs, 0.048 * (0.75 + jit * 0.5), 5, false);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let vtx = 0; vtx < n; vtx++) {
      const s = s0 + ((s1 - s0) * Math.floor(vtx / 6)) / segs;
      col.copy(white).lerp(coral, 0.86 * warmK * sstep(0.05, 0.65, gl(s)));
      col.lerp(blush, 0.75 * sstep(0.84, 1.0, s));
      arr[vtx * 3] = col.r;
      arr[vtx * 3 + 1] = col.g;
      arr[vtx * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    fibGeos.push(g);
  }
  const tMat = M.tendon();
  tMat.vertexColors = true;
  // Brillo propio cálido solo donde la fibra está teñida (lesión): se lee igual sobre fondo claro y oscuro
  tMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.32, 0.1) * clamp((0.78 - vColor.b) * 1.6, 0.0, 1.0) * 0.6;');
  };
  const fibMesh = new THREE.Mesh(mergeGeometries(fibGeos), tMat);
  body.add(fibMesh);

  // Núcleo macizo (tapa los huecos entre fibras) y núcleo cálido de la lesión
  const coreT = new Tubes(), hotT = new Tubes();
  {
    const P = [], R = [], C = [];
    const kc = FP.findIndex((p) => p.y > 0.98);
    for (let k = kc; k <= Math.round(SAMP * 0.97); k++) {
      const s = k / SAMP;
      const e = Math.sqrt(Math.min(1, (k - kc) / 6 + 0.1));
      P.push(FP[k]);
      R.push([aR(s) * 0.8 * e, bR(s) * 0.8 * e]);
      C.push([1, 1, 1, 1]);
    }
    coreT.add(P, R, Z, 20, C);
    const P2 = [], R2 = [], C2 = [];
    for (let k = 0; k <= 60; k++) {
      const s = S0 - 0.15 + (0.3 * k) / 60;
      const kk = Math.round(s * SAMP);
      const e = Math.sin((Math.PI * k) / 60);
      P2.push(FP[kk]);
      R2.push([aR(s) * 0.86 * Math.sqrt(e) + 0.004, bR(s) * 0.86 * Math.sqrt(e) + 0.004]);
      C2.push([1, 1, 1, 1]);
    }
    hotT.add(P2, R2, Z, 20, C2);
  }
  const coreMat = M.tendonDeep();
  const hotMat = new THREE.MeshPhysicalMaterial({ color: '#ff7a45', roughness: 0.38, clearcoat: 0.6, emissive: new THREE.Color('#ff4a12'), emissiveIntensity: 0.8 });
  const coreMesh = new THREE.Mesh(coreT.geo(), coreMat), hotMesh = new THREE.Mesh(hotT.geo(), hotMat);
  body.add(coreMesh, hotMesh);

  // Fibras desorganizadas (onduladas, levantadas) sobre el engrosamiento: crema cálido, brillantes
  reseed(321);
  const loose = [];
  for (let i = 0; i < 13; i++) {
    const sA = S0 - 0.1 - rnd() * 0.035;
    const sB = S0 + 0.07 + rnd() * 0.05;
    const th0 = -1.35 + rnd() * 2.7;
    const dth = (rnd() - 0.5) * 1.0;
    const lift = 0.035 + rnd() * 0.06;
    const waves = 1 + rnd() * 1.3, ph = rnd() * 6;
    const pts = [];
    for (let k = 0; k <= 30; k++) {
      const t = k / 30;
      const s = sA + (sB - sA) * t;
      const kk = Math.round(s * SAMP);
      const off = lift * Math.sin(Math.PI * t) + 0.012 * Math.sin(ph + t * Math.PI * 2 * waves);
      const th = th0 + 0.25 * Math.PI * 2 * s + dth * t + 0.1 * Math.sin(ph * 1.7 + t * Math.PI * 2 * waves);
      pts.push(FP[kk].clone().addScaledVector(FN[kk], Math.sin(th) * (aR(s) * 0.97 + off)).addScaledVector(Z, Math.cos(th) * (bR(s) * 0.97 + off)));
    }
    loose.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.021 + rnd() * 0.009, 6, false));
  }
  const looseMat = new THREE.MeshPhysicalMaterial({ color: '#fff1e4', roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.6, sheenColor: new THREE.Color('#ffd6bf'), emissive: new THREE.Color('#ff9a66'), emissiveIntensity: 0.12 });
  const looseMesh = new THREE.Mesh(mergeGeometries(loose), looseMat);
  body.add(looseMesh);

  // Envoltura fusiforme (fresnel fino y nítido)
  const lc = tc.getPointAt(S0);
  const spindle = [];
  for (let k = 0; k <= 12; k++) {
    const s = S0 - 0.15 + (0.3 * k) / 12;
    const p = tc.getPointAt(s);
    spindle.push([p.x, p.y, 0, aR(s) * 1.16]);
  }
  const zk = aR(S0) / bR(S0);
  const env = new THREE.Mesh(
    polygonize((x, y, z) => chain(x, y, z * zk, spindle), [lc.x - 0.9, lc.y - 1.0, -1.0], [lc.x + 0.9, lc.y + 1.0, 1.0], 0.036),
    ghost('#ff6428', { rim: 0.72, power: 2.6, base: 0.02 })
  );
  env.renderOrder = 4;
  body.add(env);

  // Halo cálido centrado en la lesión, detrás del tendón (brilla alrededor del contorno)
  const h1 = halo('#ffb08a', 1.6, 0.9);
  h1.position.copy(lc).addScaledVector(VIEWB, -0.45);
  h1.renderOrder = 1;
  // Velo cálido por delante (tiñe la zona sin tapar las fibras)
  const h2 = halo('#ff8a5c', 1.3, 0.46);
  h2.position.copy(lc).addScaledVector(VIEWB, 0.8);
  h2.renderOrder = 10;
  body.add(h1, h2);

  // ------------------------------------------------------------ Contorno de pierna y pie (vidrio tenue)
  const KS = [
    [-2.06, 0.36, 1.3, 0.44, 0.03],
    [-1.62, 0.04, 1.44, 0.56, 0.03],
    [-0.76, 0.0, 1.55, 0.6, 0.02],
    [-0.06, 0.04, 2.05, 0.66, 0.0],
    [0.74, 0.1, 1.82, 0.76, -0.02],
    [1.54, 0.08, 1.62, 0.9, -0.02],
    [2.34, 0.03, 1.2, 1.04, -0.02],
    [3.14, 0.0, 0.78, 1.12, -0.03],
    [3.74, 0.02, 0.6, 1.1, -0.06],
    [4.34, 0.07, 0.52, 0.98, -0.1],
    [4.74, 0.12, 0.45, 0.8, -0.14],
  ];
  const X0 = -2.06, X1 = 4.82, CAPB = 0.5, CAPF = 0.5;
  const prof = (x) => {
    let i = 0;
    while (i < KS.length - 2 && x > KS[i + 1][0]) i++;
    const A = KS[i], B = KS[i + 1];
    let t = clamp((x - A[0]) / (B[0] - A[0]), 0, 1);
    t = t * t * (3 - 2 * t);
    return [A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, A[3] + (B[3] - A[3]) * t, A[4] + (B[4] - A[4]) * t];
  };
  // Distancia aproximada pero continua (sin "planos fantasma" en los extremos al combinarla con smin)
  const footSDF = (x, y, z) => {
    const xc = clamp(x, X0, X1);
    let cap = 1;
    if (xc < X0 + CAPB) cap = Math.sqrt(Math.max(0, 1 - Math.pow((X0 + CAPB - xc) / CAPB, 2)));
    if (xc > X1 - CAPF) cap = Math.sqrt(Math.max(0, 1 - Math.pow((xc - (X1 - CAPF)) / CAPF, 2)));
    cap = Math.max(cap, 0.04);
    const [yb, yt, hw, zc] = prof(xc);
    const ry = ((yt - yb) / 2) * cap, rz = hw * cap;
    const yc = (yb + yt) / 2;
    const ny = Math.abs((y - yc) / ry), nz = Math.abs((z - zc) / rz);
    const d2 = (Math.pow(Math.pow(ny, 2.6) + Math.pow(nz, 2.6), 1 / 2.6) - 1) * Math.min(ry, rz);
    const dx = x - xc;
    return dx === 0 ? d2 : Math.hypot(dx, Math.max(d2, 0));
  };
  const LEG = [[-0.82, 2.0, 0, 1.52], [-0.84, 3.2, 0, 1.42], [-0.92, 4.3, 0, 1.5], [-1.0, 5.3, 0, 1.68], [-1.05, 6.4, 0, 1.72], [-1.06, 8.0, 0, 1.74]];
  const skinSDF = (x, y, z) => {
    const f = footSDF(x, y, z);
    const leg = chain(x, y, z * 1.2, LEG);
    const heel = ell(x, y, z, -1.22, 1.22, 0.0, 1.03, 0.92, 0.6);
    return smax(smin(smin(f, heel, 0.45), leg, 0.6), -y, 0.18);
  };
  const skin = new THREE.Mesh(polygonize(skinSDF, [-2.9, -0.2, -1.7], [5.0, 7.6, 1.7], 0.08), ghost('#86aaf0', { rim: 0.85, power: 2.6, base: 0.022, f0: FA - 0.2, f1: FB - 0.2 }));
  skin.renderOrder = 3;
  body.add(skin);

  // ------------------------------------------------------------ Pose, sombra y encuadre
  body.rotation.z = ROT;
  root.updateMatrixWorld(true);
  // Caja de lo visible (ignora lo ya desvanecido) → encuadre automático
  const box = new THREE.Box3();
  const tmp = new THREE.Vector3();
  body.traverse((o) => {
    if (!o.isMesh || o.material.colorWrite === false) return;
    const pa = o.geometry.attributes.position;
    for (let i = 0; i < pa.count; i += 3) {
      tmp.fromBufferAttribute(pa, i);
      if (tmp.y > FB - 0.4) continue;
      box.expandByPoint(tmp.applyMatrix4(o.matrixWorld));
    }
  });
  const sh = halo('#0a1530', 1, 0.24);
  sh.scale.set(5.8, 0.6, 1);
  sh.position.set(0.9, box.min.y - 0.05, -0.4);
  root.add(sh);

  const look = box.getCenter(new THREE.Vector3());
  const dir = VIEW;
  const size = box.getSize(new THREE.Vector3());
  const tanH = Math.tan((15 * Math.PI) / 180);
  const D = Math.max(size.y / 2 / tanH, size.x / 2 / (tanH * (1200 / 900))) * 1.12 + size.z / 2;
  const cam = look.clone().addScaledVector(dir, D);
  return { root, cam: [cam.x, cam.y, cam.z], look: [look.x, look.y, look.z], zoom: 1.0, shadow: false };
}
