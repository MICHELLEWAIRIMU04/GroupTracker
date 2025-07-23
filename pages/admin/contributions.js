import { useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import AdminRoute from '../../components/AdminRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

const fetchContributions = async (token) => {
  const response = await axios.get('/api/contributions', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const deleteContribution = async ({ token, contributionId }) => {
  const response = await axios.delete(`/api/contributions/${contributionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function ContributionsManagementContent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data: contributions, isLoading } = useQuery(
    ['contributions', token],
    () => fetchContributions(token),
    { enabled: !!token }
  )

  const deleteContributionMutation = useMutation(deleteContribution, {
    onSuccess: () => {
      queryClient.invalidateQueries(['contributions'])
      toast.success('Contribution deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete contribution')
    }
  })

  const handleDelete = (contributionId) => {
    if (confirm('Are you sure you want to delete this contribution?')) {
      deleteContributionMutation.mutate({ token, contributionId })
    }
  }

  const filteredContributions = contributions?.filter(contrib => {
    if (filter === 'all') return true
    return contrib.contributionType === filter
  }) || []

  if (isLoading) return <div>Loading contributions...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contributions Management</h1>
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="money">Money</option>
            <option value="time">Time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Total Contributions</h3>
          <p className="text-3xl font-bold text-blue-600">{contributions?.length || 0}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Money Contributions</h3>
          <p className="text-3xl font-bold text-green-600">
            {contributions?.filter(c => c.contributionType === 'money').length || 0}
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Time Contributions</h3>
          <p className="text-3xl font-bold text-purple-600">
            {contributions?.filter(c => c.contributionType === 'time').length || 0}
          </p>
        </div>
      </div>

      {/* Contributions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contributor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContributions.map((contribution) => (
              <tr key={contribution.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {contribution.user}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{contribution.activity}</div>
                  {contribution.description && (
                    <div className="text-sm text-gray-500">{contribution.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    contribution.contributionType === 'money' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {contribution.contributionType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {contribution.contributionType === 'money' 
                    ? `${contribution.currency} ${contribution.amount}`
                    : `${contribution.amount} min`
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(contribution.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDelete(contribution.id)}
                    disabled={deleteContributionMutation.isLoading}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredContributions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No contributions found.</p>
        </div>
      )}
    </div>
  )
}

export default function ContributionsManagement() {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <ContributionsManagementContent />
      </AdminRoute>
    </ProtectedRoute>
  )
}