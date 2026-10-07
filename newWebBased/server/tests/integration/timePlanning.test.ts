import { describe, expect, it } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import timePlanningRoutes from '../../src/routes/timePlanning';

describe('timePlanning aggregator router', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/time-planning', timePlanningRoutes);

  it('mounts every child router under the time-planning prefix', async () => {
    const routeChecks: Array<[string, 'get' | 'post', string]> = [
      ['/api/time-planning/bahnen', 'get', 'query'],
      ['/api/time-planning', 'get', 'query'],
      ['/api/time-planning/matrix', 'get', 'query'],
      ['/api/time-planning/wizard/durchgang-data', 'get', 'query'],
      ['/api/time-planning/active-squads', 'get', 'query'],
    ];

    for (const [path, method] of routeChecks) {
      const response = await request(app)[method](path).expect(400);
      expect(response.body.error).toContain('Event ID');
    }
  });
});