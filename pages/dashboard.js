import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '../lib/useAuth'
import ProtectedRoute from '../components/ProtectedRoute'
import { useQuery } from 'react-query'
import axios from 'axios'
import Link from 'next/link'

const fetchDashboardData = async () => {
  const response = await axios.get('/api/dashboard')
  return response.data
}

function DashboardContent() {
  const { data: session } = useSession()
  const { user: authUser } = useAuth()
  const currentUser = session?.user || authUser

  const { data, isLoading, error } = useQuery(
    ['dashboard'],
    fetchDashboardData,
    { 
      enabled: !!currentUser,
      retry: 1
    }
  )

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view dashboard.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Error loading dashboard
        </h3>
        <p className="text-red-700 dark:text-red-300">
          {error.response?.data?.message || 'Failed to load dashboard data.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          Welcome back, {currentUser?.username || currentUser?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's an overview of your activity and contributions.
        </p>
      </div>

      {/* Personal Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border dark:border-blue-800/30">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">My Groups</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data?.user_stats?.groupCount || 0}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Groups you're part of
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border dark:border-green-800/30">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">My Contributions</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data?.user_stats?.contributionCount || 0}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Total contributions made
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border dark:border-purple-800/30">
          <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">Admin Rights</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data?.user_stats?.adminGroupCount || 0}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
            Groups where you're admin
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border dark:border-yellow-800/30">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">Activities</h3>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {data?.user_stats?.activityCount || 0}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            Activities you participate in
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          href="/groups" 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Groups</h3>
              <p className="text-gray-600 dark:text-gray-400">View and manage your groups</p>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <p className="text-gray-600 dark:text-gray-400">Latest contributions and updates</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Contributions</h3>
              <p className="text-gray-600 dark:text-gray-400">Track your time and money contributions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Groups */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">My Recent Groups</h2>
          {data?.recent_groups?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_groups.slice(0, 5).map((group) => (
                <div key={group.id} className="border-l-4 border-blue-500 pl-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-r transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{group.description || 'No description'}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{group.memberCount} members</span>
                        <span>{group.activityCount} activities</span>
                        {group.isAdmin && <span className="text-blue-600 dark:text-blue-400 font-medium">Admin</span>}
                      </div>
                    </div>
                    <Link 
                      href={`/groups/${group.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No groups yet. <Link href="/groups" className="text-blue-600 dark:text-blue-400 hover:underline">Create or join a group</Link></p>
          )}
        </div>

        {/* Recent Contributions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">My Recent Contributions</h2>
          {data?.recent_contributions?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_contributions.slice(0, 5).map((contribution) => (
                <div key={contribution.id} className="border-l-4 border-green-500 pl-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-r transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{contribution.activity}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{contribution.group}</p>
                      {contribution.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">"{contribution.description}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {contribution.contributionType === 'money' 
                          ? `${contribution.currency} ${contribution.amount}`
                          : `${contribution.amount} min`
                        }
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(contribution.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No contributions yet. Join a group and start contributing!</p>
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