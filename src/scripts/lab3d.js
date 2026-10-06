// Modelos 3D procedurales (Three.js) para renders y escenas secundarias.
// Estilo: ilustración médica premium, materiales físicos brillantes, iluminación de estudio.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- Materiales
export const M = {
  tendon: () => new THREE.MeshPhysicalMaterial({ color: '#e6edf8', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, sheen: 1, sheenColor: new THREE.Color('#a9c7ff'), sheenRoughness: 0.4 }),
  tendonDeep: () => new THREE.MeshPhysicalMaterial({ color: '#b9cbe8', roughness: 0.38, clearcoat: 0.8 }),
  lesion: () => new THREE.MeshPhysicalMaterial({ color: '#ff9f73', roughness: 0.4, clearcoat: 0.6, emissive: new THREE.Color('#ff6a3d'), emissiveIntensity: 0.35 }),
  metal: () => new THREE.MeshStandardMaterial({ color: '#eef2f8', metalness: 1, roughness: 0.14 }),
  navy: () => new THREE.MeshPhysicalMaterial({ color: '#1b2b4b', metalness: 0.3, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
  hub: () => new THREE.MeshPhysicalMaterial({ color: '#cfe0ff', roughness: 0.2, transmission: 0.55, thickness: 0.3, clearcoat: 1 }),
  nerve: () => new THREE.MeshPhysicalMaterial({ color: '#ffd68f', roughness: 0.35, clearcoat: 1, emissive: new THREE.Color('#ffae42'), emissiveIntensity: 0.18 }),
  muscle: () => new THREE.MeshPhysicalMaterial({ color: '#d4797b', roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: new THREE.Color('#ffc2c2') }),
  bone: () => new THREE.MeshPhysicalMaterial({ color: '#f2ede4', roughness: 0.55, clearcoat: 0.4 }),
  glass: (color = '#a9c7ff') => new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, transmission: 0.85, thickness: 0.6, ior: 1.35, clearcoat: 1, transparent: true }),
  glow: (color = '#a9c7ff') => new THREE.MeshBasicMaterial({ color, toneMapped: false }),
  skin: () => new THREE.MeshPhysicalMaterial({ color: '#ead1c4', roughness: 0.55, clearcoat: 0.3, sheen: 0.5, sheenColor: new THREE.Color('#fff0e8') }),
  fat: () => new THREE.MeshPhysicalMaterial({ color: '#f2dfb5', roughness: 0.5, clearcoat: 0.5 }),
};

// ---------------------------------------------------------------- Utilidades
let seed = 7;
export const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
export const reseed = (s) => (seed = s);

// Haz de fibras (tendón, músculo, ligamento, nervio). profile(t) = factor de radio a lo largo (0..1).
export function fiberBundle({ length = 6, radius = 0.5, fibers = 46, fiberRadius = 0.055, twist = 0.35, bend = 0.12, profile = () => 1, segments = 90, squashY = 0.8, frayAt = null, frayAmount = 0 }) {
  const geos = [];
  for (let i = 0; i < fibers; i++) {
    const r = Math.sqrt(rnd()) * radius;
    const th0 = rnd() * Math.PI * 2;
    const jitter = rnd();
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const x = -length / 2 + t * length;
      const pr = profile(t);
      const th = th0 + x * twist;
      let y = Math.sin(th) * r * pr * squashY + Math.sin(x * 0.55) * bend;
      let z = Math.cos(th) * r * pr;
      if (frayAt !== null) {
        const d = Math.exp(-Math.pow((t - frayAt) / 0.09, 2)) * frayAmount;
        y += Math.sin(i * 1.7 + t * 30) * d * (0.5 + jitter);
        z += Math.cos(i * 2.3 + t * 26) * d * (0.5 + jitter);
      }
      pts.push(new THREE.Vector3(x, y, z));
    }
    const fr = fiberRadius * (0.7 + jitter * 0.6);
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segments, fr, 6, false));
  }
  return mergeGeometries(geos);
}

