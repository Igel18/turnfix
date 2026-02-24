/**
 * Configuration seeding routes for TurnFix.
 * 
 * Extracted from routes/configuration.ts for Separation of Concerns.
 * Handles data seeding endpoints: GymNet preset, production disciplines/statuses,
 * sample data, and discipline groups.
 * 
 * All 5 routes follow the same pattern (DRY via withDynamicClient wrapper):
 * 1. Optionally accept a custom dbConfig for wizard flows
 * 2. Create a temporary Prisma client if custom config provided
 * 3. Call the imported seeding function
 * 4. Return result, clean up client
 */

import express from 'express';

import { applyGymNetPreset } from '../utils/gymnetPreset';
import { applyProductionDisciplines } from '../utils/productionDisciplinesImport';
import { applyProductionStatuses } from '../utils/productionStatusesImport';
import { importSampleData } from '../utils/sampleDataImport';
import { importDisciplineGroups } from '../utils/disciplineGroupsImport';
import { importStandardCountries } from '../utils/standardCountriesImport';

const router = express.Router();

/**
 * Higher-order route handler that manages optional dynamic Prisma client creation.
 * Eliminates ~120 lines of duplicated boilerplate across 5 seeding routes.
 * 
 * @param routeName - Human-readable name for logging
 * @param importFn - The seeding function to call (receives optional custom client)
 * @param wrapResult - If true, wraps result in { success: true, result } (used by gymnet-preset)
 */
function withDynamicClient(
  routeName: string,
  importFn: (client: any) => Promise<any>,
  wrapResult = false
): express.RequestHandler {
  return async (req, res) => {
    let customClient = null;
    try {
      const { dbConfig } = req.body;
      
      // If custom DB config provided (from wizard), create temporary client
      if (dbConfig) {
        const { createDynamicPrismaClient } = require('../utils/dynamicPrismaClient');
        customClient = createDynamicPrismaClient(dbConfig);
        await customClient.$connect();
        console.log(`[Configuration] Using custom database connection for ${routeName}`);
      }
      
      const result = await importFn(customClient);
      res.json(wrapResult ? { success: true, result } : result);
    } catch (error: any) {
      // Backend-Log mit Stacktrace
      console.error(`${routeName} failed:`, error && (error.stack || error));
      // Fehlerdetails möglichst ausführlich an den Client zurückgeben
      res.status(500).json({
        error: `Failed to apply ${routeName}`,
        details: error?.message || String(error),
        stack: error?.stack || null
      });
    } finally {
      // Clean up custom client
      if (customClient) {
        await customClient.$disconnect();
      }
    }
  };
}

// POST /api/configuration/gymnet-preset - Geräte/Formeln für GymNet anlegen
router.post('/gymnet-preset', withDynamicClient('GymNet preset', applyGymNetPreset, true));

// POST /api/configuration/production-disciplines - Import all production disciplines
router.post('/production-disciplines', withDynamicClient('production disciplines', applyProductionDisciplines));

// POST /api/configuration/production-statuses - Import all production statuses
router.post('/production-statuses', withDynamicClient('production statuses', applyProductionStatuses));

// POST /api/configuration/sample-data - Import sample/demo data (1 record per category)
router.post('/sample-data', withDynamicClient('sample data', importSampleData));

// POST /api/configuration/discipline-groups - Import standard discipline groups
router.post('/discipline-groups', withDynamicClient('discipline groups', importDisciplineGroups));

// POST /api/configuration/standard-countries - Import standard countries (DACH + Europe + FIG)
router.post('/standard-countries', withDynamicClient('standard countries', importStandardCountries));

export default router;
