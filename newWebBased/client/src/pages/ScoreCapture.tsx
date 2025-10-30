import { useState, useEffect } from 'react';
import { BlueInfoBox } from '../components/InfoBoxes';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom'
import { 
  PlusIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useEvent } from '../contexts/EventContext'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import { GenderBadge } from '@/components/GenderBadge'
import { apiGet, apiPost } from '../utils/api'
import { normalizeScoreInput, getScorePlaceholder } from '@/utils/scoreFormatter'
import getSocket from '../utils/socket'
import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'
import { SquadDisciplineSelector } from '@/components/scoreCapture'
import type { 
  Participant, 
  Discipline, 
  DisciplineField, 
  Squad, 
  Score, 
  Status, 
  Competition
} from '@/types/ScoreCapture.types'

export function ScoreCapture() {
  const { t } = useTranslation();
  // Track pending Endwert edits to avoid UI flicker
  const [pendingEndwerts, setPendingEndwerts] = useState<{[key: string]: string}>({});
  const [searchParams] = useSearchParams()
  const { 
    selectedEvent, 
    selectedCompetition, 
    selectedSquad: contextSquad, 
    selectedDiscipline: contextDiscipline,
    setSelectedSquad,
    setSelectedDiscipline
  } = useEvent()
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showJuryScores, setShowJuryScores] = useState(false) // Jury-Wertungen erfassen (like Qt chk_jury)
  const [showHelpPanel, setShowHelpPanel] = useState(false) // Help texts toggle
  
  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId')
  const urlCompetitionId = searchParams.get('competitionId') 
  const urlSquadName = searchParams.get('squadName')
  
  // Use context values or URL parameters
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId

  // State
  const [participants, setParticipants] = useState<Participant[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [existingScores, setExistingScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [scoreMatrix, setScoreMatrix] = useState<{[key: string]: string}>({}) // Changed to string only
  const [squadStatus, setSquadStatus] = useState<number | null>(null) // Squad-level status for current squad and discipline
  const [squadDisciplineStatuses, setSquadDisciplineStatuses] = useState<{ [key: string]: number }>({}) // All squad-discipline status combinations
  
  // Selection state - initialized from context
  const [activeSquad, setActiveSquad] = useState<string>(contextSquad?.squad_name || '')
  const [activeDiscipline, setActiveDiscipline] = useState<number | string | ''>(
    contextDiscipline ? (contextDiscipline.int_disziplinid || contextDiscipline.var_name) : ''
  )

  // Load showJuryScores setting from API on mount
  useEffect(() => {
    const loadJuryScoresSetting = async () => {
      try {
        const response = await fetch('/api/app-settings/scoreCapture')
        const data = await response.json()
        setShowJuryScores(data.showJuryScores || false)
      } catch (error) {
        console.error('Failed to load jury scores setting:', error)
        // Default to false if loading fails
        setShowJuryScores(false)
      }
    }
    loadJuryScoresSetting()
  }, [])

  // Load initial data when eventId is available
  useEffect(() => {
    if (eventId && !loading && !isInitializing) {
      loadInitialData()
    }
  }, [eventId])

  // Socket.IO: Listen for real-time score updates
  useEffect(() => {
    if (!eventId) {
      console.log('⏭️ No eventId, skipping Socket.IO setup');
      return;
    }

    console.log('🔌 Setting up Socket.IO listener for eventId:', eventId);
    const socket = getSocket();
    
    socket.emit('join-competition', eventId);
    console.log('📡 Joined competition room:', eventId);

    const handleScoreUpdate = (data: any) => {
      console.log('🔔 Received score-updated event:', data);
      console.log('🔍 Comparing eventIds - received:', data.eventId, 'typeof:', typeof data.eventId, '| current:', eventId, 'typeof:', typeof eventId);
      
      // Convert both to numbers for comparison
      const receivedEventId = Number(data.eventId);
      const currentEventId = Number(eventId);
      
      if (receivedEventId === currentEventId) {
        console.log('✅ Score update is for our event, reloading data...');
        // Reload scores and re-initialize matrix with cache-buster
        const cacheBuster = Date.now();
        apiGet(`/scores?eventId=${eventId}&limit=1000&_cb=${cacheBuster}`).then((scoresData) => {
          const loadedScores = scoresData?.results || [];
          console.log('📊 Reloaded scores:', loadedScores.length, 'total');
          // Force new array reference to trigger useEffect
          setExistingScores([...loadedScores]);
          console.log('🔄 Triggering score matrix re-initialization via state update...');
        }).catch((error) => {
          console.error('❌ Error reloading scores:', error);
        });
      } else {
        console.log('⏭️ Score update is for different event - received:', receivedEventId, 'expected:', currentEventId);
      }
    };

    socket.on('score-updated', handleScoreUpdate);
    console.log('👂 Listening for score-updated events');

    return () => {
      console.log('🔌 Cleaning up Socket.IO listener for eventId:', eventId);
      socket.emit('leave-competition', eventId);
      socket.off('score-updated', handleScoreUpdate);
    };
  }, [eventId]); // Only depend on eventId, not on participants/disciplines

  // Sync context squad with local state
  useEffect(() => {
    if (contextSquad?.squad_name && contextSquad.squad_name !== activeSquad) {
      setActiveSquad(contextSquad.squad_name)
    }
  }, [contextSquad?.squad_name, activeSquad])

  // Sync URL squad with local state
  useEffect(() => {
    if (urlSquadName && !contextSquad?.squad_name && urlSquadName !== activeSquad) {
      setActiveSquad(urlSquadName)
    }
  }, [urlSquadName, contextSquad?.squad_name, activeSquad])

  // Sync context discipline with local state
  useEffect(() => {
    if (contextDiscipline) {
      const disciplineValue = contextDiscipline.int_disziplinid || contextDiscipline.var_name
      if (disciplineValue !== activeDiscipline) {
        setActiveDiscipline(disciplineValue)
      }
    }
  }, [contextDiscipline?.int_disziplinid, contextDiscipline?.var_name, activeDiscipline])

  // Re-initialize score matrix when activeSquad changes (for filtering)
  useEffect(() => {
    const reinitializeMatrix = async () => {
      if (participants.length > 0 && disciplines.length > 0 && existingScores.length > 0) {
        console.log('Re-initializing score matrix due to squad change:', activeSquad)
        await initializeScoreMatrix(participants, disciplines, existingScores)
      }
    }
    reinitializeMatrix()
  }, [activeSquad, participants, disciplines, existingScores])

  // Handler for showJuryScores checkbox
  const handleShowJuryScoresChange = async (checked: boolean) => {
    setShowJuryScores(checked)
    
    // Save setting to backend
    try {
      await fetch('/api/app-settings/scoreCapture/showJuryScores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: checked })
      })
    } catch (error) {
      console.error('Failed to save jury scores setting:', error)
    }
  }

  // Helper function to get enabled fields for a discipline
  const getDisciplineFields = (disciplineId: number | string) => {
    const allFields = disciplineFields
      .filter(field => field.disciplineId === disciplineId && field.enabled)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    
    // If showJuryScores is false, only show the final score field (Endwert)
    if (!showJuryScores) {
      return allFields.filter(field => field.isFinalScore === true)
    }
    
    return allFields
  }

  // Generic formula parsing helper - converts formula variables to readable field names
  // Uses dynamic field-to-variable mapping based on sort order from discipline configuration
  const parseFormulaDisplay = (formula: string, fields: DisciplineField[], finalFieldName: string) => {
    if (!formula || !fields || fields.length === 0) {
      return null;
    }

    // Create a mapping of formula variables (A, B, C, etc.) to actual field names
    const variableMap: {[key: string]: string} = {};
    const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // Sort fields by sortOrder (this determines A, B, C, etc.)
    const sortedFields = [...fields]
      .filter(f => !f.isFinalScore) // Exclude final score field (Endwert) from variable mapping
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Map each field to its corresponding variable (A, B, C, etc.) based on sort order
    sortedFields.forEach((field, index) => {
      if (index < variables.length) {
        variableMap[variables[index]] = field.name;
      }
    });

    // Replace formula variables with field names
    let displayFormula = formula;
    
    // Replace variables in order (longer first to avoid partial replacements)
    variables.forEach(variable => {
      if (variableMap[variable]) {
        const regex = new RegExp(`\\b${variable}\\b`, 'g');
        displayFormula = displayFormula.replace(regex, variableMap[variable]);
      }
    });

    return `${finalFieldName} = ${displayFormula}`;
  }

  // Generic formula evaluation helper
  // Uses dynamic field-to-variable mapping based on sort order from discipline configuration
  const evaluateFormula = (formula: string, fieldValues: {[key: string]: number}, fields?: DisciplineField[]) => {
    if (!formula) {
      return 0;
    }

    // Create a mapping of formula variables to values
    const variableMap: {[key: string]: number} = {};
    const variables = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    // If we have field definitions, use their sort order for mapping
    if (fields && fields.length > 0) {
      // Sort fields by sortOrder (this determines A, B, C, etc.)
      const sortedFields = [...fields]
        .filter(f => !f.isFinalScore) // Exclude final score field (Endwert) from variable mapping
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      // Map each field to its corresponding variable (A, B, C, etc.) based on sort order
      sortedFields.forEach((field, index) => {
        if (index < variables.length && fieldValues[field.name] !== undefined) {
          variableMap[variables[index]] = fieldValues[field.name];
          if (process.env.DEBUG === 'true') {
            console.log(`  ${variables[index]} = ${field.name} (sortOrder: ${field.sortOrder}) = ${fieldValues[field.name]}`);
          }
        }
      });
    } else {
      // Fallback: Map available field values to formula variables by order
      const availableFields = Object.keys(fieldValues);
      availableFields.forEach((fieldName, index) => {
        if (index < variables.length && fieldValues[fieldName] !== undefined) {
          variableMap[variables[index]] = fieldValues[fieldName];
        }
      });
    }

    console.log('Formula evaluation:', { formula, fieldValues, variableMap });

    try {
      // Replace variables in the formula with their values
      let evalFormula = formula;
      variables.forEach(variable => {
        if (variableMap[variable] !== undefined) {
          const regex = new RegExp(`\\b${variable}\\b`, 'g');
          evalFormula = evalFormula.replace(regex, variableMap[variable].toString());
        } else {
          // Replace undefined variables with 0
          const regex = new RegExp(`\\b${variable}\\b`, 'g');
          evalFormula = evalFormula.replace(regex, '0');
        }
      });

      // Replace common math operations and evaluate safely
      evalFormula = evalFormula.replace(/\s+/g, ''); // Remove spaces
      
      // Basic safety check - only allow numbers, basic operators, and parentheses
      if (!/^[0-9+\-*/.() ]+$/.test(evalFormula)) {
        console.warn('Formula contains invalid characters:', evalFormula);
        return 0;
      }

      // Evaluate the formula safely
      const result = Function(`"use strict"; return (${evalFormula})`)();
      
      console.log(`Formula "${formula}" with values ${JSON.stringify(variableMap)} = ${result}`);
      return isNaN(result) ? 0 : result;
      
    } catch (error) {
      console.error('Error evaluating formula:', formula, error);
      return 0;
    }
  }

  // Update squad status when squad or discipline selection changes
  useEffect(() => {
    if (activeSquad && activeDiscipline && squadDisciplineStatuses) {
      const key = `${activeSquad}-${activeDiscipline}`
      const currentStatus = squadDisciplineStatuses[key] || null
      setSquadStatus(currentStatus)
    } else {
      setSquadStatus(null)
    }
  }, [activeSquad, activeDiscipline, squadDisciplineStatuses])

  // Helper function to add delay between API calls
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const loadInitialData = async () => {
    if (isInitializing) return // Prevent duplicate calls
    
    console.log('Loading initial data for eventId:', eventId)
    setLoading(true)
    setIsInitializing(true)
    try {
      // Load all participants for the event
      const participantsResponse = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=true`)
      await delay(100) // Small delay between requests
      
      // Extract the participants array from the response object
      const participantsData = participantsResponse?.participants || []
      setParticipants(participantsData)
      
      // Load squads for the event (all squads, not competition-specific)
      const squadsData = await apiGet(`/squad-management?eventId=${eventId}`)
      await delay(100)
      console.log('Loaded squads:', squadsData)
      setSquads(squadsData.squads || [])
      
      // Load all disciplines/competitions for the event
      const competitionsData = await apiGet(`/competitions?eventId=${eventId}`)
      await delay(100)
      console.log('Loaded competitions:', competitionsData)
      setCompetitions(competitionsData || [])
      
      // Load all disciplines from all competitions and track their competition associations
      let allDisciplines: Discipline[] = []
      const disciplineToCompetitionMap = new Map<number | string, number>()
      
      console.log('🔍 DEBUG: Starting discipline loading for competitions:', competitionsData?.map((c: any) => ({ id: c.id, name: c.name })))
      
      for (const competition of competitionsData || []) {
        try {
          await delay(50) // Delay between each competition request
          console.log(`🔍 Loading disciplines for competition ${competition.id} (${competition.name})`)
          const disciplinesData = await apiGet(`/competitions/${competition.id}/disciplines`)
          const competitionDisciplines = disciplinesData.disciplines || []
          
          console.log(`🔍 Competition ${competition.id} returned ${competitionDisciplines.length} disciplines:`, 
            competitionDisciplines.map((d: any) => ({ id: d.int_disziplinid, name: d.var_name })))
          
          // Track which competition each discipline belongs to
          competitionDisciplines.forEach((discipline: Discipline) => {
            const disciplineKey = discipline.int_disziplinid || discipline.var_name
            disciplineToCompetitionMap.set(disciplineKey, competition.id)
            console.log(`🔍 Mapped discipline "${discipline.var_name}" (ID: ${discipline.int_disziplinid}) to competition ${competition.id}`)
          })
          
          allDisciplines = [...allDisciplines, ...competitionDisciplines]
        } catch (error) {
          console.error(`❌ Error loading disciplines for competition ${competition.id}:`, error)
        }
      }
      
      console.log('🔍 Final discipline-to-competition mapping:', Array.from(disciplineToCompetitionMap.entries()))
      
      // Remove duplicate disciplines based on int_disziplinid and var_name
      const uniqueDisciplines = allDisciplines.reduce((acc: Discipline[], current: Discipline) => {
        const existingIndex = acc.findIndex(d => 
          (d.int_disziplinid && current.int_disziplinid && d.int_disziplinid === current.int_disziplinid) ||
          (d.var_name === current.var_name && d.int_disziplinid === current.int_disziplinid)
        )
        if (existingIndex === -1) {
          acc.push(current)
        }
        return acc
      }, [])

      // Enhance disciplines with detailed information including formulas
      const enhancedDisciplines = await Promise.all(
        uniqueDisciplines.map(async (discipline) => {
          try {
            if (discipline.int_disziplinid) {
              await delay(25) // Small delay between requests
              const detailedDiscipline = await apiGet(`/disciplines/${discipline.int_disziplinid}`)
              console.log(`Enhanced discipline ${discipline.int_disziplinid}:`, detailedDiscipline)
              // Merge the detailed info with the existing discipline
              return {
                ...discipline,
                ...detailedDiscipline,
                // Preserve original structure but add formula and other details
                var_formel: detailedDiscipline.advanced_formula || detailedDiscipline.formula || detailedDiscipline.var_formel,
                formula_name: detailedDiscipline.formula_name,
                maxScore: discipline.maxScore || detailedDiscipline.maxScore
              }
            }
            return discipline
          } catch (error) {
            console.error(`Error loading detailed info for discipline ${discipline.int_disziplinid}:`, error)
            return discipline
          }
        })
      )
      
      setDisciplines(enhancedDisciplines)
      console.log('All loaded disciplines (before dedup):', allDisciplines)
      console.log('Unique disciplines (after dedup):', uniqueDisciplines)
      console.log('Enhanced disciplines (with formulas):', enhancedDisciplines)
      
      // Load discipline fields for all disciplines
      try {
        const disciplineFieldsData = await apiGet('/discipline-fields')
        console.log('Loaded discipline fields:', disciplineFieldsData)
        setDisciplineFields(disciplineFieldsData || [])
      } catch (error) {
        console.error('Error loading discipline fields:', error)
        // Continue without discipline fields if there's an error
      }
      
      // Load existing scores for the event (load ALL scores, not just first 100)
      let loadedScores: Score[] = []
      try {
        console.log('Fetching ALL scores with URL:', `/scores?eventId=${eventId}&limit=1000`)
        const scoresData = await apiGet(`/scores?eventId=${eventId}&limit=1000`)
        console.log('Raw scores response:', scoresData)
        loadedScores = scoresData?.results || []
        console.log('Loaded existing scores:', loadedScores)
        console.log('Number of existing scores:', loadedScores.length)
        if (loadedScores.length > 0) {
          console.log('Sample score object:', loadedScores[0])
        }
        setExistingScores(loadedScores)
      } catch (error) {
        console.error('Error loading existing scores:', error)
        // Continue without scores if there's an error
      }
      
      // Initialize score matrix with existing scores
      await initializeScoreMatrix(participantsData || [], enhancedDisciplines || [], loadedScores)
      
      // Load available statuses
      try {
        const statusesData = await apiGet('/statuses?limit=100')
        await delay(100)
        console.log('Loaded statuses:', statusesData)
        setStatuses(statusesData.statuses || [])
      } catch (error) {
        console.error('Error loading statuses:', error)
        // Continue without statuses if there's an error
      }

      // Load current squad status from database
      try {
        if (eventId) {
          const squadDisciplinesData = await apiGet(`/squad-disciplines?eventId=${eventId}`)
          console.log('Loaded squad disciplines:', squadDisciplinesData)
          
          // Create a map of squad-discipline combinations to their statuses
          const statusMap: { [key: string]: number } = {}
          squadDisciplinesData.squadDisciplines?.forEach((sd: any) => {
            const key = `${sd.squadName}-${sd.disciplineId}`
            statusMap[key] = sd.statusId
          })
          setSquadDisciplineStatuses(statusMap)
          
          // Set current squad status if we have a selected squad and discipline
          if (activeSquad && activeDiscipline) {
            const currentKey = `${activeSquad}-${activeDiscipline}`
            setSquadStatus(statusMap[currentKey] || null)
          }
        }
      } catch (error) {
        console.error('Error loading squad statuses:', error)
        // Graceful fallback - continue without status data
        setSquadDisciplineStatuses({})
        setSquadStatus(null)
      }
      
    } catch (error: any) {
      console.error('Error loading initial data:', error)
      
      // Handle rate limiting gracefully
      if (error.message?.includes('429')) {
        console.warn('Rate limited while loading initial data, API will handle retry automatically');
        // Don't show error to user for rate limiting
      } else {
        // Show error for other types of failures
        alert('Failed to load initial data. Please refresh the page.');
      }
    } finally {
      setLoading(false)
      setIsInitializing(false)
    }
  }

  const initializeScoreMatrix = async (participants: Participant[], disciplines: Discipline[], existingScores: Score[]) => {
    console.log('initializeScoreMatrix called with:')
    console.log('participants:', participants, 'type:', typeof participants, 'isArray:', Array.isArray(participants))
    console.log('disciplines:', disciplines, 'type:', typeof disciplines, 'isArray:', Array.isArray(disciplines))
    console.log('existingScores:', existingScores, 'type:', typeof existingScores, 'isArray:', Array.isArray(existingScores))
    console.log('activeSquad filter:', activeSquad)
    console.log('disciplineFields:', disciplineFields)
    
    // Debug the first few score objects to see their actual properties
    if (existingScores.length > 0) {
      console.log('First score object properties:', Object.keys(existingScores[0]))
      console.log('First score object full:', existingScores[0])
      console.log('participantId field:', existingScores[0].participantId)
      console.log('disciplineId field:', existingScores[0].disciplineId)
    }
    
    const matrix: {[key: string]: string} = {} // Changed to string only
    
    const safeParticipants = Array.isArray(participants) ? participants : []
    const safeDisciplines = getFilteredDisciplines() // Use filtered disciplines instead of raw disciplines
    
    console.log('🎯 Matrix creation - Active squad:', activeSquad)
    console.log('🎯 Matrix creation - Filtered disciplines count:', safeDisciplines.length)
    console.log('🎯 Matrix creation - Filtered disciplines:', safeDisciplines.map(d => d.var_name))
    
    // Filter participants by active squad if set
    const filteredParticipants = !activeSquad 
      ? safeParticipants 
      : safeParticipants.filter(participant => participant.squad_name === activeSquad)
    
    console.log(`Processing ${filteredParticipants.length} participants (filtered from ${safeParticipants.length} total):`)
    filteredParticipants.forEach(p => {
      console.log(`Participant ${p.id}: ${p.firstname} ${p.lastname}, Squad: ${p.squad_name}`)
    })
    const safeExistingScores = Array.isArray(existingScores) ? existingScores : []
    
    console.log('Processing matrix for:', filteredParticipants.length, 'participants and', safeDisciplines.length, 'disciplines')
    console.log('With', safeExistingScores.length, 'existing scores')
    
    filteredParticipants.forEach(participant => {
      safeDisciplines.forEach((discipline, index) => {
        const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
        console.log(`Processing ${participant.firstname} ${participant.lastname} (ID: ${participant.id}) - ${discipline.var_name} (DisciplineID: ${disciplineId}, int_disziplinid: ${discipline.int_disziplinid})`);
        
        // Get enabled fields for this discipline
        const enabledFields = getDisciplineFields(disciplineId)
        console.log(`📋 Discipline ${disciplineId} (${discipline.var_name}) has ${enabledFields.length} enabled fields:`, 
          enabledFields.map(f => `${f.name} (sortOrder: ${f.sortOrder}, id: ${f.id})`).join(', '))
        
        if (enabledFields.length === 0) {
          // Fallback: if no fields configured, use single score per discipline (old behavior)
          const key = `${participant.id}-${disciplineId}`;
          // Prefer pending value if present
          if (pendingEndwerts[key] !== undefined) {
            matrix[key] = pendingEndwerts[key];
          } else {
            const existingScore = safeExistingScores.find(s => {
              const matchesParticipant = s.participantId === participant.id;
              // Improved discipline matching: check multiple possible ways disciplines might be referenced
              const matchesDiscipline = 
                s.disciplineId === discipline.int_disziplinid || 
                s.disciplineId === disciplineId ||
                s.disciplineId === (discipline as any).disciplineId || // From competitions API
                (typeof disciplineId === 'number' && s.disciplineId === disciplineId) ||
                (typeof disciplineId === 'string' && disciplineId.includes('-') && s.disciplineId === parseInt(disciplineId.split('-')[0]));
              
              if (matchesParticipant && matchesDiscipline) {
                console.log(`✅ Found existing score for ${participant.firstname} ${participant.lastname} - ${discipline.var_name}: ${s.score}`);
              }
              return matchesParticipant && matchesDiscipline;
            });
            // Normalize the loaded score to show all decimal places
            const scoreStr = existingScore ? existingScore.score.toString() : '';
            matrix[key] = scoreStr ? normalizeScoreInput(scoreStr, discipline.int_berechnung || 2) : '';
          }
        } else {
          // New behavior: create entries for each field
          enabledFields.forEach(field => {
            const fieldKey = `${participant.id}-${field.id}`;
            matrix[fieldKey] = '';
          });
          
          // IMPORTANT: Also create the main score entry for Endwert (official)
          const key = `${participant.id}-${disciplineId}`;
          // On refresh, pendingEndwerts will be empty, so prioritize DB values
          const existingScore = safeExistingScores.find(s => {
            const matchesParticipant = s.participantId === participant.id;
            // Improved discipline matching: check multiple possible ways disciplines might be referenced
            const matchesDiscipline = 
              s.disciplineId === discipline.int_disziplinid || 
              s.disciplineId === disciplineId ||
              s.disciplineId === (discipline as any).disciplineId || // From competitions API
              (typeof disciplineId === 'number' && s.disciplineId === disciplineId) ||
              (typeof disciplineId === 'string' && disciplineId.includes('-') && s.disciplineId === parseInt(disciplineId.split('-')[0]));
            
            if (matchesParticipant && matchesDiscipline) {
              console.log(`✅ Found existing score for ${participant.firstname} ${participant.lastname} - ${discipline.var_name}: ${s.score}`);
            }
            return matchesParticipant && matchesDiscipline;
          });
          
          if (pendingEndwerts[key] !== undefined) {
            matrix[key] = pendingEndwerts[key];
          } else if (existingScore) {
            // Normalize the loaded score to show all decimal places
            matrix[key] = normalizeScoreInput(existingScore.score.toString(), discipline.int_berechnung || 2);
          } else {
            matrix[key] = '';
          }
          
          console.log(`Initialized Endwert for ${participant.firstname} ${participant.lastname} (${participant.id}) - ${discipline.var_name} (${disciplineId}): ${matrix[key]} (from ${existingScore ? 'DB' : 'default'})`);
          
          // Debug: Check for any field conflicts with the main score key
          const conflictingFields = enabledFields.filter(field => {
            const fieldKey = `${participant.id}-${field.id}`;
            return fieldKey === key;
          });
          if (conflictingFields.length > 0) {
            console.warn(`⚠️  Key conflict detected for ${key}:`, conflictingFields);
          }
        }
      });
    });

    // Load existing jury results for field-specific scores
    if (eventId && filteredParticipants.length > 0) {
      try {
        console.log('Loading jury results for event:', eventId)
        const juryResults = await apiGet(`/jury-results?eventId=${eventId}&limit=1000`)
        console.log('Loaded jury results:', juryResults.results?.length || 0, 'entries')
        
        // Add field-specific scores to matrix
        if (juryResults.results) {
          juryResults.results.forEach((result: any) => {
            // Check if this result is for a participant in our filtered list
            const isForFilteredParticipant = filteredParticipants.some(p => p.id === result.participantId)
            if (isForFilteredParticipant) {
              const fieldKey = `${result.participantId}-${result.disciplineFieldId}`
              // Normalize jury field scores (typically 2 decimals for jury scores)
              const performanceStr = result.performance?.toString() || '';
              matrix[fieldKey] = performanceStr ? normalizeScoreInput(performanceStr, 2) : '';
              console.log(`Loaded field score: ${fieldKey} = ${result.performance} (field: ${result.fieldName})`)
            }
          })
        }
      } catch (error) {
        console.error('Error loading jury results:', error)
        // Continue without field scores if loading fails
      }
    }
    
    console.log('Final score matrix:', matrix)
    setScoreMatrix(matrix)
  }

  // Always show all squads - this is the first selection
  const getFilteredSquads = () => {
    return squads || [];
  };

  // Smart filtering: Show only disciplines that have participants from the selected squad
  const getFilteredDisciplines = () => {
    if (!activeSquad) {
      return []; // Don't show any disciplines until squad is selected
    }
    
    // Get participants in the selected squad
    const squadParticipants = participants.filter(p => p.squad_name === activeSquad);
    
    console.log('🔍 DEBUG: Squad filtering for:', activeSquad);
    console.log('🔍 DEBUG: All participants:', participants.length);
    console.log('🔍 DEBUG: Squad participants:', squadParticipants.length);
    
    if (squadParticipants.length === 0) {
      console.log('🔍 DEBUG: No participants in squad');
      return []; // No participants in squad
    }
    
    // Debug: Check the structure of participant data
    console.log('🔍 DEBUG: First squad participant:', squadParticipants[0]);
    console.log('🔍 DEBUG: assignedCompetitions field:', squadParticipants[0]?.assignedCompetitions);
    
    // Try multiple approaches to find competition assignments
    const participantCompetitionIds = new Set<number>();
    
    // Approach 1: Check assignedCompetitions field
    squadParticipants.forEach(participant => {
      if (participant.assignedCompetitions && Array.isArray(participant.assignedCompetitions)) {
        participant.assignedCompetitions.forEach(competitionId => {
          participantCompetitionIds.add(competitionId);
        });
      }
    });
    
    console.log('🔍 DEBUG: Competitions from assignedCompetitions:', Array.from(participantCompetitionIds));
    
    // Approach 2: If no competitions found via assignedCompetitions, 
    // use existing scores to determine which competitions participants compete in
    if (participantCompetitionIds.size === 0) {
      console.log('🔍 DEBUG: No assignedCompetitions found, checking existing scores...');
      
      squadParticipants.forEach(participant => {
        existingScores.forEach(score => {
          if (score.participantId === participant.id && score.competitionId) {
            participantCompetitionIds.add(score.competitionId);
          }
        });
      });
      
      console.log('🔍 DEBUG: Competitions from existing scores:', Array.from(participantCompetitionIds));
    }
    
    // Approach 3: If still no competitions found, fall back to showing all disciplines
    // This ensures the interface remains functional even if competition assignments are missing
    if (participantCompetitionIds.size === 0) {
      console.log('🔍 DEBUG: No competition assignments found, falling back to all disciplines');
      console.log('🔍 DEBUG: Available disciplines:', disciplines?.map(d => d.var_name) || []);
      return disciplines || [];
    }
    
    // Get disciplines from these competitions
    const availableDisciplineIds = new Set<number>();
    competitions.forEach(competition => {
      if (participantCompetitionIds.has(competition.id)) {
        console.log('🔍 DEBUG: Found matching competition:', competition.id, competition.name);
        console.log('🔍 DEBUG: Competition object:', competition);
        console.log('🔍 DEBUG: Competition disciplines property:', competition.disciplines);
        
        if (competition.disciplines && Array.isArray(competition.disciplines)) {
          console.log('🔍 DEBUG: Competition has', competition.disciplines.length, 'disciplines');
          competition.disciplines.forEach(discipline => {
            console.log('🔍 DEBUG: Processing discipline:', discipline);
            // Handle different discipline structure formats
            const disciplineId = discipline.int_disziplinid || (discipline as any).disciplineId;
            if (disciplineId) {
              availableDisciplineIds.add(disciplineId);
              console.log('🔍 DEBUG: Added discipline ID:', disciplineId);
            } else {
              console.log('🔍 DEBUG: Discipline missing both int_disziplinid and disciplineId:', discipline);
            }
          });
        } else {
          console.log('🔍 DEBUG: Competition has no disciplines property or it is not an array');
          console.log('🔍 DEBUG: Attempting to load disciplines for competition', competition.id);
          
          // If disciplines are not loaded, we need to trigger loading them
          // This might happen for competitions that weren't initially loaded
          // For now, we'll fall back to showing all disciplines
        }
      }
    });
    
    console.log('🔍 DEBUG: Available competition IDs:', Array.from(participantCompetitionIds));
    console.log('🔍 DEBUG: All competitions:', competitions.map(c => ({ id: c.id, name: c.name })));
    console.log('🔍 DEBUG: Available discipline IDs:', Array.from(availableDisciplineIds));
    
    // If no disciplines found (e.g., competitions don't have disciplines loaded yet), 
    // fall back to showing all disciplines to keep the interface functional
    if (availableDisciplineIds.size === 0) {
      console.log('🔍 DEBUG: No disciplines found from competitions, falling back to all disciplines');
      return disciplines || [];
    }
    
    // Filter disciplines to only show those available for this squad
    const filteredDisciplines = (disciplines || []).filter(discipline => 
      availableDisciplineIds.has(discipline.int_disziplinid)
    );
    
    console.log('🔍 DEBUG: Final filtered disciplines:', filteredDisciplines.map(d => d.var_name));
    
    return filteredDisciplines;
  };

  const handleScoreChange = (participantId: number, disciplineId: number | string, value: string) => {
    const key = `${participantId}-${disciplineId}`
    setScoreMatrix(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleFieldScoreChange = (participantId: number, fieldId: number, value: string) => {
    const key = `${participantId}-${fieldId}`
    setScoreMatrix(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Auto-save after a short delay (debounced)
    clearTimeout((window as any).fieldSaveTimeout)
    ;(window as any).fieldSaveTimeout = setTimeout(() => {
      if (value && value.trim() !== '') {
        const field = disciplineFields.find(f => f.id === fieldId)
        if (field) {
          console.log(`Auto-saving field score: participant=${participantId}, field=${fieldId}, value=${value}`)
          saveFieldScore(participantId, field)
        }
      }
    }, 1000) // Save 1 second after user stops typing
  }

  const saveScore = async (participantId: number, disciplineId: number | string) => {
    // For now, we'll use the original competitionId from URL params or context
    // In a more advanced implementation, we'd need to determine which competition
    // the selected discipline belongs to
    if (!competitionId && !disciplineId) return
    
    // Get the score value directly from the matrix using the standard key
    const regularKey = `${participantId}-${disciplineId}`
    let scoreValue = scoreMatrix[regularKey]
    
    console.log('🔍 saveScore called with:', { 
      participantId, 
      disciplineId, 
      regularKey, 
      scoreValue, 
      availableScoreKeys: Object.keys(scoreMatrix).filter(k => k.includes(`${participantId}-`)) 
    })
    
    if (scoreValue === '' || scoreValue === null || scoreValue === undefined) {
      console.log('❌ No valid score value to save:', scoreValue)
      return
    }
    
    // Only save if we have a valid numeric discipline ID
    // If disciplineId is a string (fallback ID), we need to find the actual discipline
    let numericDisciplineId: number | null = null
    
    if (typeof disciplineId === 'number') {
      numericDisciplineId = disciplineId
    } else if (typeof disciplineId === 'string') {
      // Try to find the discipline by name or fallback pattern
      const discipline = disciplines.find(d => {
        return d.var_name && disciplineId.includes(d.var_name)
      })
      if (discipline && discipline.int_disziplinid) {
        numericDisciplineId = discipline.int_disziplinid
      } else {
        console.log('❌ Cannot save score: invalid discipline ID:', disciplineId)
        return // Skip saving if we can't resolve to a numeric ID
      }
    }
    
    if (!numericDisciplineId) {
      console.log('❌ Cannot save score: no valid numeric discipline ID found')
      return
    }

    try {
      // Find the correct competition ID for this discipline
      let actualCompetitionId = competitionId ? parseInt(competitionId) : null;
      
      console.log('🔍 Determining competition ID...')
      console.log('🔍 Current competitionId from context/URL:', actualCompetitionId)
      console.log('🔍 Looking for discipline:', numericDisciplineId)
      console.log('🔍 Available competitions:', competitions.map(c => ({ 
        id: c.id, 
        name: c.name, 
        disciplineCount: c.disciplines?.length || 0,
        disciplineIds: c.disciplines?.map(d => d.int_disziplinid) || []
      })))
      
      if (!actualCompetitionId) {
        // Try to find the competition that contains this discipline
        console.log('🔍 Method 1: Looking for competition containing discipline:', numericDisciplineId);
        
        const disciplineCompetition = competitions.find(comp => 
          comp.disciplines?.some(d => d.int_disziplinid === numericDisciplineId)
        );
        
        if (disciplineCompetition) {
          actualCompetitionId = disciplineCompetition.id;
          console.log(`✅ Method 1 Success: Found competition ID ${actualCompetitionId} (${disciplineCompetition.name}) for discipline ${numericDisciplineId}`);
        } else {
          console.log('❌ Method 1 Failed: No competition found containing this discipline');
          
          // Fallback: if participant has assigned competitions, use the first one
          const participant = participants.find(p => p.id === participantId);
          console.log('🔍 Method 2: Using participant assigned competitions:', participant?.assignedCompetitions);
          
          if (participant && participant.assignedCompetitions && participant.assignedCompetitions.length > 0) {
            actualCompetitionId = participant.assignedCompetitions[0];
            console.log(`✅ Method 2 Success: Using participant's first assigned competition: ${actualCompetitionId}`);
          } else {
            console.log('❌ Method 2 Failed: Participant has no assigned competitions');
            
            // Last resort: use the first available competition
            if (competitions.length > 0) {
              actualCompetitionId = competitions[0].id;
              console.log(`✅ Method 3 Success: Using first available competition as fallback: ${actualCompetitionId} (${competitions[0].name})`);
            } else {
              console.error('❌ Method 3 Failed: No competitions available at all');
              console.error('❌ Debug info:');
              console.error('❌   - Discipline ID:', numericDisciplineId);
              console.error('❌   - Participant:', participant);
              console.error('❌   - Available competitions:', competitions);
              alert('Error: Could not determine competition for this discipline. Please check that the discipline is properly assigned to a competition.');
              return;
            }
          }
        }
      } else {
        console.log(`✅ Using provided competition ID: ${actualCompetitionId}`);
      }
      
      const scoreData = {
        competitionId: actualCompetitionId,
        participantId: participantId,
        disciplineId: numericDisciplineId,
        score: typeof scoreValue === 'string' ? parseFloat(scoreValue) : scoreValue
      }
      
      console.log('🟢 Sending score data to API:', scoreData)
      
      // Use the new save-value endpoint
      const response = await apiPost('/scores/save-value', scoreData)
      
      console.log('🟢 API Response:', response)
      
      if (response.success) {
        console.log('✅ Score saved successfully to database:', response)
        
        // Auto-set status to "Leistung erfasst" (ID: 9) when score is saved
        // DISABLED: Status management not available until database schema is updated
        // const leistungErfasstStatus = statuses.find(s => s.var_name === 'Leistungen erfasst')
        // if (leistungErfasstStatus && !participantStatuses[participantId]) {
        //   saveParticipantStatus(participantId, leistungErfasstStatus.int_statusid)
        // }
        
        // Optionally show success message
        // You could add a toast notification here
      } else {
        console.error('❌ API returned failure:', response)
        alert('Failed to save score: ' + (response.error || 'Unknown error'))
      }
      
    } catch (error) {
      console.error('❌ Error saving score:', error)
      alert('Failed to save score')
    }
  }  // Save field-specific score using jury results API
  const saveFieldScore = async (participantId: number, field: DisciplineField) => {
    const fieldKey = `${participantId}-${field.id}`
    const fieldValue = scoreMatrix[fieldKey]
    
    if (fieldValue === '' || fieldValue === null || fieldValue === undefined) {
      console.log(`Skipping save for empty field: ${fieldKey}`)
      return
    }
    
    const numericValue = parseFloat(fieldValue)
    if (isNaN(numericValue)) {
      console.log(`Skipping save for non-numeric value: ${fieldValue}`)
      return
    }
    
    console.log(`Saving field score for participant ${participantId}, field "${field.name}" (ID: ${field.id}), value: ${numericValue}`)
    
    try {
      const scoreData = {
        participantId: participantId,
        disciplineFieldId: field.id,
        attempt: 1, // Default attempt
        performance: numericValue,
        type: 0, // Default type (0=Pflicht, 1=Kür) - TODO: determine from context
        eventId: selectedEvent?.int_eventid,
        competitionId: selectedCompetition?.id
      }
      
      console.log('Sending to API:', scoreData)
      
      // Use the new jury results save endpoint
      const response = await apiPost('/jury-results/save-field-score', scoreData)
      
      console.log('API Response:', response)
      
      if (response.success) {
        console.log('✅ Field score saved successfully:', response.data)
        // Show brief success indicator
        const fieldElement = document.querySelector(`input[data-field="${fieldKey}"]`)
        if (fieldElement) {
          fieldElement.classList.add('bg-green-50', 'border-green-300')
          setTimeout(() => {
            fieldElement.classList.remove('bg-green-50', 'border-green-300')
          }, 2000)
        }
      } else {
        console.error('❌ Failed to save field score:', response)
        alert(`Failed to save ${field.name}: ${response.error || 'Unknown error'}`)
      }
      
    } catch (error: any) {
      console.error('❌ Error saving field score:', error)
      alert(`Failed to save ${field.name}: ${error.message || 'Network error'}`)
    }
  }

  // Calculate final scores for a discipline based on field values and formula
  const calculateDisciplineScores = async (disciplineId: number | string, fields: DisciplineField[]) => {
    console.log(`Calculating scores for discipline ${disciplineId}`)
    
    // Find the discipline to get its formula
    const discipline = displayDisciplines.find(d => 
      d.int_disziplinid === disciplineId || d.var_name === disciplineId
    )
    
    if (!discipline) {
      console.error('Discipline not found for calculation')
      return
    }

    const formula = (discipline as any).var_formel || '1*x'
    const formulaName = (discipline as any).formula_name || ''
    console.log(`Using formula: ${formula} (${formulaName})`)

    // Find the final score field (Endwert)
    const finalScoreField = fields.find(field => field.isFinalScore || field.name.toLowerCase().includes('endwert'))
    
    if (!finalScoreField) {
      console.log('No final score field found, cannot calculate')
      alert('No final score field configured for calculation')
      return
    }

    // Calculate for each participant
    filteredParticipants.forEach(participant => {
      try {
        // Get all field values for this participant
        const fieldValues: {[key: string]: number} = {}
        fields.forEach(field => {
          const fieldKey = `${participant.id}-${field.id}`
          const value = scoreMatrix[fieldKey]
          if (value && !isNaN(parseFloat(value))) {
            fieldValues[field.name] = parseFloat(value)
          }
        })

        console.log(`Participant ${participant.id} field values:`, fieldValues)

        // Use generic formula evaluation with field definitions for dynamic mapping
        const calculatedScore = evaluateFormula(formula, fieldValues, fields);
        
        console.log(`Calculated score for ${participant.firstname} ${participant.lastname}: ${calculatedScore}`)

        // Update the final score field in the matrix
        const finalScoreKey = `${participant.id}-${finalScoreField.id}`
        setScoreMatrix(prev => ({
          ...prev,
          [finalScoreKey]: calculatedScore.toFixed(2)
        }))

        // Auto-save the calculated score
        setTimeout(() => {
          saveFieldScore(participant.id, finalScoreField)
        }, 100)

      } catch (error) {
        console.error(`Error calculating score for participant ${participant.id}:`, error)
      }
    })

    alert(`Calculated final scores for ${filteredParticipants.length} participants`)
  }

  // Function to save squad status via API
  const saveSquadStatus = async (statusId: number) => {
    if (!contextSquad || !activeDiscipline || !eventId) {
      console.warn('Cannot save squad status: missing squad, discipline, or event')
      return
    }

    try {
      setSquadStatus(statusId)
      console.log('Saving squad status:', { 
        squadName: contextSquad.squad_name, 
        disciplineId: activeDiscipline, 
        statusId,
        eventId 
      })
      
      // Make API call to update status
      const response = await fetch(`/api/squad-disciplines/${encodeURIComponent(contextSquad.squad_name)}/${activeDiscipline}/status?eventId=${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusId: statusId
        }),
      })
      
      if (response.ok) {
        console.log('Squad status saved successfully')
        
        // Update local state
        const key = `${contextSquad.squad_name}-${activeDiscipline}`
        setSquadDisciplineStatuses(prev => ({
          ...prev,
          [key]: statusId
        }))
      } else {
        const errorData = await response.json()
        console.error('Failed to save squad status:', errorData)
        alert(`Failed to save squad status: ${errorData.error || 'Unknown error'}`)
        
        // Revert local state on error
        const key = `${contextSquad.squad_name}-${activeDiscipline}`
        const originalStatus = squadDisciplineStatuses[key] || null
        setSquadStatus(originalStatus)
      }
      
    } catch (error) {
      console.error('Error saving squad status:', error)
      alert('Failed to save squad status due to network error')
      
      // Revert local state on error
      const key = `${contextSquad.squad_name}-${activeDiscipline}`
      const originalStatus = squadDisciplineStatuses[key] || null
      setSquadStatus(originalStatus)
    }
  }

  // Handler for squad selection change
  const handleSquadChange = (squadName: string) => {
    setActiveSquad(squadName);
    
    // Reset discipline selection when squad changes
    if (activeDiscipline) {
      setActiveDiscipline('');
      setSelectedDiscipline(null);
    }
    
    // Store in context
    if (squadName) {
      const selectedSquadData = squads.find(s => s.name === squadName);
      if (selectedSquadData) {
        setSelectedSquad({
          squad_name: selectedSquadData.name,
          participant_count: selectedSquadData.participant_count,
          individual_count: 0,
          group_count: 0,
          team_count: 0
        });
      }
    } else {
      setSelectedSquad(null);
    }
  };

  // Handler for discipline selection change
  const handleDisciplineChange = (disciplineValue: number | string) => {
    setActiveDiscipline(disciplineValue);
    const discipline = disciplines.find(d => 
      d.int_disziplinid === disciplineValue || d.var_name === disciplineValue
    );
    if (discipline) {
      setSelectedDiscipline(discipline);
    }
  };

  // Function to handle squad status change
  const handleSquadStatusChange = (statusId: string) => {
    const numericStatusId = parseInt(statusId)
    if (!isNaN(numericStatusId)) {
      saveSquadStatus(numericStatusId)
    }
  }

  // Function to get status color style
  const getStatusColor = (statusId: number): string => {
    const status = statuses.find(s => s.int_statusid === statusId)
    if (!status || !status.ary_colorcode) {
      return 'bg-gray-100 text-gray-800'
    }
    
    // Parse color code (assuming format like "rgb(255,0,0)" or "#ff0000")
    const colorCode = status.ary_colorcode
    if (colorCode.includes('255,0,0') || colorCode.includes('#ff0000') || colorCode.includes('red')) {
      return 'bg-red-100 text-red-800'
    } else if (colorCode.includes('0,255,0') || colorCode.includes('#00ff00') || colorCode.includes('green')) {
      return 'bg-green-100 text-green-800'
    } else if (colorCode.includes('255,255,0') || colorCode.includes('#ffff00') || colorCode.includes('yellow')) {
      return 'bg-yellow-100 text-yellow-800'
    } else if (colorCode.includes('0,0,255') || colorCode.includes('#0000ff') || colorCode.includes('blue')) {
      return 'bg-blue-100 text-blue-800'
    }
    
    return 'bg-gray-100 text-gray-800'
  }

  // Helper function to get competition names for a participant
  const getParticipantCompetitions = (participant: Participant): string[] => {
    if (!participant.assignedCompetitions || participant.assignedCompetitions.length === 0) {
      return []
    }
    
    return participant.assignedCompetitions
      .map(competitionId => {
        const competition = competitions.find(c => c.id === competitionId)
        return competition?.name || competition?.var_name || `Competition ${competitionId}`
      })
      .filter(name => name) // Remove any undefined/empty names
  }

  // Helper function to check if score exceeds maximum and validation is enabled
  const getScoreValidation = (disciplineId: number | string, scoreValue: string) => {
    const discipline = displayDisciplines.find(d => 
      d.int_disziplinid === disciplineId || d.var_name === disciplineId
    )
    
    console.log('🔍 Score Validation:', {
      disciplineId,
      scoreValue,
      foundDiscipline: discipline?.var_name,
      maxScore: discipline?.maxScore,
      allDisciplines: displayDisciplines.map(d => ({ id: d.int_disziplinid, name: d.var_name, maxScore: d.maxScore }))
    })
    
    if (!discipline || !discipline.maxScore || discipline.maxScore <= 0) {
      // No validation if maxScore is 0 or undefined
      console.log('❌ No validation: discipline=%o, maxScore=%o', discipline, discipline?.maxScore)
      return { isValid: true, message: '' }
    }
    
    const numericScore = parseFloat(scoreValue)
    if (isNaN(numericScore) || scoreValue === '') {
      return { isValid: true, message: '' }
    }
    
    if (numericScore > discipline.maxScore) {
      console.log('⚠️ Score exceeds maximum!', numericScore, '>', discipline.maxScore)
      return { 
        isValid: false, 
        message: `Score exceeds maximum of ${discipline.maxScore.toFixed(2)} points`
      }
    }
    
    console.log('✅ Score is valid')
    return { isValid: true, message: '' }
  }

  const filteredParticipants = Array.isArray(participants) ? participants.filter(participant => {
    const matchesSearch = 
      participant.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (participant.startNumber && participant.startNumber.toString().includes(searchTerm))
    
    const matchesSquad = !activeSquad || participant.squad_name === activeSquad

    return matchesSearch && matchesSquad
  }) : []

  // Filter disciplines to show only selected one, or all if none selected
  const displayDisciplines = activeDiscipline 
    ? Array.isArray(disciplines) ? disciplines.filter(d => 
        d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline
      ) : []
    : Array.isArray(disciplines) ? disciplines : []

  const handleExportCSV = () => {
    // CSV export functionality for score data
    const csvData = Array.isArray(participants) ? participants.map(participant => {
      const row: any = {
        'Start Number': participant.startNumber || '',
        'Participant': `${participant.firstname} ${participant.lastname}`,
        'Club': participant.club,
        'Gender': participant.gender,
        'Age': participant.age
      }
      
      if (Array.isArray(disciplines)) {
        disciplines.forEach((discipline: Discipline, index: number) => {
          const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
          const key = `${participant.id}-${disciplineId}`
          row[discipline.var_name] = scoreMatrix[key] || ''
        })
      }
      
      return row
    }) : []
    
    console.log('Export score data as CSV', csvData)
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('scoreCapture.noEventTitle')}</h3>
          <p className="text-gray-500">{t('scoreCapture.noEventMessage')}</p>
        </div>
      </div>
    )
  }

  const helpContent = showJuryScores ? (
    <BlueInfoBox title={t('scoreCapture.formulaHelp.title', 'Hinweise zur Wertungserfassung')}>
      <ul className="space-y-2 text-sm">
        <li className="mb-1">
          <span className="font-semibold">{t('scoreCapture.formulaHelp.genericTitle', 'Allgemeine Hinweise zur Wertungsformel')}</span>: {t('scoreCapture.formulaHelp.generic', 'Die Endwertung wird basierend auf den eingegebenen Feldern und der Disziplin-spezifischen Formel berechnet. Die Formel verwendet Variablen (A, B, C, ...) die den einzelnen Feldern zugeordnet sind. Beispiel: Endwert = A - B - C, wobei A = D/A-Note, B = E/B-Note, C = Neutrale Abzüge.')}
        </li>
        <li className="mb-1">
          <span className="font-semibold">{t('scoreCapture.formulaHelp.disciplineTitle', 'Disziplin-spezifische Hinweise')}</span>: {t('scoreCapture.formulaHelp.discipline', 'Jede Disziplin kann eine eigene Formel und Felder haben. Die genaue Berechnung wird oberhalb der Eingabefelder angezeigt.')}
        </li>
        <li className="mb-1">
          <span className="font-semibold">{t('scoreCapture.formulaHelp.editable', 'Bearbeitung der Felder')}</span>: {t('scoreCapture.formulaHelp.editableText', 'Die Felder können direkt bearbeitet werden. Die Berechnung erfolgt automatisch nach Klick auf "Berechnen" oder beim Speichern.')}
        </li>
        <li className="mb-1 pt-2 border-t border-blue-200">
          <span className="font-semibold">{t('scoreCapture.formulaHelp.endwertTypes', 'Unterschied: Endwert offiziell vs. Jury-Endwert')}</span>:
          <ul className="ml-4 mt-1 space-y-1">
            <li>
              <strong>{t('scoreCapture.formulaHelp.officialEndwert', 'Endwert offiziell')}</strong>: {t('scoreCapture.formulaHelp.officialEndwertDesc', 'Dieser Wert wird in der Regel von der Wettkampfsoftware berechnet und ist das offizielle Ergebnis.')}
            </li>
            <li>
              <strong>{t('scoreCapture.formulaHelp.juryEndwert', 'Jury-Endwert')}</strong>: {t('scoreCapture.formulaHelp.juryEndwertDesc', 'Dieser Wert wird vom Kampfgericht berechnet und kann vom offiziellen Wert abweichen.')}
            </li>
          </ul>
        </li>
      </ul>
    </BlueInfoBox>
  ) : null;

  return (
    <EventManagementTemplate
      title={t('scoreCapture.title')}
      subtitle={
        selectedCompetition 
          ? t('scoreCapture.subtitleWithCompetition', { 
              name: selectedCompetition.name, 
              number: selectedCompetition.number ? ` (${t('scoreCapture.numberAbbrev')} ${selectedCompetition.number})` : '' 
            })
          : t('scoreCapture.subtitle')
      }
      icon={ClipboardDocumentListIcon}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t('scoreCapture.searchPlaceholder')}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      showExportCSV={true}
      onExportCSV={handleExportCSV}
      showEventContext={true}
      showViewToggle={false}
      showHelpPanel={showHelpPanel}
      onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
      helpContent={helpContent}
      customActions={
        <LiveUpdateIndicator label={t('common.liveUpdates')} />
      }
      customBelowActions={
        <div className="flex items-center gap-4">
          <button
            onClick={loadInitialData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('scoreCapture.refreshData')}
          </button>
          
          {/* Jury-Wertungen erfassen Checkbox (like Qt chk_jury) */}
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showJuryScores}
              onChange={(e) => handleShowJuryScoresChange(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              {t('scoreCapture.showJuryScores')}
            </span>
          </label>
        </div>
      }
      loading={loading}
    >
      {/* Squad and Device Selection */}
      <SquadDisciplineSelector
        squads={squads}
        activeSquad={activeSquad}
        onSquadChange={handleSquadChange}
        getFilteredSquads={getFilteredSquads}
        disciplines={disciplines}
        activeDiscipline={activeDiscipline}
        onDisciplineChange={handleDisciplineChange}
        getFilteredDisciplines={getFilteredDisciplines}
        statuses={statuses}
        squadStatus={squadStatus}
        onSquadStatusChange={handleSquadStatusChange}
        getStatusColor={getStatusColor}
        loading={loading}
      />
      
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">{t('scoreCapture.loadingParticipants')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          {!activeSquad || !activeDiscipline ? (
            <div className="p-8 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('scoreCapture.readyForCapture')}</h3>
              <div className="text-gray-500 space-y-1">
                {!activeSquad && <p>• {t('scoreCapture.pleaseSelectSquad')}</p>}
                {!activeDiscipline && <p>• {t('scoreCapture.pleaseSelectDevice')}</p>}
              </div>
              <p className="text-sm text-gray-400 mt-4">
                {t('scoreCapture.scoringInterfaceInfo')}
              </p>
            </div>
          ) : (participants || []).length === 0 ? (
            <div className="p-6 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('scoreCapture.noParticipantsTitle')}</h3>
              <p className="text-gray-500 mb-4">{t('scoreCapture.noParticipantsMessage')}</p>
            </div>
          ) : (
            <>
              {/* Score Capture Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        {t('scoreCapture.table.participant')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scoreCapture.table.club')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scoreCapture.table.ageGender')}
                      </th>
                      {displayDisciplines.map((discipline, index) => {
                        const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
                        const enabledFields = getDisciplineFields(disciplineId)
                        
                        return (
                          <th key={`header-${disciplineId}`} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-center">
                              <span>{discipline.var_shortname || discipline.var_name}</span>
                              {discipline.apparatus && (
                                <div className="text-xs text-gray-400 normal-case">{discipline.apparatus}</div>
                              )}
                              {discipline.maxScore && discipline.maxScore > 0 && (
                                <div className="text-xs text-blue-600 normal-case font-medium mt-1">
                                  Max: {discipline.maxScore.toFixed(2)}
                                </div>
                              )}
                              {/* Formula display - show when jury scores are enabled */}
                              {showJuryScores && enabledFields.length > 0 && (
                                <div className="text-xs text-gray-400 normal-case mt-1">
                                  {enabledFields.map(field => field.name).join(' • ')}
                                </div>
                              )}
                              {/* Formula display with calculation explanation */}
                              {showJuryScores && (discipline as any).var_formel && (
                                <div className="text-xs text-purple-600 normal-case mt-1 font-mono">
                                  {(() => {
                                    const formula = (discipline as any).var_formel;
                                    const formulaName = (discipline as any).formula_name;
                                    
                                    // Get final field name
                                    const finalField = enabledFields.find(f => f.isFinalScore);
                                    const finalFieldName = finalField?.name || 'Endwert';
                                    
                                    // Use generic formula parser if we have multiple fields
                                    if (enabledFields.length > 1) {
                                      const parsedFormula = parseFormulaDisplay(formula, enabledFields, finalFieldName);
                                      if (parsedFormula) {
                                        return parsedFormula;
                                      }
                                    }
                                    
                                    // Fallback display for any formula
                                    if (formulaName) {
                                      return `${formulaName}: ${formula}`;
                                    } else {
                                      return `Formel: ${formula}`;
                                    }
                                  })()}
                                </div>
                              )}
                              {/* Calculation timing explanation */}
                              {showJuryScores && enabledFields.length > 0 && (discipline as any).var_formel && (
                                <div className="text-xs text-blue-500 normal-case mt-1">
                                  ⓘ Berechnung: automatisch bei "Berechnen" oder manuell editierbar
                                </div>
                              )}
                              {/* Calculate button for disciplines with formulas and final score field - only show when jury scores are enabled */}
                              {showJuryScores && (discipline as any).var_formel && enabledFields.length > 0 && enabledFields.some(f => f.isFinalScore) && (
                                <button
                                  onClick={() => calculateDisciplineScores(disciplineId, enabledFields)}
                                  className="mt-1 px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                                  title="Calculate final scores based on field values and formula"
                                >
                                  Calculate
                                </button>
                              )}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParticipants.map(participant => {
                      return (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                            <div className="text-sm font-medium text-gray-900">
                              {participant.startNumber && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                  StNr.: {participant.startNumber}
                                </span>
                              )}
                              {participant.firstname} {participant.lastname}
                            </div>
                            {getParticipantCompetitions(participant).length > 0 ? (
                              <div className="text-xs text-gray-500">
                                {getParticipantCompetitions(participant).length === 1 ? 
                                  `Competition: ${getParticipantCompetitions(participant)[0]}` :
                                  `Competitions: ${getParticipantCompetitions(participant).join(', ')}`
                                }
                              </div>
                            ) : (
                              <div className="text-xs text-red-500">
                                No competition assigned
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.club}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.age} • <GenderBadge value={participant.gender} />
                          </td>
                          {displayDisciplines.map((discipline, disciplineIndex) => {
                            const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${disciplineIndex}` || disciplineIndex;
                            const enabledFields = getDisciplineFields(disciplineId)
                            
                            if (enabledFields.length === 0) {
                              // Fallback: single input field (old behavior)
                              const key = `${participant.id}-${disciplineId}`
                              const score = scoreMatrix[key] ?? ''
                              const validation = getScoreValidation(disciplineId, score)
                              
                              return (
                                <td key={`cell-${participant.id}-${disciplineId}`} className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={score}
                                      onChange={(e) => handleScoreChange(participant.id, disciplineId, e.target.value)}
                                      onBlur={(e) => {
                                        // Normalize score to show all decimal places
                                        const normalized = normalizeScoreInput(e.target.value, discipline.int_berechnung || 2);
                                        if (normalized !== e.target.value) {
                                          handleScoreChange(participant.id, disciplineId, normalized);
                                        }
                                        saveScore(participant.id, disciplineId);
                                      }}
                                      onKeyDown={(e) => {
                                        const currentRow = filteredParticipants.findIndex(p => p.id === participant.id);
                                        
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          // Normalize and save
                                          const normalized = normalizeScoreInput(e.currentTarget.value, discipline.int_berechnung || 2);
                                          if (normalized !== e.currentTarget.value) {
                                            handleScoreChange(participant.id, disciplineId, normalized);
                                          }
                                          saveScore(participant.id, disciplineId);
                                          // Blur the input field
                                          e.currentTarget.blur();
                                        } else if (e.key === 'ArrowRight' && currentRow < filteredParticipants.length - 1) {
                                          e.preventDefault();
                                          // Move to next participant
                                          const nextParticipant = filteredParticipants[currentRow + 1];
                                          const nextInput = document.querySelector<HTMLInputElement>(
                                            `input[data-participant="${nextParticipant.id}"][data-discipline="${disciplineId}"]`
                                          );
                                          if (nextInput) nextInput.focus();
                                        } else if (e.key === 'ArrowLeft' && currentRow > 0) {
                                          e.preventDefault();
                                          // Move to previous participant
                                          const prevParticipant = filteredParticipants[currentRow - 1];
                                          const prevInput = document.querySelector<HTMLInputElement>(
                                            `input[data-participant="${prevParticipant.id}"][data-discipline="${disciplineId}"]`
                                          );
                                          if (prevInput) prevInput.focus();
                                        }
                                      }}
                                      data-participant={participant.id}
                                      data-discipline={disciplineId}
                                      className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:border-transparent ${
                                        validation.isValid 
                                          ? 'border-gray-300 focus:ring-blue-500' 
                                          : 'border-red-300 bg-red-50 focus:ring-red-500'
                                      }`}
                                      placeholder={getScorePlaceholder(discipline.int_berechnung || 2)}
                                      title={!validation.isValid ? validation.message : ''}
                                    />
                                    {!validation.isValid && (
                                      <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 z-10 whitespace-nowrap">
                                        ⚠️ {validation.message}
                                      </div>
                                    )}
                                    {discipline.maxScore && discipline.maxScore > 0 && (
                                      <div className="absolute -top-6 left-0 right-0 text-xs text-gray-500 whitespace-nowrap">
                                        Max: {discipline.maxScore.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )
                            } else {
                              // New behavior: multiple input fields for enabled discipline fields
                              return (
                                <td key={`cell-${participant.id}-${disciplineId}`} className="px-6 py-4 whitespace-nowrap">
                                  <div className="space-y-2">
                                    {/* Editable total score (Endwert) from tfx_wertungen_details */}
                                    {(() => {
                                      // Green Endwert (tfx_wertungen_details) - simplified
                                      const safeExistingScores = Array.isArray(existingScores) ? existingScores : [];
                                      const existingScore = safeExistingScores.find(s => s.participantId === participant.id && s.disciplineId === disciplineId);
                                      const existingTotalScore = existingScore?.score || 0;
                                      const matrixKey = `${participant.id}-${disciplineId}`;
                                      // Prioritize matrix value if not empty, otherwise use DB value
                                      const matrixValue = scoreMatrix[matrixKey];
                                      let currentEndwert = '';
                                      if (matrixValue !== undefined && matrixValue !== '') {
                                        currentEndwert = matrixValue;
                                      } else if (existingTotalScore !== 0) {
                                        currentEndwert = existingTotalScore.toString();
                                      } else {
                                        currentEndwert = '';
                                      }

                                      console.log('Endwert for participant', participant.id, 'discipline', disciplineId, ':', {
                                        existingTotalScore,
                                        matrixValue: scoreMatrix[matrixKey],
                                        currentEndwert
                                      });

                                      // Grey Endwert (tfx_jury_results): find the field with name 'Endwert' or isFinalScore
                                      const juryEndwertField = enabledFields.find(f => f.isFinalScore || f.name.toLowerCase().includes('endwert'));
                                      const juryFieldKey = juryEndwertField ? `${participant.id}-${juryEndwertField.id}` : null;
                                      const juryEndwert = juryFieldKey ? (scoreMatrix[juryFieldKey] ?? '') : '';

                                      // Calculate handler: set both Endwerts to the calculated value and save both
                                      const handleCalculate = async () => {
                                        let calcValue = currentEndwert;
                                        // If juryEndwert is filled, prefer that for calculation
                                        if (juryEndwert && !isNaN(parseFloat(juryEndwert))) {
                                          calcValue = juryEndwert;
                                        }
                                        if (!calcValue || isNaN(parseFloat(calcValue))) return;
                                        // Set both fields
                                        setScoreMatrix(prev => ({
                                          ...prev,
                                          [matrixKey]: calcValue,
                                          ...(juryFieldKey ? { [juryFieldKey]: calcValue } : {})
                                        }));
                                        // Save both
                                        await saveScore(participant.id, disciplineId);
                                        if (juryFieldKey && juryEndwertField) {
                                          await saveFieldScore(participant.id, juryEndwertField);
                                        }
                                      };

                                      return (
                                        <div className="mb-2">
                                          {/* Green Endwert (official) */}
                                          <div className="p-2 bg-green-50 border border-green-200 rounded mb-1">
                                            <div className="text-xs text-green-600 font-medium text-center mb-1">Endwert (offiziell)</div>
                                            {(() => {
                                              const endwertValidation = getScoreValidation(disciplineId, currentEndwert)
                                              const currentRow = filteredParticipants.findIndex(p => p.id === participant.id);
                                              return (
                                                <div className="relative">
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    value={currentEndwert}
                                                    onChange={e => {
                                                      const value = e.target.value;
                                                      setScoreMatrix(prev => ({
                                                        ...prev,
                                                        [matrixKey]: value
                                                      }));
                                                    }}
                                                    onBlur={async (e) => {
                                                      const value = e.target.value;
                                                      if (value && value.trim() !== '' && !isNaN(parseFloat(value))) {
                                                        console.log('🟢 Saving official Endwert:', value, 'for participant', participant.id, 'discipline', disciplineId);
                                                        
                                                        setScoreMatrix(prev => ({
                                                          ...prev,
                                                          [matrixKey]: value
                                                        }));
                                                        
                                                        setPendingEndwerts(prev => ({ ...prev, [matrixKey]: value }));
                                                        
                                                        setExistingScores(prev => {
                                                          const safePrev = Array.isArray(prev) ? prev : [];
                                                          let numericDisciplineId: number;
                                                          if (typeof disciplineId === 'number') {
                                                            numericDisciplineId = disciplineId;
                                                          } else {
                                                            const found = disciplines.find(d => d.var_name === disciplineId);
                                                            numericDisciplineId = found?.int_disziplinid || 0;
                                                          }
                                                          const idx = safePrev.findIndex(s => s.participantId === participant.id && s.disciplineId === numericDisciplineId);
                                                          if (idx !== -1) {
                                                            const updated = [...safePrev];
                                                            updated[idx] = { ...updated[idx], score: parseFloat(value) };
                                                            return updated;
                                                          } else {
                                                            return [...safePrev, {
                                                              participantId: participant.id,
                                                              disciplineId: numericDisciplineId,
                                                              competitionId: competitionId ? parseInt(competitionId) : 1,
                                                              score: parseFloat(value),
                                                              attempt: 1,
                                                              status: 'completed'
                                                            }];
                                                          }
                                                        });
                                                        
                                                        try {
                                                          console.log('🟢 Calling saveScore...');
                                                          await saveScore(participant.id, disciplineId);
                                                          console.log('✅ SaveScore completed successfully');
                                                        } catch (error) {
                                                          console.error('❌ SaveScore failed:', error);
                                                          alert('Failed to save Endwert. Please try again.');
                                                        }
                                                      } else {
                                                        console.log('⚠️  Skipping save - invalid value:', value);
                                                      }
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        e.currentTarget.blur();
                                                      } else if (e.key === 'ArrowRight' && currentRow < filteredParticipants.length - 1) {
                                                        e.preventDefault();
                                                        const nextParticipant = filteredParticipants[currentRow + 1];
                                                        const nextInput = document.querySelector<HTMLInputElement>(
                                                          `input[data-endwert-participant="${nextParticipant.id}"][data-endwert-discipline="${disciplineId}"]`
                                                        );
                                                        if (nextInput) nextInput.focus();
                                                      } else if (e.key === 'ArrowLeft' && currentRow > 0) {
                                                        e.preventDefault();
                                                        const prevParticipant = filteredParticipants[currentRow - 1];
                                                        const prevInput = document.querySelector<HTMLInputElement>(
                                                          `input[data-endwert-participant="${prevParticipant.id}"][data-endwert-discipline="${disciplineId}"]`
                                                        );
                                                        if (prevInput) prevInput.focus();
                                                      }
                                                    }}
                                                    data-endwert-participant={participant.id}
                                                    data-endwert-discipline={disciplineId}
                                                    className={`w-full text-sm font-bold text-center bg-transparent border-0 focus:ring-1 rounded px-1 ${
                                                      endwertValidation.isValid
                                                        ? 'text-green-700 focus:ring-green-400'
                                                        : 'text-red-700 focus:ring-red-500 bg-red-50'
                                                    }`}
                                                    placeholder="0.00"
                                                    title={endwertValidation.isValid ? "Click to edit total score (Endwert)" : endwertValidation.message}
                                                  />
                                                  {!endwertValidation.isValid && (
                                                    <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-1 z-10 text-center">
                                                      ⚠️ {endwertValidation.message}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })()}
                                          </div>
                                          {/* Grey Endwert (jury) - only show when jury scores are enabled */}
                                          {showJuryScores && juryFieldKey && (
                                            <div className="p-2 bg-gray-100 border border-gray-300 rounded mb-1">
                                              <div className="text-xs text-gray-600 font-medium text-center mb-1">Endwert (Jury)</div>
                                              {(() => {
                                                const juryValidation = getScoreValidation(disciplineId, juryEndwert)
                                                const currentRow = filteredParticipants.findIndex(p => p.id === participant.id);
                                                return (
                                                  <div className="relative">
                                                    <input
                                                      type="text"
                                                      inputMode="decimal"
                                                      value={juryEndwert}
                                                      onChange={e => {
                                                        const value = e.target.value;
                                                        setScoreMatrix(prev => ({ ...prev, [juryFieldKey]: value }));
                                                      }}
                                                      onBlur={async (e) => {
                                                        // Normalize score to show all decimal places
                                                        const normalized = normalizeScoreInput(e.target.value, discipline.int_berechnung || 2);
                                                        if (normalized !== e.target.value) {
                                                          setScoreMatrix(prev => ({ ...prev, [juryFieldKey]: normalized }));
                                                        }
                                                        if (juryFieldKey && juryEndwertField) {
                                                          await saveFieldScore(participant.id, juryEndwertField);
                                                        }
                                                      }}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                          e.preventDefault();
                                                          e.currentTarget.blur();
                                                        } else if (e.key === 'ArrowRight' && currentRow < filteredParticipants.length - 1) {
                                                          e.preventDefault();
                                                          const nextParticipant = filteredParticipants[currentRow + 1];
                                                          const nextInput = document.querySelector<HTMLInputElement>(
                                                            `input[data-jury-participant="${nextParticipant.id}"][data-jury-discipline="${disciplineId}"]`
                                                          );
                                                          if (nextInput) nextInput.focus();
                                                        } else if (e.key === 'ArrowLeft' && currentRow > 0) {
                                                          e.preventDefault();
                                                          const prevParticipant = filteredParticipants[currentRow - 1];
                                                          const prevInput = document.querySelector<HTMLInputElement>(
                                                            `input[data-jury-participant="${prevParticipant.id}"][data-jury-discipline="${disciplineId}"]`
                                                          );
                                                          if (prevInput) prevInput.focus();
                                                        }
                                                      }}
                                                      data-jury-participant={participant.id}
                                                      data-jury-discipline={disciplineId}
                                                      className={`w-full text-sm font-bold text-center bg-transparent border-0 focus:ring-1 rounded px-1 ${
                                                        juryValidation.isValid
                                                          ? 'text-gray-700 focus:ring-gray-400'
                                                          : 'text-red-700 focus:ring-red-500 bg-red-50'
                                                      }`}
                                                      placeholder={getScorePlaceholder(discipline.int_berechnung || 2)}
                                                      title={juryValidation.isValid ? "Jury result Endwert" : juryValidation.message}
                                                    />
                                                    {!juryValidation.isValid && (
                                                      <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-1 z-10 text-center">
                                                        ⚠️ {juryValidation.message}
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              })()}
                                            </div>
                                          )}
                                          {/* Calculate button - only show when jury scores are enabled */}
                                          {showJuryScores && (
                                            <div className="flex justify-center mt-1">
                                              <button
                                                type="button"
                                                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                                onClick={handleCalculate}
                                              >
                                                {t('scoreCapture.calculateAndSave')}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    
                                    {/* Individual field inputs (hide Endwert field if already shown above) - only show when jury scores are enabled */}
                                    {showJuryScores && enabledFields.filter(field => {
                                      // Hide jury Endwert field if it's already shown as the grey box above
                                      if (field.isFinalScore || field.name.toLowerCase().includes('endwert')) return false;
                                      return true;
                                    }).map(field => {
                                      const fieldKey = `${participant.id}-${field.id}`;
                                      const fieldValue = scoreMatrix[fieldKey] ?? '';
                                      const validation = getScoreValidation(disciplineId, fieldValue);
                                      const currentRow = filteredParticipants.findIndex(p => p.id === participant.id);
                                      return (
                                        <div key={`field-${participant.id}-${field.id}`} className="flex flex-col items-center">
                                          <label className="text-xs text-gray-600 mb-1 text-center" title={field.name}>
                                            {field.name.length > 8 ? `${field.name.substring(0, 8)}...` : field.name}
                                          </label>
                                          <div className="relative">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={fieldValue}
                                              data-field={fieldKey}
                                              onChange={(e) => handleFieldScoreChange(participant.id, field.id, e.target.value)}
                                              onBlur={(e) => {
                                                // Normalize score to show all decimal places
                                                const normalized = normalizeScoreInput(e.target.value, discipline.int_berechnung || 2);
                                                if (normalized !== e.target.value) {
                                                  handleFieldScoreChange(participant.id, field.id, normalized);
                                                }
                                                const value = e.target.value;
                                                if (value && value.trim() !== '') {
                                                  console.log(`🟡 Saving individual field: ${field.name} = ${value}`);
                                                  saveFieldScore(participant.id, field);
                                                } else {
                                                  console.log(`⚠️  Skipping save for empty field: ${field.name}`);
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  e.currentTarget.blur();
                                                } else if (e.key === 'ArrowRight' && currentRow < filteredParticipants.length - 1) {
                                                  e.preventDefault();
                                                  const nextParticipant = filteredParticipants[currentRow + 1];
                                                  const nextInput = document.querySelector<HTMLInputElement>(
                                                    `input[data-field-participant="${nextParticipant.id}"][data-field-id="${field.id}"]`
                                                  );
                                                  if (nextInput) nextInput.focus();
                                                } else if (e.key === 'ArrowLeft' && currentRow > 0) {
                                                  e.preventDefault();
                                                  const prevParticipant = filteredParticipants[currentRow - 1];
                                                  const prevInput = document.querySelector<HTMLInputElement>(
                                                    `input[data-field-participant="${prevParticipant.id}"][data-field-id="${field.id}"]`
                                                  );
                                                  if (prevInput) prevInput.focus();
                                                }
                                              }}
                                              data-field-participant={participant.id}
                                              data-field-id={field.id}
                                              className={`w-16 px-1 py-1 text-xs border rounded focus:ring-2 focus:border-transparent transition-colors ${
                                                validation.isValid 
                                                  ? 'border-gray-300 focus:ring-blue-500' 
                                                  : 'border-red-300 bg-red-50 focus:ring-red-500'
                                              }`}
                                              placeholder={getScorePlaceholder(discipline.int_berechnung || 2)}
                                              title={`${field.name}${!validation.isValid ? ' - ' + validation.message : ''}`}
                                            />
                                            {!validation.isValid && (
                                              <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-1 z-10 whitespace-nowrap">
                                                ⚠️
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              )
                            }
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </EventManagementTemplate>
  )
}

export default ScoreCapture

