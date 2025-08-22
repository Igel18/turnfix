const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));
app.use(express.json());

// Events endpoint
app.get('/api/events', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Events endpoint called ===');
    const { limit = '10', offset = '0' } = req.query;

    const dataQuery = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        '' as var_description,
        0 as participant_count,
        0 as score_count
      FROM tfx_veranstaltungen v
      ORDER BY v.dat_von DESC, v.var_name
      LIMIT $1 OFFSET $2
    `;
    
    const events = await prisma.$queryRawUnsafe(dataQuery, parseInt(limit), parseInt(offset));
    
    // Format events
    const formattedEvents = events.map((event) => ({
      int_eventid: Number(event.int_eventid),
      var_eventname: event.var_eventname,
      dat_eventstartdate: event.dat_eventstartdate ? event.dat_eventstartdate.toISOString() : null,
      dat_eventenddate: event.dat_eventenddate ? event.dat_eventenddate.toISOString() : null,
      var_location: event.var_location,
      var_description: event.var_description,
      participant_count: Number(event.participant_count),
      score_count: Number(event.score_count)
    }));
    
    console.log(`=== SIMPLE EVENTS API: Sending ${formattedEvents.length} events ===`);
    console.log('Sample event:', JSON.stringify(formattedEvents[0], null, 2));
    
    res.json({
      events: formattedEvents,
      pagination: {
        total: formattedEvents.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Disciplines endpoints
app.get('/api/disciplines/filtered', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Disciplines filtered endpoint called ===');
    const { gender, ageFrom, ageTo, apparatus, category } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // Gender filter
    if (gender === 'male') {
      whereClause += ' AND bol_m = true';
    } else if (gender === 'female') {
      whereClause += ' AND bol_w = true';
    }

    const dataQuery = `
      SELECT 
        d.int_disziplinenid as id,
        d.var_name as name,
        d.var_kurz1 as short_name,
        d.var_kurz2 as display_name,
        d.var_icon as apparatus,
        d.bol_m as male_allowed,
        d.bol_w as female_allowed,
        CASE 
          WHEN d.bol_m AND d.bol_w THEN 'Mixed'
          WHEN d.bol_m THEN 'Männlich'
          WHEN d.bol_w THEN 'Weiblich'
          ELSE 'Unknown'
        END as gender_text,
        '' as age_from,
        '' as age_to,
        '' as age_range,
        0 as category_id,
        d.var_icon as icon,
        d.var_formel as formula,
        d.int_sportid as sport_id,
        d.var_maske as input_mask,
        d.int_versuche as attempts,
        '' as available_from,
        '' as available_to,
        true as active
      FROM tfx_disziplinen d
      ${whereClause}
      ORDER BY d.var_name
    `;
    
    const disciplines = await prisma.$queryRawUnsafe(dataQuery);
    
    // Format disciplines
    const formattedDisciplines = disciplines.map((discipline) => ({
      id: Number(discipline.id),
      name: discipline.name || '',
      short_name: discipline.short_name || '',
      display_name: discipline.display_name || '',
      apparatus: discipline.apparatus || '',
      male_allowed: Boolean(discipline.male_allowed),
      female_allowed: Boolean(discipline.female_allowed),
      gender_text: discipline.gender_text,
      age_from: discipline.age_from,
      age_to: discipline.age_to,
      age_range: discipline.age_range,
      category_id: Number(discipline.category_id) || 0,
      icon: discipline.icon || '',
      formula: discipline.formula || '',
      sport_id: Number(discipline.sport_id),
      input_mask: discipline.input_mask || '',
      attempts: Number(discipline.attempts) || 1,
      available_from: discipline.available_from,
      available_to: discipline.available_to,
      active: Boolean(discipline.active)
    }));
    
    console.log(`=== SIMPLE DISCIPLINES API: Sending ${formattedDisciplines.length} disciplines ===`);
    console.log('Sample discipline:', JSON.stringify(formattedDisciplines[0], null, 2));
    
    res.json(formattedDisciplines);
  } catch (error) {
    console.error('Disciplines Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Age groups endpoint
app.get('/api/disciplines/age-groups', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Age groups endpoint called ===');
    
    // For now, return some sample age groups since we don't have age info in disciplines
    const ageGroups = [
      { age_from: '6', age_to: '8', age_range: '6-8', discipline_count: 5 },
      { age_from: '9', age_to: '11', age_range: '9-11', discipline_count: 8 },
      { age_from: '12', age_to: '14', age_range: '12-14', discipline_count: 12 },
      { age_from: '15', age_to: '17', age_range: '15-17', discipline_count: 10 },
      { age_from: '18', age_to: '99', age_range: '18+', discipline_count: 15 }
    ];
    
    console.log(`=== Age groups API: Sending ${ageGroups.length} age groups ===`);
    res.json(ageGroups);
  } catch (error) {
    console.error('Age groups Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apparatus endpoint
app.get('/api/disciplines/apparatus', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Apparatus endpoint called ===');
    
    const apparatusQuery = `
      SELECT 
        d.var_icon as apparatus,
        COUNT(*) as discipline_count
      FROM tfx_disziplinen d
      WHERE d.var_icon IS NOT NULL AND d.var_icon != ''
      GROUP BY d.var_icon
      ORDER BY d.var_icon
    `;
    
    const apparatusData = await prisma.$queryRawUnsafe(apparatusQuery);
    
    const formattedApparatus = apparatusData.map((item) => ({
      apparatus: item.apparatus || 'Unknown',
      discipline_count: Number(item.discipline_count) || 0
    }));
    
    console.log(`=== Apparatus API: Sending ${formattedApparatus.length} apparatus types ===`);
    res.json(formattedApparatus);
  } catch (error) {
    console.error('Apparatus Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Categories endpoint
app.get('/api/disciplines/categories', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Categories endpoint called ===');
    
    // Get categories from sports table
    const categoriesQuery = `
      SELECT 
        s.int_sportid as id,
        s.var_name as name,
        s.var_name as short_name,
        COUNT(d.int_disziplinenid) as discipline_count
      FROM tfx_sport s
      LEFT JOIN tfx_disziplinen d ON s.int_sportid = d.int_sportid
      GROUP BY s.int_sportid, s.var_name
      ORDER BY s.var_name
    `;
    
    const categoriesData = await prisma.$queryRawUnsafe(categoriesQuery);
    
    const formattedCategories = categoriesData.map((category) => ({
      id: Number(category.id),
      name: category.name || '',
      short_name: category.short_name || '',
      discipline_count: Number(category.discipline_count) || 0
    }));
    
    console.log(`=== Categories API: Sending ${formattedCategories.length} categories ===`);
    res.json(formattedCategories);
  } catch (error) {
    console.error('Categories Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create discipline endpoint
app.post('/api/disciplines', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Create discipline endpoint called ===');
    const { name, short_name, display_name, apparatus, male_allowed, female_allowed, gender_text, age_from, age_to, available_from, available_to, active } = req.body;

    const insertQuery = `
      INSERT INTO tfx_disziplinen (
        int_sportid, var_name, var_kurz1, var_kurz2, var_icon, 
        bol_m, bol_w, int_versuche
      ) VALUES (
        1, $1, $2, $3, $4, $5, $6, 1
      ) RETURNING int_disziplinenid
    `;
    
    const result = await prisma.$queryRawUnsafe(insertQuery, 
      name, short_name || '', display_name || '', apparatus || '',
      Boolean(male_allowed), Boolean(female_allowed)
    );
    
    console.log('=== Discipline created successfully ===', result);
    res.json({ success: true, id: result[0].int_disziplinenid });
  } catch (error) {
    console.error('Create discipline Error:', error);
    res.status(500).json({ error: 'Server error creating discipline' });
  }
});

// Update discipline endpoint
app.put('/api/disciplines/:id', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Update discipline endpoint called ===');
    const { id } = req.params;
    const { name, short_name, display_name, apparatus, male_allowed, female_allowed, gender_text, age_from, age_to, available_from, available_to, active } = req.body;

    const updateQuery = `
      UPDATE tfx_disziplinen 
      SET var_name = $1, var_kurz1 = $2, var_kurz2 = $3, var_icon = $4,
          bol_m = $5, bol_w = $6
      WHERE int_disziplinenid = $7
    `;
    
    await prisma.$queryRawUnsafe(updateQuery, 
      name, short_name || '', display_name || '', apparatus || '',
      Boolean(male_allowed), Boolean(female_allowed), parseInt(id)
    );
    
    console.log('=== Discipline updated successfully ===', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Update discipline Error:', error);
    res.status(500).json({ error: 'Server error updating discipline' });
  }
});

// Delete discipline endpoint
app.delete('/api/disciplines/:id', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Delete discipline endpoint called ===');
    const { id } = req.params;

    const deleteQuery = `DELETE FROM tfx_disziplinen WHERE int_disziplinenid = $1`;
    
    await prisma.$queryRawUnsafe(deleteQuery, parseInt(id));
    
    console.log('=== Discipline deleted successfully ===', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete discipline Error:', error);
    res.status(500).json({ error: 'Server error deleting discipline' });
  }
});

// ===== REGIONS (tfx_gaue) API =====

// Get all regions with optional filtering
app.get('/api/regions', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Regions endpoint called ===', req.query);
    const { search, verband_id, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` WHERE LOWER(g.var_name) LIKE LOWER($${paramIndex}) OR LOWER(g.var_kuerzel) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (verband_id) {
      whereClause += search ? ' AND' : ' WHERE';
      whereClause += ` g.int_verbaendeid = $${paramIndex}`;
      params.push(parseInt(verband_id));
      paramIndex++;
    }
    
    const query = `
      SELECT 
        g.int_gaueid, 
        g.var_name, 
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as verband_name,
        v.var_kuerzel as verband_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
      ORDER BY g.var_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const regions = await prisma.$queryRawUnsafe(query, ...params);
    console.log('=== Regions found:', regions.length);
    
    res.json({ regions, count: regions.length });
  } catch (error) {
    console.error('Regions API error:', error);
    res.status(500).json({ error: 'Server error fetching regions' });
  }
});

// Get verbaende for regions dropdown
app.get('/api/regions/data/verbaende', async (req, res) => {
  try {
    const query = `
      SELECT int_verbaendeid, var_name, var_kuerzel
      FROM tfx_verbaende
      ORDER BY var_name ASC
    `;
    
    const verbaende = await prisma.$queryRawUnsafe(query);
    res.json(verbaende);
  } catch (error) {
    console.error('Error fetching verbaende:', error);
    res.status(500).json({ error: 'Server error fetching verbaende' });
  }
});

// Create region
app.post('/api/regions', async (req, res) => {
  try {
    const { var_name, var_kuerzel, int_verbaendeid } = req.body;
    
    const insertQuery = `
      INSERT INTO tfx_gaue (var_name, var_kuerzel, int_verbaendeid) 
      VALUES ($1, $2, $3) 
      RETURNING int_gaueid
    `;
    
    const result = await prisma.$queryRawUnsafe(insertQuery, 
      var_name, var_kuerzel || null, int_verbaendeid || null
    );
    
    res.json({ success: true, id: result[0].int_gaueid });
  } catch (error) {
    console.error('Create region error:', error);
    res.status(500).json({ error: 'Server error creating region' });
  }
});

// Update region
app.put('/api/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { var_name, var_kuerzel, int_verbaendeid } = req.body;
    
    const updateQuery = `
      UPDATE tfx_gaue 
      SET var_name = $1, var_kuerzel = $2, int_verbaendeid = $3
      WHERE int_gaueid = $4
    `;
    
    await prisma.$queryRawUnsafe(updateQuery, 
      var_name, var_kuerzel || null, int_verbaendeid || null, parseInt(id)
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update region error:', error);
    res.status(500).json({ error: 'Server error updating region' });
  }
});

// Delete region
app.delete('/api/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if region is being used by clubs
    const clubCheck = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM tfx_vereine WHERE int_gaueid = $1', 
      parseInt(id)
    );
    
    if (parseInt(clubCheck[0]?.count || '0') > 0) {
      return res.status(400).json({ 
        error: `Cannot delete region. It is currently assigned to ${clubCheck[0].count} club(s).` 
      });
    }
    
    const deleteQuery = `DELETE FROM tfx_gaue WHERE int_gaueid = $1`;
    await prisma.$queryRawUnsafe(deleteQuery, parseInt(id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete region error:', error);
    res.status(500).json({ error: 'Server error deleting region' });
  }
});

// ===== ASSOCIATIONS (tfx_verbaende) API =====

// Get all associations with optional filtering  
app.get('/api/associations', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Associations endpoint called ===', req.query);
    const { search, country_id, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` WHERE LOWER(v.var_name) LIKE LOWER($${paramIndex}) OR LOWER(v.var_kuerzel) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (country_id) {
      whereClause += search ? ' AND' : ' WHERE';
      whereClause += ` v.int_laenderid = $${paramIndex}`;
      params.push(parseInt(country_id));
      paramIndex++;
    }
    
    const query = `
      SELECT 
        v.int_verbaendeid, 
        v.var_name, 
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      ${whereClause}
      ORDER BY v.var_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const associations = await prisma.$queryRawUnsafe(query, ...params);
    console.log('=== Associations found:', associations.length);
    
    res.json({ associations, count: associations.length });
  } catch (error) {
    console.error('Associations API error:', error);
    res.status(500).json({ error: 'Server error fetching associations' });
  }
});

// Get countries for associations dropdown
app.get('/api/associations/data/laender', async (req, res) => {
  try {
    const query = `
      SELECT int_laenderid, var_name, var_kuerzel
      FROM tfx_laender
      ORDER BY var_name ASC
    `;
    
    const countries = await prisma.$queryRawUnsafe(query);
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Server error fetching countries' });
  }
});

// Create association
app.post('/api/associations', async (req, res) => {
  try {
    const { var_name, var_kuerzel, int_laenderid } = req.body;
    
    const insertQuery = `
      INSERT INTO tfx_verbaende (var_name, var_kuerzel, int_laenderid) 
      VALUES ($1, $2, $3) 
      RETURNING int_verbaendeid
    `;
    
    const result = await prisma.$queryRawUnsafe(insertQuery, 
      var_name, var_kuerzel || null, int_laenderid || null
    );
    
    res.json({ success: true, id: result[0].int_verbaendeid });
  } catch (error) {
    console.error('Create association error:', error);
    res.status(500).json({ error: 'Server error creating association' });
  }
});

// Update association
app.put('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { var_name, var_kuerzel, int_laenderid } = req.body;
    
    const updateQuery = `
      UPDATE tfx_verbaende 
      SET var_name = $1, var_kuerzel = $2, int_laenderid = $3
      WHERE int_verbaendeid = $4
    `;
    
    await prisma.$queryRawUnsafe(updateQuery, 
      var_name, var_kuerzel || null, int_laenderid || null, parseInt(id)
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update association error:', error);
    res.status(500).json({ error: 'Server error updating association' });
  }
});

// Delete association
app.delete('/api/associations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if association is being used by regions
    const regionCheck = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM tfx_gaue WHERE int_verbaendeid = $1', 
      parseInt(id)
    );
    
    if (parseInt(regionCheck[0]?.count || '0') > 0) {
      return res.status(400).json({ 
        error: `Cannot delete association. It is currently assigned to ${regionCheck[0].count} region(s).` 
      });
    }
    
    const deleteQuery = `DELETE FROM tfx_verbaende WHERE int_verbaendeid = $1`;
    await prisma.$queryRawUnsafe(deleteQuery, parseInt(id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete association error:', error);
    res.status(500).json({ error: 'Server error deleting association' });
  }
});

// ===== CLUBS (tfx_vereine) API =====

// Get all clubs with optional filtering
app.get('/api/clubs', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Clubs endpoint called ===', req.query);
    const { search, gau_id, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` WHERE LOWER(c.var_name) LIKE LOWER($${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (gau_id) {
      whereClause += search ? ' AND' : ' WHERE';
      whereClause += ` c.int_gaueid = $${paramIndex}`;
      params.push(parseInt(gau_id));
      paramIndex++;
    }
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_vereine c
      LEFT JOIN tfx_gaue g ON c.int_gaueid = g.int_gaueid
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
    `;
    
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, params.length));
    const totalCount = parseInt(countResult[0]?.total || '0');
    
    const query = `
      SELECT 
        c.int_vereineid as id, 
        c.var_name as name, 
        c.var_website as website,
        c.int_gaueid,
        g.var_name as region_name,
        v.var_name as association_name,
        (SELECT COUNT(*) FROM tfx_teilnehmer WHERE int_vereineid = c.int_vereineid) as athlete_count,
        c.int_start_ort,
        true as isActive,
        NOW() as createdAt
      FROM tfx_vereine c
      LEFT JOIN tfx_gaue g ON c.int_gaueid = g.int_gaueid
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
      ORDER BY c.var_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const clubs = await prisma.$queryRawUnsafe(query, ...params);
    console.log('=== Clubs found:', clubs.length);
    
    // Convert BigInt values to numbers to avoid JSON serialization issues
    const serializedClubs = clubs.map(club => ({
      ...club,
      id: Number(club.id),
      int_gaueid: club.int_gaueid ? Number(club.int_gaueid) : null,
      athlete_count: Number(club.athlete_count || 0),
      int_start_ort: club.int_start_ort ? Number(club.int_start_ort) : null
    }));
    
    res.json({ 
      clubs: serializedClubs, 
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Clubs API error:', error);
    res.status(500).json({ error: 'Server error fetching clubs' });
  }
});

// Get regions for clubs dropdown
app.get('/api/clubs/data/gaue', async (req, res) => {
  try {
    const query = `
      SELECT g.int_gaueid, g.var_name, g.var_kuerzel, v.var_name as verband_name
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ORDER BY g.var_name ASC
    `;
    
    const regions = await prisma.$queryRawUnsafe(query);
    
    // Convert BigInt values to numbers to avoid JSON serialization issues
    const serializedRegions = regions.map(region => ({
      ...region,
      int_gaueid: Number(region.int_gaueid)
    }));
    
    res.json(serializedRegions);
  } catch (error) {
    console.error('Error fetching regions for clubs:', error);
    res.status(500).json({ error: 'Server error fetching regions' });
  }
});

// Create club
app.post('/api/clubs', async (req, res) => {
  try {
    const { name, website, int_gaueid } = req.body;
    
    const insertQuery = `
      INSERT INTO tfx_vereine (var_name, var_website, int_gaueid, int_start_ort) 
      VALUES ($1, $2, $3, 0) 
      RETURNING int_vereineid
    `;
    
    const result = await prisma.$queryRawUnsafe(insertQuery, 
      name, website || null, int_gaueid || 1
    );
    
    res.json({ success: true, id: Number(result[0].int_vereineid) });
  } catch (error) {
    console.error('Create club error:', error);
    res.status(500).json({ error: 'Server error creating club' });
  }
});

// Update club
app.put('/api/clubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, website, int_gaueid } = req.body;
    
    const updateQuery = `
      UPDATE tfx_vereine 
      SET var_name = $1, var_website = $2, int_gaueid = $3
      WHERE int_vereineid = $4
    `;
    
    await prisma.$queryRawUnsafe(updateQuery, 
      name, website || null, int_gaueid || 1, parseInt(id)
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({ error: 'Server error updating club' });
  }
});

// Delete club
app.delete('/api/clubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if club is being used by participants
    const participantCheck = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM tfx_teilnehmer WHERE int_vereineid = $1', 
      parseInt(id)
    );
    
    if (parseInt(participantCheck[0]?.count || '0') > 0) {
      return res.status(400).json({ 
        error: `Cannot delete club. It has ${participantCheck[0].count} registered participant(s).` 
      });
    }
    
    const deleteQuery = `DELETE FROM tfx_vereine WHERE int_vereineid = $1`;
    await prisma.$queryRawUnsafe(deleteQuery, parseInt(id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete club error:', error);
    res.status(500).json({ error: 'Server error deleting club' });
  }
});

