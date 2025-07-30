import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { signIn, useSession } from 'next-auth/react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function InviteAcceptance() {
  const router = useRouter()
  const { token } = router.query
  const { data: session, status } = useSession()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (token) {
      fetchInvite()
    }
  }, [token])

  const fetchInvite = async () => {
    try {
      const response = await axios.get(`/api/invites/${token}`)
      setInvite(response.data)
      setLoading(false)
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid or expired invitation')
      setLoading(false)
    }
  }

  const acceptInvite = async () => {
    if (!session?.user) {
      toast.error('Please log in first to accept the invitation')
      return
    }

    setAccepting(true)
    try {
      await axios.post(`/api/invites/${token}/accept`)
      toast.success('Invitation accepted! Welcome to the group!')
      router.push(`/groups/${invite.groupId}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setAccepting(true)
    try {
      // Register the user
      await axios.post('/api/auth/register', {
        username: registerForm.username,
        email: invite.email,
        password: registerForm.password
      })

      // Sign them in
      const result = await signIn('credentials', {
        username: registerForm.username,
        password: registerForm.password,
        redirect: false,
      })

      if (result?.ok) {
        // Accept the invitation
        await axios.post(`/api/invites/${token}/accept`)
        toast.success('Account created and invitation accepted! Welcome!')
        router.push(`/groups/${invite.groupId}`)
      } else {
        toast.error('Registration successful but login failed. Please log in manually.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create account')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Loading invitation...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Invitation</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const isExpired = new Date() > new Date(invite.expiresAt)

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invitation Expired</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This invitation to join "{invite.groupName}" has expired. Please contact {invite.inviterName} for a new invitation.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // Check if user exists but isn't logged in
  const needsLogin = invite.userExists && !session?.user
  const needsRegister = !invite.userExists

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">You're Invited!</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {invite.inviterName} has invited you to join
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              "{invite.groupName}"
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Role: <span className="font-medium">{invite.isAdmin ? 'Admin' : 'Member'}</span></p>
              <p>Invited by: <span className="font-medium">{invite.inviterName}</span></p>
              <p>Expires: <span className="font-medium">{new Date(invite.expiresAt).toLocaleDateString()}</span></p>
            </div>
          </div>
        </div>

        {session?.user ? (
          // User is logged in, can accept directly
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Logged in as <strong>{session.user.username || session.user.email}</strong>
            </p>
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        ) : needsLogin ? (
          // User exists but needs to log in
          <div className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You already have an account. Please log in to accept this invitation.
            </p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
              className="w-full inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center transition-colors"
            >
              Log In to Accept
            </Link>
          </div>
        ) : (
          // User needs to register
          <div className="space-y-4">
            {showRegisterForm ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                  <input
                    type="text"
                    required
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Choose a username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Choose a password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Confirm your password"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={accepting}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {accepting ? 'Creating Account...' : 'Create Account & Join'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have an account yet. Create one to accept the invitation.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email: <strong>{invite.email}</strong>
                </p>
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Create Account
                </button>
                <div className="text-center">
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    Already have an account? Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}