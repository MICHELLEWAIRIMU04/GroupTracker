import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/useAuth'

const fetchMembers = async (token) => {
  const response = await axios.get('/api/members', {
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

export default function ContributionForm({ activityId, onClose, onSuccess }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    userId: '',
    contributionType: 'money',
    amount: '',
    currency: 'USD',
    description: ''
  })

  const { data: members } = useQuery(
    ['members', token],
    () => fetchMembers(token),
    { enabled: !!token && user?.isAdmin }
  )

  const createContributionMutation = useMutation(createContribution, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['contributions'])
      queryClient.invalidateQueries(['activity'])
      toast.success('Contribution created successfully!')
      onSuccess?.(data)
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create contribution')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createContributionMutation.mutate({
      token,
      contributionData: {
        ...formData,
        activityId: parseInt(activityId),
        userId: parseInt(formData.userId),
        amount: parseFloat(formData.amount)
      }
    })
  }

  if (!user?.isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800">Only administrators can add contributions.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Member</label>
        <select
          required
          value={formData.userId}
          onChange={(e) => setFormData({...formData, userId: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a member</option>
          {members?.map((member) => (
            <option key={member.id} value={member.id}>
              {member.username} ({member.email})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Contribution Type</label>
        <select
          value={formData.contributionType}
          onChange={(e) => setFormData({...formData, contributionType: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="money">Money</option>
          <option value="time">Time (minutes)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Amount {formData.contributionType === 'time' ? '(minutes)' : ''}
        </label>
        <input
          type="number"
          step="0.01"
          required
          value={formData.amount}
          onChange={(e) => setFormData({...formData, amount: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {formData.contributionType === 'money' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({...formData, currency: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
        />
      </div>

      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={createContributionMutation.isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {createContributionMutation.isLoading ? 'Adding...' : 'Add Contribution'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}