export function needle({ length = 3, withHub = true } = {}) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, length, 16), M.metal());
  shaft.position.y = length / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 16), M.metal());
  tip.rotation.x = Math.PI;
  tip.position.y = -0.04;
  g.add(shaft, tip);
  if (withHub) {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.5, 32), M.hub());
    hub.position.y = length + 0.25;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 24), M.navy());
    handle.position.y = length + 0.75;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 12, 32), M.glow('#a9c7ff'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = length + 0.02;
    g.add(hub, handle, ring);
  }
  return g;
}

// Orienta un objeto cuyo eje local Y apunta "hacia arriba" para que su origen (punta) quede en `tip` y apunte desde `dir`.
export function aim(obj, tip, dir) {
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  obj.position.copy(tip);
  return obj;
}

// Transductor lineal de ecografía, con la cara de contacto apoyada en y = 0.
// Cabezal ancho con lente convexa, cuello que se angosta, mango ergonómico, alivio de cable y gel.
export function probe({ gel = true } = {}) {
  const g = new THREE.Group();
  const shell = M.navy();
  const lensMat = new THREE.MeshPhysicalMaterial({ color: '#2b3546', roughness: 0.42, clearcoat: 0.5 });
  // Lente acústica (ligeramente convexa, cilindro aplastado a lo largo del cabezal)
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.18, 40), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.scale.set(1, 1, 0.42);
  lens.position.y = 0.072;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.16, 1.26, 6, 0.06), lensMat);
  frame.position.y = 0.13;
  // Cabezal
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.62, 1.36, 10, 0.2), shell);
  head.position.y = 0.48;
  // Banda de estado (luz)
  const band = new THREE.Mesh(new RoundedBoxGeometry(0.515, 0.04, 1.375, 6, 0.018), M.glow('#a9c7ff'));
  band.position.y = 0.26;
  // Cuello: transición del cabezal al mango (perfil torneado y aplastado)
  const neckPts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    neckPts.push(new THREE.Vector2(0.6 - 0.32 * Math.pow(t, 0.8), 0.7 + t * 0.55));
  }
  const neck = new THREE.Mesh(new THREE.LatheGeometry(neckPts, 48), shell);
  neck.scale.set(0.42, 1, 1.05);
  // Mango
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.75, 12, 32), shell);
  grip.scale.set(0.95, 1, 1.35);
  grip.position.y = 1.62;
  const gripLine = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.012, 10, 48), M.glow('#7ea8f5'));
  gripLine.rotation.x = Math.PI / 2;
  gripLine.scale.set(0.95, 1.35, 1);
  gripLine.position.y = 1.3;
  // Alivio de cable y cable
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, 0.42, 24), new THREE.MeshPhysicalMaterial({ color: '#2d3a55', roughness: 0.5 }));
  relief.position.y = 2.18;
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.35, 0), new THREE.Vector3(0.02, 2.8, -0.05), new THREE.Vector3(0.35, 3.25, -0.5), new THREE.Vector3(1.0, 3.55, -1.3), new THREE.Vector3(1.8, 3.65, -2.2)]), 64, 0.055, 14),
    new THREE.MeshPhysicalMaterial({ color: '#2d3a55', roughness: 0.45, clearcoat: 0.6 })
  );
  g.add(frame, lens, head, band, neck, grip, gripLine, relief, cable);
  if (gel) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M.glass('#dfeaff'));
    blob.scale.set(0.62, 0.09, 1.45);
    blob.position.y = -0.005;
    g.add(blob);
  }
  return g;
}

export function sparks({ count = 26, spread = 0.45, size = 0.025, color = '#cfe0ff' } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 12, 12);
  for (let i = 0; i < count; i++) {
    const s = new THREE.Mesh(geo, M.glow(color));
    const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).normalize().multiplyScalar(0.06 + rnd() * spread);
    s.position.copy(v);
    s.scale.setScalar(size * (0.5 + rnd()));
    g.add(s);
  }
  return g;
}

