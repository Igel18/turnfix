import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { EventProvider } from '@/contexts/EventContext'
import { CertificateLayoutProvider } from '@/contexts/CertificateLayoutContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import './i18n'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Events from '@/pages/Events'
import EventManagement from '@/pages/EventManagement'
import ClubsUnified from '@/pages/ClubsUnified'
import Regions from '@/pages/Regions'
import Associations from '@/pages/Associations'
import ParticipantsUnified from '@/pages/ParticipantsUnified'
import Results from '@/pages/Results'
import ScoreCapture from '@/pages/ScoreCapture'
import CompetitionsFixed from '@/pages/CompetitionsFixed'
import CompetitionsDebug from '@/pages/CompetitionsDebug'
import DisciplinesUnified from '@/pages/DisciplinesUnified'
import DisciplineFieldsUnified from '@/pages/DisciplineFieldsUnified'
import SquadManagement from '@/pages/SquadManagement'
import { SquadStatusManagement } from '@/pages/SquadStatusManagement'
import CompetitionStatusManagement from '@/pages/CompetitionStatusManagement'
import EventParticipants from '@/pages/EventParticipants'
import DatabaseConfig from '@/pages/DatabaseConfig'
import CertificateLayouts from '@/pages/CertificateLayouts'
import StatusUnified from '@/pages/StatusUnified'
import LocationsUnified from '@/pages/LocationsUnified'
import LocationsDebug from '@/pages/LocationsDebug'
import PersonsUnified from '@/pages/PersonsUnified'
import SportsUnified from '@/pages/SportsUnified'
import FormulasUnified from '@/pages/FormulasUnified'
import DisciplineGroupsUnified from '@/pages/DisciplineGroupsUnified'
import Meldematrix from '@/pages/Meldematrix'
import Medallienspiegel from '@/pages/Medallienspiegel'
import Configuration from '@/pages/Configuration'
import JuryPortal from '@/pages/JuryPortal'

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <EventProvider>
          <CertificateLayoutProvider>
            <div className="min-h-screen bg-background">
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event-management" element={<EventManagement />} />
            <Route path="/clubs" element={<ClubsUnified />} />
            <Route path="/regions" element={<Regions />} />
            <Route path="/associations" element={<Associations />} />
            <Route path="/participants" element={<ParticipantsUnified />} />
            <Route path="/results" element={<Results />} />
            <Route path="/score-capture" element={<ScoreCapture />} />
            <Route path="/competitions" element={<CompetitionsFixed />} />
            <Route path="/competitions-debug" element={<CompetitionsDebug />} />
            <Route path="/squads" element={<SquadManagement />} />
            <Route path="/squad-status" element={<SquadStatusManagement />} />
            <Route path="/competition-status" element={<CompetitionStatusManagement />} />
            <Route path="/event-participants" element={<EventParticipants />} />
            <Route path="/meldematrix" element={<Meldematrix />} />
            <Route path="/medallienspiegel" element={<Medallienspiegel />} />
            <Route path="/disciplines" element={<DisciplinesUnified />} />
            <Route path="/discipline-fields" element={<DisciplineFieldsUnified />} />
            <Route path="/sports" element={<SportsUnified />} />
            <Route path="/formulas" element={<FormulasUnified />} />
            <Route path="/discipline-groups" element={<DisciplineGroupsUnified />} />
            <Route path="/database-config" element={<DatabaseConfig />} />
            <Route path="/locations" element={<LocationsUnified />} />
            <Route path="/locations-debug" element={<LocationsDebug />} />
            <Route path="/persons" element={<PersonsUnified />} />
            <Route path="/certificate-layouts" element={<CertificateLayouts />} />
            <Route path="/status-management" element={<StatusUnified />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/jury" element={<JuryPortal />} />
          </Routes>
        </div>
        </CertificateLayoutProvider>
      </EventProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
