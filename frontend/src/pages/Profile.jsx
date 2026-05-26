import { useState } from 'react';
import { User, Lock, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

function Req({ met, text }) {
  return (
    <span className={`flex items-center gap-1 text-xs ${met ? 'text-green-400' : 'text-slate-500'}`}>
      <Check className={`w-3 h-3 flex-shrink-0 ${met ? '' : 'opacity-20'}`} />
      {text}
    </span>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reqs = {
    length: newPw.length >= 8,
    upper: /[A-Z]/.test(newPw),
    lower: /[a-z]/.test(newPw),
    number: /\d/.test(newPw)
  };
  const allMet = Object.values(reqs).every(Boolean);

  const changePassword = async (e) => {
    e.preventDefault();
    if (!allMet) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.put('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      setSuccess('Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all';

  return (
    <div className="fade-in max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center">
          <User className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Profile</h1>
          <p className="text-xs text-slate-400">Account settings</p>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-5">
        <h2 className="text-sm font-semibold text-white mb-4">Account Information</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white">{user?.username}</div>
            <div className="text-sm text-slate-400">{user?.email}</div>
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
              user?.role === 'admin'
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-300'
            }`}>
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Member since</div>
            <div className="text-sm text-slate-300">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Last login</div>
            <div className="text-sm text-slate-300">
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Lock className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Change Password</h2>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">{success}</p>
          </div>
        )}

        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                required
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••"
                required
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPw && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
                <Req met={reqs.length} text="8+ characters" />
                <Req met={reqs.upper} text="Uppercase letter" />
                <Req met={reqs.lower} text="Lowercase letter" />
                <Req met={reqs.number} text="Number" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !currentPw || !allMet}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
