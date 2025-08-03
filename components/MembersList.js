import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/useAuth'
import { useSession } from 'next-auth/react'

const removeMember = async ({ groupId, userId }) => {
  const response = await axios.delete(`/api/groups/${groupId}/members/${userId}`)
  return response.data
}

const addMember = async ({ groupId, memberData }) => {
  const response = await axios.post(`/api/groups/${groupId}/members`, memberData)
  return response.data
}

const sendInvite = async ({ groupId, inviteData }) => {
  const response = await axios.post(`/api/groups/${groupId}/invites`, inviteData)
  return response.data
}

const fetchPendingInvites = async (groupId) => {
  const response = await axios.get(`/api/groups/${groupId}/invites`)
  return response.data
}

const cancelInvite = async ({ groupId, inviteId }) => {
  const response = await axios.delete(`/api/groups/${groupId}/invites/${inviteId}`)
  return response.data
}

const updateMemberRole = async ({ groupId, userId, isAdmin }) => {
  const response = await axios.put(`/api/groups/${groupId}/members/${userId}`, { isAdmin })
  return response.data
}

export default function MembersList({ group, members, isAdmin, isOwner }) {
  const { data: session } = useSession()
  const { user: authUser } = useAuth()
  const currentUser = session?.user || authUser
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMethod, setAddMethod] = useState('existing') // 'existing' or 'invite'
  const [newMemberForm, setNewMemberForm] = useState({
    email: '',
    is_admin: false
  })

  // Fetch pending invites
  const { data: pendingInvites } = useQuery(
    ['group-invites', group.id],
    () => fetchPendingInvites(group.id),
    { 
      enabled: isAdmin || isOwner,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  )

  const removeMemberMutation = useMutation(removeMember, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group', group.id])
      toast.success('Member removed successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove member')
    }
  })

  const addMemberMutation = useMutation(addMember, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group', group.id])
      setShowAddForm(false)
      setNewMemberForm({ email: '', is_admin: false })
      toast.success('Member added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add member')
    }
  })

  const sendInviteMutation = useMutation(sendInvite, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group-invites', group.id])
      setShowAddForm(false)
      setNewMemberForm({ email: '', is_admin: false })
      toast.success('Invitation sent successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send invitation')
    }
  })

  const cancelInviteMutation = useMutation(cancelInvite, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group-invites', group.id])
      toast.success('Invitation cancelled successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel invitation')
    }
  })

  const updateRoleMutation = useMutation(updateMemberRole, {
    onSuccess: () => {
      queryClient.invalidateQueries(['group', group.id])
      toast.success('Member role updated successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update member role')
    }
  })

  const handleRemoveMember = (userId) => {
    if (confirm('Are you sure you want to remove this member?')) {
      removeMemberMutation.mutate({ groupId: group.id, userId })
    }
  }

  const handleAddMember = (e) => {
    e.preventDefault()
    
    if (addMethod === 'existing') {
      // Add existing user
      addMemberMutation.mutate({
        groupId: group.id,
        memberData: newMemberForm
      })
    } else {
      // Send invitation
      sendInviteMutation.mutate({
        groupId: group.id,
        inviteData: newMemberForm
      })
    }
  }

  const handleCancelInvite = (inviteId) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      cancelInviteMutation.mutate({ groupId: group.id, inviteId })
    }
  }

  const handleToggleAdmin = (userId, currentlyAdmin) => {
    const action = currentlyAdmin ? 'remove admin privileges from' : 'grant admin privileges to'
    if (confirm(`Are you sure you want to ${action} this member?`)) {
      updateRoleMutation.mutate({
        groupId: group.id,
        userId,
        isAdmin: !currentlyAdmin
      })
    }
  }

  const canManageMembers = isAdmin || isOwner
  const canRemoveMember = (member) => {
    if (member.id === group.ownerId) return false // Can't remove owner
    if (member.id === currentUser?.id) return true // Can remove self
    return canManageMembers
  }
  const canToggleAdmin = (member) => {
    if (member.id === group.ownerId) return false // Can't change owner role
    if (member.id === currentUser?.id) return false // Can't change own role
    return isOwner // Only owner can change admin status
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h2>
        {canManageMembers && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Member'}
          </button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Add New Member</h3>
          
          {/* Method Selection */}
          <div className="mb-4">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="addMethod"
                  value="existing"
                  checked={addMethod === 'existing'}
                  onChange={(e) => setAddMethod(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900 dark:text-white">Add existing user</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="addMethod"
                  value="invite"
                  checked={addMethod === 'invite'}
                  onChange={(e) => setAddMethod(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900 dark:text-white">Send email invitation</span>
              </label>
            </div>
          </div>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input
                type="email"
                required
                value={newMemberForm.email}
                onChange={(e) => setNewMemberForm({...newMemberForm, email: e.target.value})}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter email address"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {addMethod === 'existing' 
                  ? 'The user must already have an account with this email address'
                  : 'An invitation email will be sent to this address'
                }
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_admin"
                checked={newMemberForm.is_admin}
                onChange={(e) => setNewMemberForm({...newMemberForm, is_admin: e.target.checked})}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              />
              <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Grant admin privileges
              </label>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={addMemberMutation.isLoading || sendInviteMutation.isLoading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {(addMemberMutation.isLoading || sendInviteMutation.isLoading) ? (
                  addMethod === 'existing' ? 'Adding...' : 'Sending...'
                ) : (
                  addMethod === 'existing' ? 'Add Member' : 'Send Invitation'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Invitations */}
      {canManageMembers && pendingInvites && pendingInvites.length > 0 && (
        <div className="mb-6 p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Pending Invitations ({pendingInvites.length})
          </h4>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{invite.email}</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Invited {new Date(invite.createdAt).toLocaleDateString()} • 
                    {invite.isAdmin ? ' Admin' : ' Member'} • 
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  disabled={cancelInviteMutation.isLoading}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Members Grid */}
      <div className="space-y-3">
        {members?.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                  {member.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{member.username}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {member.id === group.ownerId && (
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded">
                      Owner
                    </span>
                  )}
                  {member.isAdmin && member.id !== group.ownerId && (
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              {canToggleAdmin(member) && (
                <button
                  onClick={() => handleToggleAdmin(member.id, member.isAdmin)}
                  disabled={updateRoleMutation.isLoading}
                  className={`text-xs px-3 py-1 rounded transition-colors disabled:opacity-50 ${
                    member.isAdmin
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  }`}
                >
                  {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>
              )}
              {canRemoveMember(member) && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removeMemberMutation.isLoading}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                >
                  {member.id === currentUser?.id ? 'Leave Group' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Former Members Section (Contributors who left) */}
      {group?.formerMembers?.length > 0 && (
        <div className="mt-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/30">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Former Contributors ({group.formerMembers.length})
          </h3>
          <div className="space-y-2">
            {group.formerMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                      {member.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">{member.username}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Made contributions but left the group</p>
                  </div>
                </div>
                <span className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded">
                  Former member
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {members?.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No members found.</p>
        </div>
      )}

      {/* Member Management Info */}
      {canManageMembers && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Admin Privileges:</h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Add new members and send email invitations</li>
            <li>• Create and manage activities</li>
            <li>• Add, edit, and delete contributions</li>
            {isOwner && <li>• Promote/demote other members (Owner only)</li>}
          </ul>
        </div>
      )}
    </div>
  )
}