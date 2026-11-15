import test from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, compile, cx } from '../src/html.js';

test('escapes interpolated text', () => {
  const { markup } = compile(html`<p>${'<b>"x"</b>'}</p>`);
  assert.equal(markup, '<p>&lt;b&gt;&quot;x&quot;&lt;/b&gt;</p>');
});

test('inlines nested templates, arrays and raw()', () => {
  const items = ['a', 'b'].map((x) => html`<li>${x}</li>`);
  const { markup } = compile(html`<ul>${items}</ul>${raw('<hr>')}${null}${false}`);
  assert.equal(markup, '<ul><li>a</li><li>b</li></ul><hr>');
});

test('event, property and boolean bindings', () => {
  const fn = () => {};
  const obj = { id: 1 };
  const { markup, handlers, props } = compile(
    html`<x-card .video=${obj} @click=${fn} ?hidden=${true} ?open=${false}></x-card>`,
  );
  assert.equal(markup, '<x-card data-p-0="" data-on-click="0" hidden ></x-card>');
  assert.deepEqual(handlers, [{ type: 'click', fn }]);
  assert.deepEqual(props, [{ name: 'video', value: obj }]);
});

test('query strings in attributes are not treated as bindings', () => {
  const { markup } = compile(html`<a href="/watch?v=${'abc'}">x</a>`);
  assert.equal(markup, '<a href="/watch?v=abc">x</a>');
});

test('cx joins class names', () => {
  assert.equal(cx('a', false && 'b', { c: true, d: false }), 'a c');
});
