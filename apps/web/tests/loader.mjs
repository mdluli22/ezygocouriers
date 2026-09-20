// Test-only TS/alias loader. Production modules run unchanged; only Next request
// context and outbound email are replaced. PostgreSQL and authentication are real.
import ts from 'typescript';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const app = fileURLToPath(new URL('../', import.meta.url));
const fixtures = new URL('./fixtures/', import.meta.url);
export async function resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: new URL('empty.mjs', fixtures).href, shortCircuit: true };
  if (specifier === 'next/headers') return { url: new URL('headers.mjs', fixtures).href, shortCircuit: true };
  if (specifier === '@/lib/email/smtp') return { url: new URL('smtp.mjs', fixtures).href, shortCircuit: true };
  if (specifier === 'next/server') return next('next/server.js', context);
  let target;
  if (specifier.startsWith('@/')) target = path.join(app, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) target = fileURLToPath(new URL(specifier, context.parentURL));
  if (target) for (const candidate of [target, target + '.ts', target + '/index.ts']) {
    try { await access(candidate); if (path.extname(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true }; } catch {}
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith('.ts')) return {
    format: 'module', shortCircuit: true,
    source: ts.transpileModule(await readFile(new URL(url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, esModuleInterop: true },
    }).outputText,
  };
  return next(url, context);
}
