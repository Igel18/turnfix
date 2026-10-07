import { Router } from 'express';
import * as fs from 'fs';
import multer from 'multer';
import * as path from 'path';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { buildGymNetResultsXml } from '../utils/gymnetXmlExport';
import { mergeGymNetTemplateWithResults } from '../utils/gymnetTemplateResultsExport';
import { loadGymNetExportPayload } from '../utils/gymnetResultsExportService';

const router = Router();

const templateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const lowerName = file.originalname.toLowerCase();
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || lowerName.endsWith('.xml')) {
      callback(null, true);
    } else {
      callback(new Error('Only XML files are allowed'));
    }
  },
});

router.get('/export-gymnet-xml', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.query.eventId as string, 10);
    const competitionIdParam = req.query.competitionId as string | undefined;
    const competitionId = competitionIdParam ? parseInt(competitionIdParam, 10) : null;

    if (Number.isNaN(eventId)) {
      return res.status(400).json({ error: 'Valid eventId is required' });
    }
    if (competitionIdParam && (competitionId === null || Number.isNaN(competitionId))) {
      return res.status(400).json({ error: 'Invalid competitionId' });
    }

    const payload = await loadGymNetExportPayload(eventId, competitionId);
    if (payload.length === 0) {
      return res.status(404).json({ error: 'No competitions found for export' });
    }

    const xml = buildGymNetResultsXml(payload);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `gymnet_results_event_${eventId}_${date}.xml`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Error exporting GymNet XML:', error);
    return res.status(500).json({ error: 'Failed to export GymNet XML' });
  }
});

router.post('/export-gymnet-xml-template', authenticateToken, templateUpload.single('xmlFile'), async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.body.eventId as string, 10);
    const competitionIdRaw = req.body.competitionId as string | undefined;
    const competitionId = competitionIdRaw ? parseInt(competitionIdRaw, 10) : null;

    if (Number.isNaN(eventId)) {
      return res.status(400).json({ error: 'Valid eventId is required' });
    }
    if (competitionIdRaw && (competitionId === null || Number.isNaN(competitionId))) {
      return res.status(400).json({ error: 'Invalid competitionId' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Template XML file is required' });
    }

    const payload = await loadGymNetExportPayload(eventId, competitionId);
    if (payload.length === 0) {
      return res.status(404).json({ error: 'No competitions found for export' });
    }

    const { xml, stats, report } = await mergeGymNetTemplateWithResults(req.file.buffer.toString('utf-8'), payload);
    const originalName = req.file.originalname || `gymnet_event_${eventId}.xml`;
    const extension = path.extname(originalName) || '.xml';
    const baseName = path.basename(originalName, extension);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${baseName}_Results_${date}${extension}`;
    const exportDir = path.resolve(process.cwd(), 'exports', 'gymnet-results');
    fs.mkdirSync(exportDir, { recursive: true });
    fs.writeFileSync(path.join(exportDir, fileName), xml, 'utf8');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-GymNet-Match-Stats', JSON.stringify(stats));
    res.setHeader('X-GymNet-Match-Report-Encoded', encodeURIComponent(JSON.stringify(report)));
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Error exporting GymNet XML from template:', error);
    return res.status(500).json({ error: 'Failed to export GymNet XML from template' });
  }
});

export default router;
