import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

const AllEvents = () => {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchEvents = () => {
    adminAPI.getAllEvents()
      .then((res) => setEvents(res.data.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleDelete = async (ev) => {
    if (!window.confirm(`⚠️ Permanently delete "${ev.eventName}"? This removes ALL registrations, messages, and feedback. Cannot be undone.`)) return;
    setDeleting(ev._id);
    try {
      await adminAPI.deleteEvent(ev._id);
      setEvents((prev) => prev.filter((e) => e._id !== ev._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
    setDeleting(null);
  };

  if (loading) return <LoadingSpinner text="Loading events…" />;

  const filtered = events.filter((ev) =>
    ev.eventName.toLowerCase().includes(search.toLowerCase()) ||
    (ev.organizer?.organizerName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a14]">
    <div className="w-full px-6 sm:px-10 md:px-16 lg:px-24 py-8 md:py-10">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-[0_0_50px_rgba(99,102,241,0.35)]">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">All Events</h1>
        <p className="text-indigo-100 mt-1 md:text-lg">View and monitor all events across organizers</p>
      </div>

      <input type="text" value={search} placeholder="Search by event name or organizer…"
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm bg-white/5 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6" />

      <div className="bg-[#12122a] rounded-xl border border-indigo-500/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {['Event Name', 'Organizer', 'Type', 'Status', 'Registered', 'Fee', 'Start Date', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500">No events found.</td></tr>
            ) : filtered.map((ev) => (
              <tr key={ev._id} className="hover:bg-white/5 transition">
                <td className="px-4 py-3 font-medium text-gray-200 max-w-xs truncate">{ev.eventName}</td>
                <td className="px-4 py-3 text-gray-400">{ev.organizer?.organizerName || '—'}</td>
                <td className="px-4 py-3 text-gray-400">{ev.eventType}</td>
                <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                <td className="px-4 py-3 text-gray-400">{ev.currentRegistrations}/{ev.registrationLimit}</td>
                <td className="px-4 py-3 text-gray-400">₹{ev.registrationFee}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(ev.eventStartDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(ev)} disabled={deleting === ev._id}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 transition disabled:opacity-50">
                    {deleting === ev._id ? 'Deleting…' : '🗑 Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};

export default AllEvents;
