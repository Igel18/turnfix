import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to TurnFix
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Modern gymnastics competition management system with real-time scoring, 
            participant tracking, and comprehensive analytics.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/dashboard" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Enter Dashboard
            </Link>
            <Link 
              to="/events" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition"
            >
              View Events
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              User authentication temporarily disabled - Full access available
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
