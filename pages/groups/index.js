import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetchGroups = async () => {
  // Let axios handle the authentication automatically
  const response = await axios.get('/api/groups')
  return response.data
}

const createGroup = async (groupData) => {
  // Let axios handle the authentication automatically
  const response = await axios.post('/api/groups', groupData)
  return response.data
}

function GroupsContent() {
  const { data: session } = useSession()
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  // Use either NextAuth user or legacy auth user
  const currentUser = session?.user || user

  const { data: groups, isLoading, error } = useQuery(
    ['groups'],
    fetchGroups,
    { 
      enabled: !!currentUser,
      retry: 1,
      onError: (error) => {
        console.error('Fetch groups error:', error.response?.data)
      }
    }
  )

  const createGroupMutation = useMutation(createGroup, {
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      setShowCreateForm(false)
      setFormData({ name: '', description: '' })
      toast.success('Group created successfully!')
    },
    onError: (error) => {
      console.error('Create group error:', error.response?.data)
      toast.error(error.response?.data?.message || 'Failed to create group')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Submitting group creation:', formData)
    createGroupMutation.mutate(formData)
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view groups.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading groups...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading groups
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{error.response?.data?.message || 'Failed to load groups. Please try again.'}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => queryClient.invalidateQueries(['groups'])}
                className="bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Groups</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Create Group
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New Group</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter group name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Enter group description (optional)"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={createGroupMutation.isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createGroupMutation.isLoading ? 'Creating...' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups?.map((group) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border dark:border-gray-700">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{group.name}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{group.description || 'No description'}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              <span>{group.memberCount} members</span>
              <span>{group.activityCount} activities</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Owner: {group.owner}
              </span>
              <Link 
                href={`/groups/${group.id}`}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
              >
                View Group
              </Link>
            </div>
          </div>
        ))}
      </div>

      {groups?.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">You haven't joined any groups yet.</p>
          <p className="text-gray-400 dark:text-gray-500">Create a new group or ask to be added to an existing one.</p>
        </div>
      )}
    </div>
  )
}

export default function Groups() {
  return (
    <ProtectedRoute>
      <GroupsContent />
    </ProtectedRoute>
  )
}