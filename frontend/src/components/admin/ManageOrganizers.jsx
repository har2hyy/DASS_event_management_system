import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const EMPTY_FORM = {
  email: '', password: '', organizerName: '', category: '', description: '',
};

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [resetId,    setResetId]    = useState(null);
  const [newPwd,     setNewPwd]     = useState('');
  const [deleteId,   setDeleteId]   = useState(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [filter,     setFilter]     = useState('all'); // 'all' | 'active' | 'archived'

  const load = async () => {
    try {
      const res = await adminAPI.getOrganizers();
      setOrganizers(res.data.organizers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load organizers');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminAPI.createOrganizer(form);
      setSuccess('Organizer created successfully.');
      setForm(EMPTY_FORM);
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Creation failed');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await adminAPI.deleteOrganizer(deleteId);
      setSuccess('Organizer and all associated data permanently deleted.');
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
    setSaving(false);
  };

  const handleArchiveToggle = async (orgId, currentlyArchived) => {
    setSaving(true);
    setError('');
    try {
      if (currentlyArchived) {
        await adminAPI.unarchiveOrganizer(orgId);
        setSuccess('Organizer unarchived — they can log in again.');
      } else {
        await adminAPI.archiveOrganizer(orgId);
        setSuccess('Organizer archived — they can no longer log in.');
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!newPwd) return;
    setSaving(true);
    setError('');
    try {
      await adminAPI.resetPassword(resetId, { newPassword: newPwd });
      setSuccess('Password reset successfully.');
      setResetId(null);
      setNewPwd('');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner text="Loading organizers…" />;

  return (
    <div className="min-h-screen bg-[#0a0a14]">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-[0_0_50px_rgba(99,102,241,0.35)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Manage Organizers</h1>
            <p className="text-indigo-100 mt-1 md:text-lg">Create and manage organizer accounts</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 md:px-10 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold hover:from-green-500 hover:to-emerald-600 transition shadow-xl text-center">
            + Create Organizer
          </button>
        </div>
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 mb-4 text-sm">{success}</div>}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-5">
        {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'archived', label: 'Archived' }].map(({ key, label }) => {
          const count = key === 'all' ? organizers.length : key === 'active' ? organizers.filter((o) => !o.isArchived).length : organizers.filter((o) => o.isArchived).length;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
                filter === key ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}>
              {label} <span className="text-xs ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-[#12122a] rounded-xl border border-indigo-500/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Name', 'Category', 'Email', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(() => {
              const filtered = filter === 'all' ? organizers : filter === 'active' ? organizers.filter((o) => !o.isArchived) : organizers.filter((o) => o.isArchived);
              if (filtered.length === 0) return <tr><td colSpan={5} className="text-center py-10 text-gray-500">No organizers found.</td></tr>;
              return filtered.map((o) => (
                <tr key={o._id} className={`hover:bg-white/5 transition ${o.isArchived ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-200">{o.organizerName}</td>
                  <td className="px-4 py-3 text-gray-400">{o.category}</td>
                  <td className="px-4 py-3 text-gray-400">{o.email}</td>
                  <td className="px-4 py-3">
                    {o.isArchived ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">Archived</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleArchiveToggle(o._id, o.isArchived)} disabled={saving}
                        className={`text-xs border rounded-lg px-4 py-2 transition disabled:opacity-50 ${
                          o.isArchived
                            ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                            : 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                        }`}>
                        {o.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button onClick={() => { setResetId(o._id); setNewPwd(''); }}
                        className="text-xs border border-white/10 text-gray-400 rounded-lg px-4 py-2 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 transition">
                        Reset Pwd
                      </button>
                      <button onClick={() => setDeleteId(o._id)}
                        className="text-xs border border-red-500/30 text-red-400 rounded-lg px-4 py-2 hover:bg-red-500/10 transition">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md shadow-xl border border-indigo-500/20">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Create Organizer Account</h2>
            <div className="space-y-3">
              {[
                { key: 'email',         label: 'Email',        type: 'email'    },
                { key: 'password',      label: 'Password',     type: 'password' },
                { key: 'organizerName', label: 'Club / Org Name', type: 'text' },
                { key: 'category',      label: 'Category',     type: 'text'     },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{label} *</label>
                  <input type={type} value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea value={form.description} rows={2}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-sm shadow-xl border border-indigo-500/20">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Reset Password</h2>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              placeholder="New password"
              className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setResetId(null)}
                className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={handleReset} disabled={saving || !newPwd}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md shadow-xl border border-red-500/20">
            <h2 className="text-lg font-semibold text-red-400 mb-2">⚠ Permanently Delete Organizer?</h2>
            <p className="text-sm text-gray-400 mb-2">This will <strong className="text-red-400">permanently delete</strong> the organizer account and <strong className="text-red-400">all associated data</strong>:</p>
            <ul className="text-xs text-gray-500 list-disc list-inside mb-4 space-y-1">
              <li>All events (every status)</li>
              <li>All registrations for those events</li>
              <li>All forum messages &amp; feedback</li>
              <li>All password reset requests</li>
              <li>Removed from all followers' lists</li>
            </ul>
            <p className="text-xs text-yellow-400 mb-5">Tip: Use <strong>Archive</strong> instead to temporarily disable the account without losing data.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                {saving ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default ManageOrganizers;
