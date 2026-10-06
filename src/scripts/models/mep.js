// MEP — Microelectrólisis Percutánea.
// Vista 3/4 desde arriba a la derecha de un tendón fino y aplanado (fibras paralelas con su ondulación o
// "crimp", leve torsión) que nace de un vientre muscular rosado en el extremo lejano y se desvanece hacia
// el frente. Una aguja muy fina, de mango espiralado, entra desde arriba a la derecha hasta una zona apenas
// engrosada con tinte cálido (lesión sutil). En la punta: brillo azul suave, nube de micro‑partículas y
// ondas concéntricas finas que se propagan sobre la superficie del tendón (más alargadas a lo largo de
// las fibras), sugiriendo la microcorriente.
export default function build(L) {
  const { THREE, M, rnd, reseed, mergeGeometries } = L;
  // Halos sin tone mapping: así los tonos claros no se agrisan sobre fondo claro
  const halo = (...a) => {
    const h = L.halo(...a);
    h.material.toneMapped = false;
    return h;
  };
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const smooth = THREE.MathUtils.smoothstep;
  const clamp = THREE.MathUtils.clamp;

  // ------------------------------------------------------------ Materiales propios
  const fadeX = (mat, x0, x1, w0, w1 = w0) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying float vOX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOX = position.x;');
      sh.fragmentShader =
        'varying float vOX;\n' +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          gl_FragColor.a *= smoothstep(${x0.toFixed(3)}, ${(x0 + w0).toFixed(3)}, vOX) * (1.0 - smoothstep(${(x1 - w1).toFixed(3)}, ${x1.toFixed(3)}, vOX));`
        );
    };
    return mat;
  };
  // Pre‑pasada de profundidad + pasada de color con EqualDepth: la transparencia de los extremos muestra solo la capa más cercana, sin artefactos en los surcos
  const depthMat = () => new THREE.MeshBasicMaterial({ colorWrite: false });
  const glowMat = (color, opacity = 1, onTop = false) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: !onTop, toneMapped: false });
  const loft = (SX, SA, xa, xb, ring) => {
    const pos = [], idx = [];
    for (let i = 0; i <= SX; i++) {
      const x = xa + ((xb - xa) * i) / SX;
      for (let j = 0; j < SA; j++) {
        const p = ring(x, (j / SA) * Math.PI * 2);
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let i = 0; i < SX; i++)
      for (let j = 0; j < SA; j++) {
        const a = i * SA + j, b = i * SA + ((j + 1) % SA), c = (i + 1) * SA + j, d = (i + 1) * SA + ((j + 1) % SA);
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const root = new THREE.Group();

  // ------------------------------------------------------------ Tendón fino que nace de un vientre muscular
  const X0 = -3.6, X1 = 2.5;
  const LEN = X1 - X0;
  const XL = 0.3; // centro de la zona tratada
  const XJ = -0.95; // unión músculo‑tendón
  const gl = (x) => Math.exp(-Math.pow((x - XL) / 0.72, 2));
  const mb = (x) => 1 - smooth(x, XJ - 1.7, XJ + 0.1); // 1 en el vientre muscular, 0 en el tendón
  const halfW = (x) => 0.6 * (0.94 + 0.12 * Math.pow(Math.max(0, x) / X1, 2)) + 0.34 * mb(x);
  const halfH = (x) => 0.19 * (1 + 0.3 * gl(x)) + 0.33 * mb(x);
  const yc = (x) => 0.1 * Math.sin(x * 0.5 + 0.35) + 0.12 * mb(x);
  const zc = (x) => 0.12 * Math.sin(x * 0.42 - 0.5);
  const tw = (x) => 0.14 * Math.sin(x * 0.38 + 0.15);
  const widthDir = (x) => V(0, -Math.sin(tw(x)), Math.cos(tw(x)));
  const thickDir = (x) => V(0, Math.cos(tw(x)), Math.sin(tw(x)));
  const center = (x) => V(x, yc(x), zc(x));
  // Punto del haz (sección elíptica): u ∈ [-1,1] a lo ancho; v = 1 es la cara superior, v = 0 el eje
  const P = (x, u, v, out = new THREE.Vector3()) => {
    const t = tw(x);
    const w = halfW(x) * u;
    const h = halfH(x) * v * Math.sqrt(Math.max(0.0, 1 - u * u));
    return out.set(x, yc(x) - w * Math.sin(t) + h * Math.cos(t), zc(x) + w * Math.cos(t) + h * Math.sin(t));
  };
  // Punto sobre el contorno elíptico por ángulo (th) y radio relativo (rr)
  const Q = (x, th, rr) => center(x).addScaledVector(widthDir(x), Math.cos(th) * halfW(x) * rr).addScaledVector(thickDir(x), Math.sin(th) * halfH(x) * rr);
  // Ángulos repartidos a igual distancia sobre el contorno (proporción del tendón)
  const shell = (count, th0, th1) => {
    const K = 400, ar = 0.19 / 0.6;
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
  const normalAt = (x, u) => {
    const e = 0.01;
    const a = P(x + e, u, 1).sub(P(x - e, u, 1));
    const b = P(x, u + e, 1).sub(P(x, u - e, 1));
    const n = new THREE.Vector3().crossVectors(a, b).normalize();
    return n.y < 0 ? n.negate() : n;
  };
  // Escala el radio de un tubo anillo por anillo (fibras musculares más gruesas)
  const scaleTube = (geo, curve, segs, rad, f) => {
    const pos = geo.attributes.position;
    const c = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      curve.getPointAt(i / segs, c);
      const s = f(c.x);
      for (let j = 0; j <= rad; j++) {
        const k = i * (rad + 1) + j;
        p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(s).add(c);
        pos.setXYZ(k, p.x, p.y, p.z);
      }
    }
  };

  const white = new THREE.Color('#e2e9f6');
  const cool = new THREE.Color('#8ea4cf');
  const blush = new THREE.Color('#ffd2bd');
  const warm = new THREE.Color('#ff9466');
  const pink = new THREE.Color('#e4767d');
  const pinkDeep = new THREE.Color('#b8525d');
  const tmp = new THREE.Color();

  reseed(2207);
  const fibers = [];
  const NT = 68, NB = 32, N = NT + NB, SAMPLES = 110, SEGS = 124, RAD = 6;
  // fibras sobre el contorno: mitad superior (visible) más densa, mitad inferior más rala
  const TH = [...shell(NT, -0.18, Math.PI + 0.18), ...shell(NB, Math.PI + 0.18, 2 * Math.PI - 0.18)];
  for (let i = 0; i < N; i++) {
    const isTop = i < NT;
    const th0 = TH[i] + (rnd() - 0.5) * 0.015;
    const rr0 = 0.9 + rnd() * 0.06;
    const u0 = Math.cos(th0);
    const v0 = Math.sin(th0);
    const jit = rnd();
    const ph = rnd() * 0.7;
    // donde la fibra pasa de tendón (blanco) a músculo (rosado): el tendón se interna en "V" por el centro
    const xs = XJ - 0.1 - 0.5 * (1 - Math.pow(Math.abs(u0), 1.4)) + (rnd() - 0.5) * 0.18;
    const dis = smooth(v0, 0.35, 0.85);
    const pts = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const x = X0 + (k / SAMPLES) * LEN;
      const g = gl(x);
      // (desorden solo en la cara superior: los bordes y la cara inferior se mantienen prolijos)
      const dth = 0.04 * g * dis * Math.sin(x * 6.5 * (0.7 + jit) + ph * 9) * (0.4 + jit);
      const dr = 0.1 * g * dis * Math.cos(x * 8 * (0.6 + jit) + ph * 7) * (0.3 + jit);
      const p = Q(x, th0 + dth, rr0 + dr);
      const crimp = 0.016 * Math.sin(x * 8.5 + u0 * 2.0 + ph) * (1 - 0.5 * g) * (1 - mb(x));
      p.addScaledVector(thickDir(x), crimp);
      pts.push(p);
    }
    const fr = (isTop ? 0.03 : 0.027) * (0.85 + jit * 0.3);
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, SEGS, fr, RAD, false);
    scaleTube(geo, curve, SEGS, RAD, (x) => 1 + 0.4 * mb(x));
    // Normales "dobladas" hacia afuera del haz: surcos más suaves, aspecto satinado continuo
    {
      const pos = geo.attributes.position, nor = geo.attributes.normal;
      const p = new THREE.Vector3(), nn = new THREE.Vector3(), o = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        p.fromBufferAttribute(pos, k);
        const x = p.x;
        o.copy(p).sub(center(x));
        const a = o.dot(widthDir(x)) / halfW(x), b = o.dot(thickDir(x)) / Math.max(0.05, halfH(x));
        o.copy(widthDir(x)).multiplyScalar(a * 0.35).addScaledVector(thickDir(x), b).normalize();
        nn.fromBufferAttribute(nor, k).addScaledVector(o, 0.38 + 0.4 * mb(x)).normalize();
        nor.setXYZ(k, nn.x, nn.y, nn.z);
      }
    }
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    const top = smooth(v0, -0.4, 0.9);
    const lat = Math.exp(-Math.pow(u0 / 0.8, 2));
    const pos = geo.attributes.position;
    for (let vI = 0; vI < n; vI++) {
      const x = pos.getX(vI);
      const g = gl(x);
      const pm = 1 - smooth(x, xs - 0.32, xs + 0.12);
      tmp.copy(white)
        .lerp(cool, Math.min(1, 0.9 * smooth(Math.abs(u0), 0.45, 1.0) + 0.55 * (1 - top)))
        .lerp(blush, smooth(g, 0.03, 0.35) * 0.85 * lat)
        .lerp(warm, smooth(g, 0.2, 0.85) * 0.9 * lat * (0.6 + 0.4 * top))
        .lerp(tmp.clone().copy(pink).lerp(pinkDeep, Math.min(1, 0.7 * smooth(Math.abs(u0), 0.6, 1.0) + 0.6 * (1 - top))), pm);
      col[vI * 3] = tmp.r;
      col[vI * 3 + 1] = tmp.g;
      col[vI * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    fibers.push(geo);
  }
  const fiberGeo = mergeGeometries(fibers);
  const coreGeo = loft(150, 32, X0, X1, (x, a) =>
    center(x).addScaledVector(widthDir(x), Math.cos(a) * halfW(x) * 0.97).addScaledVector(thickDir(x), Math.sin(a) * halfH(x) * 0.8)
  );
  {
    const pos = coreGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const cw = new THREE.Color('#b9cbe8');
    const cp = new THREE.Color('#b9585f');
    for (let i = 0; i < pos.count; i++) {
      tmp.copy(cw).lerp(cp, 1 - smooth(pos.getX(i), XJ - 0.9, XJ - 0.2));
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    coreGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  const FADE = [X0 + 0.05, X1 - 0.05, 0.85, 1.3];
  root.add(new THREE.Mesh(fiberGeo, depthMat()));
  root.add(new THREE.Mesh(coreGeo, depthMat()));
  const coreMat = fadeX(new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.4, clearcoat: 0.7 }), ...FADE);
  const core = new THREE.Mesh(coreGeo, coreMat);
  coreMat.depthFunc = THREE.EqualDepth;
  core.renderOrder = 1;
  root.add(core);
  const fMat = fadeX(
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 0.45, sheenColor: new THREE.Color('#bcd2ff'), sheenRoughness: 0.4 }),
    ...FADE
  );
  const tendon = new THREE.Mesh(fiberGeo, fMat);
  fMat.depthFunc = THREE.EqualDepth;
  tendon.renderOrder = 2;
  root.add(tendon);

  // Unas pocas fibras sueltas, finas, sobre la zona tratada (lesión sutil)
  reseed(2301);
  const loose = [];
  for (let i = 0; i < 6; i++) {
    const xa = XL - 0.6 + rnd() * 0.3;
    const xb = XL + 0.3 + rnd() * 0.4;
    const u = -0.45 + rnd() * 0.8;
    const ph = rnd() * 10;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const s = k / 24;
      const x = xa + (xb - xa) * s;
      const p = P(x, u + 0.08 * Math.sin(ph + k * 0.9), 1.0);
      p.addScaledVector(thickDir(x), 0.025 + 0.045 * Math.sin(Math.PI * s) * (0.6 + 0.4 * Math.sin(ph + k * 1.6)));
      pts.push(p);
    }
    loose.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.014 + rnd() * 0.006, 6, false));
  }
  const looseMat = new THREE.MeshPhysicalMaterial({ color: '#ffb895', roughness: 0.4, clearcoat: 0.6, emissive: new THREE.Color('#ff7a4a'), emissiveIntensity: 0.25 });
  root.add(new THREE.Mesh(mergeGeometries(loose), looseMat));

  // ------------------------------------------------------------ Punto de tratamiento
  const UL = -0.06; // posición lateral de la punta
  const S0 = P(XL, UL, 1); // superficie sobre la punta
  const NRM = normalAt(XL, UL);
  const T = P(XL, UL, 0.25); // punta, dentro del tejido

  // Halo cálido de la zona
  const hW = halo('#ff9a6b', 1.4, 0.26);
  hW.position.copy(S0).addScaledVector(NRM, 0.05);
  root.add(hW);

  // ------------------------------------------------------------ Ondas concéntricas sobre la superficie
  const ringTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    const radii = [0.13, 0.26, 0.4, 0.55, 0.71, 0.88];
    radii.forEach((r, i) => {
      const a = Math.pow(1 - i / (radii.length + 0.3), 1.35);
      const R = r * 512;
      for (const [w, al] of [[26, 0.08], [14, 0.16], [7, 0.32]]) {
        g.strokeStyle = `rgba(255,255,255,${(al * a).toFixed(3)})`;
        g.lineWidth = w;
        g.beginPath();
        g.arc(512, 512, R, 0, Math.PI * 2);
        g.stroke();
      }
      g.strokeStyle = `rgba(255,255,255,${(0.95 * a).toFixed(3)})`;
      g.lineWidth = 3.2;
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
    const RX = 1.3, RS = 0.85; // semiejes de la textura: a lo largo de las fibras / transversal
    const SX = 110, SU = 56;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= SX; i++) {
      const x = XL - RX + (2 * RX * i) / SX;
      for (let j = 0; j <= SU; j++) {
        const u = -0.94 + (1.88 * j) / SU;
        const p = P(x, u, 1).addScaledVector(normalAt(x, u), 0.055);
        pos.push(p.x, p.y, p.z);
        const s = (u - UL) * halfW(x);
        uv.push(0.5 + (x - XL) / (2 * RX), 0.5 + s / (2 * RS));
      }
    }
    for (let i = 0; i < SX; i++)
      for (let j = 0; j < SU; j++) {
        const a = i * (SU + 1) + j, b = a + 1, c = a + SU + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const ripple = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({ map: ringTex, color: '#5f93f5', transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
    );
    ripple.renderOrder = 6;
    root.add(ripple);
  }

  // ------------------------------------------------------------ Aguja fina con mango espiralado
  const SH = 1.8;
  const A = V(0.42, 0.82, -0.4).normalize(); // de la punta hacia el mango
  const nd = new THREE.Group();
  {
    const metal = M.metal();
    const navy = M.navy();
    const R0 = 0.015;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, SH, 16), metal);
    shaft.position.y = SH / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(R0, 0.06, 16), metal);
    tip.rotation.x = Math.PI;
    tip.position.y = -0.03;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.016, 0.07, 24), metal);
    collar.position.y = SH + 0.035;
    // mango: núcleo + espiral metálica + tapa azul marino
    const HL = 0.78;
    const H0 = SH + 0.07;
    const coreH = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, HL, 24), navy);
    coreH.position.y = H0 + HL / 2;
    const coilPts = [];
    const TURNS = 24, CL = HL * 0.66;
    for (let k = 0; k <= TURNS * 16; k++) {
      const s = k / (TURNS * 16);
      const a = s * TURNS * Math.PI * 2;
      coilPts.push(V(Math.cos(a) * 0.041, H0 + 0.01 + s * CL, Math.sin(a) * 0.041));
    }
    const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), TURNS * 16, 0.0095, 6, false), metal);
    const capPts = [];
    for (let k = 0; k <= 14; k++) {
      const s = k / 14;
      capPts.push(new THREE.Vector2(0.046 * Math.sqrt(1 - Math.pow(Math.max(0, s - 0.55) / 0.45, 2)), s * 0.3));
    }
    capPts.unshift(new THREE.Vector2(0, 0));
    const cap = new THREE.Mesh(new THREE.LatheGeometry(capPts, 32), navy);
    cap.position.y = H0 + CL + 0.03;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.008, 10, 40), M.glow('#a9c7ff'));
    band.rotation.x = Math.PI / 2;
    band.position.y = H0 + CL + 0.05;
    const top = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 10, 32), M.glow('#a9c7ff'));
    top.rotation.x = Math.PI / 2;
    top.position.y = H0 + CL + 0.31;
    nd.add(shaft, tip, collar, coreH, coil, cap, band, top);
  }
  nd.quaternion.setFromUnitVectors(V(0, 1, 0), A);
  nd.position.copy(T);
  nd.scale.set(1.45, 1, 1.45);
  root.add(nd);

  // ------------------------------------------------------------ Brillo suave en la punta
  const tipGlow = halo('#ffffff', 0.16, 0.7);
  tipGlow.material.depthTest = false;
  tipGlow.renderOrder = 10;
  tipGlow.position.copy(T);
  root.add(tipGlow);
  for (const [c, s, o] of [['#6f9cf2', 1.6, 0.3], ['#a9c7ff', 0.85, 0.55], ['#ffffff', 0.3, 0.85]]) {
    const h = halo(c, s, o);
    h.material.depthTest = false;
    h.renderOrder = 9;
    h.position.copy(S0).addScaledVector(NRM, 0.04);
    root.add(h);
  }

  // ------------------------------------------------------------ Nube de micro‑partículas
  const TAN = P(XL + 0.01, UL, 1).sub(P(XL - 0.01, UL, 1)).normalize();
  const SIDE = new THREE.Vector3().crossVectors(NRM, TAN).normalize();
  const pGeo = new THREE.IcosahedronGeometry(1, 1);
  const palette = ['#ffffff', '#e3ecff', '#a9c7ff', '#6f9cf2'];
  const buckets = palette.map(() => []);
  reseed(3101);
  for (let i = 0; i < 480; i++) {
    // distribución gaussiana: densa junto a la punta, rala hacia afuera
    const r = Math.min(0.9, 0.03 + 0.26 * Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)));
    const a = rnd() * Math.PI * 2;
    const lift = (0.02 + 0.7 * Math.pow(rnd(), 1.5)) * (0.3 + r * 0.9);
    const p = S0.clone()
      .addScaledVector(TAN, Math.cos(a) * r * 1.25)
      .addScaledVector(SIDE, Math.sin(a) * r * 0.8)
      .addScaledVector(NRM, lift);
    const ci = r < 0.22 ? (rnd() < 0.6 ? 0 : 1) : Math.floor(rnd() * palette.length);
    const s = (0.0045 + 0.012 * Math.pow(rnd(), 2.2) * (1.2 - 0.6 * r)) * [1, 0.95, 0.8, 0.62][ci];
    const g = pGeo.clone();
    g.scale(s, s, s);
    g.translate(p.x, p.y, p.z);
    buckets[ci].push(g);
  }
  const haze = halo('#cfe0ff', 1.15, 0.32);
  haze.position.copy(S0).addScaledVector(NRM, 0.28);
  haze.renderOrder = 7;
  root.add(haze);
  buckets.forEach((arr, i) => {
    if (!arr.length) return;
    const m = new THREE.Mesh(mergeGeometries(arr), glowMat(palette[i], 0.95));
    m.renderOrder = 8;
    root.add(m);
  });

  // ------------------------------------------------------------ Sombra de contacto (sigue la diagonal de la banda)
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.4)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: '#0a1530', transparent: true, opacity: 0.12, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.scale.set(LEN * 0.8, 1.9, 1);
    sh.position.set(0.25, -0.6, 0.15);
    root.add(sh);
  }

  const LOOK = V(-0.1, 0.45, 0);
  const CAM = V(3.4, 4.1, 5.2);
  return { root, cam: CAM.toArray(), look: LOOK.toArray(), zoom: 1.3, shadow: false };
}
