import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Path to the settings file - use __dirname for reliable resolution
// Works in both dev (src/routes/) and prod (dist/routes/) since both are 2 levels deep from server root
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'config', 'app-settings.json');

/**
 * Read settings from file
 */
function readSettings(): any {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings file:', error);
    // Return default settings if file doesn't exist or is invalid
    return {
      scoreCapture: {
        showJuryScores: false,
        description: "When true, shows individual jury scores in score capture. When false, shows only the total score."
      },
      juryPortal: {
        blindMode: false,
        description: "When true, jury members cannot see scores from other judges until they submit their own."
      },
      general: {
        autoSave: true,
        autoSaveInterval: 30000,
        description: "Auto-save interval in milliseconds (default: 30000 = 30 seconds)"
      },
      squadAutoAssign: {
        description: "Default criteria for automatic squad assignment (Riegeneinteilung).",
        maxParticipantsPerSquad: 12,
        separateGenders: true,
        keepClubsTogether: true,
        groupByAgeCategory: false,
        ageCategoryRanges: "6-8,9-10,11-12,13-14,15-18",
        numberOfProposals: 3,
        namingPrefix: "gender",
        breakCount: 0,
        keepExistingSquads: false
      },
      wifi: {
        description: "WiFi/WLAN settings for generating QR codes that judges can scan to connect to the competition network.",
        enabled: false,
        networks: []
      }
    };
  }
}

/**
 * Write settings to file
 */
function writeSettings(settings: any): void {
  try {
    // Ensure config directory exists
    const configDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing settings file:', error);
    throw error;
  }
}

/**
 * GET /api/app-settings
 * Get all application settings
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const settings = readSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch settings',
      message: error.message 
    });
  }
});

/**
 * GET /api/app-settings/:category
 * Get settings for a specific category (scoreCapture, juryPortal, general)
 */
router.get('/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const settings = readSettings();
    
    if (!settings[category]) {
      return res.status(404).json({ 
        error: 'Category not found',
        message: `Settings category '${category}' does not exist` 
      });
    }
    
    res.json(settings[category]);
  } catch (error: any) {
    console.error('Error fetching category settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch category settings',
      message: error.message 
    });
  }
});

/**
 * PUT /api/app-settings/:category
 * Update settings for a specific category
 */
router.put('/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const updates = req.body;
    
    const settings = readSettings();
    
    if (!settings[category]) {
      return res.status(404).json({ 
        error: 'Category not found',
        message: `Settings category '${category}' does not exist` 
      });
    }
    
    // Merge updates with existing settings, preserving description
    const description = settings[category].description;
    settings[category] = {
      ...settings[category],
      ...updates,
      description // Keep original description
    };
    
    writeSettings(settings);
    
    res.json({ 
      success: true,
      message: `Settings category '${category}' updated successfully`,
      data: settings[category]
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      message: error.message 
    });
  }
});

/**
 * PATCH /api/app-settings/:category/:setting
 * Update a specific setting within a category
 */
router.patch('/:category/:setting', (req: Request, res: Response) => {
  try {
    const { category, setting } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Request body must contain a "value" field' 
      });
    }
    
    const settings = readSettings();
    
    if (!settings[category]) {
      return res.status(404).json({ 
        error: 'Category not found',
        message: `Settings category '${category}' does not exist` 
      });
    }
    
    if (settings[category][setting] === undefined && setting !== 'description') {
      return res.status(404).json({ 
        error: 'Setting not found',
        message: `Setting '${setting}' does not exist in category '${category}'` 
      });
    }
    
    // Don't allow changing description
    if (setting === 'description') {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Cannot modify description field' 
      });
    }
    
    settings[category][setting] = value;
    writeSettings(settings);
    
    res.json({ 
      success: true,
      message: `Setting '${category}.${setting}' updated successfully`,
      data: { [setting]: value }
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    res.status(500).json({ 
      error: 'Failed to update setting',
      message: error.message 
    });
  }
});

export default router;
