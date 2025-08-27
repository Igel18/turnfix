const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors({
  origin: ['http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mock events endpoint
app.get('/api/events', (req, res) => {
  const mockEvents = [
    {
      int_eventid: 50,
      var_eventname: "Test Event 2024",
      dat_eventstartdate: "2024-10-15",
      dat_eventenddate: "2024-10-17",
      var_location: "Test Location",
      status: "upcoming"
    }
  ];
  
  res.json({ 
    events: mockEvents,
    total: mockEvents.length 
  });
});

// Mock competitions endpoint
app.get('/api/competitions', (req, res) => {
  const eventId = req.query.event_id;
  
  if (eventId) {
    const mockCompetitions = [
      {
        id: 1,
        name: "Men's Competition",
        number: "M1",
        round: 1,
        event_id: parseInt(eventId),
        participant_count: 25,
        discipline_count: 4
      },
      {
        id: 2,
        name: "Women's Competition", 
        number: "W1",
        round: 1,
        event_id: parseInt(eventId),
        participant_count: 30,
        discipline_count: 4
      }
    ];
    
    res.json({
      competitions: mockCompetitions,
      total: mockCompetitions.length
    });
  } else {
    res.json({
      competitions: [],
      total: 0
    });
  }
});

// Mock squads endpoint
app.get('/api/squads', (req, res) => {
  const competitionId = req.query.competition_id;
  
  if (competitionId) {
    const mockSquads = [
      {
        squad_name: "Squad A",
        participant_count: 12,
        individual_count: 12,
        group_count: 0,
        team_count: 0
      },
      {
        squad_name: "Squad B",
        participant_count: 13,
        individual_count: 13, 
        group_count: 0,
        team_count: 0
      }
    ];
    
    res.json({
      squads: mockSquads,
      total: mockSquads.length
    });
  } else {
    res.json({
      squads: [],
      total: 0
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mock server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
