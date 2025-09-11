const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'dummy-api'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Dummy API server is working!' });
});

// Dummy data generators
const generateId = () => Math.floor(Math.random() * 1000) + 1;

const generateDiscipline = (id = generateId()) => ({
  discipline_id: id,
  var_bezeichnung: `Discipline ${id}`,
  var_kurz1: `D${id}`,
  var_kurz2: `DIS${id}`,
  var_sort_order: id,
  res_pfad: `:/icons/discipline${id}.png`,
  aktiv: true
});

const generateAssociation = (id = generateId()) => ({
  association_id: id,
  var_bezeichnung: `Association ${id}`,
  var_kurz: `ASS${id}`,
  var_sort_order: id,
  aktiv: true
});

const generateRegion = (id = generateId()) => ({
  region_id: id,
  var_bezeichnung: `Region ${id}`,
  var_kurz: `REG${id}`,
  var_sort_order: id,
  aktiv: true
});

const generateClub = (id = generateId()) => ({
  club_id: id,
  var_bezeichnung: `Club ${id}`,
  var_kurz: `CLB${id}`,
  var_ort: `City ${id}`,
  var_plz: `${10000 + id}`,
  var_strasse: `Street ${id}`,
  region_id: Math.floor(Math.random() * 10) + 1,
  association_id: Math.floor(Math.random() * 5) + 1,
  aktiv: true
});

const generateParticipant = (id = generateId()) => ({
  participant_id: id,
  var_nachname: `Lastname${id}`,
  var_vorname: `Firstname${id}`,
  var_geschlecht: Math.random() > 0.5 ? 'male' : 'female',
  var_geburtsjahr: 1990 + Math.floor(Math.random() * 20),
  var_startnummer: id,
  club_id: Math.floor(Math.random() * 20) + 1,
  aktiv: true
});

const generateEvent = (id = generateId()) => ({
  event_id: id,
  var_bezeichnung: `Event ${id}`,
  var_kurz: `EVT${id}`,
  var_start_datum: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
  var_ende_datum: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
  var_ort: `Event City ${id}`,
  aktiv: true
});

const generateCompetition = (id = generateId()) => ({
  competition_id: id,
  var_bezeichnung: `Competition ${id}`,
  var_kurz: `COMP${id}`,
  var_geschlecht: Math.random() > 0.5 ? 'male' : 'female',
  var_altersgruppe: `Age Group ${Math.floor(Math.random() * 10) + 1}`,
  event_id: Math.floor(Math.random() * 10) + 1,
  aktiv: true
});

const generateScore = (id = generateId()) => ({
  score_id: id,
  participant_id: Math.floor(Math.random() * 50) + 1,
  discipline_id: Math.floor(Math.random() * 10) + 1,
  competition_id: Math.floor(Math.random() * 20) + 1,
  var_wertung: (Math.random() * 10 + 5).toFixed(2),
  var_rang: Math.floor(Math.random() * 20) + 1,
  aktiv: true
});

// API Routes

// Disciplines
app.get('/api/disciplines', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const disciplines = Array.from({ length: limit }, (_, i) => generateDiscipline(i + 1));
  res.json(disciplines);
});

app.get('/api/disciplines/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateDiscipline(id));
});

// Associations
app.get('/api/associations', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const associations = Array.from({ length: limit }, (_, i) => generateAssociation(i + 1));
  res.json(associations);
});

app.get('/api/associations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateAssociation(id));
});

// Regions
app.get('/api/regions', (req, res) => {
  const limit = parseInt(req.query.limit) || 15;
  const regions = Array.from({ length: limit }, (_, i) => generateRegion(i + 1));
  res.json(regions);
});

app.get('/api/regions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateRegion(id));
});

// Clubs
app.get('/api/clubs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const clubs = Array.from({ length: limit }, (_, i) => generateClub(i + 1));
  res.json(clubs);
});

app.get('/api/clubs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateClub(id));
});

// Participants
app.get('/api/participants', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  const participants = Array.from({ length: limit }, (_, i) => generateParticipant(i + 1));
  res.json(participants);
});

app.get('/api/participants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateParticipant(id));
});

