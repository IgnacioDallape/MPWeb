// Dolor crónico musculoesquelético / sensibilización.
// Segmento de columna lumbar visto desde atrás, en tres cuartos y algo desde arriba: tres vértebras (cuerpo con
// cintura, pedículos, láminas, apófisis transversas, articulares y espinosa) con discos azulados de anillo fibroso
// laminado entre ellas y una leve lordosis. En el conducto asoma el saco dural (amarillo); de cada agujero de
// conjunción sale una raíz con su ganglio y se abre en abanico hacia una red nerviosa periférica (con ramos
// comunicantes entre raíces vecinas) que termina en nodos luminosos.
// Sensibilización: pulsos cálidos que recorren los nervios; la raíz media del lado cercano y su red en acento cálido.
export default function build(L) {
  const { THREE, M, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // ------------------------------------------------------------ SDF
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz;
    const k0 = Math.sqrt(a * a + b * b + c * c);
    const k1 = Math.sqrt((a * a) / (rx * rx) + (b * b) / (ry * ry) + (c * c) / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  const ell2 = (x, z, cx, cz, a, b) => {
    const p = (x - cx) / a, q = (z - cz) / b;
    const k0 = Math.hypot(p, q), k1 = Math.hypot(p / a, q / b);
    return k1 < 1e-9 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1;
  };
  // Extrusión redondeada de una forma 2D (d2) a lo largo de un eje (y) con semialtura h
  const ext = (d2, y, h, r) => {
    const wx = d2 + r, wy = Math.abs(y) - h + r;
    return Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - r;
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
  const seg2 = (x, z, ax, az, bx, bz) => {
    const bax = bx - ax, baz = bz - az;
    const t = clamp(((x - ax) * bax + (z - az) * baz) / (bax * bax + baz * baz), 0, 1);
    return [Math.hypot(x - ax - bax * t, z - az - baz * t), t];
  };

  // Surface nets: malla suave a partir de una SDF, con oclusión ambiental por vértice (color)
  function polygonize(sdf, bmin, bmax, h, shade) {
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
    const col = new Float32Array(pos.length);
    const e = h * 0.5;
    const c = new THREE.Color();
    for (let p = 0; p < pos.length; p += 3) {
      const x = pos[p], y = pos[p + 1], z = pos[p + 2];
      const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
      const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
      const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
      const l = Math.hypot(gx, gy, gz) || 1;
      const ux = gx / l, uy = gy / l, uz = gz / l;
      nrm[p] = ux;
      nrm[p + 1] = uy;
      nrm[p + 2] = uz;
      let ao = 0;
      for (const [d, w] of [[0.05, 0.3], [0.12, 0.35], [0.24, 0.35]]) ao += w * clamp(sdf(x + ux * d, y + uy * d, z + uz * d) / d, 0, 1);
      shade(x, y, z, ao, c);
      col[p] = c.r;
      col[p + 1] = c.g;
      col[p + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }

  // ------------------------------------------------------------ Vértebra lumbar (local: y arriba, z anterior, x lateral)
  const BZ = 0.4; // centro anteroposterior del cuerpo
  const kidney = (x, z, s) => {
    const px = x / s, pz = BZ + (z - BZ) / s;
    let d2 = ell2(px, pz, 0, BZ, 0.8, 0.56);
    d2 = smax(d2, -ell2(px, pz, 0, -0.6, 0.62, 0.5), 0.12); // borde posterior cóncavo
    return d2 * s;
  };
  const bodyD = (x, y, z) => {
    const yy = clamp(y / 0.36, -1, 1);
    // cintura marcada y leve reborde en las placas terminales
    const s = 1 - 0.1 * (1 - yy * yy) + 0.012 * Math.exp(-(((Math.abs(yy) - 0.86) / 0.1) ** 2));
    return ext(kidney(x, z, s), y, 0.36, 0.07);
  };
  const archD = (x, y, z) => {
    const ax = Math.abs(x);
    // Pedículos robustos (aplanados lateralmente)
    let d = cone(0.38 + (ax - 0.38) * 1.35, y, z, 0.38, 0.1, 0.0, 0.41, 0.07, -0.46, 0.18, 0.165);
    // Láminas: placas altas del pedículo a la línea media, inclinadas hacia abajo
    {
      const [dl, t] = seg2(ax, z, 0.41, -0.5, 0, -0.8);
      d = smin(d, ext(dl - 0.075, y - (-0.1 - 0.1 * t), 0.41, 0.06), 0.1);
    }
    // Apófisis espinosa en "hacha"
    {
      const tz = clamp((-0.72 - z) / 0.58, 0, 1);
      d = smin(d, ext(cone(0, y, z, 0, -0.02, -0.72, 0, -0.14, -1.28, 0.18, 0.22), x, 0.065 + 0.04 * tz * tz, 0.055), 0.12);
    }
    // Apófisis transversas: barras largas y aplanadas en sentido anteroposterior, levemente hacia atrás y arriba
    {
      const tx = clamp((ax - 0.36) / 0.86, 0, 1);
      const zc = -0.44 - 0.12 * tx;
      d = smin(d, cone(ax, y, zc + (z - zc) * 1.75, 0.36, 0.1, -0.44, 1.22, 0.2, -0.56, 0.13, 0.085), 0.14);
    }
    // Articulares superiores con apófisis mamilar, articulares inferiores
    d = smin(d, cone(ax, y, z, 0.42, 0.1, -0.46, 0.5, 0.56, -0.56, 0.13, 0.1), 0.12);
    d = smin(d, ell(ax, y, z, 0.55, 0.3, -0.64, 0.06, 0.08, 0.06), 0.08);
    d = smin(d, cone(ax, y, z, 0.22, -0.04, -0.76, 0.28, -0.46, -0.7, 0.1, 0.085), 0.12);
    return d;
  };
  const ASY = 1.12; // el arco escala en altura con el cuerpo
  const vertD = (x, y, z) => smin(bodyD(x, y, z), archD(x, y / ASY, z), 0.1);

  // Disco: misma silueta, abombado, con láminas del anillo fibroso
  const DH = 0.15;
  const discD = (x, y, z) => {
    const yy = clamp(y / DH, -1, 1);
    const k = kidney(x, z, 1.02 + 0.05 * (1 - yy * yy));
    return ext(k, y, DH, 0.05) + 0.004 * Math.sin(y * 125) * sstep(-0.12, -0.02, -k);
  };

  const BONE = new THREE.Color('#eadcc3'), BONE_D = new THREE.Color('#94805f');
  const DISC = new THREE.Color('#adc6f2'), DISC_D = new THREE.Color('#6683c0');
  const vertGeo = polygonize(vertD, [-1.45, -0.8, -1.6], [1.45, 0.84, 1.02], 0.026, (x, y, z, ao, c) => c.copy(BONE_D).lerp(BONE, Math.pow(ao, 0.9)));
  const discGeo = polygonize(discD, [-0.92, -DH - 0.04, -0.3], [0.92, DH + 0.04, 1.08], 0.024, (x, y, z, ao, c) => {
    // más claro en el centro del borde, más profundo cerca de las placas
    const t = 1 - Math.abs(y) / DH;
    c.copy(DISC_D).lerp(DISC, clamp(0.35 + 0.65 * Math.pow(ao, 0.8) * (0.7 + 0.3 * t), 0, 1));
  });

  const boneMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.24, sheen: 0.3, sheenColor: new THREE.Color('#fff2e2') });
  const discMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.8, sheenColor: new THREE.Color('#dce8ff'), emissive: new THREE.Color('#2d4f9a'), emissiveIntensity: 0.08 });

  // ------------------------------------------------------------ Montaje de la columna (leve lordosis)
  const root = new THREE.Group();
  const LV = [
    { y: 1.0, th: -0.06, z: -0.035, s: 0.97 },
    { y: 0.0, th: 0.0, z: 0.0, s: 1.0 },
    { y: -1.0, th: 0.06, z: -0.035, s: 1.03 },
  ];
  const MAT = LV.map((l) => new THREE.Matrix4().compose(V(0, l.y, l.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(l.th, 0, 0)), V(l.s, l.s, l.s)));
  const W = (i, x, y, z) => V(x, y, z).applyMatrix4(MAT[i]);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(vertGeo, boneMat);
    m.matrixAutoUpdate = false;
    m.matrix.copy(MAT[i]);
    root.add(m);
  }
  const discAt = (y, th, z, s, sy = 1) => {
    const m = new THREE.Mesh(discGeo, discMat);
    m.position.set(0, y, z);
    m.rotation.x = th;
    m.scale.set(s, s * sy, s);
    root.add(m);
  };
  for (let i = 0; i < 2; i++) discAt((LV[i].y + LV[i + 1].y) / 2, (LV[i].th + LV[i + 1].th) / 2, (LV[i].z + LV[i + 1].z) / 2 + 0.01, (LV[i].s + LV[i + 1].s) / 2);
  // Discos de los extremos (segmento)
  discAt(LV[0].y + 0.5, LV[0].th - 0.03, LV[0].z - 0.025, LV[0].s * 0.99);
  discAt(LV[2].y - 0.5, LV[2].th + 0.03, LV[2].z - 0.025, LV[2].s * 1.01);

  // ------------------------------------------------------------ Tubos (nervios) con color, calor y alfa por anillo
  const CALM = new THREE.Color('#f3bf55'), HOT = new THREE.Color('#f2753c');
  function tube(curve, segs, radial, radF, heatF, alphaF = () => 1, tintF = null) {
    const frames = curve.computeFrenetFrames(segs, false);
    const n = (segs + 1) * (radial + 1);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), ht = new Float32Array(n), al = new Float32Array(n);
    const c = new THREE.Color();
    let p = 0;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const P = curve.getPointAt(u);
      const Nn = frames.normals[i], Bn = frames.binormals[i];
      const r = radF(u);
      const h = heatF(u);
      c.copy(CALM).lerp(HOT, clamp(tintF ? tintF(u) : h, 0, 1));
      const a = alphaF(u);
      for (let j = 0; j <= radial; j++) {
        const an = (j / radial) * Math.PI * 2;
        const sn = Math.sin(an), cs = -Math.cos(an);
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
        al[p] = a;
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
    g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
    g.setIndex(idx);
    return g;
  }
  const nerveMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.14, emissive: new THREE.Color('#ffae42'), emissiveIntensity: 0.16, transparent: true });
  nerveMat.onBeforeCompile = (sh) => {
    sh.uniforms.uWarm = { value: new THREE.Color('#ff8a3d').multiplyScalar(0.3) };
    sh.vertexShader = 'attribute float aHeat;\nattribute float aAlpha;\nvarying float vHeat;\nvarying float vAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHeat = aHeat; vAlpha = aAlpha;');
    sh.fragmentShader =
      'uniform vec3 uWarm;\nvarying float vHeat;\nvarying float vAlpha;\n' +
      sh.fragmentShader
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWarm * vHeat;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= vAlpha;');
  };
  const nerves = [];

  // Saco dural por el conducto vertebral (extremos desvanecidos)
  {
    const pts = [V(0, 1.66, -0.48), W(0, 0, 0.75, -0.45)];
    for (let i = 0; i < 3; i++) for (const y of [0.45, 0, -0.45]) pts.push(W(i, 0, y, -0.43));
    pts.push(W(2, 0, -0.85, -0.45));
    const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    nerves.push(tube(cv, 90, 20, () => 0.15, () => 0.05, (u) => sstep(0.0, 0.07, u) * (1 - sstep(0.93, 1.0, u))));
  }

  // ------------------------------------------------------------ Raíces y red periférica
  reseed(202);
  const nodes = []; // { p, size, heat, rid, lvl, s, tip }
  const pulses = []; // { p, heat }
  const SEGL = 44; // segmentos por unidad de largo
  const hotOf = (s, i) => (s > 0 ? [0.42, 1.0, 0.48][i] : [0.12, 0.2, 0.14][i]);
  const AZ = Math.PI - 0.5, EL = 0.3;
  const NROT = (AZ > Math.PI / 2 ? AZ - Math.PI : AZ) * 0.75;
  const AX = V(0, 0, 1).applyAxisAngle(V(0, 1, 0), NROT); // normal del plano de la red (mira a la cámara)

  // Nervio curvo de `start` en dirección `dir`; con pulsos (bandas emisivas) y ramificación recursiva
  function grow(start, dir, len, r, heat, depth, meta) {
    const bend = (rnd() - 0.5) * 0.7;
    const d1 = dir.clone().applyAxisAngle(AX, bend * 0.5);
    const d2 = dir.clone().applyAxisAngle(AX, bend).addScaledVector(AX, (rnd() - 0.5) * 0.3).normalize();
    const perp = AX.clone().cross(dir).normalize();
    const w = (rnd() - 0.5) * 0.22;
    const p1 = start.clone().addScaledVector(dir, len * 0.34).addScaledVector(perp, w * len);
    const p2 = p1.clone().addScaledVector(d1, len * 0.33).addScaledVector(perp, -w * 0.4 * len);
    const p3 = p2.clone().addScaledVector(d2, len * 0.33);
    const cv = new THREE.CatmullRomCurve3([start, p1, p2, p3], false, 'centripetal');
    const pk = [];
    if (rnd() < 0.16 + heat * 0.3) pk.push(0.35 + rnd() * 0.4);
    const sig = 0.055 / len;
    const heatF = (u) => {
      let h = heat * (0.65 + 0.35 * u);
      for (const c of pk) h += 0.6 * Math.exp(-(((u - c) / sig) ** 2));
      return h;
    };
    nerves.push(tube(cv, Math.max(12, Math.round(len * SEGL)), 10, (u) => r * (1 - 0.22 * u), heatF, () => 1, () => heat));
    for (const c of pk) pulses.push({ p: cv.getPointAt(c), t: cv.getTangentAt(c), r: r * (1 - 0.22 * c), heat });
    const tEnd = cv.getTangentAt(1);
    if (depth > 0) {
      const n = depth >= 3 && rnd() < 0.5 ? 3 : 2;
      const spread = 0.24 + 0.06 * depth;
      for (let k = 0; k < n; k++) {
        const ang = n === 2 ? (k ? 1 : -1) * (spread * (0.8 + rnd() * 0.4)) : (k - 1) * spread * 1.15 + (rnd() - 0.5) * 0.1;
        const nd = tEnd.clone().applyAxisAngle(AX, ang).addScaledVector(AX, (rnd() - 0.5) * 0.3).normalize();
        grow(p3.clone().addScaledVector(tEnd, -r * 0.5), nd, len * (0.74 + rnd() * 0.12), r * 0.78, heat, depth - 1, meta);
      }
      nodes.push({ p: p3.clone(), size: 0.75, heat, ...meta, tip: false });
    } else {
      nodes.push({ p: p3.clone(), size: 1, heat, ...meta, tip: true });
    }
  }

  const drgs = [];
  let rid = 0;
  for (let i = 0; i < 3; i++)
    for (const s of [1, -1]) {
      const heat = hotOf(s, i);
      // Desde el saco, por debajo del pedículo, sale por el agujero de conjunción por delante de la transversa
      const lp = [V(s * 0.06, 0.2, -0.44), V(s * 0.24, -0.05, -0.4), V(s * 0.46, -0.26, -0.32), V(s * 0.72, -0.4, -0.2), V(s * 0.98, -0.52, -0.12)].map((p) => p.applyMatrix4(MAT[i]));
      const a = [-0.24, 0.02, 0.28][i];
      const d0 = V(s * Math.cos(a), -Math.sin(a), 0).normalize().applyAxisAngle(V(0, 1, 0), NROT);
      const last = lp[lp.length - 1];
      lp.push(last.clone().addScaledVector(d0, 0.2), last.clone().addScaledVector(d0, 0.4));
      let tot = 0, at = 0;
      for (let k = 1; k < lp.length; k++) {
        tot += lp[k].distanceTo(lp[k - 1]);
        if (k === 3) at = tot;
      }
      const uG = at / tot;
      const cv = new THREE.CatmullRomCurve3(lp, false, 'centripetal');
      const radF = (u) => 0.066 + 0.054 * Math.exp(-(((u - uG) / 0.08) ** 2)) - 0.01 * sstep(uG, 1, u);
      const heatF = (u) => heat * sstep(0.12, uG, u) * (0.6 + 0.4 * Math.exp(-(((u - uG) / 0.12) ** 2))) + (heat > 0.9 ? 0.6 * Math.exp(-(((u - uG) / 0.07) ** 2)) : 0);
      nerves.push(tube(cv, 80, 14, radF, heatF, () => 1, (u) => heat * sstep(0.1, uG, u)));
      drgs.push({ p: cv.getPointAt(uG), heat, s, i });
      grow(cv.getPointAt(1).addScaledVector(cv.getTangentAt(1), -0.03), cv.getTangentAt(1), 0.55, 0.056, heat, 3, { rid: rid++, lvl: i, s });
    }

  // Plexo: ramos comunicantes entre ramas de raíces vecinas del mismo lado (la red)
  {
    const links = new Map();
    for (const A of nodes) {
      if (A.lvl === 2) continue;
      let best = null, bd = 1e9;
      for (const B of nodes) {
        if (B.s !== A.s || B.lvl !== A.lvl + 1) continue;
        const d = A.p.distanceTo(B.p);
        if (d > 0.16 && d < 0.46 && d < bd) (bd = d), (best = B);
      }
      if (!best) continue;
      const key = A.s + ':' + A.lvl;
      const cnt = links.get(key) || 0;
      if (cnt >= 4 || rnd() < 0.25) continue;
      links.set(key, cnt + 1);
      const mid = A.p.clone().lerp(best.p, 0.5).addScaledVector(AX.clone().cross(best.p.clone().sub(A.p)).normalize(), 0.05);
      const heat = (A.heat + best.heat) * 0.5;
      nerves.push(tube(new THREE.CatmullRomCurve3([A.p, mid, best.p]), 20, 8, () => 0.016, (u) => heat * 0.9 + 0.1 + 0.9 * Math.exp(-(((u - 0.5) / 0.12) ** 2)), () => 1, () => heat));
      { const lc = new THREE.CatmullRomCurve3([A.p, mid, best.p]); pulses.push({ p: lc.getPointAt(0.5), t: lc.getTangentAt(0.5), r: 0.016, heat }); }
    }
  }

  const nerveMesh = new THREE.Mesh(mergeGeometries(nerves), nerveMat);
  root.add(nerveMesh);

  // ------------------------------------------------------------ Cámara
  const look = [0.0, -0.45, 0.1];
  const az = AZ, el = EL, D = 7;
  const CAM = V(look[0] + Math.sin(az) * Math.cos(el) * D, look[1] + Math.sin(el) * D, look[2] + Math.cos(az) * Math.cos(el) * D);
  const toCam = CAM.clone().sub(V(...look)).normalize();

  // ------------------------------------------------------------ Nodos luminosos y pulsos
  const sph = new THREE.SphereGeometry(1, 14, 10);
  const glowCalm = M.glow('#fff1c8'), glowHot = M.glow('#ffe0c0');
  for (const n of nodes) {
    const hot = n.heat > 0.6;
    const core = new THREE.Mesh(sph, hot ? glowHot : glowCalm);
    core.position.copy(n.p);
    core.scale.setScalar((0.028 + 0.01 * n.heat) * n.size);
    root.add(core);
    const h = halo(hot ? '#ffa06a' : '#ffcf73', (0.2 + 0.1 * n.heat) * n.size, 0.42 + 0.2 * n.heat);
    h.position.copy(n.p).addScaledVector(toCam, 0.05);
    root.add(h);
  }
  const beadGeo = new THREE.CapsuleGeometry(1, 1.1, 4, 12);
  const beadCalm = M.glow("#ffe2a6"), beadHot = M.glow("#ffd0b0");
  const shellCalm = new THREE.MeshBasicMaterial({ color: "#ffad3d", transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
  const shellHot = new THREE.MeshBasicMaterial({ color: "#ff6a2e", transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  for (const pl of pulses) {
    const b = new THREE.Mesh(beadGeo, pl.heat > 0.6 ? beadHot : beadCalm);
    b.position.copy(pl.p);
    b.quaternion.setFromUnitVectors(V(0, 1, 0), pl.t);
    b.scale.setScalar(Math.max(0.016, pl.r * 1.05));
    const sh = new THREE.Mesh(beadGeo, pl.heat > 0.6 ? shellHot : shellCalm);
    sh.position.copy(pl.p);
    sh.quaternion.copy(b.quaternion);
    sh.scale.setScalar(Math.max(0.026, pl.r * 1.55));
    sh.renderOrder = 3;
    root.add(sh);
    root.add(b);
    const h = halo(pl.heat > 0.6 ? "#ff8a4c" : "#ffb347", 0.24 + 0.06 * pl.heat, 0.7 + 0.2 * pl.heat);
    h.position.copy(pl.p).addScaledVector(toCam, 0.05);
    root.add(h);
  }
  // Ganglio sensibilizado: acento cálido con ondas
  for (const d of drgs) {
    if (d.heat < 0.9) continue;
    const h = halo('#ff9a6b', 1.15, 0.75);
    h.position.copy(d.p).addScaledVector(toCam, 0.2);
    root.add(h);
    const h2 = halo('#ffd2a8', 0.5, 0.9);
    h2.position.copy(d.p).addScaledVector(toCam, 0.22);
    root.add(h2);
    const rg = new THREE.Group();
    for (let k = 0; k < 2; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24 + k * 0.14, 0.01, 10, 72), new THREE.MeshBasicMaterial({ color: '#ff9a6b', transparent: true, opacity: 0.75 - k * 0.32, toneMapped: false, depthWrite: false }));
      rg.add(ring);
    }
    rg.position.copy(d.p).addScaledVector(toCam, 0.1);
    rg.lookAt(CAM);
    root.add(rg);
  }

  return { root, cam: CAM.toArray(), look, zoom: 1.45, shadow: false };
}
