import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Edit3, Lock, Unlock, AlertCircle, X, Check } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserRow({ user, currentUserId, onUpdate, onDelete, onUnlock }) {
  const isLocked = user.lockUntil && new Date(user.lockUntil) > new Date();
  const isCurrentUser = user.id === currentUserId;

  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-white flex items-center gap-1.5">
              {user.username}
              {isCurrentUser && <span className="text-xs text-cyan-400">(you)</span>}
            </div>
            <div className="text-xs text-slate-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
          user.role === 'admin'
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
            : 'bg-slate-700/50 border-slate-600 text-slate-300'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            !user.isActive ? 'bg-slate-500' : isLocked ? 'bg-yellow-400' : 'bg-green-400'
          }`} />
          <span className="text-xs text-slate-400">
            {!user.isActive ? 'Disabled' : isLocked ? 'Locked' : 'Active'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {isLocked && !isCurrentUser && (
            <button
              onClick={() => onUnlock(user)}
              title="Unlock account"
              className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-all"
            >
              <Unlock className="w-3.5 h-3.5" />
            </button>
          )}
          {!isCurrentUser && (
            <>
              <button
                onClick={() => onUpdate(user)}
                title="Edit user"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(user)}
                title="Delete user"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);

  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [editForm, setEditForm] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    try {
      await api.post('/users', createForm);
      await fetchUsers();
      setShowCreate(false);
      setCreateForm({ username: '', email: '', password: '', role: 'user' });
      flash('User created successfully.');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  const updateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);
    try {
      await api.put(`/users/${editUser.id}`, editForm);
      await fetchUsers();
      setEditUser(null);
      flash('User updated successfully.');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/users/${deleteUser.id}`);
      await fetchUsers();
      setDeleteUser(null);
      flash('User deleted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  const unlock = async (user) => {
    try {
      await api.post(`/users/${user.id}/unlock`);
      await fetchUsers();
      flash(`${user.username}'s account unlocked.`);
    } catch {
      setError('Failed to unlock account.');
    }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ role: user.role, isActive: user.isActive });
    setFormError('');
  };

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all';

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">User Management</h1>
            <p className="text-xs text-slate-400">{users.length} account{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFormError(''); }}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-300">{successMsg}</p>
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['User', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    currentUserId={currentUser?.id}
                    onUpdate={openEdit}
                    onDelete={setDeleteUser}
                    onUnlock={unlock}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => setShowCreate(false)}>
          {formError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                className={inputCls}
                value={createForm.username}
                onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))}
                placeholder="johndoe"
                required minLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                className={inputCls}
                value={createForm.email}
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                className={inputCls}
                value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Min 8 chars, upper + lower + number"
                required minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
              <select
                className={inputCls}
                value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" />}
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.username}`} onClose={() => setEditUser(null)}>
          {formError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}
          <form onSubmit={updateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
              <select
                className={inputCls}
                value={editForm.role}
                onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Account Status</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setEditForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${editForm.isActive ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editForm.isActive ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-slate-300">{editForm.isActive ? 'Active' : 'Disabled'}</span>
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <p className="text-sm text-slate-300 mb-5">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{deleteUser.username}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteUser(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={actionLoading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" />}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
