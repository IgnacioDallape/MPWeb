// Markdown mínimo y predecible para el contenido editorial.
// Soporta: ## / ### / #### (con {#id} opcional), párrafos, listas -, listas 1.,
// citas/llamados con "> ", **negrita**, *cursiva*, [enlaces](/url/), tablas | a | b |,
// y bloques HTML crudos (líneas que empiezan con "<").
// Los ## generan la tabla de contenidos.

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,:;()"'«»/–—]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(text) {
  let out = esc(text);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    const attrs = external ? ' rel="noopener" target="_blank"' : '';
    return `<a href="${href}"${attrs}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return out;
}

export function markdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const toc = [];
  let i = 0;

  const isBlockStart = (l) =>
    /^#{2,4}\s/.test(l) || /^\s*[-*]\s/.test(l) || /^\s*\d+\.\s/.test(l) || /^>\s?/.test(l) || /^</.test(l) || /^\|/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const h = line.match(/^(#{2,4})\s+(.+?)(?:\s+\{#([\w-]+)\})?\s*$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const id = h[3] || slugify(text);
      if (level === 2) toc.push({ id, text });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^</.test(line)) {
      const block = [];
      while (i < lines.length && lines[i].trim()) block.push(lines[i++]);
      html.push(block.join('\n'));
      continue;
    }

    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
          body.map((r) => `<tr>${r.map((c, j) => (j === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('') +
          `</tbody></table></div>`
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const block = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) block.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<aside class="callout">${markdown(block.join('\n')).html}</aside>`);
      continue;
    }

    const ul = /^\s*[-*]\s/;
    const ol = /^\s*\d+\.\s/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !re.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return { html: html.join('\n'), toc };
}

export function wordCount(src) {
  return src.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}
