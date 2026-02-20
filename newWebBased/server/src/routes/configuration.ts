/**
 * Configuration routes for TurnFix.
 * 
 * Refactored for Separation of Concerns:
 * - configurationUtils.ts    → Utility functions (encrypt, loadConfig, saveConfig, etc.)
 * - configurationSeeding.ts  → Data seeding routes (gymnet-preset, production-*, sample-data, discipline-groups)
 * - configurationDatabase.ts → Database management routes (test-database, create-database, create-schema, init-database)
 * - configuration.ts         → This file: core config CRUD routes (GET /, save, reset, export, import)
 */

import express from 'express';
import { AppConfig, loadConfig, saveConfig, getDefaultConfig } from '../utils/configurationUtils';

// Import sub-routers
import seedingRouter from './configurationSeeding';
import databaseRouter from './configurationDatabase';

const router = express.Router();

// Mount sub-routers (all routes are relative to /api/configuration)
router.use('/', seedingRouter);
router.use('/', databaseRouter);


// GET /api/configuration - Load configuration
router.get('/', async (req, res) => {
  try {
    const config = await loadConfig();
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration loaded:', {
        sections: Object.keys(config),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(config);
  } catch (error: any) {
    console.error('Error loading configuration:', error);
    res.status(500).json({ 
      error: 'Failed to load configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// POST /api/configuration/save - Save configuration
router.post('/save', async (req, res) => {
  try {
    const config: AppConfig = req.body;
    
    // Validate required fields
    if (!config.database || !config.database.db_host || !config.database.db_name) {
      return res.status(400).json({ 
        error: 'Missing required database configuration fields' 
      });
    }

    // Safety check: db_host must not be the same as db_name (common misconfiguration)
    // This can happen when the wizard updates db_name but the host accidentally gets overwritten
    if (config.database.db_host === config.database.db_name && config.database.db_host !== 'localhost') {
      console.warn(`⚠️ WARNING: db_host ("${config.database.db_host}") equals db_name — likely a misconfiguration. Resetting db_host to "localhost".`);
      config.database.db_host = 'localhost';
    }
    
    await saveConfig(config);
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration saved successfully:', {
        sections: Object.keys(config),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ 
      error: 'Failed to save configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// GET /api/configuration/reset - Reset configuration to defaults
router.get('/reset', async (req, res) => {
  try {
    const defaultConfig = getDefaultConfig();
    await saveConfig(defaultConfig);
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration reset to defaults');
    }
    
    res.json({ 
      success: true, 
      message: 'Configuration reset to defaults',
      config: defaultConfig 
    });
  } catch (error: any) {
    console.error('Error resetting configuration:', error);
    res.status(500).json({ 
      error: 'Failed to reset configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// GET /api/configuration/export - Export configuration (excluding sensitive data)
router.get('/export', async (req, res) => {
  try {
    const config = await loadConfig();
    
    // Remove sensitive information for export
    const exportConfig = JSON.parse(JSON.stringify(config));
    if (exportConfig.database) {
      delete exportConfig.database.db_password;
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="turnfix-config-export.json"');
    res.json(exportConfig);
  } catch (error: any) {
    console.error('Error exporting configuration:', error);
    res.status(500).json({ 
      error: 'Failed to export configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

// POST /api/configuration/import - Import configuration
router.post('/import', async (req, res) => {
  try {
    const importedConfig: Partial<AppConfig> = req.body;
    
    // Validate imported configuration structure
    const requiredSections = ['database', 'application', 'localization'];
    for (const section of requiredSections) {
      if (!importedConfig[section as keyof AppConfig]) {
        return res.status(400).json({ 
          error: `Missing required configuration section: ${section}` 
        });
      }
    }
    
    // Merge with current configuration to preserve any missing sections
    const currentConfig = await loadConfig();
    const mergedConfig: AppConfig = { ...currentConfig, ...importedConfig } as AppConfig;
    
    await saveConfig(mergedConfig);
    
    if (process.env.DEBUG === 'true') {
      console.log('Configuration imported successfully:', {
        sections: Object.keys(importedConfig),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      success: true,
      message: 'Configuration imported successfully'
    });
  } catch (error: any) {
    console.error('Error importing configuration:', error);
    res.status(500).json({ 
      error: 'Failed to import configuration',
      details: process.env.DEBUG === 'true' ? error.message : undefined
    });
  }
});

export default router;


