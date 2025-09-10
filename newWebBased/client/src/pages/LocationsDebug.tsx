import React, { useState, useEffect } from 'react';

const LocationsDebug: React.FC = () => {
  const [rawData, setRawData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching venues...');
        const response = await fetch('/api/venues?limit=5000');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Raw API response:', data);
          setRawData(data);
          
          if (data && data.venues && Array.isArray(data.venues)) {
            console.log('Setting locations:', data.venues);
            setLocations(data.venues);
          } else {
            console.error('Invalid data structure:', data);
            setError('Invalid data structure received from API');
          }
        } else {
          setError(`API request failed with status: ${response.status}`);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Network error: ${err}`);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Locations Debug Page</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Status</h2>
        <p>Locations count: {locations.length}</p>
        {error && <p className="text-red-600">Error: {error}</p>}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Raw API Response</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(rawData, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Parsed Locations</h2>
        <div className="space-y-2">
          {locations.map((location, index) => (
            <div key={index} className="border p-4 rounded">
              <h3 className="font-medium">{location.var_name}</h3>
              <p className="text-sm text-gray-600">
                ID: {location.int_wettkampforteid} | 
                Address: {location.var_adresse || 'None'} | 
                City: {location.var_ort || 'None'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocationsDebug;
