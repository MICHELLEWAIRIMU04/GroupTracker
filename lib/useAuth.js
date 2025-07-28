import { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { useRouter } from 'next/router'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Set up axios defaults
  useEffect(() => {
    // Set default axios configuration
    axios.defaults.withCredentials = true
    
    // Add request interceptor to include JWT token if available
    const requestInterceptor = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Add response interceptor for error handling
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && !session) {
          // Only redirect to login if not using NextAuth
          logout()
          router.push('/login')
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.request.eject(requestInterceptor)
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [token, session, router])

  // Handle NextAuth session
  useEffect(() => {
    if (status === 'loading') return

    if (session?.user) {
      // User is logged in via NextAuth
      setUser({
        id: session.user.id,
        username: session.user.username || session.user.name,
        email: session.user.email,
        isAdmin: session.user.isAdmin || false,
        image: session.user.image
      })
      setLoading(false)
    } else {
      // Check for legacy JWT token in localStorage
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setToken(storedToken)
          setUser(userData)
          
          // Set cookie for middleware
          document.cookie = `token=${storedToken}; path=/; max-age=86400`
        } catch (error) {
          console.error('Error parsing stored user data:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }
  }, [session, status])

  const login = async (username, password, isAdmin = false) => {
    try {
      const endpoint = isAdmin ? '/api/auth/admin-login' : '/api/auth/login'
      const response = await axios.post(endpoint, {
        username,
        password
      })
      
      const { token: newToken, user: newUser } = response.data
      
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(newUser))
      
      // Set cookie for middleware
      document.cookie = `token=${newToken}; path=/; max-age=86400`
      
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const register = async (username, email, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password
      })
      
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }

  const value = {
    user: session?.user || user,
    token,
    loading: status === 'loading' || loading,
    login,
    register,
    logout,
    session
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}