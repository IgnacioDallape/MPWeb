// Experiencias 3D en vivo (Three.js), cargadas sin frenar la página:
//  - Portada (#xp): tejido tendinoso animado (sin sonda ni aguja).
//  - Metodología (#metodo): la misma escena cuenta los 4 pasos con el scroll.
// Se cargan con la primera interacción del usuario; mientras tanto se ve un render fijo.
// Solo se dibuja la escena que está en pantalla.

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

const mobile = matchMedia('(max-width: 1023px)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let libs;
const loadLibs = () =>
  (libs ||= Promise.all([import('./scene3d.js'), import('gsap'), import('gsap/ScrollTrigger')]).then(([scene, g, st]) => {
    g.gsap.registerPlugin(st.ScrollTrigger);
    if (window.__lenis) window.__lenis.on('scroll', st.ScrollTrigger.update);
    return { createScene: scene.createScene, gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
  }));

async function mount(wrap, canvas, posterSel) {
  if (!wrap || !canvas || canvas.dataset.ready || !webglOK()) return null;
  canvas.dataset.ready = '1';
  const L = await loadLibs();
  const xp = L.createScene(canvas, { mobile });
  if (reduced) xp.calm?.();
  canvas.classList.remove('opacity-0');
  wrap.querySelector(posterSel)?.classList.add('opacity-0');
  new IntersectionObserver(([e]) => (e.isIntersecting ? xp.play() : xp.pause())).observe(wrap);
  document.addEventListener('visibilitychange', () => (document.hidden ? xp.pause() : xp.play()));
  return { xp, ...L };
}

// ---------------------------------------------------------------- Portada
async function startHero() {
  const wrap = document.getElementById('xp');
  const m = await mount(wrap, document.getElementById('xp-canvas'), '[data-xp-poster]');
  if (!m) return;
  const s = m.xp.state;
  // La portada muestra solo el tejido tendinoso (fibras animadas): la sonda y la aguja
  // aparecen recién en la sección Metodología.
  Object.assign(s, { insert: 0, energy: 0, scanOn: 0, scanAuto: 0, offsetX: mobile ? 0 : 1.5 });
  // En el celular el tejido se ubica debajo de los botones (la cámara mira más arriba).
  Object.assign(s.cam, mobile ? { x: 0, y: 3.9, z: 9.5 } : { x: -0.6, y: 0.9, z: 8.2 });
  Object.assign(s.look, mobile ? { x: 0.2, y: 3.0, z: 0 } : { x: 0.4, y: 0, z: 0 });
  // Al salir de la portada la cámara se acerca levemente
  m.gsap.to(s.cam, { z: mobile ? 8.5 : 7.2, y: mobile ? 3.9 : 1.3, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom top', scrub: 1 } });
}

// ---------------------------------------------------------------- Metodología (historia por scroll)
async function startStory() {
  const wrap = document.getElementById('metodo');
  const m = await mount(wrap, document.getElementById('metodo-canvas'), '[data-metodo-poster]');
  if (!m) return;
  const { xp, gsap, ScrollTrigger } = m;
  const s = xp.state;
  const L = xp.LESION_X;
  const off = (v) => (mobile ? 0 : v);
  // Estado inicial: tejido alterado, sin sonda ni aguja
  Object.assign(s, { insert: 0, energy: 0, scanOn: 0, scanAuto: 0, offsetX: off(1.3) });
  Object.assign(s.cam, { x: -1.4, y: 0.7, z: mobile ? 8.5 : 6.4 });
  Object.assign(s.look, { x: L, y: 0, z: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 1 } });
  // Introducción → Paso 1 · Evaluación: foco en la zona alterada
  tl.to(s.cam, { x: -1.0, y: 0.9, z: mobile ? 8 : 5.8 }, 0)
    // Paso 2 · Ecografía: la sonda baja y escanea hasta la zona alterada
    .set(s, { scanX: -3.2 }, 1)
    .to(s, { scanOn: 1, duration: 0.4 }, 1)
    .to(s, { scanX: L, duration: 1 }, 1)
    .to(s.cam, { x: 0.6, y: 2.4, z: mobile ? 9 : 6.6 }, 1)
    // Paso 3 · Intervención: la aguja llega al punto exacto y libera energía
    .to(s, { insert: 1, duration: 0.7 }, 2)
    .to(s, { energy: 1, duration: 0.4 }, 2.6)
    .to(s, { scanOn: 0.2, duration: 0.6 }, 2)
    .to(s.cam, { x: 2.2, y: 1.0, z: mobile ? 7 : 4.4 }, 2)
    .to(s.look, { x: L, y: 0.1 }, 2)
    // Paso 4 · Readaptación: el tejido se reorganiza y vuelve a tolerar carga
    .to(s, { energy: 0, insert: 0, duration: 0.5 }, 3)
    .to(s, { disorder: 0, scanAuto: 0.8, scanOn: 0.35, offsetX: off(1.5), duration: 1 }, 3)
    .to(s.cam, { x: 0, y: 1.3, z: mobile ? 11.5 : 9 }, 3)
    .to(s.look, { x: 0, y: 0 }, 3);
  ScrollTrigger.create({ trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: 1.2, animation: tl });

  const dots = [...wrap.querySelectorAll('[data-metodo-dot]')];
  wrap.querySelectorAll('[data-metodo-step]').forEach((el, i) =>
    ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 40%', onToggle: (st) => st.isActive && dots.forEach((d, j) => d.toggleAttribute('data-active', j === i)) })
  );
}

// ---------------------------------------------------------------- Disparadores
let interacted = false;
let storyNear = false;
const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];
const onFirst = () => {
  events.forEach((ev) => removeEventListener(ev, onFirst));
  interacted = true;
  startHero();
  if (storyNear) startStory();
};
events.forEach((ev) => addEventListener(ev, onFirst, { passive: true }));

// La historia se monta recién cuando la sección se acerca a la pantalla.
const metodo = document.getElementById('metodo');
if (metodo) {
  new IntersectionObserver(
    ([e], o) => {
      if (!e.isIntersecting) return;
      storyNear = true;
      if (interacted) startStory();
      o.disconnect();
    },
    { rootMargin: '600px 0px' }
  ).observe(metodo);
}

// Modo captura (solo desarrollo): ?render=poster genera el fotograma usado como imagen previa.
if (new URLSearchParams(location.search).get('render') === 'poster') {
  document.documentElement.classList.add('render-poster');
  startHero();
}
