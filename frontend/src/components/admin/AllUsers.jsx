import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ROLES = ['All', 'Participant', 'Organizer'];

const AllUsers = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [role,    setRole]    = useState('All');
  const [search,  setSearch]  = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = async (r) => {
    setLoading(true);
    try {
      const params = r !== 'All' ? { role: r } : {};
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.users);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(role); }, [role]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete user "${name}"?\n\nThis will remove all their registrations, messages, and free up event slots.`)) return;
    setDeleting(id);
    try {
      await adminAPI.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
    setDeleting(null);
  };

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const fullName = u.role === 'Organizer' ? (u.organizerName || '') : `${u.firstName || ''} ${u.lastName || ''}`;
    return (
      fullName.toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-[#0a0a14]">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-[0_0_50px_rgba(99,102,241,0.35)]">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">All Users</h1>
        <p className="text-indigo-100 mt-1 md:text-lg">Browse all participants and organizers</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1">
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`px-5 py-2 rounded-full text-sm font-medium border transition ${role === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/5 text-gray-400 border-gray-600 hover:border-indigo-400'}`}>
              {r}
            </button>
          ))}
        </div>
        <input type="text" value={search} placeholder="Search by name or email…"
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white/5 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading users…" />
      ) : (
        <div className="bg-[#12122a] rounded-xl border border-indigo-500/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Name / Org', 'Email', 'Role', 'Joined', 'Details', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No users found.</td></tr>
              ) : filtered.map((u) => (
                <tr key={u._id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-medium text-gray-200">
                    {u.role === 'Organizer' ? u.organizerName : `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'Organizer'   ? 'bg-blue-500/20 text-blue-400' :
                      u.role === 'Participant' ? 'bg-green-500/20 text-green-400' :
                                                 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.role === 'Participant' ? u.college || '—' : u.category || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'Participant' && (
                      <button
                        onClick={() => handleDelete(u._id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email)}
                        disabled={deleting === u._id}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition disabled:opacity-50"
                      >
                        {deleting === u._id ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );
};

export default AllUsers;
