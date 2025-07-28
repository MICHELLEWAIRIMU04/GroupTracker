import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetchActivity = async (activityId) => {
  const response = await axios.get(`/api/activities/${activityId}`)
  return response.data
}

const createContribution = async (contributionData) => {
  const response = await axios.post('/api/contributions', contributionData)
  return response.data
}

function ActivityDetailsContent() {
  const { data: session } = useSession()
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id: activityId } = router.query
  const queryClient = useQueryClient()
  const [showContributionForm, setShowContributionForm] = useState(false)
  const [contributionForm, setContributionForm] = useState({
    contributorId: '',
    contributionType: 'money',
    amount: '',
    currency: 'USD',
    description: ''
  })

  const currentUser = session?.user || authUser

  const { data: activity, isLoading, error } = useQuery(
    ['activity', activityId],
    () => fetchActivity(activityId),
    { 
      enabled: !!activityId && !!currentUser,
      retry: 1
    }
  )

  const createContributionMutation = useMutation(createContribution, {
    onSuccess: () => {
      queryClient.invalidateQueries(['activity', activityId])
      setShowContributionForm(false)
      setContributionForm({
        contributorId: '',
        contributionType: 'money',
        amount: '',
        currency: 'USD',
        description: ''
      })
      toast.success('Contribution added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add contribution')
    }
  })

  const handleSubmitContribution = (e) => {
    e.preventDefault()
    createContributionMutation.mutate({
      ...contributionForm,
      activityId: parseInt(activityId),
      amount: parseFloat(contributionForm.amount)
    })
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view activity details.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading activity details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-6">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Error loading activity
        </h3>
        <p className="text-red-700 dark:text-red-300 mb-4">
          {error.response?.data?.message || 'Failed to load activity details.'}
        </p>
        <button
          onClick={() => router.back()}
          className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-4 py-2 rounded hover:bg-red-200 dark:hover:bg-red-900/60"
        >
          Go Back
        </button>
      </div>
    )
  }

  const canAddContributions = activity?.userPermissions?.canAddContributions || false

  return (
    <div className="space-y-8">
      {/* Activity Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{activity?.name}</h1>
              {activity?.userPermissions?.isGroupAdmin && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                  Group Admin
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {activity?.description || 'No description provided'}
            </p>
            <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <span>Group: <Link href={`/groups/${activity?.group?.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{activity?.group?.name}</Link></span>
              <span>Created: {new Date(activity?.createdAt).toLocaleDateString()}</span>
              <span>{activity?.statistics?.contributorCount} contributors</span>
              <span>{activity?.statistics?.contributionCounts?.total} total contributions</span>
            </div>
          </div>
          {canAddContributions && (
            <button
              onClick={() => setShowContributionForm(!showContributionForm)}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
            >
              Add Contribution
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {activity?.statistics?.contributorCount || 0}
          </div>
          <div className="text-blue-800 dark:text-blue-300 font-medium">Contributors</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {activity?.statistics?.contributionCounts?.total || 0}
          </div>
          <div className="text-green-800 dark:text-green-300 font-medium">Total Contributions</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {activity?.statistics?.totals?.money && Object.keys(activity.statistics.totals.money).length > 0
              ? Object.entries(activity.statistics.totals.money).map(([currency, amount]) => 
                  `${currency} ${amount.toFixed(2)}`
                ).join(', ')
              : 'No money contributions'
            }
          </div>
          <div className="text-purple-800 dark:text-purple-300 font-medium">Money Contributed</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg text-center">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {activity?.statistics?.totals?.time?.formatted || '0m'}
          </div>
          <div className="text-yellow-800 dark:text-yellow-300 font-medium">Time Contributed</div>
        </div>
      </div>

      {/* Add Contribution Form */}
      {showContributionForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Contribution</h2>
          <form onSubmit={handleSubmitContribution} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contributor
                </label>
                <select
                  required
                  value={contributionForm.contributorId}
                  onChange={(e) => setContributionForm({...contributionForm, contributorId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a group member</option>
                  {activity?.group?.members?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.username} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contribution Type
                </label>
                <select
                  value={contributionForm.contributionType}
                  onChange={(e) => setContributionForm({...contributionForm, contributionType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="money">Money</option>
                  <option value="time">Time (minutes)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount {contributionForm.contributionType === 'time' ? '(minutes)' : ''}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={contributionForm.amount}
                  onChange={(e) => setContributionForm({...contributionForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={contributionForm.contributionType === 'time' ? 'Enter minutes' : 'Enter amount'}
                />
              </div>

              {contributionForm.contributionType === 'money' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={contributionForm.currency}
                    onChange={(e) => setContributionForm({...contributionForm, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="KES">KES (KSh)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={contributionForm.description}
                onChange={(e) => setContributionForm({...contributionForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows="3"
                placeholder="Add a note about this contribution..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={createContributionMutation.isLoading}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createContributionMutation.isLoading ? 'Adding...' : 'Add Contribution'}
              </button>
              <button
                type="button"
                onClick={() => setShowContributionForm(false)}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contributions List */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Contributions ({activity?.contributions?.length || 0})
        </h2>
        
        {activity?.contributions?.length > 0 ? (
          <div className="space-y-4">
            {activity.contributions.map((contribution) => (
              <div key={contribution.id} className="border dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                          {contribution.user.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{contribution.user}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(contribution.date).toLocaleDateString()} at {new Date(contribution.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    {contribution.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 ml-13">
                        "{contribution.description}"
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {contribution.contributionType === 'money' 
                        ? `${contribution.currency} ${contribution.amount.toFixed(2)}`
                        : `${contribution.amount} min`
                      }
                    </div>
                    <div className={`text-sm font-medium capitalize ${
                      contribution.contributionType === 'money' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {contribution.contributionType} contribution
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No contributions yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {canAddContributions 
                ? 'Be the first to add a contribution to this activity!' 
                : 'No contributions have been made to this activity yet.'
              }
            </p>
            {canAddContributions && (
              <button
                onClick={() => setShowContributionForm(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
              >
                Add First Contribution
              </button>
            )}
          </div>
        )}
      </div>

      {/* Permission Notice */}
      {!canAddContributions && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Only group administrators can add contributions to activities. 
                Contact a group admin to add your contributions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link
          href={`/groups/${activity?.group?.id}`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to {activity?.group?.name}
        </Link>

        <Link
          href="/groups"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
        >
          All Groups →
        </Link>
      </div>
    </div>
  )
}

export default function ActivityDetails() {
  return (
    <ProtectedRoute>
      <ActivityDetailsContent />
    </ProtectedRoute>
  )
}