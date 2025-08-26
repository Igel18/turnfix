"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const authBypass_1 = require("../middleware/authBypass");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createDisciplineSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    shortName: zod_1.z.string().min(1, "Short name is required").optional(),
    displayName: zod_1.z.string().optional(),
    apparatus: zod_1.z.string().optional(),
    maleAllowed: zod_1.z.boolean().default(true),
    femaleAllowed: zod_1.z.boolean().default(true),
    icon: zod_1.z.string().optional(),
    formula: zod_1.z.string().optional(),
    sportId: zod_1.z.number().default(1),
    inputMask: zod_1.z.string().optional(),
    attempts: zod_1.z.number().default(1)
});
const updateDisciplineSchema = createDisciplineSchema.partial();
// Get all disciplines
router.get('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const query = `
      SELECT 
        int_disziplinenid as id, 
        var_name as name, 
        var_kurz1 as short_name,
        var_kurz2 as display_name,
        var_einheit as apparatus,
        bol_m as male_allowed,
        bol_w as female_allowed,
        CASE 
          WHEN bol_m = true AND bol_w = true THEN 'gemischt'
          WHEN bol_m = true AND bol_w = false THEN 'männlich'
          WHEN bol_m = false AND bol_w = true THEN 'weiblich'
          ELSE 'unbekannt'
        END as gender_text,
        var_icon as icon,
        var_formel as formula,
        int_sportid as sport_id,
        var_maske as input_mask,
        int_versuche as attempts
      FROM tfx_disziplinen
      ORDER BY var_name
    `;
        const disciplines = await prisma.$queryRawUnsafe(query);
        res.json(disciplines);
    }
    catch (error) {
        console.error('Error fetching disciplines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get gymnastics equipment/apparatus types
router.get('/apparatus', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const query = `
      SELECT DISTINCT 
        var_einheit as apparatus,
        COUNT(*)::integer as discipline_count
      FROM tfx_disziplinen
      WHERE var_einheit IS NOT NULL
      GROUP BY var_einheit
      ORDER BY var_einheit
    `;
        const apparatus = await prisma.$queryRawUnsafe(query);
        res.json(apparatus);
    }
    catch (error) {
        console.error('Error fetching apparatus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get age groups (from gender categories since no age columns exist in disciplines)
router.get('/age-groups', authBypass_1.authenticateToken, async (req, res) => {
    try {
        // Since there are no age columns in tfx_disziplinen, return placeholder age groups
        // These would typically come from participant data or competition rules
        const ageGroups = [
            { age_from: 6, age_to: 7, age_range: '6-7', discipline_count: 0 },
            { age_from: 8, age_to: 9, age_range: '8-9', discipline_count: 0 },
            { age_from: 10, age_to: 11, age_range: '10-11', discipline_count: 0 },
            { age_from: 12, age_to: 13, age_range: '12-13', discipline_count: 0 },
            { age_from: 14, age_to: 15, age_range: '14-15', discipline_count: 0 },
            { age_from: 16, age_to: 17, age_range: '16-17', discipline_count: 0 },
            { age_from: 18, age_to: 99, age_range: '18+', discipline_count: 0 }
        ];
        res.json(ageGroups);
    }
    catch (error) {
        console.error('Error fetching age groups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get discipline categories/types
router.get('/categories', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const query = `
      SELECT 
        int_bereicheid as id,
        var_name as name,
        bol_maennlich as male,
        bol_weiblich as female
      FROM tfx_bereiche
      ORDER BY var_name
    `;
        const categories = await prisma.$queryRawUnsafe(query);
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get filtered disciplines for competition setup
router.get('/filtered', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const { gender, apparatus, sportId } = req.query;
        let whereConditions = [];
        if (gender) {
            if (gender === 'male' || gender === 'männlich') {
                whereConditions.push('bol_m = true');
            }
            else if (gender === 'female' || gender === 'weiblich') {
                whereConditions.push('bol_w = true');
            }
            else if (gender === 'mixed' || gender === 'gemischt') {
                whereConditions.push('bol_m = true AND bol_w = true');
            }
        }
        if (apparatus) {
            whereConditions.push(`var_einheit = '${apparatus}'`);
        }
        if (sportId) {
            whereConditions.push(`int_sportid = ${parseInt(sportId)}`);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const query = `
      SELECT 
        int_disziplinenid as id, 
        var_name as name, 
        var_kurz1 as short_name,
        var_kurz2 as display_name,
        var_einheit as apparatus,
        bol_m as male_allowed,
        bol_w as female_allowed,
        CASE 
          WHEN bol_m = true AND bol_w = true THEN 'gemischt'
          WHEN bol_m = true AND bol_w = false THEN 'männlich'
          WHEN bol_m = false AND bol_w = true THEN 'weiblich'
          ELSE 'unbekannt'
        END as gender_text,
        int_sportid as sport_id,
        var_icon as icon
      FROM tfx_disziplinen
      ${whereClause}
      ORDER BY var_name
    `;
        const disciplines = await prisma.$queryRawUnsafe(query);
        res.json(disciplines);
    }
    catch (error) {
        console.error('Error fetching filtered disciplines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new discipline
router.post('/', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = createDisciplineSchema.parse(req.body);
        const query = `
      INSERT INTO tfx_disziplinen (
        var_name, 
        var_kurz1, 
        var_kurz2, 
        var_einheit, 
        bol_m, 
        bol_w, 
        var_icon, 
        var_formel, 
        int_sportid, 
        var_maske, 
        int_versuche
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        int_disziplinenid as id,
        var_name as name,
        var_kurz1 as short_name,
        var_kurz2 as display_name,
        var_einheit as apparatus,
        bol_m as male_allowed,
        bol_w as female_allowed,
        var_icon as icon,
        var_formel as formula,
        int_sportid as sport_id,
        var_maske as input_mask,
        int_versuche as attempts
    `;
        const result = await prisma.$queryRawUnsafe(query, validatedData.name, validatedData.shortName || validatedData.name.substring(0, 10), validatedData.displayName || validatedData.shortName || validatedData.name.substring(0, 5), validatedData.apparatus || '', validatedData.maleAllowed, validatedData.femaleAllowed, validatedData.icon || '', validatedData.formula || '', validatedData.sportId, validatedData.inputMask || '', validatedData.attempts);
        res.status(201).json({
            success: true,
            message: 'Discipline created successfully',
            data: Array.isArray(result) ? result[0] : result
        });
    }
    catch (error) {
        console.error('Error creating discipline:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
// Get single discipline by ID
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const disciplineId = parseInt(req.params.id);
        const query = `
      SELECT 
        int_disziplinenid as id, 
        var_name as name, 
        var_kurz1 as short_name,
        var_kurz2 as display_name,
        var_einheit as apparatus,
        bol_m as male_allowed,
        bol_w as female_allowed,
        CASE 
          WHEN bol_m = true AND bol_w = true THEN 'gemischt'
          WHEN bol_m = true AND bol_w = false THEN 'männlich'
          WHEN bol_m = false AND bol_w = true THEN 'weiblich'
          ELSE 'unbekannt'
        END as gender_text,
        var_icon as icon,
        var_formel as formula,
        int_sportid as sport_id,
        var_maske as input_mask,
        int_versuche as attempts
      FROM tfx_disziplinen
      WHERE int_disziplinenid = $1
    `;
        const result = await prisma.$queryRawUnsafe(query, disciplineId);
        const discipline = Array.isArray(result) ? result[0] : result;
        if (!discipline) {
            return res.status(404).json({ error: 'Discipline not found' });
        }
        res.json(discipline);
    }
    catch (error) {
        console.error('Error fetching discipline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update discipline
router.put('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const disciplineId = parseInt(req.params.id);
        const validatedData = updateDisciplineSchema.parse(req.body);
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCounter = 1;
        if (validatedData.name !== undefined) {
            updateFields.push(`var_name = $${paramCounter}`);
            values.push(validatedData.name);
            paramCounter++;
        }
        if (validatedData.shortName !== undefined) {
            updateFields.push(`var_kurz1 = $${paramCounter}`);
            values.push(validatedData.shortName);
            paramCounter++;
        }
        if (validatedData.displayName !== undefined) {
            updateFields.push(`var_kurz2 = $${paramCounter}`);
            values.push(validatedData.displayName);
            paramCounter++;
        }
        if (validatedData.apparatus !== undefined) {
            updateFields.push(`var_einheit = $${paramCounter}`);
            values.push(validatedData.apparatus);
            paramCounter++;
        }
        if (validatedData.maleAllowed !== undefined) {
            updateFields.push(`bol_m = $${paramCounter}`);
            values.push(validatedData.maleAllowed);
            paramCounter++;
        }
        if (validatedData.femaleAllowed !== undefined) {
            updateFields.push(`bol_w = $${paramCounter}`);
            values.push(validatedData.femaleAllowed);
            paramCounter++;
        }
        if (validatedData.icon !== undefined) {
            updateFields.push(`var_icon = $${paramCounter}`);
            values.push(validatedData.icon);
            paramCounter++;
        }
        if (validatedData.formula !== undefined) {
            updateFields.push(`var_formel = $${paramCounter}`);
            values.push(validatedData.formula);
            paramCounter++;
        }
        if (validatedData.sportId !== undefined) {
            updateFields.push(`int_sportid = $${paramCounter}`);
            values.push(validatedData.sportId);
            paramCounter++;
        }
        if (validatedData.inputMask !== undefined) {
            updateFields.push(`var_maske = $${paramCounter}`);
            values.push(validatedData.inputMask);
            paramCounter++;
        }
        if (validatedData.attempts !== undefined) {
            updateFields.push(`int_versuche = $${paramCounter}`);
            values.push(validatedData.attempts);
            paramCounter++;
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(disciplineId); // Add ID as last parameter
        const query = `
      UPDATE tfx_disziplinen 
      SET ${updateFields.join(', ')}
      WHERE int_disziplinenid = $${paramCounter}
      RETURNING 
        int_disziplinenid as id,
        var_name as name,
        var_kurz1 as short_name,
        var_kurz2 as display_name,
        var_einheit as apparatus,
        bol_m as male_allowed,
        bol_w as female_allowed,
        var_icon as icon,
        var_formel as formula,
        int_sportid as sport_id,
        var_maske as input_mask,
        int_versuche as attempts
    `;
        const result = await prisma.$queryRawUnsafe(query, ...values);
        const updatedDiscipline = Array.isArray(result) ? result[0] : result;
        if (!updatedDiscipline) {
            return res.status(404).json({ error: 'Discipline not found' });
        }
        res.json({
            success: true,
            message: 'Discipline updated successfully',
            data: updatedDiscipline
        });
    }
    catch (error) {
        console.error('Error updating discipline:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
// Delete discipline
router.delete('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const disciplineId = parseInt(req.params.id);
        // Check if discipline is being used in any competitions
        const usageQuery = `
      SELECT COUNT(*) as count
      FROM tfx_teilnehmer_disziplin
      WHERE int_disziplinenid = $1
    `;
        const usageResult = await prisma.$queryRawUnsafe(usageQuery, disciplineId);
        const usageCount = usageResult[0]?.count || 0;
        if (usageCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete discipline',
                message: `Discipline is being used in ${usageCount} competition entries. Remove entries first.`
            });
        }
        const deleteQuery = `
      DELETE FROM tfx_disziplinen 
      WHERE int_disziplinenid = $1
      RETURNING int_disziplinenid as id
    `;
        const result = await prisma.$queryRawUnsafe(deleteQuery, disciplineId);
        const deletedDiscipline = Array.isArray(result) ? result[0] : result;
        if (!deletedDiscipline) {
            return res.status(404).json({ error: 'Discipline not found' });
        }
        res.json({
            success: true,
            message: 'Discipline deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting discipline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=disciplines.js.map