//Admin/members.js
import { useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import ProtectedRoute from '../../components/ProtectedRoute'
import AdminRoute from '../../components/AdminRoute'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

const fetchMembers = async (token) => {
  const response = await axios.get('/api/members', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const addMember = async ({ token, memberData }) => {
  const response = await axios.post('/api/members', memberData, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

const deleteMember = async ({ token, memberId }) => {
  const response = await axios.delete(`/api/members/${memberId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

function MembersManagementContent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false
  })

  const { data: members, isLoading } = useQuery(
    ['members', token],
    () => fetchMembers(token),
    { enabled: !!token }
  )

  const addMemberMutation = useMutation(addMember, {
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      setShowAddForm(false)
      setFormData({ username: '', email: '', password: '', isAdmin: false })
      toast.success('Member added successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add member')
    }
  })

  const deleteMemberMutation = useMutation(deleteMember, {
    onSuccess: () => {
      queryClient.invalidateQueries(['members'])
      toast.success('Member deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete member')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    addMemberMutation.mutate({ token, memberData: formData })
  }

  const handleDelete = (memberId) => {
    if (confirm('Are you sure you want to delete this member?')) {
      deleteMemberMutation.mutate({ token, memberId })
    }
  }

  if (isLoading) return <div>Loading members...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Members Management</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Member
        </button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Add New Member</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isAdmin"
                checked={formData.isAdmin}
                onChange={(e) => setFormData({...formData, isAdmin: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-900">
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

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members?.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {member.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    member.isAdmin 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {member.isAdmin ? 'Admin' : 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDelete(member.id)}
                    disabled={deleteMemberMutation.isLoading}
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

      {members?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No members found.</p>
        </div>
      )}
    </div>
  )
}

export default function MembersManagement() {
  return (
    <ProtectedRoute>
      <AdminRoute>
        <MembersManagementContent />
      </AdminRoute>
    </ProtectedRoute>
  )
}
