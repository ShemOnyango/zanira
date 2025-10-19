// frontend/src/pages/admin/RoleManagement.jsx
import { useState, useEffect } from 'react'
import { Search, Filter, Shield, UserPlus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { userAPI, adminAPI } from '../../lib/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const RoleManagement = () => {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'admin',
    permissions: []
  })

  const { execute: fetchUsers } = useApi(userAPI.getAllUsers, { showToast: false })
  const { execute: fetchRoles } = useApi(adminAPI.getRoleManagement, { showToast: false })
  const { execute: createRole } = useApi(adminAPI.createRole, { showToast: true })
  const { execute: updateRoleApi } = useApi(adminAPI.updateRole, { showToast: true })
  const { execute: deleteRoleApi } = useApi(adminAPI.deleteRole, { showToast: true })
  const { execute: updateUserRole } = useApi(adminAPI.updateUserRole, { showToast: true })
  const { execute: createUser } = useApi(userAPI.create, { showToast: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, rolesData] = await Promise.all([
        fetchUsers({ role: 'admin' }),
        fetchRoles()
      ])

      if (usersData) {
        // useApi.execute returns response.data, but some endpoints return { data: [...] }
        // normalize to always set an array on `users`
        const usersPayload = usersData.data ?? usersData ?? []
        setUsers(Array.isArray(usersPayload) ? usersPayload : [])
      }
      if (rolesData) {
        const payload = rolesData.data || {}
        if (Array.isArray(payload.roles)) setRoles(payload.roles)
        else if (Array.isArray(payload)) setRoles(payload)
        else if (Array.isArray(rolesData.data)) setRoles(rolesData.data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await updateUserRole(userId, { role: newRole })
      loadData()
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await createUser(newUser)
      setShowAddUser(false)
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'admin',
        permissions: []
      })
      loadData()
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  // derive available roles from server, fallback to local list
  const fallbackRoles = [
    { key: 'super_admin', name: 'Super Admin', description: 'Full system access' },
    { key: 'admin', name: 'Admin', description: 'Administrative access' },
    { key: 'moderator', name: 'Moderator', description: 'Content moderation' },
    { key: 'support', name: 'Support', description: 'Customer support' },
    { key: 'finance', name: 'Finance', description: 'Financial operations' }
  ]

  const rolesToShow = (roles && roles.length > 0)
    ? roles.map(r => ({ value: r.key || r._id || r.id, label: r.name || r.key || r._id, description: r.description || '' }))
    : fallbackRoles.map(r => ({ value: r.key, label: r.name, description: r.description }))

  const permissionOptions = [
    'users:read',
    'users:write',
    'users:delete',
    'bookings:read',
    'bookings:write',
    'bookings:delete',
    'payments:read',
    'payments:write',
    'analytics:read',
    'settings:read',
    'settings:write'
  ]

  const getRoleStats = () => {
    const stats = {
      super_admin: users.filter(u => u.role === 'super_admin').length,
      admin: users.filter(u => u.role === 'admin').length,
      moderator: users.filter(u => u.role === 'moderator').length,
      support: users.filter(u => u.role === 'support').length,
      finance: users.filter(u => u.role === 'finance').length,
      total: users.length
    }
    return stats
  }

  const stats = getRoleStats()

  if (loading) {
    return <LoadingSpinner size="xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <UserPlus size={18} />
            <span>Add User</span>
          </button>
          <button
            onClick={() => setShowRoleModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <Shield size={18} />
            <span>Add Role</span>
          </button>
        </div>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.super_admin}</div>
          <div className="text-sm text-red-700">Super Admin</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.admin}</div>
          <div className="text-sm text-blue-700">Admin</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.moderator}</div>
          <div className="text-sm text-purple-700">Moderator</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.support}</div>
          <div className="text-sm text-green-700">Support</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.finance}</div>
          <div className="text-sm text-yellow-700">Finance</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user.profilePhoto || '/default-avatar.png'}
                        alt={user.firstName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">User ID: {user._id.slice(-6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{user.email}</p>
                    <p className="text-sm text-gray-500">{user.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {rolesToShow.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.permissions?.slice(0, 3).map((permission, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                        >
                          {permission}
                        </span>
                      ))}
                      {user.permissions?.length > 3 && (
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
                          +{user.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Shield size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No users found</p>
            <p className="text-gray-400">Add new users to get started</p>
          </div>
        )}
      </div>

      {/* Available Roles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Roles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesToShow.map((role) => (
            <div key={role.value} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900">{role.label}</p>
                  <p className="text-sm text-gray-500">{role.description}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Users: {stats[role.value] || 0}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Full system access and management privileges
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

        {/* Role Create/Edit Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">{editingRole ? 'Edit Role' : 'Create Role'}</h3>
              <RoleForm
                initial={editingRole}
                onCancel={() => { setEditingRole(null); setShowRoleModal(false) }}
                onSave={async (form) => {
                  try {
                    if (editingRole) {
                      await updateRoleApi(editingRole.value, form)
                    } else {
                      await createRole(form)
                    }
                    setShowRoleModal(false)
                    setEditingRole(null)
                    loadData()
                  } catch (err) {
                    console.error('Role save failed', err)
                  }
                }}
              />
            </div>
          </div>
        )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {rolesToShow.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {permissionOptions.map(permission => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newUser.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUser({
                              ...newUser,
                              permissions: [...newUser.permissions, permission]
                            })
                          } else {
                            setNewUser({
                              ...newUser,
                              permissions: newUser.permissions.filter(p => p !== permission)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement

// Small RoleForm component used by RoleManagement modal
function RoleForm ({ initial, onCancel, onSave }) {
  const [form, setForm] = useState({ key: '', name: '', description: '', permissions: [] })

  useEffect(() => {
    if (initial) {
      setForm({ key: initial.value || initial.key || '', name: initial.label || initial.name || '', description: initial.description || '', permissions: initial.permissions || [] })
    } else {
      setForm({ key: '', name: '', description: '', permissions: [] })
    }
  }, [initial])

  const permissionOptions = [
    'users:read', 'users:write', 'users:delete', 'bookings:read', 'bookings:write', 'bookings:delete', 'payments:read', 'payments:write', 'analytics:read', 'settings:read', 'settings:write'
  ]

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
        <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {permissionOptions.map(p => (
            <label key={p} className="flex items-center space-x-2">
              <input type="checkbox" checked={form.permissions.includes(p)} onChange={(e) => {
                if (e.target.checked) setForm({ ...form, permissions: [...form.permissions, p] })
                else setForm({ ...form, permissions: form.permissions.filter(x => x !== p) })
              }} />
              <span className="text-sm">{p}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex space-x-3 pt-4">
        <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded-lg">Save</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg">Cancel</button>
      </div>
    </form>
  )
}