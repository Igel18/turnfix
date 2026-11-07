import express, { Request } from 'express';
import { restoreWizardBackup, WizardRestoreError } from '../utils/wizardRestore';

const router = express.Router();
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const localAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function localUrl(value: string, ports: Set<string>, origin: boolean): boolean {
  try {
    if (!origin && !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i.test(value)) return false;
    const url = new URL(origin ? value : `http://${value}`);
    return ['http:', 'https:'].includes(url.protocol) && localHosts.has(url.hostname.toLowerCase()) && !url.username && !url.password && ports.has(url.port || (url.protocol === 'https:' ? '443' : '80')) && (origin ? url.origin === value : url.pathname === '/' && !url.search && !url.hash);
  } catch {
    return false;
  }
}

function allowedRequest(req: Request): boolean {
  const ports = new Set(['3001', '5173', String(req.socket.localPort || '')]);
  const origin = req.get('Origin');
  return localAddresses.has(req.socket.remoteAddress || '') && localUrl(req.get('Host') || '', ports, false) && (origin ? localUrl(origin, ports, true) : req.method !== 'OPTIONS' && req.get('X-TurnFix-Restore') === '1');
}

router.options('/backup/restore', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!allowedRequest(req) || req.get('Access-Control-Request-Method') !== 'POST') {
    return res.status(403).json({ error: 'Restore requests must originate locally', code: 'FORBIDDEN' });
  }
  res.vary('Origin');
  res.set('Access-Control-Allow-Origin', req.get('Origin')!);
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-TurnFix-Restore');
  return res.status(204).end();
});

router.post('/backup/restore', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!allowedRequest(req) || !req.is('application/json')) {
    return res.status(403).json({ error: 'Restore requests must originate locally', code: 'FORBIDDEN' });
  }
  const origin = req.get('Origin');
  if (origin) {
    res.vary('Origin');
    res.set('Access-Control-Allow-Origin', origin);
  }
  return express.json({ limit: '10mb' })(req, res, error => {
    if (error) return res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid JSON request body', code: 'INVALID_JSON' });
    return next();
  });
}, async (req, res) => {
  try {
    return res.json(await restoreWizardBackup(req.body));
  } catch (error) {
    if (error instanceof WizardRestoreError) {
      return res.status(error.status).json({ error: error.message, code: error.code, ...(error.databaseCreated !== undefined ? { databaseCreated: error.databaseCreated } : {}), ...(error.databaseName ? { databaseName: error.databaseName } : {}) });
    }
    return res.status(500).json({ error: 'Restore failed', code: 'RESTORE_FAILED' });
  }
});

export default router;