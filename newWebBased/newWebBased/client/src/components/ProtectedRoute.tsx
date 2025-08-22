import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  
  // Authentication is disabled - always allow access
  console.log('ProtectedRoute: Authentication disabled, allowing access. isAuthenticated:', isAuthenticated)
  
  return <>{children}</>
}

export default ProtectedRoute