export function halo(color = '#a9c7ff', size = 1, opacity = 0.9) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

export function rings(color = '#ffd68f', n = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.32 + i * 0.2, 0.012, 10, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 - i * 0.22, toneMapped: false }));
    g.add(r);
  }
  return g;
}

export function capsule(r, len, mat) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, 32), mat);
}

// ---------------------------------------------------------------- Composiciones
const tendonGroup = ({ lesion = true, fray = 0.12, length = 6 } = {}) => {
  reseed(11);
  const g = new THREE.Group();
  const main = new THREE.Mesh(fiberBundle({ length, radius: 0.5, fibers: 52, frayAt: lesion ? 0.56 : null, frayAmount: fray }), M.tendon());
  g.add(main);
  if (lesion) {
    reseed(5);
    const frayed = new THREE.Mesh(fiberBundle({ length: 1.1, radius: 0.32, fibers: 12, fiberRadius: 0.045, twist: 2.2, bend: 0.02, profile: (t) => Math.sin(Math.PI * t) }), M.lesion());
    frayed.position.x = length * 0.06;
    g.add(frayed);
    const h = halo('#ff9a6b', 1.6, 0.45);
    h.position.set(length * 0.06, 0.05, 0.3);
    g.add(h);
  }
  return g;
};

const contactShadow = (w = 5, y = -1.25) => {
  const s = halo('#0a1530', 1, 0.22);
  s.scale.set(w, w * 0.18, 1);
  s.position.y = y;
  return s;
};

export const SCENES = {
  // ---- Tratamientos
  epi() {
    const root = new THREE.Group();
    root.add(tendonGroup());
    const tip = new THREE.Vector3(0.36, 0.08, 0.1);
    root.add(aim(needle(), tip, new THREE.Vector3(-0.9, 1.1, 0.7)));
    const sp = sparks({ count: 34, spread: 0.5 });
    sp.position.copy(tip);
    root.add(sp);
    const h = halo('#cfe0ff', 1.1, 0.95);
    h.position.copy(tip);
    root.add(h);
    return { root, cam: [2.2, 1.9, 6.4], look: [0.1, 0.25, 0] };
  },
  mep() {
    const root = new THREE.Group();
    root.add(tendonGroup({ fray: 0.06 }));
    const tip = new THREE.Vector3(0.36, 0.1, 0.12);
    root.add(aim(needle(), tip, new THREE.Vector3(-0.6, 1.2, 0.5)));
    const sp = sparks({ count: 60, spread: 0.32, size: 0.012, color: '#e3ecff' });
    sp.position.copy(tip);
    root.add(sp);
    const h = halo('#a9c7ff', 0.7, 0.8);
    h.position.copy(tip);
    root.add(h);
    return { root, cam: [-2.4, 1.6, 6.2], look: [0.1, 0.25, 0] };
  },
  nmp() {
    reseed(21);
    const root = new THREE.Group();
    const nerve = new THREE.Mesh(fiberBundle({ length: 6, radius: 0.28, fibers: 26, fiberRadius: 0.05, twist: 0.6, bend: 0.25 }), M.nerve());
    root.add(nerve);
    const sheath = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 5.4, 12, 48), M.glass('#ffe2a8'));
    sheath.rotation.z = Math.PI / 2;
    sheath.scale.set(1, 1, 0.85);
    root.add(sheath);
    const tip = new THREE.Vector3(0.2, 0.42, 0.25);
    root.add(aim(needle(), tip, new THREE.Vector3(0.2, 1, 0.55)));
    const rg = rings('#ffd68f', 3);
    rg.rotation.y = Math.PI / 2;
    rg.position.set(0.2, 0.05, 0);
    root.add(rg);
    const h = halo('#ffe0a0', 1.2, 0.8);
    h.position.copy(tip);
    root.add(h);
    return { root, cam: [1.6, 1.7, 6.2], look: [0.1, 0.2, 0] };
  },
  puncion() {
    reseed(31);
    const root = new THREE.Group();
    const prof = (t) => Math.pow(Math.sin(Math.PI * t), 0.8) * 1.0 + 0.08;
    const muscle = new THREE.Mesh(fiberBundle({ length: 5.4, radius: 0.85, fibers: 64, fiberRadius: 0.075, twist: 0.12, bend: 0.06, profile: prof, squashY: 0.75 }), M.muscle());
    root.add(muscle);
    reseed(33);
    const tendL = new THREE.Mesh(fiberBundle({ length: 1.4, radius: 0.16, fibers: 14, fiberRadius: 0.04, twist: 0.3, bend: 0 }), M.tendon());
    tendL.position.x = -3.3;
    const tendR = tendL.clone();
    tendR.position.x = 3.3;
    root.add(tendL, tendR);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), M.lesion());
    knot.position.set(0.5, 0.35, 0.55);
    knot.scale.set(1.2, 0.8, 0.9);
    root.add(knot);
    const tip = new THREE.Vector3(0.5, 0.4, 0.62);
    root.add(aim(needle(), tip, new THREE.Vector3(-0.4, 1.1, 0.8)));
    const rg = rings('#ffc2b0', 2);
    rg.position.copy(tip);
    rg.lookAt(new THREE.Vector3(2, 3, 6));
    root.add(rg);
    return { root, cam: [1.4, 2.2, 7], look: [0.2, 0.2, 0] };
  },

  // ---- Categorías de patologías
  tendinosas() {
    const root = new THREE.Group();
    const t = tendonGroup({ fray: 0.16 });
    t.rotation.z = 0.25;
    root.add(t);
    return { root, cam: [1.4, 1.2, 6.4], look: [0, 0.1, 0] };
  },
  fascia() {
    reseed(41);
    const root = new THREE.Group();
    // Calcáneo (talón), arco de metatarsianos en abanico y la fascia plantar por debajo
    const heel = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.95, 0.9, 6, 0.4), M.bone());
    heel.position.set(-2.3, 0.15, 0);
    heel.rotation.z = 0.25;
    root.add(heel);
    const mid = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.55, 1.1, 6, 0.25), M.bone());
    mid.position.set(-1.05, 0.62, 0);
    mid.rotation.z = -0.18;
    root.add(mid);
    for (let i = 0; i < 5; i++) {
      const z = (i - 2) * 0.27;
      const mt = capsule(0.11 - Math.abs(i - 2) * 0.008, 1.5 - Math.abs(i - 2) * 0.12, M.bone());
      mt.rotation.z = Math.PI / 2 - 0.32;
      mt.position.set(0.55, 0.5, z);
      const ph = capsule(0.085, 0.5, M.bone());
      ph.rotation.z = Math.PI / 2 + 0.08;
      ph.position.set(1.75, 0.15, z * 1.05);
      root.add(mt, ph);
    }
    reseed(43);
    const bandGeo = fiberBundle({ length: 4.2, radius: 0.5, fibers: 36, fiberRadius: 0.04, twist: 0.05, bend: 0, squashY: 0.22, profile: (t) => 0.55 + t * 0.6, frayAt: 0.1, frayAmount: 0.06 });
    const band = new THREE.Mesh(bandGeo, M.tendon());
    band.position.set(-0.05, -0.32, 0);
    band.rotation.z = 0.1;
    root.add(band);
    const h = halo('#ff9a6b', 1.2, 0.55);
    h.position.set(-1.95, -0.32, 0.5);
    root.add(h);
    return { root, cam: [1.2, 1.6, 6.8], look: [-0.2, 0.15, 0] };
  },
  musculares() {
    reseed(51);
    const root = new THREE.Group();
    const prof = (t) => Math.pow(Math.sin(Math.PI * t), 0.8) + 0.06;
    root.add(new THREE.Mesh(fiberBundle({ length: 5.6, radius: 0.9, fibers: 70, fiberRadius: 0.075, twist: 0.1, bend: 0.05, profile: prof, squashY: 0.78, frayAt: 0.6, frayAmount: 0.16 }), M.muscle()));
    const h = halo('#ffd0c0', 1.6, 0.5);
    h.position.set(0.6, 0.1, 0.6);
    root.add(h);
    return { root, cam: [1.2, 1.6, 7], look: [0, 0, 0] };
  },
  ligamentarias() {
    reseed(61);
    const root = new THREE.Group();
    const b1 = capsule(0.62, 1.8, M.bone());
    b1.position.set(-1.65, 0, 0);
    b1.rotation.z = Math.PI / 2;
    const b2 = b1.clone();
    b2.position.x = 1.65;
    root.add(b1, b2);
    const lig = new THREE.Mesh(fiberBundle({ length: 1.6, radius: 0.22, fibers: 22, fiberRadius: 0.035, twist: 0.25, bend: 0, squashY: 0.4, frayAt: 0.5, frayAmount: 0.05 }), M.tendon());
    lig.position.set(0, 0.25, 0.52);
    const lig2 = lig.clone();
    lig2.position.set(0, -0.3, 0.5);
    lig2.rotation.z = 0.15;
    root.add(lig, lig2);
    const h = halo('#ff9a6b', 0.9, 0.55);
    h.position.set(0, 0.25, 0.9);
    root.add(h);
    return { root, cam: [1.4, 1.4, 6.2], look: [0, 0, 0] };
  },
  bursas() {
    reseed(71);
    const root = new THREE.Group();
    const bone = capsule(0.8, 2.4, M.bone());
    bone.rotation.z = Math.PI / 2;
    bone.position.y = -0.85;
    root.add(bone);
    const t = new THREE.Mesh(fiberBundle({ length: 5.4, radius: 0.3, fibers: 30, fiberRadius: 0.045, bend: 0.05 }), M.tendon());
    t.position.y = 0.55;
    root.add(t);
    const bursa = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 48), M.glass('#ffb08a'));
    bursa.scale.set(1.6, 0.42, 1);
    bursa.position.y = 0.06;
    root.add(bursa);
    const h = halo('#ff9a6b', 1.4, 0.4);
    h.position.set(0, 0.05, 0.6);
    root.add(h);
    return { root, cam: [1.2, 1.6, 6.4], look: [0, -0.05, 0] };
  },
  dolor() {
    reseed(81);
    const root = new THREE.Group();
    const mat = M.nerve();
    const branch = (from, dir, len, r, depth) => {
      const to = from.clone().add(dir.clone().multiplyScalar(len));
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(len * 0.25));
      root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 24, r, 10), mat));
      if (depth > 0) {
        for (let k = 0; k < 2; k++) {
          const nd = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), (k ? 1 : -1) * (0.45 + rnd() * 0.3)).applyAxisAngle(new THREE.Vector3(1, 0, 0), (rnd() - 0.5) * 0.8);
          branch(to, nd, len * 0.72, r * 0.68, depth - 1);
        }
      } else {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r * 2.4, 16, 16), M.glow('#ffd68f'));
        s.position.copy(to);
        root.add(s);
      }
    };
    branch(new THREE.Vector3(-2.6, -0.6, 0), new THREE.Vector3(1, 0.25, 0), 1.6, 0.11, 4);
    const h = halo('#ffd68f', 2.4, 0.35);
    h.position.set(0.2, 0.3, 0);
    root.add(h);
    return { root, cam: [0.4, 0.6, 7.2], look: [0.3, 0.3, 0] };
  },

  // ---- Otros
  slab() {
    const s = tissueSlab();
    s.root.rotation.set(0.42, -0.62, 0);
    s.root.position.y = 0.9;
    return { root: s.root, cam: [0, 0.4, 9.5], look: [0, 0, 0], zoom: 1.05 };
  },
  probe() {
    const root = new THREE.Group();
    const p = probe();
    p.rotation.set(0.15, -0.6, -0.25);
    p.position.y = -1.2;
    root.add(p);
    const h = halo('#a9c7ff', 1.6, 0.55);
    h.position.set(0, -1.1, 0.3);
    root.add(h);
    return { root, cam: [0.4, 0.8, 6], look: [0, 0.2, 0] };
  },
};

