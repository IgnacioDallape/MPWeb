// Capa de movimiento liviana: IntersectionObserver + transiciones CSS + Lenis (scroll suave).
// GSAP queda reservado para la experiencia 3D (se carga bajo demanda en xp.js).
// Todo es progresivo: sin JS o con "reducir movimiento" el contenido se ve completo.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = matchMedia('(min-width: 1060px)').matches;
const canHover = matchMedia('(hover: hover)').matches;

// ---------- Header: se compacta al scrollear
const header = document.getElementById('site-header');
const inner = header?.querySelector('[data-header-inner]');
let compact = null;
const onScroll = () => {
  const s = window.scrollY > 24;
  if (s === compact) return;
  compact = s;
  header.classList.toggle('is-compact', s);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- TOC: abierto en escritorio, resaltado de la sección activa
document.querySelectorAll('[data-toc]').forEach((d) => {
  if (desktop) d.open = true;
});
const tocLinks = [...document.querySelectorAll('[data-toc-link]')];
if (tocLinks.length) {
  const map = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        tocLinks.forEach((a) => a.removeAttribute('data-active'));
        map.get(e.target.id)?.setAttribute('data-active', '');
      }),
    { rootMargin: '-20% 0px -70% 0px' }
  );
  map.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
}

// ---------- Spotlight que sigue al cursor en las cards
if (canHover) {
  document.addEventListener(
    'pointermove',
    (e) => {
      const card = e.target.closest?.('[data-spotlight]');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - r.left}px`);
      card.style.setProperty('--y', `${e.clientY - r.top}px`);
    },
    { passive: true }
  );
}

if (reduced) {
  root.classList.remove('motion');
} else {
  // ---------- Revelado al entrar en pantalla (sin lecturas de layout: IntersectionObserver)
  const groups = new WeakMap();
  const reveal = new IntersectionObserver(
    (entries) => {
      let i = 0;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.style.transitionDelay = `${Math.min(i++, 6) * 70}ms`;
        el.classList.add('is-in');
        reveal.unobserve(el);
      });
    },
    { rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

  // ---------- Línea de progreso de la metodología
  document.querySelectorAll('[data-progress-line]').forEach((line) => {
    new IntersectionObserver(([e], o) => {
      if (e.isIntersecting) {
        line.classList.add('is-in');
        o.disconnect();
      }
    }, { threshold: 0.6 }).observe(line.parentElement);
  });

  // ---------- Botones magnéticos
  if (canHover) {
    document.querySelectorAll('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
      });
      b.addEventListener('pointerleave', () => (b.style.transform = ''));
    });
  }

  // ---------- Scroll suave (Lenis) cuando el navegador queda libre
  const initLenis = async () => {
    const { default: Lenis } = await import('lenis');
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    window.__lenis = lenis;
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        const el = id.length > 1 && document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -96 });
        history.replaceState(null, '', id);
      })
    );
  };
  if (canHover) {
    const go = () => ('requestIdleCallback' in window ? requestIdleCallback(initLenis, { timeout: 3000 }) : setTimeout(initLenis, 1500));
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  }
}

// ---------- Patologías de la home: en el celular cada grupo se abre al tocarlo
if (matchMedia('(max-width: 639px)').matches) {
  document.querySelectorAll('details[data-acc]').forEach((d) => {
    if (d.dataset.acc !== 'first') d.open = false;
  });
}

// ---------- Carruseles del celular: puntos que muestran la tarjeta visible
if (matchMedia('(max-width: 639px)').matches) {
  document.querySelectorAll('.carousel').forEach((c) => {
    const items = [...c.children];
    if (items.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'carousel-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = items.map(() => '<span></span>').join('');
    c.after(dots);
    const marks = [...dots.children];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && marks.forEach((m, i) => m.toggleAttribute('data-on', items[i] === e.target))),
      { root: c, threshold: 0.6 }
    );
    items.forEach((it) => io.observe(it));
  });
}
