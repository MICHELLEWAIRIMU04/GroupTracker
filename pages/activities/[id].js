import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

const fetchActivity = async (token, activityId) => {
  const response = await axios.get(`/api/groups/1/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const createContribution = async ({ token, contributionData }) => {
  const response = await axios.post('/api/contributions', contributionData, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function ActivityDetailsContent() {
  const { token, user } = useAuth()
  const router = useRouter()
  const { id: activityId } = router.query
  const queryClient = useQueryClient()
  const [showContributionForm, setShowContributionForm] = useState(false)
  const [contributionForm, setContributionForm] = useState({
    contributionType: 'money',
    amount: '',
    currency: 'USD',
    description: ''
  })

  const { data: activity, isLoading } = useQuery(
    ['activity', activityId, token],
    () => fetchActivity(token, activityId),
    { enabled: !!token && !!activityId }
  )

  const createContributionMutation = useMutation(createContribution, {
    onSuccess: () => {
      queryClient.invalidateQueries(['activity', activityId])
      setShowContributionForm(false)
      setContributionForm({
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

  const handleCreateContribution = (e) => {
    e.preventDefault()
    createContributionMutation.mutate({
      token,
      contributionData: {
        ...contributionForm,
        userId: user.id,
        activityId: parseInt(activityId),
        amount: parseFloat(contributionForm.amount)
      }
    })
  }

  if (isLoading) return <div>Loading activity details...</div>

  return (
    <div className="space-y-6">
      {/* Activity Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{activity?.name}</h1>
            <p className="text-gray-600 mb-4">{activity?.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-2xl font-bold text-blue-600">{activity?.contributorCount || 0}</div>
                <div className="text-sm text-gray-600">Contributors</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-2xl font-bold text-green-600">{activity?.contributionCounts?.total || 0}</div>
                <div className="text-sm text-gray-600">Total Contributions</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-2xl font-bold text-purple-600">{activity?.contributionCounts?.money || 0}</div>
                <div className="text-sm text-gray-600">Money Contributions</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="text-2xl font-bold text-yellow-600">{activity?.contributionCounts?.time || 0}</div>
                <div className="text-sm text-gray-600">Time Contributions</div>
              </div>
            </div>
          </div>
          {user?.isAdmin && (
            <button
              onClick={() => setShowContributionForm(!showContributionForm)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Contribution
            </button>
          )}
        </div>
      </div>

      {/* Add Contribution Form */}
      {showContributionForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Add Contribution</h2>
          <form onSubmit={handleCreateContribution} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contribution Type</label>
              <select
                value={contributionForm.contributionType}
                onChange={(e) => setContributionForm({...contributionForm, contributionType: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="money">Money</option>
                <option value="time">Time (minutes)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount {contributionForm.contributionType === 'time' ? '(minutes)' : ''}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={contributionForm.amount}
                onChange={(e) => setContributionForm({...contributionForm, amount: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {contributionForm.contributionType === 'money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={contributionForm.currency}
                  onChange={(e) => setContributionForm({...contributionForm, currency: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KES">KES</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={contributionForm.description}
                onChange={(e) => setContributionForm({...contributionForm, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={createContributionMutation.isLoading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {createContributionMutation.isLoading ? 'Adding...' : 'Add Contribution'}
              </button>
              <button
                type="button"
                onClick={() => setShowContributionForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contributions List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Contributions</h2>
        {activity?.contributions?.length > 0 ? (
          <div className="space-y-4">
            {activity.contributions.map((contribution) => (
              <div key={contribution.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{contribution.user}</h4>
                    <p className="text-sm text-gray-600">{contribution.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(contribution.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {contribution.contribution_type === 'money' 
                        ? `${contribution.currency} ${contribution.amount}`
                        : `${contribution.amount} min`
                      }
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {contribution.contribution_type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No contributions yet.</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Money Summary */}
        {activity?.totals?.money && Object.keys(activity.totals.money).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Money Contributions</h3>
            <div className="space-y-2">
              {Object.entries(activity.totals.money).map(([currency, amount]) => (
                <div key={currency} className="flex justify-between">
                  <span className="text-gray-600">{currency}:</span>
                  <span className="font-bold">{amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Summary */}
        {activity?.totals?.time?.minutes > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Time Contributions</h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {activity.totals.time.formatted}
              </div>
              <div className="text-gray-600">
                Total time contributed
              </div>
            </div>
          </div>
        )}
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