import { useState, useEffect } from 'react'
import {
  PlusIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  TableCellsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { exportToCSV } from '@/utils/csvExport'
import { apiGet, apiDelete, apiPost, apiPut } from '@/utils/api'

interface DisciplineField {
  id: number
  disciplineId: number
  disciplineName: string
  disciplineShort: string
  name: string
  sortOrder: number | null
  isFinalScore: boolean
  isStartingScore: boolean
  group: number
  enabled: boolean
}

interface Discipline {
  id: number
  name: string
  short_name?: string
}

export default function DisciplineFields() {
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<DisciplineField | null>(null)
  const [formData, setFormData] = useState({
    disciplineId: 0,
    name: '',
    sortOrder: 1,
    isFinalScore: true,
    isStartingScore: true,
    group: 1,
    enabled: true
  })

  useEffect(() => {
    fetchDisciplineFields()
    fetchDisciplines()
  }, [])

  const fetchDisciplineFields = async () => {
    try {
      setIsLoading(true)
      const data = await apiGet('/discipline-fields')
      setDisciplineFields(data || [])
    } catch (error) {
      console.error('Error fetching discipline fields:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDisciplines = async () => {
    try {
      const data = await apiGet('/disciplines')
      setDisciplines(data || [])
    } catch (error) {
      console.error('Error fetching disciplines:', error)
    }
  }

  const handleCreate = () => {
    setEditingField(null)
    setFormData({
      disciplineId: 0,
      name: '',
      sortOrder: 1,
      isFinalScore: true,
      isStartingScore: true,
      group: 1,
      enabled: true
    })
    setIsModalOpen(true)
  }

  const handleEdit = (field: DisciplineField) => {
    setEditingField(field)
    setFormData({
      disciplineId: field.disciplineId,
      name: field.name || '',
      sortOrder: field.sortOrder || 1,
      isFinalScore: field.isFinalScore,
      isStartingScore: field.isStartingScore,
      group: field.group,
      enabled: field.enabled
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Sind Sie sicher, dass Sie das Disziplinfeld "${name}" löschen möchten?`)) {
      try {
        await apiDelete(`/discipline-fields/${id}`)
        fetchDisciplineFields()
      } catch (error: any) {
        console.error('Error deleting discipline field:', error)
        
        // Provide specific error messages based on error content
        if (error.message?.includes('existing jury results')) {
          alert(
            `Das Disziplinfeld "${name}" kann nicht gelöscht werden, da bereits Jury-Bewertungen dafür existieren.\n\n` +
            `Alternativen:\n` +
            `• Feld deaktivieren (in Score Capture ausblenden)\n` +
            `• Zuerst alle zugehörigen Bewertungen löschen\n` +
            `• Feld umbenennen statt löschen`
          )
        } else if (error.message?.includes('referenced by')) {
          alert(
            `Das Disziplinfeld "${name}" wird noch verwendet und kann daher nicht gelöscht werden.\n\n` +
            `Bitte entfernen Sie zuerst alle Verweise auf dieses Feld.`
          )
        } else if (error.message?.includes('constraint')) {
          alert(
            `Das Disziplinfeld "${name}" kann aufgrund von Datenbank-Einschränkungen nicht gelöscht werden.\n\n` +
            `Möglicherweise existieren noch verknüpfte Datensätze.`
          )
        } else {
          alert(
            `Fehler beim Löschen des Disziplinfelds "${name}".\n\n` +
            `Details: ${error.message || 'Unbekannter Fehler'}\n\n` +
            `Versuchen Sie es später erneut oder wenden Sie sich an den Administrator.`
          )
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingField) {
        await apiPut(`/discipline-fields/${editingField.id}`, formData)
      } else {
        await apiPost('/discipline-fields', formData)
      }
      
      setIsModalOpen(false)
      fetchDisciplineFields()
    } catch (error) {
      console.error('Error saving discipline field:', error)
      alert('Fehler beim Speichern des Disziplinfelds')
    }
  }

  const handleExport = () => {
    const csvData = disciplineFields.map(field => ({
      'ID': field.id,
      'Disziplin': field.disciplineName,
      'Feldname': field.name,
      'Sortierung': field.sortOrder,
      'Endwert': field.isFinalScore ? 'Ja' : 'Nein',
      'Ausgangswert': field.isStartingScore ? 'Ja' : 'Nein',
      'Gruppe': field.group,
      'Score Capture': field.enabled ? 'Sichtbar' : 'Versteckt'
    }))
    
    exportToCSV({
      filename: 'disziplinfelder',
      headers: ['ID', 'Disziplin', 'Feldname', 'Sortierung', 'Endwert', 'Ausgangswert', 'Gruppe', 'Score Capture'],
      data: csvData
    })
  }

  // Filter discipline fields
  const filteredFields = disciplineFields.filter(field => {
    const matchesSearch = field.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.disciplineName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDiscipline = !selectedDiscipline || field.disciplineId.toString() === selectedDiscipline
    
    return matchesSearch && matchesDiscipline
  })

  // Group fields by discipline
  const fieldsByDiscipline = filteredFields.reduce((acc, field) => {
    const key = `${field.disciplineId}-${field.disciplineName}`
    if (!acc[key]) {
      acc[key] = {
        disciplineId: field.disciplineId,
        disciplineName: field.disciplineName,
        disciplineShort: field.disciplineShort,
        fields: []
      }
    }
    acc[key].fields.push(field)
    return acc
  }, {} as Record<string, { disciplineId: number, disciplineName: string, disciplineShort: string, fields: DisciplineField[] }>)

  // Sort fields within each discipline
  Object.values(fieldsByDiscipline).forEach(group => {
    group.fields.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <UnifiedPageHeader
          title="Disziplinfelder"
          subtitle="Bewertungsfelder für Disziplinen verwalten"
          icon={CogIcon}
        />

        {/* Info Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">📝 Score Capture Konfiguration</h4>
          <div className="text-sm text-blue-800">
            <p className="mb-2">
              <strong>Diese Felder bestimmen, welche Eingabefelder in der Wettkampferfassung (Score Capture) angezeigt werden.</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-1">✅ Sichtbare Felder erscheinen als:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• D/A-Note (Schwierigkeit)</li>
                  <li>• E/B-Note (Ausführung)</li>
                  <li>• Neutrale Abzüge</li>
                  <li>• Ausgangswert</li>
                  <li>• Weitere konfigurierte Felder</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">⚙️ Konfiguration:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• <strong>Sortierung:</strong> Reihenfolge der Felder</li>
                  <li>• <strong>Gruppe:</strong> Feldgruppierung</li>
                  <li>• <strong>Typ:</strong> End-/Ausgangswert</li>
                  <li>• <strong>Sichtbarkeit:</strong> Ein/Aus für Score Capture</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section - Field Scores Implementation Status */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">✅ Feldspezifische Bewertungen</h4>
          <div className="text-sm text-green-800">
            <p className="mb-2">
              <strong>Feldspezifische Bewertungen werden bereits in der Datenbank gespeichert (tfx_jury_results).</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-1">� Funktionalität:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• Felder werden korrekt angezeigt</li>
                  <li>• Eingaben werden gespeichert</li>
                  <li>• API-Anbindung implementiert</li>
                  <li>• Datenbank-Integration aktiv</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">� Technische Details:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• <strong>Tabelle:</strong> tfx_jury_results</li>
                  <li>• <strong>API:</strong> /api/jury-results</li>
                  <li>• <strong>Felder:</strong> Teilnehmer, Feld, Wert</li>
                  <li>• <strong>Integration:</strong> Score Capture UI</li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-xs text-green-700">
              Die Konfiguration und Speicherung der Felder funktioniert vollständig. Jury-Bewertungen werden korrekt in der Datenbank persistiert.
            </p>
          </div>
        </div>

        {/* Info Section - Field Deletion Rules */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-900 mb-2">🚫 Löschen von Disziplinfeldern</h4>
          <div className="text-sm text-red-800">
            <p className="mb-2">
              <strong>Felder mit bestehenden Jury-Bewertungen können nicht gelöscht werden.</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-1">❌ Löschen nicht möglich wenn:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• Jury-Bewertungen existieren</li>
                  <li>• Feld in Wettkämpfen verwendet wird</li>
                  <li>• Referenzen in anderen Tabellen</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">✅ Alternativen:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• <strong>Deaktivieren:</strong> Feld ausblenden</li>
                  <li>• <strong>Umbenennen:</strong> Feld anpassen</li>
                  <li>• <strong>Bewertungen löschen:</strong> Dann Feld entfernen</li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-xs text-red-700">
              Diese Schutzmaßnahme verhindert Datenverlust und stellt die Integrität der Wettkampfdaten sicher.
            </p>
          </div>
        </div>

        {/* Actions and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Neues Feld</span>
              </button>
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                CSV Export
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              >
                <TableCellsIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Suche nach Name oder Disziplin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Alle Disziplinen</option>
                {disciplines.map(discipline => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Disziplinfelder...</p>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Disziplinfelder gefunden</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedDiscipline ? 'Keine Felder entsprechen den Filterkriterien' : 'Erstellen Sie Ihr erstes Disziplinfeld'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="space-y-8">
            {Object.values(fieldsByDiscipline).map(group => (
              <div key={`${group.disciplineId}-${group.disciplineName}`} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    {group.disciplineName}
                    {group.disciplineShort && (
                      <span className="ml-2 text-sm text-gray-500">({group.disciplineShort})</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{group.fields.length} Felder</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Feldname
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sortierung
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Typ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gruppe
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score Capture
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.fields.map((field) => (
                        <tr key={field.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{field.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{field.sortOrder || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {field.isFinalScore && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1">End</span>}
                              {field.isStartingScore && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Start</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{field.group}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              field.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {field.enabled ? '📝 Sichtbar' : '❌ Versteckt'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(field)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Bearbeiten"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(field.id, field.name || '')}
                                className="text-red-600 hover:text-red-900"
                                title="Löschen"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(fieldsByDiscipline).map(group => (
              <div key={`${group.disciplineId}-${group.disciplineName}`}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {group.disciplineName}
                  {group.disciplineShort && (
                    <span className="ml-2 text-sm text-gray-500">({group.disciplineShort})</span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.fields.map((field) => (
                    <div key={field.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">{field.name}</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(field)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Bearbeiten"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(field.id, field.name || '')}
                            className="text-red-600 hover:text-red-900"
                            title="Löschen"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Sortierung:</span>
                          <span className="text-sm font-medium">{field.sortOrder || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Gruppe:</span>
                          <span className="text-sm font-medium">{field.group}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Typ:</span>
                          <div className="text-sm">
                            {field.isFinalScore && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-1">End</span>}
                            {field.isStartingScore && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Start</span>}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Score Capture:</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            field.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {field.enabled ? '📝 Sichtbar' : '❌ Versteckt'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingField ? 'Disziplinfeld bearbeiten' : 'Neues Disziplinfeld'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disziplin *
                  </label>
                  <select
                    value={formData.disciplineId}
                    onChange={(e) => setFormData({...formData, disciplineId: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value={0}>Disziplin auswählen</option>
                    {disciplines.map(discipline => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feldname *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sortierung
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gruppe
                  </label>
                  <input
                    type="number"
                    value={formData.group}
                    onChange={(e) => setFormData({...formData, group: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isFinalScore}
                      onChange={(e) => setFormData({...formData, isFinalScore: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Endwert</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isStartingScore}
                      onChange={(e) => setFormData({...formData, isStartingScore: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ausgangswert</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">📝 Eingabefeld in Score Capture anzeigen</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    ✅ <strong>Aktiviert:</strong> Feld wird als Eingabefeld in der Wettkampferfassung angezeigt (wie D/A-Note, E/B-Note, etc.)<br/>
                    ❌ <strong>Deaktiviert:</strong> Feld ist nur in der Verwaltung sichtbar, nicht in Score Capture
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    {editingField ? 'Aktualisieren' : 'Erstellen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
