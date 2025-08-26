// apiRoutesAddTest.js
// Tests for all API routes that add data (POST/create)
// Run with: node apiRoutesAddTest.js

const axios = require('axios');
const baseURL = 'http://localhost:3002/api';

// If authentication is required, set your token here
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const headers = {};

async function testAddClub() {
  try {
    const res = await axios.post(`${baseURL}/clubs`, {
      var_name: 'Test Club',
      var_website: 'https://testclub.example',
      int_gaueid: 1,
      int_personenid: 1,
      int_start_ort: 1
    }, { headers });
    console.log('Add Club:', res.status, res.data);
  } catch (err) {
    console.error('Add Club Error:', err.response?.data || err.message);
  }
}

async function testAddCompetitionEntry() {
  try {
    const res = await axios.post(`${baseURL}/competitionEntries`, {
      int_wettkampf_id: 1,
      int_teilnehmer_id: 1,
      int_startnummer: 99
    }, { headers });
    console.log('Add Competition Entry:', res.status, res.data);
  } catch (err) {
    console.error('Add Competition Entry Error:', err.response?.data || err.message);
  }
}

async function testAddCompetition() {
  try {
    const res = await axios.post(`${baseURL}/competitions`, {
      name: 'Test Competition',
      description: 'A test competition',
      date: '2025-08-26',
      location: 'Test City',
      gender: 'gemischt',
      ageFrom: 10,
      ageTo: 18,
      disciplines: [1],
      maxParticipants: 100,
      registrationDeadline: '2025-08-20',
      organizer: 'Test Organizer'
    }, { headers });
    console.log('Add Competition:', res.status, res.data);
  } catch (err) {
    console.error('Add Competition Error:', err.response?.data || err.message);
  }
}

async function testAddDiscipline() {
  try {
    const res = await axios.post(`${baseURL}/disciplines`, {
      name: 'Test Discipline',
      shortName: 'TD',
      sportId: 1
    }, { headers });
    console.log('Add Discipline:', res.status, res.data);
  } catch (err) {
    if (err.response) {
      console.error('Add Discipline Error:', {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers
      });
    } else {
      console.error('Add Discipline Error:', err.message);
      if (err.stack) console.error('Stack:', err.stack);
    }
  }
}

async function testAddEventParticipant() {
  try {
    const res = await axios.post(`${baseURL}/participants`, {
      var_vorname: 'Max',
      var_nachname: 'Mustermann',
      int_vereineid: 1,
      int_geschlecht: 1,
      dat_geburtstag: '2000-01-01',
      bool_nur_jahr: false,
      int_startpassnummer: 12345
    }, { headers });
    console.log('Add Event Participant:', res.status, res.data);
  } catch (err) {
    console.error('Add Event Participant Error:', err.response?.data || err.message);
  }
}

async function testAddResult() {
  try {
    const res = await axios.post(`${baseURL}/results`, {
      competitionId: 1,
      participantId: 1,
      disciplineId: 1,
      score: 100,
      rank: 1, // optional
      notes: "Test result" // optional
    }, { headers });
    console.log('Add Result:', res.status, res.data);
  } catch (err) {
    console.error('Add Result Error:', err.response?.data || err.message);
  }
}

async function testAddScore() {
  try {
    const res = await axios.post(`${baseURL}/scores`, {
      competitionId: 1,
      participantId: 1,
    statusId: 1,
    score: 100,
    attempt: 1, // optional, default 1
      notes: "Test score" // optional
    }, { headers });
    console.log('Add Score:', res.status, res.data);
  } catch (err) {
    console.error('Add Score Error:', err.response?.data || err.message);
  }
}

async function testAddCountry() {
  try {
    const res = await axios.post(`${baseURL}/countries`, {
  var_name: 'Test Country',
  var_kuerzel: 'TC'
    }, { headers });
    console.log('Add Country:', res.status, res.data);
  } catch (err) {
    console.error('Add Country Error:', err.response?.data || err.message);
  }
}

async function testAddArea() {
  try {
    const res = await axios.post(`${baseURL}/areas`, {
      var_name: 'Test Area',
      bol_maennlich: true,
      bol_weiblich: true
    }, { headers });
    console.log('Add Area:', res.status, res.data);
  } catch (err) {
    console.error('Add Area Error:', err.response?.data || err.message);
  }
}

async function runAllTests() {
  await testAddClub();
  await testAddCompetitionEntry();
  await testAddCompetition();
  await testAddDiscipline();
  await testAddEventParticipant();
  await testAddResult();
  await testAddScore();
  await testAddCountry();
  await testAddArea();
}

runAllTests();
