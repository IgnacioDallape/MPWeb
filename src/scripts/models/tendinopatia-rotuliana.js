// Tendinopatía rotuliana (rodilla de saltador)
// Rodilla en leve flexión (paciente en decúbito, cara anterior hacia arriba) vista lateral/oblicua:
// fémur y tibia con sus diáfisis (V invertida), rótula asentada en la tróclea, tendón rotuliano blanco
// desde el polo inferior de la rótula hasta la tuberosidad tibial, peroné, cuádriceps y
// silueta translúcida de muslo y pierna. Lesión: polo inferior de la rótula / origen profundo del tendón.
export default function build(L) {
  const { THREE, halo, rnd, reseed, mergeGeometries } = L;
  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);

  // ------------------------------------------------------------ utilidades
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ss = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const lin = (hex) => {
    const c = new THREE.Color(hex);
    return [c.r, c.g, c.b];
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // ------------------------------------------------------------ SDF
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px / rx, qy = py / ry, qz = pz / rz;
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  const cone = (x, y, z, ax, ay, az, bx, by, bz, r1, r2) => {
    const bax = bx - ax, bay = by - ay, baz = bz - az;
    const pax = x - ax, pay = y - ay, paz = z - az;
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
  };

  // Poligonización por "surface nets" con normales del gradiente del campo (superficies suaves).
  // colorFn → color por vértice, aoFn → oclusión, alphaFn → alfa (se guarda también en el atributo 'fa').
  function sdfMesh(f, min, max, h, colorFn, aoFn, alphaFn) {
    const nx = Math.ceil((max[0] - min[0]) / h) + 1;
    const ny = Math.ceil((max[1] - min[1]) / h) + 1;
    const nz = Math.ceil((max[2] - min[2]) / h) + 1;
    const Vg = new Float32Array(nx * ny * nz);
    for (let k = 0; k < nz; k++) {
      const z = min[2] + k * h;
      for (let j = 0; j < ny; j++) {
        const y = min[1] + j * h;
        const o = nx * (j + ny * k);
        for (let i = 0; i < nx; i++) Vg[o + i] = f(min[0] + i * h, y, z);
      }
    }
    const cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const cell = new Int32Array(cx * cy * cz).fill(-1);
    const pos = [];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const cv = new Float32Array(8);
    for (let k = 0; k < cz; k++)
      for (let j = 0; j < cy; j++)
        for (let i = 0; i < cx; i++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            const v = Vg[i + (c & 1) + nx * (j + ((c >> 1) & 1) + ny * (k + ((c >> 2) & 1)))];
            cv[c] = v;
            if (v < 0) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;
          let sx = 0, sy = 0, sz = 0, n = 0;
          for (const [a, b] of E) {
            const va = cv[a], vb = cv[b];
            if (va < 0 !== vb < 0) {
              const t = va / (va - vb);
              sx += (a & 1) + ((b & 1) - (a & 1)) * t;
              sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
              sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
              n++;
            }
          }
          cell[i + cx * (j + cy * k)] = pos.length / 3;
          pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
        }
    const idx = [];
    const C = (i, j, k) => cell[i + cx * (j + cy * k)];
    const quad = (a, b, c, d, flip) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) idx.push(a, c, b, a, d, c);
      else idx.push(a, b, c, a, c, d);
    };
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const in0 = Vg[i + nx * (j + ny * k)] < 0;
          if (i < cx && j > 0 && k > 0 && j < cy && k < cz) {
            if (in0 !== Vg[i + 1 + nx * (j + ny * k)] < 0) quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), !in0);
          }
          if (j < cy && i > 0 && k > 0 && i < cx && k < cz) {
            if (in0 !== Vg[i + nx * (j + 1 + ny * k)] < 0) quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), !in0);
          }
          if (k < cz && i > 0 && j > 0 && i < cx && j < cy) {
            if (in0 !== Vg[i + nx * (j + ny * (k + 1))] < 0) quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), !in0);
          }
        }
    const count = pos.length / 3;
    const P = new Float32Array(pos);
    const N = new Float32Array(count * 3);
    const CS = alphaFn ? 4 : 3;
    const COL = colorFn ? new Float32Array(count * CS) : null;
    const FA = alphaFn ? new Float32Array(count) : null;
    const e = h * 0.35;
    const grad = (x, y, z) => {
      const gx = f(x + e, y, z) - f(x - e, y, z);
      const gy = f(x, y + e, z) - f(x, y - e, z);
      const gz = f(x, y, z + e) - f(x, y, z - e);
      const l = Math.hypot(gx, gy, gz) || 1;
      return [gx / l, gy / l, gz / l];
    };
    for (let v = 0; v < count; v++) {
      let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      let g = grad(x, y, z);
      const d = f(x, y, z);
      x -= g[0] * d;
      y -= g[1] * d;
      z -= g[2] * d;
      g = grad(x, y, z);
      P[v * 3] = x;
      P[v * 3 + 1] = y;
      P[v * 3 + 2] = z;
      N.set(g, v * 3);
      if (COL) {
        const col = colorFn(x, y, z, g[0], g[1], g[2]);
        const o = aoFn ? aoFn(x, y, z, g[0], g[1], g[2]) : 1;
        COL[v * CS] = col[0] * o;
        COL[v * CS + 1] = col[1] * o;
        COL[v * CS + 2] = col[2] * o;
      }
      if (FA) {
        FA[v] = alphaFn(x, y, z);
        if (COL) COL[v * CS + 3] = FA[v];
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    if (COL) geo.setAttribute('color', new THREE.BufferAttribute(COL, CS));
    if (FA) geo.setAttribute('fa', new THREE.BufferAttribute(FA, 1));
    geo.setIndex(idx);
    return geo;
  }

  // Haz de fibras que sigue una curva: ancho/espesor variables, color por vértice (con posición u,v en la
  // sección), alfa por posición y un núcleo macizo para que se lea como una banda continua con estriado sutil.
  function band({ pts, side = V3(0, 0, 1), width, thick, fibers, fr, seed, color, alpha = null, fray = null, segs = 64, wave = 0.006, core = 0, bias = 0.5, seamAt = Math.PI / 2, frT = null }) {
    reseed(seed);
    const CH = alpha ? 4 : 3;
    const RAD = 5;
    const curve = new THREE.CatmullRomCurve3(pts);
    const NS = 80;
    const Cs = [], Ss = [], Ns = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      const T = curve.getTangentAt(t);
      const s = side.clone().sub(T.clone().multiplyScalar(side.dot(T))).normalize();
      Cs.push(curve.getPointAt(t));
      Ss.push(s);
      Ns.push(new THREE.Vector3().crossVectors(T, s).normalize());
    }
    const at = (arr, t) => {
      const fi = clamp(t, 0, 1) * NS;
      const i = Math.min(NS - 1, Math.floor(fi));
      return arr[i].clone().lerp(arr[i + 1], fi - i);
    };
    const geos = [];
    for (let fb = 0; fb < fibers; fb++) {
      const r = Math.pow(rnd(), bias) * 0.98, th = rnd() * Math.PI * 2;
      const u = Math.cos(th) * r, v = Math.sin(th) * r;
      const ph = rnd() * 6.28, jit = rnd();
      const PP = [];
      const K = 30;
      for (let k = 0; k <= K; k++) {
        const t = k / K;
        let du = (u * width(t)) / 2 + Math.sin(t * 9 + ph) * wave;
        let dv = (v * thick(t)) / 2 + Math.cos(t * 7 + ph) * wave * 0.6;
        if (fray) {
          const g = Math.exp(-Math.pow((t - fray.at) / fray.w, 2)) * fray.amount * (0.35 + jit) * ss(0.55, 0.9, r);
          du += Math.sin(fb * 1.7 + t * 31) * g;
          dv += Math.cos(fb * 2.3 + t * 27) * g;
        }
        PP.push(at(Cs, t).addScaledVector(at(Ss, t), du).addScaledVector(at(Ns, t), dv));
      }
      const fc = new THREE.CatmullRomCurve3(PP);
      const g = new THREE.TubeGeometry(fc, segs, fr * (0.7 + jit * 0.6), RAD, false);
      g.deleteAttribute('uv');
      const n = g.attributes.position.count;
      const cols = new Float32Array(n * CH);
      const fas = alpha ? new Float32Array(n) : null;
      const pa = g.attributes.position, tmp = new THREE.Vector3();
      for (let i = 0; i <= segs; i++) {
        const tl = i / segs;
        if (frT) {
          // radio de la fibra variable a lo largo (fibras finas en el tendón, gruesas en el vientre)
          const c = fc.getPointAt(tl), kk = frT(tl);
          for (let j = 0; j <= RAD; j++) {
            const vi = i * (RAD + 1) + j;
            tmp.fromBufferAttribute(pa, vi).sub(c).multiplyScalar(kk).add(c);
            pa.setXYZ(vi, tmp.x, tmp.y, tmp.z);
          }
        }
        const col = color(tl, u, v, jit);
        const a = alpha ? alpha(tl, fc.getPointAt(tl)) : 1;
        for (let j = 0; j <= RAD; j++) {
          const vi = i * (RAD + 1) + j;
          cols[vi * CH] = col[0];
          cols[vi * CH + 1] = col[1];
          cols[vi * CH + 2] = col[2];
          if (alpha) {
            cols[vi * CH + 3] = a;
            fas[vi] = a;
          }
        }
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, CH));
      if (alpha) g.setAttribute('fa', new THREE.BufferAttribute(fas, 1));
      geos.push(g);
    }
    if (core > 0) {
      // Núcleo: barrido de una elipse a lo largo de la curva (costura en la cara profunda)
      const S = 110, R = 32;
      const P = [], COLS = [], FAS = [], idx = [];
      for (let i = 0; i <= S; i++) {
        const t = i / S;
        const c = at(Cs, t), s = at(Ss, t), n = at(Ns, t);
        const w = (width(t) / 2) * core, h = (thick(t) / 2) * core;
        const a = alpha ? alpha(t, c) : 1;
        for (let j = 0; j <= R; j++) {
          const f = seamAt + (j / R) * Math.PI * 2;
          const cu = Math.cos(f), sv = Math.sin(f);
          const p = c.clone().addScaledVector(s, cu * w).addScaledVector(n, sv * h);
          P.push(p.x, p.y, p.z);
          const col = color(t, cu * core, sv * core, 0.5);
          COLS.push(col[0], col[1], col[2]);
          if (alpha) {
            COLS.push(a);
            FAS.push(a);
          }
        }
      }
      for (let i = 0; i < S; i++)
        for (let j = 0; j < R; j++) {
          const a = i * (R + 1) + j, b = a + 1, c = a + R + 1, d = c + 1;
          idx.push(a, b, c, b, d, c);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(COLS, CH));
      if (alpha) g.setAttribute('fa', new THREE.Float32BufferAttribute(FAS, 1));
      g.setIndex(idx);
      g.computeVertexNormals();
      geos.push(g);
    }
    return mergeGeometries(geos);
  }

  // Emisión cálida sólo donde el color por vértice es "lesión" (rojo muy por encima del azul)
  const warmEmissive = (mat, gain = 1.6, off = 0) => {
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n totalEmissiveRadiance *= clamp((vColor.r - vColor.b - ${off.toFixed(3)}) * ${gain.toFixed(2)}, 0.0, 1.0);`
      );
    };
    return mat;
  };

  // Pre-pasada de profundidad: los extremos desvanecidos no se superponen consigo mismos (sin neblina)
  const prepassMat = new THREE.ShaderMaterial({
    vertexShader: 'attribute float fa; varying float vA; void main(){ vA = fa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vA; void main(){ if (vA < 0.18) discard; gl_FragColor = vec4(0.0); }',
    colorWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  // Extremo desvanecido "rayos X": el cuerpo del hueso se vuelve vidrio azulado y queda un contorno fresnel
  // que se apaga después (sin neblina lechosa en fondo oscuro ni manchas en fondo claro)
  const fadeEnd = (mat, rim = 0.75) => {
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float fA = vColor.a;
        float fBody = smoothstep(0.45, 1.0, fA);
        float fFr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb = mix(vec3(0.62, 0.72, 0.92), gl_FragColor.rgb, fBody);
        gl_FragColor.a = max(fBody, smoothstep(0.0, 0.5, fA) * (0.1 + ${rim.toFixed(2)} * fFr));`
      );
    };
    return mat;
  };
  const faded = (geo, mat, parent, order = 1, rim = 0.75) => {
    fadeEnd(mat, rim);
    parent.add(new THREE.Mesh(geo, prepassMat));
    mat.transparent = true;
    mat.depthWrite = false;
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = order;
    parent.add(m);
    return m;
  };

  // ------------------------------------------------------------ colores y materiales
  const BONE = lin('#cdb795');
  const CART = lin('#e4ebf5');
  const TEND = lin('#eef2f8');
  const TEDGE = lin('#9fb3d6');
  const TEND2 = lin('#e6ecf6');
  const LES = lin('#ff8f5e');
  const LES2 = lin('#ff6f3f');
  const MUSC = lin('#c4737e');
  const MUSC2 = lin('#a5606b');

  const boneMat = () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.28, envMapIntensity: 0.6 });
  const patMat = warmEmissive(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.26, envMapIntensity: 0.65, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.5 }), 2.2, 0.32);
  const tendonMat = warmEmissive(
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.2, sheen: 0.45, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.45, envMapIntensity: 0.75, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.85 }),
    1.6,
    0.05
  );
  const quadMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.35, sheenColor: new THREE.Color('#ffd8d8'), sheenRoughness: 0.45, envMapIntensity: 0.75 });

  // ------------------------------------------------------------ marcos (fémur: x anterior, y proximal, z lateral)
  const FLEX = (45 * Math.PI) / 180; // flexión de rodilla
  const PIV = [-0.28, 0.5]; // centro del arco posterior de los cóndilos
  const FEM_CUT = 2.8, TIB_CUT = -2.7; // donde se desvanecen muslo y pierna
  const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const [cF, sF] = [Math.cos(FLEX), Math.sin(FLEX)];
  const tibToFem = (x, y, z) => {
    const [rx, ry] = rot2(x - PIV[0], y - PIV[1], -FLEX);
    return V3(rx + PIV[0], ry + PIV[1], z);
  };
  const femToTib = (x, y) => {
    const tx = x - PIV[0], ty = y - PIV[1];
    return [tx * cF - ty * sF + PIV[0], tx * sF + ty * cF + PIV[1]];
  };

  // Fémur distal con diáfisis, tróclea, epicóndilos y escotadura intercondílea
  const femurF = (x, y, z) => {
    let d = cone(x, y, z, 0.06, 0.9, 0, -0.06, 3.3, 0, 0.46, 0.37);
    d = smin(d, ell(x, y, z, 0.08, 0.8, 0, 0.62, 0.62, 0.9), 0.35);
    d = smin(d, ell(x, y, z, 0.4, 0.82, 0, 0.45, 0.5, 0.78), 0.25);
    d = smin(d, ell(x, y, z, -0.28, 0.5, 0.5, 0.55, 0.53, 0.42), 0.22);
    d = smin(d, ell(x, y, z, 0.16, 0.44, 0.48, 0.56, 0.46, 0.42), 0.22);
    d = smin(d, ell(x, y, z, -0.28, 0.48, -0.52, 0.56, 0.55, 0.44), 0.22);
    d = smin(d, ell(x, y, z, 0.16, 0.42, -0.5, 0.56, 0.47, 0.44), 0.22);
    d = smin(d, ell(x, y, z, -0.12, 0.74, 0.86, 0.32, 0.3, 0.2), 0.12); // epicóndilo lateral
    d = smin(d, ell(x, y, z, -0.14, 0.72, -0.88, 0.3, 0.28, 0.16), 0.16); // epicóndilo medial
    d = smax(d, -cone(x, y, z, -0.98, 0.1, 0, 0.05, 0.2, 0, 0.2, 0.15), 0.1); // escotadura
    d = smax(d, -cone(x, y, z, 0.97, 0.2, 0, 1.0, 1.25, 0, 0.27, 0.25), 0.1); // surco troclear
    return d;
  };
  const femurCol = (x, y, z, nx, ny, nz) => {
    const dist = ss(0.62, 0.34, y) * (1 - ss(0.5, 0.85, Math.abs(nz)));
    const troch = ss(0.5, 0.72, x) * ss(1.3, 1.0, y) * (1 - ss(0.45, 0.75, Math.abs(nz))) * ss(-0.1, 0.4, nx);
    return mix(BONE, CART, Math.max(dist, troch) * 0.85);
  };

  // Tibia proximal (marco propio, de pie): platillos cóncavos, eminencia, tuberosidad y diáfisis
  const tibiaF = (x, y, z) => {
    let d = ell(x, y, z, -0.1, -0.3, 0.46, 0.62, 0.32, 0.52);
    d = smin(d, ell(x, y, z, -0.1, -0.3, -0.48, 0.64, 0.32, 0.54), 0.2);
    d = smin(d, ell(x, y, z, -0.02, -0.72, 0, 0.55, 0.5, 0.75), 0.35);
    d = smin(d, cone(x, y, z, 0.02, -0.9, 0, -0.05, -3.1, 0, 0.4, 0.3), 0.3);
    d = smin(d, ell(x, y, z, 0.5, -0.68, 0.02, 0.24, 0.32, 0.34), 0.22); // tuberosidad
    d = smin(d, cone(x, y, z, 0.36, -1.05, 0, 0.22, -3.0, 0, 0.14, 0.09), 0.2); // cresta
    d = smax(d, y + 0.1, 0.14);
    d = smax(d, -ell(x, y, z, -0.1, 0.115, 0.45, 0.9, 0.25, 0.7), 0.08); // cúpula lateral
    d = smax(d, -ell(x, y, z, -0.1, 0.115, -0.47, 0.92, 0.25, 0.72), 0.08); // cúpula medial
    d = smin(d, ell(x, y, z, -0.1, -0.11, 0, 0.08, 0.07, 0.1), 0.05); // eminencia intercondílea
    return d;
  };
  const tibiaCol = (x, y, z, nx, ny) => mix(BONE, CART, ss(-0.22, -0.12, y) * ss(0.3, 0.7, ny) * 0.85);
  const fibulaF = (x, y, z) => smin(ell(x, y, z, -0.36, -0.7, 0.62, 0.24, 0.26, 0.22), cone(x, y, z, -0.38, -0.85, 0.62, -0.45, -3.0, 0.55, 0.15, 0.1), 0.15);
  const tibA = (x, y) => 1 - ss(TIB_CUT + 0.6, TIB_CUT, y);

  // Rótula (marco u anterior, v a lo largo, w lateral), carilla posterior con cresta media
  const PS = 0.95; // escala de la rótula
  const patF0 = (u, v, w) => {
    let d = ell(u, v, w, 0.01, 0.12, 0, 0.36, 0.55, 0.6);
    d = smin(d, ell(u, v, w, -0.03, -0.34, 0, 0.21, 0.32, 0.36), 0.3);
    d = smax(d, -(u + 0.27 - 0.2 * Math.sqrt(w * w + 0.012)), 0.12);
    return d;
  };
  const patF = (u, v, w) => patF0(u / PS, v / PS, w / PS) * PS;
  const patCol = (u, v) => mix(BONE, LES, ss(-0.45, -0.68, v / PS) * 0.55);

  // Asentar la rótula en la tróclea con una interlínea patelofemoral constante
  const PAT_R = -0.45;
  const [cP, sP] = [Math.cos(PAT_R), Math.sin(PAT_R)];
  let PAT_C = [0.88, 0.34];
  const patToFem = (u, v, w) => {
    const [rx, ry] = rot2(u, v, PAT_R);
    return V3(rx + PAT_C[0], ry + PAT_C[1], w);
  };
  for (let it = 0; it < 2; it++) {
    let minC = 1e9;
    for (let v = -0.62; v <= 0.62; v += 0.04)
      for (let w = -0.56; w <= 0.56; w += 0.04) {
        let u = -0.5;
        if (patF(u, v, w) < 0) continue;
        while (u < 0.4 && patF(u, v, w) > 0) u += 0.008;
        if (u >= 0.4) continue;
        const p = patToFem(u, v, w);
        minC = Math.min(minC, femurF(p.x, p.y, p.z));
      }
    const shift = minC - 0.035;
    PAT_C = [PAT_C[0] - shift * cP, PAT_C[1] - shift * sP];
  }

  // Campo combinado de huesos (marco del fémur): oclusión ambiental
  const bonesF = (x, y, z) => {
    let d = femurF(x, y, z);
    const [lx, ly] = femToTib(x, y);
    d = Math.min(d, tibiaF(lx, ly, z), fibulaF(lx, ly, z));
    const px = x - PAT_C[0], py = y - PAT_C[1];
    d = Math.min(d, patF(px * cP + py * sP, -px * sP + py * cP, z));
    return d;
  };
  const aoAt = (x, y, z, nx, ny, nz) => {
    let occ = 0, w = 1;
    for (let i = 1; i <= 5; i++) {
      const hd = 0.02 + 0.06 * i;
      occ += (hd - bonesF(x + nx * hd, y + ny * hd, z + nz * hd)) * w;
      w *= 0.75;
    }
    return 0.2 + 0.8 * clamp(1 - 2.8 * occ, 0, 1);
  };
  const aoTib = (x, y, z, nx, ny, nz) => {
    const p = tibToFem(x, y, z);
    const [mx, my] = rot2(nx, ny, -FLEX);
    return aoAt(p.x, p.y, p.z, mx, my, nz);
  };
  const aoPat = (u, v, w, nu, nv, nw) => {
    const p = patToFem(u, v, w);
    const [mx, my] = rot2(nu, nv, PAT_R);
    return aoAt(p.x, p.y, p.z, mx, my, nw);
  };

  // ------------------------------------------------------------ escena
  const root = new THREE.Group();
  const knee = new THREE.Group();
  root.add(knee);

  faded(sdfMesh(femurF, [-0.95, -0.14, -1.16], [1.08, FEM_CUT + 0.1, 1.16], 0.026, femurCol, aoAt, (x, y) => 1 - ss(FEM_CUT - 0.6, FEM_CUT, y)), boneMat(), knee);

  const tibG = new THREE.Group();
  tibG.position.set(PIV[0], PIV[1], 0);
  tibG.rotation.z = -FLEX;
  const tibIn = new THREE.Group();
  tibIn.position.set(-PIV[0], -PIV[1], 0);
  tibG.add(tibIn);
  knee.add(tibG);
  faded(sdfMesh(tibiaF, [-0.85, TIB_CUT - 0.1, -1.1], [0.85, 0.06, 1.1], 0.026, tibiaCol, aoTib, tibA), boneMat(), tibIn);
  faded(sdfMesh(fibulaF, [-0.7, TIB_CUT - 0.1, 0.3], [-0.08, -0.4, 0.92], 0.022, () => BONE, aoTib, tibA), boneMat(), tibIn);

  const patG = new THREE.Group();
  patG.position.set(PAT_C[0], PAT_C[1], 0);
  patG.rotation.z = PAT_R;
  patG.add(new THREE.Mesh(sdfMesh(patF, [-0.4, -0.72, -0.66], [0.42, 0.72, 0.66], 0.022, patCol, aoPat), patMat));
  knee.add(patG);

  // Tendón rotuliano: nace dentro del polo inferior de la rótula (sin corte visible), engrosamiento
  // fusiforme proximal y se hunde en la tuberosidad tibial
  const A0 = patToFem(-0.06, -0.3, 0); // dentro de la rótula
  const A = patToFem(-0.08, -0.53, 0); // salida por el ápice
  const B = tibToFem(0.66, -0.5, 0.02);
  const T = B.clone().sub(A).normalize();
  const ant = V3(-T.y, T.x, 0);
  if (ant.x < 0) ant.negate();
  const postSign = Math.sign(V3(T.y, -T.x, 0).dot(ant.clone().negate())) || 1; // signo de v hacia la cara profunda
  const tendonPts = [A0];
  for (let i = 0; i <= 6; i++) {
    const s = i / 6;
    tendonPts.push(A.clone().lerp(B, s).addScaledVector(ant, Math.sin(Math.PI * s) * 0.04));
  }
  tendonPts.push(tibToFem(0.48, -0.84, 0.02));
  const tW = (t) => (0.56 + 0.3 * ss(0.0, 0.2, t) - 0.16 * ss(0.3, 0.86, t)) * (1 - 0.4 * ss(0.86, 1, t));
  const tH = (t) => (0.24 + 0.06 * ss(0.0, 0.16, t) + 0.22 * Math.exp(-Math.pow((t - 0.25) / 0.1, 2))) * (1 - 0.35 * ss(0.86, 1, t));
  const tendon = new THREE.Mesh(
    band({
      pts: tendonPts,
      width: tW,
      thick: tH,
      fibers: 150,
      segs: 48,
      fr: 0.024,
      bias: 0.25,
      seed: 7,
      core: 0.97,
      fray: { at: 0.26, w: 0.08, amount: 0.016 },
      color: (t, u, v, j) => {
        const c = mix(TEND, TEDGE, ss(0.7, 1.0, Math.abs(u)) * 0.35);
        const deep = 0.72 + 0.28 * ss(-0.3, 0.6, v * postSign);
        const les = (1 - ss(0.24, 0.36 + 0.06 * j, t)) * deep;
        return mix(c, j > 0.5 ? LES : LES2, les);
      },
    }),
    tendonMat
  );
  knee.add(tendon);

  // Lesión: envoltura cálida (fresnel) que dibuja el engrosamiento fusiforme + fibras desorganizadas
  const tCurve = new THREE.CatmullRomCurve3(tendonPts);
  const side0 = V3(0, 0, 1);
  const frame = (t) => {
    const Tt = tCurve.getTangentAt(t);
    const sd = side0.clone().sub(Tt.clone().multiplyScalar(side0.dot(Tt))).normalize();
    return [tCurve.getPointAt(t), sd, new THREE.Vector3().crossVectors(Tt, sd).normalize()];
  };
  {
    const S = 40, R = 36, t0 = 0.14, t1 = 0.44;
    const P = [], idx = [];
    for (let i = 0; i <= S; i++) {
      const t = t0 + ((t1 - t0) * i) / S;
      const [c, sd, n] = frame(t);
      const k = Math.pow(Math.sin((Math.PI * i) / S), 0.5);
      const w = (tW(t) / 2) * 1.1 * k, h = (tH(t) / 2) * 1.18 * k;
      for (let j = 0; j <= R; j++) {
        const f = (j / R) * Math.PI * 2;
        const q = c.clone().addScaledVector(sd, Math.cos(f) * w).addScaledVector(n, Math.sin(f) * h);
        P.push(q.x, q.y, q.z);
      }
    }
    for (let i = 0; i < S; i++)
      for (let j = 0; j < R; j++) {
        const a = i * (R + 1) + j, b = a + 1, c = a + R + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const envMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color('#ff8a55').convertLinearToSRGB() } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(uColor, 0.035 + 0.8 * f); }',
    });
    const env = new THREE.Mesh(g, envMat);
    env.renderOrder = 12;
    knee.add(env);
  }
  {
    reseed(41);
    const loose = [];
    for (let k = 0; k < 8; k++) {
      const phi = -0.5 + (2.6 * k) / 7 + (rnd() - 0.5) * 0.2;
      const ta = 0.14 + rnd() * 0.05, tb = 0.36 + rnd() * 0.07;
      const ph = rnd() * 10;
      const pp = [];
      for (let q = 0; q <= 20; q++) {
        const t = ta + ((tb - ta) * q) / 20;
        const [c, sd, n] = frame(t);
        const rr = 1.0 + 0.05 * Math.sin(ph + q * 1.9);
        const ang = phi + 0.17 * Math.sin(ph * 1.3 + q * 0.8);
        pp.push(c.clone().addScaledVector(sd, (Math.cos(ang) * rr * tW(t)) / 2).addScaledVector(n, (-postSign * Math.sin(ang) * rr * tH(t)) / 2));
      }
      loose.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.014 + rnd() * 0.008, 5, false));
    }
    const looseMat = new THREE.MeshPhysicalMaterial({ color: '#ff9466', roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.4 });
    knee.add(new THREE.Mesh(mergeGeometries(loose), looseMat));
  }

  // Tendón cuadricipital que se continúa en un vientre muscular estriado hacia el muslo
  const qPts = [patToFem(-0.04 * PS, 0.38 * PS, 0), patToFem(0.0, 0.66 * PS, 0), V3(1.0, 1.3, 0), V3(0.88, 1.88, 0), V3(0.8, 2.45, 0), V3(0.74, 3.05, 0)];
  faded(
    band({
      pts: qPts,
      width: (t) => 0.86 + 0.62 * ss(0.15, 0.6, t),
      thick: (t) => 0.17 + 0.42 * ss(0.18, 0.62, t),
      fibers: 120,
      segs: 44,
      fr: 0.042,
      frT: (t) => 0.42 + 0.58 * ss(0.2, 0.42, t),
      bias: 0.3,
      seed: 19,
      core: 0.97,
      color: (t, u, v, j) => {
        const tend = mix(TEND2, TEDGE, ss(0.7, 1, Math.abs(u)) * 0.3);
        const mus = mix(MUSC, MUSC2, (1 - j) * 0.45 + ss(0.6, 1, Math.abs(u)) * 0.35);
        return mix(tend, mus, ss(0.24, 0.4, t));
      },
      alpha: (t, p) => 1 - ss(FEM_CUT - 0.6, FEM_CUT, p.y),
    }),
    quadMat,
    knee,
    2,
    0
  );

  // Silueta translúcida de muslo y pierna: relleno muy suave + contorno (fresnel)
  const skinF = (x, y, z) => {
    const [lx, ly] = femToTib(x, y);
    let d = cone(x, y, z, 0.06, 0.7, 0, 0.0, 3.3, 0, 1.15, 1.32); // muslo
    d = smin(d, ell(x, y, z, 0.38, 0.36, 0, 1.0, 0.95, 1.12), 0.5); // rodilla
    d = smin(d, cone(lx, ly, z, -0.12, -0.3, 0, -0.2, -3.2, 0, 1.0, 0.8), 0.5); // pierna
    d = smin(d, ell(lx, ly, z, -0.5, -1.5, 0, 0.92, 1.3, 0.95), 0.4); // gemelos
    return Math.max(d, y - FEM_CUT - 0.12, -ly + TIB_CUT - 0.12);
  };
  const skinGeo = sdfMesh(skinF, [-3.9, -3.4, -1.75], [1.9, 3.4, 1.75], 0.06);
  {
    const sp = skinGeo.attributes.position;
    const fa = new Float32Array(sp.count);
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i);
      const ly = femToTib(x, y)[1];
      fa[i] = Math.min(ss(FEM_CUT + 0.1, FEM_CUT - 0.5, y), ss(TIB_CUT - 0.1, TIB_CUT + 0.5, ly));
    }
    skinGeo.setAttribute('fa', new THREE.BufferAttribute(fa, 1));
  }
  const skinMat = (side, base, rim, pow) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side,
      uniforms: { uColor: { value: new THREE.Color('#86a9ea').convertLinearToSRGB() } },
      vertexShader: `attribute float fa; varying float vFade; varying vec3 vN; varying vec3 vV;
        void main(){ vFade = fa; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vFade; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), ${pow.toFixed(2)}); gl_FragColor = vec4(uColor, (${base.toFixed(3)} + ${rim.toFixed(3)} * f) * vFade); }`,
    });
  const skinBack = new THREE.Mesh(skinGeo, skinMat(THREE.BackSide, 0.03, 0.8, 3.4));
  skinBack.renderOrder = 10;
  const skinFront = new THREE.Mesh(skinGeo, skinMat(THREE.FrontSide, 0.065, 0.12, 2.0));
  skinFront.renderOrder = 11;
  knee.add(skinBack, skinFront);

  // Orientación: paciente en decúbito con la rodilla en leve flexión (cara anterior hacia arriba)
  root.rotation.z = Math.PI / 2 + FLEX / 2;
  root.updateMatrixWorld(true);
  const camDir = V3(0.1, 0.78, 1).normalize();

  // Brillo de la lesión, centrado en el polo inferior / origen del tendón
  const lesionW = A.clone().lerp(B, 0.08).applyMatrix4(knee.matrixWorld);
  const glowG = new THREE.Group();
  const h1 = halo('#ff7f50', 1.0, 1.0);
  h1.position.copy(lesionW).addScaledVector(camDir, 0.3);
  const h2 = halo('#ffb48f', 0.45, 0.95);
  h2.position.copy(lesionW).addScaledVector(camDir, 0.32);
  h1.renderOrder = h2.renderOrder = 20;
  h1.material.depthTest = h2.material.depthTest = false;
  glowG.add(h1, h2);

  // Encuadre: proyección real de lo visible (sin las partes desvanecidas), con ~8% de margen
  const pts = [];
  const tv = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.material === prepassMat) return;
    const pa = o.geometry.attributes.position, fa = o.geometry.attributes.fa;
    for (let i = 0; i < pa.count; i += 5) {
      if (fa && fa.getX(i) < 0.25) continue;
      pts.push(tv.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).clone());
    }
  });
  const fit = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100);
  const look = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
  let D = 11;
  for (let it = 0; it < 10; it++) {
    fit.position.copy(look).addScaledVector(camDir, D);
    fit.lookAt(look);
    fit.updateMatrixWorld(true);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) {
      const q = p.clone().project(fit);
      x0 = Math.min(x0, q.x);
      x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y);
      y1 = Math.max(y1, q.y);
    }
    const hh = D * Math.tan((15 * Math.PI) / 180), hw = (hh * 4) / 3;
    const right = V3(1, 0, 0).applyQuaternion(fit.quaternion), up = V3(0, 1, 0).applyQuaternion(fit.quaternion);
    look.addScaledVector(right, ((x0 + x1) / 2) * hw).addScaledVector(up, ((y0 + y1) / 2) * hh);
    D *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / 0.84;
  }

  const out = new THREE.Group();
  out.add(root, glowG);
  const cam = look.clone().addScaledVector(camDir, D);
  return { root: out, cam: cam.toArray(), look: look.toArray(), zoom: 1, shadow: false };
}
