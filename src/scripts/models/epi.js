// EPI — Electrólisis Percutánea Intratisular.
// Primer plano de un tendón (haz de fibras blanco, extremos desvanecidos) con una zona degenerada:
// engrosamiento fusiforme, fibras onduladas/desorganizadas y tinte cálido. Una aguja de acupuntura entra
// oblicua hasta la lesión; en la punta, reacción electroquímica (destello azul hielo, filamentos y burbujas).
// Del mango sale una pinza con su cable fino, con un brillo tenue que sugiere la corriente galvánica.
export default function build(L) {
  const { THREE, M, needle, aim, halo, rnd, reseed, RoundedBoxGeometry, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const smooth = THREE.MathUtils.smoothstep;

  // ------------------------------------------------------------ Materiales propios
  // Desvanecido en los extremos (coordenada x del objeto) para materiales físicos
  const fadeX = (mat, x0, x1, w, warmGlow = 0) => {
    mat.transparent = true;
    mat.customProgramCacheKey = () => `fadeX:${x0}:${x1}:${w}:${warmGlow}`;
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying float vOX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOX = position.x;');
      sh.fragmentShader =
        'varying float vOX;\n' +
        sh.fragmentShader
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            #ifdef USE_COLOR
              totalEmissiveRadiance += vec3(1.0, 0.42, 0.2) * clamp(vColor.r - vColor.b, 0.0, 1.0) * ${warmGlow.toFixed(3)};
            #endif`
          )
          .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          gl_FragColor.a *= smoothstep(${x0.toFixed(3)}, ${(x0 + w).toFixed(3)}, vOX) * (1.0 - smoothstep(${(x1 - w).toFixed(3)}, ${x1.toFixed(3)}, vOX));`
        );
    };
    return mat;
  };
  // Desvanecido a lo largo de un tubo (atributo aT = 0..1 del recorrido)
  const fadeT = (mat, t0, t1, tIn = 0) => {
    mat.transparent = true;
    mat.customProgramCacheKey = () => `fadeT:${t0}:${t1}:${tIn}`;
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aT;\nvarying float vT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vT = aT;');
      sh.fragmentShader =
        'varying float vT;\n' +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          gl_FragColor.a *= (1.0 - smoothstep(${t0.toFixed(3)}, ${t1.toFixed(3)}, vT)) * smoothstep(0.0, ${Math.max(tIn, 1e-3).toFixed(3)}, vT);`
        );
    };
    return mat;
  };
  const withT = (geo) => {
    const uv = geo.attributes.uv;
    const a = new Float32Array(uv.count);
    for (let i = 0; i < uv.count; i++) a[i] = uv.getX(i);
    geo.setAttribute('aT', new THREE.BufferAttribute(a, 1));
    return geo;
  };
  // Pre-pasada de profundidad: la transparencia muestra solo la capa de fibras más cercana
  const depthMat = () => new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  const glowMat = (color, opacity = 1, onTop = false) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: !onTop, toneMapped: false });
  // Cáscara "vidrio" (fresnel), desvanecida en x
  const ghost = (color, { rim = 0.6, power = 2.4, base = 0.03, x0 = -99, x1 = 99, w = 1, onTop = false } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vX;
        void main(){ vX = position.x; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying float vX;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), ${power.toFixed(2)});
          float a = (${base.toFixed(3)} + ${rim.toFixed(3)}*f) * smoothstep(${x0.toFixed(3)}, ${(x0 + w).toFixed(3)}, vX) * (1.0 - smoothstep(${(x1 - w).toFixed(3)}, ${x1.toFixed(3)}, vX));
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: !onTop,
    });

  const root = new THREE.Group();

  // ------------------------------------------------------------ Tendón
  const LEN = 5.8;
  const X0 = -LEN / 2, X1 = LEN / 2;
  const XL = 0.35; // centro de la lesión
  const gl = (x) => Math.exp(-Math.pow((x - XL) / 0.6, 2));
  const A0 = 0.68, B0 = 0.5; // semiejes (z, y)
  const bendY = (x) => -0.02 * x * x + 0.05 * Math.sin(x * 0.6);
  const rad = (x) => {
    const g = gl(x);
    return [A0 * (1 + 0.34 * g), B0 * (1 + 0.4 * g)];
  };
  const warm = new THREE.Color('#ff6a33');
  const white = new THREE.Color('#ffffff');
  const blush = new THREE.Color('#ffd5c0');

  reseed(1207);
  const fibers = [];
  const colors = new THREE.Color();
  const SAMPLES = 64, SEGS = 92, RAD = 6;
  for (let i = 0; i < 165; i++) {
    const r = Math.pow(rnd(), 0.3);
    const th0 = rnd() * Math.PI * 2;
    const jit = rnd();
    const ph = rnd() * 10;
    const pts = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const x = X0 + (k / SAMPLES) * LEN;
      const [a, b] = rad(x);
      const th = th0 + x * 0.14;
      let y = Math.sin(th) * r * b + bendY(x);
      let z = Math.cos(th) * r * a;
      const d = 0.075 * gl(x) * (0.4 + r);
      y += Math.sin(ph + x * 4.2 * (0.7 + jit * 0.8)) * d * (0.35 + jit);
      z += Math.cos(ph * 1.3 + x * 3.6 * (0.6 + jit)) * d * (0.35 + jit) * 1.2;
      pts.push(V(x, y, z));
    }
    const fr = 0.056 * (0.75 + jit * 0.5);
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), SEGS, fr, RAD, false);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) {
      const ring = Math.floor(v / (RAD + 1));
      const x = X0 + (ring / SEGS) * LEN;
      const w = smooth(gl(x), 0.08, 0.6) * (0.7 + 0.3 * r);
      colors.copy(white).lerp(blush, smooth(gl(x), 0.02, 0.3) * 0.7).lerp(warm, w);
      col[v * 3] = colors.r;
      col[v * 3 + 1] = colors.g;
      col[v * 3 + 2] = colors.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    fibers.push(g);
  }
  const tendonGeo = mergeGeometries(fibers);
  const tMat = fadeX(M.tendon(), X0 + 0.05, X1 - 0.05, 1.05, 0.22);
  tMat.vertexColors = true;
  root.add(new THREE.Mesh(tendonGeo, depthMat()));
  const tendon = new THREE.Mesh(tendonGeo, tMat);
  tendon.renderOrder = 1;
  root.add(tendon);

  // Vaina (paratendón) en vidrio tenue: dibuja el contorno y el engrosamiento fusiforme
  {
    const NX = 120, NT = 48;
    const pos = [], idx = [];
    for (let i = 0; i <= NX; i++) {
      const x = X0 + (i / NX) * LEN;
      const [a, b] = rad(x);
      for (let j = 0; j <= NT; j++) {
        const th = (j / NT) * Math.PI * 2;
        pos.push(x, Math.sin(th) * (b * 1.12 + 0.04) + bendY(x), Math.cos(th) * (a * 1.1 + 0.04));
      }
    }
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NT; j++) {
        const p = i * (NT + 1) + j, q = p + NT + 1;
        idx.push(p, q, p + 1, q, q + 1, p + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const sheath = new THREE.Mesh(g, ghost('#bcd2ff', { rim: 0.42, power: 2.6, base: 0.02, x0: X0 + 0.1, x1: X1 - 0.1, w: 1.15 }));
    sheath.renderOrder = 3;
    root.add(sheath);
  }

  // Fibras desorganizadas (onduladas, levantadas) sobre la zona degenerada
  reseed(1301);
  const loose = [];
  for (let i = 0; i < 8; i++) {
    const xa = XL - 0.8 + rnd() * 0.3;
    const xb = XL + 0.45 + rnd() * 0.4;
    const th0 = 0.15 + rnd() * 1.8; // cara superior / frontal (visible)
    const ph = rnd() * 10;
    const lift = 0.88 + rnd() * 0.04;
    const pts = [];
    for (let k = 0; k <= 26; k++) {
      const x = xa + ((xb - xa) * k) / 26;
      const [a, b] = rad(x);
      const u = k / 26;
      const rr = lift + 0.26 * Math.pow(Math.sin(Math.PI * u), 0.6) + 0.03 * Math.sin(ph + u * 9);
      const th = th0 + Math.sin(ph + u * 5) * 0.07;
      pts.push(V(x, Math.sin(th) * b * rr + bendY(x), Math.cos(th) * a * rr));
    }
    loose.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 70, 0.026 + rnd() * 0.012, 6, false));
  }
  root.add(new THREE.Mesh(mergeGeometries(loose), M.lesion()));

  // Halo cálido de la zona lesionada
  const hW = halo('#ff9a6b', 2.2, 0.32);
  hW.position.set(XL + 0.15, 0.08, 1.05);
  hW.renderOrder = 5;
  root.add(hW);

  // ------------------------------------------------------------ Aguja
  const SHAFT = 2.2;
  const T = V(XL - 0.1, 0.24, 0.36); // punta, dentro de la lesión
  const A = V(-0.62, 0.95, 0.42).normalize(); // de la punta hacia el mango
  const nd = needle({ length: SHAFT });
  aim(nd, T, A);
  nd.scale.set(1.6, 1, 1.6);
  root.add(nd);

  // Brillo tenue a lo largo de la aguja (corriente)
  {
    const p0 = T.clone().addScaledVector(A, 0.05);
    const p1 = T.clone().addScaledVector(A, SHAFT);
    const g = withT(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 40, 0.05, 12, false));
    root.add(new THREE.Mesh(g, fadeT(glowMat('#8fb4ff', 0.28), 0.15, 0.9)));
  }

  // ------------------------------------------------------------ Reacción en la punta
  // Destello: halos superpuestos (se ven a través de las fibras) y estrella de 4 puntas
  for (const [c, s, o] of [['#a9c7ff', 3.0, 0.16], ['#4f7fe8', 1.85, 0.45], ['#2f63e0', 0.95, 0.6], ['#a9c7ff', 0.58, 1], ['#ffffff', 0.3, 1]]) {
    const h = halo(c, s, o);
    h.material.depthTest = false;
    h.renderOrder = 9;
    h.position.copy(T);
    root.add(h);
  }
  // Textura de destello lineal (cae suave a lo largo, fino en el ancho)
  const streakTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 32;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 32);
    for (let j = 0; j < 32; j++)
      for (let i = 0; i < 256; i++) {
        const u = Math.abs(i - 127.5) / 128, v = Math.abs(j - 15.5) / 16;
        const a = Math.pow(1 - u, 2.2) * Math.exp(-Math.pow(v / 0.28, 2));
        const k = (j * 256 + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round(255 * Math.min(1, a));
      }
    x.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  })();
  for (const [rot, lx, c, o, th] of [[0.28, 2.4, '#3f6fe0', 0.95, 0.055], [0.28 + Math.PI / 2, 1.4, '#3f6fe0', 0.9, 0.065], [0.28, 1.05, '#ffffff', 1, 0.05], [0.28 + Math.PI / 2, 0.65, '#ffffff', 1, 0.06]]) {
    const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex, color: c, transparent: true, opacity: o, depthWrite: false, depthTest: false }));
    st.material.rotation = rot;
    st.scale.set(lx, lx * th, 1);
    st.renderOrder = 10;
    st.position.copy(T);
    root.add(st);
  }
  const tipCore = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 20), glowMat('#ffffff', 1, true));
  tipCore.position.copy(T);
  tipCore.renderOrder = 12;
  root.add(tipCore);
  // Filamentos de energía
  reseed(1401);
  const arcs = [];
  for (let j = 0; j < 12; j++) {
    const ang = (j / 12) * Math.PI * 2 + rnd() * 0.4;
    const dir = V(Math.cos(ang), Math.sin(ang), 0.35 + rnd() * 0.5).normalize();
    const len = 0.26 + rnd() * 0.24;
    const pts = [T.clone()];
    for (let k = 1; k <= 6; k++) {
      const p = T.clone().addScaledVector(dir, (len * k) / 6);
      p.add(V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.07));
      pts.push(p);
    }
    arcs.push(withT(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 30, 0.015, 5, false)));
  }
  const arcMat = fadeT(glowMat('#5b8def', 1, true), 0.55, 1.0);
  const arcMesh = new THREE.Mesh(mergeGeometries(arcs), arcMat);
  arcMesh.renderOrder = 11;
  root.add(arcMesh);

  // Ondas de energía: anillos finos perpendiculares a la aguja, centrados en la punta
  for (const [r, o] of [[0.32, 0.6], [0.52, 0.26]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 8, 96), glowMat('#5b8def', o, true));
    ring.quaternion.setFromUnitVectors(V(0, 0, 1), A);
    ring.position.copy(T);
    ring.renderOrder = 9;
    root.add(ring);
  }

  // Burbujas (gas de la reacción) que suben por el trayecto de la aguja
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: '#dbe7ff',
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 1,
    iridescenceIOR: 1.3,
    emissive: new THREE.Color('#a9c7ff'),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  const bubbleGeo = new THREE.SphereGeometry(1, 22, 14);
  reseed(1501);
  for (let i = 0; i < 64; i++) {
    const u = rnd();
    const along = Math.pow(u, 1.3) * 0.85;
    const spread = 0.08 + 0.34 * Math.pow(rnd(), 1.1) * (0.45 + u);
    const off = V(rnd() - 0.5, rnd() * 0.9 - 0.2, rnd() - 0.2).normalize().multiplyScalar(spread);
    const p = T.clone().addScaledVector(A, along).add(off);
    const s = 0.022 + 0.07 * Math.pow(rnd(), 2) * (0.5 + u);
    const b = new THREE.Mesh(bubbleGeo, bubbleMat);
    b.position.copy(p);
    b.scale.setScalar(s);
    root.add(b);
  }

  // ------------------------------------------------------------ Pinza y cable
  const LOOK = V(-0.1, 0.8, 0);
  const CAM = V(1.9, 2.3, 6.4);
  const ZOOM = 1.75;
  const camPos = LOOK.clone().add(CAM.clone().sub(LOOK).multiplyScalar(ZOOM));
  const view = LOOK.clone().sub(camPos).normalize();
  let S = new THREE.Vector3().crossVectors(A, view).normalize();
  if (S.y < 0) S.negate();
  // Eje de la pinza: sale del mango hacia la derecha, casi horizontal
  const X = V(1, 0.1, -0.22).normalize();
  const Zc = new THREE.Vector3().crossVectors(X, A).normalize();
  const Yc = new THREE.Vector3().crossVectors(Zc, X).normalize();
  const grip = T.clone().addScaledVector(A, SHAFT + 0.86);
  const clip = new THREE.Group();
  clip.matrix.makeBasis(X, Yc, Zc);
  clip.matrix.setPosition(grip);
  clip.matrixAutoUpdate = false;
  root.add(clip);
  const metal = M.metal();
  const navy = M.navy();
  // Mordazas metálicas en cuña que muerden el mango
  const jawShape = new THREE.Shape();
  jawShape.moveTo(-0.04, -0.018);
  jawShape.quadraticCurveTo(-0.06, 0.004, -0.04, 0.026);
  jawShape.lineTo(0.3, 0.07);
  jawShape.lineTo(0.3, -0.055);
  jawShape.closePath();
  const jawGeo = new THREE.ExtrudeGeometry(jawShape, { depth: 0.026, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 3, curveSegments: 8 });
  jawGeo.translate(0, 0, -0.013);
  for (const sd of [-1, 1]) {
    const jaw = new THREE.Mesh(jawGeo, metal);
    jaw.position.z = sd * 0.074;
    jaw.rotation.y = -sd * 0.1;
    clip.add(jaw);
  }
  // Funda aislante (azul marino), algo aplanada, con anillo de luz
  const sleeve = new THREE.Group();
  sleeve.rotation.z = -Math.PI / 2;
  sleeve.scale.z = 0.82;
  clip.add(sleeve);
  const bootPts = [new THREE.Vector2(0, 0.2)];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = 0.2 + t * 0.72;
    const r = t < 0.18 ? 0.088 + 0.03 * Math.sin(((t / 0.18) * Math.PI) / 2) : 0.118 - 0.074 * Math.pow((t - 0.18) / 0.82, 1.4);
    bootPts.push(new THREE.Vector2(r, y));
  }
  bootPts.push(new THREE.Vector2(0, 0.92));
  sleeve.add(new THREE.Mesh(new THREE.LatheGeometry(bootPts, 48), navy));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.119, 0.011, 10, 48), M.glow('#a9c7ff'));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.36;
  sleeve.add(band);

  // Cable: sale de la pinza, se curva hacia la derecha por detrás y se desvanece
  const C0 = grip.clone().addScaledVector(X, 0.9);
  const cablePts = [
    C0,
    C0.clone().addScaledVector(X, 0.35),
    C0.clone().add(V(0.85, -0.14, -0.25)),
    C0.clone().add(V(1.6, -0.45, -0.5)),
    C0.clone().add(V(2.35, -0.72, -0.7)),
    C0.clone().add(V(3.0, -0.85, -0.85)),
  ];
  const cableCurve = new THREE.CatmullRomCurve3(cablePts, false, 'centripetal');
  const cableGeo = withT(new THREE.TubeGeometry(cableCurve, 160, 0.036, 14, false));
  const cableMat = fadeT(new THREE.MeshPhysicalMaterial({ color: '#25365a', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }), 0.45, 0.97);
  root.add(new THREE.Mesh(cableGeo, depthMat()));
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.renderOrder = 2;
  root.add(cable);
  // Pulsos de corriente a lo largo del cable (más intensos cerca de la pinza)
  for (const [t, o] of [[0.07, 1], [0.16, 0.85], [0.25, 0.65], [0.34, 0.45]]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) pts.push(cableCurve.getPointAt(t + (k / 8) * 0.06));
    const g = withT(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.041, 12, false));
    const pulse = new THREE.Mesh(g, fadeT(glowMat('#a9c7ff', o), 0.5, 1.0, 0.5));
    pulse.renderOrder = 4;
    root.add(pulse);
  }
  const aura = withT(new THREE.TubeGeometry(cableCurve, 160, 0.075, 14, false));
  root.add(new THREE.Mesh(aura, fadeT(glowMat('#8fb4ff', 0.22), 0.3, 0.9)));

  return { root, cam: CAM.toArray(), look: LOOK.toArray(), zoom: ZOOM };
}
