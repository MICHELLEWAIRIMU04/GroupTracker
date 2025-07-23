import { useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetchGroups = async (token) => {
  const response = await axios.get('/api/groups', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const createGroup = async ({ token, groupData }) => {
  const response = await axios.post('/api/groups', groupData, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function GroupsContent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const { data: groups, isLoading } = useQuery(
    ['groups', token],
    () => fetchGroups(token),
    { enabled: !!token }
  )

  const createGroupMutation = useMutation(createGroup, {
    onSuccess: () => {
      queryClient.invalidateQueries(['groups'])
      setShowCreateForm(false)
      setFormData({ name: '', description: '' })
      toast.success('Group created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create group')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createGroupMutation.mutate({ token, groupData: formData })
  }

  if (isLoading) return <div>Loading groups...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Group
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Create New Group</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
                disabled={createGroupMutation.isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {createGroupMutation.isLoading ? 'Creating...' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups?.map((group) => (
          <div key={group.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold mb-2">{group.name}</h3>
            <p className="text-gray-600 mb-4">{group.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>{group.memberCount} members</span>
              <span>{group.activityCount} activities</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Owner: {group.owner}
              </span>
              <Link 
                href={`/groups/${group.id}`}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
              >
                View Group
              </Link>
            </div>
          </div>
        ))}
      </div>

      {groups?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">You haven't joined any groups yet.</p>
          <p className="text-gray-400">Create a new group or ask to be added to an existing one.</p>
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