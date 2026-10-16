// Pure helpers of the site build: report link rewriting and the local link check.
// build-site.mjs imports them; scripts/site-lib.test.mjs pins them.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve } from 'node:path';

// Top-level folders whose subfolders each hold one report: arena editions (runs/)
// and harness comparisons (harness/).
export const SECTIONS = ['runs', 'harness'];

export const REPORTS = [
  { source: 'README.md', target: 'report.html', lang: 'en' },
  { source: 'README.de.md', target: 'report.de.html', lang: 'de' },
];

// Repo-relative Markdown path -> site path. Edition and harness reports map to their HTML page,
// the repository README maps to the start page in the matching language.
export function siteTarget(repoPath) {
  if (repoPath === 'README.md') return { path: 'index.html', query: '?lang=en' };
  if (repoPath === 'README.de.md') return { path: 'index.html', query: '?lang=de' };
  const m = repoPath.match(/^([^/]+\/[^/]+)\/(README(?:\.de)?\.md)$/);
  if (m && SECTIONS.includes(m[1].split('/')[0])) {
    const report = REPORTS.find((r) => r.source === m[2]);
    return { path: `${m[1]}/${report.target}`, query: '' };
  }
  return null;
}

export function isLocal(href) {
  return href !== '' && !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('//') && !href.startsWith('#');
}

export function splitHref(href) {
  const m = href.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  return { path: m[1], query: m[2] ?? '', hash: m[3] ?? '' };
}

export function rewriteHref(href, fromDir) {
  if (!isLocal(href)) return href;
  const { path, query, hash } = splitHref(href);
  if (!path.endsWith('.md')) return href;
  const repoPath = posix.normalize(posix.join(fromDir, path));
  const target = siteTarget(repoPath);
  if (!target) return href; // left as is, the link check reports it
  let rel = posix.relative(fromDir, target.path);
  if (target.path === 'index.html') rel = rel.slice(0, -'index.html'.length) || './';
  return rel + (query || target.query) + hash;
}

// Numeric character references and the common named ones. Named references are
// case sensitive in HTML, so the lookup is exact; unknown ones stay as written.
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

export function decodeEntities(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (whole, ref) => {
    if (ref[0] === '#') {
      const hex = ref[1] === 'x' || ref[1] === 'X';
      const cp = parseInt(ref.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(cp) || cp > 0x10ffff) return whole;
      return String.fromCodePoint(cp);
    }
    return Object.hasOwn(NAMED, ref) ? NAMED[ref] : whole;
  });
}

// srcset per the HTML rule: each candidate's URL runs up to whitespace (so a data:
// URI with commas stays whole); a URL ending in commas ends the candidate, otherwise
// its descriptors run up to the next comma outside parentheses (a comma inside
// "(...)" belongs to the descriptor, an unclosed "(" runs to the end).
export function parseSrcset(value) {
  const urls = [];
  const n = value.length;
  let i = 0;
  while (i < n) {
    while (i < n && (/\s/.test(value[i]) || value[i] === ',')) i++;
    if (i >= n) break;
    const start = i;
    while (i < n && !/\s/.test(value[i])) i++;
    let url = value.slice(start, i);
    if (url.endsWith(',')) url = url.replace(/,+$/, '');
    else {
      let inParens = false;
      while (i < n) {
        const c = value[i];
        if (inParens) {
          if (c === ')') inParens = false;
        } else if (c === '(') inParens = true;
        else if (c === ',') break;
        i++;
      }
    }
    if (url) urls.push(url);
  }
  return urls;
}

// A start tag: a name, then an interior that begins with whitespace or '/' and holds
// quoted values or characters other than quotes, '<' and '>' (so a '>' inside a
// quoted value does not end the tag). Name and interior cannot match the same
// characters and an unquoted '<' ends a failed start, so the scan stays linear on
// unterminated input.
const TAG = /<[A-Za-z][^\s/<>"']*((?:[\s/](?:"[^"]*"|'[^']*'|[^"'<>])*)?)>/g;
// One attribute inside a tag interior: its name and an optional double-quoted,
// single-quoted or unquoted value. Quoted values are consumed whole, so text inside
// them is never read as another attribute.
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

// Every href, src and srcset value inside the start tags of an HTML string
// (double-quoted, single-quoted or unquoted), entity-decoded, with srcset split
// into candidate URLs. Attribute-like text outside a tag interior is ignored.
export function extractRefs(html) {
  const refs = [];
  for (const tag of html.matchAll(TAG)) {
    for (const m of tag[1].matchAll(ATTR)) {
      const name = m[1].toLowerCase();
      if (name !== 'href' && name !== 'src' && name !== 'srcset') continue;
      const raw = m[2] ?? m[3] ?? m[4];
      if (raw === undefined) continue;
      const value = decodeEntities(raw);
      if (name === 'srcset') refs.push(...parseSrcset(value));
      else refs.push(value);
    }
  }
  return refs;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Local links in every .html file under `out` that point at a missing file or
// outside `out`. Fragments (#...) are not validated.
export function checkLinks(out) {
  const broken = [];
  for (const file of walk(out).filter((f) => f.endsWith('.html'))) {
    for (const href of extractRefs(readFileSync(file, 'utf8'))) {
      if (!isLocal(href)) continue;
      let path;
      try {
        path = decodeURIComponent(splitHref(href).path);
      } catch {
        broken.push(`${relative(out, file)}: ${href} (malformed escape)`);
        continue;
      }
      let target = resolve(dirname(file), path || '.');
      const rel = relative(out, target);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        broken.push(`${relative(out, file)}: ${href} (outside _site)`);
        continue;
      }
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
      if (!existsSync(target)) broken.push(`${relative(out, file)}: ${href}`);
    }
  }
  return broken;
}
