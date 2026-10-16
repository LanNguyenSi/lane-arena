// Builds the GitHub Pages site into _site/.
//
// Static files are copied from an allowlist (index.html, .nojekyll, runs/** and
// harness/** without Markdown). Every report (<section>/<name>/README.md and
// README.de.md, section runs or harness) is rendered to report.html and
// report.de.html next to the slides. Relative links in
// the reports are rewritten to their site targets, and the build fails when any local
// href, src or srcset (quoted or unquoted, entity-decoded, srcset split per the HTML rule)
// in the finished site points at a file that does not exist or lies
// outside _site. Fragments (#...) are not validated.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { REPORTS, SECTIONS, checkLinks, rewriteHref } from './site-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function page({ lang, title, body, homeHref }) {
  const kicker = lang === 'de' ? 'Lane-Arena' : 'Lane Arena';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { --bg: #f7f6f2; --fg: #1d1d1b; --muted: #6b6a64; --card: #ffffff; --line: #e2e0d8; --accent: #b4532a; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #161614; --fg: #ecebe6; --muted: #a09f98; --card: #201f1c; --line: #34332e; --accent: #e08a5f; }
}
:root[data-theme="dark"] { --bg: #161614; --fg: #ecebe6; --muted: #a09f98; --card: #201f1c; --line: #34332e; --accent: #e08a5f; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 40px 24px 72px; }
.kicker { color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; font-size: 13px; text-decoration: none; }
a { color: var(--accent); }
h1 { font-size: 38px; line-height: 1.15; margin: 20px 0 16px; letter-spacing: -0.02em; }
h2 { font-size: 24px; margin: 44px 0 12px; padding-top: 12px; border-top: 1px solid var(--line); }
h3 { font-size: 19px; margin: 28px 0 8px; }
code { font: 0.88em/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--card); border: 1px solid var(--line); border-radius: 4px; padding: 1px 4px; }
pre { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; overflow-x: auto; }
pre code { border: 0; padding: 0; background: none; }
.table-wrap { overflow-x: auto; margin: 16px 0; border: 1px solid var(--line); border-radius: 8px; background: var(--card); }
table { border-collapse: collapse; font-size: 15px; min-width: 100%; }
th, td { padding: 8px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
th { font-weight: 600; white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
blockquote { margin: 16px 0; padding: 4px 16px; border-left: 3px solid var(--accent); color: var(--muted); }
img { max-width: 100%; height: auto; }
footer { margin-top: 48px; color: var(--muted); font-size: 14px; }
footer a { color: var(--muted); }
@media (max-width: 600px) { main { padding: 28px 16px 56px; } h1 { font-size: 28px; } body { font-size: 16px; } }
</style>
</head>
<body>
<main>
<a class="kicker" href="${homeHref}">${kicker}</a>
${body}
<footer>${lang === 'de' ? 'Texte und Folien' : 'Texts and slides'}: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="https://github.com/LanNguyenSi/lane-arena">Repository</a></footer>
</main>
</body>
</html>
`;
}

function renderReport(fromDir, report) {
  const marked = new Marked({ gfm: true });
  marked.use({
    walkTokens(token) {
      if (token.type === 'link' || token.type === 'image') token.href = rewriteHref(token.href, fromDir);
    },
  });
  const md = readFileSync(join(root, fromDir, report.source), 'utf8');
  const h1 = md.match(/^# (.+)$/m);
  const title = h1 ? h1[1].replace(/[`*_]/g, '').trim() : fromDir;
  const body = marked
    .parse(md)
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>');
  const homeHref = `../../?lang=${report.lang}`;
  writeFileSync(join(out, fromDir, report.target), page({ lang: report.lang, title, body, homeHref }));
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of ['index.html', '.nojekyll']) cpSync(join(root, f), join(out, f));
const folders = [];
for (const section of SECTIONS) {
  if (!existsSync(join(root, section))) continue;
  cpSync(join(root, section), join(out, section), { recursive: true, filter: (src) => !src.endsWith('.md') });
  for (const name of readdirSync(join(root, section))) {
    if (statSync(join(root, section, name)).isDirectory()) folders.push(`${section}/${name}`);
  }
}
let rendered = 0;
for (const fromDir of folders) {
  for (const report of REPORTS) {
    if (!existsSync(join(root, fromDir, report.source))) continue;
    renderReport(fromDir, report);
    rendered++;
  }
}

const broken = checkLinks(out);
if (broken.length) {
  console.error(`Broken local links (${broken.length}):\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
console.log(`Built _site/: ${rendered} report page(s) from ${folders.length} folder(s), local links OK.`);
