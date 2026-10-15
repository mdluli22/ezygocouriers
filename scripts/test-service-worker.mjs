import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function loadWorker() {
  const handlers = {};
  const deleted = [];
  const cached = { cached: true };
  const context = {
    URL,
    Response,
    self: {
      location: { origin: 'https://ezygo.test' },
      addEventListener: (type, handler) => { handlers[type] = handler; },
      clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => ['ezygo-static-v3', 'ezygo-static-v4', 'unrelated-cache'],
      delete: async key => { deleted.push(key); return true; },
      match: async () => cached,
    },
    fetch: async () => { throw new Error('offline'); },
  };
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), context);
  function request(path, mode = 'cors') {
    let response;
    handlers.fetch({
      request: { method: 'GET', url: `https://ezygo.test${path}`, mode },
      respondWith: value => { response = value; },
    });
    return response;
  }
  return { handlers, deleted, cached, request };
}

test('application code and API requests bypass service worker caches', () => {
  const { request } = loadWorker();
  for (const path of ['/_next/static/chunks/app/dashboard/page.js', '/_next/static/css/app.css', '/_next/webpack-hmr', '/app.js', '/app.css', '/sw.js', '/api/deliveries']) {
    assert.equal(request(path), undefined, path);
  }
});

test('activation clears old EzyGo caches and preserves unrelated caches', async () => {
  const { handlers, deleted } = loadWorker();
  let completion;
  handlers.activate({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(deleted, ['ezygo-static-v3']);
});

test('static images and offline navigation retain their fallback', async () => {
  const { request, cached } = loadWorker();
  assert.equal(await request('/EzyGoIcon.png'), cached);
  assert.equal(await request('/dashboard', 'navigate'), cached);
});
