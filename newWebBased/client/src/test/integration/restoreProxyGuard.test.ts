// @vitest-environment node
import { createServer as createHttpServer, request, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { restoreProxyGuard, shouldBlockRestoreProxy } from '../../../restoreProxyGuard';

const restorePath = '/api/configuration/backup/restore';

function guardRequest(overrides: {
  url?: string;
  remoteAddress?: string;
  localPort?: number;
  host?: string;
  origin?: string;
  forwardedFor?: string;
} = {}) {
  return shouldBlockRestoreProxy({
    url: overrides.url ?? restorePath,
    headers: {
      host: overrides.host ?? 'localhost:5173',
      origin: overrides.origin,
      'x-forwarded-for': overrides.forwardedFor,
    },
    socket: {
      remoteAddress: overrides.remoteAddress ?? '127.0.0.1',
      localPort: overrides.localPort ?? 5173,
    },
  });
}

describe('restore dev proxy guard', () => {
  it.each([
    {},
    { host: '127.0.0.1:5173', origin: 'http://localhost:5173' },
    { remoteAddress: '::1', host: '[::1]:5173', origin: 'http://[::1]:5173' },
    { remoteAddress: '0:0:0:0:0:0:0:1', host: '[::1]:5173' },
    { remoteAddress: '127.0.0.2', host: 'localhost:5173' },
    { remoteAddress: '::ffff:127.0.0.1', host: 'localhost:5180', origin: 'http://127.0.0.1:5180', localPort: 5180 },
    { url: `${restorePath}/?source=backup`, origin: 'https://localhost:5173' },
  ])('allows local requests %j', (input) => {
    expect(guardRequest(input)).toBe(false);
  });

  it.each([
    { remoteAddress: '192.0.2.10', forwardedFor: '127.0.0.1', origin: 'http://localhost:5173' },
    { remoteAddress: '::ffff:192.0.2.10', origin: 'http://localhost:5173' },
    { remoteAddress: 'fe80::1%12', origin: 'http://localhost:5173' },
    { remoteAddress: '' },
    { host: 'localhost.evil.example:5173' },
    { host: 'localhost:3001' },
    { host: 'localhost' },
    { host: 'user@localhost:5173' },
    { origin: 'http://localhost.evil.example:5173' },
    { origin: 'http://localhost:3001' },
    { origin: 'http://localhost:5173/path' },
    { origin: 'null' },
    { url: `${restorePath}?test=1`, remoteAddress: '192.0.2.10' },
    { url: '/api/Configuration/Backup/Restore/', remoteAddress: '192.0.2.10' },
  ])('blocks untrusted restore requests %j', (input) => {
    expect(guardRequest(input)).toBe(true);
  });

  it.each(['/api/configuration/backup', `${restorePath}/extra`, `${restorePath}-other`, '/uploads/file'])(
    'does not affect other routes: %s',
    (url) => expect(guardRequest({ url, remoteAddress: '192.0.2.10', host: 'remote.example:5173' })).toBe(false),
  );

  it('ends a forged remote request in the registered middleware without invoking the proxy', () => {
    const use = vi.fn();
    const configure = restoreProxyGuard().configureServer;
    if (typeof configure !== 'function') throw new Error('Expected configureServer hook');
    configure({ middlewares: { use } } as unknown as ViteDevServer);
    const middleware = use.mock.calls[0][0] as (req: IncomingMessage, res: ServerResponse, next: () => void) => void;
    const req = {
      url: `${restorePath}/?test=1`,
      headers: { host: 'localhost:5173', origin: 'http://localhost:5173', 'x-forwarded-for': '127.0.0.1' },
      socket: { remoteAddress: '192.0.2.10', localPort: 5173 },
    } as unknown as IncomingMessage;
    const res = { statusCode: 200, end: vi.fn() } as unknown as ServerResponse;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Vite restore proxy middleware', () => {
  let upstream: Server;
  let vite: ViteDevServer;
  let port: number;
  let upstreamRequests: string[];

  beforeAll(async () => {
    upstreamRequests = [];
    upstream = createHttpServer((req, res) => {
      upstreamRequests.push(req.url ?? '');
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('proxied');
    });
    await new Promise<void>((done) => upstream.listen(0, '127.0.0.1', done));
    const upstreamPort = (upstream.address() as { port: number }).port;
    vite = await createViteServer({
      configFile: resolve('vite.config.ts'),
      server: {
        host: '127.0.0.1',
        port: 0,
        strictPort: true,
        proxy: { '/api': { target: `http://127.0.0.1:${upstreamPort}`, changeOrigin: true } },
      },
    });
    await vite.listen();
    port = (vite.httpServer!.address() as { port: number }).port;
  });

  afterAll(async () => {
    await vite?.close();
    await new Promise<void>((done, reject) => upstream?.close((error) => error ? reject(error) : done()));
  });

  function send(path: string, host: string, origin?: string): Promise<number> {
    return new Promise((done, reject) => {
      const req = request({ host: '127.0.0.1', port, path, method: 'POST', headers: { host, ...(origin ? { origin } : {}) } }, (res) => {
        res.resume();
        res.on('end', () => done(res.statusCode!));
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('runs before the proxy and leaves other API endpoints working', async () => {
    expect(await send(`${restorePath}?test=1`, `localhost:${port}`, `http://localhost:${port}`)).toBe(200);
    expect(await send(`${restorePath}/?test=2`, `evil.example:${port}`, `http://localhost:${port}`)).toBe(403);
    expect(await send('/api/Configuration/Backup/Restore', `localhost:${port}`, 'http://evil.example:5173')).toBe(403);
    expect(await send('/api/other', `localhost:${port}`, 'http://evil.example:5173')).toBe(200);
    expect(upstreamRequests).toEqual([`${restorePath}?test=1`, '/api/other']);
  });
});