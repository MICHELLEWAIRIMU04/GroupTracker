import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import MembersList from '../../components/MembersList'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetchGroup = async (groupId) => {
  const response = await axios.get(`/api/groups/${groupId}`)
  return response.data
}

const createActivity = async ({ groupId, activityData }) => {
  const response = await axios.post(`/api/groups/${groupId}/activities`, activityData)
  return response.data
}

const deleteGroup = async (groupId) => {
  const response = await axios.delete(`/api/groups/${groupId}`)
  return response.data
}

function GroupDetailsContent() {
  const { data: session } = useSession()
  const { user: authUser } = useAuth()
  const router = useRouter()
  const { id: groupId } = router.query
  const queryClient = useQueryClient()
  const [showCreateActivity, setShowCreateActivity] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: ''
  })

  const currentUser = session?.user || authUser

  const { data: group, isLoading, error } = useQuery(
    ['group', groupId],
    () => fetchGroup(groupId),
    { 
      enabled: !!groupId && !!currentUser,
      retry: 1
    }
  )

  const createActivityMutation = useMutation(createActivity, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group', groupId])
      setShowCreateActivity(false)
      setActivityForm({ name: '', description: '' })
      toast.success('Activity created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create activity')
    }
  })

  const deleteGroupMutation = useMutation(deleteGroup, {
    onSuccess: () => {
      toast.success('Group deleted successfully!')
      router.push('/groups')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete group')
    }
  })

  const handleCreateActivity = (e) => {
    e.preventDefault()
    createActivityMutation.mutate({ 
      groupId, 
      activityData: activityForm 
    })
  }

  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate(groupId)
    setShowDeleteConfirm(false)
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view group details.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading group details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-6">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
          Error loading group
        </h3>
        <p className="text-red-700 dark:text-red-300">
          {error.response?.data?.message || 'Failed to load group details.'}
        </p>
        <button
          onClick={() => router.push('/groups')}
          className="mt-4 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-4 py-2 rounded hover:bg-red-200 dark:hover:bg-red-900/60"
        >
          Back to Groups
        </button>
      </div>
    )
  }

  const isAdmin = group?.userIsAdmin || false
  const isOwner = group?.userIsOwner || false

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{group?.name}</h1>
              {isAdmin && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                  Admin
                </span>
              )}
              {isOwner && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded">
                  Owner
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{group?.description || 'No description provided'}</p>
            <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <span>Owner: <span className="font-medium">{group?.owner}</span></span>
              <span>{group?.members?.length || 0} members</span>
              <span>{group?.activities?.length || 0} activities</span>
              <span>Created: {new Date(group?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={() => setShowCreateActivity(!showCreateActivity)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                New Activity
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Group</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to delete <strong>"{group?.name}"</strong>? This will permanently delete:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• All {group?.activities?.length || 0} activities in this group</li>
                  <li>• All contributions made to these activities</li>
                  <li>• All member associations with this group</li>
                  <li>• The group itself</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleteGroupMutation.isLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleteGroupMutation.isLoading ? 'Deleting...' : 'Yes, Delete Group'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Activity Form */}
      {showCreateActivity && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New Activity</h2>
          <form onSubmit={handleCreateActivity} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Name</label>
              <input
                type="text"
                required
                value={activityForm.name}
                onChange={(e) => setActivityForm({...activityForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter activity name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={activityForm.description}
                onChange={(e) => setActivityForm({...activityForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Enter activity description (optional)"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={createActivityMutation.isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createActivityMutation.isLoading ? 'Creating...' : 'Create Activity'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateActivity(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Grid - Activities (2/3) + Members (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activities Section - Takes 2/3 of the width */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Activities</h2>
            
            {group?.activities?.length > 0 ? (
              <div className="space-y-4">
                {group.activities.map((activity) => (
                  <div key={activity.id} className="border dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{activity.name}</h3>
                        {activity.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{activity.description}</p>
                        )}
                      </div>
                      <Link 
                        href={`/activities/${activity.id}`}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        <div className="font-bold text-blue-600 dark:text-blue-400">{activity.contributorCount}</div>
                        <div className="text-gray-600 dark:text-gray-400">Contributors</div>
                      </div>
                      <div className="text-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <div className="font-bold text-green-600 dark:text-green-400">{activity.contributionCounts.total}</div>
                        <div className="text-gray-600 dark:text-gray-400">Contributions</div>
                      </div>
                      <div className="text-center bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                        <div className="font-bold text-purple-600 dark:text-purple-400">
                          {Object.keys(activity.totals.money).length > 0 
                            ? Object.entries(activity.totals.money).map(([currency, amount]) => 
                                `${currency} ${amount.toFixed(2)}`
                              ).join(', ')
                            : '0'
                          }
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Money</div>
                      </div>
                      <div className="text-center bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                        <div className="font-bold text-yellow-600 dark:text-yellow-400">{activity.totals.time.formatted}</div>
                        <div className="text-gray-600 dark:text-gray-400">Time</div>
                      </div>
                    </div>
                    
                    {/* Recent Contributions with Former Member Status */}
                    {activity.recentContributions?.length > 0 && (
                      <div className="mt-3 text-sm">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Recent contributions:</h4>
                        <div className="space-y-1">
                          {activity.recentContributions.map((contrib) => (
                            <div key={contrib.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{contrib.user}</span>
                                {contrib.isFormerMember && (
                                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-xs">
                                    no longer member
                                  </span>
                                )}
                              </div>
                              <span>
                                {contrib.type === 'money' 
                                  ? `${contrib.currency} ${contrib.amount}`
                                  : `${contrib.amount} min`
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Created: {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activities yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {isAdmin 
                    ? 'Create the first activity to get started!' 
                    : 'No activities have been created for this group yet.'
                  }
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateActivity(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Create First Activity
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Members Section - Takes 1/3 of the width */}
        <div className="lg:col-span-1">
          <MembersList 
            group={group}
            members={group?.members || []}
            isAdmin={isAdmin}
            isOwner={isOwner}
          />
        </div>
      </div>

      {/* Back to Groups */}
      <div className="text-center">
        <Link
          href="/groups"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Groups
        </Link>
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