// ===== PARTICIPANTS (tfx_teilnehmer) API =====

// Get all participants with optional filtering
app.get('/api/participants', async (req, res) => {
  try {
    console.log('=== SIMPLE API: Participants endpoint called ===', req.query);
    const { search, club_id, gender, age_min, age_max, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` WHERE (LOWER(t.var_vorname) LIKE LOWER($${paramIndex}) OR LOWER(t.var_nachname) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (club_id) {
      whereClause += search ? ' AND' : ' WHERE';
      whereClause += ` t.int_vereineid = $${paramIndex}`;
      params.push(parseInt(club_id));
      paramIndex++;
    }
    
    if (gender) {
      whereClause += (search || club_id) ? ' AND' : ' WHERE';
      whereClause += ` t.int_geschlecht = $${paramIndex}`;
      params.push(gender === 'male' ? 1 : 0);
      paramIndex++;
    }
    
    // Age filtering based on birth year calculation
    if (age_min || age_max) {
      const currentYear = new Date().getFullYear();
      if (age_min) {
        whereClause += (search || club_id || gender) ? ' AND' : ' WHERE';
        whereClause += ` (${currentYear} - EXTRACT(YEAR FROM t.dat_geburtstag)) >= $${paramIndex}`;
        params.push(parseInt(age_min));
        paramIndex++;
      }
      if (age_max) {
        whereClause += (search || club_id || gender || age_min) ? ' AND' : ' WHERE';
        whereClause += ` (${currentYear} - EXTRACT(YEAR FROM t.dat_geburtstag)) <= $${paramIndex}`;
        params.push(parseInt(age_max));
        paramIndex++;
      }
    }
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      ${whereClause}
    `;
    
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, params.length));
    const totalCount = parseInt(countResult[0]?.total || '0');
    
    const query = `
      SELECT 
        t.int_teilnehmerid, 
        t.var_nachname, 
        t.var_vorname,
        t.dat_geburtstag,
        t.int_geschlecht,
        t.int_vereineid,
        t.int_startpassnummer,
        v.var_name as verein_name,
        CASE 
          WHEN t.int_geschlecht = 0 THEN 'weiblich'
          WHEN t.int_geschlecht = 1 THEN 'männlich'
          ELSE 'unbekannt'
        END as geschlecht_name,
        EXTRACT(YEAR FROM AGE(t.dat_geburtstag)) as age
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      ${whereClause}
      ORDER BY t.var_nachname, t.var_vorname
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const participants = await prisma.$queryRawUnsafe(query, ...params);
    console.log('=== Participants found:', participants.length);
    
    res.json({ 
      participants, 
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Participants API error:', error);
    res.status(500).json({ error: 'Server error fetching participants' });
  }
});

// Get clubs for participants dropdown
app.get('/api/participants/data/clubs', async (req, res) => {
  try {
    const query = `
      SELECT int_vereineid, var_name
      FROM tfx_vereine
      ORDER BY var_name ASC
    `;
    
    const clubs = await prisma.$queryRawUnsafe(query);
    res.json(clubs);
  } catch (error) {
    console.error('Error fetching clubs for participants:', error);
    res.status(500).json({ error: 'Server error fetching clubs' });
  }
});

// Create participant
app.post('/api/participants', async (req, res) => {
  try {
    const { var_vorname, var_nachname, dat_geburtsdatum, var_geschlecht, int_vereineid } = req.body;
    
    const insertQuery = `
      INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_geschlecht, int_vereineid) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING int_teilnehmerid
    `;
    
    const result = await prisma.$queryRawUnsafe(insertQuery, 
      var_vorname, 
      var_nachname, 
      new Date(dat_geburtsdatum),
      var_geschlecht === 'male' ? 1 : 0,
      parseInt(int_vereineid)
    );
    
    res.json({ success: true, id: result[0].int_teilnehmerid });
  } catch (error) {
    console.error('Create participant error:', error);
    res.status(500).json({ error: 'Server error creating participant' });
  }
});

// Update participant
app.put('/api/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { var_vorname, var_nachname, dat_geburtsdatum, var_geschlecht, int_vereineid } = req.body;
    
    const updateQuery = `
      UPDATE tfx_teilnehmer 
      SET var_vorname = $1, var_nachname = $2, dat_geburtstag = $3, int_geschlecht = $4, int_vereineid = $5
      WHERE int_teilnehmerid = $6
    `;
    
    await prisma.$queryRawUnsafe(updateQuery, 
      var_vorname, 
      var_nachname, 
      new Date(dat_geburtsdatum),
      var_geschlecht === 'male' ? 1 : 0,
      parseInt(int_vereineid),
      parseInt(id)
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Server error updating participant' });
  }
});

// Delete participant
app.delete('/api/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if participant is being used in competitions
    const competitionCheck = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM tfx_wertungen WHERE int_teilnehmerid = $1', 
      parseInt(id)
    );
    
    if (parseInt(competitionCheck[0]?.count || '0') > 0) {
      return res.status(400).json({ 
        error: `Cannot delete participant. They are registered in ${competitionCheck[0].count} competition(s).` 
      });
    }
    
    const deleteQuery = `DELETE FROM tfx_teilnehmer WHERE int_teilnehmerid = $1`;
    await prisma.$queryRawUnsafe(deleteQuery, parseInt(id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ error: 'Server error deleting participant' });
  }
});

// ===============================================
// EVENT SELECTION & COMPETITION MANAGEMENT API
// ===============================================

// Get competitions for selected event
app.get('/api/events/:eventId/competitions', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('=== SIMPLE API: Event competitions endpoint called ===', { eventId });

    const query = `
      SELECT 
        w.int_wettkaempfeid as id,
        w.var_name as name,
        w.var_nummer as number,
        w.int_runde as round,
        w.int_veranstaltungenid as event_id,
        COUNT(DISTINCT wer.int_wertungenid) as participant_count,
        COUNT(DISTINCT wd.int_disziplinenid) as discipline_count
      FROM tfx_wettkaempfe w
      LEFT JOIN tfx_wertungen wer ON w.int_wettkaempfeid = wer.int_wettkaempfeid
      LEFT JOIN tfx_wettkaempfe_x_disziplinen wd ON w.int_wettkaempfeid = wd.int_wettkaempfeid
      WHERE w.int_veranstaltungenid = $1
      GROUP BY w.int_wettkaempfeid, w.var_name, w.var_nummer, w.int_runde, w.int_veranstaltungenid
      ORDER BY w.var_nummer, w.var_name
    `;
    
    const competitions = await prisma.$queryRawUnsafe(query, parseInt(eventId));
    
    // Convert BigInt values to numbers
    const serializedCompetitions = competitions.map(comp => ({
      ...comp,
      id: Number(comp.id),
      event_id: Number(comp.event_id),
      participant_count: Number(comp.participant_count || 0),
      discipline_count: Number(comp.discipline_count || 0)
    }));

    console.log('=== Competitions found:', serializedCompetitions.length);
    res.json({ competitions: serializedCompetitions });
  } catch (error) {
    console.error('Event competitions API error:', error);
    res.status(500).json({ error: 'Server error fetching event competitions' });
  }
});

// Get squads for selected event and competition
app.get('/api/events/:eventId/squads', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { competitionId } = req.query;
    console.log('=== SIMPLE API: Event squads endpoint called ===', { eventId, competitionId });

    let whereClause = 'WHERE w.int_veranstaltungenid = $1';
    let params = [parseInt(eventId)];
    
    if (competitionId) {
      whereClause += ' AND wer.int_wettkaempfeid = $2';
      params.push(parseInt(competitionId));
    }

    const query = `
      SELECT 
        wer.var_riege as squad_name,
        COUNT(DISTINCT wer.int_wertungenid) as participant_count,
        COUNT(DISTINCT wer.int_teilnehmerid) as individual_count,
        COUNT(DISTINCT wer.int_gruppenid) as group_count,
        COUNT(DISTINCT wer.int_mannschaftenid) as team_count
      FROM tfx_wettkaempfe w
      INNER JOIN tfx_wertungen wer ON w.int_wettkaempfeid = wer.int_wettkaempfeid
      ${whereClause}
      AND wer.var_riege IS NOT NULL 
      AND wer.var_riege != ''
      GROUP BY wer.var_riege
      ORDER BY wer.var_riege
    `;
    
    const squads = await prisma.$queryRawUnsafe(query, ...params);
    
    // Convert BigInt values to numbers
    const serializedSquads = squads.map(squad => ({
      ...squad,
      participant_count: Number(squad.participant_count || 0),
      individual_count: Number(squad.individual_count || 0),
      group_count: Number(squad.group_count || 0),
      team_count: Number(squad.team_count || 0)
    }));

    console.log('=== Squads found:', serializedSquads.length);
    res.json({ squads: serializedSquads });
  } catch (error) {
    console.error('Event squads API error:', error);
    res.status(500).json({ error: 'Server error fetching event squads' });
  }
});

// Get scores for selected event, competition, and squad
app.get('/api/events/:eventId/scores', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { competitionId, squadName, limit = '50', offset = '0' } = req.query;
    console.log('=== SIMPLE API: Event scores endpoint called ===', { eventId, competitionId, squadName });

    let whereClause = 'WHERE w.int_veranstaltungenid = $1';
    let params = [parseInt(eventId)];
    let paramIndex = 2;
    
    if (competitionId) {
      whereClause += ` AND wer.int_wettkaempfeid = $${paramIndex}`;
      params.push(parseInt(competitionId));
      paramIndex++;
    }
    
    if (squadName) {
      whereClause += ` AND wer.var_riege = $${paramIndex}`;
      params.push(squadName);
      paramIndex++;
    }

    const query = `
      SELECT 
        wer.int_wertungenid as score_id,
        wer.int_startnummer as start_number,
        CASE 
          WHEN wer.int_teilnehmerid IS NOT NULL THEN t.var_nachname || ', ' || t.var_vorname
          WHEN wer.int_gruppenid IS NOT NULL THEN g.var_name
          WHEN wer.int_mannschaftenid IS NOT NULL THEN m.int_nummer || '. Mannschaft'
          ELSE 'Unknown'
        END as participant_name,
        CASE
          WHEN wer.int_teilnehmerid IS NOT NULL THEN 'Individual'
          WHEN wer.int_gruppenid IS NOT NULL THEN 'Group'
          WHEN wer.int_mannschaftenid IS NOT NULL THEN 'Team'
          ELSE 'Unknown'
        END as participant_type,
        v.var_name as club_name,
        wk.var_name as competition_name,
        wk.var_nummer as competition_number,
        wer.var_riege as squad,
        wer.bol_startet_nicht as not_starting,
        wer.bol_ak as age_class,
        COUNT(DISTINCT wd.int_wertungen_x_disziplinenid) as completed_disciplines,
        COUNT(DISTINCT wxd.int_disziplinenid) as total_disciplines
      FROM tfx_wettkaempfe w
      INNER JOIN tfx_wertungen wer ON w.int_wettkaempfeid = wer.int_wettkaempfeid
      INNER JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = wer.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON wer.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_gruppen g ON wer.int_gruppenid = g.int_gruppenid
      LEFT JOIN tfx_mannschaften m ON wer.int_mannschaftenid = m.int_mannschaftenid
      LEFT JOIN tfx_vereine v ON v.int_vereineid = t.int_vereineid OR v.int_vereineid = g.int_vereineid OR v.int_vereineid = m.int_vereineid
      LEFT JOIN tfx_wertungen_x_disziplinen wd ON wd.int_wertungenid = wer.int_wertungenid
      LEFT JOIN tfx_wettkaempfe_x_disziplinen wxd ON wxd.int_wettkaempfeid = wer.int_wettkaempfeid
      ${whereClause}
      GROUP BY wer.int_wertungenid, wer.int_startnummer, t.var_nachname, t.var_vorname, 
               g.var_name, m.int_nummer, v.var_name, wk.var_name, wk.var_nummer, 
               wer.var_riege, wer.bol_startet_nicht, wer.bol_ak
      ORDER BY wer.int_startnummer, participant_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const scores = await prisma.$queryRawUnsafe(query, ...params);
    
    // Convert BigInt values to numbers
    const serializedScores = scores.map(score => ({
      ...score,
      score_id: Number(score.score_id),
      start_number: Number(score.start_number || 0),
      completed_disciplines: Number(score.completed_disciplines || 0),
      total_disciplines: Number(score.total_disciplines || 0)
    }));

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT wer.int_wertungenid) as total
      FROM tfx_wettkaempfe w
      INNER JOIN tfx_wertungen wer ON w.int_wettkaempfeid = wer.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON wer.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_gruppen g ON wer.int_gruppenid = g.int_gruppenid
      LEFT JOIN tfx_mannschaften m ON wer.int_mannschaftenid = m.int_mannschaftenid
      LEFT JOIN tfx_vereine v ON v.int_vereineid = t.int_vereineid OR v.int_vereineid = g.int_vereineid OR v.int_vereineid = m.int_vereineid
      ${whereClause}
    `;
    
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, params.length - 2));
    const totalCount = parseInt(countResult[0]?.total || '0');

    console.log('=== Scores found:', serializedScores.length);
    res.json({ 
      scores: serializedScores,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Event scores API error:', error);
    res.status(500).json({ error: 'Server error fetching event scores' });
  }
});

// Get disciplines for selected event and competition
app.get('/api/events/:eventId/disciplines', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { competitionId } = req.query;
    console.log('=== SIMPLE API: Event disciplines endpoint called ===', { eventId, competitionId });

    let whereClause = 'WHERE w.int_veranstaltungenid = $1';
    let params = [parseInt(eventId)];
    
    if (competitionId) {
      whereClause += ' AND wd.int_wettkaempfeid = $2';
      params.push(parseInt(competitionId));
    }

    const query = `
      SELECT 
        d.int_disziplinenid as id,
        d.var_name as name,
        d.var_kurz as short_name,
        d.var_kurz2 as display_name,
        d.var_icon as icon,
        d.bol_wertung_m as male_allowed,
        d.bol_wertung_w as female_allowed,
        wd.int_sortierung as sort_order,
        wd.bol_kp as is_compulsory,
        COUNT(DISTINCT wer.int_wertungenid) as participant_count
      FROM tfx_wettkaempfe w
      INNER JOIN tfx_wettkaempfe_x_disziplinen wd ON w.int_wettkaempfeid = wd.int_wettkaempfeid
      INNER JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid
      LEFT JOIN tfx_wertungen wer ON w.int_wettkaempfeid = wer.int_wettkaempfeid
      ${whereClause}
      GROUP BY d.int_disziplinenid, d.var_name, d.var_kurz, d.var_kurz2, d.var_icon, 
               d.bol_wertung_m, d.bol_wertung_w, wd.int_sortierung, wd.bol_kp
      ORDER BY wd.int_sortierung, d.var_name
    `;
    
    const disciplines = await prisma.$queryRawUnsafe(query, ...params);
    
    // Convert BigInt values to numbers
    const serializedDisciplines = disciplines.map(disc => ({
      ...disc,
      id: Number(disc.id),
      sort_order: disc.sort_order ? Number(disc.sort_order) : null,
      participant_count: Number(disc.participant_count || 0)
    }));

    console.log('=== Event disciplines found:', serializedDisciplines.length);
    res.json({ disciplines: serializedDisciplines });
  } catch (error) {
    console.error('Event disciplines API error:', error);
    res.status(500).json({ error: 'Server error fetching event disciplines' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`🔗 Events API: http://localhost:${PORT}/api/events`);
  console.log(`🔗 Event Competitions API: http://localhost:${PORT}/api/events/:eventId/competitions`);
  console.log(`🔗 Event Squads API: http://localhost:${PORT}/api/events/:eventId/squads`);
  console.log(`🔗 Event Scores API: http://localhost:${PORT}/api/events/:eventId/scores`);
  console.log(`🔗 Event Disciplines API: http://localhost:${PORT}/api/events/:eventId/disciplines`);
  console.log(`🔗 Disciplines API: http://localhost:${PORT}/api/disciplines/filtered`);
  console.log(`🔗 Age Groups API: http://localhost:${PORT}/api/disciplines/age-groups`);
  console.log(`🔗 Apparatus API: http://localhost:${PORT}/api/disciplines/apparatus`);
  console.log(`🔗 Categories API: http://localhost:${PORT}/api/disciplines/categories`);
  console.log(`🔗 Regions API: http://localhost:${PORT}/api/regions`);
  console.log(`🔗 Associations API: http://localhost:${PORT}/api/associations`);
  console.log(`🔗 Clubs API: http://localhost:${PORT}/api/clubs`);
  console.log(`🔗 Participants API: http://localhost:${PORT}/api/participants`);
});
