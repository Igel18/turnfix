import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { EventProvider } from '@/contexts/EventContext'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Events from '@/pages/Events'
import ClubsNew from '@/pages/ClubsNew'
import Regions from '@/pages/Regions'
import Associations from '@/pages/Associations'
import Participants from '@/pages/Participants'
import Results from '@/pages/Results'
import ScoreCapture from '@/pages/ScoreCapture'
import CompetitionsFixed from '@/pages/CompetitionsFixed'
import Disciplines from '@/pages/Disciplines'
import SquadManagement from '@/pages/SquadManagement'
import EventParticipants from '@/pages/EventParticipants'
import DatabaseConfig from '@/pages/DatabaseConfig'

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/clubs" element={<ClubsNew />} />
            <Route path="/regions" element={<Regions />} />
            <Route path="/associations" element={<Associations />} />
            <Route path="/participants" element={<Participants />} />
            <Route path="/results" element={<Results />} />
            <Route path="/score-capture" element={<ScoreCapture />} />
            <Route path="/competitions" element={<CompetitionsFixed />} />
            <Route path="/squads" element={<SquadManagement />} />
            <Route path="/event-participants" element={<EventParticipants />} />
            <Route path="/disciplines" element={<Disciplines />} />
            <Route path="/database-config" element={<DatabaseConfig />} />
          </Routes>
        </div>
      </EventProvider>
    </AuthProvider>
  )
}

export default App