// ---------------------------------------------------------------- Corte de tejido en capas (escena en vivo)
export function tissueSlab() {
  const root = new THREE.Group();
  const W = 4.2;
  const D = 2.6;
  const layers = [
    { name: 'piel', h: 0.22, mat: M.skin() },
    { name: 'tejido subcutáneo', h: 0.55, mat: M.fat() },
    { name: 'músculo', h: 0.95, mat: M.muscle() },
    { name: 'tendón', h: 0.42, mat: M.tendonDeep() },
  ];
  let y = 0;
  const groups = [];
  layers.forEach((l, i) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new RoundedBoxGeometry(W, l.h, D, 4, 0.06), l.mat);
    g.add(box);
    // Fibras visibles en la cara frontal de músculo y tendón
    if (l.name === 'músculo' || l.name === 'tendón') {
      reseed(90 + i);
      const fib = new THREE.Mesh(
        fiberBundle({ length: W * 0.96, radius: l.h * 0.42, fibers: l.name === 'músculo' ? 28 : 22, fiberRadius: l.name === 'músculo' ? 0.045 : 0.03, twist: 0.05, bend: 0.02, squashY: 1 }),
        l.name === 'músculo' ? M.muscle() : M.tendon()
      );
      fib.scale.z = 0.25;
      fib.position.z = D / 2 + 0.02;
      g.add(fib);
    }
    y -= l.h / 2;
    g.position.y = y;
    g.userData.baseY = y;
    g.userData.index = i;
    y -= l.h / 2;
    root.add(g);
    groups.push(g);
  });
  // Zona objetivo en el tendón
  const tendonY = groups[3].userData.baseY;
  const target = halo('#ff9a6b', 0.9, 0.85);
  target.position.set(0.6, tendonY, D / 2 + 0.1);
  groups[3].add(target);
  target.position.y = 0;
  // Sonda apoyada sobre la piel, encima de la zona objetivo; viaja con la capa de piel
  const p = probe();
  p.scale.setScalar(0.62);
  p.position.set(0.6, layers[0].h / 2 + 0.004, D / 2 - 0.62);
  p.rotation.y = Math.PI / 2;
  groups[0].add(p);
  // Aguja hacia la zona objetivo
  const tip = new THREE.Vector3(0.6, tendonY, D / 2 + 0.04);
  const nd = needle({ length: 3.2 });
  aim(nd, tip, new THREE.Vector3(-1, 1.25, 0.35));
  root.add(nd);
  const tipGlow = halo('#cfe0ff', 0.6, 0.95);
  tipGlow.position.copy(tip);
  root.add(tipGlow);
  return { root, layers: groups, needle: nd, tip, tipGlow, probe: p };
}

// ---------------------------------------------------------------- Renderer de estudio
export function studio(canvas, { alpha = true, exposure = 1.05 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight('#7ea8f5', 2.2);
  rim.position.set(-5, 2, -4);
  const fill = new THREE.HemisphereLight('#dfe8ff', '#1b2b4b', 0.6);
  scene.add(key, rim, fill);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  return { renderer, scene, camera, THREE };
}

// Paquete de herramientas para los modelos de src/scripts/models/*.js
export const LIB = { THREE, M, fiberBundle, needle, aim, probe, sparks, halo, rings, capsule, rnd, reseed, RoundedBoxGeometry, mergeGeometries };
