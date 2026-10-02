// Ilustraciones SVG inline (sin requests, nítidas en cualquier pantalla, sin CLS).
// Reemplazables por fotografías reales (ver README → Imágenes).

function fibers({ x1, x2, yTop, yBottom, n, seed = 1 }) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const out = [];
  for (let i = 0; i < n; i++) {
    const y = yTop + ((yBottom - yTop) * i) / (n - 1) + (rnd() - 0.5) * 3;
    const a = (rnd() - 0.5) * 6;
    const o = (0.25 + rnd() * 0.5).toFixed(2);
    const w = (0.8 + rnd() * 1.4).toFixed(1);
    out.push(`<path d="M${x1} ${y.toFixed(1)} C ${x1 + 120} ${(y + a).toFixed(1)}, ${x2 - 160} ${(y - a).toFixed(1)}, ${x2} ${(y + a / 2).toFixed(1)}" stroke="#d9e6e6" stroke-opacity="${o}" stroke-width="${w}" fill="none"/>`);
  }
  return out.join('');
}

export function ultrasoundHero() {
  return `<svg viewBox="0 0 560 470" role="img" aria-labelledby="us-title us-desc" preserveAspectRatio="xMidYMid slice">
<title id="us-title">Fisioterapia invasiva ecoguiada</title>
<desc id="us-desc">Ilustración de una imagen de ecografía musculoesquelética: una aguja se dirige en tiempo real hacia una zona alterada dentro del tendón.</desc>
<defs>
  <clipPath id="us-clip"><rect x="36" y="58" width="404" height="376" rx="6"/></clipPath>
  <linearGradient id="us-depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4648"/><stop offset=".35" stop-color="#1b2427"/><stop offset="1" stop-color="#0c1214"/></linearGradient>
  <radialGradient id="us-lesion" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#05090a" stop-opacity=".95"/><stop offset=".7" stop-color="#0a1012" stop-opacity=".7"/><stop offset="1" stop-color="#0a1012" stop-opacity="0"/></radialGradient>
  <radialGradient id="us-tip" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7fe0d6" stop-opacity=".9"/><stop offset="1" stop-color="#7fe0d6" stop-opacity="0"/></radialGradient>
  <linearGradient id="us-shadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity=".98"/></linearGradient>
  <filter id="us-speckle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .85  0 0 0 0 .9  0 0 0 0 .9  0 0 0 1.1 -.42"/></filter>
</defs>
<rect width="560" height="470" fill="#11191c"/>
<g font-family="Manrope, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2" fill="#7e9599">
  <text x="36" y="38">LINEAL 12 MHz · MSK</text>
  <text x="440" y="38" text-anchor="end" fill="#7fe0d6">● GUÍA EN TIEMPO REAL</text>
</g>
<g clip-path="url(#us-clip)">
  <rect x="36" y="58" width="404" height="376" fill="url(#us-depth)"/>
  <rect x="36" y="58" width="404" height="34" fill="#8a9799" opacity=".35"/>
  <path d="M36 150 C 140 144, 300 156, 440 148" stroke="#e8f0f0" stroke-opacity=".55" stroke-width="3" fill="none"/>
  <path d="M36 182 C 150 176, 300 188, 440 180" stroke="#e8f0f0" stroke-opacity=".75" stroke-width="2.4" fill="none"/>
  ${fibers({ x1: 36, x2: 440, yTop: 190, yBottom: 268, n: 26, seed: 3 })}
  <path d="M36 276 C 150 270, 300 282, 440 274" stroke="#e8f0f0" stroke-opacity=".7" stroke-width="2.4" fill="none"/>
  <ellipse cx="292" cy="228" rx="62" ry="24" fill="url(#us-lesion)"/>
  <path d="M36 372 C 140 352, 300 350, 440 366" stroke="#f4f8f8" stroke-opacity=".9" stroke-width="5" fill="none"/>
  <path d="M36 372 C 140 352, 300 350, 440 366 L 440 434 L 36 434 Z" fill="url(#us-shadow)"/>
  <rect x="36" y="58" width="404" height="376" filter="url(#us-speckle)" opacity=".55"/>
  <line x1="44" y1="66" x2="284" y2="224" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="44" y1="74" x2="276" y2="226" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.5"/>
  <circle cx="285" cy="225" r="16" fill="url(#us-tip)"/>
</g>
<rect x="36" y="58" width="404" height="376" rx="6" fill="none" stroke="#2c3a3d"/>
<g stroke="#5f7478" stroke-width="1">
  ${Array.from({ length: 9 }, (_, i) => `<line x1="452" x2="${i % 2 ? 458 : 464}" y1="${66 + i * 45}" y2="${66 + i * 45}"/>`).join('')}
</g>
<g font-family="Manrope, system-ui, sans-serif" font-size="10" font-weight="700" fill="#5f7478">
  <text x="470" y="69">0</text><text x="470" y="159">1</text><text x="470" y="249">2</text><text x="470" y="339">3</text><text x="470" y="429">4 cm</text>
</g>
<g font-family="Manrope, system-ui, sans-serif" font-size="12" font-weight="700">
  <g fill="#cfe9e6"><text x="150" y="112">Aguja</text></g>
  <line x1="148" y1="116" x2="128" y2="122" stroke="#cfe9e6" stroke-opacity=".6"/>
  <g fill="#cfe9e6"><text x="350" y="208">Tendón</text></g>
  <g fill="#7fe0d6"><text x="230" y="300">Zona a tratar</text></g>
  <line x1="268" y1="288" x2="284" y2="252" stroke="#7fe0d6" stroke-opacity=".7"/>
  <g fill="#9fb4b8"><text x="60" y="398">Superficie ósea</text></g>
</g>
</svg>`;
}

