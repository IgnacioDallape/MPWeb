// Punción seca ecoguiada.
// Vientre muscular fusiforme rosado (fascículos visibles, tendones blancos que se desvanecen en los extremos),
// visto en 3/4 desde arriba. Sobre la cara superior corre una banda tensa: un cordón de fibras más oscuras,
// tirantes y algo elevadas, que en el centro forma el punto gatillo (nudo cálido de fibras engrosadas y retorcidas).
// Una aguja filiforme fina, sin cable, de mango azul marino, entra en el nódulo. La respuesta de espasmo
// local se sugiere con ondas concéntricas sobre la superficie del músculo, alargadas a lo largo de las fibras,
// y una leve ondulación de la superficie alrededor de la aguja. Sin corriente: sin chispas ni partículas.
export default function build(L) {
  const { THREE, M, rnd, reseed, mergeGeometries } = L;
  const halo = (...a) => {
    const h = L.halo(...a);
    h.material.toneMapped = false;
    return h;
  };
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const ss = THREE.MathUtils.smoothstep;
  const clamp = THREE.MathUtils.clamp;
  const C = (h) => new THREE.Color(h);
  const gauss = (d, w) => Math.exp(-((d / w) ** 2));

  // ------------------------------------------------------------ Eje y perfil del vientre muscular
  const X0 = -3.3, X1 = 3.3; // incluye los tendones
  const B0 = -2.45, B1 = 2.45; // vientre
  const XN = 0.25; // punto gatillo (a lo largo)
  const belly = (x) => {
    const u = clamp((x - B0) / (B1 - B0), 0, 1);
    return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.94)), 1.25);
  };
  const halfW = (x) => 0.15 + 1.12 * belly(x);
  const halfH = (x) => 0.1 + 0.92 * belly(x);
  const yc = (x) => 0.1 * Math.sin(x * 0.42 + 0.5);
  const zc = (x) => 0.16 * Math.sin(x * 0.36 - 0.4);
  const tw = (x) => 0.1 * Math.sin(x * 0.3 + 0.2);
  const widthDir = (x) => V(0, -Math.sin(tw(x)), Math.cos(tw(x)));
  const thickDir = (x) => V(0, Math.cos(tw(x)), Math.sin(tw(x)));
  const center = (x) => V(x, yc(x), zc(x));

  // ------------------------------------------------------------ Banda tensa, nódulo y ondulación
  const TH_B = 0.85; // ángulo de la banda: arriba, hacia la cámara
  const WB = 0.18; // semiancho angular de la banda
  const bandAlong = (x) => ss(x, B0 + 0.2, B0 + 1.05) * (1 - ss(x, B1 - 1.05, B1 - 0.2));
  const dth = (th) => Math.atan2(Math.sin(th - TH_B), Math.cos(th - TH_B));
  const bandK = (x, th) => gauss(dth(th), WB) * bandAlong(x);
  const nodK = (x, th) => gauss(x - XN, 0.36) * gauss(dth(th), WB * 1.25);
  const meanR = (x) => Math.sqrt((halfW(x) ** 2 + halfH(x) ** 2) / 2);
  // distancia (sobre la superficie, elipse alargada a lo largo de las fibras) al punto de entrada
  const RXS = 1.0, RSS = 0.62;
  const surfD = (x, th) => Math.hypot((x - XN) / RXS, (dth(th) * meanR(x)) / RSS);
  const ripple = (x, th) => {
    const d = surfD(x, th);
    return 0.018 * Math.sin(d * 11.5 - 1.2) * Math.exp(-d / 0.75) * ss(d, 0.32, 0.55);
  };
  // altura sobre la superficie base (a lo largo de la normal)
  const bump = (x, th) => 0.17 * bandK(x, th) + 0.26 * nodK(x, th) + ripple(x, th) * (1 - nodK(x, th));

  // Punto sobre la sección elíptica (ángulo th, radio relativo rr) + desplazamiento normal
  const nrmAt = (x, th) => widthDir(x).multiplyScalar(Math.cos(th) / halfW(x)).addScaledVector(thickDir(x), Math.sin(th) / halfH(x)).normalize();
  const Q = (x, th, rr, off = 0) =>
    center(x)
      .addScaledVector(widthDir(x), Math.cos(th) * halfW(x) * rr)
      .addScaledVector(thickDir(x), Math.sin(th) * halfH(x) * rr)
      .addScaledVector(nrmAt(x, th), off);
  const surf = (x, th, extra = 0) => Q(x, th, 1, bump(x, th) + extra);
  const surfNormal = (x, th) => {
    const e = 0.004;
    const a = surf(x + e, th).sub(surf(x - e, th));
    const b = surf(x, th + e).sub(surf(x, th - e));
    return new THREE.Vector3().crossVectors(a, b).normalize().multiplyScalar(-1);
  };

  // ------------------------------------------------------------ Materiales propios
  const fadeX = (mat, x0, x1, w) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aHeat;\nvarying float vHeat;\nvarying float vOX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOX = position.x; vHeat = aHeat;');
      sh.uniforms.uWarm = { value: new THREE.Color('#ff4a1c').multiplyScalar(0.3) };
      sh.fragmentShader =
        'uniform vec3 uWarm;\nvarying float vHeat;\nvarying float vOX;\n' +
        sh.fragmentShader
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWarm * vHeat;')
          .replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
          gl_FragColor.a *= smoothstep(${x0.toFixed(3)}, ${(x0 + w).toFixed(3)}, vOX) * (1.0 - smoothstep(${(x1 - w).toFixed(3)}, ${x1.toFixed(3)}, vOX));`
          );
    };
    return mat;
  };
  const depthMat = () => new THREE.MeshBasicMaterial({ colorWrite: false });

  // ------------------------------------------------------------ Colores
  const PINK = C('#d05b6d'), ROSE = C('#e27f8b'), DEEP = C('#9c3a49'), BAND = C('#86203a'), BAND2 = C('#982a45');
  const WARM = C('#f2643c'), HOT = C('#ffa070'), TEND = C('#e6edf8'), TCOOL = C('#a9bbdc');
  const tmp = new THREE.Color();

  // transición músculo → tendón (en "V": el tendón se interna más por el centro de cada cara)
  const tendonMix = (x, th, j) => {
    const c = Math.abs(Math.sin(th));
    const xl = B0 + 0.55 + 0.35 * c + j;
    const xr = B1 - 0.55 - 0.35 * c - j;
    return 1 - ss(x, xl - 0.3, xl + 0.15) * (1 - ss(x, xr - 0.15, xr + 0.3));
  };

  // ------------------------------------------------------------ Fibras
  const shell = (count, th0, th1) => {
    // ángulos a igual distancia sobre el contorno (proporción del vientre)
    const K = 600, ar = 1.02 / 1.27;
    const acc = [0];
    for (let k = 1; k <= K; k++) {
      const a0 = th0 + ((th1 - th0) * (k - 1)) / K, a1 = th0 + ((th1 - th0) * k) / K;
      acc.push(acc[k - 1] + Math.hypot(Math.cos(a1) - Math.cos(a0), ar * (Math.sin(a1) - Math.sin(a0))));
    }
    const out = [];
    for (let i = 0; i < count; i++) {
      const sv = ((i + 0.5) / count) * acc[K];
      let k = 1;
      while (acc[k] < sv) k++;
      out.push(th0 + ((th1 - th0) * (k - 0.5)) / K);
    }
    return out;
  };
  reseed(4107);
  const NT = 92, NB = 34;
  const TH = [...shell(NT, -0.35, Math.PI + 0.35), ...shell(NB, Math.PI + 0.35, 2 * Math.PI - 0.35)];
  const SAMPLES = 150, SEGS = 150, RAD = 6;
  const KT = 2.8; // giro del nudo (rad)
  const fibers = [];
  for (let i = 0; i < TH.length; i++) {
    const th0 = TH[i] + (rnd() - 0.5) * 0.012;
    const jit = rnd(), ph = rnd() * 10, tone = rnd();
    const tj = (rnd() - 0.5) * 0.25;
    const isBand = gauss(dth(th0), WB) > 0.35;
    const pts = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const x = X0 + ((X1 - X0) * k) / SAMPLES;
      // las fibras de la banda tensa son más rectas (tirantes); el resto ondula muy levemente
      const wob = (isBand ? 0.002 : 0.007) * Math.sin(x * 3.1 + ph);
      let th = th0 + wob * (0.4 + jit);
      let off = bump(x, th);
      // nudo: la sección de la banda gira sobre sí misma en el punto gatillo (fibras retorcidas, apretadas)
      const wK = gauss(dth(th0), WB * 1.5);
      const phi = KT * gauss(x - XN, 0.3) * wK;
      if (phi > 1e-3) {
        const mr = meanR(x);
        const sl = dth(th) * mr, hk = 0.1 * gauss(x - XN, 0.36);
        const hl = off - hk;
        const s2 = sl * Math.cos(phi) - hl * Math.sin(phi);
        const h2 = sl * Math.sin(phi) + hl * Math.cos(phi);
        th = TH_B + s2 / mr;
        off = Math.max(h2 + hk, bump(x, th) * 0.6);
      }
      pts.push(Q(x, th, 0.97, off));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const fr0 = (isBand ? 0.056 : 0.046) * (0.85 + jit * 0.3);
    const geo = new THREE.TubeGeometry(curve, SEGS, fr0, RAD, false);
    // radio, color y calor por anillo
    const pos = geo.attributes.position;
    const n = pos.count;
    const col = new Float32Array(n * 3), heat = new Float32Array(n);
    const c = new THREE.Vector3(), p = new THREE.Vector3();
    for (let s = 0; s <= SEGS; s++) {
      curve.getPointAt(s / SEGS, c);
      const x = c.x;
      const b = belly(x);
      const bk = bandK(x, th0), nk = nodK(x, th0);
      let r = 0.42 + 0.58 * Math.pow(b, 0.6);
      r *= 1 + 0.3 * bk + 1.1 * nk;
      const tm = tendonMix(x, th0, tj * 0.4);
      tmp.copy(PINK).lerp(ROSE, 0.15 + 0.55 * tone * tone);
      tmp.lerp(DEEP, 0.55 * ss(-Math.sin(th0), -0.2, 0.8));
      tmp.lerp(tone > 0.5 ? BAND : BAND2, Math.min(1, bk * 1.1) * 0.92);
      tmp.lerp(WARM, Math.min(1, nk * 1.45));
      tmp.lerp(HOT, Math.min(1, nk * 1.2) * 0.06);
      tmp.lerp(C('#ffffff').copy(TEND).lerp(TCOOL, 0.45 * ss(-Math.sin(th0), -0.3, 0.9)), tm);
      const h = Math.min(1, nk * 1.05) * (1 - tm);
      for (let j = 0; j <= RAD; j++) {
        const q = s * (RAD + 1) + j;
        p.fromBufferAttribute(pos, q).sub(c).multiplyScalar(r).add(c);
        pos.setXYZ(q, p.x, p.y, p.z);
        col[q * 3] = tmp.r;
        col[q * 3 + 1] = tmp.g;
        col[q * 3 + 2] = tmp.b;
        heat[q] = h;
      }
    }
    // normales algo "dobladas" hacia afuera del vientre: aspecto satinado continuo
    {
      const nor = geo.attributes.normal;
      const nn = new THREE.Vector3();
      for (let q = 0; q < n; q++) {
        p.fromBufferAttribute(pos, q);
        const o = nrmAt(p.x, th0);
        nn.fromBufferAttribute(nor, q).addScaledVector(o, 0.18).normalize();
        nor.setXYZ(q, nn.x, nn.y, nn.z);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1));
    fibers.push(geo);
  }
  const fiberGeo = mergeGeometries(fibers);

  // Núcleo (relleno bajo las fibras)
  const coreGeo = (() => {
    const SX = 180, SA = 72;
    const pos = [], col = [], heat = [], idx = [];
    for (let i = 0; i <= SX; i++) {
      const x = X0 + ((X1 - X0) * i) / SX;
      for (let j = 0; j < SA; j++) {
        const th = (j / SA) * Math.PI * 2;
        const p = Q(x, th, 0.93, bump(x, th) * 0.95);
        pos.push(p.x, p.y, p.z);
        const nk = nodK(x, th), bk = bandK(x, th);
        const tm = tendonMix(x, th, 0.05);
        tmp.copy(DEEP).lerp(BAND, bk * 0.7).lerp(WARM, Math.min(1, nk * 1.3)).lerp(TCOOL, tm);
        col.push(tmp.r, tmp.g, tmp.b);
        heat.push(Math.min(1, nk) * (1 - tm));
      }
    }
    for (let i = 0; i < SX; i++)
      for (let j = 0; j < SA; j++) {
        const a = i * SA + j, b = i * SA + ((j + 1) % SA), c = (i + 1) * SA + j, d = (i + 1) * SA + ((j + 1) % SA);
        idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aHeat', new THREE.Float32BufferAttribute(heat, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  })();

  const root = new THREE.Group();
  const FADE = [X0 + 0.05, X1 - 0.05, 0.95];
  root.add(new THREE.Mesh(fiberGeo, depthMat()));
  root.add(new THREE.Mesh(coreGeo, depthMat()));
  const coreMat = fadeX(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.5, clearcoat: 0.4 }), ...FADE);
  coreMat.depthFunc = THREE.EqualDepth;
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.renderOrder = 1;
  root.add(core);
  const fibMat = fadeX(
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.46, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.15, sheenColor: C('#ffd0d0'), sheenRoughness: 0.45 }),
    ...FADE
  );
  fibMat.depthFunc = THREE.EqualDepth;
  const fibMesh = new THREE.Mesh(fiberGeo, fibMat);
  fibMesh.renderOrder = 2;
  root.add(fibMesh);

  // ------------------------------------------------------------ Punto de entrada y aguja
  const NE = surfNormal(XN, TH_B);
  const A = V(0.5, 0.86, -0.18).normalize(); // de la punta hacia el mango
  // Entrada: donde el eje de la aguja toca de verdad las fibras del nudo (rayo contra la malla)
  const E = (() => {
    const guess = surf(XN, TH_B);
    const rc = new THREE.Raycaster(guess.clone().addScaledVector(A, 3), A.clone().negate());
    const hit = rc.intersectObject(fibMesh, false)[0];
    return hit ? hit.point.clone() : guess;
  })();
  const DEPTH = 0.32;
  const T = E.clone().addScaledVector(A, -DEPTH); // punta, dentro del nódulo

  const nd = new THREE.Group();
  {
    const metal = M.metal();
    const navy = M.navy();
    const R0 = 0.019;
    const SH = 2.25;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, SH, 16), metal);
    shaft.position.y = SH / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(R0, 0.07, 16), metal);
    tip.rotation.x = Math.PI;
    tip.position.y = -0.035;
    // Mango plástico estriado con virola metálica
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.08, 28), metal);
    collar.position.y = SH + 0.04;
    const HL = 0.78, H0 = SH + 0.08;
    const prof = [];
    for (let k = 0; k <= 60; k++) {
      const s = k / 60;
      let r = 0.05 + 0.006 * Math.sin(s * Math.PI);
      if (s > 0.08 && s < 0.7) r += 0.006 * Math.pow(Math.max(0, Math.cos(s * 2 * Math.PI * 9)), 3); // estrías
      if (s > 0.9) r *= Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.9) / 0.1, 2))) * 0.92 + 0.08 * (1 - (s - 0.9) / 0.1);
      prof.push(new THREE.Vector2(r, s * HL));
    }
    prof.unshift(new THREE.Vector2(0, 0));
    prof.push(new THREE.Vector2(0, HL));
    const handle = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), navy);
    handle.position.y = H0;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.007, 10, 48), M.glow('#a9c7ff'));
    band.rotation.x = Math.PI / 2;
    band.position.y = H0 + HL * 0.78;
    nd.add(shaft, tip, collar, handle, band);
  }
  nd.quaternion.setFromUnitVectors(V(0, 1, 0), A);
  nd.position.copy(T);
  root.add(nd);

  // Halo cálido del punto gatillo
  const hW = halo('#ff8a5a', 1.4, 0.22);
  hW.position.copy(E).addScaledVector(NE, 0.08);
  hW.material.depthTest = false;
  hW.renderOrder = 4;
  root.add(hW);

  // ------------------------------------------------------------ Ondas de espasmo local (anillos sobre la superficie)
  const ringTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    const radii = [0.3, 0.47, 0.64, 0.81, 0.96];
    radii.forEach((r, i) => {
      const a = Math.pow(1 - i / (radii.length + 0.4), 1.2);
      const R = r * 512;
      for (const [w, al] of [[30, 0.07], [16, 0.15], [8, 0.3]]) {
        g.strokeStyle = `rgba(255,255,255,${(al * a).toFixed(3)})`;
        g.lineWidth = w;
        g.beginPath();
        g.arc(512, 512, R, 0, Math.PI * 2);
        g.stroke();
      }
      g.strokeStyle = `rgba(255,255,255,${(0.95 * a).toFixed(3)})`;
      g.lineWidth = 5.5;
      g.beginPath();
      g.arc(512, 512, R, 0, Math.PI * 2);
      g.stroke();
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  })();
  {
    const RX = 1.55 * RXS, RS = 1.55 * RSS;
    const SX = 140, SA = 90;
    const pos = [], uv = [], idx = [];
    const th0 = TH_B - 1.5, th1 = TH_B + 1.5;
    for (let i = 0; i <= SX; i++) {
      const x = XN - RX + (2 * RX * i) / SX;
      for (let j = 0; j <= SA; j++) {
        const th = th0 + ((th1 - th0) * j) / SA;
        const p = surf(x, th, 0.07);
        pos.push(p.x, p.y, p.z);
        uv.push(0.5 + (x - XN) / (2 * RX), 0.5 + (dth(th) * meanR(x)) / (2 * RS));
      }
    }
    for (let i = 0; i < SX; i++)
      for (let j = 0; j < SA; j++) {
        const a = i * (SA + 1) + j, b = a + 1, c = a + SA + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const rip = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({ map: ringTex, color: '#f4f8ff', transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
    );
    rip.renderOrder = 6;
    root.add(rip);
  }

  // Orificio de entrada: pequeño hundimiento con borde más oscuro alrededor de la aguja
  {
    const sh = A.clone().sub(NE.clone().multiplyScalar(A.dot(NE))).normalize();
    const hole = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.014, 12, 40),
      new THREE.MeshPhysicalMaterial({ color: '#b8402f', roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 })
    );
    hole.quaternion.setFromUnitVectors(V(0, 0, 1), NE);
    hole.scale.set(1, 1, 0.6);
    hole.position.copy(E).addScaledVector(NE, -0.004).addScaledVector(sh, 0.012);
    root.add(hole);
  }

  const LOOK = V(0.15, 0.45, 0);
  const CAM = V(2.4, 5.6, 6.4);
  return { root, cam: CAM.toArray(), look: LOOK.toArray(), zoom: 1.35 };
}
