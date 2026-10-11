import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkLinks, decodeEntities, extractRefs, parseSrcset, rewriteHref, siteTarget } from './site-lib.mjs';

const FROM = 'runs/2026-10-pilot';

test('siteTarget maps root READMEs and edition reports, nothing else', () => {
  assert.deepEqual(siteTarget('README.md'), { path: 'index.html', query: '?lang=en' });
  assert.deepEqual(siteTarget('README.de.md'), { path: 'index.html', query: '?lang=de' });
  assert.deepEqual(siteTarget('runs/2026-11-x/README.md'), { path: 'runs/2026-11-x/report.html', query: '' });
  assert.deepEqual(siteTarget('runs/2026-11-x/README.de.md'), { path: 'runs/2026-11-x/report.de.html', query: '' });
  assert.equal(siteTarget('runs/2026-11-x/notes.md'), null);
  assert.equal(siteTarget('docs/README.md'), null);
});

test('rewriteHref: sibling edition report', () => {
  assert.equal(rewriteHref('../2026-11-x/README.md', FROM), '../2026-11-x/report.html');
});

test('rewriteHref: other language of the same edition', () => {
  assert.equal(rewriteHref('README.de.md', FROM), 'report.de.html');
  assert.equal(rewriteHref('./README.md', FROM), 'report.html');
});

test('rewriteHref: root README with and without hash', () => {
  assert.equal(rewriteHref('../../README.md', FROM), '../../?lang=en');
  assert.equal(rewriteHref('../../README.de.md#setup', FROM), '../../?lang=de#setup');
});

test('rewriteHref: query and hash are preserved', () => {
  assert.equal(rewriteHref('../2026-11-x/README.md?x=1#h', FROM), '../2026-11-x/report.html?x=1#h');
  assert.equal(rewriteHref('../../README.md?lang=de#a', FROM), '../../?lang=de#a');
});

test('rewriteHref: non-Markdown, external and unmapped links stay as written', () => {
  assert.equal(rewriteHref('presentation.pdf', FROM), 'presentation.pdf');
  assert.equal(rewriteHref('https://example.com/README.md', FROM), 'https://example.com/README.md');
  assert.equal(rewriteHref('#top', FROM), '#top');
  assert.equal(rewriteHref('notes.md', FROM), 'notes.md');
});

test('parseSrcset keeps data: URIs whole and splits candidates per the HTML rule', () => {
  assert.deepEqual(parseSrcset('a.png 1x, b.png 2x'), ['a.png', 'b.png']);
  assert.deepEqual(parseSrcset('data:image/png;base64,AAAA 1x, b.png 2x'), ['data:image/png;base64,AAAA', 'b.png']);
  assert.deepEqual(parseSrcset('a.png,b.png'), ['a.png,b.png']);
  assert.deepEqual(parseSrcset('a.png, b.png'), ['a.png', 'b.png']);
  assert.deepEqual(parseSrcset('  , a.png 100w  ,  '), ['a.png']);
});

test('decodeEntities decodes numeric and common named references, leaves unknown ones', () => {
  assert.equal(decodeEntities('a&#46;html'), 'a.html');
  assert.equal(decodeEntities('a&#x2E;html'), 'a.html');
  assert.equal(decodeEntities('a&amp;b &quot;c&quot; &lt;&gt; &apos;'), 'a&b "c" <> \'');
  assert.equal(decodeEntities('&unknown; &AMP;'), '&unknown; &AMP;');
  assert.equal(decodeEntities('a&nbsp;b'), 'a\u00a0b');
});

test('extractRefs reads double-quoted, single-quoted and unquoted values', () => {
  const html = '<a href="a.html">x</a><img src=\'b.png\'><a href=c.html>y</a><img srcset="d.png 1x, e.png 2x">';
  assert.deepEqual(extractRefs(html), ['a.html', 'b.png', 'c.html', 'd.png', 'e.png']);
});

function site(files) {
  const dir = mkdtempSync(join(tmpdir(), 'lane-arena-site-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
  }
  return dir;
}

test('checkLinks: srcset data: candidate passes, a missing candidate fails', () => {
  const dir = site({
    'img/b.png': 'x',
    'ok.html': '<img srcset="data:image/png;base64,AAAA 1x, img/b.png 2x">',
    'bad.html': '<img srcset="data:image/png;base64,AAAA 1x, img/missing.png 2x">',
  });
  try {
    assert.deepEqual(checkLinks(dir), ['bad.html: img/missing.png']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkLinks: unquoted href is checked', () => {
  const dir = site({
    'there.html': 'x',
    'ok.html': '<a href=there.html>x</a>',
    'bad.html': '<a href=gone.html>x</a>',
  });
  try {
    assert.deepEqual(checkLinks(dir), ['bad.html: gone.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkLinks: character references are decoded before the existence check', () => {
  const dir = site({
    'a.html': 'x',
    'a&b.html': 'x',
    'ok.html': '<a href="a&#46;html">x</a><a href="a&amp;b.html">y</a>',
    'bad.html': '<a href="z&#46;html">x</a>',
  });
  try {
    assert.deepEqual(checkLinks(dir), ['bad.html: z.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkLinks: an edition with one language has no report.de.html to link to', () => {
  const dir = site({
    'runs/only-en/report.html': `<a href="${rewriteHref('README.de.md', 'runs/only-en')}">de</a>`,
  });
  try {
    assert.deepEqual(checkLinks(dir), ['runs/only-en/report.html: report.de.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkLinks: a link outside the site fails', () => {
  const dir = site({ 'ok.html': '<a href="../../etc/passwd">x</a>' });
  try {
    assert.deepEqual(checkLinks(dir), ['ok.html: ../../etc/passwd (outside _site)']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
