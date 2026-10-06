// Carga diferida de la experiencia 3D y su coreografía con el scroll.
// - Escritorio: se carga cuando el navegador queda libre (no compite con el LCP).
// - Celular: se muestra un render pre-generado y el 3D se carga al primer gesto del usuario.

const wrap = document.getElementById('xp');
const canvas = document.getElementById('xp-canvas');

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

async function start() {
  if (!wrap || !canvas || canvas.dataset.ready || !webglOK()) return;
  canvas.dataset.ready = '1';
  const mobile = matchMedia('(max-width: 1023px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [{ createScene }, { gsap }, { ScrollTrigger }] = await Promise.all([import('./scene3d.js'), import('gsap'), import('gsap/ScrollTrigger')]);
  const xp = createScene(canvas, { mobile });
  const s = xp.state;
  if (import.meta.env.DEV) window.__xp = xp;
  const desktopOffset = mobile ? 0 : 1.7;
  s.offsetX = desktopOffset;
  if (mobile) Object.assign(s.cam, { x: 0, y: 1.1, z: 10.5 });
  canvas.classList.remove('opacity-0');
  wrap.querySelector('[data-xp-poster]')?.classList.add('opacity-0');

  if (reduced) {
    xp.renderOnce();
    return;
  }

  // Pausar cuando no se ve (ahorra batería y CPU)
  new IntersectionObserver(([e]) => (e.isIntersecting ? xp.play() : xp.pause())).observe(wrap);
  document.addEventListener('visibilitychange', () => (document.hidden ? xp.pause() : xp.play()));

  gsap.registerPlugin(ScrollTrigger);
  if (window.__lenis) window.__lenis.on('scroll', ScrollTrigger.update);
  const L = xp.LESION_X;
  const off = (v) => (mobile ? 0 : v);
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 1 } });
  // Paso 1 · Evaluación: se retira la aguja, foco en el tejido alterado
  tl.to(s, { insert: 0, energy: 0, scanOn: 0, scanAuto: 0, offsetX: off(1.3) }, 0)
    .to(s.cam, { x: -1.4, y: 0.7, z: mobile ? 8.5 : 6.2 }, 0)
    .to(s.look, { x: L, y: 0, z: 0 }, 0)
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

  // Indicador de paso activo
  const dots = [...wrap.querySelectorAll('[data-xp-dot]')];
  wrap.querySelectorAll('[data-xp-step]').forEach((el, i) =>
    ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 40%', onToggle: (st) => st.isActive && dots.forEach((d, j) => d.toggleAttribute('data-active', j === i)) })
  );
}

if (wrap && canvas) {
  // Se carga con la primera interacción (mouse, rueda, toque o teclado): nunca compite con la carga inicial.
  const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];
  const once = () => {
    events.forEach((ev) => removeEventListener(ev, once));
    start();
  };
  events.forEach((ev) => addEventListener(ev, once, { passive: true }));
}

// Modo captura (solo desarrollo): ?render=poster genera el fotograma usado como imagen previa.
if (new URLSearchParams(location.search).get('render') === 'poster') {
  document.documentElement.classList.add('render-poster');
  start();
}
