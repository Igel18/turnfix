import { useAuth } from '@/contexts/AuthContext'

export function AuthTest() {
  const { user, isAuthenticated, login, logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Auth Context Test
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Testing if AuthProvider is working
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="space-y-4">
            <p>User: {user ? user.username || user.email : 'None'}</p>
            <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
            
            <button
              onClick={() => login('test-token', { id: 1, username: 'test', email: 'test@example.com' })}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Test Login
            </button>
            
            <button
              onClick={logout}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Test Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthTest
