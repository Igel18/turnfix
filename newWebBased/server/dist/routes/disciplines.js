"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const authBypass_1 = require("../middleware/authBypass");
const disciplineMutations_1 = __importDefault(require("./disciplineMutations"));
const router = (0, express_1.Router)();
// Mount mutations sub-router (POST /, PUT /:id, DELETE /:id)
router.use('/', disciplineMutations_1.default);
// Get disciplines count
router.get('/count', async (req, res) => {
    try {
        const count = await prisma_1.default.tfx_disziplinen.count();
        res.json({ count });
    }
    catch (error) {
        console.error('Error counting disciplines:', error);
        res.status(500).json({
            error: 'Failed to count disciplines',
            details: process.env.DEBUG === 'true' ? error : undefined
        });
    }
});
// Get all disciplines
router.get('/', async (req, res) => {
    try {
        const { gender } = req.query;
        let whereClause = '';
        const params = [];
        if (gender) {
            if (gender === 'male') {
                whereClause = 'WHERE bol_m = true';
            }
            else if (gender === 'female') {
                whereClause = 'WHERE bol_w = true';
            }
        }
        const query = `
      SELECT 
        int_disziplinenid as id, 
        var_name as name, 
        var_name,
        var_kurz1 as short_name,
        var_kurz1,
        var_kurz2 as display_name,
        var_kurz2,
        var_formel as formula,
        var_formel,
        var_maske as input_mask,
        var_maske,
        int_versuche as attempts,
        int_versuche,
        var_icon as icon,
        var_icon,
        var_kuerzel as shortcut,
        var_kuerzel,
        int_berechnung as calculation_type,
        int_berechnung,
        var_einheit as unit,
        var_einheit,
        bol_bahnen as lanes_division,
        bol_bahnen,
        bol_m as male_allowed,
        bol_m,
        bol_w as female_allowed,
        bol_w,
        int_sportid as sport_id,
        int_sportid,
        int_formelid as formula_id,
        int_formelid,
        bol_berechnen as should_calculate,
        bol_berechnen
      FROM tfx_disziplinen
      ${whereClause}
      ORDER BY var_name
    `;
        const rawDisciplines = await prisma_1.default.$queryRawUnsafe(query, ...params);
        res.json(rawDisciplines);
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
        const apparatus = await prisma_1.default.$queryRawUnsafe(query);
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
        // Since there are no age columns in tfx_disziplinen, return standard age groups
        // These would typically come from participant data or competition rules
        const ageGroups = [
            { value: 6, label: '6 years' },
            { value: 7, label: '7 years' },
            { value: 8, label: '8 years' },
            { value: 9, label: '9 years' },
            { value: 10, label: '10 years' },
            { value: 11, label: '11 years' },
            { value: 12, label: '12 years' },
            { value: 13, label: '13 years' },
            { value: 14, label: '14 years' },
            { value: 15, label: '15 years' },
            { value: 16, label: '16 years' },
            { value: 17, label: '17 years' },
            { value: 18, label: '18 years' },
            { value: 19, label: '19 years' },
            { value: 20, label: '20 years' },
            { value: 25, label: '25 years' },
            { value: 30, label: '30 years' },
            { value: 40, label: '40 years' },
            { value: 50, label: '50 years' },
            { value: 99, label: '99+ years' }
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
        const categories = await prisma_1.default.$queryRawUnsafe(query);
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
        int_disziplinenid as int_disziplinid, 
        var_name as var_disziplinname, 
        var_einheit as var_disziplinkategorie,
        bol_m as male_allowed,
        bol_w as female_allowed,
        6 as altersklasse_von,
        99 as altersklasse_bis,
        var_icon,
        int_sportid
      FROM tfx_disziplinen
      ${whereClause}
      ORDER BY var_name
    `;
        const disciplines = await prisma_1.default.$queryRawUnsafe(query);
        res.json(disciplines);
    }
    catch (error) {
        console.error('Error fetching filtered disciplines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single discipline by ID
router.get('/:id', authBypass_1.authenticateToken, async (req, res) => {
    try {
        const disciplineId = parseInt(req.params.id);
        if (isNaN(disciplineId)) {
            return res.status(400).json({ error: 'Invalid discipline ID' });
        }
        const query = `
      SELECT 
        int_disziplinenid as id, 
        var_name as name, 
        var_name,
        var_kurz1 as short_name,
        var_kurz1,
        var_kurz2 as display_name,
        var_kurz2,
        var_formel as formula,
        var_formel,
        var_maske as input_mask,
        var_maske,
        int_versuche as attempts,
        int_versuche,
        var_icon as icon,
        var_icon,
        var_kuerzel as shortcut,
        var_kuerzel,
        int_berechnung as calculation_type,
        int_berechnung,
        var_einheit as unit,
        var_einheit,
        bol_bahnen as lanes_division,
        bol_bahnen,
        bol_m as male_allowed,
        bol_m,
        bol_w as female_allowed,
        bol_w,
        int_sportid as sport_id,
        int_sportid,
        int_formelid as formula_id,
        int_formelid,
        bol_berechnen as should_calculate,
        bol_berechnen
      FROM tfx_disziplinen
      WHERE int_disziplinenid = $1
    `;
        const result = await prisma_1.default.$queryRawUnsafe(query, disciplineId);
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
exports.default = router;
//# sourceMappingURL=disciplines.js.map