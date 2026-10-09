// Escena 3D en tiempo real (Three.js): tendón con fibras de colágeno, sonda ecográfica
// que escanea, aguja con partículas de energía y realineación de fibras.
// La escena se controla con un objeto `state` que anima el scroll (GSAP).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { probe as labProbe } from './lab3d.js';

const ICE = new THREE.Color('#ffffff');
const ICE_DEEP = new THREE.Color('#bdbdbd');
const LESION = new THREE.Color('#ff9a6b');
const LESION_POS = new THREE.Vector3(0.9, 0.06, 0.05);

const centerY = (x) => 0.12 * Math.sin(x * 0.35);

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- Fibras del tendón
function createFibers(count) {
  const SEG = 90;
  const X0 = -5.2;
  const X1 = 5.2;
  const pos = [];
  const seed = [];
  for (let f = 0; f < count; f++) {
    const r = Math.sqrt(Math.random());
    const th = Math.random() * Math.PI * 2;
    const oy = Math.sin(th) * r * 0.36;
    const oz = Math.cos(th) * r * 0.56;
    const s = Math.random();
    for (let i = 0; i < SEG; i++) {
      for (const k of [i, i + 1]) {
        const x = X0 + ((X1 - X0) * k) / SEG;
        const taper = 1 - 0.18 * Math.abs(x) / 5;
        pos.push(x, centerY(x) + oy * taper, oz * taper);
        seed.push(s);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDisorder: { value: 1 },
      uScanX: { value: -3 },
      uScanOn: { value: 0 },
      uLesionX: { value: LESION_POS.x },
      uEnergy: { value: 0 },
      uColor: { value: ICE.clone() },
      uDeep: { value: ICE_DEEP.clone() },
      uLesion: { value: LESION.clone() },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uDisorder, uScanX, uScanOn, uLesionX, uEnergy;
      varying float vScan, vLesion, vFade, vSeed;
      void main() {
        vec3 p = position;
        float x = p.x;
        float lesion = exp(-pow((x - uLesionX) / 1.15, 2.0));
        float dis = uDisorder * (0.18 + lesion * 0.82);
        float ph = aSeed * 6.2831;
        p.y += (sin(x * 2.4 + ph + uTime * 0.55) * 0.10 + sin(x * 7.3 + ph * 2.0) * 0.045) * dis;
        p.z += (cos(x * 1.8 + ph * 1.7 + uTime * 0.45) * 0.12) * dis;
        p.y += sin(uTime * 0.9 + x * 0.6) * 0.015;
        // pequeña vibración alrededor de la aguja cuando hay energía
        p += normalize(vec3(sin(ph*3.0), cos(ph*5.0), sin(ph*7.0))) * lesion * uEnergy * 0.025 * sin(uTime * 24.0 + ph);
        vScan = exp(-pow((x - uScanX) * 3.4, 2.0)) * uScanOn;
        vLesion = lesion * uDisorder;
        vFade = smoothstep(5.2, 3.4, abs(x));
        vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uDeep, uLesion;
      uniform float uEnergy;
      varying float vScan, vLesion, vFade, vSeed;
      void main() {
        vec3 col = mix(uDeep, uColor, 0.35 + vSeed * 0.65);
        col = mix(col, uLesion, vLesion * 0.75);
        col += vec3(0.95, 0.95, 0.95) * vScan * 0.7;
        col += uLesion * vLesion * uEnergy * 0.8;
        float a = (0.045 + vSeed * 0.05 + vScan * 0.16 + vLesion * 0.07) * vFade;
        gl_FragColor = vec4(col, a);
      }`,
  });
  return new THREE.LineSegments(geo, mat);
}

// ---------------------------------------------------------------- Vaina translúcida
function createSheath() {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = -5.4 + (10.8 * i) / 40;
    pts.push(new THREE.Vector3(x, centerY(x), 0));
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.5, 48, false);
  geo.scale(1, 0.82, 1.18);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: ICE_DEEP.clone() }, uScanX: { value: -3 }, uScanOn: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vX;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-(viewMatrix * wp).xyz);
        vX = position.x;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uScanX, uScanOn;
      varying vec3 vN; varying vec3 vV; varying float vX;
      void main() {
        float fres = pow(1.0 - abs(dot(vN, vV)), 2.5);
        float fade = smoothstep(5.4, 3.6, abs(vX));
        float ring = exp(-pow((vX - uScanX) * 6.0, 2.0)) * uScanOn;
        vec3 col = uColor * fres * 0.55 + vec3(0.92, 0.92, 0.92) * ring * 0.9;
        gl_FragColor = vec4(col, (fres * 0.12 + ring * 0.35) * fade);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

// ---------------------------------------------------------------- Sonda + plano de ultrasonido
function createProbe() {
  const group = new THREE.Group();
  // Mismo transductor que en los renders (cabezal con lente, cuello, mango y cable), cara de contacto en y = 0.78
  const body = labProbe({ gel: false });
  body.scale.setScalar(0.72);
  body.position.y = 0.78;
  group.add(body);

  // Plano de escaneo (trapecio) con líneas de barrido
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.78, -1.75);
  shape.lineTo(-0.78, -1.75);
  shape.closePath();
  const pg = new THREE.ShapeGeometry(shape);
  pg.rotateY(Math.PI / 2);
  const planeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.zy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOn; varying vec2 vP;
      void main(){
        float d = -vP.y / 1.75;
        float lines = 0.5 + 0.5 * sin(d * 90.0 - uTime * 10.0);
        float sweep = exp(-pow((fract(uTime * 0.35) - d) * 9.0, 2.0));
        float edge = smoothstep(0.62, 0.78, abs(vP.x) / (0.5 + 0.28 * d));
        float a = ((1.0 - d) * 0.035 + lines * 0.012 + sweep * 0.09 + edge * 0.1) * uOn;
        gl_FragColor = vec4(vec3(0.9, 0.9, 0.9), a);
      }`,
  });
  const plane = new THREE.Mesh(pg, planeMat);
  plane.position.y = 0.78;
  group.add(plane);
  group.userData = { planeMat };
  return group;
}

// ---------------------------------------------------------------- Aguja + energía
function createNeedle(glowTex) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3(-1, 1.05, 0.55).normalize();
  const shaftLen = 2.6;
  const metal = new THREE.MeshStandardMaterial({ color: '#e8eef8', metalness: 1, roughness: 0.18 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, shaftLen, 12), metal);
  shaft.position.y = shaftLen / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.42, 24), new THREE.MeshPhysicalMaterial({ color: '#cfe0ff', roughness: 0.25, transmission: 0.4, thickness: 0.2, clearcoat: 1 }));
  hub.position.y = shaftLen + 0.2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.5, 16), new THREE.MeshStandardMaterial({ color: '#1b2b4b', metalness: 0.4, roughness: 0.35 }));
  handle.position.y = shaftLen + 0.65;
  const needle = new THREE.Group();
  needle.add(shaft, hub, handle);
  needle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  group.add(needle);

  const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ICE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  tip.scale.setScalar(0.5);
  group.add(tip);

  // Partículas de energía (burbujas de la reacción electroquímica)
  const N = 520;
  const dirs = new Float32Array(N * 3);
  const ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection();
    dirs.set([v.x, v.y, v.z], i * 3);
    ph[i] = Math.random();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  pg.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
  pg.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const pm = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uEnergy: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aDir; attribute float aPh;
      uniform float uTime, uEnergy, uPx; varying float vA;
      void main(){
        float t = fract(uTime * (0.35 + aPh * 0.5) + aPh);
        vec3 p = aDir * (0.04 + t * 0.75) * uEnergy;
        p.y += t * t * 0.35 * uEnergy;
        vA = (1.0 - t) * uEnergy;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.5 + aPh * 3.5) * uPx * (4.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(0.95, 0.95, 0.95), (1.0 - d * 2.0) * vA); }`,
  });
  const sparks = new THREE.Points(pg, pm);
  group.add(sparks);
  group.userData = { dir, needle, tip, sparks };
  return group;
}

// ---------------------------------------------------------------- Polvo ambiental
function createDust(n) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 14 - 2], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: ICE, size: 0.022, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
}

// =================================================================== API
export function createScene(canvas, { mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio, mobile ? 1.4 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#7c7c7c', 0.05);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0.9, 11);

  scene.add(new THREE.AmbientLight('#e0e0e0', 0.35));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.PointLight('#ffffff', 30, 14);
  rim.position.set(-3, 1.5, -3);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const glowTex = radialTexture();
  const fibers = createFibers(mobile ? 150 : 300);
  const sheath = createSheath();
  const probe = createProbe();
  const needle = createNeedle(glowTex);
  const lesionGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: LESION, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  lesionGlow.position.copy(LESION_POS);
  lesionGlow.scale.set(1.5, 0.85, 1);
  const dust = createDust(mobile ? 500 : 1400);
  world.add(fibers, sheath, probe, needle, lesionGlow);
  scene.add(dust);

  let composer = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.45, 0.6));
    composer.addPass(new OutputPass());
  }

  // Estado animable desde afuera (scroll)
  const state = {
    disorder: 1,
    scanX: -3,
    scanOn: 1,
    scanAuto: 1,
    insert: 1,
    energy: 0.55,
    probeY: 0,
    cam: { x: 0, y: 1.2, z: 11 },
    look: { x: 0.6, y: 0, z: 0 },
    offsetX: 0,
  };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let calm = false;
  let speed = 1;
  addEventListener('pointermove', (e) => {
    if (calm) return;
    pointer.tx = e.clientX / innerWidth - 0.5;
    pointer.ty = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 48 : 34;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let running = true;
  let raf = 0;

  function frame() {
    const t = clock.getElapsedTime() * speed;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const scanX = state.scanAuto > 0 ? THREE.MathUtils.lerp(state.scanX, LESION_POS.x + Math.sin(t * 0.6) * 2.4, state.scanAuto) : state.scanX;
    const fu = fibers.material.uniforms;
    fu.uTime.value = t;
    fu.uDisorder.value = state.disorder;
    fu.uScanX.value = scanX;
    fu.uScanOn.value = state.scanOn;
    fu.uEnergy.value = state.energy;
    sheath.material.uniforms.uScanX.value = scanX;
    sheath.material.uniforms.uScanOn.value = state.scanOn;

    probe.position.set(scanX, 0.6 * (1 - state.scanOn) + state.probeY, 0);
    probe.visible = state.scanOn > 0.02;
    probe.userData.planeMat.uniforms.uTime.value = t;
    probe.userData.planeMat.uniforms.uOn.value = state.scanOn;
    probe.rotation.z = Math.sin(t * 0.8) * 0.04;

    const { dir, needle: n, tip, sparks } = needle.userData;
    const back = (1 - state.insert) * 3.2;
    tmp.copy(LESION_POS).addScaledVector(dir, back);
    n.position.copy(tmp);
    n.visible = state.insert > 0.01;
    tip.position.copy(tmp);
    tip.material.opacity = state.insert * (0.25 + state.energy * 0.45);
    tip.scale.setScalar(0.18 + state.energy * (0.32 + Math.sin(t * 9) * 0.08));
    sparks.position.copy(tmp);
    sparks.material.uniforms.uTime.value = t;
    sparks.material.uniforms.uEnergy.value = state.energy * state.insert;
    sparks.material.uniforms.uPx.value = dpr * 6;

    lesionGlow.material.opacity = 0.22 * state.disorder * (0.75 + Math.sin(t * 2.2) * 0.25) + state.energy * 0.12;
    dust.rotation.y = t * 0.012;

    world.position.x = state.offsetX;
    world.rotation.y = -0.38 + Math.sin(t * 0.15) * 0.06 + pointer.x * 0.22;
    world.rotation.z = -0.1;
    world.rotation.x = pointer.y * 0.08;
    camera.position.set(state.cam.x + pointer.x * 0.4, state.cam.y - pointer.y * 0.25, state.cam.z);
    camera.lookAt(state.look.x + state.offsetX * 0.5, state.look.y, state.look.z);

    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    state,
    LESION_X: LESION_POS.x,
    play() {
      if (running) return;
      running = true;
      clock.start();
      raf = requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    calm() {
      calm = true;
      speed = 0.55;
    },
    renderOnce() {
      running = false;
      frame();
    },
  };
}
