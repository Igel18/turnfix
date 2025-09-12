import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEvent } from '../contexts/EventContext';
import UnifiedPageHeader from '../components/UnifiedPageHeader';
import { ClockIcon, CalendarIcon, UsersIcon, CogIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface SquadDiscipline {
  int_riegen_x_disziplinenid: number;
  int_veranstaltungenid: number;
  int_disziplinenid: number;
  var_riege: string | null;
  int_runde: number | null;
  bol_erstes_geraet: boolean | null;
  tfx_disziplinen: {
    int_disziplinenid: number;
    var_name: string;
    var_kurz1: string;
    var_kurz2: string;
    var_icon: string | null;
  };
  tfx_status: {
    var_name: string | null;
    ary_colorcode: string | null;
  };
}

interface Competition {
  int_wettkaempfeid: number;
  var_name: string;
  var_nummer: string | null;
  int_durchgang: number;
  tim_startzeit: Date | null;
  tim_einturnen: Date | null;
  _count: {
    tfx_wertungen: number;
  };
}

const TimePlanningPage: React.FC = () => {
  const { t } = useTranslation();
  const { selectedEvent } = useEvent();
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [squadDisciplines, setSquadDisciplines] = useState<SquadDiscipline[]>([]);
  const [exerciseDuration, setExerciseDuration] = useState(10); // minutes
  const [rotationInterval, setRotationInterval] = useState(15); // minutes
  const [activeView, setActiveView] = useState<'overview' | 'matrix' | 'gantt'>('overview');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('timePlanning_expandedSessions');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (selectedEvent?.int_eventid) {
      fetchTimePlanningData();
    }
  }, [selectedEvent]);

  // Save expanded sessions to localStorage
  useEffect(() => {
    localStorage.setItem('timePlanning_expandedSessions', JSON.stringify(Array.from(expandedSessions)));
  }, [expandedSessions]);

  const fetchTimePlanningData = async () => {
    if (!selectedEvent?.int_eventid) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/time-planning?eventId=${selectedEvent.int_eventid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch time planning data');
      }

      const data = await response.json();
      setCompetitions(data.competitions || []);
      setSquadDisciplines(data.squadDisciplines || []);
    } catch (error) {
      console.error('Error fetching time planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueSquadNames = () => {
    const squadNames = new Set<string>();
    squadDisciplines.forEach(sd => {
      if (sd.var_riege) squadNames.add(sd.var_riege);
    });
    return Array.from(squadNames).sort();
  };

  const getRotationMatrix = () => {
    const squadNames = getUniqueSquadNames();
    const maxRounds = Math.max(...squadDisciplines.map(sd => sd.int_runde || 1));
    
    return squadNames.map(squadName => {
      const rotations = [];
      for (let round = 1; round <= maxRounds; round++) {
        const squadDisc = squadDisciplines.find(sd => 
          sd.var_riege === squadName && sd.int_runde === round
        );
        rotations.push(squadDisc || null);
      }
      return { squadName, rotations };
    });
  };

  const formatTime = (timeString: Date | null) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sessions Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold">{t('timePlanning.sessions')}</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(
            competitions.reduce((acc, comp) => {
              const session = comp.int_durchgang;
              if (!acc[session]) acc[session] = [];
              acc[session].push(comp);
              return acc;
            }, {} as Record<number, Competition[]>)
          ).map(([session, comps]) => {
            const sessionNum = parseInt(session);
            const isExpanded = expandedSessions.has(sessionNum);
            
            const toggleSession = () => {
              const newExpanded = new Set(expandedSessions);
              if (isExpanded) {
                newExpanded.delete(sessionNum);
              } else {
                newExpanded.add(sessionNum);
              }
              setExpandedSessions(newExpanded);
            };

            return (
              <div key={session} className="bg-white rounded-lg shadow">
                {/* Clickable Header - Entire area is clickable like Dashboard */}
                <button 
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={toggleSession}
                  type="button"
                >
                  <div className="flex items-center space-x-3 pointer-events-none">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{t('timePlanning.session')} {session}</h4>
                      <p className="text-sm text-gray-600">
                        {comps.length} {t('timePlanning.competitions')} • {t('timePlanning.startTime')}: {formatTime(comps[0]?.tim_startzeit)} • {t('timePlanning.warmupTime')}: {formatTime(comps[0]?.tim_einturnen)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 rounded-lg pointer-events-none">
                    <span>{isExpanded ? t('common.collapse') : t('common.expand')}</span>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </div>
                </button>
                
                {/* Expandable Content */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 rounded-b-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {comps.map((comp) => (
                        <div key={comp.int_wettkaempfeid} className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="font-medium text-gray-900">{comp.var_name}</div>
                          <div className="text-sm text-gray-600 mt-2 space-y-1">
                            {comp.var_nummer && (
                              <div><span className="font-medium">{t('timePlanning.number')}:</span> {comp.var_nummer}</div>
                            )}
                            <div><span className="font-medium">{t('timePlanning.participants')}:</span> {comp._count.tfx_wertungen}</div>
                            <div><span className="font-medium">{t('timePlanning.startTime')}:</span> {formatTime(comp.tim_startzeit)}</div>
                            <div><span className="font-medium">{t('timePlanning.warmupTime')}:</span> {formatTime(comp.tim_einturnen)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Squads Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <UsersIcon className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold">{t('timePlanning.squads')}</h3>
        </div>
        <div className="space-y-2">
          {getUniqueSquadNames().map(squadName => {
            const squadDiscs = squadDisciplines.filter(sd => sd.var_riege === squadName);
            const maxRound = Math.max(...squadDiscs.map(sd => sd.int_runde || 1));
            const firstDevice = squadDiscs.find(sd => sd.bol_erstes_geraet);
            
            return (
              <div key={squadName} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <span className="font-medium">{squadName}</span>
                  {firstDevice && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {t('timePlanning.startsAt')} {firstDevice.tfx_disziplinen.var_kurz1}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {maxRound} {t('timePlanning.rotations')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMatrix = () => {
    const matrix = getRotationMatrix();
    const maxRounds = Math.max(...squadDisciplines.map(sd => sd.int_runde || 1));

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">{t('timePlanning.rotationMatrix')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('timePlanning.squad')}
                </th>
                {Array.from({ length: maxRounds }, (_, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('timePlanning.round')} {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrix.map((row) => (
                <tr key={row.squadName}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {row.squadName}
                  </td>
                  {row.rotations.map((rotation, index) => (
                    <td key={index} className="px-6 py-4 whitespace-nowrap">
                      {rotation ? (
                        <div className="flex items-center">
                          {rotation.tfx_disziplinen.var_icon && (
                            <span className="mr-2">{rotation.tfx_disziplinen.var_icon}</span>
                          )}
                          <span className="text-sm">
                            {rotation.tfx_disziplinen.var_kurz1}
                          </span>
                          {rotation.bol_erstes_geraet && (
                            <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" title={t('timePlanning.firstDevice')}></span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <CogIcon className="h-5 w-5 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold">{t('timePlanning.timeSettings')}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.exerciseDuration')}
          </label>
          <div className="flex items-center">
            <input
              type="number"
              value={exerciseDuration}
              onChange={(e) => setExerciseDuration(parseInt(e.target.value))}
              className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="1"
              max="60"
            />
            <span className="ml-2 text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.rotationInterval')}
          </label>
          <div className="flex items-center">
            <input
              type="number"
              value={rotationInterval}
              onChange={(e) => setRotationInterval(parseInt(e.target.value))}
              className="block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="5"
              max="120"
            />
            <span className="ml-2 text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!selectedEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('timePlanning.noEventSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('timePlanning.selectEventFirst')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UnifiedPageHeader
        icon={ClockIcon}
        title={t('timePlanning.title')}
        subtitle={t('timePlanning.subtitle')}
        showFilters={false}
        showPrint={true}
        showExportPDF={true}
      />

      {/* Context Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">{t('common.selectedEvent')}:</span> {selectedEvent.var_eventname}
            </p>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('timePlanning.overview')}
          </button>
          <button
            onClick={() => setActiveView('matrix')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'matrix'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('timePlanning.rotationMatrix')}
          </button>
          <button
            onClick={() => setActiveView('gantt')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === 'gantt'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('timePlanning.timeline')}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeView === 'overview' && renderOverview()}
          {activeView === 'matrix' && renderMatrix()}
          {activeView === 'gantt' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">{t('timePlanning.timeline')}</h3>
              <p className="text-gray-600">{t('timePlanning.timelineComingSoon')}</p>
            </div>
          )}
          {renderSettings()}
        </div>
      )}
    </div>
  );
};

export default TimePlanningPage;
