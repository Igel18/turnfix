/**
 * System Info Routes
 * Provides build information and version details
 */

import express from 'express';
// @ts-ignore
import buildInfo from '../build-info.json';
import packageJson from '../../package.json';

const router = express.Router();

/**
 * GET /api/system/version
 * Returns server build information
 */
router.get('/version', (req, res) => {
  res.json({
    version: packageJson.version,
    name: packageJson.name,
    description: packageJson.description,
    build: buildInfo,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

/**
 * GET /api/system/health
 * Simple health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
