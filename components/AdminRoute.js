import { useAuth } from '../lib/useAuth'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !user.isAdmin) {
    return null
  }

  return children
}