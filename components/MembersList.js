import { useState } from 'react'
import { useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/useAuth'

const removeMember = async ({ token, groupId, userId }) => {
  const response = await axios.delete(`/api/groups/${groupId}/members/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const addMember = async ({ token, groupId, memberData }) => {
  const response = await axios.post(`/api/groups/${groupId}/members`, memberData, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

export default function MembersList({ group, members, isAdmin }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({
    user_id: '',
    is_admin: false
  })

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
      setNewMemberForm({ user_id: '', is_admin: false })
      toast.success('Member added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add member')
    }
  })

  const handleRemoveMember = (userId) => {
    if (confirm('Are you sure you want to remove this member?')) {
      removeMemberMutation.mutate({ token, groupId: group.id, userId })
    }
  }

  const handleAddMember = (e) => {
    e.preventDefault()
    addMemberMutation.mutate({
      token,
      groupId: group.id,
      memberData: newMemberForm
    })
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Members</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Member
          </button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Add New Member</h3>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <input
                type="number"
                required
                value={newMemberForm.user_id}
                onChange={(e) => setNewMemberForm({...newMemberForm, user_id: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_admin"
                checked={newMemberForm.is_admin}
                onChange={(e) => setNewMemberForm({...newMemberForm, is_admin: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900">
                Admin privileges
              </label>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={addMemberMutation.isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {addMemberMutation.isLoading ? 'Adding...' : 'Add Member'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members?.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <h4 className="font-medium">{member.username}</h4>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              {member.isAdmin && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  Admin
                </span>
              )}
              {isAdmin && member.id !== group.ownerId && member.id !== user?.id && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removeMemberMutation.isLoading}
                  className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {members?.length === 0 && (
        <p className="text-gray-500 text-center py-4">No members found.</p>
      )}
    </div>
  )
}