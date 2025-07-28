import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { signIn, getSession } from 'next-auth/react'
import { useAuth } from '../lib/useAuth'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { callbackUrl, error } = router.query

  useEffect(() => {
    if (error) {
      if (error === 'EmailNotVerified') {
        toast.error('Please verify your email before logging in')
      } else {
        toast.error('Authentication error occurred')
      }
    }
  }, [error])

  const handleCredentialLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isAdminLogin) {
        // Use legacy JWT login for admin
        await login(formData.username, formData.password, true)
        toast.success('Admin login successful!')
        router.push('/admin')
      } else {
        // Use NextAuth for regular users
        const result = await signIn('credentials', {
          username: formData.username,
          password: formData.password,
          redirect: false,
        })

        if (result?.error) {
          if (result.error.includes('verify your email')) {
            toast.error('Please verify your email before logging in')
          } else {
            toast.error('Invalid credentials')
          }
        } else if (result?.ok) {
          toast.success('Login successful!')
          router.push(callbackUrl || '/dashboard')
        }
      }
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    // Only show Google login if configured
    if (!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED) {
      toast.error('Google login is not configured')
      return
    }

    setGoogleLoading(true)
    try {
      await signIn('google', {
        callbackUrl: callbackUrl || '/dashboard'
      })
    } catch (error) {
      toast.error('Google login failed')
      setGoogleLoading(false)
    }
  }

  const fillDemoCredentials = (type) => {
    if (type === 'admin') {
      setFormData({ username: 'admin', password: 'admin123' })
      setIsAdminLogin(true)
    } else {
      setFormData({ username: 'john_doe', password: 'password123' })
      setIsAdminLogin(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isAdminLogin ? 'Admin Login' : 'User Login'}
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Demo Credentials:</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className="block w-full text-left text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            >
              👤 <strong>Admin:</strong> admin / admin123
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('user')}
              className="block w-full text-left text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            >
              👤 <strong>User:</strong> john_doe / password123
            </button>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleCredentialLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="admin-login"
              name="admin-login"
              type="checkbox"
              checked={isAdminLogin}
              onChange={(e) => setIsAdminLogin(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
            <label htmlFor="admin-login" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Login as admin
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}