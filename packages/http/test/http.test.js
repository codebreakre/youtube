import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import http, { HttpError, CancelToken } from '../src/index.js';

let server, base;

before(async () => {
  server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/slow') return setTimeout(() => res.end('late'), 300);
    if (url.pathname === '/text') return res.end('plain text');
    if (url.pathname === '/empty') return res.writeHead(204).end();
    const status = Number(url.searchParams.get('status')) || 200;
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Reply': 'yes' });
    res.end(JSON.stringify({ method: req.method, path: url.pathname, search: url.search, headers: req.headers, body, error: status >= 400 ? 'nope' : undefined }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('get with params, response shape', async () => {
  const res = await http.get(base + '/echo', { params: { q: 'big buck', tags: ['a', 'b'], skip: null } });
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-reply'], 'yes');
  assert.equal(res.data.method, 'GET');
  assert.equal(res.data.search, '?q=big+buck&tags[]=a&tags[]=b');
  assert.equal(res.config.method, 'get');
});

test('post sends JSON, callable instance, url+config form', async () => {
  const { data } = await http.post(base + '/echo', { videoId: 'x' });
  assert.equal(data.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(data.body), { videoId: 'x' });
  const r2 = await http({ url: base + '/echo', method: 'PUT', data: { a: 1 } });
  assert.equal(r2.data.method, 'PUT');
  const r3 = await http(base + '/echo', { method: 'delete' });
  assert.equal(r3.data.method, 'DELETE');
});

test('create: baseURL, default headers, isolation from parent', async () => {
  const api = http.create({ baseURL: base + '/api/', headers: { 'X-User-Id': 'u1' } });
  api.defaults.headers.common['X-Extra'] = '1';
  const { data } = await api.get('/videos');
  assert.equal(data.path, '/api/videos');
  assert.equal(data.headers['x-user-id'], 'u1');
  assert.equal(data.headers['x-extra'], '1');
  assert.equal(http.defaults.headers.common['X-Extra'], undefined);
  assert.equal(api.getUri({ url: '/s', params: { q: 1 } }), base + '/api/s?q=1');
});

test('interceptors: order, eject, response transform', async () => {
  const api = http.create({ baseURL: base });
  const order = [];
  api.interceptors.request.use((c) => (order.push('A'), c));
  const id = api.interceptors.request.use((c) => (order.push('X'), c));
  api.interceptors.request.use((c) => (order.push('B'), (c.headers['X-Token'] = 't'), c));
  api.interceptors.request.eject(id);
  api.interceptors.response.use((r) => r.data);
  const data = await api.get('/echo');
  assert.deepEqual(order, ['B', 'A']);
  assert.equal(data.headers['x-token'], 't');
});

test('errors: status, code, response data, validateStatus', async () => {
  await assert.rejects(http.get(base + '/echo?status=404'), (e) => {
    assert.ok(http.isHttpError(e) && e instanceof HttpError);
    assert.equal(e.response.status, 404);
    assert.equal(e.code, 'ERR_BAD_REQUEST');
    assert.equal(e.response.data.error, 'nope');
    return true;
  });
  await assert.rejects(http.get(base + '/echo?status=500'), { code: 'ERR_BAD_RESPONSE' });
  const ok = await http.get(base + '/echo?status=404', { validateStatus: () => true });
  assert.equal(ok.status, 404);
});

test('timeout, AbortController, CancelToken', async () => {
  await assert.rejects(http.get(base + '/slow', { timeout: 50 }), { code: 'ECONNABORTED', message: 'timeout of 50ms exceeded' });

  const ctrl = new AbortController();
  const p = http.get(base + '/slow', { signal: ctrl.signal });
  ctrl.abort();
  await assert.rejects(p, (e) => http.isCancel(e) && e.code === 'ERR_CANCELED');

  const source = CancelToken.source();
  const p2 = http.get(base + '/slow', { cancelToken: source.token });
  source.cancel('stop');
  await assert.rejects(p2, (e) => http.isCancel(e) && e.message === 'stop');
});

test('non-JSON text, 204, blobs and form data', async () => {
  assert.equal((await http.get(base + '/text')).data, 'plain text');
  assert.equal((await http.get(base + '/empty')).data, '');
  const blob = new Blob(['jpg'], { type: 'image/jpeg' });
  const r = await http.put(base + '/echo', blob);
  assert.equal(r.data.headers['content-type'], 'image/jpeg');
  assert.equal(r.data.body, 'jpg');
  const f = await http.postForm(base + '/echo', { a: '1' });
  assert.match(f.data.headers['content-type'], /^multipart\/form-data; boundary=/);
  const u = await http.post(base + '/echo', new URLSearchParams({ a: '1' }));
  assert.equal(u.data.body, 'a=1');
  assert.match(u.data.headers['content-type'], /x-www-form-urlencoded/);
});

test('all / spread / auth', async () => {
  const sum = await http.all([Promise.resolve(1), Promise.resolve(2)]).then(http.spread((a, b) => a + b));
  assert.equal(sum, 3);
  const { data } = await http.get(base + '/echo', { auth: { username: 'u', password: 'p' } });
  assert.equal(data.headers.authorization, 'Basic ' + Buffer.from('u:p').toString('base64'));
});
