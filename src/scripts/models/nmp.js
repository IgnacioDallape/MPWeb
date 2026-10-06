// NMP-e — Neuromodulación Percutánea Ecoguiada.
// Un nervio periférico (fascículos amarillos dentro de un epineuro translúcido, con el extremo izquierdo
// cortado en sección para que se vean los fascículos y un leve estriado transversal) recorre la escena.
// Una aguja con su pinza y cable queda JUNTO al nervio, apenas por encima (no lo atraviesa): desde la
// punta salen arcos y ondas luminosas que rodean el nervio. Uno de los fascículos —el motor— se
// "enciende" en azul hielo y lleva pulsos por el tronco y por la rama que sale hasta un músculo rosado,
// que brilla en sus placas motoras (leve contracción).
export default function build(L) {
  const { THREE, M, needle, aim, halo, rnd, reseed, mergeGeometries } = L;
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const smooth = THREE.MathUtils.smoothstep;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();

  // ------------------------------------------------------------ Materiales propios
  const depthMat = () => new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  const glowMat = (color, opacity = 1, onTop = false) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: !onTop, toneMapped: false });
  const withT = (geo) => {
    const uv = geo.attributes.uv;
    const a = new Float32Array(uv.count);
    for (let i = 0; i < uv.count; i++) a[i] = uv.getX(i);
    geo.setAttribute('aT', new THREE.BufferAttribute(a, 1));
    return geo;
  };
  const setA = (geo, f) => {
    const pos = geo.attributes.position;
    const a = new Float32Array(pos.count);
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) a[i] = f(p.fromBufferAttribute(pos, i), i);
    geo.setAttribute('aA', new THREE.BufferAttribute(a, 1));
    return geo;
  };
  // Cáscara "vidrio": borde fresnel + brillo especular fijo; alfa por vértice en aA
  const ghost = (color, { rim = 0.6, power = 2.4, base = 0.03, spec = 0.55, shin = 70, onTop = false } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `attribute float aA; varying float vA; varying vec3 vN; varying vec3 vV;
        void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; varying vec3 vN; varying vec3 vV;
        void main(){ vec3 n = normalize(vN); vec3 v = normalize(vV); if (!gl_FrontFacing) n = -n;
          float f = pow(1.0 - abs(dot(n, v)), ${power.toFixed(2)});
          vec3 h = normalize(normalize(vec3(0.35, 0.75, 0.55)) + v);
          float s = pow(max(dot(n, h), 0.0), ${shin.toFixed(1)}) * ${spec.toFixed(3)} * (gl_FrontFacing ? 1.0 : 0.0);
          float a = (${base.toFixed(3)} + ${rim.toFixed(3)} * f + s) * vA;
          gl_FragColor = vec4(mix(uColor, vec3(1.0), clamp(s * 1.6, 0.0, 1.0)), clamp(a, 0.0, 1.0));
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: !onTop,
      side: THREE.DoubleSide,
    });
  // Brillo a lo largo de un tubo (aT = 0..1): perfil de "cometa" (cola larga, cabeza corta) o banda simétrica
  const PROFILES = {
    comet: 'pow(smoothstep(0.0, 0.88, vT), 1.6) * (1.0 - smoothstep(0.9, 1.0, vT))',
    band: 'pow(sin(3.14159265 * vT), 2.0)',
    trail: 'smoothstep(0.0, 0.12, vT) * (1.0 - smoothstep(0.9, 1.0, vT))',
  };
  const pulseMat = (color, opacity, { comet = true, profile = comet ? 'comet' : 'band', rim = 0, onTop = false } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `attribute float aT; varying float vT; varying vec3 vN; varying vec3 vV;
        void main(){ vT = aT; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vT; varying vec3 vN; varying vec3 vV;
        void main(){
          float prof = ${PROFILES[profile]};
          float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
          float a = ${opacity.toFixed(3)} * prof * mix(1.0, 0.25 + 1.2 * f * f, ${rim.toFixed(3)});
          gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: !onTop,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  const tubeFrom = (fn, t0, t1, n, r, rad = 12) => {
    const pts = [];
    for (let k = 0; k <= n; k++) pts.push(fn(t0 + ((t1 - t0) * k) / n));
    return withT(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 3, r, rad, false));
  };
  const loft = (SX, SA, ta, tb, ring) => {
    const pos = [], idx = [];
    for (let i = 0; i <= SX; i++) {
      const t = ta + ((tb - ta) * i) / SX;
      for (let j = 0; j < SA; j++) {
        const p = ring(t, (j / SA) * TAU);
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
  // Escala el radio de un TubeGeometry anillo por anillo
  const scaleTube = (geo, curve, segs, rad, f) => {
    const pos = geo.attributes.position;
    const c = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      curve.getPointAt(i / segs, c);
      const s = f(c);
      for (let j = 0; j <= rad; j++) {
        const k = i * (rad + 1) + j;
        p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(s).add(c);
        pos.setXYZ(k, p.x, p.y, p.z);
      }
    }
    geo.computeVertexNormals();
  };
  const tmp = new THREE.Color();

  // ------------------------------------------------------------ Eje del nervio
  const X0 = -3.2, X1 = 3.9;
  const XS = X0 + 0.34; // borde del epineuro cortado
  const cy = (x) => 0.8 + 0.12 * Math.sin(0.5 * x + 0.5);
  const cz = (x) => 0.16 * Math.sin(0.42 * x - 0.4) - 0.22 * x;
  const C = (x) => V(x, cy(x), cz(x));
  const frame = (x) => {
    const T = C(x + 0.005).sub(C(x - 0.005)).normalize();
    const B1 = V(0, 1, 0).addScaledVector(T, -T.y).normalize();
    const B2 = new THREE.Vector3().crossVectors(T, B1);
    return { T, B1, B2 };
  };
  // Punto de la sección: a = 0 arriba, a = π/2 hacia el frente (cámara)
  const P = (x, r, a) => {
    const f = frame(x);
    return C(x).addScaledVector(f.B1, Math.cos(a) * r).addScaledVector(f.B2, Math.sin(a) * r);
  };
  const R = 0.46;
  const TW = 0.1; // torsión suave de los fascículos
  const fadeR = (x) => 1 - smooth(x, X1 - 1.5, X1);

  // ------------------------------------------------------------ Fascículos
  reseed(4101);
  const FAS = [{ r: 0, a: 0, rf: 0.125 }];
  for (let i = 0; i < 6; i++) FAS.push({ r: 0.235, a: (i / 6) * TAU + 0.3, rf: 0.104 });
  for (let i = 0; i < 6; i++) FAS.push({ r: 0.336, a: ((i + 0.5) / 6) * TAU + 0.3, rf: 0.058 });
  // El fascículo motor (frente, algo abajo) abandona el tronco y forma la rama que va al músculo
  const MOTOR = 8;
  const XB = 0.55; // donde el fascículo motor empieza a salir del tronco
  FAS[MOTOR].rf = 0.07;
  const yellows = ['#f2ab3c', '#f7b84c', '#efa434', '#f8bf58'].map((c) => new THREE.Color(c));
  const fasGeos = [];
  const capGeos = [];
  FAS.forEach((f, i) => {
    const xs = X0 + (i === 0 ? -0.08 : i < 7 ? 0.06 + rnd() * 0.08 : 0.2 + rnd() * 0.06);
    f.xs = xs;
    const ph = rnd() * 10;
    const path = (x) => P(x, f.r + 0.006 * Math.sin(x * 2.1 + ph), f.a + TW * x);
    const pts = [];
    const xe = i === MOTOR ? XB : X1;
    const n = i === MOTOR ? 80 : 150;
    for (let k = 0; k <= n; k++) pts.push(path(xs + ((xe - xs) * k) / n));
    const curve = new THREE.CatmullRomCurve3(pts);
    f.pts = pts;
    f.path = path;
    if (i === MOTOR) {
      const cap = new THREE.CircleGeometry(f.rf * 0.995, 28);
      cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), curve.getTangentAt(0).negate()));
      cap.translate(pts[0].x, pts[0].y, pts[0].z);
      capGeos.push(cap);
      return;
    }
    const geo = new THREE.TubeGeometry(curve, 180, f.rf, i < 7 ? 20 : 14, false);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 4);
    const base = yellows[i % yellows.length];
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k);
      // bandas de Fontana: estriado transversal sutil, típico del nervio
      const band = 0.93 + 0.07 * Math.sin(x * 24 + i * 0.9);
      tmp.copy(base).multiplyScalar(band);
      col.set([tmp.r, tmp.g, tmp.b, fadeR(x)], k * 4);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    fasGeos.push(geo);
    // Tapa de corte (cara del fascículo)
    const cap = new THREE.CircleGeometry(f.rf * 0.995, 28);
    const T0 = curve.getTangentAt(0).negate();
    cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), T0));
    cap.translate(pts[0].x, pts[0].y, pts[0].z);
    capGeos.push(cap);
  });
  const fasGeo = mergeGeometries(fasGeos);
  root.add(new THREE.Mesh(fasGeo, depthMat()));
  const fasMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    vertexColors: true,
    transparent: true,
    roughness: 0.42,
    specularIntensity: 0.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    emissive: new THREE.Color('#ff9a2e'),
    emissiveIntensity: 0.12,
  });
  const fas = new THREE.Mesh(fasGeo, fasMat);
  fas.renderOrder = 1;
  root.add(fas);
  const capMat = new THREE.MeshPhysicalMaterial({ color: '#ffe3a8', roughness: 0.5, specularIntensity: 0.4, clearcoat: 0.6, emissive: new THREE.Color('#ffb54a'), emissiveIntensity: 0.12 });
  const nerveMat = new THREE.MeshPhysicalMaterial({ color: '#f5b447', roughness: 0.42, specularIntensity: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1, emissive: new THREE.Color('#ff9a2e'), emissiveIntensity: 0.12 });
  root.add(new THREE.Mesh(mergeGeometries(capGeos), capMat));

  // ------------------------------------------------------------ Epineuro (vaina translúcida) y cara de corte
  const sheathGeo = setA(
    loft(220, 64, XS, X1, (x, a) => P(x, R * (1 + 0.015 * Math.sin(x * 1.7)), a)),
    (p) => fadeR(p.x)
  );
  const sheath = new THREE.Mesh(sheathGeo, ghost('#f4b850', { rim: 0.75, power: 2.2, base: 0.085, spec: 0.5 }));
  sheath.renderOrder = 4;
  root.add(sheath);
  {
    // Cara de corte del epineuro: disco translúcido con huecos donde salen los fascículos
    const f0 = frame(XS);
    const sh = new THREE.Shape();
    sh.absarc(0, 0, R * (1 + 0.015 * Math.sin(XS * 1.7)), 0, TAU, false);
    FAS.forEach((f) => {
      const a = f.a + TW * XS;
      const hole = new THREE.Path();
      hole.absarc(Math.sin(a) * f.r, Math.cos(a) * f.r, f.rf + 0.012, 0, TAU, true);
      sh.holes.push(hole);
    });
    const g = new THREE.ShapeGeometry(sh, 32);
    const Z = f0.T.clone().negate();
    const m4 = new THREE.Matrix4().makeBasis(f0.B2, f0.B1, Z).setPosition(C(XS));
    g.applyMatrix4(m4);
    const face = new THREE.Mesh(
      g,
      new THREE.MeshPhysicalMaterial({ color: '#fff1d6', roughness: 0.4, clearcoat: 0.8, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, emissive: new THREE.Color('#ffd89a'), emissiveIntensity: 0.12 })
    );
    face.renderOrder = 3;
    root.add(face);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(R * (1 + 0.015 * Math.sin(XS * 1.7)), 0.014, 10, 96), new THREE.MeshPhysicalMaterial({ color: '#fff3dc', roughness: 0.3, clearcoat: 1, transparent: true, opacity: 0.85 }));
    lip.applyMatrix4(m4);
    lip.renderOrder = 3;
    root.add(lip);
  }

  // ------------------------------------------------------------ Músculo inervado (rosado, fusiforme)
  const mg = new THREE.Group();
  mg.position.set(2.0, -1.1, 0.8);
  mg.rotation.set(0, 0.3, -0.07);
  root.add(mg);
  mg.updateMatrixWorld(true);
  const HL = 2.1, TL = 2.95;
  const rho = (x) => 0.085 + 0.7 * Math.pow(Math.max(0, 1 - (x / HL) * (x / HL)), 0.7);
  const SQ = 0.78;
  const arch = (x) => 0.08 * Math.cos((x / TL) * Math.PI * 0.5);
  const MS = (x, phi, k = 1) => V(x, rho(x) * k * SQ * Math.cos(phi) + arch(x), rho(x) * k * Math.sin(phi));
  const MPL = { x: -0.25, phi: 0.62 }; // punto motor (coordenadas locales)
  const actv = (p) => Math.exp(-(Math.pow((p.x - MPL.x) / 1.25, 2)));
  {
    const pinkTop = new THREE.Color('#d86874');
    const pink = new THREE.Color('#bd4f5f');
    const pinkDeep = new THREE.Color('#862c44');
    const white = new THREE.Color('#e6edf8');
    const lit = new THREE.Color('#f48c98');
    reseed(5203);
    const geos = [];
    const NF = 78;
    for (let i = 0; i < NF; i++) {
      const phi0 = (i / NF) * TAU + (rnd() - 0.5) * 0.05;
      const k = 0.93 + rnd() * 0.06;
      const ph = rnd() * 6;
      const pts = [];
      for (let s = 0; s <= 60; s++) {
        const x = -TL + (2 * TL * s) / 60;
        pts.push(MS(x, phi0 + 0.05 * x + 0.015 * Math.sin(x * 3 + ph), k));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const SEG = 90, RAD = 6;
      const geo = new THREE.TubeGeometry(curve, SEG, 0.05, RAD, false);
      scaleTube(geo, curve, SEG, RAD, (c) => 0.32 + 0.68 * (rho(c.x) - 0.085) / 0.7);
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 4);
      const p = new THREE.Vector3();
      const up = 0.5 + 0.5 * Math.cos(phi0) * 0.8 + 0.2 * Math.sin(phi0);
      for (let v = 0; v < pos.count; v++) {
        p.fromBufferAttribute(pos, v);
        const ax = Math.abs(p.x);
        tmp.copy(pinkDeep).lerp(pink, Math.min(1, up * 1.2)).lerp(pinkTop, Math.max(0, up - 0.55) * 1.6);
        tmp.lerp(lit, 0.45 * actv(p) * Math.min(1, Math.max(0, up - 0.1) * 1.5));
        tmp.lerp(white, smooth(ax, HL - 0.3, HL + 0.25));
        col.set([tmp.r, tmp.g, tmp.b, 1 - smooth(ax, TL - 0.75, TL - 0.02)], v * 4);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
      geos.push(geo);
    }
    const fGeo = mergeGeometries(geos);
    const coreGeo = loft(120, 40, -TL, TL, (x, a) => MS(x, a, 0.9));
    {
      const pos = coreGeo.attributes.position;
      const col = new Float32Array(pos.count * 4);
      const cp = new THREE.Color('#a94f5c');
      for (let v = 0; v < pos.count; v++) {
        const ax = Math.abs(pos.getX(v));
        tmp.copy(cp).lerp(new THREE.Color('#b9cbe8'), smooth(ax, HL - 0.5, HL + 0.1));
        col.set([tmp.r, tmp.g, tmp.b, 1 - smooth(ax, TL - 0.9, TL - 0.1)], v * 4);
      }
      coreGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    }
    mg.add(new THREE.Mesh(fGeo, depthMat()));
    mg.add(new THREE.Mesh(coreGeo, depthMat()));
    const core = new THREE.Mesh(coreGeo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, transparent: true, roughness: 0.45, clearcoat: 0.6 }));
    core.renderOrder = 1;
    mg.add(core);
    const mMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      vertexColors: true,
      transparent: true,
      roughness: 0.46,
      specularIntensity: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.16,
      sheen: 0.25,
      sheenColor: new THREE.Color('#ffc2c6'),
      emissive: new THREE.Color('#ff6f7a'),
      emissiveIntensity: 0.05,
    });
    const mus = new THREE.Mesh(fGeo, mMat);
    mus.renderOrder = 2;
    mg.add(mus);
  }
  const toW = (v) => mg.localToWorld(v.clone());
  const MP = toW(MS(MPL.x, MPL.phi, 1.0));
  const MPn = toW(MS(MPL.x, MPL.phi, 1.0).add(V(0, Math.cos(MPL.phi) / SQ, Math.sin(MPL.phi)).normalize().multiplyScalar(0.5))).sub(MP).normalize(); // normal aprox.

  // ------------------------------------------------------------ Rama motora: sale del tronco y entra al músculo
  // El fascículo motor recorre el tronco y, desde XB, se abre en una curva suave hasta el punto motor
  const FM = FAS[MOTOR];
  const bPts = FM.pts.filter((_, k) => k % 4 === 0 && k < FM.pts.length - 2);
  {
    const E = FM.path(XB + 0.25);
    E.add(E.clone().sub(C(XB + 0.25)).normalize().multiplyScalar(0.06));
    const rad = E.clone().sub(C(XB + 0.25)).normalize();
    const d1 = frame(XB).T.multiplyScalar(0.8).add(rad.multiplyScalar(0.6)).normalize();
    const bz = new THREE.CubicBezierCurve3(E, E.clone().addScaledVector(d1, 0.7), MP.clone().addScaledVector(MPn, 0.95), MP.clone().addScaledVector(MPn, 0.02));
    for (let k = 0; k <= 12; k++) bPts.push(bz.getPoint(k / 12));
  }
  const bCurve = new THREE.CatmullRomCurve3(bPts, false, 'centripetal');
  const branchFn = (t) => bCurve.getPointAt(Math.min(1, Math.max(0, t)));
  // parámetro donde la rama sale del epineuro y donde está la aguja
  let tExit = 0, tNeedle = 0;
  for (let k = 0; k <= 400; k++) {
    const t = k / 400;
    const p = branchFn(t);
    if (!tNeedle && p.x >= -1.2) tNeedle = t;
    if (!tExit && p.distanceTo(C(p.x)) > R - 0.03) tExit = t;
  }
  {
    const g = new THREE.TubeGeometry(bCurve, 260, FM.rf, 16, false);
    root.add(new THREE.Mesh(g, nerveMat));
    const sg = tubeFrom(branchFn, tExit - 0.02, 1, 40, 0.12, 32);
    setA(sg, (p, i) => smooth(sg.attributes.aT.getX(i), 0.0, 0.14) * (1 - smooth(sg.attributes.aT.getX(i), 0.95, 1.0)));
    const bs = new THREE.Mesh(sg, ghost('#f2b24a', { rim: 0.8, power: 2.0, base: 0.04, spec: 0.45 }));
    bs.renderOrder = 4;
    root.add(bs);
  }
  // Ramitas terminales sobre el músculo con sus placas motoras
  const plates = [];
  {
    reseed(6007);
    const twigs = [];
    const ends = [
      [-0.75, 0.3],
      [-0.45, -0.25],
      [0.05, 0.42],
      [0.35, -0.12],
      [0.7, 0.28],
      [-0.15, 0.95],
    ];
    ends.forEach(([dx, dp]) => {
      const pts = [];
      for (let k = 0; k <= 14; k++) {
        const s = k / 14;
        const x = MPL.x + dx * s;
        const phi = MPL.phi + dp * Math.pow(s, 0.8) + 0.04 * Math.sin(s * 9 + dx * 5);
        pts.push(toW(MS(x, phi, 1.0 + 0.035 * (1 - s) + 0.02)));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 40, 0.026, 8, false);
      // afinar hacia la punta
      const pos = geo.attributes.position;
      const c = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i <= 40; i++) {
        curve.getPointAt(i / 40, c);
        const s = 1 - 0.55 * (i / 40);
        for (let j = 0; j <= 8; j++) {
          const kk = i * 9 + j;
          p.fromBufferAttribute(pos, kk).sub(c).multiplyScalar(s).add(c);
          pos.setXYZ(kk, p.x, p.y, p.z);
        }
      }
      twigs.push(geo);
      plates.push(pts[pts.length - 1]);
    });
    root.add(new THREE.Mesh(mergeGeometries(twigs), nerveMat));
    const pGeo = new THREE.SphereGeometry(1, 16, 12);
    plates.forEach((p) => {
      const d = new THREE.Mesh(pGeo, glowMat('#eaf2ff', 1));
      d.position.copy(p);
      d.scale.setScalar(0.045);
      d.renderOrder = 8;
      root.add(d);
      for (const [c, s, o] of [['#6f9cf2', 0.55, 0.5], ['#cfe0ff', 0.24, 0.95]]) {
        const h = halo(c, s, o);
        h.position.copy(p);
        h.renderOrder = 7;
        root.add(h);
      }
    });
  }
  // Brillo de contracción: halo cálido suave sobre el vientre y chispas finas junto a las placas motoras
  {
    const h = halo('#ff8f9c', 2.2, 0.14);
    h.position.copy(toW(V(MPL.x + 0.1, 0.35, 0.75)));
    h.renderOrder = 6;
    root.add(h);
    const hc = halo('#e3ecff', 0.9, 0.35);
    hc.position.copy(MP).addScaledVector(MPn, 0.05);
    hc.renderOrder = 7;
    root.add(hc);
    reseed(6301);
    const sGeo = new THREE.IcosahedronGeometry(1, 1);
    const sp = [];
    for (let i = 0; i < 46; i++) {
      const x = MPL.x + (rnd() - 0.5) * 2.0;
      const phi = MPL.phi + (rnd() - 0.5) * 1.6;
      const p = toW(MS(x, phi, 1.06 + rnd() * 0.18));
      const s = 0.008 + 0.014 * Math.pow(rnd(), 2);
      const g = sGeo.clone();
      g.scale(s, s, s);
      g.translate(p.x, p.y, p.z);
      sp.push(g);
    }
    const m = new THREE.Mesh(mergeGeometries(sp), glowMat('#e3ecff', 0.95));
    m.renderOrder = 8;
    root.add(m);
  }

  // ------------------------------------------------------------ Aguja junto al nervio (no lo atraviesa)
  const XN = -1.05;
  const AN = -0.2; // la punta queda sobre el nervio, apenas separada de su contorno superior
  const TIP = P(XN, R + 0.17, AN);
  const A = V(-0.7, 0.64, -0.32).normalize();
  const SHAFT = 1.6;
  const nd = needle({ length: SHAFT });
  aim(nd, TIP, A);
  nd.scale.set(1.6, 1, 1.6);
  root.add(nd);
  // Corriente a lo largo de la aguja
  {
    const g = withT(new THREE.TubeGeometry(new THREE.LineCurve3(TIP.clone().addScaledVector(A, 0.04), TIP.clone().addScaledVector(A, SHAFT)), 40, 0.05, 12, false));
    const m = new THREE.Mesh(g, pulseMat('#8fb4ff', 0.3, { comet: false }));
    root.add(m);
  }

  // ------------------------------------------------------------ Pinza y cable del estimulador
  {
    const metal = M.metal();
    const navy = M.navy();
    const X = V(1, 0.04, -0.4).normalize();
    const Zc = new THREE.Vector3().crossVectors(X, A).normalize();
    const Yc = new THREE.Vector3().crossVectors(Zc, X).normalize();
    const grip = TIP.clone().addScaledVector(A, SHAFT + 0.86);
    const clip = new THREE.Group();
    clip.matrix.makeBasis(X, Yc, Zc);
    clip.matrix.setPosition(grip);
    clip.matrixAutoUpdate = false;
    root.add(clip);
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
    const C0 = grip.clone().addScaledVector(X, 0.9);
    const cablePts = [C0, C0.clone().addScaledVector(X, 0.35), C0.clone().add(V(0.8, -0.06, -0.42)), C0.clone().add(V(1.45, -0.2, -0.75)), C0.clone().add(V(2.05, -0.42, -1.0))];
    const cableCurve = new THREE.CatmullRomCurve3(cablePts, false, 'centripetal');
    const cableGeo = withT(new THREE.TubeGeometry(cableCurve, 120, 0.036, 14, false));
    setA(cableGeo, (p, i) => 1 - smooth(cableGeo.attributes.aT.getX(i), 0.3, 0.95));
    const cable = new THREE.Mesh(cableGeo, new THREE.MeshPhysicalMaterial({ color: '#25365a', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true }));
    cable.material.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aA; varying float vA;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vA = aA;');
      sh.fragmentShader = 'varying float vA;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= vA;');
    };
    root.add(new THREE.Mesh(cableGeo, depthMat()));
    cable.renderOrder = 2;
    root.add(cable);
    for (const [t, o] of [[0.06, 0.95], [0.16, 0.75], [0.26, 0.5]]) {
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push(cableCurve.getPointAt(t + (k / 8) * 0.07));
      const g = withT(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.042, 12, false));
      const m = new THREE.Mesh(g, pulseMat('#a9c7ff', o, { comet: false }));
      m.renderOrder = 4;
      root.add(m);
    }
  }

  // ------------------------------------------------------------ Estímulo en la punta
  for (const [c, s, o] of [['#a9c7ff', 2.4, 0.2], ['#4f7fe8', 1.25, 0.5], ['#2f63e0', 0.62, 0.55], ['#a9c7ff', 0.42, 0.95], ['#ffffff', 0.22, 1]]) {
    const h = halo(c, s, o);
    h.material.depthTest = false;
    h.renderOrder = 9;
    h.position.copy(TIP);
    root.add(h);
  }
  // Destello en cruz (fino)
  {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 32;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 32);
    for (let j = 0; j < 32; j++)
      for (let i = 0; i < 256; i++) {
        const u = Math.abs(i - 127.5) / 128, v = Math.abs(j - 15.5) / 16;
        const a = Math.pow(1 - u, 2.4) * Math.exp(-Math.pow(v / 0.26, 2));
        const k = (j * 256 + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round(255 * Math.min(1, a));
      }
    x.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    for (const [rot, lx, col, o, th] of [[0.5, 1.5, '#3f6fe0', 0.9, 0.06], [0.5 + Math.PI / 2, 0.9, '#3f6fe0', 0.85, 0.07], [0.5, 0.7, '#ffffff', 1, 0.055], [0.5 + Math.PI / 2, 0.42, '#ffffff', 1, 0.065]]) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, opacity: o, depthWrite: false, depthTest: false }));
      st.material.rotation = rot;
      st.scale.set(lx, lx * th, 1);
      st.renderOrder = 10;
      st.position.copy(TIP);
      root.add(st);
    }
  }
  const tipCore = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 20), glowMat('#ffffff', 1, true));
  tipCore.position.copy(TIP);
  tipCore.renderOrder = 12;
  root.add(tipCore);
  // Arcos de la punta al nervio
  {
    reseed(7103);
    const arcs = [];
    for (let j = 0; j < 6; j++) {
      const tx = XN + (j - 2.5) * 0.17 + (rnd() - 0.5) * 0.05;
      const ta = AN + (rnd() - 0.5) * 0.9;
      const end = P(tx, R + 0.01, ta);
      const pts = [];
      for (let k = 0; k <= 7; k++) {
        const s = k / 7;
        const p = TIP.clone().lerp(end, s);
        if (k > 0 && k < 7) p.add(V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.06));
        pts.push(p);
      }
      arcs.push(withT(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 30, 0.011, 5, false)));
    }
    const m = new THREE.Mesh(mergeGeometries(arcs), pulseMat('#5b8def', 0.95, { comet: false }));
    m.renderOrder = 10;
    root.add(m);
  }
  // Ondas concéntricas alrededor del nervio, centradas en la punta
  {
    const f = frame(XN);
    for (const [r, o, w] of [[R + 0.12, 0.95, 0.014], [R + 0.3, 0.6, 0.012], [R + 0.52, 0.32, 0.01]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, w, 10, 128), glowMat('#5b8def', o));
      ring.quaternion.setFromUnitVectors(V(0, 0, 1), f.T);
      ring.position.copy(C(XN));
      ring.renderOrder = 8;
      root.add(ring);
    }
  }

  // ------------------------------------------------------------ Pulsos que viajan hacia el músculo
  const CAM = V(-1.9, 2.1, 7.3);
  const LOOK = V(0.4, 0.0, 0.2);
  const ZOOM = 1.75;
  const VD = CAM.clone().sub(LOOK).normalize(); // hacia la cámara
  const facing = (p, tan, r) => {
    const n = VD.clone().addScaledVector(tan, -VD.dot(tan)).normalize();
    return p.clone().addScaledVector(n, r);
  };
  // El fascículo motor se "enciende": estela azul hielo desde la aguja hasta el músculo
  const bTan = (t) => bCurve.getTangentAt(Math.min(1, Math.max(0, t)));
  const motorLine = (t) => facing(branchFn(t), bTan(t), FM.rf + 0.012);
  {
    const g = tubeFrom(branchFn, tNeedle, 0.99, 90, FM.rf + 0.022, 16);
    const m = new THREE.Mesh(g, pulseMat('#6f9cf2', 0.6, { profile: 'trail', rim: 1 }));
    m.renderOrder = 6;
    root.add(m);
    const g2 = tubeFrom(motorLine, tNeedle + 0.01, 0.985, 90, 0.012, 8);
    const m2 = new THREE.Mesh(g2, pulseMat('#dbe7ff', 0.85, { profile: 'trail' }));
    m2.renderOrder = 7;
    root.add(m2);
  }
  // Frente de onda suave alrededor del tronco, junto a la aguja
  for (const [x, o] of [[XN + 0.55, 0.3]]) {
    const g = tubeFrom((xx) => C(xx), x - 0.3, x + 0.3, 8, R + 0.03, 48);
    const m = new THREE.Mesh(g, pulseMat('#6f9cf2', o, { profile: 'band', rim: 1 }));
    m.renderOrder = 6;
    root.add(m);
  }
  // Pulsos (cabeza brillante, cola que se desvanece) a lo largo del fascículo motor
  const comet = (a, b, o) => {
    const g = tubeFrom(branchFn, a, b, 14, FM.rf + 0.04, 16);
    const m = new THREE.Mesh(g, pulseMat('#5b8def', o * 0.75, { rim: 1 }));
    m.renderOrder = 8;
    root.add(m);
    const g2 = tubeFrom(motorLine, a, b, 14, 0.026, 10);
    const m2 = new THREE.Mesh(g2, pulseMat('#ffffff', o));
    m2.renderOrder = 9;
    root.add(m2);
    for (const [c, s, oo] of [['#4f7fe8', 0.7, 0.45], ['#a9c7ff', 0.36, 0.9], ['#ffffff', 0.17, 1]]) {
      const h = halo(c, s, oo * o);
      h.position.copy(motorLine(a + (b - a) * 0.94));
      h.renderOrder = 9;
      root.add(h);
    }
  };
  {
    const span = 1 - tNeedle;
    for (const [u, len, o] of [[0.1, 0.12, 1], [0.38, 0.12, 0.95], [0.66, 0.11, 0.9]]) comet(tNeedle + span * u, tNeedle + span * (u + len), o);
  }

  // ------------------------------------------------------------ Sombra de contacto propia (suelo bajo músculo y nervio)
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
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: '#0a1530', transparent: true, opacity: 0.13, depthWrite: false }));
    sh.rotation.set(-Math.PI / 2, 0, 0.28);
    sh.scale.set(5.6, 2.0, 1);
    sh.position.set(1.5, -1.95, 0.7);
    root.add(sh);
  }

  return { root, cam: CAM.toArray(), look: LOOK.toArray(), zoom: ZOOM, shadow: false };
}
