import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ROLES = ['All', 'Participant', 'Organizer'];

const AllUsers = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [role,    setRole]    = useState('All');
  const [search,  setSearch]  = useState('');

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

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const fullName = u.role === 'Organizer' ? (u.organizerName || '') : `${u.firstName || ''} ${u.lastName || ''}`;
    return (
      fullName.toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <div className="w-full px-6 lg:px-12 py-8">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-lg">
        <h1 className="text-3xl font-bold">All Users</h1>
        <p className="text-indigo-100 mt-1">Browse all participants and organizers</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1">
          {ROLES.map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${role === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
              {r}
            </button>
          ))}
        </div>
        <input type="text" value={search} placeholder="Search by name or email…"
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading users…" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name / Org', 'Email', 'Role', 'Joined', 'Details'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No users found.</td></tr>
              ) : filtered.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {u.role === 'Organizer' ? u.organizerName : `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'Organizer'   ? 'bg-blue-100 text-blue-700' :
                      u.role === 'Participant' ? 'bg-green-100 text-green-700' :
                                                 'bg-purple-100 text-purple-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.role === 'Participant' ? u.college || '—' : u.category || '—'}
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