// Esquema en capas (piel → músculo → tendón) con sonda y trayectoria de aguja. Tema claro.
export function layersFigure() {
  return `<svg viewBox="0 0 560 360" role="img" aria-labelledby="ly-title ly-desc">
<title id="ly-title">Cómo se guía la aguja con ecografía</title>
<desc id="ly-desc">Esquema de un corte de tejido con piel, tejido subcutáneo, músculo y tendón; una sonda de ecografía apoyada sobre la piel visualiza la aguja mientras avanza hacia la estructura objetivo.</desc>
<rect width="560" height="360" fill="#ffffff"/>
<rect x="0" y="120" width="560" height="22" fill="#f2e3d8"/>
<rect x="0" y="142" width="560" height="46" fill="#f8efe2"/>
<rect x="0" y="188" width="560" height="92" fill="#ecd9d6"/>
<g stroke="#d4b7b2" stroke-width="1.2" fill="none" opacity=".9">${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${200 + i * 12} C 140 ${194 + i * 12}, 420 ${206 + i * 12}, 560 ${198 + i * 12}"/>`).join('')}</g>
<rect x="0" y="280" width="560" height="34" fill="#e7f0f1"/>
<g stroke="#a9c3c7" stroke-width="1.2" fill="none">${Array.from({ length: 4 }, (_, i) => `<path d="M0 ${286 + i * 7} C 180 ${283 + i * 7}, 380 ${289 + i * 7}, 560 ${285 + i * 7}"/>`).join('')}</g>
<ellipse cx="350" cy="297" rx="44" ry="10" fill="#0d4a5a" opacity=".16"/>
<rect x="0" y="314" width="560" height="46" fill="#f4f4f1"/>
<path d="M300 120 l-18 -64 h76 l-18 64 Z" fill="#0d4a5a"/>
<rect x="276" y="40" width="88" height="20" rx="8" fill="#0a3541"/>
<path d="M300 122 L 270 314 M 340 122 L 370 314" stroke="#1f9e93" stroke-opacity=".5" stroke-dasharray="4 5"/>
<line x1="150" y1="70" x2="345" y2="296" stroke="#182023" stroke-width="2.4" stroke-linecap="round"/>
<line x1="150" y1="70" x2="128" y2="44" stroke="#5a666b" stroke-width="7" stroke-linecap="round"/>
<circle cx="346" cy="297" r="6" fill="#1f9e93"/>
<circle cx="346" cy="297" r="13" fill="none" stroke="#1f9e93" stroke-opacity=".45"/>
<g font-family="Manrope, system-ui, sans-serif" font-size="13" font-weight="700" fill="#3a4549">
  <text x="378" y="54">Sonda ecográfica</text>
  <text x="16" y="135" font-size="11" fill="#7a6a62">PIEL</text>
  <text x="16" y="170" font-size="11" fill="#7a6a62">TEJIDO SUBCUTÁNEO</text>
  <text x="16" y="240" font-size="11" fill="#8c5f5a">MÚSCULO</text>
  <text x="16" y="302" font-size="11" fill="#0d4a5a">TENDÓN</text>
  <text x="404" y="336" fill="#0d4a5a">Estructura objetivo</text>
  <text x="60" y="96">Aguja ultrafina</text>
</g>
<line x1="402" y1="330" x2="360" y2="304" stroke="#0d4a5a" stroke-opacity=".5"/>
</svg>`;
}
