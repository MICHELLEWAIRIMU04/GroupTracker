import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import AdminRoute from '../../components/AdminRoute'
import Link from 'next/link'
import { useQuery } from 'react-query'
import axios from 'axios'

const fetchDashboardData = async (token) => {
  const response = await axios.get('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function AdminDashboardContent() {
  const { token } = useAuth()
  const { data, isLoading } = useQuery(
    ['admin-dashboard', token],
    () => fetchDashboardData(token),
    { enabled: !!token }
  )

  if (isLoading) return <div>Loading admin dashboard...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, contributions, and system settings.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{data?.member_stats?.length || 0}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Total Contributions</h3>
          <p className="text-3xl font-bold text-green-600">{data?.recent_contributions?.length || 0}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Active Groups</h3>
          <p className="text-3xl font-bold text-purple-600">{data?.activity_stats?.length || 0}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Activities</h3>
          <p className="text-3xl font-bold text-yellow-600">{data?.recent_activities?.length || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/members" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Manage Members</h3>
              <p className="text-gray-600">Add, edit, or remove users</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/contributions" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Manage Contributions</h3>
              <p className="text-gray-600">View and manage all contributions</p>
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">System Settings</h3>
              <p className="text-gray-600">Configure system preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Recent Activities</h2>
          {data?.recent_activities?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium">{activity.name}</h3>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent activities</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Top Contributors</h2>
          {data?.member_stats?.length > 0 ? (
            <div className="space-y-3">
              {data.member_stats
                .sort((a, b) => b.totalContribution - a.totalContribution)
                .slice(0, 5)
                .map((member) => (
                  <div key={member.id} className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{member.username}</h4>
                      <p className="text-sm text-gray-600">{member.contributionCount} contributions</p>
                    </div>
                    <div className="font-bold">
                      {member.totalContribution}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500">No contributors yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <AdminDashboardContent />
      </AdminRoute>
    </ProtectedRoute>
  )
}