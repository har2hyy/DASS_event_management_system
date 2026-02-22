import React, { useState } from 'react';
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Organizer Profile</h1>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {['profile', 'password'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px capitalize ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Login Email (read-only)</label>
            <input type="text" value={user.email} disabled
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              {type === 'textarea' ? (
                <textarea rows={3} value={info[key]}
                  onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              ) : (
                <input type={type} value={info[key]}
                  onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              )}
            </div>
          ))}

          {infoMsg && <p className="text-green-600 text-sm">{infoMsg}</p>}
          {infoErr && <p className="text-red-500 text-sm">{infoErr}</p>}

          <button onClick={handleInfoSave} disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      )}

      {tab === 'password' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword',     label: 'New Password' },
            { key: 'confirmPassword', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="password" value={pwd[key]}
                onChange={(e) => setPwd({ ...pwd, [key]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}

          {pwdMsg && <p className="text-green-600 text-sm">{pwdMsg}</p>}
          {pwdErr && <p className="text-red-500 text-sm">{pwdErr}</p>}

          <button onClick={handlePwdSave} disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrganizerProfile;
