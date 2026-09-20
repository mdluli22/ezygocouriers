import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
const root = new URL('../app/api/', import.meta.url);
async function routes(dir) {
  const found = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.isDirectory()) found.push(...await routes(new URL(item.name + '/', dir)));
    else if (item.name === 'route.ts') found.push(new URL(item.name, dir));
  }
  return found;
}
test('every exported API method is wrapped and inventoried with request/response/auth/errors', async () => {
  const inventory = JSON.parse(await readFile(new URL('../../../docs/api-inventory.json', import.meta.url), 'utf8'));
  const found = [];
  for (const file of await routes(root)) {
    const source = await readFile(file, 'utf8');
    const exports = [...source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE) = withApiRoute\("([^"]+)"/g)];
    assert.ok(exports.length, `${file} has no wrapped handlers`);
    assert.ok(!/export async function (GET|POST|PUT|PATCH|DELETE)/.test(source));
    for (const [,method,path] of exports) found.push(`${method} ${path}`);
  }
  assert.deepEqual(found.sort(), inventory.endpoints.map(row => `${row.method} ${row.path}`).sort());
  for (const row of inventory.endpoints) for (const field of ['request','response','authorization','errors']) assert.ok(row[field]?.length, `${row.path} missing ${field}`);
});
