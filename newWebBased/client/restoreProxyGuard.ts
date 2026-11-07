import type { IncomingHttpHeaders } from 'node:http';
import { isIP } from 'node:net';
import type { Plugin } from 'vite';

interface RestoreProxyRequest {
  url?: string;
  headers: IncomingHttpHeaders;
  socket: { remoteAddress?: string; localPort?: number };
}

function isLoopback(address: string | undefined): boolean {
  if (!address) return false;
  if (isIP(address) === 4) return address.startsWith('127.');
  if (isIP(address) !== 6 || address.includes('%')) return false;

  const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  return normalized === '::1' || /^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(normalized);
}

function isLocalAuthority(value: string | undefined, localPort: number | undefined): boolean {
  if (!value) return false;
  const match = /^(localhost|127\.0\.0\.1|\[::1\]):([0-9]+)$/i.exec(value);
  return !!match && (match[2] === '5173' || (localPort !== undefined && match[2] === String(localPort)));
}

export function shouldBlockRestoreProxy(req: RestoreProxyRequest): boolean {
  const pathname = (req.url ?? '').split('?', 1)[0];
  if (!/^\/api\/configuration\/backup\/restore\/?$/i.test(pathname)) return false;

  const origin = req.headers.origin;
  const originMatch = typeof origin === 'string' ? /^https?:\/\/([^/]+)$/i.exec(origin) : null;
  return !isLoopback(req.socket.remoteAddress)
    || !isLocalAuthority(req.headers.host, req.socket.localPort)
    || (origin !== undefined && (!originMatch || !isLocalAuthority(originMatch[1], req.socket.localPort)));
}

export function restoreProxyGuard(): Plugin {
  return {
    name: 'restore-proxy-guard',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!shouldBlockRestoreProxy(req)) return next();
        res.statusCode = 403;
        res.end('Forbidden');
      });
    },
  };
}