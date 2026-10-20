import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { EventProvider } from '@/contexts/EventContext'
import { CertificateLayoutProvider } from '@/contexts/CertificateLayoutContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import './i18n'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import ManagementCenter from '@/pages/ManagementCenter'
import Events from '@/pages/Events'
import EventManagement from '@/pages/EventManagement'
import ClubsUnified from '@/pages/ClubsUnified'
import Groups from '@/pages/Groups'
import Teams from '@/pages/Teams'
import Regions from '@/pages/Regions'
import Countries from '@/pages/Countries'
import Associations from '@/pages/Associations'
import ParticipantsUnified from '@/pages/ParticipantsUnified'
import Results from '@/pages/Results'
import ScoreCapture from '@/pages/ScoreCapture'
import Competitions from '@/pages/Competitions'
import Areas from '@/pages/Areas'
import DisciplinesUnified from '@/pages/DisciplinesUnified'
import DisciplineFieldsUnified from '@/pages/DisciplineFieldsUnified'
import SquadManagement from '@/pages/SquadManagement'
import { SquadStatusManagement } from '@/pages/SquadStatusManagement'
import { ParticipantStatusManagement } from '@/pages/ParticipantStatusManagement'
import CompetitionStatusManagement from '@/pages/CompetitionStatusManagement'
import EventParticipants from '@/pages/EventParticipants'
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
import TimePlanningRounds from '@/pages/TimePlanningRounds'
import TimePlanningRotationPage from '@/pages/TimePlanningRotationPage'
import TimePlanningRotationOverviewPage from '@/pages/TimePlanningRotationOverviewPage'
import TimePlanningMatrixPage from '@/pages/TimePlanningMatrixPage'
import LiveScoresPage from '@/pages/LiveScoresPage'
import GroupScoreCapture from '@/pages/GroupTeamScoring/GroupScoreCapture'
import TeamScoreCapture from '@/pages/GroupTeamScoring/TeamScoreCapture'
import Documents from '@/pages/Documents'
import Analyzer from '@/pages/Analyzer'
import ScoreCaptureV2 from '@/pages/ScoreCaptureV2'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <EventProvider>
            <CertificateLayoutProvider>
              <div className="min-h-screen bg-background">
                <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/management" element={<ManagementCenter />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event-management" element={<EventManagement />} />
            <Route path="/clubs" element={<ClubsUnified />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/regions" element={<Regions />} />
            <Route path="/countries" element={<Countries />} />
            <Route path="/associations" element={<Associations />} />
            <Route path="/participants" element={<ParticipantsUnified />} />
            <Route path="/results" element={<Results />} />
            <Route path="/score-capture" element={<ScoreCapture />} />
            <Route path="/score-capture-v2" element={<ScoreCaptureV2 />} />
            <Route path="/group-scoring" element={<GroupScoreCapture />} />
            <Route path="/team-scoring" element={<TeamScoreCapture />} />
            <Route path="/competitions" element={<Competitions />} />
            <Route path="/squads" element={<SquadManagement />} />
            <Route path="/time-planning" element={<TimePlanningRounds />} />
            <Route path="/time-planning/rounds" element={<TimePlanningRounds />} />
            <Route path="/time-planning/rotation" element={<TimePlanningRotationPage />} />
            <Route path="/time-planning/rotation-overview" element={<TimePlanningRotationOverviewPage />} />
            <Route path="/time-planning/matrix" element={<TimePlanningMatrixPage />} />
            <Route path="/squad-status" element={<SquadStatusManagement />} />
            <Route path="/participant-status" element={<ParticipantStatusManagement />} />
            <Route path="/competition-status" element={<CompetitionStatusManagement />} />
            <Route path="/live-scores" element={<LiveScoresPage />} />
            <Route path="/event-participants" element={<EventParticipants />} />
            <Route path="/meldematrix" element={<Meldematrix />} />
            <Route path="/medallienspiegel" element={<Medallienspiegel />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/disciplines" element={<DisciplinesUnified />} />
            <Route path="/discipline-fields" element={<DisciplineFieldsUnified />} />
            <Route path="/sports" element={<SportsUnified />} />
            <Route path="/formulas" element={<FormulasUnified />} />
            <Route path="/discipline-groups" element={<DisciplineGroupsUnified />} />
            <Route path="/locations" element={<LocationsUnified />} />
            <Route path="/locations-debug" element={<LocationsDebug />} />
            <Route path="/persons" element={<PersonsUnified />} />
            <Route path="/certificate-layouts" element={<CertificateLayouts />} />
            <Route path="/status-management" element={<StatusUnified />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/analyzer" element={<Analyzer />} />
          </Routes>
        </div>
        </CertificateLayoutProvider>
      </EventProvider>
      </LanguageProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
