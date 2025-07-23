import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetchGroup = async (token, groupId) => {
  const response = await axios.get(`/api/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const fetchGroupActivities = async (token, groupId) => {
  const response = await axios.get(`/api/groups/${groupId}/activities`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const createActivity = async ({ token, groupId, activityData }) => {
  const response = await axios.post(`/api/groups/${groupId}/activities`, activityData, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function GroupDetailsContent() {
  const { token, user } = useAuth()
  const router = useRouter()
  const { id: groupId } = router.query
  const queryClient = useQueryClient()
  const [showCreateActivity, setShowCreateActivity] = useState(false)
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: ''
  })

  const { data: group, isLoading: groupLoading } = useQuery(
    ['group', groupId, token],
    () => fetchGroup(token, groupId),
    { enabled: !!token && !!groupId }
  )

  const { data: activities, isLoading: activitiesLoading } = useQuery(
    ['group-activities', groupId, token],
    () => fetchGroupActivities(token, groupId),
    { enabled: !!token && !!groupId }
  )

  const createActivityMutation = useMutation(createActivity, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group-activities', groupId])
      setShowCreateActivity(false)
      setActivityForm({ name: '', description: '' })
      toast.success('Activity created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create activity')
    }
  })

  const handleCreateActivity = (e) => {
    e.preventDefault()
    createActivityMutation.mutate({ 
      token, 
      groupId, 
      activityData: activityForm 
    })
  }

  if (groupLoading || activitiesLoading) return <div>Loading group details...</div>

  const isAdmin = group?.members?.find(member => member.id === user?.id)?.isAdmin || false

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{group?.name}</h1>
            <p className="text-gray-600 mb-4">{group?.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Owner: {group?.owner}</span>
              <span>{group?.members?.length} members</span>
              <span>{activities?.length || 0} activities</span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateActivity(!showCreateActivity)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              New Activity
            </button>
          )}
        </div>
      </div>

      {/* Create Activity Form */}
      {showCreateActivity && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Create New Activity</h2>
          <form onSubmit={handleCreateActivity} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Activity Name</label>
              <input
                type="text"
                required
                value={activityForm.name}
                onChange={(e) => setActivityForm({...activityForm, name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={activityForm.description}
                onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={createActivityMutation.isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {createActivityMutation.isLoading ? 'Creating...' : 'Create Activity'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateActivity(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activities Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities?.map((activity) => (
            <div key={activity.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2">{activity.name}</h3>
              <p className="text-gray-600 mb-4">{activity.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Contributors:</span>
                  <span className="font-medium">{activity.contributorCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Contributions:</span>
                  <span className="font-medium">{activity.contributionCounts.total}</span>
                </div>
                {Object.keys(activity.totals.money).length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Money: </span>
                    {Object.entries(activity.totals.money).map(([currency, amount]) => (
                      <span key={currency} className="font-medium mr-2">
                        {currency} {amount}
                      </span>
                    ))}
                  </div>
                )}
                {activity.totals.time.minutes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time:</span>
                    <span className="font-medium">{activity.totals.time.formatted}</span>
                  </div>
                )}
              </div>
              
              <Link 
                href={`/activities/${activity.id}`}
                className="block w-full bg-blue-500 text-white text-center px-4 py-2 rounded hover:bg-blue-600"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>

        {activities?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No activities yet.</p>
            {isAdmin && (
              <p className="text-gray-400">Create the first activity to get started!</p>
            )}
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {group?.members?.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <h4 className="font-medium">{member.username}</h4>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              {member.isAdmin && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GroupDetails() {
  return (
    <ProtectedRoute>
      <GroupDetailsContent />
    </ProtectedRoute>
  )
}