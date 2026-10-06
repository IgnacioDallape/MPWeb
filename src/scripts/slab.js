// Corte de tejido 3D en vivo (sección Descripción): gira solo, se puede arrastrar
// y las capas se separan a medida que la sección recorre la pantalla.
const box = document.getElementById('slab');
const canvas = document.getElementById('slab-canvas');

async function start() {
  if (!box || !canvas || canvas.dataset.ready) return;
  try {
    if (!document.createElement('canvas').getContext('webgl2')) return;
  } catch {
    return;
  }
  canvas.dataset.ready = '1';
  const [{ studio, tissueSlab }] = await Promise.all([import('./lab3d.js')]);
  const { renderer, scene, camera, THREE } = studio(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const slab = tissueSlab();
  const pivot = new THREE.Group();
  pivot.add(slab.root);
  slab.root.position.y = 0.9;
  scene.add(pivot);
  camera.fov = 30;
  camera.position.set(0, 2.2, 13.5);
  camera.lookAt(0, -0.2, 0);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Arrastre para girar
  let rotY = -0.62;
  let rotX = 0.42;
  let velY = 0;
  let dragging = false;
  let lx = 0;
  let ly = 0;
  box.addEventListener('pointerdown', (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    velY = (e.clientX - lx) * 0.008;
    rotY += velY;
    rotX = Math.max(0.05, Math.min(0.9, rotX + (e.clientY - ly) * 0.004));
    lx = e.clientX;
    ly = e.clientY;
  });
  const end = () => (dragging = false);
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  let running = true;
  let explode = 0;
  const frame = () => {
    const t = clock.getElapsedTime();
    if (!dragging) {
      velY *= 0.94;
      rotY += velY + (reduced ? 0.0012 : 0.0028);
    }
    pivot.rotation.set(rotX, rotY, 0);
    // Separación de capas según la posición de la sección en pantalla
    const r = box.getBoundingClientRect();
    const target = Math.min(1, Math.max(0, 1 - (r.top + r.height * 0.5) / innerHeight)) * 1.6 - 0.3;
    explode += (Math.min(1, Math.max(0, target)) - explode) * 0.08;
    slab.layers.forEach((g) => (g.position.y = g.userData.baseY - (g.userData.index - 1.5) * 0.55 * explode));
    slab.tipGlow.scale.setScalar(0.55 + Math.sin(t * 4) * 0.08);
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!e.isIntersecting) running = false;
  }).observe(box);
  requestAnimationFrame(frame);
  canvas.classList.remove('opacity-0');
  box.querySelector('[data-slab-poster]')?.classList.add('opacity-0');
}

// Se monta tras la primera interacción y cuando la sección se acerca a la pantalla.
let interacted = false;
let near = false;
const go = () => interacted && near && start();
['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'].forEach((ev) =>
  addEventListener(ev, () => ((interacted = true), go()), { passive: true, once: true })
);
if (box) {
  new IntersectionObserver(
    ([e], o) => {
      if (!e.isIntersecting) return;
      near = true;
      go();
      o.disconnect();
    },
    { rootMargin: '400px 0px' }
  ).observe(box);
}