// Events
app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const events = Array.from({ length: limit }, (_, i) => generateEvent(i + 1));
  res.json(events);
});

app.get('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateEvent(id));
});

// Competitions
app.get('/api/competitions', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const competitions = Array.from({ length: limit }, (_, i) => generateCompetition(i + 1));
  res.json(competitions);
});

app.get('/api/competitions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.json(generateCompetition(id));
});

app.get('/api/competitions/:id/disciplines', (req, res) => {
  const competitionId = parseInt(req.params.id);
  const disciplineCount = Math.floor(Math.random() * 6) + 3; // 3-8 disciplines per competition
  const disciplines = Array.from({ length: disciplineCount }, (_, i) => ({
    ...generateDiscipline(i + 1),
    competition_id: competitionId
  }));
  res.json(disciplines);
});

// Scores
app.get('/api/scores', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const scores = Array.from({ length: limit }, (_, i) => generateScore(i + 1));
  res.json(scores);
});

// Event ranking (for Results page)
app.get('/api/events/:eventId/ranking', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  const competitionCount = Math.floor(Math.random() * 5) + 3; // 3-7 competitions per event
  
  const competitions = Array.from({ length: competitionCount }, (_, i) => {
    const compId = i + 1;
    const participantCount = Math.floor(Math.random() * 20) + 10; // 10-30 participants per competition
    const disciplineCount = Math.floor(Math.random() * 6) + 3; // 3-8 disciplines per competition
    
    const participants = Array.from({ length: participantCount }, (_, j) => {
      const participant = generateParticipant(j + 1);
      const scores = Array.from({ length: disciplineCount }, (_, k) => ({
        discipline_id: k + 1,
        var_bezeichnung: `Discipline ${k + 1}`,
        var_kurz1: `D${k + 1}`,
        res_pfad: `:/icons/discipline${k + 1}.png`,
        score: (Math.random() * 5 + 10).toFixed(2),
        rank: Math.floor(Math.random() * participantCount) + 1
      }));
      
      const totalScore = scores.reduce((sum, score) => sum + parseFloat(score.score), 0);
      
      return {
        ...participant,
        scores,
        total_score: totalScore.toFixed(2),
        total_rank: Math.floor(Math.random() * participantCount) + 1
      };
    });
    
    return {
      competition_id: compId,
      var_bezeichnung: `Competition ${compId}`,
      var_geschlecht: Math.random() > 0.5 ? 'male' : 'female',
      var_altersgruppe: `Age Group ${Math.floor(Math.random() * 10) + 1}`,
      participants,
      disciplineInfo: Array.from({ length: disciplineCount }, (_, k) => ({
        discipline_id: k + 1,
        var_bezeichnung: `Discipline ${k + 1}`,
        var_kurz1: `D${k + 1}`,
        res_pfad: `:/icons/discipline${k + 1}.png`
      }))
    };
  });
  
  res.json(competitions);
});

// Generic CRUD operations for testing
const crudOperations = (entityName) => {
  const basePath = `/api/${entityName}`;
  
  app.post(basePath, (req, res) => {
    const newEntity = { ...req.body, id: generateId() };
    res.status(201).json(newEntity);
  });
  
  app.put(`${basePath}/:id`, (req, res) => {
    const id = parseInt(req.params.id);
    const updatedEntity = { ...req.body, id };
    res.json(updatedEntity);
  });
  
  app.delete(`${basePath}/:id`, (req, res) => {
    const id = parseInt(req.params.id);
    res.json({ message: `${entityName} ${id} deleted successfully` });
  });
};

// Apply CRUD operations to all entities
['disciplines', 'associations', 'regions', 'clubs', 'participants', 'events', 'competitions'].forEach(crudOperations);

// Error handling
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found in dummy API' });
});

app.use((err, req, res, next) => {
  console.error('Dummy API Error:', err);
  res.status(500).json({ error: 'Internal server error in dummy API' });
});

app.listen(PORT, () => {
  console.log(`🤖 Dummy API server running on port ${PORT}`);
  console.log(`🔗 Local API: http://localhost:${PORT}/api`);
  console.log(`📊 Environment: dummy-testing`);
});

module.exports = app;
