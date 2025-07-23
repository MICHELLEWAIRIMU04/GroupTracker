import { useState, useEffect } from 'react'
import { useAuth } from '../lib/useAuth'
import ProtectedRoute from '../components/ProtectedRoute'
import { useQuery } from 'react-query'
import axios from 'axios'

const fetchDashboardData = async (token) => {
  const response = await axios.get('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function DashboardContent() {
  const { user, token } = useAuth()
  const { data, isLoading, error } = useQuery(
    ['dashboard', token],
    () => fetchDashboardData(token),
    { enabled: !!token }
  )

  if (isLoading) return <div>Loading dashboard...</div>
  if (error) return <div>Error loading dashboard data</div>

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.username}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Recent Activities</h3>
          <p className="text-2xl font-bold text-blue-600">{data?.recent_activities?.length || 0}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Recent Contributions</h3>
          <p className="text-2xl font-bold text-green-600">{data?.recent_contributions?.length || 0}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Total Members</h3>
          <p className="text-2xl font-bold text-purple-600">{data?.member_stats?.length || 0}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Active Groups</h3>
          <p className="text-2xl font-bold text-yellow-600">{data?.activity_stats?.length || 0}</p>
        </div>
      </div>

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
          <h2 className="text-xl font-bold mb-4">Recent Contributions</h2>
          {data?.recent_contributions?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_contributions.slice(0, 5).map((contribution) => (
                <div key={contribution.id} className="border-l-4 border-green-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{contribution.user}</h3>
                      <p className="text-sm text-gray-600">{contribution.activity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {contribution.contribution_type === 'money' 
                          ? `${contribution.currency} ${contribution.amount}`
                          : `${contribution.amount} min`
                        }
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(contribution.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent contributions</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}