import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

const createContribution = async (contributionData) => {
  const response = await axios.post('/api/contributions', contributionData)
  return response.data
}

const updateContribution = async ({ id, contributionData }) => {
  const response = await axios.put(`/api/contributions/${id}`, contributionData)
  return response.data
}

export default function ContributionForm({ 
  activityId, 
  groupMembers = [], 
  onClose, 
  onSuccess,
  className = "",
  editingContribution = null // Pass this when editing
}) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    contributorId: '',
    contributionType: 'money',
    amount: '',
    currency: 'USD',
    description: ''
  })

  // Initialize form with editing data
  useEffect(() => {
    if (editingContribution) {
      setFormData({
        contributorId: editingContribution.userId.toString(),
        contributionType: editingContribution.contributionType,
        amount: editingContribution.amount.toString(),
        currency: editingContribution.currency || 'USD',
        description: editingContribution.description || ''
      })
    }
  }, [editingContribution])

  const createContributionMutation = useMutation(createContribution, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['activity'])
      queryClient.invalidateQueries(['contributions'])
      toast.success('Contribution added successfully!')
      onSuccess?.(data)
      onClose?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add contribution')
    }
  })

  const updateContributionMutation = useMutation(updateContribution, {
    onSuccess: (data) => {
      queryClient.invalidateQueries(['activity'])
      queryClient.invalidateQueries(['contributions'])
      toast.success('Contribution updated successfully!')
      onSuccess?.(data)
      onClose?.()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update contribution')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const contributionData = {
      ...formData,
      activityId: parseInt(activityId),
      amount: parseFloat(formData.amount)
    }

    if (editingContribution) {
      // Remove fields that shouldn't be updated
      delete contributionData.contributorId
      delete contributionData.activityId
      
      updateContributionMutation.mutate({
        id: editingContribution.id,
        contributionData
      })
    } else {
      createContributionMutation.mutate(contributionData)
    }
  }

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' }
  ]

  const isEditing = !!editingContribution
  const isLoading = isEditing ? updateContributionMutation.isLoading : createContributionMutation.isLoading

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Contribution' : 'Add Contribution'}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contributor Selection - Only show when creating new contribution */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contributor *
              </label>
              <select
                required
                value={formData.contributorId}
                onChange={(e) => setFormData({...formData, contributorId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a group member</option>
                {groupMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username} ({member.email})
                    {member.isAdmin && ' - Admin'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contribution Type - Disable when editing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contribution Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                formData.contributionType === 'money'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="contributionType"
                  value="money"
                  checked={formData.contributionType === 'money'}
                  onChange={(e) => !isEditing && setFormData({...formData, contributionType: e.target.value})}
                  disabled={isEditing}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Money</span>
                </div>
              </label>
              <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                formData.contributionType === 'time'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="contributionType"
                  value="time"
                  checked={formData.contributionType === 'time'}
                  onChange={(e) => !isEditing && setFormData({...formData, contributionType: e.target.value})}
                  disabled={isEditing}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Time</span>
                </div>
              </label>
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount * {formData.contributionType === 'time' && '(minutes)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={formData.contributionType === 'time' ? 'Enter minutes' : 'Enter amount'}
              />
            </div>

            {formData.contributionType === 'money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol}) - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Add a note about this contribution..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Adding...'}
                </div>
              ) : (
                isEditing ? 'Update Contribution' : 'Add Contribution'
              )}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}