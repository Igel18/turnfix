import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleStackIcon } from '@heroicons/react/24/outline'

export function Home() {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {t('home.welcome')}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('home.description')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/dashboard" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {t('home.enterDashboard')}
            </Link>
            <Link 
              to="/events" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition"
            >
              {t('home.viewEvents')}
            </Link>
            <Link 
              to="/database-config" 
              className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition flex items-center gap-2"
            >
              <CircleStackIcon className="h-5 w-5" />
              {t('home.databaseConfig')}
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {t('home.authNote')}
            </p>
          </div>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3">Competition Management</h3>
            <p className="text-gray-600">Organize and manage gymnastics competitions with ease.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3">Real-time Scoring</h3>
            <p className="text-gray-600">Live scoring and results with instant updates.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3">Club Management</h3>
            <p className="text-gray-600">Manage clubs and participant registrations.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
