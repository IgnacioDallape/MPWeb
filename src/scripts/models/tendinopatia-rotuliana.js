// Tendinopatía rotuliana (rodilla de saltador)
// Rodilla en leve flexión vista desde lateral/anterior: fémur distal, rótula, tendón rotuliano
// hasta la tuberosidad de la tibia, peroné, tendón cuadricipital tenue y silueta translúcida de la pierna.
// Lesión: zona cálida en el polo inferior de la rótula / origen del tendón.
export default function build(L) {
  const { THREE, halo, rnd, reseed, mergeGeometries } = L;

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
  // Poligonización por "surface nets" con normales del gradiente del campo (superficies suaves)
  function sdfMesh(f, min, max, h, colorFn, aoFn, alphaFn) {
    const nx = Math.ceil((max[0] - min[0]) / h) + 1;
    const ny = Math.ceil((max[1] - min[1]) / h) + 1;
    const nz = Math.ceil((max[2] - min[2]) / h) + 1;
    const V = new Float32Array(nx * ny * nz);
    for (let k = 0; k < nz; k++) {
      const z = min[2] + k * h;
      for (let j = 0; j < ny; j++) {
        const y = min[1] + j * h;
        const o = nx * (j + ny * k);
        for (let i = 0; i < nx; i++) V[o + i] = f(min[0] + i * h, y, z);
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
            const v = V[i + (c & 1) + nx * (j + ((c >> 1) & 1) + ny * (k + ((c >> 2) & 1)))];
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
          const v0 = V[i + nx * (j + ny * k)];
          const in0 = v0 < 0;
          if (i < cx && j > 0 && k > 0 && j < cy && k < cz) {
            if (in0 !== V[i + 1 + nx * (j + ny * k)] < 0) quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), !in0);
          }
          if (j < cy && i > 0 && k > 0 && i < cx && k < cz) {
            if (in0 !== V[i + nx * (j + 1 + ny * k)] < 0) quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), !in0);
          }
          if (k < cz && i > 0 && j > 0 && i < cx && j < cy) {
            if (in0 !== V[i + nx * (j + ny * (k + 1))] < 0) quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), !in0);
          }
        }
    // Proyección a la superficie + normales por gradiente
    const count = pos.length / 3;
    const P = new Float32Array(pos);
    const N = new Float32Array(count * 3);
    const CS = alphaFn ? 4 : 3;
    const COL = colorFn ? new Float32Array(count * CS) : null;
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
        if (alphaFn) COL[v * CS + 3] = alphaFn(x, y, z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    if (COL) geo.setAttribute('color', new THREE.BufferAttribute(COL, CS));
    geo.setIndex(idx);
    return geo;
  }

  // Haz de fibras que sigue una curva, con ancho/espesor variables, color (y alfa) por vértice,
  // deshilachado y un núcleo macizo opcional para que el haz se lea como una banda continua.
  function band({ pts, side = new THREE.Vector3(0, 0, 1), width, thick, fibers, fr, seed, color, alpha = null, endJitter = 0, taperEnd = false, fray = null, segs = 64, wave = 0.006, core = 0 }) {
    reseed(seed);
    const CH = alpha ? 4 : 3;
    const curve = new THREE.CatmullRomCurve3(pts);
    const NS = 64;
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
    const rgba = (t, u, v, j) => {
      const c = color(t, u, v, j);
      return alpha ? [c[0], c[1], c[2], alpha(t)] : c;
    };
    const geos = [];
    const tmp = new THREE.Vector3();
    for (let fb = 0; fb < fibers; fb++) {
      const r = Math.sqrt(rnd()) * 0.98, th = rnd() * Math.PI * 2;
      const u = Math.cos(th) * r, v = Math.sin(th) * r;
      const ph = rnd() * 6.28, jit = rnd();
      const t1 = 1 - endJitter * rnd();
      const PP = [];
      const K = 30;
      for (let k = 0; k <= K; k++) {
        const t = (t1 * k) / K;
        let du = (u * width(t)) / 2 + Math.sin(t * 9 + ph) * wave;
        let dv = (v * thick(t)) / 2 + Math.cos(t * 7 + ph) * wave * 0.6;
        if (fray) {
          const g = Math.exp(-Math.pow((t - fray.at) / fray.w, 2)) * fray.amount * (0.35 + jit);
          du += Math.sin(fb * 1.7 + t * 31) * g;
          dv += Math.cos(fb * 2.3 + t * 27) * g;
        }
        PP.push(at(Cs, t).add(at(Ss, t).multiplyScalar(du)).add(at(Ns, t).multiplyScalar(dv)));
      }
      const fc = new THREE.CatmullRomCurve3(PP);
      const g = new THREE.TubeGeometry(fc, segs, fr * (0.7 + jit * 0.6), 6, false);
      g.deleteAttribute('uv');
      const pa = g.attributes.position;
      const cols = new Float32Array(pa.count * CH);
      for (let i = 0; i <= segs; i++) {
        const tl = i / segs;
        const c = fc.getPointAt(tl);
        const kk = taperEnd ? Math.max(0.05, ss(0, 0.12, 1 - tl)) : 1;
        const col = rgba(tl * t1, u, v, jit);
        for (let j = 0; j <= 6; j++) {
          const vi = i * 7 + j;
          tmp.fromBufferAttribute(pa, vi).sub(c).multiplyScalar(kk).add(c);
          pa.setXYZ(vi, tmp.x, tmp.y, tmp.z);
          cols.set(col, vi * CH);
        }
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, CH));
      geos.push(g);
    }
    if (core > 0) {
      // Núcleo: barrido de una elipse a lo largo de la curva
      const S = 96, R = 28;
      const P = [], COLS = [], idx = [];
      for (let i = 0; i <= S; i++) {
        const t = i / S;
        const c = at(Cs, t), s = at(Ss, t), n = at(Ns, t);
        const w = (width(t) / 2) * core, h = (thick(t) / 2) * core;
        const col = rgba(t, 0, 0, 0.5);
        for (let j = 0; j <= R; j++) {
          const f = (j / R) * Math.PI * 2;
          const p = c.clone().add(s.clone().multiplyScalar(Math.cos(f) * w)).add(n.clone().multiplyScalar(Math.sin(f) * h));
          P.push(p.x, p.y, p.z);
          COLS.push(...col);
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
      g.setIndex(idx);
      g.computeVertexNormals();
      geos.push(g);
    }
    return mergeGeometries(geos);
  }

  // Emisión cálida sólo donde el color por vértice es "lesión" (rojo alto, azul bajo)
  const warmEmissive = (mat, gain = 1.6) => {
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n totalEmissiveRadiance *= clamp((vColor.r - vColor.b) * ${gain.toFixed(2)}, 0.0, 1.0);`
      );
    };
    return mat;
  };

  // ------------------------------------------------------------ colores y materiales
  const BONE = lin('#e4d9c6');
  const CART = lin('#dfe6f2');
  const TEND = lin('#bfd2f2');
  const TEND2 = lin('#c9d7ee');
  const LES = lin('#ff9a6b');
  const LES2 = lin('#ff7f50');
  const MUSC = lin('#d98587');

  const boneMat = (fade = false) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.48, clearcoat: 0.6, clearcoatRoughness: 0.26, transparent: fade });
  const patMat = warmEmissive(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.45 }), 1.2);
  const tendonMat = warmEmissive(
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.22, sheen: 0.45, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.45, envMapIntensity: 0.7, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.6 })
  );
  const quadMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.7, sheenColor: new THREE.Color('#ffd0d0'), sheenRoughness: 0.4, transparent: true });

  // ------------------------------------------------------------ geometría (marco del fémur: x anterior, y proximal, z lateral)
  const FLEX = (45 * Math.PI) / 180; // flexión de rodilla
  const SKIN = true;
  const PIV = [-0.28, 0.5]; // centro del arco posterior de los cóndilos
  const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const tibToFem = (x, y, z) => {
    const [rx, ry] = rot2(x - PIV[0], y - PIV[1], -FLEX);
    return new THREE.Vector3(rx + PIV[0], ry + PIV[1], z);
  };
  const PAT_R = -0.45;
  const APEX = [0.63, -0.1]; // origen del tendón (polo inferior) en el marco del fémur
  const PAT_C = (() => {
    const [rx, ry] = rot2(-0.04, -0.5, PAT_R);
    return [APEX[0] - rx, APEX[1] - ry];
  })();
  const patToFem = (u, v, w) => {
    const [rx, ry] = rot2(u, v, PAT_R);
    return new THREE.Vector3(rx + PAT_C[0], ry + PAT_C[1], w);
  };

  // Fémur distal
  const femurF = (x, y, z) => {
    let d = cone(x, y, z, 0.06, 0.9, 0, -0.04, 2.6, 0, 0.46, 0.38);
    d = smin(d, ell(x, y, z, 0.08, 0.8, 0, 0.62, 0.62, 0.9), 0.35);
    d = smin(d, ell(x, y, z, 0.4, 0.82, 0, 0.45, 0.5, 0.78), 0.25);
    d = smin(d, ell(x, y, z, -0.28, 0.5, 0.5, 0.55, 0.53, 0.42), 0.22);
    d = smin(d, ell(x, y, z, 0.16, 0.44, 0.48, 0.56, 0.46, 0.42), 0.22);
    d = smin(d, ell(x, y, z, -0.28, 0.48, -0.52, 0.56, 0.55, 0.44), 0.22);
    d = smin(d, ell(x, y, z, 0.16, 0.42, -0.5, 0.56, 0.47, 0.44), 0.22);
    d = smin(d, ell(x, y, z, -0.12, 0.74, 0.86, 0.24, 0.22, 0.12), 0.18);
    d = smin(d, ell(x, y, z, -0.12, 0.74, -0.9, 0.24, 0.22, 0.12), 0.18);
    d = smax(d, -cone(x, y, z, -0.98, 0.1, 0, 0.05, 0.2, 0, 0.2, 0.15), 0.1);
    d = smax(d, -cone(x, y, z, 0.98, 0.3, 0, 0.94, 1.25, 0, 0.15, 0.15), 0.08);
    return d;
  };
  const femurCol = (x, y, z, nx, ny, nz) => mix(BONE, CART, ss(0.62, 0.36, y) * (1 - ss(0.5, 0.85, Math.abs(nz))) * 0.85);

  // Tibia proximal (marco propio, de pie): platillos, metáfisis, tuberosidad y diáfisis
  const tibiaF = (x, y, z) => {
    let d = ell(x, y, z, -0.1, -0.3, 0.46, 0.62, 0.32, 0.52);
    d = smin(d, ell(x, y, z, -0.1, -0.3, -0.48, 0.64, 0.32, 0.54), 0.2);
    d = smin(d, ell(x, y, z, -0.02, -0.72, 0, 0.55, 0.5, 0.75), 0.35);
    d = smin(d, cone(x, y, z, 0.02, -0.9, 0, -0.04, -2.25, 0, 0.4, 0.32), 0.3);
    d = smin(d, ell(x, y, z, 0.54, -0.88, 0.02, 0.25, 0.36, 0.36), 0.22);
    d = smin(d, cone(x, y, z, 0.38, -1.15, 0, 0.28, -2.1, 0, 0.14, 0.1), 0.2);
    d = smax(d, y + 0.1, 0.06);
    return d;
  };
  const tibiaCol = (x, y, z, nx, ny) => mix(BONE, CART, ss(-0.2, -0.11, y) * ss(0.3, 0.7, ny) * 0.85);

  const fibulaF = (x, y, z) => smin(ell(x, y, z, -0.36, -0.7, 0.62, 0.24, 0.26, 0.22), cone(x, y, z, -0.38, -0.85, 0.62, -0.42, -2.2, 0.56, 0.15, 0.1), 0.15);

  // Rótula (marco u anterior, v a lo largo, w lateral)
  const patF = (u, v, w) => {
    let d = ell(u, v, w, 0.01, 0.12, 0, 0.36, 0.55, 0.6);
    d = smin(d, ell(u, v, w, -0.03, -0.34, 0, 0.21, 0.32, 0.3), 0.3);
    d = smax(d, -(u + 0.21), 0.12);
    return d;
  };
  const patCol = (u, v) => mix(BONE, LES, ss(-0.15, -0.62, v) * 0.9);

  // Campo combinado de huesos (marco del fémur): oclusión ambiental y ajuste de la grasa de Hoffa
  const [cF, sF] = [Math.cos(FLEX), Math.sin(FLEX)];
  const [cP, sP] = [Math.cos(PAT_R), Math.sin(PAT_R)];
  const bonesF = (x, y, z) => {
    let d = femurF(x, y, z);
    const tx = x - PIV[0], ty = y - PIV[1];
    const lx = tx * cF - ty * sF + PIV[0], ly = tx * sF + ty * cF + PIV[1];
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
    return 0.3 + 0.7 * clamp(1 - 2.2 * occ, 0, 1);
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

  knee.add(new THREE.Mesh(sdfMesh(femurF, [-0.95, -0.12, -1.15], [1.05, 3.05, 1.15], 0.026, femurCol, aoAt, (x, y) => ss(2.15, 1.3, y)), boneMat(true)));

  const tibG = new THREE.Group();
  tibG.position.set(PIV[0], PIV[1], 0);
  tibG.rotation.z = -FLEX;
  const tibIn = new THREE.Group();
  tibIn.position.set(-PIV[0], -PIV[1], 0);
  tibG.add(tibIn);
  knee.add(tibG);
  tibIn.add(new THREE.Mesh(sdfMesh(tibiaF, [-0.85, -2.62, -1.1], [0.85, 0.02, 1.1], 0.026, tibiaCol, aoTib, (x, y) => ss(-1.95, -1.15, y)), boneMat(true)));
  tibIn.add(new THREE.Mesh(sdfMesh(fibulaF, [-0.68, -2.36, 0.3], [-0.08, -0.4, 0.92], 0.022, () => BONE, aoTib, (x, y) => ss(-1.8, -1.1, y)), boneMat(true)));

  const patG = new THREE.Group();
  patG.position.set(PAT_C[0], PAT_C[1], 0);
  patG.rotation.z = PAT_R;
  patG.add(new THREE.Mesh(sdfMesh(patF, [-0.4, -0.72, -0.66], [0.42, 0.72, 0.66], 0.024, patCol, aoPat), patMat));
  knee.add(patG);

  // Tendón rotuliano: del polo inferior de la rótula a la tuberosidad tibial
  const A = new THREE.Vector3(APEX[0], APEX[1], 0);
  const B = tibToFem(0.66, -0.78, 0.02);
  const dir = B.clone().sub(A).normalize();
  const ant = new THREE.Vector3(-dir.y, dir.x, 0); // perpendicular hacia anterior
  if (ant.x < 0) ant.negate();
  const tendonPts = [];
  for (let i = 0; i <= 6; i++) {
    const s = i / 6;
    tendonPts.push(A.clone().lerp(B, s).add(ant.clone().multiplyScalar(Math.sin(Math.PI * s) * 0.04)));
  }
  tendonPts.push(tibToFem(0.6, -0.98, 0.02)); // la inserción se hunde en la tuberosidad
  const tWidth = (t) => 0.98 - 0.26 * t;
  const tThick = (t) => 0.21 + 0.17 * Math.exp(-Math.pow((t - 0.15) / 0.17, 2));
  const tendon = new THREE.Mesh(
    band({
      pts: tendonPts,
      width: tWidth,
      thick: tThick,
      fibers: 80,
      segs: 54,
      fr: 0.034,
      seed: 7,
      core: 0.86,
      fray: { at: 0.2, w: 0.09, amount: 0.035 },
      color: (t, u, v, j) => mix(TEND, j > 0.5 ? LES : LES2, (1 - ss(0.16, 0.42 + 0.12 * j, t)) * (0.85 + 0.15 * j)),
    }),
    tendonMat
  );
  knee.add(tendon);

  // Tendón cuadricipital (tenue) que se continúa con el cuádriceps hacia el muslo
  const qPts = [patToFem(0.0, 0.25, 0), new THREE.Vector3(0.97, 1.12, 0), new THREE.Vector3(0.82, 1.65, 0), new THREE.Vector3(0.72, 2.1, 0), new THREE.Vector3(0.68, 2.5, 0)];
  const quad = new THREE.Mesh(
    band({
      pts: qPts,
      width: (t) => 0.92 + 0.36 * ss(0.2, 0.8, t),
      thick: (t) => 0.14 + 0.34 * ss(0.22, 0.75, t),
      fibers: 62,
      segs: 44,
      fr: 0.034,
      seed: 19,
      core: 0.85,
      endJitter: 0.2,
      taperEnd: true,
      color: (t) => mix(TEND2, MUSC, ss(0.26, 0.5, t)),
      alpha: (t) => ss(0.95, 0.6, t),
    }),
    quadMat
  );
  knee.add(quad);

  // Silueta translúcida de la pierna (piel) para reconocer la región de un vistazo
  const FEM_CUT = 2.15, TIB_CUT = -1.95;
  let skin = null;
  if (SKIN) {
    const skinF = (x, y, z) => {
      const tx = x - PIV[0], ty = y - PIV[1];
      const lx = tx * cF - ty * sF + PIV[0], ly = tx * sF + ty * cF + PIV[1];
      let d = cone(x, y, z, 0.0, 0.7, 0, -0.1, 3.0, 0, 1.12, 1.3); // muslo
      d = smin(d, ell(x, y, z, 0.32, 0.42, 0, 0.98, 0.92, 1.12), 0.5); // rodilla
      d = smin(d, cone(lx, ly, z, -0.1, -0.3, 0, -0.18, -2.6, 0, 1.02, 0.84), 0.5); // pierna
      d = smin(d, ell(lx, ly, z, -0.42, -1.3, 0, 0.74, 1.15, 0.92), 0.4); // gemelos
      d = Math.max(d, y - FEM_CUT - 0.05, -ly + TIB_CUT - 0.05); // recorte donde ya es invisible
      return d;
    };
    const skinGeo = sdfMesh(skinF, [-2.9, -2.4, -1.6], [1.7, 2.4, 1.6], 0.06);
    const sp = skinGeo.attributes.position;
    const fade = new Float32Array(sp.count);
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i);
      const tx = x - PIV[0], ty = y - PIV[1];
      const ly = tx * sF + ty * cF + PIV[1];
      fade[i] = Math.min(ss(FEM_CUT, FEM_CUT - 0.95, y), ss(TIB_CUT, TIB_CUT + 1.0, ly));
    }
    skinGeo.setAttribute('fade', new THREE.BufferAttribute(fade, 1));
    const skinMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide, // sólo la cara posterior: el contorno se ve, pero no vela al tendón
      uniforms: { uColor: { value: new THREE.Color('#86a9ea') } },
      vertexShader: `attribute float fade; varying float vFade; varying vec3 vN; varying vec3 vV;
        void main(){ vFade = fade; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vFade; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.4); gl_FragColor = vec4(uColor, (0.03 + 0.8 * f) * vFade); }`,
    });
    skinMat.uniforms.uColor.value.convertLinearToSRGB();
    skin = new THREE.Mesh(skinGeo, skinMat);
    skin.renderOrder = 10;
    knee.add(skin);
  }

  // Orientación: paciente en decúbito con la rodilla en leve flexión (cara anterior hacia arriba)
  root.rotation.z = Math.PI / 2 + FLEX / 2;
  root.updateMatrixWorld(true);

  // Caja de lo visible (sin la parte desvanecida de la piel)
  const box = new THREE.Box3();
  knee.children.forEach((c) => c !== skin && box.expandByObject(c));
  if (skin) {
    const sp = skin.geometry.attributes.position, fd = skin.geometry.attributes.fade;
    const v = new THREE.Vector3();
    for (let i = 0; i < sp.count; i++) if (fd.getX(i) > 0.35) box.expandByPoint(v.fromBufferAttribute(sp, i).applyMatrix4(skin.matrixWorld));
  }
  const center = box.getCenter(new THREE.Vector3());
  const camDir = new THREE.Vector3(0.2, 0.48, 1).normalize();

  // Brillo de la lesión
  const lesionW = A.clone().lerp(B, 0.08).applyMatrix4(knee.matrixWorld);
  const glowG = new THREE.Group();
  const h1 = halo('#ff9a6b', 1.6, 0.7);
  h1.position.copy(lesionW).add(camDir.clone().multiplyScalar(0.7));
  const h2 = halo('#ffb48f', 0.6, 0.85);
  h2.position.copy(lesionW).add(camDir.clone().multiplyScalar(0.75));
  glowG.add(h1, h2);

  // Sombra de contacto propia (la caja automática incluiría la piel invisible)
  const w = box.max.x - box.min.x;
  const sh = halo('#0a1530', 1, 0.2);
  sh.scale.set(w * 0.85, w * 0.1, 1);
  sh.position.set(center.x, box.min.y - 0.25, 0);

  const out = new THREE.Group();
  out.add(root, glowG, sh);
  const cam = center.clone().add(camDir.clone().multiplyScalar(7));
  return { root: out, cam: cam.toArray(), look: center.toArray(), zoom: 1.22, shadow: false };
}
