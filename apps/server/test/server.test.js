import test from 'node:test';
import assert from 'node:assert/strict';
import { Trie } from '../src/lib/trie.js';
import { parseRange } from '../src/lib/stream.js';
import { SearchIndex, normalize } from '../src/search.js';

test('trie returns weighted prefix matches', () => {
  const t = new Trie();
  t.insert('big buck bunny', 'big buck bunny', 10);
  t.insert('bunny', 'big buck bunny', 3);
  t.insert('blender', 'blender', 5);
  assert.deepEqual(t.find('b').map((x) => x.value), ['big buck bunny', 'blender']);
  assert.deepEqual(t.find('bun').map((x) => x.value), ['big buck bunny']);
  assert.deepEqual(t.find('zzz'), []);
});

test('parseRange handles open, closed, suffix and invalid ranges', () => {
  assert.equal(parseRange(undefined, 100), null);
  assert.deepEqual(parseRange('bytes=0-', 100, 10), { start: 0, end: 9 }); // capped chunk
  assert.deepEqual(parseRange('bytes=95-', 100, 10), { start: 95, end: 99 });
  assert.deepEqual(parseRange('bytes=10-19', 100), { start: 10, end: 19 });
  assert.deepEqual(parseRange('bytes=-5', 100), { start: 95, end: 99 });
  assert.equal(parseRange('bytes=200-', 100), 'invalid');
  assert.equal(parseRange('bytes=0-1,5-6', 100), null);
});

const videos = [
  { id: 'a', title: 'Big Buck Bunny', channel: 'Blender Foundation', category: 'Animation', tags: ['animation'], description: 'rabbit', baseViews: 100 },
  { id: 'b', title: 'Volkswagen GTI Review', channel: 'Garage419', category: 'Cars', tags: ['cars', 'hot hatch'], description: 'fast car', baseViews: 50 },
];

test('search ranks by title, tags and channel', () => {
  const idx = new SearchIndex(videos);
  assert.deepEqual(idx.search('bunny').map((v) => v.id), ['a']);
  assert.deepEqual(idx.search('garage').map((v) => v.id), ['b']);
  assert.deepEqual(idx.search('hot hatch').map((v) => v.id), ['b']);
  assert.deepEqual(idx.search(''), []);
});

test('suggest mixes own history, catalog and global queries', () => {
  const idx = new SearchIndex(videos);
  const s = idx.suggest('b', { own: ['blender tutorial'], queries: { 'bunny song': 3 } });
  assert.equal(s[0].text, 'blender tutorial');
  assert.equal(s[0].kind, 'history');
  const texts = s.map((x) => x.text);
  assert.ok(texts.includes('big buck bunny'));
  assert.ok(texts.includes('bunny song'));
  // mid-title word suggests the full title
  assert.ok(idx.suggest('rev').some((x) => x.text === 'volkswagen gti review'));
});

test('normalize strips accents and punctuation', () => {
  assert.equal(normalize('  Héllo, World!! '), 'hello world');
});
