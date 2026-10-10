import { Plus, Search, Edit, Trash2, Eye, Shield, User, X } from 'lucide-react';
import { useState } from 'react';

const users = [
  { id: 1, name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98765 43210', role: 'parent', status: 'active', children: 2, created: '2024-01-15', lastLogin: '2 hours ago' },
  { id: 2, name: 'Rahul Kumar', email: 'rahul@example.com', phone: '+91 87654 32109', role: 'parent', status: 'active', children: 1, created: '2024-01-10', lastLogin: 'Yesterday' },
  { id: 3, name: 'Admin User', email: 'admin@happylittlelearners.in', phone: null, role: 'admin', status: 'active', children: 0, created: '2024-01-01', lastLogin: '5 min ago' },
  { id: 4, name: 'Anita Patel', email: 'anita@example.com', phone: '+91 76543 21098', role: 'parent', status: 'inactive', children: 3, created: '2024-01-05', lastLogin: '2 weeks ago' },
  { id: 5, name: 'Content Team', email: 'content@happylittlelearners.in', phone: null, role: 'admin', status: 'active', children: 0, created: '2024-01-02', lastLogin: '1 hour ago' },
];

const roles = ['admin', 'parent', 'student'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage platform users and their roles</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-auto">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Children</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-blue to-pastel-green flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'parent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.children > 0 ? (
                      <span className="text-gray-900 font-medium">{user.children}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{new Date(user.created).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-600">{user.lastLogin}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" aria-label="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(user)} aria-label="Edit user">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" aria-label="Delete user">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {filteredUsers.length} of {users.length} users</p>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditingUser(null); }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="p-6 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" defaultValue={editingUser?.name} className="input" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" defaultValue={editingUser?.email} className="input" required />
              </div>
              <div>
                <label className="label">Phone (Optional)</label>
                <input type="tel" defaultValue={editingUser?.phone ?? ''} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select defaultValue={editingUser?.role} className="input">
                    {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select defaultValue={editingUser?.status} className="input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {editingUser?.role === 'parent' && (
                <div>
                  <label className="label">Number of Children</label>
                  <input type="number" defaultValue={editingUser?.children} className="input" min="0" />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); setEditingUser(null); }} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">{editingUser ? 'Save Changes' : 'Add User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}