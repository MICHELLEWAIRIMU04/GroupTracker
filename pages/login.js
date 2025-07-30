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
      // Use NextAuth for all users (no more admin/regular distinction)
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
    } else {
      setFormData({ username: 'john_doe', password: 'password123' })
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
            Access your groups and activities
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Demo Credentials:</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className="block w-full text-left text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              👤 <strong>Admin User:</strong> admin / admin123
              <div className="text-xs text-blue-600 dark:text-blue-300 ml-4">Can create groups and manage members</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('user')}
              className="block w-full text-left text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              👤 <strong>Regular User:</strong> john_doe / password123
              <div className="text-xs text-blue-600 dark:text-blue-300 ml-4">Member of groups, can contribute</div>
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

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {/* Google Sign In Button - Only show if configured */}
          {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED && (
            <div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="mt-3 w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {googleLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    Signing in with Google...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </div>
                )}
              </button>
            </div>
          )}

          <div className="text-center">
            <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>

        {/* Information Note */}
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How it works:</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Join groups as a regular member</li>
            <li>• Group creators become admins automatically</li>
            <li>• Admins can promote members and manage contributions</li>
            <li>• All users see the same dashboard with their personal stats</li>
          </ul>
        </div>
      </div>
    </div>
  )
}