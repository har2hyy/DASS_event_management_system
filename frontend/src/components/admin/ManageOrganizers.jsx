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
      setDeleteId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Organizers</h1>
            <p className="text-indigo-100 mt-1">Create and manage organizer accounts</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:from-green-500 hover:to-emerald-600 transition shadow-xl">
            + Create Organizer
          </button>
        </div>
      </div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Category', 'Email', 'Description', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {organizers.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No organizers yet.</td></tr>
            ) : organizers.map((o) => (
              <tr key={o._id} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{o.organizerName}</td>
                <td className="px-4 py-3 text-gray-500">{o.category}</td>
                <td className="px-4 py-3 text-gray-500">{o.email}</td>
                <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{o.description || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setResetId(o._id); setNewPwd(''); }}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition">
                      Reset Pwd
                    </button>
                    <button onClick={() => setDeleteId(o._id)}
                      className="text-xs border border-red-200 text-red-500 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Organizer Account</h2>
            <div className="space-y-3">
              {[
                { key: 'email',         label: 'Email',        type: 'email'    },
                { key: 'password',      label: 'Password',     type: 'password' },
                { key: 'organizerName', label: 'Club / Org Name', type: 'text' },
                { key: 'category',      label: 'Category',     type: 'text'     },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
                  <input type={type} value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} rows={2}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Reset Password</h2>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              placeholder="New password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setResetId(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleReset} disabled={saving || !newPwd}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Delete Organizer?</h2>
            <p className="text-sm text-gray-500 mb-5">This action is irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
                {saving ? 'Deleting…' : 'Delete'}
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
