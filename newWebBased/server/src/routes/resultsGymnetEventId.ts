import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { parseGymnetStandardExport } from '../utils/gymnetStandardExportParser';
import {
  buildGymnetResultsServiceUrl,
  loadGymnetEventIdMapping,
  saveGymnetEventIdMapping,
} from '../utils/gymnetEventIdStore';

const router = Router();

const standardExportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const lowerName = file.originalname.toLowerCase();
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx')) {
      callback(null, true);
    } else {
      callback(new Error('Only XLS/XLSX files are allowed'));
    }
  },
});

router.post('/gymnet-event-id/:eventId', authenticateToken, standardExportUpload.single('xlsFile'), async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (Number.isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid eventId' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Standardexport-Datei ist erforderlich' });
    }

    const parsed = parseGymnetStandardExport(req.file.buffer);
    if (!parsed.evId) {
      return res.status(400).json({ error: 'In der Datei wurde keine evID gefunden' });
    }

    const mapping = saveGymnetEventIdMapping(eventId, {
      gymnetEventId: parsed.evId,
      evName: parsed.evName,
      evStart: parsed.evStart,
      evStop: parsed.evStop,
    });
    return res.json({
      mapping,
      resultsServiceUrl: buildGymnetResultsServiceUrl(mapping.gymnetEventId),
      warning: parsed.hasInconsistentEventId
        ? 'Die Datei enthält unterschiedliche evID-Werte. Es wurde die erste gefundene ID verwendet.'
        : null,
    });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Import fehlgeschlagen' });
  }
});

router.get('/gymnet-event-id/:eventId', authenticateToken, (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid eventId' });
  }

  const mapping = loadGymnetEventIdMapping(eventId);
  if (!mapping) {
    return res.status(404).json({ error: 'Keine GymNet Event-ID hinterlegt' });
  }

  return res.json({ mapping, resultsServiceUrl: buildGymnetResultsServiceUrl(mapping.gymnetEventId) });
});

router.put('/gymnet-event-id/:eventId', authenticateToken, (req: AuthRequest, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid eventId' });
  }

  const { gymnetEventId, evName, evStart, evStop } = req.body ?? {};
  if (!gymnetEventId || typeof gymnetEventId !== 'string') {
    return res.status(400).json({ error: 'gymnetEventId ist erforderlich' });
  }

  const mapping = saveGymnetEventIdMapping(eventId, {
    gymnetEventId,
    evName: typeof evName === 'string' ? evName : '',
    evStart: typeof evStart === 'string' ? evStart : '',
    evStop: typeof evStop === 'string' ? evStop : '',
  });
  return res.json({ mapping, resultsServiceUrl: buildGymnetResultsServiceUrl(mapping.gymnetEventId) });
});

export default router;
