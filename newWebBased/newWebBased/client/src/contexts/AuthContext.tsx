import { createContext, useContext, useEffect, ReactNode } from 'react'

interface User {
  id: number
  username: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  login: (token: string, userData: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // AUTHENTICATION DISABLED - Always authenticated with dummy user
  const user: User = {
    id: 1,
    username: 'guest',
    firstName: 'Guest',
    lastName: 'User',
    email: 'guest@turnfix.local',
    role: 'admin'
  }
  const isAuthenticated = true // Always authenticated

  useEffect(() => {
    // Authentication is disabled - no token checking
    console.log('Authentication is disabled - running in guest mode')
  }, [])

  const login = (_token: string, _userData: User) => {
    // Authentication disabled - login function does nothing
    console.log('Login attempted, but authentication is disabled')
    // Keep the user as guest
  }

  const logout = () => {
    // Authentication disabled - logout function does nothing  
    console.log('Logout attempted, but authentication is disabled')
    // Keep the user as guest
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
