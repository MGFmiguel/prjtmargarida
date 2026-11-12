import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const outputPath = resolve(root, 'DOCUMENTACAO-SISTEMA.pdf');
const generatedAt = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Manaus',
}).format(new Date());
const documents = [
  ['Visão geral do projeto', 'DOCUMENTACAO.md'],
  ['Manual de operação e manutenção', 'README.md'],
  ['Área da usuária', 'AREA-USUARIA.md'],
  ['Integração com o Supabase', 'INTEGRACAO-SUPABASE.md'],
];
const escapeHTML = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function inline(markdown) {
  const protectedParts = [];
  const stash = (html) => {
    const token = `@@PART${protectedParts.length}@@`;
    protectedParts.push(html);
    return token;
  };

  let result = markdown
    .replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHTML(code)}</code>`))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safeHref = escapeHTML(href);
      return stash(`<a href="${safeHref}">${escapeHTML(label)}</a>`);
    });
  result = escapeHTML(result)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/@@PART(\d+)@@/g, (_, index) => protectedParts[Number(index)]);
  return result;
}

function slug(text, counts) {
  const base = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'secao';
  const count = (counts.get(base) || 0) + 1;
  counts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

function parseMarkdown(markdown, headings, counts) {
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim().split(/\s+/)[0];
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      html.push(`<pre><code class="language-${escapeHTML(language || 'text')}">${escapeHTML(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^\|.*\|\s*$/.test(line) && /^\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      const splitRow = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      const headers = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(splitRow(lines[i++]));
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_, index) => `<td>${inline(row[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2];
      if (!(level === 1 && html.length === 0)) {
        const id = slug(title, counts);
        html.push(`<h${level} id="${id}">${inline(title)}</h${level}>`);
        if (level === 2 || level === 3) headings.push({ level, title, id });
      }
      i++;
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^[-*+]\s+/, ''))}</li>`);
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\d+\.\s+/, ''))}</li>`);
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(inline(lines[i++].replace(/^>\s?/, '')));
      html.push(`<blockquote>${quote.join('<br>')}</blockquote>`);
      continue;
    }

    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s|^```|^[-*+]\s|^\d+\.\s|^>\s?|^\|.*\|\s*$/.test(lines[i])) paragraph.push(lines[i++]);
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  return html.join('\n');
}

const chapterHeadings = [];
const ids = new Map();
const chapters = [];
for (const [title, filename] of documents) {
  let markdown = await readFile(resolve(root, filename), 'utf8');
  // The publishable key is public by design, but the PDF uses a placeholder so
  // this file can be shared without copying any environment-specific value.
  markdown = markdown.replace(/^(VITE_SUPABASE_PUBLISHABLE_KEY=).*$/gm, '$1<configure in .env>');
  const headings = [];
  const body = parseMarkdown(markdown, headings, ids);
  chapterHeadings.push({ title, id: slug(title, ids), level: 1 });
  chapters.push(`<section class="chapter"><h1>${escapeHTML(title)}</h1>${body}</section>`);
}

const toc = chapterHeadings.map(({ title, id }) => `<li><a href="#${id}">${escapeHTML(title)}</a></li>`).join('');
// Give each chapter a stable anchor that can be used by the table of contents.
const contents = chapters.map((chapter, index) => chapter.replace('<section class="chapter">', `<section class="chapter" id="${chapterHeadings[index].id}">`)).join('\n');
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Documentação do sistema — Casa Mamãe Margarida</title><style>
@page { size: A4; margin: 19mm 18mm 20mm; @bottom-left { content: "Casa Mamãe Margarida · Documentação do sistema"; color: #7c736d; font: 8pt Arial, sans-serif; } @bottom-right { content: "Página " counter(page); color: #7c736d; font: 8pt Arial, sans-serif; } }
* { box-sizing: border-box; } body { margin: 0; color: #292b28; font: 10pt/1.55 Arial, sans-serif; } a { color: #8b5661; text-decoration: none; overflow-wrap: anywhere; } h1,h2,h3,h4 { color: #613e43; line-height: 1.25; break-after: avoid; } h1 { font-size: 24pt; margin: 0 0 18pt; } h2 { font-size: 17pt; margin: 23pt 0 9pt; border-bottom: 1px solid #e8d7d3; padding-bottom: 4pt; } h3 { font-size: 13pt; margin: 17pt 0 7pt; } h4 { font-size: 11pt; margin: 12pt 0 5pt; } p { margin: 0 0 9pt; orphans: 3; widows: 3; } ul,ol { margin: 3pt 0 12pt; padding-left: 21pt; } li { margin: 2pt 0; } code { font: 8.5pt Consolas, monospace; background: #f3f0eb; padding: 1pt 3pt; border-radius: 2pt; overflow-wrap: anywhere; } pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 8pt/1.4 Consolas, monospace; background: #f5f3ef; border: 1px solid #e7e2d9; border-radius: 4pt; padding: 9pt; margin: 8pt 0 12pt; break-inside: avoid; } pre code { padding: 0; background: transparent; } blockquote { border-left: 3px solid #b88a89; margin: 8pt 0 12pt; padding: 3pt 10pt; color: #5e5550; } .table-wrap { margin: 8pt 0 13pt; } table { width: 100%; border-collapse: collapse; font-size: 8.5pt; } th,td { border: 1px solid #dfdad1; padding: 5pt 6pt; text-align: left; vertical-align: top; overflow-wrap: anywhere; } th { background: #f1e5df; color: #613e43; } tr { break-inside: avoid; } .cover { min-height: 245mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; } .cover .eyebrow { color: #9c6870; letter-spacing: 2px; font-size: 10pt; text-transform: uppercase; } .cover h1 { font-size: 34pt; margin: 16pt 0 8pt; } .cover p { color: #625d57; font-size: 13pt; max-width: 125mm; } .cover .date { margin-top: 30pt; font-size: 9pt; } .toc { page-break-after: always; } .toc h1 { margin-bottom: 15pt; } .toc ul { list-style: none; padding: 0; } .toc li { border-bottom: 1px solid #eee9e2; padding: 7pt 0; font-size: 11pt; } .chapter { page-break-before: always; } .chapter > h1:first-child { border-bottom: 2px solid #b88a89; padding-bottom: 10pt; } .chapter > h1:first-child + h1 { display: none; } .chapter > h2:first-of-type { margin-top: 13pt; }
</style></head><body><section class="cover"><div class="eyebrow">Manual técnico e operacional</div><h1>Casa Mamãe Margarida</h1><p>Documentação consolidada do site, painel de gestão, área da usuária, banco de dados, segurança e publicação.</p><p class="date">Gerado em ${generatedAt}</p><p class="date">Os estados e resultados de serviços externos descritos nos guias são registros da data indicada em cada documento e devem ser conferidos antes de executar procedimentos.</p></section><section class="toc"><h1>Conteúdo</h1><ul>${toc}</ul><p>Este PDF reúne a visão geral do projeto, o manual de operação, a documentação da área da usuária e as instruções de integração Supabase.</p></section>${contents}</body></html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
} finally {
  await browser.close();
}

console.log(`PDF gerado: ${outputPath}`);
