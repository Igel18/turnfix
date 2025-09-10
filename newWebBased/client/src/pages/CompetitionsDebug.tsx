import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

const CompetitionsDebug: React.FC = () => {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [ageGroups, setAgeGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDisciplines = async () => {
    setLoading(true);
    try {
      console.log('Loading disciplines...');
      const data = await apiGet('/disciplines/filtered');
      console.log('Disciplines response:', data);
      setDisciplines(data);
    } catch (error) {
      console.error('Error loading disciplines:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgeGroups = async () => {
    try {
      console.log('Loading age groups...');
      const data = await apiGet('/disciplines/age-groups');
      console.log('Age groups response:', data);
      setAgeGroups(data);
    } catch (error) {
      console.error('Error loading age groups:', error);
    }
  };

  useEffect(() => {
    loadDisciplines();
    loadAgeGroups();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Competitions Debug</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Age Groups ({ageGroups.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {ageGroups.map((age, index) => (
                <div key={index} className="text-sm">
                  <strong>Value:</strong> {age.value} - <strong>Label:</strong> {age.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Disciplines ({disciplines.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {disciplines.map((discipline, index) => (
                <div key={index} className="text-xs border-b pb-2">
                  <div><strong>ID:</strong> {discipline.int_disziplinid}</div>
                  <div><strong>Name:</strong> {discipline.var_disziplinname}</div>
                  <div><strong>Category:</strong> {discipline.var_disziplinkategorie}</div>
                  <div><strong>Male:</strong> {discipline.male_allowed ? 'Yes' : 'No'}</div>
                  <div><strong>Female:</strong> {discipline.female_allowed ? 'Yes' : 'No'}</div>
                  <div><strong>Age:</strong> {discipline.altersklasse_von}-{discipline.altersklasse_bis}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button 
          onClick={loadDisciplines}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Reload Disciplines
        </button>
        <button 
          onClick={loadAgeGroups}
          className="ml-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Reload Age Groups
        </button>
      </div>
    </div>
  );
};

export default CompetitionsDebug;
