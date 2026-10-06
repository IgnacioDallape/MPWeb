// Lesión ligamentaria — esguince de tobillo, vista lateral (anterolateral) del tobillo derecho.
// Peroné distal recto con el maléolo externo triangular, tibia con su plafond sobre el domo del astrágalo,
// astrágalo (cuerpo, cuello y cabeza) y calcáneo debajo; escafoides, cuboides y metatarsianos en vidrio que se
// desvanecen hacia los dedos. Ligamentos laterales como bandas fibrosas blancas que se abren en abanico en sus
// inserciones: peroneoastragalino anterior con rotura parcial (la mitad superior de las fibras cortada, cabos
// deshilachados en acento cálido sobre un lecho inflamatorio; la mitad inferior continua) y peroneocalcáneo sano.
// Contorno de pierna y pie en "vidrio" tenue.
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
  const geoOf = (S, h, clip = null) => {
    const lo = [S.lo[0] - 0.1, S.lo[1] - 0.1, S.lo[2] - 0.1];
    const hi = [S.hi[0] + 0.1, S.hi[1] + 0.1, S.hi[2] + 0.1];
    if (clip) for (let i = 0; i < 3; i++) if (clip[i] !== null) hi[i] = Math.min(hi[i], clip[i]);
    return polygonize(S.sdf, lo, hi, h);
  };


  // ------------------------------------------------------------ Materiales propios
  // Desvanecido hacia arriba (y0..y1) y hacia los dedos (x0..x1), en coordenadas del objeto
  const FADE_GLSL = 'uniform vec4 uFade; varying vec3 vOP;\n float fadeK(){ return (1.0 - smoothstep(uFade.x, uFade.y, vOP.y)) * (1.0 - smoothstep(uFade.z, uFade.w, vOP.x)); }\n';
  const fadeMat = (mat, fade) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFade = { value: new THREE.Vector4(...fade) };
      sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
      sh.fragmentShader = FADE_GLSL + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= fadeK();');
    };
    return mat;
  };
  // Pre-pasada de profundidad: con transparencia se ve solo la capa más cercana (sin bandas por superposición)
  const depthPre = (fade, cut = 0.35) =>
    new THREE.ShaderMaterial({
      uniforms: { uFade: { value: new THREE.Vector4(...fade) }, uCut: { value: cut } },
      vertexShader: 'varying vec3 vOP; void main(){ vOP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: FADE_GLSL + 'uniform float uCut; void main(){ if (fadeK() < uCut) discard; gl_FragColor = vec4(0.0); }',
      colorWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });
  // Contorno "vidrio" (fresnel) con los mismos desvanecidos
  const ghost = (color, fade, { rim = 0.6, power = 2.4, base = 0.03 } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uRim: { value: rim }, uPow: { value: power }, uBase: { value: base }, uFade: { value: new THREE.Vector4(...fade) } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vOP;
        void main(){ vOP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader:
        FADE_GLSL +
        `uniform vec3 uColor; uniform float uRim; uniform float uPow; uniform float uBase;
        varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
          gl_FragColor = vec4(uColor, (uBase + uRim*f) * fadeK());
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
  // Hueso de contexto "vidrio": relleno casi transparente y contorno azul medio dominado por el fresnel
  // (se lee igual sobre fondo claro y oscuro, sin agrisarse)
  const faintMat = (fade) => {
    const mat = new THREE.MeshPhysicalMaterial({ color: '#e6edf9', roughness: 0.45, clearcoat: 0.4, transparent: true, opacity: 0.16, depthWrite: false });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFade = { value: new THREE.Vector4(...fade) };
      sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
      sh.fragmentShader =
        FADE_GLSL +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          float frz = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.435, 0.561, 0.839), clamp(frz * 1.15, 0.0, 1.0));
          gl_FragColor.a = min(1.0, gl_FragColor.a + 0.62 * frz);
          gl_FragColor.a *= fadeK();`
        );
    };
    return mat;
  };
  const BONE = '#ead9bf';
  const boneMat = () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.48, clearcoat: 0.55, clearcoatRoughness: 0.22 });
  // Ligamento: blanco nacarado sin sheen (el sheen azul sobre hebras finas las ensuciaba);
  // los extremos rotos (color cálido por vértice) emiten un poco de luz propia
  const ligMat = () => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.16, sheen: 0 });
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.36, 0.14) * clamp((vColor.r - vColor.b) * 1.6, 0.0, 1.0) * 0.55;`
      );
    };
    return m;
  };

  // ------------------------------------------------------------ Esqueleto (x+ = dedos, y+ = arriba, z+ = lateral, hacia la cámara)
  const root = new THREE.Group();
  const ankle = new THREE.Group();
  root.add(ankle);
  const GAP = 0.035;

  // Astrágalo: cuerpo con domo troclear convexo, cuello angosto (cintura) y cabeza redondeada
  const talus = shape()
    .ell([-1.3, 1.5, 0.0], [0.5, 0.3, 0.4])
    .ell([-1.28, 1.6, 0.0], [0.44, 0.3, 0.36], 0.15) // domo troclear
    .cone([-0.98, 1.47, 0.02], [-0.66, 1.42, -0.06], 0.2, 0.19, 0.12) // cuello
    .ell([-0.5, 1.38, -0.12], [0.2, 0.25, 0.3], 0.1) // cabeza
    .ell([-1.8, 1.3, 0.0], [0.16, 0.13, 0.15], 0.1) // apófisis posterior
    .ell([-1.32, 1.2, 0.33], [0.2, 0.12, 0.12], 0.12) // apófisis lateral
    .groove((x, y, z) => ell(x, y, z, -1.28, 2.0, 0.0, 0.6, 0.14, 0.07), 0.08);

  // Calcáneo: tuberosidad alta y estrecha con cara posterior aplanada, borde dorsal con la faceta posterior
  // convexa bajo el astrágalo, seno del tarso, proceso anterior en bloque (carilla plana al cuboides),
  // borde plantar recto con procesos medial/lateral y tubérculo peroneo en la cara lateral
  const calc = shape()
    .box([-2.28, 0.72, 0.02], [0.3, 0.42, 0.27], 0.18, 0.12)
    .ell([-2.24, 1.04, 0.02], [0.2, 0.12, 0.2], 0.12) // ángulo posterosuperior
    .box([-1.5, 0.74, 0.04], [0.62, 0.28, 0.29], 0.16, 0.1, 0, 0.14)
    .ell([-1.44, 0.98, 0.04], [0.36, 0.19, 0.28], 0.16) // faceta posterior
    .box([-0.86, 0.88, 0.14], [0.2, 0.19, 0.24], 0.08, -0.04, 0, 0.12) // proceso anterior
    .ell([-2.14, 0.36, -0.12], [0.24, 0.1, 0.15], 0.12) // proceso medial
    .ell([-2.12, 0.35, 0.16], [0.2, 0.09, 0.11], 0.12) // proceso lateral
    .ell([-1.3, 0.98, -0.3], [0.26, 0.08, 0.16], 0.2) // sustentáculo
    .ell([-1.66, 0.6, 0.34], [0.1, 0.055, 0.06], 0.05) // tubérculo peroneo
    .groove((x, y, z) => 0.37 - z, 0.12) // cara lateral plana
    .fit(talus, GAP);

  // Peroné: diáfisis recta y fina; maléolo externo triangular cuya punta baja por debajo del astrágalo
  const fibula = shape()
    .ell([-1.44, 1.52, 0.56], [0.25, 0.36, 0.15]) // maléolo
    .cone([-1.42, 1.48, 0.56], [-1.5, 1.0, 0.56], 0.2, 0.05, 0.16) // vértice
    .cone([-1.44, 1.72, 0.55], [-1.4, 2.3, 0.53], 0.2, 0.135, 0.22)
    .cone([-1.4, 2.3, 0.53], [-1.37, 3.3, 0.51], 0.135, 0.115, 0.1)
    .groove((x, y, z) => 0.71 - z, 0.2) // cara lateral subcutánea apenas aplanada
    .fit(talus, GAP)
    .fit(calc, GAP);

  // Tibia: metáfisis ensanchada, plafond plano asentado sobre el domo, labio anterior y maléolo medial
  const tibia = shape()
    .box([-1.3, 2.16, -0.04], [0.54, 0.2, 0.42], 0.14)
    .cone([-1.27, 2.22, -0.04], [-1.17, 3.4, -0.04], 0.44, 0.33, 0.36)
    .ell([-0.82, 1.99, 0.0], [0.13, 0.09, 0.32], 0.1) // labio anterior
    .ell([-1.8, 1.98, -0.04], [0.13, 0.1, 0.3], 0.1) // labio posterior
    .cone([-1.24, 2.1, -0.44], [-1.22, 1.5, -0.46], 0.2, 0.1, 0.2) // maléolo medial
    .ell([-1.0, 2.12, 0.3], [0.17, 0.17, 0.12], 0.1) // tubérculo anterior (Chaput)
    .fit(talus, GAP)
    .fit(fibula, GAP);

  const nav = shape()
    .ell([-0.2, 1.32, -0.28], [0.15, 0.27, 0.42])
    .ell([-0.18, 1.02, -0.64], [0.15, 0.14, 0.13], 0.12)
    .fit(talus, GAP);
  const cuboid = shape().box([-0.36, 0.84, 0.4], [0.27, 0.23, 0.25], 0.12, -0.12).fit(calc, GAP).fit(nav, GAP);
  const cunM = shape().box([0.24, 1.12, -0.56], [0.22, 0.32, 0.14], 0.11, -0.08).fit(nav, GAP);
  const cunI = shape().box([0.18, 1.36, -0.26], [0.15, 0.17, 0.12], 0.1, -0.05).fit(nav, GAP).fit(cunM, GAP);
  const cunL = shape().box([0.2, 1.24, 0.04], [0.2, 0.2, 0.14], 0.1, -0.08).fit(nav, GAP).fit(cunI, GAP).fit(cuboid, GAP);
  const RAYS = [
    { b: [0.62, 1.02, -0.6], h: [1.98, 0.42, -0.8], rb: 0.2, rs: 0.12, prox: cunM },
    { b: [0.5, 1.26, -0.28], h: [2.14, 0.4, -0.4], rb: 0.14, rs: 0.085, prox: cunI },
    { b: [0.54, 1.14, 0.02], h: [2.06, 0.38, 0.0], rb: 0.13, rs: 0.082, prox: cunL },
    { b: [0.12, 0.98, 0.32], h: [1.86, 0.36, 0.42], rb: 0.13, rs: 0.08, prox: cuboid },
    { b: [0.04, 0.8, 0.58], h: [1.62, 0.33, 0.8], rb: 0.13, rs: 0.08, prox: cuboid },
  ];
  const mets = [];
  let prevMT = null;
  RAYS.forEach((r, j) => {
    const { b, h } = r;
    const m = [(b[0] + h[0]) / 2, (b[1] + h[1]) / 2 + 0.06, (b[2] + h[2]) / 2];
    const mt = shape()
      .ell(b, [r.rb * 1.05, r.rb * 1.35, r.rb * 1.05])
      .cone(b, m, r.rb * 0.8, r.rs, 0.14)
      .cone(m, h, r.rs, r.rs * 1.1, 0.1)
      .fit(r.prox, GAP);
    if (j === 1) mt.fit(cunM, GAP).fit(cunL, GAP);
    if (j === 4) mt.ell([-0.08, 0.72, 0.78], [0.16, 0.12, 0.12], 0.12);
    if (prevMT) mt.fit(prevMT, 0.02);
    mets.push(mt);
    prevMT = mt;
  });

  // ------------------------------------------------------------ Ligamentos
  const near = [talus, calc, fibula, tibia];
  const field = (p) => {
    let d = 1e9;
    for (const s of near) d = Math.min(d, s.sdf(p.x, p.y, p.z));
    return d;
  };
  const gradOf = (S, p) => {
    const e = 0.004;
    return V(S.sdf(p.x + e, p.y, p.z) - S.sdf(p.x - e, p.y, p.z), S.sdf(p.x, p.y + e, p.z) - S.sdf(p.x, p.y - e, p.z), S.sdf(p.x, p.y, p.z + e) - S.sdf(p.x, p.y, p.z - e)).normalize();
  };
  // Lleva un punto a la superficie del hueso (y lo hunde un poco)
  const snap = (S, p, sink = 0.015) => {
    const q = p.clone();
    for (let i = 0; i < 24; i++) q.addScaledVector(gradOf(S, q), -(S.sdf(q.x, q.y, q.z) + sink));
    return { p: q, n: gradOf(S, q) };
  };
  const white = new THREE.Color('#edf2fb');
  const warm = new THREE.Color('#ff8a57');
  const hot = new THREE.Color('#ff5a26');
  const col = new THREE.Color();

  // Tubo con radio variable y color por anillo
  function fiberTube(pts, r, segs, radial, taper, tint) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const g = new THREE.TubeGeometry(curve, segs, r, radial, false);
    const pos = g.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    const c = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const s = i / segs;
      curve.getPointAt(s, c);
      const f = taper(s);
      tint(s, col);
      for (let j = 0; j <= radial; j++) {
        const vi = i * (radial + 1) + j;
        p.fromBufferAttribute(pos, vi).sub(c).multiplyScalar(f).add(c);
        pos.setXYZ(vi, p.x, p.y, p.z);
        arr[vi * 3] = col.r;
        arr[vi * 3 + 1] = col.g;
        arr[vi * 3 + 2] = col.b;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  }

  // Banda fibrosa aplanada de A (hueso SA) a B (hueso SB), apoyada sobre el hueso.
  // hw(s) = semiancho (se abre en abanico en las inserciones), th = espesor.
  // tear = { s, gap, from } corta las fibras con u > from (u = -1 borde inferior, +1 borde superior)
  function ligament({ SA, A, SB, B, hw, th = 0.06, nf = 40, fr = 0.03, bulge = 0.03, S = 32, segs = 48, tear = null, heat = 0, heatW = 0.26, seed = 1, base = white, warmK = 0.35, stumpK = 0.15, hotW = 0.08, diveLen = 0.1 }) {
    reseed(seed);
    const a = snap(SA, A, 0.03), b = snap(SB, B, 0.03);
    A = a.p;
    B = b.p;
    const T = B.clone().sub(A);
    const len = T.length();
    T.normalize();
    const out = a.n.clone().add(b.n).normalize();
    const W = new THREE.Vector3().crossVectors(out, T).normalize();
    const O = new THREE.Vector3().crossVectors(T, W).normalize();
    const geos = [];
    const path = (u, v) => {
      const P = [];
      const off = [];
      for (let k = 0; k <= S; k++) {
        const s = k / S;
        const edge = Math.min(s, 1 - s);
        const inE = 1 - sstep(0.0, 0.16, edge); // 1 en las inserciones
        const p = A.clone()
          .addScaledVector(T, len * s)
          .addScaledVector(W, u * hw(s))
          .addScaledVector(O, bulge * Math.sin(Math.PI * s) - 0.05 * inE);
        // cerca de las inserciones, la fibra se pega a su hueso (las del borde no quedan colgando)
        if (inE > 0.01) p.lerp(snap(s < 0.5 ? SA : SB, p, 0.02).p, inE * inE);
        const clear = fr + 0.008 - 0.11 * inE;
        let o = 0;
        while (field(p) < clear && o < 0.6) {
          p.addScaledVector(O, 0.005);
          o += 0.005;
        }
        P.push(p);
        off.push(o);
      }
      for (let it = 0; it < 4; it++) {
        const o2 = off.slice();
        for (let k = 1; k < S; k++) {
          const m = (off[k - 1] + off[k] * 2 + off[k + 1]) / 4;
          if (m > off[k]) {
            P[k].addScaledVector(O, m - off[k]);
            o2[k] = m;
          }
        }
        for (let k = 0; k <= S; k++) off[k] = o2[k];
      }
      for (let k = 0; k <= S; k++) P[k].addScaledVector(O, v * th * sstep(0, 0.22, Math.min(k / S, 1 - k / S)));
      // Inserción en abanico: cada fibra se hunde en el hueso (sin bordes duros), con largo escalonado
      const dive = (p0, dirT, len0) => {
        const out = [];
        const d = T.clone().multiplyScalar(dirT * 0.35).addScaledVector(O, -1).addScaledVector(W, u * 0.12).normalize();
        for (let j = 1; j <= 3; j++) out.push(p0.clone().addScaledVector(d, (len0 * j) / 3));
        return out;
      };
      P.pre = dive(P[0], -1, diveLen + rnd() * 0.05).reverse();
      P.post = dive(P[S], 1, diveLen + rnd() * 0.05);
      return P;
    };
    const at = (P, s) => {
      const f = clamp(s, 0, 1) * S;
      const k0 = Math.min(S - 1, Math.floor(f));
      return P[k0].clone().lerp(P[k0 + 1], f - k0);
    };
    const ts = tear ? tear.s : 0.5;
    const heatAt = (s) => heat * Math.exp(-Math.pow((s - ts) / heatW, 2));
    for (let i = 0; i < nf; i++) {
      const u = ((i + 0.15 + rnd() * 0.7) / nf) * 2 - 1;
      const v = rnd();
      const ph = rnd() * 10;
      const jit = rnd();
      const r = fr * (0.8 + jit * 0.45);
      const P = path(u, v);
      const torn = tear && u > tear.from + Math.sin(i * 2.7) * 0.08;
      if (!torn) {
        // Fibra continua (en la zona lesionada: estirada, más fina y levemente ondulada)
        const pts = P.map((p, k) => {
          const s = k / S;
          const hz = heatAt(s);
          return p.clone().addScaledVector(O, Math.sin(ph + s * 34) * 0.01 * hz).addScaledVector(W, Math.cos(ph + s * 27) * 0.006 * hz);
        });
        const ex = 0.12 / len;
        const sOf = (t) => -ex + t * (1 + 2 * ex);
        geos.push(
          fiberTube(
            [...P.pre, ...pts, ...P.post],
            r,
            segs,
            7,
            (t) => 1 - 0.22 * heatAt(sOf(t)) * (tear ? 1 : 0),
            (t, c) => c.copy(base).lerp(warm, warmK * sstep(0.05, 0.8, heatAt(sOf(t))))
          )
        );
        continue;
      }
      // Fibra cortada: dos cabos retraídos cuyos extremos se deshilachan
      const st = ts + (rnd() - 0.5) * 0.05 + Math.sin(u * 6 + i) * 0.02;
      const g0 = tear.gap * (0.85 + rnd() * 0.3);
      for (const side of [-1, 1]) {
        const sEnd = st + (side * g0) / 2; // donde termina el cabo
        const sSplit = sEnd - side * (0.08 + rnd() * 0.05); // donde empieza a deshilacharse
        const s0 = side < 0 ? 0 : sSplit;
        const s1 = side < 0 ? sSplit : 1;
        const pts = [];
        const n = Math.max(8, Math.round(Math.abs(s1 - s0) * S * 1.5));
        const lift = 0.012 + rnd() * 0.025;
        for (let k = 0; k <= n; k++) {
          const s = s0 + ((s1 - s0) * k) / n;
          const e = side < 0 ? sstep(sSplit - 0.2, sSplit, s) : 1 - sstep(sSplit, sSplit + 0.2, s);
          pts.push(at(P, s).addScaledVector(O, lift * e * e));
        }
        if (side < 0) pts.unshift(...P.pre);
        else pts.push(...P.post);
        const tintAt = (s, c) => {
          const d = Math.abs(s - sEnd);
          c.copy(base)
            .lerp(warm, stumpK * sstep(0.2, 0.9, heatAt(s)))
            .lerp(hot, Math.exp(-Math.pow(d / hotW, 2)));
        };
        geos.push(
          fiberTube(
            pts,
            r,
            Math.max(16, Math.round(segs * Math.abs(s1 - s0) * 1.3)),
            7,
            (t) => 1 - 0.25 * sstep(0.6, 1, side < 0 ? t : 1 - t),
            (t, c) => tintAt(s0 + (s1 - s0) * t, c)
          )
        );
        // Extremo deshilachado: una hebra que se separa y se curva hacia afuera
        const ang = ph;
        const dW = Math.cos(ang) * (0.018 + rnd() * 0.025);
        const dO = 0.018 + Math.abs(Math.sin(ang)) * 0.03 + rnd() * 0.015;
        const over = (rnd() - 0.3) * 0.04;
        const wpts = [];
        const sB = sEnd + side * over;
        for (let k = 0; k <= 10; k++) {
          const t = k / 10;
          const s = sSplit + (sB - sSplit) * t;
          const e = t * t;
          wpts.push(
            at(P, s)
              .addScaledVector(O, lift + dO * e + Math.sin(ph + t * 6) * 0.006)
              .addScaledVector(W, dW * e)
              .addScaledVector(T, -side * 0.015 * e)
          );
        }
        geos.push(fiberTube(wpts, r * 0.9, 16, 6, (t) => 1 - 0.55 * t, (t, c) => tintAt(sSplit + (sB - sSplit) * t, c)));
      }
    }
    const mid = path(0, 0.5)[S >> 1];
    return { geo: mergeGeometries(geos), A, B, T, W, O, len, mid };
  }

  // Abanico en las inserciones: el semiancho crece cerca de los extremos
  const fan = (s, k = 0.05, w = 0.14) => k * ((1 - sstep(0, w, s)) + (1 - sstep(0, w, 1 - s)));

  // Peroneoastragalino anterior (ATFL): del borde anterior del maléolo, hacia adelante, al cuello del astrágalo.
  // Rotura parcial: la mitad superior de las fibras cortada; la mitad inferior blanca y continua.
  const atfl = ligament({
    SA: fibula,
    A: V(-1.25, 1.33, 0.64),
    SB: talus,
    B: V(-0.68, 1.47, 0.26),
    hw: (s) => 0.12 + 0.03 * Math.pow(Math.abs(2 * s - 1), 2) + fan(s, 0.045),
    th: 0.055,
    nf: 32,
    fr: 0.028,
    bulge: 0.02,
    tear: { s: 0.5, gap: 0.24, from: 0.05 },
    heatW: 0.17,
    heat: 1,
    seed: 701,
  });
  ankle.add(new THREE.Mesh(atfl.geo, ligMat()));
  // Peroneocalcáneo (CFL): cordón de la punta del maléolo hacia abajo y atrás, a la cara lateral del calcáneo
  const cfl = ligament({
    SA: fibula,
    A: V(-1.56, 1.08, 0.62),
    SB: calc,
    B: V(-2.02, 0.48, 0.44),
    hw: (s) => 0.055 + fan(s, 0.035),
    th: 0.1,
    nf: 22,
    fr: 0.026,
    bulge: 0.035,
    seed: 702,
  });
  ankle.add(new THREE.Mesh(cfl.geo, ligMat()));

  // ------------------------------------------------------------ Huesos
  // Oclusión ambiental por SDF (sombra suave en articulaciones y recovecos) + tinte cálido cerca de la lesión
  const ALL = [talus, calc, fibula, tibia, nav, cuboid, cunM, cunI, cunL, ...mets];
  const union = (x, y, z) => {
    let d = 1e9;
    for (const s of ALL) {
      const bx = Math.max(s.lo[0] - x, 0, x - s.hi[0]);
      const by = Math.max(s.lo[1] - y, 0, y - s.hi[1]);
      const bz = Math.max(s.lo[2] - z, 0, z - s.hi[2]);
      if (Math.hypot(bx, by, bz) > d) continue;
      d = Math.min(d, s.raw(x, y, z));
    }
    return d;
  };
  const LES = atfl.mid.clone().addScaledVector(atfl.W, 0.05);
  const boneCol = new THREE.Color(BONE);
  const warmBone = new THREE.Color('#ffb089');
  const shade = (geo, tint = 0, baseCol = boneCol) => {
    const p = geo.attributes.position, n = geo.attributes.normal;
    const arr = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const H = [0.05, 0.11, 0.19, 0.29, 0.42];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
      let occ = 0, w = 1;
      for (const h of H) {
        occ += w * Math.max(0, h - union(x + nx * h, y + ny * h, z + nz * h));
        w *= 0.72;
      }
      const ao = clamp(1 - 3.4 * occ, 0.32, 1);
      c.copy(baseCol);
      if (tint) {
        const d = Math.hypot(x - LES.x, (y - LES.y) * 1.2, z - LES.z);
        c.lerp(warmBone, tint * Math.exp(-Math.pow(d / 0.34, 2)));
      }
      c.multiplyScalar(ao);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };

  // Protagonistas (sólidos): astrágalo, calcáneo, peroné y tibia (estos dos se desvanecen hacia arriba)
  const bm = boneMat();
  ankle.add(new THREE.Mesh(shade(geoOf(talus, 0.02), 0.7), bm));
  ankle.add(new THREE.Mesh(shade(geoOf(calc, 0.022), 0), bm));
  const LEG_FADE = [2.05, 2.75, 50, 60];
  const tibMesh = new THREE.Mesh(shade(geoOf(tibia, 0.026, [null, 3.2, null]), 0, new THREE.Color('#dfd3c2')), fadeMat(boneMat(), [2.25, 2.9, 50, 60]));
  tibMesh.renderOrder = 2.5;
  ankle.add(tibMesh);
  const fibMesh = new THREE.Mesh(shade(geoOf(fibula, 0.02, [null, 3.2, null]), 0.55), fadeMat(boneMat(), LEG_FADE));
  fibMesh.renderOrder = 3;
  ankle.add(fibMesh);

  // Contexto (vidrio): escafoides, cuboides, cuñas y metatarsianos, que se desvanecen hacia los dedos
  const FAINT_FADE = [2.0, 2.65, -0.4, 0.35];
  const faintGeo = mergeGeometries([...[nav, cuboid, cunM, cunI, cunL].map((s) => geoOf(s, 0.026)), ...mets.map((s) => geoOf(s, 0.026, [0.9, null, null]))]);
  const pre = new THREE.Mesh(faintGeo, depthPre(FAINT_FADE, 0.2));
  pre.renderOrder = 1;
  ankle.add(pre);
  const faint = new THREE.Mesh(faintGeo, faintMat(FAINT_FADE));
  faint.renderOrder = 2;
  ankle.add(faint);

  // Lecho inflamatorio bajo la rotura (edema/hematoma): mancha cálida bajo la mitad superior cortada
  {
    reseed(77);
    const N = atfl.O;
    const Tp = atfl.T.clone().addScaledVector(N, -atfl.T.dot(N)).normalize();
    const Wp = new THREE.Vector3().crossVectors(N, Tp);
    const c0 = atfl.mid.clone().addScaledVector(atfl.O, -0.03).addScaledVector(atfl.W, 0.055);
    const g = new THREE.SphereGeometry(1, 40, 20);
    const ps = g.attributes.position;
    for (let i = 0; i < ps.count; i++) {
      const x = ps.getX(i), y = ps.getY(i), z = ps.getZ(i);
      const k = 1 + 0.08 * Math.sin(x * 7 + y * 3) * Math.cos(y * 6 - z * 2);
      ps.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    g.scale(atfl.len * 0.2, 0.1, 0.04);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(Tp, Wp, N));
    g.translate(c0.x, c0.y, c0.z);
    const bed = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#ff8552', roughness: 0.36, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: new THREE.Color('#ff5a2a'), emissiveIntensity: 0.7 }));
    ankle.add(bed);
  }

  // Resplandor cálido sobre la rotura
  const h1 = halo('#ff9a6b', 2.2, 0.42);
  h1.position.copy(atfl.mid).addScaledVector(atfl.W, 0.05).addScaledVector(atfl.O, -0.02);
  ankle.add(h1);

  // ------------------------------------------------------------ Contorno de pierna y pie (vidrio tenue)
  const SKIN_FADE = [2.15, 2.8, -0.05, 0.75];
  const skinSDF = (x, y, z) => {
    let d = chain(x, y, z * 1.18, [[-1.55, 1.3, 0, 0.98], [-1.58, 2.4, 0, 0.92], [-1.6, 3.2, 0, 0.96]]);
    d = smin(d, ell(x, y, z, -1.5, 1.32, 0.5, 0.36, 0.48, 0.3), 0.3);
    d = smin(d, ell(x, y, z, -2.3, 0.62, 0.0, 0.66, 0.66, 0.62), 0.5);
    d = smin(d, ell(x, y, z, -0.6, 0.86, 0.0, 1.45, 0.86, 0.78), 0.55);
    d = smin(d, ell(x, y, z, 1.2, 0.55, 0.05, 1.35, 0.55, 0.88), 0.6);
    return smax(d, -y - 0.02, 0.1);
  };
  const skin = new THREE.Mesh(polygonize(skinSDF, [-3.1, -0.2, -1.2], [1.4, 3.05, 1.2], 0.055), ghost('#86aaf0', SKIN_FADE, { rim: 0.62, power: 2.6, base: 0.016 }));
  skin.renderOrder = 4;
  ankle.add(skin);

  // Giro del conjunto: la cara lateral mira a la cámara y la luz principal la modela de costado
  ankle.rotation.y = -0.55;
  root.updateMatrixWorld(true);

  // Sombra de contacto
  const sh = halo('#0a1530', 1, 0.22);
  sh.scale.set(4.4, 0.45, 1);
  sh.position.copy(ankle.localToWorld(V(-1.1, -0.15, 0)));
  root.add(sh);

  const look = ankle.localToWorld(V(-1.1, 1.32, 0.2));
  const camDir = ankle.localToWorld(V(-1.1 + 0.3, 1.32 + 0.14, 0.2 + 0.94)).sub(look).normalize();
  const cam = look.clone().addScaledVector(camDir, 8.6);
  return { root, cam: cam.toArray(), look: look.toArray(), zoom: 0.88, shadow: false };
}
