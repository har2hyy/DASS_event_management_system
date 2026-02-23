import React, { useEffect, useState } from 'react';
import { participantAPI } from '../../services/api';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const INTERESTS = [
  'Gaming', 'Music', 'Dance', 'Sports', 'Coding', 'Hacking', 'Robotics',
  'Art', 'Photography', 'Quizzing', 'Film', 'Fashion', 'Literature',
];

const ParticipantProfile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    firstName: '', lastName: '', contactNumber: '', college: '', interests: [],
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [msg,    setMsg]    = useState('');
  const [pwMsg,  setPwMsg]  = useState('');
  const [saving, setSaving] = useState(false);
  const [tab,    setTab]    = useState('profile');

  useEffect(() => {
    if (user) {
      setForm({
        firstName:     user.firstName || '',
        lastName:      user.lastName || '',
        contactNumber: user.contactNumber || '',
        college:       user.college || '',
        interests:     user.interests || [],
      });
    }
  }, [user]);

  const toggleInterest = (i) =>
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(i) ? prev.interests.filter((x) => x !== i) : [...prev.interests, i],
    }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await participantAPI.updateProfile(form);
      updateUser(res.data.user);
      setMsg('✅ Profile updated successfully');
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || 'Update failed'}`);
    }
    setSaving(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmNew) return setPwMsg('❌ New passwords do not match');
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('✅ Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) {
      setPwMsg(`❌ ${err.response?.data?.message || 'Failed'}`);
    }
    setSaving(false);
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-10">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-100 mb-6">My Profile</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg md:rounded-xl p-1 w-fit">
        {['profile', 'security'].map((t) => (
          <button key={t} onClick={() => { setTab(t); setMsg(''); setPwMsg(''); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-indigo-600 shadow text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="space-y-4 bg-[#12122a] rounded-2xl p-5 md:p-6 border border-indigo-500/20">
          {/* Non-editable */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 bg-white/5 rounded-xl p-4">
            <div><p className="text-xs uppercase text-gray-500">Email</p><p className="font-medium text-gray-200">{user.email}</p></div>
            <div><p className="text-xs uppercase text-gray-500">Type</p><p className="font-medium text-gray-200">{user.participantType}</p></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([n, l]) => (
              <div key={n}>
                <label className="block text-sm font-medium text-gray-300 mb-1">{l}</label>
                <input type="text" value={form[n]} onChange={(e) => setForm({ ...form, [n]: e.target.value })}
                  className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>

          {[['contactNumber', 'Contact Number', 'tel'], ['college', 'College / Organisation', 'text']].map(([n, l, t]) => (
            <div key={n}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{l}</label>
              <input type={t} value={form[n]} onChange={(e) => setForm({ ...form, [n]: e.target.value })}
                className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Areas of Interest</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button type="button" key={i} onClick={() => toggleInterest(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${form.interests.includes(i) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 text-gray-400 border-gray-600 hover:border-indigo-400'}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          {msg && (
            <div className={`rounded-lg px-4 py-3 text-sm ${msg.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {msg}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={changePassword} className="space-y-4 bg-[#12122a] rounded-2xl p-5 md:p-6 border border-indigo-500/20">
          <h2 className="text-base md:text-lg font-semibold text-gray-200">Change Password</h2>
          {[
            ['currentPassword', 'Current Password'],
            ['newPassword', 'New Password'],
            ['confirmNew', 'Confirm New Password'],
          ].map(([n, l]) => (
            <div key={n}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{l}</label>
              <input type="password" value={pwForm[n]}
                onChange={(e) => setPwForm({ ...pwForm, [n]: e.target.value })}
                className="w-full bg-white/5 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          {pwMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm ${pwMsg.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {pwMsg}
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition">
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ParticipantProfile;
