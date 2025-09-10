// apiRoutesTest.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api'; // Change if your backend runs on a different port

const routes = [
  '/areas',
  '/associations',
  '/clubs_temp',
  '/competitionEntries',
  '/countries',
  '/participants_simple',
  '/participants',
  '/scores',
  '/users',
  '/teams',
  '/venues',
  '/statuses',
  '/squadManagement',
  '/sports',
  '/results',
  '/regions',
  '/events_new',
  '/events_debug',
  '/events',
  // Add more routes as needed
];

async function testRoute(route) {
  try {
    const res = await axios.get(BASE_URL + route);
    console.log(`GET ${route}:`, res.status, Array.isArray(res.data) ? `Items: ${res.data.length}` : res.data);
  } catch (err) {
    if (err.response) {
      console.log(`GET ${route}:`, err.response.status, err.response.data);
    } else {
      console.log(`GET ${route}: ERROR`, err.message);
    }
  }
}

(async () => {
  for (const route of routes) {
    await testRoute(route);
  }
})();
