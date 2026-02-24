import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState(null); // { request, action: 'approve'|'reject' }
  const [newPassword, setNewPassword] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await adminAPI.getPasswordResetRequests(filter ? { status: filter } : {});
      setRequests(res.data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleAction = async () => {
    if (!actionModal) return;
    setSaving(true);
    setError('');
    try {
      if (actionModal.action === 'approve') {
        if (!newPassword) {
          setError('New password is required');
          setSaving(false);
          return;
        }
        await adminAPI.approvePasswordReset(actionModal.request._id, { newPassword, comment });
      } else {
        await adminAPI.rejectPasswordReset(actionModal.request._id, { comment });
      }
      setActionModal(null);
      setNewPassword('');
      setComment('');
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
    setSaving(false);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pwd);
  };

  if (loading) return <LoadingSpinner text="Loading password reset requests…" />;

  return (
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100 mb-6">Password Reset Requests</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'Pending', 'Approved', 'Rejected'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No password reset requests found.</p>
        ) : (
          requests.map((req) => (
            <div key={req._id} className="bg-[#12122a] rounded-xl p-4 md:p-5 border border-indigo-500/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-200">{req.organizer?.organizerName}</span>
                    <span className="text-xs text-gray-500">{req.organizer?.email}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{req.reason}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Requested: {new Date(req.createdAt).toLocaleString()}</span>
                    {req.resolvedAt && <span>Resolved: {new Date(req.resolvedAt).toLocaleString()}</span>}
                  </div>
                  {req.adminComment && (
                    <p className="text-xs text-gray-500 mt-1 italic">Admin: {req.adminComment}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    req.status === 'Pending'  ? 'bg-yellow-500/20 text-yellow-400' :
                    req.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {req.status}
                  </span>
                  {req.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => setActionModal({ request: req, action: 'approve' })}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setActionModal({ request: req, action: 'reject' })}
                        className="border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl border border-indigo-500/20">
            <h2 className="text-lg font-bold text-gray-100 mb-4">
              {actionModal.action === 'approve' ? 'Approve Password Reset' : 'Reject Password Reset'}
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Organizer: <span className="font-medium">{actionModal.request.organizer?.organizerName}</span>
            </p>

            {actionModal.action === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter temporary password"
                    className="flex-1 bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2.5 rounded-lg font-semibold transition whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Comment (optional)</label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note…"
                className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setActionModal(null); setNewPassword(''); setComment(''); setError(''); }}
                className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={saving}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 ${
                  actionModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {saving ? 'Processing…' : actionModal.action === 'approve' ? 'Approve & Reset' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResetRequests;
