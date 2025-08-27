const http = require('http');

http.get('http://localhost:3001/api/regions/data/verbaende', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Verbaende API Response Structure:');
    console.log('Sample verbaende object:', JSON.stringify(json[0], null, 2));
    console.log('All fields:', Object.keys(json[0]));
  });
}).on('error', console.error);
