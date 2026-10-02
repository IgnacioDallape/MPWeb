// Iconografía lineal (stroke 1.6, 24x24). Decorativa por defecto (aria-hidden).
const P = {
  probe: '<path d="M9 3h6l1 7H8l1-7Z"/><path d="M8 10c0 3 1.5 5 4 5s4-2 4-5"/><path d="M12 15v6"/><path d="M5 18c2-1.2 4.5-1.8 7-1.8s5 .6 7 1.8"/>',
  needle: '<path d="m4 20 8.5-8.5"/><path d="m12.5 11.5 5-5"/><path d="m15 4 5 5"/><path d="m16.5 5.5-2 2"/><path d="M12.5 11.5 14 13"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  evaluation: '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 3.5h6v2.5H9z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
  activity: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M2 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0" opacity=".45"/>',
  bolt: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6L13 2Z"/>',
  nerve: '<path d="M12 3v6"/><path d="M12 9c-3 1-4 4-7 5"/><path d="M12 9c3 1 4 4 7 5"/><path d="M12 9v12"/><path d="M8.5 16.5 5 20M15.5 16.5 19 20"/><circle cx="12" cy="3" r="1"/>',
  muscle: '<path d="M4 17c1-6 4-11 9-12 3-.5 5 1.5 5 4 0 2-1.5 3.5-3.5 3.5"/><path d="M14.5 12.5c1.5 1.5 3 4.5 1 6.5-2.5 2.5-8 1.5-11.5-2"/><path d="M8 14c1.5-1 3-1 4.5 0"/>',
  tendon: '<path d="M6 3c0 6 1 9 3 12s2 4.5 2 6"/><path d="M10 3c0 6 1 9 3 12s2 4.5 2 6"/><path d="M14 3c0 5 .5 8 2 11"/>',
  foot: '<path d="M8 21c-2 0-3-1.5-3-3.5S6 13 6 10s1-6 4-6 4 2.5 4 5-1 3.5-1 6 1.5 3 1.5 4.5S13 21 11 21H8Z"/><circle cx="17" cy="5" r="1.2"/><circle cx="19" cy="8.5" r="1"/>',
  joint: '<circle cx="12" cy="12" r="3"/><path d="M4 4l5.9 5.9M14.1 14.1 20 20"/><path d="M3 7l4-4M17 21l4-4"/>',
  pulse: '<path d="M12 21s-7-4.5-7-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 16.5 12 21 12 21Z"/><path d="M7.5 12h2l1.5-2.5 2 5 1.5-2.5h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  phone: '<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  progress: '<path d="M4 20V14M10 20V10M16 20V6M22 20H2"/>',
};

const WA =
  '<path fill="currentColor" stroke="none" d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.8 2c0 1.2.9 2.3 1 2.5.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.2Z"/>';

export function icon(name, { size = 24, cls = 'icon', label } = {}) {
  const body = name === 'whatsapp' ? WA : P[name];
  if (!body) throw new Error(`Icono inexistente: ${name}`);
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}
