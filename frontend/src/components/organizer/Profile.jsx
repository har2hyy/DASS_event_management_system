import React, { useState, useEffect } from 'react';
import { organizerAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const OrganizerProfile = () => {
  const { user, updateUser } = useAuth();

  const [info, setInfo] = useState({
    organizerName: user.organizerName || '',
    category:      user.category      || '',
    description:   user.description   || '',
    contactEmail:  user.contactEmail  || '',
    contactNumber: user.contactNumber || '',
    discordWebhook: user.discordWebhook || '',
  });

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [tab, setTab] = useState('profile');

  const [infoMsg, setInfoMsg] = useState('');
  const [infoErr, setInfoErr] = useState('');
  const [pwdMsg,  setPwdMsg]  = useState('');
  const [pwdErr,  setPwdErr]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleInfoSave = async () => {
    setSaving(true);
    setInfoMsg('');
    setInfoErr('');
    try {
      const res = await organizerAPI.updateProfile(info);
      updateUser(res.data.user);
      setInfoMsg('Profile updated successfully.');
    } catch (err) {
      setInfoErr(err.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handlePwdSave = async () => {
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdErr('Passwords do not match');
      return;
    }
    setSaving(true);
    setPwdMsg('');
    setPwdErr('');
    try {
      await authAPI.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setPwdMsg('Password changed successfully.');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdErr(err.response?.data?.message || 'Password change failed');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-10">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100 mb-6">Organizer Profile</h1>

      <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
        {['profile', 'password', 'reset request'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition -mb-px capitalize whitespace-nowrap ${
              tab === t ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Login Email (read-only)</label>
            <input type="text" value={user.email} disabled
              className="w-full border border-gray-700 bg-white/5 rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
          </div>
          {[
            { key: 'organizerName',  label: 'Organizer / Club Name', type: 'text' },
            { key: 'category',       label: 'Category',              type: 'text' },
            { key: 'description',    label: 'Description',           type: 'textarea' },
            { key: 'contactEmail',   label: 'Contact Email',         type: 'email' },
            { key: 'contactNumber',  label: 'Contact Number',        type: 'tel' },
            { key: 'discordWebhook', label: 'Discord Webhook URL',   type: 'url' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
              {type === 'textarea' ? (
                <textarea rows={3} value={info[key]}
                  onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                  className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              ) : (
                <input type={type} value={info[key]}
                  onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                  className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}
            </div>
          ))}

          {infoMsg && <p className="text-green-400 text-sm">{infoMsg}</p>}
          {infoErr && <p className="text-red-400 text-sm">{infoErr}</p>}

          <button onClick={handleInfoSave} disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      )}

      {tab === 'password' && (
        <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-6 space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword',     label: 'New Password' },
            { key: 'confirmPassword', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
              <input type="password" value={pwd[key]}
                onChange={(e) => setPwd({ ...pwd, [key]: e.target.value })}
                className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}

          {pwdMsg && <p className="text-green-400 text-sm">{pwdMsg}</p>}
          {pwdErr && <p className="text-red-400 text-sm">{pwdErr}</p>}

          <button onClick={handlePwdSave} disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      )}

      {tab === 'reset request' && <PasswordResetTab />}
    </div>
  );
};

// ── Password Reset Request Sub-component ─────────────────────────────────────
const PasswordResetTab = () => {
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    organizerAPI.getPasswordResetRequests()
      .then((res) => setRequests(res.data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErr('Please provide a reason');
      return;
    }
    setSubmitting(true);
    setMsg('');
    setErr('');
    try {
      await organizerAPI.requestPasswordReset({ reason: reason.trim() });
      setMsg('Password reset request submitted. An admin will review it.');
      setReason('');
      const res = await organizerAPI.getPasswordResetRequests();
      setRequests(res.data.requests || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit request');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-6 space-y-4">
        <h3 className="font-semibold text-gray-200">Request Password Reset</h3>
        <p className="text-sm text-gray-400">
          If you have forgotten your password, submit a request and an admin will reset it for you.
        </p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for password reset…"
          maxLength={500}
          className="w-full bg-white/5 border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {msg && <p className="text-green-400 text-sm">{msg}</p>}
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting || !reason.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>

      {/* History */}
      {!loading && requests.length > 0 && (
        <div className="bg-[#12122a] rounded-2xl border border-indigo-500/20 p-5 md:p-6">
          <h3 className="font-semibold text-gray-200 mb-3">Request History</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r._id} className="border border-white/10 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.status === 'Pending'  ? 'bg-yellow-500/20 text-yellow-400' :
                    r.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{r.status}</span>
                </div>
                <p className="text-gray-300">{r.reason}</p>
                {r.adminComment && (
                  <p className="text-xs text-gray-500 mt-1 italic">Admin: {r.adminComment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerProfile;
