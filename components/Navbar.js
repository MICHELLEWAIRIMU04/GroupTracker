import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/useAuth'

export default function Navbar() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!user) return null

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              Activity Tracker
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/groups" className="text-gray-700 hover:text-blue-600">
                Groups
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-gray-700 hover:text-blue-600">
                  Admin
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user.username}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}